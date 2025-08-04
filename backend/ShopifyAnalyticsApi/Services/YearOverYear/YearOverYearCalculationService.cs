using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.YearOverYear;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比計算サービスの実装
    /// 責任範囲: 成長率計算・ビジネスロジック
    /// </summary>
    public class YearOverYearCalculationService : IYearOverYearCalculationService
    {
        private readonly ILogger<YearOverYearCalculationService> _logger;

        public YearOverYearCalculationService(ILogger<YearOverYearCalculationService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// 商品データを処理して前年比データを生成
        /// </summary>
        public List<YearOverYearProductData> ProcessProductData(
            List<OrderItemAnalysisData> rawData, 
            YearOverYearRequest request, 
            int currentYear, 
            int previousYear)
        {
            try
            {
                _logger.LogDebug("商品データ処理開始: データ件数={Count}", rawData.Count);

                // 商品ごとにグループ化
                var productGroups = rawData
                    .GroupBy(d => new { d.ProductName, d.ProductType, d.Vendor })
                    .ToList();

                var productDataList = new List<YearOverYearProductData>();

                foreach (var productGroup in productGroups)
                {
                    var monthlyData = CreateProductMonthlyData(productGroup.ToList(), currentYear, previousYear);
                    var aggregateData = CalculateProductTotals(monthlyData, request.ViewMode);

                    var growthRate = CalculateGrowthRate(aggregateData.CurrentYearValue, aggregateData.PreviousYearValue);
                    var growthCategory = DetermineGrowthCategory(growthRate);

                    var productData = new YearOverYearProductData
                    {
                        ProductName = productGroup.Key.ProductName,
                        ProductTitle = productGroup.Key.ProductName, // ProductTitleも同様に設定
                        ProductType = productGroup.Key.ProductType,
                        Vendor = productGroup.Key.Vendor,
                        CurrentYearValue = aggregateData.CurrentYearValue,
                        PreviousYearValue = aggregateData.PreviousYearValue,
                        GrowthRate = growthRate,
                        GrowthCategory = growthCategory,
                        MonthlyData = ConvertToMonthlyComparisonData(monthlyData)
                    };

                    productDataList.Add(productData);
                }

                _logger.LogDebug("商品データ処理完了: 商品数={Count}", productDataList.Count);
                return productDataList;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "商品データ処理中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 月次比較データを作成
        /// </summary>
        public List<MonthlyComparisonData> CreateMonthlyData(
            List<ProductAggregateData> productData, 
            YearOverYearRequest request, 
            int currentYear, 
            int previousYear)
        {
            try
            {
                _logger.LogDebug("月次データ作成開始: 商品数={Count}", productData.Count);

                var monthlyComparisons = new List<MonthlyComparisonData>();

                // 指定された月範囲でループ
                var startMonth = request.StartMonth ?? 1;
                var endMonth = request.EndMonth ?? 12;

                for (int month = startMonth; month <= endMonth; month++)
                {
                    var currentMonthValue = 0m;
                    var previousMonthValue = 0m;

                    foreach (var product in productData)
                    {
                        var monthlyData = product.MonthlyData.FirstOrDefault(m => m.Month == month);
                        if (monthlyData != null)
                        {
                            currentMonthValue += GetValueByMode(monthlyData, request.ViewMode, true);
                            previousMonthValue += GetValueByMode(monthlyData, request.ViewMode, false);
                        }
                    }

                    var growthRate = CalculateGrowthRate(currentMonthValue, previousMonthValue);

                    monthlyComparisons.Add(new MonthlyComparisonData
                    {
                        Month = month,
                        MonthName = GetMonthName(month),
                        CurrentValue = currentMonthValue,
                        PreviousValue = previousMonthValue,
                        GrowthRate = growthRate,
                        GrowthCategory = DetermineGrowthCategory(growthRate)
                    });
                }

                _logger.LogDebug("月次データ作成完了: 月数={Count}", monthlyComparisons.Count);
                return monthlyComparisons;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "月次データ作成中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 成長率を計算
        /// </summary>
        public decimal CalculateGrowthRate(decimal current, decimal previous)
        {
            if (previous == 0)
            {
                return current > 0 ? 100m : 0m;
            }

            return Math.Round(((current - previous) / previous) * 100, 2);
        }

        /// <summary>
        /// 成長カテゴリを判定
        /// </summary>
        public string DetermineGrowthCategory(decimal growthRate)
        {
            return growthRate switch
            {
                >= 20m => "急成長",
                >= 5m => "成長",
                > -5m => "安定",
                >= -20m => "減少",
                _ => "大幅減少"
            };
        }

        /// <summary>
        /// 商品合計データを計算
        /// </summary>
        public ProductAggregateData CalculateProductTotals(List<ProductMonthlyData> monthlyData, string viewMode)
        {
            try
            {
                var aggregateData = new ProductAggregateData
                {
                    MonthlyData = monthlyData
                };

                foreach (var monthly in monthlyData)
                {
                    aggregateData.CurrentYearValue += GetValueByMode(monthly, viewMode, true);
                    aggregateData.PreviousYearValue += GetValueByMode(monthly, viewMode, false);
                }

                return aggregateData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "商品合計計算中にエラーが発生");
                throw;
            }
        }

        #region Private Methods

        /// <summary>
        /// 商品の月次データを作成
        /// </summary>
        private List<ProductMonthlyData> CreateProductMonthlyData(List<OrderItemAnalysisData> productData, int currentYear, int previousYear)
        {
            var monthlyData = new List<ProductMonthlyData>();

            for (int month = 1; month <= 12; month++)
            {
                var currentYearData = productData.Where(d => d.Year == currentYear && d.Month == month).ToList();
                var previousYearData = productData.Where(d => d.Year == previousYear && d.Month == month).ToList();

                var monthly = new ProductMonthlyData
                {
                    Month = month,
                    CurrentYearRevenue = currentYearData.Sum(d => d.TotalRevenue),
                    PreviousYearRevenue = previousYearData.Sum(d => d.TotalRevenue),
                    CurrentYearQuantity = currentYearData.Sum(d => d.TotalQuantity),
                    PreviousYearQuantity = previousYearData.Sum(d => d.TotalQuantity),
                    CurrentYearOrders = currentYearData.Sum(d => d.TotalOrders),
                    PreviousYearOrders = previousYearData.Sum(d => d.TotalOrders)
                };

                monthlyData.Add(monthly);
            }

            return monthlyData;
        }

        /// <summary>
        /// 表示モードに応じた値を取得
        /// </summary>
        private decimal GetValueByMode(ProductMonthlyData data, string viewMode, bool isCurrentYear)
        {
            return viewMode.ToLower() switch
            {
                "revenue" => isCurrentYear ? data.CurrentYearRevenue : data.PreviousYearRevenue,
                "quantity" => isCurrentYear ? data.CurrentYearQuantity : data.PreviousYearQuantity,
                "orders" => isCurrentYear ? data.CurrentYearOrders : data.PreviousYearOrders,
                _ => isCurrentYear ? data.CurrentYearRevenue : data.PreviousYearRevenue
            };
        }

        /// <summary>
        /// ProductMonthlyDataをMonthlyComparisonDataに変換
        /// </summary>
        private List<MonthlyComparisonData> ConvertToMonthlyComparisonData(List<ProductMonthlyData> monthlyData)
        {
            return monthlyData.Select(m => new MonthlyComparisonData
            {
                Month = m.Month,
                MonthName = GetMonthName(m.Month),
                CurrentValue = m.CurrentYearRevenue, // デフォルトは売上
                PreviousValue = m.PreviousYearRevenue,
                GrowthRate = CalculateGrowthRate(m.CurrentYearRevenue, m.PreviousYearRevenue),
                GrowthCategory = DetermineGrowthCategory(CalculateGrowthRate(m.CurrentYearRevenue, m.PreviousYearRevenue))
            }).ToList();
        }

        /// <summary>
        /// 月名を取得
        /// </summary>
        private string GetMonthName(int month)
        {
            return month switch
            {
                1 => "1月",
                2 => "2月",
                3 => "3月",
                4 => "4月",
                5 => "5月",
                6 => "6月",
                7 => "7月",
                8 => "8月",
                9 => "9月",
                10 => "10月",
                11 => "11月",
                12 => "12月",
                _ => $"{month}月"
            };
        }

        #endregion
    }
}