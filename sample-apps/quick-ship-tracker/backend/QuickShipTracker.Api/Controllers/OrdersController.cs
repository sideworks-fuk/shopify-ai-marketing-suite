using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;

namespace QuickShipTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IShopifyService _shopifyService;
    private readonly AppDbContext _context;

    public OrdersController(IShopifyService shopifyService, AppDbContext context)
    {
        _shopifyService = shopifyService;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        // Validate pagination parameters
        if (page < 1) page = 1;
        if (limit < 1 || limit > 250) limit = 50;

        try
        {
            // Sync orders from Shopify first
            var orders = await _shopifyService.GetOrdersAsync(shopId.Value, page, limit, status);
            
            // Save/update orders in local database
            foreach (var orderDto in orders)
            {
                var existingOrder = await _context.Orders
                    .Include(o => o.TrackingInfo)
                    .FirstOrDefaultAsync(o => o.ShopId == shopId.Value && o.ShopifyOrderId == long.Parse(orderDto.Id));

                if (existingOrder == null)
                {
                    var newOrder = new Core.Models.Order
                    {
                        ShopId = shopId.Value,
                        ShopifyOrderId = long.Parse(orderDto.Id),
                        OrderNumber = orderDto.OrderNumber,
                        CustomerName = orderDto.CustomerName,
                        CustomerEmail = orderDto.Email,
                        TotalPrice = decimal.Parse(orderDto.TotalPrice),
                        Currency = orderDto.Currency,
                        FulfillmentStatus = orderDto.FulfillmentStatus,
                        OrderCreatedAt = orderDto.CreatedAt,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Orders.Add(newOrder);
                }
                else
                {
                    // Include tracking info if exists
                    if (existingOrder.TrackingInfo != null)
                    {
                        orderDto.TrackingInfo = new TrackingInfoDto
                        {
                            Carrier = existingOrder.TrackingInfo.Carrier,
                            TrackingNumber = existingOrder.TrackingInfo.TrackingNumber,
                            TrackingUrl = existingOrder.TrackingInfo.TrackingUrl,
                            ShippedAt = existingOrder.TrackingInfo.ShippedAt
                        };
                    }
                }
            }

            await _context.SaveChangesAsync();

            // Apply search filter if provided
            if (!string.IsNullOrWhiteSpace(search))
            {
                orders = orders.Where(o =>
                    o.OrderNumber.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    o.CustomerName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    o.Email.Contains(search, StringComparison.OrdinalIgnoreCase)
                ).ToList();
            }

            var totalOrders = await _context.Orders.CountAsync(o => o.ShopId == shopId.Value);
            var totalPages = (int)Math.Ceiling(totalOrders / (double)limit);

            var result = new
            {
                orders = orders,
                pagination = new PaginationInfo
                {
                    Total = totalOrders,
                    Page = page,
                    Limit = limit,
                    TotalPages = totalPages
                }
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to fetch orders", ex.Message));
        }
    }

    [HttpGet("{orderId}")]
    public async Task<IActionResult> GetOrderDetail(string orderId)
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        try
        {
            if (!long.TryParse(orderId, out var orderIdLong))
            {
                return BadRequest(new ErrorResponse("VALIDATION_ERROR", "Invalid order ID"));
            }

            var orderDetail = await _shopifyService.GetOrderDetailAsync(shopId.Value, orderIdLong);
            if (orderDetail == null)
            {
                return NotFound(new ErrorResponse("NOT_FOUND", "Order not found"));
            }

            // Check if order has tracking info in database
            var localOrder = await _context.Orders
                .Include(o => o.TrackingInfo)
                .FirstOrDefaultAsync(o => o.ShopId == shopId.Value && o.ShopifyOrderId == orderIdLong);

            if (localOrder?.TrackingInfo != null)
            {
                orderDetail.TrackingInfo = new TrackingInfoDto
                {
                    Carrier = localOrder.TrackingInfo.Carrier,
                    TrackingNumber = localOrder.TrackingInfo.TrackingNumber,
                    TrackingUrl = localOrder.TrackingInfo.TrackingUrl,
                    ShippedAt = localOrder.TrackingInfo.ShippedAt
                };
            }

            return Ok(orderDetail);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to fetch order detail", ex.Message));
        }
    }

    private long? GetShopId()
    {
        var shopIdClaim = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(shopIdClaim))
        {
            return null;
        }

        if (long.TryParse(shopIdClaim, out var shopId))
        {
            return shopId;
        }

        return null;
    }
}