using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客統計サービスの実装
    /// 責任範囲: サマリー統計計算・セグメント統計生成
    /// </summary>
    public class DormantStatisticsService : IDormantStatisticsService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<DormantStatisticsService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IChurnAnalysisService _churnAnalysisService;

        // キャッシュキー
        private const string SUMMARY_STATS_CACHE_KEY = "dormant_summary_{0}";
        private const string DORMANT_CUSTOMERS_CACHE_KEY = "dormant_customers_{0}";

        // 設定値
        private readonly int _cacheExpirationMinutes;
        private readonly int _dormancyThresholdDays;

        public DormantStatisticsService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<DormantStatisticsService> logger,
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

                var dormantCustomers = await GetDormantCustomersAsync(storeId);

                // 休眠率を計算するために全体の顧客数を取得（購入履歴がある顧客のみ）
                var totalCustomersWithOrders = await _context.Customers
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .CountAsync();

                var stats = new DormantSummaryStats
                {
                    TotalDormantCustomers = dormantCustomers.Count,
                    AnalysisDate = DateTime.UtcNow,
                    // 休眠率を計算（購入履歴がある顧客に対する休眠顧客の割合）
                    DormantRate = totalCustomersWithOrders > 0 
                        ? Math.Round((decimal)dormantCustomers.Count / totalCustomersWithOrders * 100, 1)
                        : 0
                };

                // セグメント統計
                var segmentStats = await CalculateSegmentStatsAsync(dormantCustomers);
                foreach (var (segment, segmentData) in segmentStats)
                {
                    stats.SegmentCounts[segment] = segmentData.CustomerCount;
                    stats.SegmentRevenue[segment] = segmentData.TotalRevenue;
                }

                // チャーン統計
                var churnStats = await CalculateChurnStatsAsync(dormantCustomers);
                stats.AverageChurnProbability = churnStats.AverageChurnProbability;

                // 収益統計
                var revenueStats = CalculateRevenueStats(dormantCustomers);
                stats.TotalLostRevenue = revenueStats.TotalLostRevenue;
                stats.PotentialRecoverableRevenue = revenueStats.PotentialRecoverableRevenue;
                
                // 平均休眠日数を計算（購入履歴がある休眠顧客のみ）
                if (dormantCustomers.Any())
                {
                    var dormantDaysList = dormantCustomers
                        .Where(c => c.Orders?.Any() == true)
                        .Select(c => (DateTime.UtcNow - c.Orders!.Max(o => o.CreatedAt)).Days)
                        .ToList();
                    
                    if (dormantDaysList.Any())
                    {
                        stats.AverageDormancyDays = (int)Math.Round(dormantDaysList.Average());
                    }
                }

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
        /// 休眠顧客データを取得
        /// </summary>
        public async Task<List<Customer>> GetDormantCustomersAsync(int storeId)
        {
            try
            {
                var cacheKey = string.Format(DORMANT_CUSTOMERS_CACHE_KEY, storeId);
                
                if (_cache.TryGetValue(cacheKey, out List<Customer>? cachedCustomers) && cachedCustomers != null)
                {
                    _logger.LogDebug("休眠顧客データをキャッシュから取得: StoreId={StoreId}", storeId);
                    return cachedCustomers;
                }

                var cutoffDate = DateTime.UtcNow.AddDays(-_dormancyThresholdDays);

                var dormantCustomers = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .Where(c => c.Orders.Any() && 
                              c.Orders.OrderByDescending(o => o.CreatedAt).First().CreatedAt < cutoffDate)
                    .ToListAsync();

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, dormantCustomers, cacheOptions);

                _logger.LogDebug("休眠顧客データを取得: StoreId={StoreId}, Count={Count}", 
                    storeId, dormantCustomers.Count);

                return dormantCustomers;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客データ取得中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// セグメント統計を計算
        /// </summary>
        public async Task<Dictionary<string, DormantSegmentStats>> CalculateSegmentStatsAsync(List<Customer> dormantCustomers)
        {
            try
            {
                _logger.LogDebug("セグメント統計計算開始: 顧客数={Count}", dormantCustomers.Count);

                var segmentStats = new Dictionary<string, DormantSegmentStats>();

                // 休眠期間別セグメント
                var dormancySegments = new[]
                {
                    ("90-180日", 90, 180),
                    ("180-365日", 181, 365),
                    ("365日以上", 366, int.MaxValue)
                };

                foreach (var (segmentName, minDays, maxDays) in dormancySegments)
                {
                    var segmentCustomers = GetCustomersInDormancyRange(dormantCustomers, minDays, maxDays);
                    
                    if (segmentCustomers.Any())
                    {
                        segmentStats[segmentName] = new DormantSegmentStats
                        {
                            CustomerCount = segmentCustomers.Count,
                            TotalRevenue = segmentCustomers.Sum(c => c.TotalSpent),
                            AverageRevenue = segmentCustomers.Average(c => c.TotalSpent),
                            AverageDormancyDays = (int)segmentCustomers
                                .Where(c => c.Orders?.Any() == true)
                                .Average(c => (DateTime.UtcNow - c.Orders!.Max(o => o.CreatedAt)).Days)
                        };
                    }
                }

                _logger.LogDebug("セグメント統計計算完了: セグメント数={Count}", segmentStats.Count);
                return segmentStats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント統計計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// チャーン統計を計算
        /// </summary>
        public async Task<DormantChurnStats> CalculateChurnStatsAsync(List<Customer> dormantCustomers)
        {
            try
            {
                _logger.LogDebug("チャーン統計計算開始: 顧客数={Count}", dormantCustomers.Count);

                var churnStats = new DormantChurnStats();

                if (!dormantCustomers.Any())
                {
                    return churnStats;
                }

                var customerIds = dormantCustomers.Select(c => c.Id).ToList();
                var churnProbabilities = await _churnAnalysisService.CalculateBatchChurnProbabilityAsync(customerIds);
                
                churnStats.AverageChurnProbability = churnProbabilities.Values.Average();

                foreach (var probability in churnProbabilities.Values)
                {
                    if (probability >= 0.7m)
                        churnStats.HighRiskCount++;
                    else if (probability >= 0.4m)
                        churnStats.MediumRiskCount++;
                    else
                        churnStats.LowRiskCount++;
                }

                _logger.LogDebug("チャーン統計計算完了: 平均確率={Probability}", churnStats.AverageChurnProbability);
                return churnStats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "チャーン統計計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 収益統計を計算
        /// </summary>
        public DormantRevenueStats CalculateRevenueStats(List<Customer> dormantCustomers)
        {
            try
            {
                _logger.LogDebug("収益統計計算開始: 顧客数={Count}", dormantCustomers.Count);

                var revenueStats = new DormantRevenueStats();

                if (!dormantCustomers.Any())
                {
                    return revenueStats;
                }

                revenueStats.TotalLostRevenue = dormantCustomers.Sum(c => c.TotalSpent);
                revenueStats.AverageCustomerRevenue = dormantCustomers.Average(c => c.TotalSpent);
                
                // 平均注文金額
                var customersWithOrders = dormantCustomers.Where(c => c.TotalOrders > 0).ToList();
                if (customersWithOrders.Any())
                {
                    revenueStats.AverageOrderValue = customersWithOrders.Average(c => c.TotalSpent / c.TotalOrders);
                    
                    // 復帰可能収益の簡易計算（平均購入金額の30%と仮定）
                    revenueStats.PotentialRecoverableRevenue = dormantCustomers.Count * revenueStats.AverageOrderValue * 0.3m;
                }

                _logger.LogDebug("収益統計計算完了: 総損失={Loss}", revenueStats.TotalLostRevenue);
                return revenueStats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "収益統計計算中にエラーが発生");
                throw;
            }
        }

        #region Private Methods

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

        #endregion
    }
}