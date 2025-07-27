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

    }
}