using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Dormant;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客分析・統計サービスのファサード実装
    /// 責任範囲: 既存APIの互換性を保ちながら新しい分割サービスへ委譲
    /// </summary>
    public class DormantAnalyticsService : IDormantAnalyticsService
    {
        private readonly ILogger<DormantAnalyticsService> _logger;
        private readonly IDormantStatisticsService _statisticsService;
        private readonly IDormantSegmentationService _segmentationService;
        private readonly IDormantTrendAnalysisService _trendAnalysisService;
        private readonly IDormantReactivationService _reactivationService;

        public DormantAnalyticsService(
            ILogger<DormantAnalyticsService> logger,
            IDormantStatisticsService statisticsService,
            IDormantSegmentationService segmentationService,
            IDormantTrendAnalysisService trendAnalysisService,
            IDormantReactivationService reactivationService)
        {
            _logger = logger;
            _statisticsService = statisticsService;
            _segmentationService = segmentationService;
            _trendAnalysisService = trendAnalysisService;
            _reactivationService = reactivationService;
        }

        /// <summary>
        /// 休眠顧客サマリー統計を取得
        /// </summary>
        public async Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId)
        {
            try
            {
                _logger.LogDebug("サマリー統計を取得（ファサード経由）: StoreId={StoreId}", storeId);
                return await _statisticsService.GetDormantSummaryStatsAsync(storeId);
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
                _logger.LogDebug("セグメント分布を取得（ファサード経由）: StoreId={StoreId}", storeId);
                return await _segmentationService.GetSegmentDistributionsAsync(storeId);
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
                _logger.LogDebug("トレンド分析を実行（ファサード経由）: StoreId={StoreId}", request.StoreId);
                return await _trendAnalysisService.GetDormantTrendsAsync(request);
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
                _logger.LogDebug("復帰可能性分析を実行（ファサード経由）: StoreId={StoreId}", storeId);
                return await _reactivationService.GetReactivationPotentialAsync(storeId);
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
                _logger.LogDebug("収益影響分析を実行（ファサード経由）: StoreId={StoreId}", request.StoreId);
                return await _reactivationService.GetRevenueImpactAnalysisAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "収益影響分析中にエラーが発生: StoreId={StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 詳細な期間別セグメントの件数を取得
        /// </summary>
        public async Task<List<DetailedSegmentDistribution>> GetDetailedSegmentDistributionsAsync(int storeId)
        {
            try
            {
                _logger.LogDebug("詳細セグメント分布を取得開始: StoreId={StoreId}", storeId);

                // 簡素化された3つのセグメント定義
                var segmentDefinitions = new[]
                {
                    new { Label = "90-180日", Range = "90-180日", MinDays = 90, MaxDays = 179 },
                    new { Label = "180-365日", Range = "180-365日", MinDays = 180, MaxDays = 364 },
                    new { Label = "365日以上", Range = "365日以上", MinDays = 365, MaxDays = int.MaxValue }
                };

                var results = new List<DetailedSegmentDistribution>();
                var dormantCustomers = await _statisticsService.GetDormantCustomersAsync(storeId);

                foreach (var segment in segmentDefinitions)
                {
                    // 各セグメントの顧客を抽出
                    var segmentCustomers = _segmentationService.GetCustomersInDormancyRange(dormantCustomers, segment.MinDays, segment.MaxDays);
                    
                    var count = segmentCustomers.Count;
                    var revenue = segmentCustomers.Sum(c => c.TotalSpent);

                    results.Add(new DetailedSegmentDistribution
                    {
                        Label = segment.Label,
                        Range = segment.Range,
                        Count = count,
                        Revenue = revenue,
                        MinDays = segment.MinDays,
                        MaxDays = segment.MaxDays
                    });
                }

                _logger.LogInformation("詳細セグメント分布を取得完了. StoreId: {StoreId}, セグメント数: {SegmentCount}", 
                    storeId, results.Count);
                
                // 各セグメントの詳細ログ
                foreach (var result in results)
                {
                    _logger.LogInformation("詳細セグメント: {Label} = {Count}件, 売上: {Revenue:C}", 
                        result.Label, result.Count, result.Revenue);
                }

                return results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "詳細セグメント分布の取得に失敗. StoreId: {StoreId}", storeId);
                throw;
            }
        }

    }
}