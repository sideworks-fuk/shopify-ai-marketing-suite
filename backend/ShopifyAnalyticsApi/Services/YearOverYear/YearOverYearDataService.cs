using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.YearOverYear;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比データアクセスサービスの実装
    /// 責任範囲: データクエリ・マスタデータ取得
    /// </summary>
    public class YearOverYearDataService : IYearOverYearDataService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<YearOverYearDataService> _logger;

        // サービス項目キーワード
        private static readonly string[] ServiceItemKeywords = new[]
        {
            "代引き手数料",
            "送料",
            "手数料",
            "サービス料",
            "配送料",
            "決済手数料",
            "包装料"
        };

        public YearOverYearDataService(
            ShopifyDbContext context,
            ILogger<YearOverYearDataService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 注文商品データを取得
        /// </summary>
        public async Task<List<OrderItemAnalysisData>> GetOrderItemsDataAsync(YearOverYearRequest request, int currentYear, int previousYear)
        {
            try
            {
                _logger.LogDebug("注文商品データ取得開始: StoreId={StoreId}, CurrentYear={CurrentYear}, PreviousYear={PreviousYear}", 
                    request.StoreId, currentYear, previousYear);

                var query = _context.OrderItems
                    .Include(oi => oi.Order)
                    .Where(oi => oi.Order!.StoreId == request.StoreId &&
                                oi.Order.ShopifyProcessedAt != null &&
                                (oi.Order.ShopifyProcessedAt.Value.Year == currentYear || oi.Order.ShopifyProcessedAt.Value.Year == previousYear));

                // 商品タイプフィルター
                if (!string.IsNullOrEmpty(request.ProductType) && request.ProductType != "all")
                {
                    query = query.Where(oi => oi.ProductType == request.ProductType);
                }

                // ベンダーフィルター
                if (!string.IsNullOrEmpty(request.Vendor) && request.Vendor != "all")
                {
                    query = query.Where(oi => oi.ProductVendor == request.Vendor);
                }

                // 月範囲フィルター
                if (request.StartMonth.HasValue && request.EndMonth.HasValue)
                {
                    query = query.Where(oi => oi.Order!.ShopifyProcessedAt != null &&
                                            oi.Order.ShopifyProcessedAt.Value.Month >= request.StartMonth.Value &&
                                            oi.Order.ShopifyProcessedAt.Value.Month <= request.EndMonth.Value);
                }

                // サービス項目除外フィルター
                if (request.ExcludeServiceItems)
                {
                    _logger.LogDebug("サービス項目除外フィルターを適用: Keywords={Keywords}", string.Join(", ", ServiceItemKeywords));
                    query = query.Where(oi => !ServiceItemKeywords.Any(keyword => oi.ProductTitle.Contains(keyword)));
                }

                var data = await query
                    .Where(oi => oi.Order!.ShopifyProcessedAt != null)
                    .GroupBy(oi => new
                    {
                        ProductName = oi.ProductTitle,
                        ProductType = oi.ProductType,
                        Vendor = oi.ProductVendor,
                        Year = oi.Order!.ShopifyProcessedAt!.Value.Year,
                        Month = oi.Order.ShopifyProcessedAt.Value.Month
                    })
                    .Select(g => new OrderItemAnalysisData
                    {
                        ProductName = g.Key.ProductName ?? "不明",
                        ProductType = g.Key.ProductType ?? "不明",
                        Vendor = g.Key.Vendor ?? "不明",
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        TotalRevenue = g.Sum(oi => oi.TotalPrice),
                        TotalQuantity = g.Sum(oi => oi.Quantity),
                        TotalOrders = g.Select(oi => oi.OrderId).Distinct().Count(),
                        AverageOrderValue = g.Sum(oi => oi.TotalPrice) / 
                                          Math.Max(g.Select(oi => oi.OrderId).Distinct().Count(), 1)
                    })
                    .ToListAsync();

                _logger.LogDebug("注文商品データ取得完了: 件数={Count}", data.Count);
                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "注文商品データ取得中にエラーが発生: StoreId={StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 利用可能な商品タイプを取得
        /// </summary>
        public async Task<List<string>> GetAvailableProductTypesAsync(int storeId)
        {
            try
            {
                _logger.LogDebug("商品タイプ取得開始: StoreId={StoreId}", storeId);

                var productTypes = await _context.Products
                    .Where(p => p.StoreId == storeId && !string.IsNullOrEmpty(p.ProductType))
                    .Select(p => p.ProductType!)
                    .Distinct()
                    .OrderBy(pt => pt)
                    .ToListAsync();

                _logger.LogDebug("商品タイプ取得完了: 件数={Count}", productTypes.Count);
                return productTypes;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "商品タイプ取得中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// 利用可能なベンダーを取得
        /// </summary>
        public async Task<List<string>> GetAvailableVendorsAsync(int storeId)
        {
            try
            {
                _logger.LogDebug("ベンダー取得開始: StoreId={StoreId}", storeId);

                var vendors = await _context.Products
                    .Where(p => p.StoreId == storeId && !string.IsNullOrEmpty(p.Vendor))
                    .Select(p => p.Vendor!)
                    .Distinct()
                    .OrderBy(v => v)
                    .ToListAsync();

                _logger.LogDebug("ベンダー取得完了: 件数={Count}", vendors.Count);
                return vendors;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ベンダー取得中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// 分析可能な期間を取得
        /// </summary>
        public async Task<(int EarliestYear, int LatestYear)> GetAnalysisDateRangeAsync(int storeId)
        {
            try
            {
                _logger.LogDebug("分析期間取得開始: StoreId={StoreId}", storeId);

                var orders = await _context.Orders
                    .Where(o => o.StoreId == storeId && o.ShopifyProcessedAt != null)
                    .Select(o => o.ShopifyProcessedAt!.Value.Year)
                    .ToListAsync();

                if (!orders.Any())
                {
                    var currentYear = DateTime.UtcNow.Year;
                    return (currentYear, currentYear);
                }

                var earliestYear = orders.Min();
                var latestYear = orders.Max();

                _logger.LogDebug("分析期間取得完了: EarliestYear={EarliestYear}, LatestYear={LatestYear}", 
                    earliestYear, latestYear);

                return (earliestYear, latestYear);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "分析期間取得中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }
    }
}