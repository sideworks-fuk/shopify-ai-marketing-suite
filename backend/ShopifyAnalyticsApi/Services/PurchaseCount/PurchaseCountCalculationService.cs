using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.PurchaseCount;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数計算サービスの実装
    /// 責任範囲: 計算・メトリクス算出・統計処理
    /// </summary>
    public class PurchaseCountCalculationService : IPurchaseCountCalculationService
    {
        private readonly ILogger<PurchaseCountCalculationService> _logger;

        public PurchaseCountCalculationService(ILogger<PurchaseCountCalculationService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// 購入回数サマリーを計算
        /// </summary>
        public PurchaseCountSummary CalculatePurchaseCountSummary(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            decimal totalRevenue,
            string periodLabel, 
            ComparisonMetrics? comparison = null)
        {
            try
            {
                _logger.LogDebug("購入回数サマリー計算開始: 顧客数={Count}", customerPurchaseCounts.Count);

                var totalCustomers = customerPurchaseCounts.Count;
                var totalOrders = customerPurchaseCounts.Sum(c => c.OrderCount);
                var averagePurchaseCount = totalCustomers > 0 ? 
                    (decimal)totalOrders / totalCustomers : 0;

                var repeatCustomers = customerPurchaseCounts.Count(c => c.PurchaseCount >= 2);
                var multiPurchaseCustomers = customerPurchaseCounts.Count(c => c.PurchaseCount >= 3);

                var repeatCustomerRate = totalCustomers > 0 ? 
                    (decimal)repeatCustomers / totalCustomers * 100 : 0;
                var multiPurchaseRate = totalCustomers > 0 ? 
                    (decimal)multiPurchaseCustomers / totalCustomers * 100 : 0;

                var summary = new PurchaseCountSummary
                {
                    TotalCustomers = totalCustomers,
                    TotalOrders = totalOrders,
                    TotalRevenue = totalRevenue,
                    AveragePurchaseCount = Math.Round(averagePurchaseCount, 2),
                    RepeatCustomerRate = Math.Round(repeatCustomerRate, 1),
                    MultiPurchaseRate = Math.Round(multiPurchaseRate, 1),
                    PeriodLabel = periodLabel,
                    Comparison = comparison
                };

                _logger.LogDebug("購入回数サマリー計算完了");
                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数サマリー計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 購入回数詳細を計算
        /// </summary>
        public List<PurchaseCountDetail> CalculatePurchaseCountDetails(
            List<CustomerPurchaseData> currentData,
            List<CustomerPurchaseData> previousData,
            PurchaseCountAnalysisRequest request)
        {
            try
            {
                _logger.LogDebug("購入回数詳細計算開始: 現在期間顧客数={CurrentCount}, 前年同期顧客数={PreviousCount}", 
                    currentData.Count, previousData.Count);

                var details = new List<PurchaseCountDetail>();

                // 1回から指定回数まで、および指定回数以上の分析
                for (int count = 1; count <= request.MaxPurchaseCount + 1; count++)
                {
                    var currentMetrics = CalculateBasicMetrics(currentData, count, request.MaxPurchaseCount);
                    
                    BasicMetrics? previousMetrics = null;
                    GrowthRateMetrics? growthRate = null;

                    if (request.IncludeComparison && previousData.Any())
                    {
                        previousMetrics = CalculateBasicMetrics(previousData, count, request.MaxPurchaseCount);
                        growthRate = CalculateGrowthRate(currentMetrics, previousMetrics);
                    }

                    var percentage = CalculatePercentageMetrics(currentMetrics, currentData);
                    var analysis = CalculateDetailedAnalysisMetricsAsync(request.StoreId, count).Result;

                    var label = count <= request.MaxPurchaseCount ? $"{count}回" : $"{request.MaxPurchaseCount}回以上";

                    details.Add(new PurchaseCountDetail
                    {
                        PurchaseCount = count,
                        PurchaseCountLabel = label,
                        Current = currentMetrics,
                        Previous = previousMetrics,
                        GrowthRate = growthRate,
                        Percentage = percentage,
                        Analysis = analysis
                    });
                }

                _logger.LogDebug("購入回数詳細計算完了: 詳細数={Count}", details.Count);
                return details;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数詳細計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 購入回数トレンドを計算
        /// </summary>
        public PurchaseCountTrend CalculatePurchaseCountTrend(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            DateTime periodStart)
        {
            try
            {
                _logger.LogDebug("購入回数トレンド計算開始: 期間={Period}, 顧客数={Count}", 
                    periodStart, customerPurchaseCounts.Count);

                var totalCustomers = customerPurchaseCounts.Count;
                var totalOrders = customerPurchaseCounts.Sum(c => c.OrderCount);
                var averagePurchaseCount = totalCustomers > 0 ? 
                    (decimal)totalOrders / totalCustomers : 0;
                var repeatRate = totalCustomers > 0 ? 
                    (decimal)customerPurchaseCounts.Count(c => c.PurchaseCount >= 2) / totalCustomers * 100 : 0;

                // 購入回数分布計算
                var distribution = new List<PurchaseCountDistribution>();
                for (int count = 1; count <= 20; count++)
                {
                    var customersWithCount = customerPurchaseCounts.Count(c => c.PurchaseCount == count);
                    var percentage = totalCustomers > 0 ? 
                        (decimal)customersWithCount / totalCustomers * 100 : 0;

                    distribution.Add(new PurchaseCountDistribution
                    {
                        PurchaseCount = count,
                        CustomerCount = customersWithCount,
                        Percentage = Math.Round(percentage, 1)
                    });
                }

                // 20回以上をまとめる
                var customers20Plus = customerPurchaseCounts.Count(c => c.PurchaseCount > 20);
                var percentage20Plus = totalCustomers > 0 ? 
                    (decimal)customers20Plus / totalCustomers * 100 : 0;

                distribution.Add(new PurchaseCountDistribution
                {
                    PurchaseCount = 21, // 21以上を表す
                    CustomerCount = customers20Plus,
                    Percentage = Math.Round(percentage20Plus, 1)
                });

                var trend = new PurchaseCountTrend
                {
                    Period = periodStart.ToString("yyyy-MM"),
                    PeriodLabel = periodStart.ToString("yyyy年M月"),
                    TotalCustomers = totalCustomers,
                    AveragePurchaseCount = Math.Round(averagePurchaseCount, 2),
                    RepeatRate = Math.Round(repeatRate, 1),
                    Distribution = distribution
                };

                _logger.LogDebug("購入回数トレンド計算完了");
                return trend;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数トレンド計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 成長率を計算
        /// </summary>
        public GrowthRateMetrics CalculateGrowthRate(BasicMetrics current, BasicMetrics previous)
        {
            try
            {
                var growthRate = new GrowthRateMetrics
                {
                    CustomerCountGrowth = previous.CustomerCount > 0 ? 
                        (decimal)(current.CustomerCount - previous.CustomerCount) / previous.CustomerCount * 100 : 0,
                    OrderCountGrowth = previous.OrderCount > 0 ? 
                        (decimal)(current.OrderCount - previous.OrderCount) / previous.OrderCount * 100 : 0,
                    AmountGrowth = previous.TotalAmount > 0 ? 
                        (current.TotalAmount - previous.TotalAmount) / previous.TotalAmount * 100 : 0,
                    GrowthTrend = DetermineGrowthTrend(current.TotalAmount, previous.TotalAmount)
                };

                return growthRate;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "成長率計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 比較メトリクスを計算
        /// </summary>
        public ComparisonMetrics CalculateComparisonMetrics(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            decimal totalRevenue,
            string comparisonPeriod)
        {
            try
            {
                var totalCustomers = customerPurchaseCounts.Count;
                var totalOrders = customerPurchaseCounts.Sum(c => c.OrderCount);

                return new ComparisonMetrics
                {
                    Previous = new BasicMetrics
                    {
                        CustomerCount = totalCustomers,
                        OrderCount = totalOrders,
                        TotalAmount = totalRevenue
                    },
                    ComparisonPeriod = comparisonPeriod
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "比較メトリクス計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 基本メトリクスを計算
        /// </summary>
        public BasicMetrics CalculateBasicMetrics(
            List<CustomerPurchaseData> customerPurchaseCounts, 
            int purchaseCount, 
            int maxPurchaseCount)
        {
            try
            {
                var targetData = purchaseCount <= maxPurchaseCount ?
                    customerPurchaseCounts.Where(c => c.PurchaseCount == purchaseCount).ToList() :
                    customerPurchaseCounts.Where(c => c.PurchaseCount > maxPurchaseCount).ToList();

                return new BasicMetrics
                {
                    CustomerCount = targetData.Count,
                    OrderCount = targetData.Sum(c => c.OrderCount),
                    TotalAmount = targetData.Sum(c => c.TotalAmount),
                    AverageOrderValue = targetData.Count > 0 ? targetData.Sum(c => c.TotalAmount) / targetData.Sum(c => c.OrderCount) : 0,
                    AverageCustomerValue = targetData.Count > 0 ? targetData.Sum(c => c.TotalAmount) / targetData.Count : 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "基本メトリクス計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// パーセンテージメトリクスを計算
        /// </summary>
        public PercentageMetrics CalculatePercentageMetrics(
            BasicMetrics currentMetrics, 
            List<CustomerPurchaseData> allCustomerData)
        {
            try
            {
                var totalCustomers = allCustomerData.Count;
                var totalOrders = allCustomerData.Sum(c => c.OrderCount);
                var totalAmount = allCustomerData.Sum(c => c.TotalAmount);

                return new PercentageMetrics
                {
                    CustomerPercentage = totalCustomers > 0 ? (decimal)currentMetrics.CustomerCount / totalCustomers * 100 : 0,
                    OrderPercentage = totalOrders > 0 ? (decimal)currentMetrics.OrderCount / totalOrders * 100 : 0,
                    AmountPercentage = totalAmount > 0 ? currentMetrics.TotalAmount / totalAmount * 100 : 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "パーセンテージメトリクス計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// セグメントサマリーを計算
        /// </summary>
        public SegmentSummaryMetrics CalculateSegmentSummary(List<PurchaseCountDetail> details)
        {
            try
            {
                _logger.LogDebug("セグメントサマリー計算開始: 詳細数={Count}", details.Count);

                var totalCustomers = details.Sum(d => d.Current.CustomerCount);
                var totalOrders = details.Sum(d => d.Current.OrderCount);
                var totalAmount = details.Sum(d => d.Current.TotalAmount);
                var repeatCustomers = details.Where(d => d.PurchaseCount >= 2).Sum(d => d.Current.CustomerCount);

                var summary = new SegmentSummaryMetrics
                {
                    TotalCustomers = totalCustomers,
                    AveragePurchaseCount = totalCustomers > 0 ? (decimal)totalOrders / totalCustomers : 0,
                    RepeatRate = totalCustomers > 0 ? (decimal)repeatCustomers / totalCustomers * 100 : 0,
                    AverageLTV = totalCustomers > 0 ? totalAmount / totalCustomers : 0,
                    RevenueContribution = totalAmount
                };

                _logger.LogDebug("セグメントサマリー計算完了");
                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメントサマリー計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 詳細分析メトリクスを計算
        /// </summary>
        public async Task<DetailedAnalysisMetrics> CalculateDetailedAnalysisMetricsAsync(int storeId, int purchaseCount)
        {
            try
            {
                _logger.LogDebug("詳細分析メトリクス計算開始: StoreId={StoreId}, PurchaseCount={Count}", 
                    storeId, purchaseCount);

                // 簡易版実装（実際の計算は複雑になるため、ダミーデータ）
                await Task.Delay(1); // 非同期メソッドのため

                var metrics = new DetailedAnalysisMetrics
                {
                    ConversionRate = purchaseCount < 10 ? 15.5m : 5.2m,
                    RetentionRate = Math.Max(90 - purchaseCount * 3.5m, 30),
                    AverageDaysBetweenOrders = purchaseCount < 5 ? 45 : 30,
                    HighValueCustomers = Math.Max(0, 50 - purchaseCount * 2),
                    RiskLevel = purchaseCount == 1 ? "高" : purchaseCount < 3 ? "中" : "低"
                };

                _logger.LogDebug("詳細分析メトリクス計算完了");
                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "詳細分析メトリクス計算中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        #region Private Methods

        /// <summary>
        /// 成長トレンドを判定
        /// </summary>
        private string DetermineGrowthTrend(decimal current, decimal previous)
        {
            if (previous == 0) return "横ばい";
            
            var growthRate = (current - previous) / previous * 100;
            
            return growthRate switch
            {
                >= 20 => "大幅増加",
                >= 5 => "増加",
                <= -20 => "大幅減少",
                <= -5 => "減少",
                _ => "横ばい"
            };
        }

        #endregion
    }
}