using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.YearOverYear;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// デバッグ用コントローラー - 商品数問題の調査用
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class DebugController : ControllerBase
    {
        private readonly ShopifyDbContext _context;
        private readonly IYearOverYearOrchestrationService _yearOverYearService;
        private readonly ILogger<DebugController> _logger;

        public DebugController(
            ShopifyDbContext context,
            IYearOverYearOrchestrationService yearOverYearService,
            ILogger<DebugController> logger)
        {
            _context = context;
            _yearOverYearService = yearOverYearService;
            _logger = logger;
        }

        /// <summary>
        /// 商品数の調査
        /// </summary>
        [HttpGet("investigate-product-count")]
        public async Task<IActionResult> InvestigateProductCount(
            [FromQuery] int storeId = 1,
            [FromQuery] int year = 2025)
        {
            var result = new
            {
                Timestamp = DateTime.UtcNow,
                StoreId = storeId,
                Year = year,
                
                // 1. データベース内の商品数
                DatabaseProductCount = await _context.Products
                    .Where(p => p.StoreId == storeId)
                    .CountAsync(),
                
                // 2. OrderItems内のユニーク商品数
                UniqueProductsInOrderItems = await _context.OrderItems
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Order!.StoreId == storeId)
                    .Select(oi => oi.ProductTitle)
                    .Distinct()
                    .CountAsync(),
                
                // 3. 2024-2025年のOrderItems数
                OrderItemsIn2024_2025 = await _context.OrderItems
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Order!.StoreId == storeId &&
                                (oi.Order.CreatedAt.Year == year || oi.Order.CreatedAt.Year == year - 1))
                    .CountAsync(),
                
                // 4. 2024-2025年のユニーク商品数
                UniqueProductsIn2024_2025 = await _context.OrderItems
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Order!.StoreId == storeId &&
                                (oi.Order.CreatedAt.Year == year || oi.Order.CreatedAt.Year == year - 1))
                    .Select(oi => oi.ProductTitle)
                    .Distinct()
                    .CountAsync(),
                
                // 5. APIから取得される商品数（制限なし）
                ApiProductCount = await GetApiProductCount(storeId, year, null),
                
                // 6. APIから取得される商品数（制限: 6）
                ApiProductCountWithLimit6 = await GetApiProductCount(storeId, year, 6),
                
                // 7. 最初の10商品リスト
                Top10Products = await GetTop10Products(storeId, year),
                
                // 8. サービス項目の数
                ServiceItemCount = await GetServiceItemCount(storeId, year),
                
                // 9. デバッグ情報
                DebugInfo = new
                {
                    ControllerLimit = "No hardcoded limit found in controller",
                    ServiceLimit = "FilterService applies limit from request.Limit parameter",
                    DefaultLimit = "YearOverYearRequest.Limit has no default value (null)",
                    Conclusion = "If only 6 products shown, frontend must be setting limit=6"
                }
            };
            
            _logger.LogInformation("Product count investigation completed: {@Result}", result);
            
            return Ok(result);
        }
        
        private async Task<int> GetApiProductCount(int storeId, int year, int? limit)
        {
            try
            {
                var request = new YearOverYearRequest
                {
                    StoreId = storeId,
                    Year = year,
                    ViewMode = "sales",
                    Limit = limit
                };
                
                var response = await _yearOverYearService.GetYearOverYearAnalysisAsync(request);
                return response.Products.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting API product count");
                return -1;
            }
        }
        
        private async Task<List<object>> GetTop10Products(int storeId, int year)
        {
            var products = await _context.OrderItems
                .Include(oi => oi.Order)
                .Where(oi => oi.Order!.StoreId == storeId &&
                            (oi.Order.CreatedAt.Year == year || oi.Order.CreatedAt.Year == year - 1))
                .GroupBy(oi => new { oi.ProductTitle, oi.ProductType, oi.ProductVendor })
                .Select(g => new
                {
                    ProductTitle = g.Key.ProductTitle,
                    ProductType = g.Key.ProductType,
                    ProductVendor = g.Key.ProductVendor,
                    OrderCount = g.Count(),
                    TotalSales = g.Sum(oi => oi.TotalPrice)
                })
                .OrderByDescending(p => p.TotalSales)
                .Take(10)
                .ToListAsync();
                
            return products.Cast<object>().ToList();
        }
        
        private async Task<int> GetServiceItemCount(int storeId, int year)
        {
            var serviceKeywords = new[] { "代引き手数料", "送料", "手数料", "サービス料", "配送料", "決済手数料", "包装料" };
            
            return await _context.OrderItems
                .Include(oi => oi.Order)
                .Where(oi => oi.Order!.StoreId == storeId &&
                            (oi.Order.CreatedAt.Year == year || oi.Order.CreatedAt.Year == year - 1) &&
                            serviceKeywords.Any(keyword => oi.ProductTitle.Contains(keyword)))
                .Select(oi => oi.ProductTitle)
                .Distinct()
                .CountAsync();
        }
    }
}