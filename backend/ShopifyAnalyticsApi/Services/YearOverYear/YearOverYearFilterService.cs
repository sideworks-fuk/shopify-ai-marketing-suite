using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.YearOverYear;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比フィルターサービスの実装
    /// 責任範囲: フィルタリング・集約・ソート
    /// </summary>
    public class YearOverYearFilterService : IYearOverYearFilterService
    {
        private readonly ILogger<YearOverYearFilterService> _logger;

        public YearOverYearFilterService(ILogger<YearOverYearFilterService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// フィルターとソートを適用
        /// </summary>
        public List<YearOverYearProductData> ApplyFiltersAndSorting(List<YearOverYearProductData> products, YearOverYearRequest request)
        {
            try
            {
                _logger.LogDebug("フィルター・ソート適用開始: 商品数={Count}", products.Count);

                var filteredProducts = products.AsEnumerable();

                // 成長カテゴリフィルター
                if (!string.IsNullOrEmpty(request.GrowthCategory) && request.GrowthCategory != "all")
                {
                    filteredProducts = filteredProducts.Where(p => p.GrowthCategory == request.GrowthCategory);
                }

                // 最小成長率フィルター
                if (request.MinGrowthRate.HasValue)
                {
                    filteredProducts = filteredProducts.Where(p => p.GrowthRate >= request.MinGrowthRate.Value);
                }

                // 最大成長率フィルター
                if (request.MaxGrowthRate.HasValue)
                {
                    filteredProducts = filteredProducts.Where(p => p.GrowthRate <= request.MaxGrowthRate.Value);
                }

                // 最小現在年値フィルター
                if (request.MinCurrentValue.HasValue)
                {
                    filteredProducts = filteredProducts.Where(p => p.CurrentYearValue >= request.MinCurrentValue.Value);
                }

                // 検索キーワードフィルター
                if (!string.IsNullOrEmpty(request.SearchTerm))
                {
                    var keyword = request.SearchTerm.ToLower();
                    filteredProducts = filteredProducts.Where(p => 
                        p.ProductName.ToLower().Contains(keyword) ||
                        p.ProductType.ToLower().Contains(keyword) ||
                        p.Vendor.ToLower().Contains(keyword));
                }

                // ソート
                filteredProducts = ApplySorting(filteredProducts, request);

                // ページング
                if (request.Limit.HasValue && request.Limit > 0)
                {
                    var offset = (request.Offset ?? 0);
                    filteredProducts = filteredProducts.Skip(offset).Take(request.Limit.Value);
                }

                var result = filteredProducts.ToList();

                _logger.LogDebug("フィルター・ソート適用完了: 結果件数={Count}", result.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "フィルター・ソート適用中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// サマリー統計を計算
        /// </summary>
        public YearOverYearSummary CalculateSummary(List<YearOverYearProductData> products, int currentYear, int previousYear, string viewMode)
        {
            try
            {
                _logger.LogDebug("サマリー計算開始: 商品数={Count}", products.Count);

                if (!products.Any())
                {
                    return new YearOverYearSummary
                    {
                        CurrentYear = currentYear,
                        PreviousYear = previousYear,
                        ViewMode = viewMode
                    };
                }

                var totalCurrent = products.Sum(p => p.CurrentYearValue);
                var totalPrevious = products.Sum(p => p.PreviousYearValue);
                var averageGrowthRate = products.Average(p => p.GrowthRate);

                // トップ・ワースト商品
                var topPerformers = products
                    .OrderByDescending(p => p.GrowthRate)
                    .Take(5)
                    .Select(p => new TopProductData
                    {
                        ProductName = p.ProductName,
                        CurrentValue = p.CurrentYearValue,
                        PreviousValue = p.PreviousYearValue,
                        GrowthRate = p.GrowthRate,
                        GrowthCategory = p.GrowthCategory
                    })
                    .ToList();

                var worstPerformers = products
                    .OrderBy(p => p.GrowthRate)
                    .Take(5)
                    .Select(p => new TopProductData
                    {
                        ProductName = p.ProductName,
                        CurrentValue = p.CurrentYearValue,
                        PreviousValue = p.PreviousYearValue,
                        GrowthRate = p.GrowthRate,
                        GrowthCategory = p.GrowthCategory
                    })
                    .ToList();

                // カテゴリ別統計
                var categoryStats = GetCategoryStats(products);

                var summary = new YearOverYearSummary
                {
                    CurrentYear = currentYear,
                    PreviousYear = previousYear,
                    ViewMode = viewMode,
                    TotalProducts = products.Count,
                    TotalCurrentValue = totalCurrent,
                    TotalPreviousValue = totalPrevious,
                    OverallGrowthRate = CalculateGrowthRate(totalCurrent, totalPrevious),
                    AverageGrowthRate = Math.Round(averageGrowthRate, 2),
                    TopPerformers = topPerformers,
                    WorstPerformers = worstPerformers,
                    CategoryBreakdown = categoryStats
                };

                _logger.LogDebug("サマリー計算完了");
                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "サマリー計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 表示モードに応じた値を取得
        /// </summary>
        public decimal GetValueByMode(YearOverYearProductData data, string viewMode, bool isCurrentYear)
        {
            return viewMode.ToLower() switch
            {
                "revenue" => isCurrentYear ? data.CurrentYearValue : data.PreviousYearValue,
                "quantity" => isCurrentYear ? data.CurrentYearValue : data.PreviousYearValue, // 注意: MonthlyDataから取得する必要がある場合は別途実装
                "orders" => isCurrentYear ? data.CurrentYearValue : data.PreviousYearValue,   // 注意: MonthlyDataから取得する必要がある場合は別途実装
                _ => isCurrentYear ? data.CurrentYearValue : data.PreviousYearValue
            };
        }

        /// <summary>
        /// 成長カテゴリ別の統計を取得
        /// </summary>
        public Dictionary<string, CategoryStats> GetCategoryStats(List<YearOverYearProductData> products)
        {
            try
            {
                _logger.LogDebug("カテゴリ統計計算開始");

                var totalProducts = products.Count;
                var categoryStats = products
                    .GroupBy(p => p.GrowthCategory)
                    .ToDictionary(
                        g => g.Key,
                        g => new CategoryStats
                        {
                            ProductCount = g.Count(),
                            TotalCurrentValue = g.Sum(p => p.CurrentYearValue),
                            TotalPreviousValue = g.Sum(p => p.PreviousYearValue),
                            AverageGrowthRate = Math.Round(g.Average(p => p.GrowthRate), 2),
                            CategoryPercentage = totalProducts > 0 ? Math.Round((g.Count() * 100.0m) / totalProducts, 1) : 0
                        });

                _logger.LogDebug("カテゴリ統計計算完了: カテゴリ数={Count}", categoryStats.Count);
                return categoryStats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "カテゴリ統計計算中にエラーが発生");
                throw;
            }
        }

        #region Private Methods

        /// <summary>
        /// ソートを適用
        /// </summary>
        private IEnumerable<YearOverYearProductData> ApplySorting(IEnumerable<YearOverYearProductData> products, YearOverYearRequest request)
        {
            var sortBy = request.SortBy?.ToLower() ?? "growthrate";
            var isDescending = request.SortDescending;

            return sortBy switch
            {
                "productname" => isDescending ? 
                    products.OrderByDescending(p => p.ProductName) : 
                    products.OrderBy(p => p.ProductName),
                "currentvalue" => isDescending ? 
                    products.OrderByDescending(p => p.CurrentYearValue) : 
                    products.OrderBy(p => p.CurrentYearValue),
                "previousvalue" => isDescending ? 
                    products.OrderByDescending(p => p.PreviousYearValue) : 
                    products.OrderBy(p => p.PreviousYearValue),
                "growthrate" => isDescending ? 
                    products.OrderByDescending(p => p.GrowthRate) : 
                    products.OrderBy(p => p.GrowthRate),
                "producttype" => isDescending ? 
                    products.OrderByDescending(p => p.ProductType) : 
                    products.OrderBy(p => p.ProductType),
                "vendor" => isDescending ? 
                    products.OrderByDescending(p => p.Vendor) : 
                    products.OrderBy(p => p.Vendor),
                _ => isDescending ? 
                    products.OrderByDescending(p => p.GrowthRate) : 
                    products.OrderBy(p => p.GrowthRate)
            };
        }

        /// <summary>
        /// 成長率を計算
        /// </summary>
        private decimal CalculateGrowthRate(decimal current, decimal previous)
        {
            if (previous == 0)
            {
                return current > 0 ? 100m : 0m;
            }

            return Math.Round(((current - previous) / previous) * 100, 2);
        }

        #endregion
    }
}