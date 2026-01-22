using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客復帰分析サービスの実装
    /// 責任範囲: 復帰可能性分析・戦略生成・収益影響計算
    /// </summary>
    public class DormantReactivationService : IDormantReactivationService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<DormantReactivationService> _logger;
        private readonly IChurnAnalysisService _churnAnalysisService;
        private readonly IDormantStatisticsService _statisticsService;

        // キャッシュキー
        private const string REACTIVATION_POTENTIAL_CACHE_KEY = "reactivation_potential_{0}";

        // 設定値
        private readonly int _cacheExpirationMinutes = 120;

        public DormantReactivationService(
            IMemoryCache cache,
            ILogger<DormantReactivationService> logger,
            IChurnAnalysisService churnAnalysisService,
            IDormantStatisticsService statisticsService)
        {
            _cache = cache;
            _logger = logger;
            _churnAnalysisService = churnAnalysisService;
            _statisticsService = statisticsService;
        }

        /// <summary>
        /// 復帰可能性分析を実行
        /// </summary>
        public async Task<ReactivationPotentialStats> GetReactivationPotentialAsync(int storeId)
        {
            try
            {
                var cacheKey = string.Format(REACTIVATION_POTENTIAL_CACHE_KEY, storeId);
                
                if (_cache.TryGetValue(cacheKey, out ReactivationPotentialStats? cachedStats) && cachedStats != null)
                {
                    _logger.LogDebug("復帰可能性統計をキャッシュから取得: StoreId={StoreId}", storeId);
                    return cachedStats;
                }

                var dormantCustomers = await _statisticsService.GetDormantCustomersAsync(storeId);
                var stats = new ReactivationPotentialStats();

                // チャーン確率基準で分類
                var classification = await ClassifyReactivationPotentialAsync(dormantCustomers);
                stats.HighPotentialCustomers = classification.HighPotentialCount;
                stats.MediumPotentialCustomers = classification.MediumPotentialCount;
                stats.LowPotentialCustomers = classification.LowPotentialCount;

                // 推奨戦略生成
                stats.RecommendedStrategies = await GenerateReactivationStrategiesAsync(dormantCustomers, classification);

                // 推定収益計算
                var estimatedRevenue = await CalculateEstimatedRevenueAsync(dormantCustomers, stats.RecommendedStrategies);
                stats.EstimatedReactivationRevenue = estimatedRevenue.TotalEstimatedRevenue;

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, stats, cacheOptions);

                _logger.LogInformation("復帰可能性分析を計算: StoreId={StoreId}, TotalCustomers={Count}", 
                    storeId, dormantCustomers.Count);

                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "復帰可能性分析中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// 休眠顧客の収益影響分析
        /// </summary>
        public async Task<DormantRevenueImpact> GetRevenueImpactAnalysisAsync(RevenueImpactRequest request)
        {
            try
            {
                _logger.LogInformation("収益影響分析開始: StoreId={StoreId}", request.StoreId);

                var dormantCustomers = await _statisticsService.GetDormantCustomersAsync(request.StoreId);
                var impact = new DormantRevenueImpact();

                // 過去の収益損失計算
                var historicalLoss = await CalculateHistoricalRevenueLossAsync(dormantCustomers, request.PeriodMonths ?? 12);
                impact.HistoricalRevenueLoss = historicalLoss.TotalLoss;
                impact.MonthlyRevenueLoss = historicalLoss.MonthlyAverageLoss;

                // 将来の収益損失予測
                if (request.IncludeProjections)
                {
                    var projectedLoss = await CalculateProjectedRevenueLossAsync(dormantCustomers, request.ProjectionMonths ?? 12);
                    impact.ProjectedRevenueLoss = projectedLoss.TotalLoss;
                    impact.ProjectedMonthlyLoss = projectedLoss.MonthlyAverageLoss;
                }

                // 回復可能性計算
                var classification = await ClassifyReactivationPotentialAsync(dormantCustomers);
                var strategies = await GenerateReactivationStrategiesAsync(dormantCustomers, classification);
                var recoverable = await CalculateEstimatedRevenueAsync(dormantCustomers, strategies);
                
                impact.RecoverablePotential = recoverable.TotalEstimatedRevenue;
                impact.RecoveryRate = impact.HistoricalRevenueLoss > 0 ? 
                    (impact.RecoverablePotential / impact.HistoricalRevenueLoss) * 100 : 0;

                // セグメント別内訳
                impact.SegmentBreakdown = await CalculateSegmentBreakdown(dormantCustomers);

                _logger.LogInformation("収益影響分析を計算: StoreId={StoreId}, HistoricalLoss={Loss:C}", 
                    request.StoreId, impact.HistoricalRevenueLoss);

                return impact;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "収益影響分析中にエラーが発生: StoreId={StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 復帰可能性を分類
        /// </summary>
        public async Task<ReactivationPotentialClassification> ClassifyReactivationPotentialAsync(List<Customer> customers)
        {
            try
            {
                _logger.LogDebug("復帰可能性分類開始: 顧客数={Count}", customers.Count);

                var classification = new ReactivationPotentialClassification();

                if (!customers.Any())
                {
                    return classification;
                }

                var customerIds = customers.Select(c => c.Id).ToList();
                var churnProbabilities = await _churnAnalysisService.CalculateBatchChurnProbabilityAsync(customerIds);

                foreach (var (customerId, probability) in churnProbabilities)
                {
                    if (probability <= 0.4m)
                    {
                        classification.HighPotentialCount++;
                        classification.HighPotentialCustomerIds.Add(customerId);
                    }
                    else if (probability <= 0.7m)
                    {
                        classification.MediumPotentialCount++;
                        classification.MediumPotentialCustomerIds.Add(customerId);
                    }
                    else
                    {
                        classification.LowPotentialCount++;
                        classification.LowPotentialCustomerIds.Add(customerId);
                    }
                }

                _logger.LogDebug("復帰可能性分類完了: 高={High}, 中={Medium}, 低={Low}", 
                    classification.HighPotentialCount, 
                    classification.MediumPotentialCount, 
                    classification.LowPotentialCount);

                return classification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "復帰可能性分類中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 復帰戦略を生成
        /// </summary>
        public async Task<List<ReactivationStrategy>> GenerateReactivationStrategiesAsync(
            List<Customer> customers, 
            ReactivationPotentialClassification classification)
        {
            try
            {
                _logger.LogDebug("復帰戦略生成開始");

                var strategies = new List<ReactivationStrategy>();
                var averageOrderValue = customers.Where(c => c.TotalOrders > 0)
                    .Average(c => c.TotalSpent / c.TotalOrders);

                // パーソナライズドメール戦略
                strategies.Add(new ReactivationStrategy
                {
                    StrategyName = "パーソナライズドメール",
                    Description = "個別化されたプロモーションメールの送信",
                    TargetCustomerCount = classification.HighPotentialCount + classification.MediumPotentialCount,
                    EstimatedSuccessRate = 0.15m,
                    EstimatedRevenue = averageOrderValue * 
                                     (classification.HighPotentialCount + classification.MediumPotentialCount) * 0.15m
                });

                // 限定オファー戦略
                strategies.Add(new ReactivationStrategy
                {
                    StrategyName = "限定オファー",
                    Description = "期間限定割引クーポンの提供",
                    TargetCustomerCount = classification.HighPotentialCount,
                    EstimatedSuccessRate = 0.25m,
                    EstimatedRevenue = averageOrderValue * classification.HighPotentialCount * 0.25m * 0.9m // 10%割引考慮
                });

                // リターゲティング広告戦略
                strategies.Add(new ReactivationStrategy
                {
                    StrategyName = "リターゲティング広告",
                    Description = "ソーシャルメディアおよび検索広告でのリターゲティング",
                    TargetCustomerCount = classification.MediumPotentialCount,
                    EstimatedSuccessRate = 0.08m,
                    EstimatedRevenue = averageOrderValue * classification.MediumPotentialCount * 0.08m
                });

                _logger.LogDebug("復帰戦略生成完了: 戦略数={Count}", strategies.Count);
                return strategies;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "復帰戦略生成中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 推定収益を計算
        /// </summary>
        public async Task<EstimatedRevenueData> CalculateEstimatedRevenueAsync(
            List<Customer> customers, 
            List<ReactivationStrategy> strategies)
        {
            try
            {
                _logger.LogDebug("推定収益計算開始");

                var estimatedRevenue = new EstimatedRevenueData();

                foreach (var strategy in strategies)
                {
                    estimatedRevenue.RevenueByStrategy[strategy.StrategyName] = strategy.EstimatedRevenue;
                    estimatedRevenue.TotalEstimatedRevenue += strategy.EstimatedRevenue;
                }

                if (customers.Any())
                {
                    estimatedRevenue.AverageRevenuePerCustomer = estimatedRevenue.TotalEstimatedRevenue / customers.Count;
                }

                _logger.LogDebug("推定収益計算完了: 総額={Total}", estimatedRevenue.TotalEstimatedRevenue);
                return estimatedRevenue;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "推定収益計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 過去の収益損失を計算
        /// </summary>
        public async Task<RevenueLossData> CalculateHistoricalRevenueLossAsync(List<Customer> customers, int periodMonths)
        {
            try
            {
                _logger.LogDebug("過去収益損失計算開始: 顧客数={Count}, 期間={Months}ヶ月", 
                    customers.Count, periodMonths);

                var lossData = new RevenueLossData();

                if (!customers.Any())
                {
                    return lossData;
                }

                // 平均月間購入額を基に損失を計算
                foreach (var customer in customers)
                {
                    if (customer.Orders?.Any() == true)
                    {
                        var customerCreatedAt = customer.ShopifyCreatedAt ?? customer.CreatedAt;
                        var customerAge = (DateTime.UtcNow - customerCreatedAt).Days / 30.0;
                        if (customerAge > 0)
                        {
                            var monthlyAverage = customer.TotalSpent / (decimal)customerAge;
                            lossData.TotalLoss += monthlyAverage * periodMonths;
                        }
                    }
                }

                lossData.AverageLossPerCustomer = lossData.TotalLoss / customers.Count;
                lossData.MonthlyAverageLoss = lossData.TotalLoss / periodMonths;

                _logger.LogDebug("過去収益損失計算完了: 総損失={Loss}", lossData.TotalLoss);
                return lossData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "過去収益損失計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 将来の収益損失を予測
        /// </summary>
        public async Task<RevenueLossData> CalculateProjectedRevenueLossAsync(List<Customer> customers, int projectionMonths)
        {
            try
            {
                _logger.LogDebug("将来収益損失予測開始: 顧客数={Count}, 予測期間={Months}ヶ月", 
                    customers.Count, projectionMonths);

                // 簡易版: 過去の損失率を基に予測
                var historicalLoss = await CalculateHistoricalRevenueLossAsync(customers, 12);
                
                var projectedLoss = new RevenueLossData
                {
                    TotalLoss = historicalLoss.MonthlyAverageLoss * projectionMonths * 1.1m, // 10%の増加を見込む
                    MonthlyAverageLoss = historicalLoss.MonthlyAverageLoss * 1.1m,
                    AverageLossPerCustomer = historicalLoss.AverageLossPerCustomer * 1.1m
                };

                _logger.LogDebug("将来収益損失予測完了: 予測損失={Loss}", projectedLoss.TotalLoss);
                return projectedLoss;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "将来収益損失予測中にエラーが発生");
                throw;
            }
        }

        #region Private Methods

        /// <summary>
        /// セグメント別内訳を計算
        /// </summary>
        private async Task<List<SegmentRevenueImpact>> CalculateSegmentBreakdown(List<Customer> customers)
        {
            var segments = new List<SegmentRevenueImpact>();

            // 休眠期間別
            var dormancySegments = new[]
            {
                ("90-180日", 90, 180),
                ("180-365日", 181, 365),
                ("365日以上", 366, int.MaxValue)
            };

            foreach (var (name, minDays, maxDays) in dormancySegments)
            {
                var segmentCustomers = GetCustomersInDormancyRange(customers, minDays, maxDays);
                
                if (segmentCustomers.Any())
                {
                    var historicalLoss = await CalculateHistoricalRevenueLossAsync(segmentCustomers, 12);
                    
                    segments.Add(new SegmentRevenueImpact
                    {
                        SegmentName = name,
                        CustomerCount = segmentCustomers.Count,
                        RevenueLoss = historicalLoss.TotalLoss,
                        CustomerValue = historicalLoss.AverageLossPerCustomer
                    });
                }
            }

            return segments;
        }

        /// <summary>
        /// 休眠期間範囲内の顧客を取得
        /// </summary>
        private List<Customer> GetCustomersInDormancyRange(List<Customer> customers, int minDays, int maxDays)
        {
            return customers.Where(c =>
            {
                if (c.Orders == null || !c.Orders.Any()) return false;
                
                var lastOrder = c.Orders.OrderByDescending(o => o.ShopifyProcessedAt ?? o.ShopifyCreatedAt ?? o.CreatedAt).First();
                var lastOrderDate = lastOrder.ShopifyProcessedAt ?? lastOrder.ShopifyCreatedAt ?? lastOrder.CreatedAt;
                var daysSince = (DateTime.UtcNow - lastOrderDate).Days;
                
                return daysSince >= minDays && (maxDays == int.MaxValue || daysSince <= maxDays);
            }).ToList();
        }

        #endregion
    }
}