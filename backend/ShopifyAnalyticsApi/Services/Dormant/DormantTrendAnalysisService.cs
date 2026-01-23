using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客トレンド分析サービスの実装
    /// 責任範囲: トレンドデータ計算・期間別分析
    /// </summary>
    public class DormantTrendAnalysisService : IDormantTrendAnalysisService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<DormantTrendAnalysisService> _logger;
        private readonly IConfiguration _configuration;

        // キャッシュキー
        private const string TREND_DATA_CACHE_KEY = "trend_data_{0}_{1}_{2}_{3}";

        // 設定値
        private readonly int _cacheExpirationMinutes;
        private readonly int _dormancyThresholdDays;

        public DormantTrendAnalysisService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<DormantTrendAnalysisService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
            _configuration = configuration;

            _cacheExpirationMinutes = _configuration.GetValue<int>("DormantAnalytics:CacheExpirationMinutes", 120);
            _dormancyThresholdDays = _configuration.GetValue<int>("DormancyThresholdDays", 90);
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
                    var trendData = await CalculateTrendDataForPeriodAsync(request.StoreId, period, request.Granularity);
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
        /// 期間のトレンドデータを計算
        /// </summary>
        public async Task<DormantTrendData> CalculateTrendDataForPeriodAsync(int storeId, DateTime periodDate, TrendGranularity granularity)
        {
            try
            {
                _logger.LogDebug("期間トレンドデータ計算開始: StoreId={StoreId}, Period={Period}", storeId, periodDate);

                var periodEnd = GetPeriodEnd(periodDate, granularity);

                // 新規休眠顧客数
                var newDormant = await CalculateNewDormantCustomersAsync(storeId, periodDate, periodEnd);

                // 復帰顧客数
                var reactivated = await CalculateReactivatedCustomersAsync(storeId, periodDate, periodEnd);

                // 期間末時点の総休眠顧客数
                var totalDormant = await CalculateTotalDormantCustomersAsync(storeId, periodEnd);

                // 総顧客数
                var totalCustomers = await _context.Customers
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .CountAsync();

                var trendData = new DormantTrendData
                {
                    PeriodDate = periodDate,
                    PeriodLabel = FormatPeriodLabel(periodDate, granularity),
                    NewDormantCustomers = newDormant,
                    ReactivatedCustomers = reactivated,
                    TotalDormantCustomers = totalDormant,
                    DormantRate = totalCustomers > 0 ? (totalDormant * 100.0m) / totalCustomers : 0,
                    ReactivationRate = totalDormant > 0 ? (reactivated * 100.0m) / totalDormant : 0
                };

                _logger.LogDebug("期間トレンドデータ計算完了: 新規休眠={New}, 復帰={Reactivated}", 
                    newDormant, reactivated);

                return trendData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "期間トレンドデータ計算中にエラーが発生: StoreId={StoreId}, Period={Period}", 
                    storeId, periodDate);
                throw;
            }
        }

        /// <summary>
        /// 新規休眠顧客数を計算
        /// </summary>
        public async Task<int> CalculateNewDormantCustomersAsync(int storeId, DateTime periodStart, DateTime periodEnd)
        {
            try
            {
                var cutoffStart = periodStart.AddDays(-_dormancyThresholdDays);
                var cutoffEnd = periodEnd.AddDays(-_dormancyThresholdDays);

                // この期間に新規休眠になった顧客
                // （最終注文日が cutoffStart から cutoffEnd の間）
                var newDormant = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.StoreId == storeId)
                    .Where(c => c.Orders.Any(o => o.ShopifyProcessedAt != null) && 
                              c.Orders.Where(o => o.ShopifyProcessedAt != null)
                                  .OrderByDescending(o => o.ShopifyProcessedAt)
                                  .Select(o => o.ShopifyProcessedAt!.Value)
                                  .First() >= cutoffStart &&
                              c.Orders.Where(o => o.ShopifyProcessedAt != null)
                                  .OrderByDescending(o => o.ShopifyProcessedAt)
                                  .Select(o => o.ShopifyProcessedAt!.Value)
                                  .First() < cutoffEnd)
                    .CountAsync();

                return newDormant;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "新規休眠顧客数計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 復帰顧客数を計算
        /// </summary>
        public async Task<int> CalculateReactivatedCustomersAsync(int storeId, DateTime periodStart, DateTime periodEnd)
        {
            try
            {
                var dormancyCutoff = periodStart.AddDays(-_dormancyThresholdDays);

                // この期間に復帰した顧客
                // （期間内に注文があり、かつ前回注文が休眠閾値より前）
                var reactivated = await _context.Orders
                    .Where(o => o.Customer!.StoreId == storeId && o.ShopifyProcessedAt != null)
                    .Where(o => o.ShopifyProcessedAt!.Value >= periodStart && o.ShopifyProcessedAt.Value < periodEnd)
                    .Where(o => _context.Orders
                        .Where(prev => prev.CustomerId == o.CustomerId && prev.ShopifyProcessedAt != null && prev.ShopifyProcessedAt < o.ShopifyProcessedAt)
                        .OrderByDescending(prev => prev.ShopifyProcessedAt)
                        .Select(prev => prev.ShopifyProcessedAt!.Value)
                        .First() < dormancyCutoff)
                    .Select(o => o.CustomerId)
                    .Distinct()
                    .CountAsync();

                return reactivated;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "復帰顧客数計算中にエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 期間を生成
        /// </summary>
        public List<DateTime> GeneratePeriods(DateTime startDate, DateTime endDate, TrendGranularity granularity)
        {
            try
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

                _logger.LogDebug("期間生成完了: 期間数={Count}, 粒度={Granularity}", periods.Count, granularity);
                return periods;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "期間生成中にエラーが発生");
                throw;
            }
        }

        #region Private Methods

        /// <summary>
        /// 期間終了日を取得
        /// </summary>
        private DateTime GetPeriodEnd(DateTime periodStart, TrendGranularity granularity)
        {
            return granularity switch
            {
                TrendGranularity.Daily => periodStart.AddDays(1),
                TrendGranularity.Weekly => periodStart.AddDays(7),
                TrendGranularity.Monthly => periodStart.AddMonths(1),
                TrendGranularity.Quarterly => periodStart.AddMonths(3),
                _ => periodStart.AddMonths(1)
            };
        }

        /// <summary>
        /// 総休眠顧客数を計算
        /// </summary>
        private async Task<int> CalculateTotalDormantCustomersAsync(int storeId, DateTime asOfDate)
        {
            var cutoffDate = asOfDate.AddDays(-_dormancyThresholdDays);

            return await _context.Customers
                .Include(c => c.Orders)
                .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                .Where(c => c.Orders.Any(o => o.ShopifyProcessedAt != null) && 
                          c.Orders.Where(o => o.ShopifyProcessedAt != null)
                              .OrderByDescending(o => o.ShopifyProcessedAt)
                              .Select(o => o.ShopifyProcessedAt!.Value)
                              .First() < cutoffDate)
                .CountAsync();
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

        #endregion
    }
}