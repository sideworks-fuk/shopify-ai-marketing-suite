using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.PurchaseCount;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 購入回数分析サービス実装（ファサードパターン）
    /// 新しいサービス群への委譲を行い、既存APIの互換性を保つ
    /// </summary>
    public class PurchaseCountAnalysisService : IPurchaseCountAnalysisService
    {
        private readonly IPurchaseCountOrchestrationService _orchestrationService;
        private readonly PurchaseCount.IPurchaseCountAnalysisService _analysisService;
        private readonly ILogger<PurchaseCountAnalysisService> _logger;

        public PurchaseCountAnalysisService(
            IPurchaseCountOrchestrationService orchestrationService,
            PurchaseCount.IPurchaseCountAnalysisService analysisService,
            ILogger<PurchaseCountAnalysisService> logger)
        {
            _orchestrationService = orchestrationService;
            _analysisService = analysisService;
            _logger = logger;
        }

        public async Task<PurchaseCountAnalysisResponse> GetPurchaseCountAnalysisAsync(PurchaseCountAnalysisRequest request)
        {
            return await _orchestrationService.GetPurchaseCountAnalysisAsync(request);
        }

        public async Task<PurchaseCountSummary> GetPurchaseCountSummaryAsync(int storeId, int days = 365)
        {
            return await _analysisService.GetPurchaseCountSummaryAsync(storeId, days);
        }

        public async Task<List<PurchaseCountTrend>> GetPurchaseCountTrendsAsync(int storeId, int months = 12)
        {
            return await _analysisService.GetPurchaseCountTrendsAsync(storeId, months);
        }

        public async Task<SegmentAnalysisData> GetSegmentAnalysisAsync(int storeId, string segment)
        {
            return await _analysisService.GetSegmentAnalysisAsync(storeId, segment);
        }
    }
}