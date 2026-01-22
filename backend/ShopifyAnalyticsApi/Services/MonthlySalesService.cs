using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Helpers;
using System.Diagnostics;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 月別売上統計サービスのインターフェース
    /// </summary>
    public interface IMonthlySalesService
    {
        Task<MonthlySalesResponse> GetMonthlySalesAsync(MonthlySalesRequest request);
        Task<MonthlySalesSummary> GetMonthlySalesSummaryAsync(MonthlySalesRequest request);
        Task<List<CategorySalesSummary>> GetCategorySalesAsync(MonthlySalesRequest request);
        Task<List<MonthlySalesTrend>> GetSalesTrendAsync(int storeId, int year);
    }

    /// <summary>
    /// 月別売上統計サービス
    /// Phase 1: 既存のOrder/OrderItemデータを活用した基本実装
    /// </summary>
    public class MonthlySalesService : IMonthlySalesService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<MonthlySalesService> _logger;
        private readonly IConfiguration _configuration;

        // キャッシュ設定
        private TimeSpan CacheDuration => TimeSpan.FromMinutes(_configuration.GetValue<int>("MonthlySalesCacheMinutes", 30));
        private int MaxCacheProducts => _configuration.GetValue<int>("MaxCacheProducts", 1000);

        public MonthlySalesService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<MonthlySalesService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// 月別売上統計を取得
        /// </summary>
        public async Task<MonthlySalesResponse> GetMonthlySalesAsync(MonthlySalesRequest request)
        {
            var stopwatch = Stopwatch.StartNew();
            var logProperties = new Dictionary<string, object>
            {
                { "StoreId", request.StoreId },
                { "Period", $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}" },
                { "DisplayMode", request.DisplayMode },
                { "MaxProducts", request.MaxProducts ?? 100 }
            };

            _logger.LogInformation("月別売上統計分析開始 {LogProperties}", logProperties);

            try
            {
                // バリデーション
                ValidateRequest(request);

                // キャッシュキー生成
                var cacheKey = GenerateCacheKey("monthly_sales", request);

                // キャッシュチェック
                if (_cache.TryGetValue(cacheKey, out MonthlySalesResponse? cachedResponse))
                {
                    _logger.LogInformation("月別売上統計データをキャッシュから取得 CacheKey: {CacheKey}", cacheKey);
                    return cachedResponse!;
                }

                // データ取得と計算
                var response = await CalculateMonthlySalesAsync(request);

                // パフォーマンス情報の設定
                stopwatch.Stop();
                response.Metadata.CalculationTimeMs = stopwatch.ElapsedMilliseconds;
                response.Metadata.GeneratedAt = DateTime.UtcNow;

                // キャッシュに保存
                _cache.Set(cacheKey, response, CacheDuration);

                _logger.LogInformation("月別売上統計分析完了 Products: {ProductCount}, ProcessingTime: {ProcessingTime}ms",
                    response.Products.Count, stopwatch.ElapsedMilliseconds);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "月別売上統計分析エラー {LogProperties}", logProperties);
                throw;
            }
        }

        /// <summary>
        /// 月別売上サマリーを取得
        /// </summary>
        public async Task<MonthlySalesSummary> GetMonthlySalesSummaryAsync(MonthlySalesRequest request)
        {
            var response = await GetMonthlySalesAsync(request);
            return response.Summary;
        }

        /// <summary>
        /// カテゴリ別売上を取得
        /// </summary>
        public async Task<List<CategorySalesSummary>> GetCategorySalesAsync(MonthlySalesRequest request)
        {
            var salesData = await GetSalesCalculationDataAsync(request);

            var categorySales = salesData
                .GroupBy(s => s.ProductType)
                .Select(g => new CategorySalesSummary
                {
                    Category = g.Key,
                    ProductCount = g.Select(x => x.ProductId).Distinct().Count(),
                    TotalAmount = g.Sum(x => x.Amount)
                })
                .OrderByDescending(c => c.TotalAmount)
                .ToList();

            // 構成比計算
            var totalAmount = categorySales.Sum(c => c.TotalAmount);
            foreach (var category in categorySales)
            {
                category.Percentage = totalAmount > 0 ? Math.Round((category.TotalAmount / totalAmount) * 100, 1) : 0;
            }

            return categorySales;
        }

        /// <summary>
        /// 売上トレンドを取得
        /// </summary>
        public async Task<List<MonthlySalesTrend>> GetSalesTrendAsync(int storeId, int year)
        {
            var request = new MonthlySalesRequest
            {
                StoreId = storeId,
                StartYear = year,
                StartMonth = 1,
                EndYear = year,
                EndMonth = 12
            };

            var salesData = await GetSalesCalculationDataAsync(request);

            var monthlyTrends = salesData
                .GroupBy(s => s.Month)
                .Select(g => new MonthlySalesTrend
                {
                    Month = g.Key,
                    MonthName = GetMonthName(g.Key),
                    AverageAmount = g.Sum(x => x.Amount)
                })
                .OrderBy(m => m.Month)
                .ToList();

            // 売上指数計算（年平均を100とした場合）
            var yearlyAverage = monthlyTrends.Any() ? monthlyTrends.Average(m => m.AverageAmount) : 0;
            foreach (var trend in monthlyTrends)
            {
                trend.SalesIndex = yearlyAverage > 0 ? Math.Round((trend.AverageAmount / yearlyAverage) * 100, 1) : 100;
                trend.TrendDirection = DetermineTrendDirection(trend.SalesIndex);
            }

            return monthlyTrends;
        }

        /// <summary>
        /// 月別売上統計の計算
        /// </summary>
        private async Task<MonthlySalesResponse> CalculateMonthlySalesAsync(MonthlySalesRequest request)
        {
            // 基礎データ取得
            var salesData = await GetSalesCalculationDataAsync(request);

            var response = new MonthlySalesResponse();

            // 商品別月次データの作成
            var productGroups = salesData.GroupBy(s => new { s.ProductId, s.ProductTitle, s.ProductType, s.ProductHandle });

            foreach (var productGroup in productGroups.Take(request.MaxProducts ?? 100))
            {
                var productData = CreateProductMonthlySalesData(productGroup, request);
                response.Products.Add(productData);
            }

            // サマリーの計算
            response.Summary = CalculateSummary(response.Products, request);

            // メタデータの設定
            response.Metadata = CreateMetadata(request, salesData.Count);

            return response;
        }

        /// <summary>
        /// 売上計算用データを取得
        /// </summary>
        private async Task<List<SalesCalculationData>> GetSalesCalculationDataAsync(MonthlySalesRequest request)
        {
            var startDate = new DateTime(request.StartYear, request.StartMonth, 1);
            var endDate = new DateTime(request.EndYear, request.EndMonth, DateTime.DaysInMonth(request.EndYear, request.EndMonth));

            var query = from order in _context.Orders
                        join orderItem in _context.OrderItems on order.Id equals orderItem.OrderId
                        where order.StoreId == request.StoreId
                           && (order.ShopifyProcessedAt ?? order.ShopifyCreatedAt ?? order.CreatedAt) >= startDate
                           && (order.ShopifyProcessedAt ?? order.ShopifyCreatedAt ?? order.CreatedAt) <= endDate
                           && order.FinancialStatus == "paid"
                        select new SalesCalculationData
                        {
                            ProductId = orderItem.ProductId ?? "unknown",
                            ProductTitle = orderItem.ProductTitle ?? "Unknown Product",
                            ProductType = orderItem.ProductType ?? "その他",
                            ProductHandle = orderItem.ProductHandle ?? "",
                            Year = (order.ShopifyProcessedAt ?? order.ShopifyCreatedAt ?? order.CreatedAt).Year,
                            Month = (order.ShopifyProcessedAt ?? order.ShopifyCreatedAt ?? order.CreatedAt).Month,
                            Quantity = orderItem.Quantity,
                            Amount = orderItem.TotalPrice,
                            OrderCount = 1
                        };

            // フィルター適用
            if (request.ProductIds?.Any() == true)
            {
                query = query.Where(s => request.ProductIds.Contains(s.ProductId));
            }

            if (!string.IsNullOrEmpty(request.CategoryFilter))
            {
                query = query.Where(s => s.ProductType.Contains(request.CategoryFilter));
            }

            if (request.MinAmount.HasValue)
            {
                query = query.Where(s => s.Amount >= request.MinAmount.Value);
            }

            var result = await query.ToListAsync();

            _logger.LogInformation("売上データ取得完了 Records: {RecordCount}", result.Count);

            return result;
        }

        /// <summary>
        /// 商品別月次売上データの作成
        /// </summary>
        private ProductMonthlySalesData CreateProductMonthlySalesData(
            IGrouping<dynamic, SalesCalculationData> productGroup, 
            MonthlySalesRequest request)
        {
            var key = productGroup.Key;
            var productData = new ProductMonthlySalesData
            {
                Id = key.ProductId,
                Name = key.ProductTitle,
                Category = key.ProductType,
                Handle = key.ProductHandle
            };

            // 月別データの集計
            var monthlyGroups = productGroup.GroupBy(s => new { s.Year, s.Month });

            foreach (var monthGroup in monthlyGroups)
            {
                var monthKey = $"{monthGroup.Key.Year}-{monthGroup.Key.Month:D2}";
                var monthData = new ProductMonthlyData
                {
                    Quantity = monthGroup.Sum(s => s.Quantity),
                    Amount = monthGroup.Sum(s => s.Amount),
                    OrderCount = monthGroup.Count()
                };

                productData.MonthlyData[monthKey] = monthData;
            }

            // 合計データの計算
            productData.Total = new ProductTotalData
            {
                TotalQuantity = productData.MonthlyData.Values.Sum(m => m.Quantity),
                TotalAmount = productData.MonthlyData.Values.Sum(m => m.Amount),
                TotalOrderCount = productData.MonthlyData.Values.Sum(m => m.OrderCount)
            };

            // 月平均の計算
            var monthCount = CalculateMonthCount(request);
            productData.Total.MonthlyAverage = monthCount > 0 ? productData.Total.TotalAmount / monthCount : 0;

            return productData;
        }

        /// <summary>
        /// サマリーの計算
        /// </summary>
        private MonthlySalesSummary CalculateSummary(List<ProductMonthlySalesData> products, MonthlySalesRequest request)
        {
            var summary = new MonthlySalesSummary
            {
                Period = new AnalysisPeriod
                {
                    StartYear = request.StartYear,
                    StartMonth = request.StartMonth,
                    EndYear = request.EndYear,
                    EndMonth = request.EndMonth,
                    MonthCount = CalculateMonthCount(request)
                }
            };

            if (!products.Any())
            {
                return summary;
            }

            // 集計値の計算
            summary.TotalAmount = products.Sum(p => p.Total.TotalAmount);
            summary.TotalQuantity = products.Sum(p => p.Total.TotalQuantity);
            summary.ProductCount = products.Count;
            summary.MonthlyAverage = summary.Period.MonthCount > 0 ? summary.TotalAmount / summary.Period.MonthCount : 0;

            // 月別集計でピーク・最低値を特定
            var monthlyTotals = new Dictionary<string, decimal>();
            
            foreach (var product in products)
            {
                foreach (var monthData in product.MonthlyData)
                {
                    if (monthlyTotals.ContainsKey(monthData.Key))
                    {
                        monthlyTotals[monthData.Key] += monthData.Value.Amount;
                    }
                    else
                    {
                        monthlyTotals[monthData.Key] = monthData.Value.Amount;
                    }
                }
            }

            if (monthlyTotals.Any())
            {
                var peak = monthlyTotals.OrderByDescending(m => m.Value).First();
                summary.PeakMonth = peak.Key;
                summary.PeakAmount = peak.Value;

                var lowest = monthlyTotals.OrderBy(m => m.Value).First();
                summary.LowestMonth = lowest.Key;
                summary.LowestAmount = lowest.Value;

                // 季節性指数の簡易計算
                var variance = monthlyTotals.Values.Any() 
                    ? monthlyTotals.Values.Select(v => Math.Pow((double)(v - summary.MonthlyAverage), 2)).Average()
                    : 0;
                summary.SeasonalityIndex = Math.Round((decimal)Math.Sqrt(variance) / (summary.MonthlyAverage > 0 ? summary.MonthlyAverage : 1) * 100, 1);
            }

            return summary;
        }

        /// <summary>
        /// メタデータの作成
        /// </summary>
        private MonthlySalesMetadata CreateMetadata(MonthlySalesRequest request, int processedRecords)
        {
            var metadata = new MonthlySalesMetadata
            {
                DataSource = "database",
                ProcessedRecords = processedRecords,
                DataQuality = processedRecords > 0 ? "Good" : "Warning"
            };

            // フィルター情報の記録
            metadata.Filters["storeId"] = request.StoreId;
            metadata.Filters["displayMode"] = request.DisplayMode;
            metadata.Filters["maxProducts"] = request.MaxProducts ?? 100;

            if (request.ProductIds?.Any() == true)
            {
                metadata.Filters["productIds"] = request.ProductIds;
            }

            if (!string.IsNullOrEmpty(request.CategoryFilter))
            {
                metadata.Filters["categoryFilter"] = request.CategoryFilter;
            }

            // データ品質警告
            if (processedRecords == 0)
            {
                metadata.Warnings.Add("指定された期間・条件でデータが見つかりませんでした");
            }
            else if (processedRecords < 10)
            {
                metadata.Warnings.Add("データ件数が少ないため、分析結果の信頼性が低い可能性があります");
            }

            return metadata;
        }

        /// <summary>
        /// リクエストのバリデーション
        /// </summary>
        private void ValidateRequest(MonthlySalesRequest request)
        {
            if (request.StartYear > request.EndYear ||
                (request.StartYear == request.EndYear && request.StartMonth > request.EndMonth))
            {
                throw new ArgumentException("開始日が終了日より後に設定されています");
            }

            var monthCount = CalculateMonthCount(request);
            if (monthCount > 36)
            {
                throw new ArgumentException("分析期間は最大36ヶ月までです");
            }

            if (request.MaxProducts.HasValue && request.MaxProducts.Value > MaxCacheProducts)
            {
                throw new ArgumentException($"商品数の上限は{MaxCacheProducts}です");
            }
        }

        /// <summary>
        /// 月数の計算
        /// </summary>
        private int CalculateMonthCount(MonthlySalesRequest request)
        {
            var startDate = new DateTime(request.StartYear, request.StartMonth, 1);
            var endDate = new DateTime(request.EndYear, request.EndMonth, 1);
            
            return (endDate.Year - startDate.Year) * 12 + endDate.Month - startDate.Month + 1;
        }

        /// <summary>
        /// キャッシュキー生成
        /// </summary>
        private string GenerateCacheKey(string prefix, MonthlySalesRequest request)
        {
            var keyParts = new[]
            {
                prefix,
                request.StoreId.ToString(),
                $"{request.StartYear}-{request.StartMonth:D2}",
                $"{request.EndYear}-{request.EndMonth:D2}",
                request.DisplayMode,
                (request.MaxProducts ?? 100).ToString(),
                request.CategoryFilter ?? "all",
                string.Join(",", request.ProductIds ?? new List<string>())
            };

            return string.Join(":", keyParts);
        }

        /// <summary>
        /// 月名の取得
        /// </summary>
        private string GetMonthName(int month)
        {
            var monthNames = new[]
            {
                "", "1月", "2月", "3月", "4月", "5月", "6月",
                "7月", "8月", "9月", "10月", "11月", "12月"
            };

            return month >= 1 && month <= 12 ? monthNames[month] : month.ToString();
        }

        /// <summary>
        /// トレンド方向の判定
        /// </summary>
        private string DetermineTrendDirection(decimal salesIndex)
        {
            return salesIndex switch
            {
                >= 110 => "Up",
                <= 90 => "Down",
                _ => "Stable"
            };
        }
    }
}