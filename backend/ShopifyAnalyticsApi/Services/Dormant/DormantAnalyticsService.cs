using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Dormant;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客分析・統計サービスの実装
    /// 責任範囲: 休眠顧客の統計分析とレポート生成
    /// </summary>
    public class DormantAnalyticsService : IDormantAnalyticsService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<DormantAnalyticsService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IChurnAnalysisService _churnAnalysisService;

        // キャッシュキー
        private const string SUMMARY_STATS_CACHE_KEY = "dormant_summary_{0}";
        private const string SEGMENT_DISTRIBUTION_CACHE_KEY = "segment_distribution_{0}";
        private const string TREND_DATA_CACHE_KEY = "trend_data_{0}_{1}_{2}_{3}";
        private const string REACTIVATION_POTENTIAL_CACHE_KEY = "reactivation_potential_{0}";

        // 設定値
        private readonly int _cacheExpirationMinutes;
        private readonly int _dormancyThresholdDays;

        public DormantAnalyticsService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<DormantAnalyticsService> logger,
            IConfiguration configuration,
            IChurnAnalysisService churnAnalysisService)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
            _configuration = configuration;
            _churnAnalysisService = churnAnalysisService;

            _cacheExpirationMinutes = _configuration.GetValue<int>("DormantAnalytics:CacheExpirationMinutes", 120);
            _dormancyThresholdDays = _configuration.GetValue<int>("DormancyThresholdDays", 90);
        }

        /// <summary>
        /// 休眠顧客サマリー統計を取得
        /// </summary>
        public async Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId)
        {
            try
            {
                var cacheKey = string.Format(SUMMARY_STATS_CACHE_KEY, storeId);
                
                if (_cache.TryGetValue(cacheKey, out DormantSummaryStats? cachedStats) && cachedStats != null)
                {
                    _logger.LogDebug("サマリー統計をキャッシュから取得: StoreId={StoreId}", storeId);
                    return cachedStats;
                }

                var cutoffDate = DateTime.UtcNow.AddDays(-_dormancyThresholdDays);

                var dormantCustomers = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .Where(c => c.Orders.Any() && 
                              c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt < cutoffDate)
                    .ToListAsync();

                var stats = new DormantSummaryStats
                {
                    TotalDormantCustomers = dormantCustomers.Count,
                    AnalysisDate = DateTime.UtcNow
                };

                // セグメント別統計
                await PopulateSegmentStats(stats, dormantCustomers);

                // チャーン確率計算
                await PopulateChurnStats(stats, dormantCustomers);

                // 収益統計
                PopulateRevenueStats(stats, dormantCustomers);

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, stats, cacheOptions);

                _logger.LogInformation("休眠顧客サマリー統計を計算: StoreId={StoreId}, DormantCount={Count}", 
                    storeId, stats.TotalDormantCustomers);

                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "サマリー統計取得中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// セグメント別分布を取得
        /// </summary>
        public async Task<List<DormantSegmentDistribution>> GetSegmentDistributionsAsync(int storeId)
        {
            try
            {
                var cacheKey = string.Format(SEGMENT_DISTRIBUTION_CACHE_KEY, storeId);
                
                if (_cache.TryGetValue(cacheKey, out List<DormantSegmentDistribution>? cachedDistributions) && 
                    cachedDistributions != null)
                {
                    _logger.LogDebug("セグメント分布をキャッシュから取得: StoreId={StoreId}", storeId);
                    return cachedDistributions;
                }

                var cutoffDate = DateTime.UtcNow.AddDays(-_dormancyThresholdDays);

                var dormantCustomers = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .Where(c => c.Orders.Any() && 
                              c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt < cutoffDate)
                    .ToListAsync();

                var distributions = new List<DormantSegmentDistribution>();

                // 休眠期間別分布
                await AddDormancyDistributions(distributions, dormantCustomers);

                // 購入金額別分布
                await AddSpendingDistributions(distributions, dormantCustomers);

                // 購入頻度別分布
                await AddFrequencyDistributions(distributions, dormantCustomers);

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, distributions, cacheOptions);

                _logger.LogInformation("セグメント分布を計算: StoreId={StoreId}, SegmentCount={Count}", 
                    storeId, distributions.Count);

                return distributions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント分布取得中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// 休眠顧客トレンド分析を実行
        /// </summary>
        public async Task<List<DormantTrendData>> GetDormantTrendsAsync(DormantTrendRequest request)
        {
            try
            {
                var cacheKey = string.Format(TREND_DATA_CACHE_KEY, 
                    request.StoreId, 
                    request.StartDate.ToString("yyyyMMdd"), 
                    request.EndDate.ToString("yyyyMMdd"), 
                    request.Granularity);
                
                if (_cache.TryGetValue(cacheKey, out List<DormantTrendData>? cachedTrends) && cachedTrends != null)
                {
                    _logger.LogDebug("トレンドデータをキャッシュから取得: StoreId={StoreId}", request.StoreId);
                    return cachedTrends;
                }

                var trends = new List<DormantTrendData>();
                var periods = GeneratePeriods(request.StartDate, request.EndDate, request.Granularity);

                foreach (var period in periods)
                {
                    var trendData = await CalculateTrendDataForPeriod(request.StoreId, period, request.Granularity);
                    trends.Add(trendData);
                }

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, trends, cacheOptions);

                _logger.LogInformation("トレンド分析を計算: StoreId={StoreId}, Periods={Count}", 
                    request.StoreId, trends.Count);

                return trends;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "トレンド分析中にエラーが発生: StoreId={StoreId}", request.StoreId);
                throw;
            }
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

                var cutoffDate = DateTime.UtcNow.AddDays(-_dormancyThresholdDays);

                var dormantCustomers = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .Where(c => c.Orders.Any() && 
                              c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt < cutoffDate)
                    .ToListAsync();

                var stats = new ReactivationPotentialStats();

                // チャーン確率基準で分類
                await ClassifyReactivationPotential(stats, dormantCustomers);

                // 推奨戦略生成
                await GenerateReactivationStrategies(stats, dormantCustomers);

                // 推定収益計算
                await CalculateEstimatedRevenue(stats, dormantCustomers);

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
                var cutoffDate = DateTime.UtcNow.AddDays(-_dormancyThresholdDays);

                var dormantCustomers = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.StoreId == request.StoreId && c.TotalOrders > 0)
                    .Where(c => c.Orders.Any() && 
                              c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt < cutoffDate)
                    .ToListAsync();

                var impact = new DormantRevenueImpact();

                // 過去の収益損失計算
                await CalculateHistoricalRevenueLoss(impact, dormantCustomers, request);

                // 将来の収益損失予測
                if (request.IncludeProjections)
                {
                    await CalculateProjectedRevenueLoss(impact, dormantCustomers);
                }

                // 回復可能性計算
                await CalculateRecoverablePotential(impact, dormantCustomers);

                // セグメント別内訳
                await CalculateSegmentBreakdown(impact, dormantCustomers);

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

        #region Private Methods

        /// <summary>
        /// セグメント統計を設定
        /// </summary>
        private async Task PopulateSegmentStats(DormantSummaryStats stats, List<Customer> dormantCustomers)
        {
            // 休眠期間別
            var segments = new Dictionary<string, List<Customer>>
            {
                ["90-180日"] = GetCustomersInDormancyRange(dormantCustomers, 90, 180),
                ["180-365日"] = GetCustomersInDormancyRange(dormantCustomers, 181, 365),
                ["365日以上"] = GetCustomersInDormancyRange(dormantCustomers, 366, int.MaxValue)
            };

            foreach (var (segment, customers) in segments)
            {
                stats.SegmentCounts[segment] = customers.Count;
                stats.SegmentRevenue[segment] = customers.Sum(c => c.TotalSpent);
            }
        }

        /// <summary>
        /// チャーン統計を設定
        /// </summary>
        private async Task PopulateChurnStats(DormantSummaryStats stats, List<Customer> dormantCustomers)
        {
            if (!dormantCustomers.Any()) return;

            var customerIds = dormantCustomers.Select(c => c.Id).ToList();
            var churnProbabilities = await _churnAnalysisService.CalculateBatchChurnProbabilityAsync(customerIds);
            
            stats.AverageChurnProbability = churnProbabilities.Values.Average();
        }

        /// <summary>
        /// 収益統計を設定
        /// </summary>
        private void PopulateRevenueStats(DormantSummaryStats stats, List<Customer> dormantCustomers)
        {
            stats.TotalLostRevenue = dormantCustomers.Sum(c => c.TotalSpent);
            
            // 復帰可能収益の簡易計算（平均購入金額の30%と仮定）
            var averageOrderValue = dormantCustomers
                .Where(c => c.TotalOrders > 0)
                .Average(c => c.TotalSpent / c.TotalOrders);
            
            stats.PotentialRecoverableRevenue = dormantCustomers.Count * averageOrderValue * 0.3m;
        }

        /// <summary>
        /// 休眠期間範囲内の顧客を取得
        /// </summary>
        private List<Customer> GetCustomersInDormancyRange(List<Customer> customers, int minDays, int maxDays)
        {
            return customers.Where(c =>
            {
                if (c.Orders == null || !c.Orders.Any()) return false;
                
                var lastOrder = c.Orders.OrderByDescending(o => o.CreatedAt).First();
                var daysSince = (DateTime.UtcNow - lastOrder.CreatedAt).Days;
                
                return daysSince >= minDays && (maxDays == int.MaxValue || daysSince <= maxDays);
            }).ToList();
        }

        /// <summary>
        /// 休眠期間別分布を追加
        /// </summary>
        private async Task AddDormancyDistributions(List<DormantSegmentDistribution> distributions, List<Customer> customers)
        {
            var segments = new[]
            {
                ("90-180日", 90, 180),
                ("180-365日", 181, 365),
                ("365日以上", 366, int.MaxValue)
            };

            var totalCustomers = customers.Count;

            foreach (var (name, minDays, maxDays) in segments)
            {
                var segmentCustomers = GetCustomersInDormancyRange(customers, minDays, maxDays);
                
                if (!segmentCustomers.Any()) continue;

                var distribution = new DormantSegmentDistribution
                {
                    Segment = name,
                    CustomerCount = segmentCustomers.Count,
                    Percentage = totalCustomers > 0 ? (segmentCustomers.Count * 100.0m) / totalCustomers : 0,
                    AverageRevenue = segmentCustomers.Average(c => c.TotalSpent),
                    TotalRevenue = segmentCustomers.Sum(c => c.TotalSpent),
                    AverageDaysSinceLastPurchase = (int)segmentCustomers
                        .Where(c => c.Orders?.Any() == true)
                        .Average(c => (DateTime.UtcNow - c.Orders!.Max(o => o.CreatedAt)).Days),
                    RiskLevel = await DetermineSegmentRiskLevel(segmentCustomers)
                };

                distributions.Add(distribution);
            }
        }

        /// <summary>
        /// 購入金額別分布を追加
        /// </summary>
        private async Task AddSpendingDistributions(List<DormantSegmentDistribution> distributions, List<Customer> customers)
        {
            var segments = new[]
            {
                ("低額購入者", 0, 20000),
                ("中額購入者", 20000, 50000),
                ("高額購入者", 50000, int.MaxValue)
            };

            var totalCustomers = customers.Count;

            foreach (var (name, minSpent, maxSpent) in segments)
            {
                var segmentCustomers = customers.Where(c => 
                    c.TotalSpent >= minSpent && 
                    (maxSpent == int.MaxValue || c.TotalSpent < maxSpent)).ToList();
                
                if (!segmentCustomers.Any()) continue;

                var distribution = new DormantSegmentDistribution
                {
                    Segment = name,
                    CustomerCount = segmentCustomers.Count,
                    Percentage = totalCustomers > 0 ? (segmentCustomers.Count * 100.0m) / totalCustomers : 0,
                    AverageRevenue = segmentCustomers.Average(c => c.TotalSpent),
                    TotalRevenue = segmentCustomers.Sum(c => c.TotalSpent),
                    AverageDaysSinceLastPurchase = (int)segmentCustomers
                        .Where(c => c.Orders?.Any() == true)
                        .Average(c => (DateTime.UtcNow - c.Orders!.Max(o => o.CreatedAt)).Days),
                    RiskLevel = await DetermineSegmentRiskLevel(segmentCustomers)
                };

                distributions.Add(distribution);
            }
        }

        /// <summary>
        /// 購入頻度別分布を追加
        /// </summary>
        private async Task AddFrequencyDistributions(List<DormantSegmentDistribution> distributions, List<Customer> customers)
        {
            var segments = new[]
            {
                ("低頻度購入者", 0, 2),
                ("中頻度購入者", 3, 5),
                ("高頻度購入者", 6, int.MaxValue)
            };

            var totalCustomers = customers.Count;

            foreach (var (name, minOrders, maxOrders) in segments)
            {
                var segmentCustomers = customers.Where(c => 
                    c.TotalOrders >= minOrders && 
                    (maxOrders == int.MaxValue || c.TotalOrders <= maxOrders)).ToList();
                
                if (!segmentCustomers.Any()) continue;

                var distribution = new DormantSegmentDistribution
                {
                    Segment = name,
                    CustomerCount = segmentCustomers.Count,
                    Percentage = totalCustomers > 0 ? (segmentCustomers.Count * 100.0m) / totalCustomers : 0,
                    AverageRevenue = segmentCustomers.Average(c => c.TotalSpent),
                    TotalRevenue = segmentCustomers.Sum(c => c.TotalSpent),
                    AverageDaysSinceLastPurchase = (int)segmentCustomers
                        .Where(c => c.Orders?.Any() == true)
                        .Average(c => (DateTime.UtcNow - c.Orders!.Max(o => o.CreatedAt)).Days),
                    RiskLevel = await DetermineSegmentRiskLevel(segmentCustomers)
                };

                distributions.Add(distribution);
            }
        }

        /// <summary>
        /// セグメントのリスクレベルを判定
        /// </summary>
        private async Task<CustomerRiskLevel> DetermineSegmentRiskLevel(List<Customer> customers)
        {
            if (!customers.Any()) return CustomerRiskLevel.Low;

            var customerIds = customers.Select(c => c.Id).ToList();
            var churnProbabilities = await _churnAnalysisService.CalculateBatchChurnProbabilityAsync(customerIds);
            var averageProbability = churnProbabilities.Values.Average();

            return averageProbability switch
            {
                >= 0.9m => CustomerRiskLevel.Critical,
                >= 0.7m => CustomerRiskLevel.High,
                >= 0.4m => CustomerRiskLevel.Medium,
                _ => CustomerRiskLevel.Low
            };
        }

        /// <summary>
        /// 期間を生成
        /// </summary>
        private List<DateTime> GeneratePeriods(DateTime startDate, DateTime endDate, TrendGranularity granularity)
        {
            var periods = new List<DateTime>();
            var current = startDate;

            while (current <= endDate)
            {
                periods.Add(current);
                
                current = granularity switch
                {
                    TrendGranularity.Daily => current.AddDays(1),
                    TrendGranularity.Weekly => current.AddDays(7),
                    TrendGranularity.Monthly => current.AddMonths(1),
                    TrendGranularity.Quarterly => current.AddMonths(3),
                    _ => current.AddMonths(1)
                };
            }

            return periods;
        }

        /// <summary>
        /// 期間のトレンドデータを計算
        /// </summary>
        private async Task<DormantTrendData> CalculateTrendDataForPeriod(int storeId, DateTime periodDate, TrendGranularity granularity)
        {
            var periodEnd = granularity switch
            {
                TrendGranularity.Daily => periodDate.AddDays(1),
                TrendGranularity.Weekly => periodDate.AddDays(7),
                TrendGranularity.Monthly => periodDate.AddMonths(1),
                TrendGranularity.Quarterly => periodDate.AddMonths(3),
                _ => periodDate.AddMonths(1)
            };

            var cutoffDate = periodDate.AddDays(-_dormancyThresholdDays);

            // その期間に新規休眠になった顧客
            var newDormant = await _context.Customers
                .Include(c => c.Orders)
                .Where(c => c.StoreId == storeId)
                .Where(c => c.Orders.Any() && 
                          c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt >= cutoffDate &&
                          c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt < periodDate.AddDays(-_dormancyThresholdDays))
                .CountAsync();

            // その期間に復帰した顧客
            var reactivated = await _context.Orders
                .Where(o => o.Customer!.StoreId == storeId)
                .Where(o => o.CreatedAt >= periodDate && o.CreatedAt < periodEnd)
                .Where(o => _context.Orders
                    .Where(prev => prev.CustomerId == o.CustomerId && prev.CreatedAt < o.CreatedAt)
                    .OrderByDescending(prev => prev.CreatedAt)
                    .First().CreatedAt < periodDate.AddDays(-_dormancyThresholdDays))
                .Select(o => o.CustomerId)
                .Distinct()
                .CountAsync();

            // 期間末時点の総休眠顧客数
            var totalDormant = await _context.Customers
                .Include(c => c.Orders)
                .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                .Where(c => c.Orders.Any() && 
                          c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt < periodEnd.AddDays(-_dormancyThresholdDays))
                .CountAsync();

            var totalCustomers = await _context.Customers
                .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                .CountAsync();

            return new DormantTrendData
            {
                PeriodDate = periodDate,
                PeriodLabel = FormatPeriodLabel(periodDate, granularity),
                NewDormantCustomers = newDormant,
                ReactivatedCustomers = reactivated,
                TotalDormantCustomers = totalDormant,
                DormantRate = totalCustomers > 0 ? (totalDormant * 100.0m) / totalCustomers : 0,
                ReactivationRate = totalDormant > 0 ? (reactivated * 100.0m) / totalDormant : 0
            };
        }

        /// <summary>
        /// 期間ラベルをフォーマット
        /// </summary>
        private string FormatPeriodLabel(DateTime date, TrendGranularity granularity)
        {
            return granularity switch
            {
                TrendGranularity.Daily => date.ToString("yyyy/MM/dd"),
                TrendGranularity.Weekly => $"{date:yyyy/MM/dd}週",
                TrendGranularity.Monthly => date.ToString("yyyy年MM月"),
                TrendGranularity.Quarterly => $"{date.Year}年Q{(date.Month - 1) / 3 + 1}",
                _ => date.ToString("yyyy年MM月")
            };
        }

        /// <summary>
        /// 復帰可能性を分類
        /// </summary>
        private async Task ClassifyReactivationPotential(ReactivationPotentialStats stats, List<Customer> customers)
        {
            var customerIds = customers.Select(c => c.Id).ToList();
            var churnProbabilities = await _churnAnalysisService.CalculateBatchChurnProbabilityAsync(customerIds);

            foreach (var (customerId, probability) in churnProbabilities)
            {
                if (probability <= 0.4m)
                    stats.HighPotentialCustomers++;
                else if (probability <= 0.7m)
                    stats.MediumPotentialCustomers++;
                else
                    stats.LowPotentialCustomers++;
            }
        }

        /// <summary>
        /// 復帰戦略を生成
        /// </summary>
        private async Task GenerateReactivationStrategies(ReactivationPotentialStats stats, List<Customer> customers)
        {
            stats.RecommendedStrategies.Add(new ReactivationStrategy
            {
                StrategyName = "パーソナライズドメール",
                Description = "個別化されたプロモーションメールの送信",
                TargetCustomerCount = stats.HighPotentialCustomers + stats.MediumPotentialCustomers,
                EstimatedSuccessRate = 0.15m,
                EstimatedRevenue = customers.Where(c => c.TotalOrders > 0).Average(c => c.TotalSpent / c.TotalOrders) * 
                                 (stats.HighPotentialCustomers + stats.MediumPotentialCustomers) * 0.15m
            });

            stats.RecommendedStrategies.Add(new ReactivationStrategy
            {
                StrategyName = "限定割引オファー",
                Description = "期間限定の特別割引クーポン提供",
                TargetCustomerCount = stats.HighPotentialCustomers,
                EstimatedSuccessRate = 0.25m,
                EstimatedRevenue = customers.Where(c => c.TotalOrders > 0).Average(c => c.TotalSpent / c.TotalOrders) * 
                                 stats.HighPotentialCustomers * 0.25m * 0.8m // 割引考慮
            });
        }

        /// <summary>
        /// 推定収益を計算
        /// </summary>
        private async Task CalculateEstimatedRevenue(ReactivationPotentialStats stats, List<Customer> customers)
        {
            stats.EstimatedReactivationRevenue = stats.RecommendedStrategies.Sum(s => s.EstimatedRevenue);
        }

        /// <summary>
        /// 過去の収益損失を計算
        /// </summary>
        private async Task CalculateHistoricalRevenueLoss(DormantRevenueImpact impact, List<Customer> customers, RevenueImpactRequest request)
        {
            // 休眠期間中の推定損失（過去の平均購入パターンから算出）
            var totalLoss = 0m;

            foreach (var customer in customers.Where(c => c.Orders?.Any() == true))
            {
                var lastOrderDate = customer.Orders!.Max(o => o.CreatedAt);
                var daysDormant = (DateTime.UtcNow - lastOrderDate).Days - _dormancyThresholdDays;
                
                if (daysDormant > 0 && customer.TotalOrders > 0)
                {
                    var avgOrderValue = customer.TotalSpent / customer.TotalOrders;
                    var customerAge = (lastOrderDate - customer.CreatedAt).Days;
                    var avgDaysBetweenOrders = customerAge / customer.TotalOrders;
                    
                    var expectedOrders = daysDormant / avgDaysBetweenOrders;
                    totalLoss += expectedOrders * avgOrderValue;
                }
            }

            impact.HistoricalRevenueLoss = totalLoss;
        }

        /// <summary>
        /// 将来の収益損失を予測
        /// </summary>
        private async Task CalculateProjectedRevenueLoss(DormantRevenueImpact impact, List<Customer> customers)
        {
            // 12ヶ月間の損失予測
            var projectedLoss = 0m;

            foreach (var customer in customers.Where(c => c.Orders?.Any() == true))
            {
                if (customer.TotalOrders > 0)
                {
                    var avgOrderValue = customer.TotalSpent / customer.TotalOrders;
                    var customerAge = (DateTime.UtcNow - customer.CreatedAt).Days;
                    var avgDaysBetweenOrders = customerAge / customer.TotalOrders;
                    
                    var expectedOrdersPerYear = 365.0m / avgDaysBetweenOrders;
                    projectedLoss += expectedOrdersPerYear * avgOrderValue;
                }
            }

            impact.ProjectedRevenueLoss = projectedLoss;
        }

        /// <summary>
        /// 回復可能性を計算
        /// </summary>
        private async Task CalculateRecoverablePotential(DormantRevenueImpact impact, List<Customer> customers)
        {
            var customerIds = customers.Select(c => c.Id).ToList();
            var churnProbabilities = await _churnAnalysisService.CalculateBatchChurnProbabilityAsync(customerIds);

            var recoverablePotential = 0m;

            foreach (var customer in customers)
            {
                if (churnProbabilities.TryGetValue(customer.Id, out var churnProb) && customer.TotalOrders > 0)
                {
                    var reactivationProb = 1 - churnProb;
                    var avgOrderValue = customer.TotalSpent / customer.TotalOrders;
                    recoverablePotential += reactivationProb * avgOrderValue * 2; // 2回分の注文と仮定
                }
            }

            impact.RecoverablePotential = recoverablePotential;
        }

        /// <summary>
        /// セグメント別内訳を計算
        /// </summary>
        private async Task CalculateSegmentBreakdown(DormantRevenueImpact impact, List<Customer> customers)
        {
            var segments = new[]
            {
                ("90-180日", 90, 180),
                ("180-365日", 181, 365),
                ("365日以上", 366, int.MaxValue)
            };

            foreach (var (name, minDays, maxDays) in segments)
            {
                var segmentCustomers = GetCustomersInDormancyRange(customers, minDays, maxDays);
                
                if (segmentCustomers.Any())
                {
                    var segmentRevenue = segmentCustomers.Sum(c => c.TotalSpent);
                    var avgCustomerValue = segmentCustomers.Average(c => c.TotalSpent);

                    impact.SegmentBreakdown.Add(new SegmentRevenueImpact
                    {
                        SegmentName = name,
                        RevenueLoss = segmentRevenue * 0.3m, // 推定損失率30%
                        CustomerValue = avgCustomerValue,
                        CustomerCount = segmentCustomers.Count
                    });
                }
            }
        }

        #endregion
    }
}