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

                // Products テーブルとLEFT JOINしてCategory（Shopify標準分類）を取得
                var baseQuery = from oi in _context.OrderItems
                                join o in _context.Orders on oi.OrderId equals o.Id
                                join p in _context.Products
                                    on new { ProductId = oi.ShopifyProductId, StoreId = o.StoreId }
                                    equals new { ProductId = p.ShopifyProductId, StoreId = p.StoreId }
                                    into productJoin
                                from p in productJoin.DefaultIfEmpty()
                                where o.StoreId == request.StoreId
                                   && o.ShopifyProcessedAt != null
                                   && !o.IsTest
                                   && (o.ShopifyProcessedAt.Value.Year == currentYear || o.ShopifyProcessedAt.Value.Year == previousYear)
                                select new { oi, o, p };

                // 商品タイプフィルター（Products.Categoryを使用）
                if (!string.IsNullOrEmpty(request.ProductType) && request.ProductType != "all")
                {
                    baseQuery = baseQuery.Where(x =>
                        (x.p != null && x.p.Category != null ? x.p.Category : "未分類") == request.ProductType);
                }

                // ベンダーフィルター
                if (!string.IsNullOrEmpty(request.Vendor) && request.Vendor != "all")
                {
                    baseQuery = baseQuery.Where(x => x.oi.ProductVendor == request.Vendor);
                }

                // 月範囲フィルター
                if (request.StartMonth.HasValue && request.EndMonth.HasValue)
                {
                    baseQuery = baseQuery.Where(x => x.o.ShopifyProcessedAt!.Value.Month >= request.StartMonth.Value &&
                                                     x.o.ShopifyProcessedAt!.Value.Month <= request.EndMonth.Value);
                }

                // サービス項目除外フィルター
                if (request.ExcludeServiceItems)
                {
                    _logger.LogDebug("サービス項目除外フィルターを適用: Keywords={Keywords}", string.Join(", ", ServiceItemKeywords));
                    baseQuery = baseQuery.Where(x => !ServiceItemKeywords.Any(keyword => x.oi.ProductTitle.Contains(keyword)));
                }

                var data = await baseQuery
                    .GroupBy(x => new
                    {
                        ProductName = x.oi.ProductTitle,
                        ProductType = x.p != null && x.p.Category != null ? x.p.Category : "未分類",
                        Vendor = x.oi.ProductVendor,
                        Year = x.o.ShopifyProcessedAt!.Value.Year,
                        Month = x.o.ShopifyProcessedAt!.Value.Month
                    })
                    .Select(g => new OrderItemAnalysisData
                    {
                        ProductName = g.Key.ProductName ?? "不明",
                        ProductType = g.Key.ProductType,
                        Vendor = g.Key.Vendor ?? "不明",
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        TotalRevenue = g.Sum(x => x.oi.TotalPrice),
                        TotalQuantity = g.Sum(x => x.oi.Quantity),
                        TotalOrders = g.Select(x => x.oi.OrderId).Distinct().Count(),
                        AverageOrderValue = g.Sum(x => x.oi.TotalPrice) /
                                          Math.Max(g.Select(x => x.oi.OrderId).Distinct().Count(), 1)
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

                // Products.Category（Shopify標準分類）から取得。ProductTypeとは混ぜない
                var productTypes = await _context.Products
                    .Where(p => p.StoreId == storeId && p.IsActive && p.Category != null)
                    .Select(p => p.Category!)
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