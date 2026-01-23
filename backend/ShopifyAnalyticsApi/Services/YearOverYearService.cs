using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Helpers;
using ShopifyAnalyticsApi.Models;
using System.Diagnostics;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 前年同月比分析サービス
    /// </summary>
    public class YearOverYearService : IYearOverYearService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<YearOverYearService> _logger;

        // キャッシュキー定数
        private const string CACHE_KEY_PREFIX = "YearOverYear";
        private const int CACHE_DURATION_MINUTES = 30;

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

        // 月名マッピング
        private static readonly Dictionary<int, string> MonthNames = new()
        {
            { 1, "1月" }, { 2, "2月" }, { 3, "3月" }, { 4, "4月" },
            { 5, "5月" }, { 6, "6月" }, { 7, "7月" }, { 8, "8月" },
            { 9, "9月" }, { 10, "10月" }, { 11, "11月" }, { 12, "12月" }
        };

        public YearOverYearService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<YearOverYearService> logger)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        /// <summary>
        /// 前年同月比分析データを取得
        /// </summary>
        public async Task<YearOverYearResponse> GetYearOverYearAnalysisAsync(YearOverYearRequest request)
        {
            var stopwatch = Stopwatch.StartNew();
            var cacheKey = GenerateCacheKey(request);

            try
            {
                _logger.LogInformation("前年同月比分析開始: StoreId={StoreId}, Year={Year}, ViewMode={ViewMode}, ExcludeServiceItems={ExcludeServiceItems}",
                    request.StoreId, request.Year, request.ViewMode, request.ExcludeServiceItems);

                // キャッシュ確認
                if (_cache.TryGetValue(cacheKey, out YearOverYearResponse? cachedResponse))
                {
                    _logger.LogInformation("キャッシュから前年同月比データを取得");
                    cachedResponse!.Metadata.CacheHit = true;
                    return cachedResponse;
                }

                // データベースからデータ取得
                var currentYear = request.Year;
                var previousYear = request.Year - 1;

                // 注文明細データを取得（両年分）
                var rawData = await GetOrderItemsDataAsync(request, currentYear, previousYear);

                // 商品別月次データを集計
                var productDataList = await ProcessProductDataAsync(rawData, request, currentYear, previousYear);

                // フィルタリングとソート
                var filteredProducts = ApplyFiltersAndSorting(productDataList, request);

                // サマリー統計を計算
                var summary = CalculateSummary(filteredProducts, currentYear, previousYear, request.ViewMode);

                var response = new YearOverYearResponse
                {
                    Products = filteredProducts,
                    Summary = summary,
                    Metadata = new ResponseMetadata
                    {
                        GeneratedAt = DateTime.UtcNow,
                        ProcessingTimeMs = stopwatch.ElapsedMilliseconds,
                        DataSource = "Database",
                        CacheHit = false,
                        ApiVersion = "1.0"
                    }
                };

                // キャッシュに保存
                _cache.Set(cacheKey, response, TimeSpan.FromMinutes(CACHE_DURATION_MINUTES));

                _logger.LogInformation("前年同月比分析完了: 処理時間={ProcessingTime}ms, 商品数={ProductCount}",
                    stopwatch.ElapsedMilliseconds, filteredProducts.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "前年同月比分析でエラー発生: StoreId={StoreId}, Year={Year}",
                    request.StoreId, request.Year);
                throw;
            }
            finally
            {
                stopwatch.Stop();
            }
        }

        /// <summary>
        /// 注文明細データを取得
        /// ShopifyProcessedAt（決済完了日時）を基準に分析
        /// </summary>
        private async Task<List<OrderItemAnalysisData>> GetOrderItemsDataAsync(
            YearOverYearRequest request, int currentYear, int previousYear)
        {
            _logger.LogInformation("🔍 [YearOverYear] GetOrderItemsDataAsync開始: StoreId={StoreId}, CurrentYear={CurrentYear}, PreviousYear={PreviousYear}, StartMonth={StartMonth}, EndMonth={EndMonth}",
                request.StoreId, currentYear, previousYear, request.StartMonth, request.EndMonth);

            // まず、対象ストアの全注文データの年月分布を確認（デバッグ用）
            var orderDateDistribution = await _context.Orders
                .Where(o => o.StoreId == request.StoreId && o.ShopifyProcessedAt != null)
                .GroupBy(o => new { Year = o.ShopifyProcessedAt!.Value.Year, Month = o.ShopifyProcessedAt.Value.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            _logger.LogInformation("🔍 [YearOverYear] 注文データの年月分布（ShopifyProcessedAt基準）:");
            foreach (var item in orderDateDistribution)
            {
                _logger.LogInformation("  - {Year}年{Month}月: {Count}件", item.Year, item.Month, item.Count);
            }

            // デフォルト値を適用（nullの場合は1月〜12月）
            var startMonth = request.StartMonth ?? 1;
            var endMonth = request.EndMonth ?? 12;
            
            _logger.LogInformation("🔍 [YearOverYear] 月フィルター適用: StartMonth={StartMonth}, EndMonth={EndMonth} (リクエスト値: {ReqStart}, {ReqEnd})",
                startMonth, endMonth, request.StartMonth, request.EndMonth);

            var query = from orderItem in _context.OrderItems
                        join order in _context.Orders on orderItem.OrderId equals order.Id
                        where order.StoreId == request.StoreId
                           && order.ShopifyProcessedAt != null // ShopifyProcessedAtがnullでないことを確認
                           && (order.ShopifyProcessedAt.Value.Year == currentYear || order.ShopifyProcessedAt.Value.Year == previousYear)
                           && order.ShopifyProcessedAt.Value.Month >= startMonth
                           && order.ShopifyProcessedAt.Value.Month <= endMonth
                        select new OrderItemAnalysisData
                        {
                            ProductTitle = orderItem.ProductTitle,
                            ProductType = orderItem.ProductType ?? "未分類",
                            ProductVendor = orderItem.ProductVendor ?? "不明",
                            Year = order.ShopifyProcessedAt.Value.Year,
                            Month = order.ShopifyProcessedAt.Value.Month,
                            TotalPrice = orderItem.TotalPrice,
                            Quantity = orderItem.Quantity,
                            OrderCount = 1
                        };

            // 商品名検索フィルタ
            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                query = query.Where(x => x.ProductTitle.Contains(request.SearchTerm));
            }

            // 商品タイプフィルタ
            if (request.ProductTypes?.Any() == true)
            {
                query = query.Where(x => request.ProductTypes.Contains(x.ProductType));
            }

            // ベンダーフィルタ
            if (request.ProductVendors?.Any() == true)
            {
                query = query.Where(x => x.ProductVendor != null && request.ProductVendors.Contains(x.ProductVendor));
            }

            // カテゴリフィルタ
            if (!string.IsNullOrWhiteSpace(request.Category) && request.Category != "all")
            {
                query = query.Where(x => x.ProductType == request.Category);
            }

            // サービス項目除外フィルタ
            if (request.ExcludeServiceItems)
            {
                _logger.LogDebug("サービス項目除外フィルターを適用: Keywords={Keywords}", string.Join(", ", ServiceItemKeywords));
                query = query.Where(x => !ServiceItemKeywords.Any(keyword => x.ProductTitle.Contains(keyword)));
            }

            var result = await query.ToListAsync();

            // 取得結果の年月分布をログ出力
            var resultDistribution = result
                .GroupBy(x => new { x.Year, x.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count(), TotalPrice = g.Sum(x => x.TotalPrice) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToList();

            _logger.LogInformation("🔍 [YearOverYear] 取得結果の年月分布（OrderItems）: 合計{Total}件", result.Count);
            foreach (var item in resultDistribution)
            {
                _logger.LogInformation("  - {Year}年{Month}月: {Count}件, 売上={TotalPrice:N0}円", item.Year, item.Month, item.Count, item.TotalPrice);
            }

            return result;
        }

        /// <summary>
        /// 商品別月次データを処理
        /// </summary>
        private async Task<List<YearOverYearProductData>> ProcessProductDataAsync(
            List<OrderItemAnalysisData> rawData, YearOverYearRequest request, int currentYear, int previousYear)
        {
            // 商品別・年月別に集計
            var aggregatedData = rawData
                .GroupBy(x => new { x.ProductTitle, x.ProductType, x.ProductVendor, x.Year, x.Month })
                .Select(g => new ProductAggregateData
                {
                    ProductTitle = g.Key.ProductTitle,
                    ProductType = g.Key.ProductType,
                    ProductVendor = g.Key.ProductVendor,
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalSales = g.Sum(x => x.TotalPrice),
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalOrders = g.Count()
                })
                .ToList();

            // 商品別にグループ化して月次データを作成
            var productGroups = aggregatedData
                .GroupBy(x => new { x.ProductTitle, x.ProductType, x.ProductVendor })
                .Select(productGroup => new YearOverYearProductData
                {
                    ProductTitle = productGroup.Key.ProductTitle,
                    ProductType = productGroup.Key.ProductType,
                    Vendor = productGroup.Key.ProductVendor,
                    MonthlyData = CreateMonthlyData(productGroup.ToList(), request, currentYear, previousYear)
                })
                .ToList();

            // 総計と成長率を計算
            foreach (var product in productGroups)
            {
                CalculateProductTotals(product, request.ViewMode);
            }

            return productGroups;
        }

        /// <summary>
        /// 月次データ作成
        /// </summary>
        private List<MonthlyComparisonData> CreateMonthlyData(
            List<ProductAggregateData> productData, YearOverYearRequest request, int currentYear, int previousYear)
        {
            var monthlyData = new List<MonthlyComparisonData>();

            for (int month = request.StartMonth ?? 1; month <= (request.EndMonth ?? 12); month++)
            {
                var currentData = productData.FirstOrDefault(x => x.Year == currentYear && x.Month == month);
                var previousData = productData.FirstOrDefault(x => x.Year == previousYear && x.Month == month);

                decimal currentValue = GetValueByMode(currentData, request.ViewMode);
                decimal previousValue = GetValueByMode(previousData, request.ViewMode);
                decimal growthRate = CalculateGrowthRate(currentValue, previousValue);

                monthlyData.Add(new MonthlyComparisonData
                {
                    Month = month,
                    MonthName = MonthNames[month],
                    CurrentValue = currentValue,
                    PreviousValue = previousValue,
                    GrowthRate = growthRate,
                    GrowthCategory = DetermineGrowthCategory(growthRate)
                });
            }

            return monthlyData;
        }

        /// <summary>
        /// ビューモードに応じた値を取得
        /// </summary>
        private decimal GetValueByMode(ProductAggregateData? data, string viewMode)
        {
            if (data == null) return 0;

            return viewMode switch
            {
                "sales" => data.TotalSales,
                "quantity" => data.TotalQuantity,
                "orders" => data.TotalOrders,
                _ => data.TotalSales
            };
        }

        /// <summary>
        /// 商品の総計と成長率を計算
        /// </summary>
        private void CalculateProductTotals(YearOverYearProductData product, string viewMode)
        {
            product.CurrentYearValue = product.MonthlyData.Sum(m => m.CurrentValue);
            product.PreviousYearValue = product.MonthlyData.Sum(m => m.PreviousValue);
            product.GrowthRate = CalculateGrowthRate(product.CurrentYearValue, product.PreviousYearValue);
            
            // 成長カテゴリを設定
            product.GrowthCategory = DetermineGrowthCategory(product.GrowthRate);
        }

        /// <summary>
        /// 成長率計算
        /// </summary>
        private decimal CalculateGrowthRate(decimal current, decimal previous)
        {
            if (previous == 0)
            {
                return current > 0 ? 100 : 0; // 前年がゼロで今年にデータがある場合は100%成長
            }
            return Math.Round(((current - previous) / previous) * 100, 2);
        }

        /// <summary>
        /// 成長カテゴリ決定
        /// </summary>
        private string DetermineGrowthCategory(decimal growthRate)
        {
            return growthRate switch
            {
                >= 20 => "高成長",
                >= 0 => "成長",
                >= -10 => "減少",
                _ => "大幅減少"
            };
        }

        /// <summary>
        /// フィルタリングとソート適用
        /// </summary>
        private List<YearOverYearProductData> ApplyFiltersAndSorting(
            List<YearOverYearProductData> products, YearOverYearRequest request)
        {
            var filtered = products.AsEnumerable();

            // 成長率フィルタ
            filtered = request.GrowthRateFilter switch
            {
                "positive" => filtered.Where(p => p.GrowthRate > 0),
                "negative" => filtered.Where(p => p.GrowthRate < 0),
                "high_growth" => filtered.Where(p => p.GrowthRate >= 20),
                "high_decline" => filtered.Where(p => p.GrowthRate <= -20),
                _ => filtered
            };

            // ソート
            filtered = request.SortBy switch
            {
                "growth_rate" => request.SortDescending 
                    ? filtered.OrderByDescending(p => p.GrowthRate)
                    : filtered.OrderBy(p => p.GrowthRate),
                "total_sales" => request.SortDescending 
                    ? filtered.OrderByDescending(p => p.CurrentYearValue)
                    : filtered.OrderBy(p => p.CurrentYearValue),
                "name" => request.SortDescending 
                    ? filtered.OrderByDescending(p => p.ProductName)
                    : filtered.OrderBy(p => p.ProductName),
                _ => filtered.OrderByDescending(p => p.GrowthRate)
            };

            return filtered.ToList();
        }

        /// <summary>
        /// サマリー統計計算
        /// </summary>
        private YearOverYearSummary CalculateSummary(
            List<YearOverYearProductData> products, int currentYear, int previousYear, string viewMode)
        {
            var totalProducts = products.Count;
            var growingProducts = products.Count(p => p.GrowthRate > 0);
            var decliningProducts = products.Count(p => p.GrowthRate < 0);
            var newProducts = products.Count(p => p.PreviousYearValue == 0 && p.CurrentYearValue > 0);

            var currentYearTotal = products.Sum(p => p.CurrentYearValue);
            var previousYearTotal = products.Sum(p => p.PreviousYearValue);
            var overallGrowthRate = CalculateGrowthRate(currentYearTotal, previousYearTotal);

            var topGrowthProduct = products
                .Where(p => p.GrowthRate > 0)
                .OrderByDescending(p => p.GrowthRate)
                .FirstOrDefault();

            var topSalesProduct = products
                .OrderByDescending(p => p.CurrentYearValue)
                .FirstOrDefault();

            return new YearOverYearSummary
            {
                CurrentYear = currentYear,
                PreviousYear = previousYear,
                TotalProducts = totalProducts,
                GrowingProducts = growingProducts,
                DecliningProducts = decliningProducts,
                NewProducts = newProducts,
                OverallGrowthRate = overallGrowthRate,
                CurrentYearTotalSales = currentYearTotal,
                PreviousYearTotalSales = previousYearTotal,
                TopGrowthProduct = topGrowthProduct != null ? new TopPerformingProduct
                {
                    ProductTitle = topGrowthProduct.ProductName,
                    ProductType = topGrowthProduct.ProductType,
                    Value = topGrowthProduct.CurrentYearValue,
                    GrowthRate = topGrowthProduct.GrowthRate
                } : null,
                TopSalesProduct = topSalesProduct != null ? new TopPerformingProduct
                {
                    ProductTitle = topSalesProduct.ProductName,
                    ProductType = topSalesProduct.ProductType,
                    Value = topSalesProduct.CurrentYearValue,
                    GrowthRate = topSalesProduct.GrowthRate
                } : null
            };
        }

        /// <summary>
        /// 利用可能な商品タイプ一覧を取得
        /// </summary>
        public async Task<List<string>> GetAvailableProductTypesAsync(int storeId)
        {
            var cacheKey = $"{CACHE_KEY_PREFIX}_ProductTypes_{storeId}";
            
            if (_cache.TryGetValue(cacheKey, out List<string>? cachedTypes))
            {
                return cachedTypes!;
            }

            var productTypes = await _context.OrderItems
                .Join(_context.Orders, oi => oi.OrderId, o => o.Id, (oi, o) => new { oi, o })
                .Where(x => x.o.StoreId == storeId)
                .Select(x => x.oi.ProductType ?? "未分類")
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            _cache.Set(cacheKey, productTypes, TimeSpan.FromHours(2));
            return productTypes;
        }

        /// <summary>
        /// 利用可能なベンダー一覧を取得
        /// </summary>
        public async Task<List<string>> GetAvailableVendorsAsync(int storeId)
        {
            var cacheKey = $"{CACHE_KEY_PREFIX}_Vendors_{storeId}";
            
            if (_cache.TryGetValue(cacheKey, out List<string>? cachedVendors))
            {
                return cachedVendors!;
            }

            var vendors = await _context.OrderItems
                .Join(_context.Orders, oi => oi.OrderId, o => o.Id, (oi, o) => new { oi, o })
                .Where(x => x.o.StoreId == storeId && !string.IsNullOrEmpty(x.oi.ProductVendor))
                .Select(x => x.oi.ProductVendor!)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            _cache.Set(cacheKey, vendors, TimeSpan.FromHours(2));
            return vendors;
        }

        /// <summary>
        /// 指定ストアの分析可能期間を取得
        /// </summary>
        public async Task<(int EarliestYear, int LatestYear)> GetAnalysisDateRangeAsync(int storeId)
        {
            var cacheKey = $"{CACHE_KEY_PREFIX}_DateRange_{storeId}";
            
            if (_cache.TryGetValue(cacheKey, out (int, int) cachedRange))
            {
                return cachedRange;
            }

            var dateRange = await _context.Orders
                .Where(o => o.StoreId == storeId)
                .GroupBy(o => 1)
                .Select(g => new
                {
                    EarliestYear = g.Min(o => (o.ShopifyProcessedAt ?? o.ShopifyCreatedAt ?? o.CreatedAt).Year),
                    LatestYear = g.Max(o => (o.ShopifyProcessedAt ?? o.ShopifyCreatedAt ?? o.CreatedAt).Year)
                })
                .FirstOrDefaultAsync();

            var result = dateRange != null 
                ? (dateRange.EarliestYear, dateRange.LatestYear)
                : (DateTime.Now.Year, DateTime.Now.Year);

            _cache.Set(cacheKey, result, TimeSpan.FromHours(4));
            return result;
        }

        /// <summary>
        /// キャッシュキー生成
        /// </summary>
        private string GenerateCacheKey(YearOverYearRequest request)
        {
            var keyParts = new[]
            {
                CACHE_KEY_PREFIX,
                request.StoreId.ToString(),
                request.Year.ToString(),
                request.StartMonth.ToString(),
                request.EndMonth.ToString(),
                request.ViewMode,
                request.SortBy,
                request.SortDescending.ToString(),
                request.GrowthRateFilter,
                request.Category ?? "all",
                string.Join(",", request.ProductTypes ?? new List<string>()),
                string.Join(",", request.ProductVendors ?? new List<string>()),
                request.SearchTerm ?? "",
                request.ExcludeServiceItems.ToString()
            };

            return string.Join("_", keyParts);
        }
    }

    /// <summary>
    /// 注文明細分析用データ
    /// </summary>
    internal class OrderItemAnalysisData
    {
        public string ProductTitle { get; set; } = string.Empty;
        public string ProductType { get; set; } = string.Empty;
        public string ProductVendor { get; set; } = string.Empty;
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TotalPrice { get; set; }
        public int Quantity { get; set; }
        public int OrderCount { get; set; }
    }

    /// <summary>
    /// 商品集計データ
    /// </summary>
    internal class ProductAggregateData
    {
        public string ProductTitle { get; set; } = string.Empty;
        public string ProductType { get; set; } = string.Empty;
        public string ProductVendor { get; set; } = string.Empty;
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TotalSales { get; set; }
        public int TotalQuantity { get; set; }
        public int TotalOrders { get; set; }
    }
}