using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客サービス統合ファサード
    /// 責任範囲: 既存APIとの互換性維持と各専門サービスの統合
    /// 注意: このインターフェースは段階的移行期間中の互換性維持のためのもの
    /// </summary>
    public interface IDormantCustomerService
    {
        /// <summary>
        /// 休眠顧客リストを取得（既存API互換）
        /// </summary>
        /// <param name="request">リクエストパラメータ</param>
        /// <returns>休眠顧客レスポンス</returns>
        Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request);

        /// <summary>
        /// 休眠顧客サマリー統計を取得（既存API互換）
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>サマリー統計レスポンス</returns>
        Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId);

        /// <summary>
        /// チャーン確率を計算（既存API互換）
        /// </summary>
        /// <param name="customerId">顧客ID</param>
        /// <returns>チャーン確率</returns>
        Task<decimal> CalculateChurnProbabilityAsync(int customerId);

        /// <summary>
        /// 詳細な期間別セグメントの件数を取得（既存API互換）
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>詳細セグメント分布リスト</returns>
        Task<List<DetailedSegmentDistribution>> GetDetailedSegmentDistributionsAsync(int storeId);
    }

    /// <summary>
    /// 休眠顧客統合サービス実装（ファサードパターン）
    /// 各専門サービスを組み合わせて既存APIの機能を提供
    /// </summary>
    public class DormantCustomerService : IDormantCustomerService
    {
        private readonly IDormantCustomerQueryService _queryService;
        private readonly IChurnAnalysisService _churnService;
        private readonly IDormantAnalyticsService _analyticsService;
        private readonly ILogger<DormantCustomerService> _logger;

        public DormantCustomerService(
            IDormantCustomerQueryService queryService,
            IChurnAnalysisService churnService,
            IDormantAnalyticsService analyticsService,
            ILogger<DormantCustomerService> logger)
        {
            _queryService = queryService;
            _churnService = churnService;
            _analyticsService = analyticsService;
            _logger = logger;
        }

        public async Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request)
        {
            _logger.LogInformation("休眠顧客リスト取得開始 StoreId: {StoreId}", request.StoreId);

            // リクエストを新しいクエリ形式に変換
            var query = new DormantCustomerQuery
            {
                StoreId = request.StoreId,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                SortBy = request.SortBy,
                Descending = request.Descending,
                Filters = ConvertToFilters(request)
            };

            // 専門サービスを使用してデータ取得
            var result = await _queryService.GetDormantCustomersAsync(query);

            // レスポンス形式に変換（既存のDormantCustomerResponseを使用）
            return new DormantCustomerResponse
            {
                Customers = result.Items.Select(item => new DormantCustomerDto
                {
                    CustomerId = item.CustomerId,
                    Name = item.Name,
                    Email = item.Email,
                    Phone = item.Phone,
                    Company = item.Company,
                    LastPurchaseDate = item.LastPurchaseDate,
                    DaysSinceLastPurchase = item.DaysSinceLastPurchase,
                    DormancySegment = item.DormancySegment,
                    RiskLevel = item.RiskLevel,
                    ChurnProbability = item.ChurnProbability,
                    TotalSpent = item.TotalSpent,
                    TotalOrders = item.TotalOrders,
                    AverageOrderValue = item.AverageOrderValue
                }).ToList(),
                Pagination = new PaginationInfo
                {
                    CurrentPage = result.Pagination.CurrentPage,
                    PageSize = result.Pagination.PageSize,
                    TotalCount = result.Pagination.TotalItems
                }
            };
        }

        public async Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId)
        {
            _logger.LogInformation("休眠顧客サマリー統計取得開始 StoreId: {StoreId}", storeId);

            // 分析サービスからサマリー統計を取得
            var summaryStats = await _analyticsService.GetDormantSummaryStatsAsync(storeId);

            // 既存のDormantSummaryStatsをそのまま返す
            return summaryStats;
        }

        public async Task<decimal> CalculateChurnProbabilityAsync(int customerId)
        {
            _logger.LogInformation("チャーン確率計算開始 CustomerId: {CustomerId}", customerId);

            // チャーン分析サービスに委譲
            return await _churnService.CalculateChurnProbabilityAsync(customerId);
        }

        public async Task<List<DetailedSegmentDistribution>> GetDetailedSegmentDistributionsAsync(int storeId)
        {
            _logger.LogInformation("詳細セグメント分布取得開始 StoreId: {StoreId}", storeId);

            try
            {
                // 分析サービスから詳細セグメント分布を取得
                var detailedSegments = await _analyticsService.GetDetailedSegmentDistributionsAsync(storeId);
                
                // 全体の件数を計算して各セグメントに設定
                var totalCount = detailedSegments.Sum(s => s.Count);
                foreach (var segment in detailedSegments)
                {
                    segment.TotalCount = totalCount;
                }

                _logger.LogInformation("詳細セグメント分布取得完了 StoreId: {StoreId}, SegmentCount: {Count}", 
                    storeId, detailedSegments.Count);

                return detailedSegments;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "詳細セグメント分布取得中にエラーが発生 StoreId: {StoreId}", storeId);
                throw;
            }
        }

        private static DormantCustomerFilters? ConvertToFilters(DormantCustomerRequest request)
        {
            // 既存リクエストパラメータを新しいフィルター形式に変換
            if (request.MinTotalSpent == null && 
                request.MaxTotalSpent == null &&
                string.IsNullOrEmpty(request.Segment))
            {
                return null;
            }

            return new DormantCustomerFilters
            {
                MinTotalSpent = request.MinTotalSpent,
                MaxTotalSpent = request.MaxTotalSpent,
                DormancySegment = request.Segment,
                RiskLevel = request.RiskLevel
            };
        }
    }

}