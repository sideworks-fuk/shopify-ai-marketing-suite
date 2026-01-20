using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客セグメンテーションサービスの実装
    /// 責任範囲: セグメント分布計算・分類・リスク判定
    /// </summary>
    public class DormantSegmentationService : IDormantSegmentationService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<DormantSegmentationService> _logger;
        private readonly IChurnAnalysisService _churnAnalysisService;
        private readonly IDormantStatisticsService _statisticsService;

        // キャッシュキー
        private const string SEGMENT_DISTRIBUTION_CACHE_KEY = "segment_distribution_{0}";

        // 設定値
        private readonly int _cacheExpirationMinutes = 120;

        public DormantSegmentationService(
            IMemoryCache cache,
            ILogger<DormantSegmentationService> logger,
            IChurnAnalysisService churnAnalysisService,
            IDormantStatisticsService statisticsService)
        {
            _cache = cache;
            _logger = logger;
            _churnAnalysisService = churnAnalysisService;
            _statisticsService = statisticsService;
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

                var dormantCustomers = await _statisticsService.GetDormantCustomersAsync(storeId);
                var distributions = new List<DormantSegmentDistribution>();

                // 休眠期間別分布
                distributions.AddRange(await CalculateDormancyDistributionsAsync(dormantCustomers));

                // 購入金額別分布
                distributions.AddRange(await CalculateSpendingDistributionsAsync(dormantCustomers));

                // 購入頻度別分布
                distributions.AddRange(await CalculateFrequencyDistributionsAsync(dormantCustomers));

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
        /// 休眠期間別分布を計算
        /// </summary>
        public async Task<List<DormantSegmentDistribution>> CalculateDormancyDistributionsAsync(List<Customer> customers)
        {
            try
            {
                _logger.LogDebug("休眠期間別分布計算開始: 顧客数={Count}", customers.Count);

                var distributions = new List<DormantSegmentDistribution>();
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
                            .Average(c => (DateTime.UtcNow - c.Orders!.Max(o => o.ShopifyCreatedAt ?? o.CreatedAt)).Days),
                        RiskLevel = await DetermineSegmentRiskLevelAsync(segmentCustomers)
                    };

                    distributions.Add(distribution);
                }

                _logger.LogDebug("休眠期間別分布計算完了: セグメント数={Count}", distributions.Count);
                return distributions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠期間別分布計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 購入金額別分布を計算
        /// </summary>
        public async Task<List<DormantSegmentDistribution>> CalculateSpendingDistributionsAsync(List<Customer> customers)
        {
            try
            {
                _logger.LogDebug("購入金額別分布計算開始: 顧客数={Count}", customers.Count);

                var distributions = new List<DormantSegmentDistribution>();
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
                            .Average(c => (DateTime.UtcNow - c.Orders!.Max(o => o.ShopifyCreatedAt ?? o.CreatedAt)).Days),
                        RiskLevel = await DetermineSegmentRiskLevelAsync(segmentCustomers)
                    };

                    distributions.Add(distribution);
                }

                _logger.LogDebug("購入金額別分布計算完了: セグメント数={Count}", distributions.Count);
                return distributions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入金額別分布計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 購入頻度別分布を計算
        /// </summary>
        public async Task<List<DormantSegmentDistribution>> CalculateFrequencyDistributionsAsync(List<Customer> customers)
        {
            try
            {
                _logger.LogDebug("購入頻度別分布計算開始: 顧客数={Count}", customers.Count);

                var distributions = new List<DormantSegmentDistribution>();
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
                            .Average(c => (DateTime.UtcNow - c.Orders!.Max(o => o.ShopifyCreatedAt ?? o.CreatedAt)).Days),
                        RiskLevel = await DetermineSegmentRiskLevelAsync(segmentCustomers)
                    };

                    distributions.Add(distribution);
                }

                _logger.LogDebug("購入頻度別分布計算完了: セグメント数={Count}", distributions.Count);
                return distributions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入頻度別分布計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// セグメントのリスクレベルを判定
        /// </summary>
        public async Task<CustomerRiskLevel> DetermineSegmentRiskLevelAsync(List<Customer> customers)
        {
            try
            {
                if (!customers.Any()) return CustomerRiskLevel.Low;

                var customerIds = customers.Select(c => c.Id).ToList();
                var churnProbabilities = await _churnAnalysisService.CalculateBatchChurnProbabilityAsync(customerIds);
                var averageProbability = churnProbabilities.Values.Average();

                var riskLevel = averageProbability switch
                {
                    >= 0.9m => CustomerRiskLevel.Critical,
                    >= 0.7m => CustomerRiskLevel.High,
                    >= 0.4m => CustomerRiskLevel.Medium,
                    _ => CustomerRiskLevel.Low
                };

                _logger.LogDebug("リスクレベル判定完了: 平均確率={Probability}, レベル={Level}", 
                    averageProbability, riskLevel);

                return riskLevel;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "リスクレベル判定中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 休眠期間範囲内の顧客を取得
        /// </summary>
        public List<Customer> GetCustomersInDormancyRange(List<Customer> customers, int minDays, int maxDays)
        {
            return customers.Where(c =>
            {
                if (c.Orders == null || !c.Orders.Any()) return false;
                
                var lastOrder = c.Orders.OrderByDescending(o => o.ShopifyCreatedAt ?? o.CreatedAt).First();
                var lastOrderDate = lastOrder.ShopifyCreatedAt ?? lastOrder.CreatedAt;
                var daysSince = (DateTime.UtcNow - lastOrderDate).Days;
                
                return daysSince >= minDays && (maxDays == int.MaxValue || daysSince <= maxDays);
            }).ToList();
        }
    }
}