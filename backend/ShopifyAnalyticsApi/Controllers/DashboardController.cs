using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Jobs;
using Hangfire;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace ShopifyAnalyticsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<DashboardController> _logger;
        private readonly IBackgroundJobClient _backgroundJobClient;

        public DashboardController(
            ShopifyDbContext context,
            ILogger<DashboardController> logger,
            IBackgroundJobClient backgroundJobClient)
        {
            _context = context;
            _logger = logger;
            _backgroundJobClient = backgroundJobClient;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboard(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int? storeId)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;
                
                var query = _context.Orders.AsQueryable();
                
                if (storeId.HasValue)
                {
                    query = query.Where(o => o.StoreId == storeId.Value);
                }
                
                query = query.Where(o => (o.ShopifyCreatedAt ?? o.CreatedAt) >= start && (o.ShopifyCreatedAt ?? o.CreatedAt) <= end);

                var totalSales = await query.SumAsync(o => o.TotalPrice);
                var orderCount = await query.CountAsync();
                var averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
                
                var customerCount = await query
                    .Select(o => o.CustomerId)
                    .Distinct()
                    .CountAsync();

                var topProducts = await query
                    .SelectMany(o => o.OrderItems)
                    .GroupBy(oi => new { oi.ProductId, oi.ProductTitle })
                    .Select(g => new TopProductDto
                    {
                        ProductId = long.Parse(g.Key.ProductId ?? "0"),
                        ProductTitle = g.Key.ProductTitle ?? "Unknown Product",
                        Quantity = g.Sum(oi => oi.Quantity),
                        Revenue = g.Sum(oi => oi.Price * oi.Quantity)
                    })
                    .OrderByDescending(p => p.Revenue)
                    .Take(10)
                    .ToListAsync();

                var recentOrders = await query
                    .OrderByDescending(o => o.ShopifyCreatedAt ?? o.CreatedAt)
                    .Take(10)
                    .Select(o => new RecentOrderDto
                    {
                        OrderId = o.Id,
                        OrderNumber = o.OrderNumber,
                        CustomerName = o.Customer != null ? 
                            $"{o.Customer.FirstName} {o.Customer.LastName}" : "Guest",
                        TotalAmount = o.TotalPrice,
                        Status = o.FulfillmentStatus ?? "pending",
                        CreatedAt = o.ShopifyCreatedAt ?? o.CreatedAt
                    })
                    .ToListAsync();

                var dailySales = await query
                    .GroupBy(o => (o.ShopifyCreatedAt ?? o.CreatedAt).Date)
                    .Select(g => new DailySalesDto
                    {
                        Date = g.Key,
                        Sales = g.Sum(o => o.TotalPrice),
                        Orders = g.Count()
                    })
                    .OrderBy(ds => ds.Date)
                    .ToListAsync();

                var previousPeriodStart = start.AddDays(-(end - start).TotalDays);
                var previousPeriodEnd = start;
                
                var previousPeriodSales = await _context.Orders
                    .Where(o => (o.ShopifyCreatedAt ?? o.CreatedAt) >= previousPeriodStart && (o.ShopifyCreatedAt ?? o.CreatedAt) < previousPeriodEnd)
                    .Where(o => !storeId.HasValue || o.StoreId == storeId.Value)
                    .SumAsync(o => o.TotalPrice);

                var growthRate = previousPeriodSales > 0 
                    ? (double)(((totalSales - previousPeriodSales) / previousPeriodSales) * 100)
                    : 0;

                var dashboardData = new DashboardDto
                {
                    TotalSales = totalSales,
                    OrderCount = orderCount,
                    CustomerCount = customerCount,
                    AverageOrderValue = averageOrderValue,
                    GrowthRate = Math.Round(growthRate, 2),
                    TopProducts = topProducts,
                    RecentOrders = recentOrders,
                    DailySales = dailySales,
                    StartDate = start,
                    EndDate = end,
                    StoreId = storeId
                };

                _logger.LogInformation($"Dashboard data retrieved for store {storeId} from {start} to {end}");
                
                return Ok(dashboardData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboard data");
                return StatusCode(500, new { error = "Failed to retrieve dashboard data" });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshDashboard([FromBody] RefreshRequest request)
        {
            try
            {
                if (request.StoreId <= 0)
                {
                    return BadRequest(new { error = "Invalid store ID" });
                }

                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == request.StoreId);
                
                if (store == null)
                {
                    return NotFound(new { error = "Store not found" });
                }
                
                if (!store.IsActive)
                {
                    return BadRequest(new { error = "Store is not active" });
                }

                var productJobId = _backgroundJobClient.Enqueue<ShopifyProductSyncJob>(
                    job => job.SyncProducts(request.StoreId, null));

                _logger.LogInformation($"Data refresh triggered for store {request.StoreId}. Job IDs: Products={productJobId}");
                
                return Ok(new 
                { 
                    message = "Data refresh started",
                    storeId = request.StoreId,
                    jobIds = new 
                    {
                        products = productJobId
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error triggering data refresh for store {request.StoreId}");
                return StatusCode(500, new { error = "Failed to trigger data refresh" });
            }
        }

        [HttpGet("sync-status/{storeId}")]
        public async Task<IActionResult> GetSyncStatus(int storeId)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == storeId);
                
                if (store == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var lastProductSync = store.LastSyncDate;
                
                var productCount = await _context.Products
                    .Where(p => p.StoreId == storeId)
                    .CountAsync();
                
                var customerCount = await _context.Customers
                    .Where(c => c.StoreId == storeId)
                    .CountAsync();
                
                var orderCount = await _context.Orders
                    .Where(o => o.StoreId == storeId)
                    .CountAsync();

                var syncStatus = new SyncStatusDto
                {
                    StoreId = storeId,
                    StoreName = store.Name,
                    LastProductSync = lastProductSync,
                    ProductCount = productCount,
                    CustomerCount = customerCount,
                    OrderCount = orderCount,
                    IsActive = store.IsActive
                };

                return Ok(syncStatus);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving sync status for store {storeId}");
                return StatusCode(500, new { error = "Failed to retrieve sync status" });
            }
        }
    }

    public class DashboardDto
    {
        public decimal TotalSales { get; set; }
        public int OrderCount { get; set; }
        public int CustomerCount { get; set; }
        public decimal AverageOrderValue { get; set; }
        public double GrowthRate { get; set; }
        public List<TopProductDto> TopProducts { get; set; } = new();
        public List<RecentOrderDto> RecentOrders { get; set; } = new();
        public List<DailySalesDto> DailySales { get; set; } = new();
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? StoreId { get; set; }
    }

    public class TopProductDto
    {
        public long ProductId { get; set; }
        public string ProductTitle { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Revenue { get; set; }
    }

    public class RecentOrderDto
    {
        public int OrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class DailySalesDto
    {
        public DateTime Date { get; set; }
        public decimal Sales { get; set; }
        public int Orders { get; set; }
    }

    public class RefreshRequest
    {
        public int StoreId { get; set; }
    }

    public class SyncStatusDto
    {
        public int StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;
        public DateTime? LastProductSync { get; set; }
        public int ProductCount { get; set; }
        public int CustomerCount { get; set; }
        public int OrderCount { get; set; }
        public bool IsActive { get; set; }
    }
}