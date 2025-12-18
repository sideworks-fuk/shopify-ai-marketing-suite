using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数分析サービスのインターフェース
    /// 責任範囲: トレンド分析・セグメント分析・統合処理
    /// </summary>
    public interface IPurchaseCountAnalysisService
    {
        /// <summary>
        /// 購入回数トレンド分析を実行
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="months">月数</param>
        /// <returns>購入回数トレンドリスト</returns>
        Task<List<PurchaseCountTrend>> GetPurchaseCountTrendsAsync(int storeId, int months = 12);

        /// <summary>
        /// セグメント分析を実行
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="segment">セグメント</param>
        /// <returns>セグメント分析データ</returns>
        Task<SegmentAnalysisData> GetSegmentAnalysisAsync(int storeId, string segment);
        
        /// <summary>
        /// セグメント分析を実行（期間指定付き）
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="segment">セグメント</param>
        /// <param name="startDate">開始日</param>
        /// <param name="endDate">終了日</param>
        /// <returns>セグメント分析データ</returns>
        Task<SegmentAnalysisData> GetSegmentAnalysisAsync(int storeId, string segment, DateTime startDate, DateTime endDate);

        /// <summary>
        /// 全セグメント分析を実行
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>全セグメント分析データリスト</returns>
        Task<List<SegmentAnalysisData>> GetAllSegmentAnalysisAsync(int storeId);

        /// <summary>
        /// セグメント詳細分析を実行
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <param name="customerIds">顧客IDリスト</param>
        /// <returns>購入回数詳細リスト</returns>
        Task<List<PurchaseCountDetail>> GetPurchaseCountDetailsForSegmentAsync(
            PurchaseCountAnalysisRequest request, 
            List<int> customerIds);

        /// <summary>
        /// 購入回数サマリーを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="days">日数</param>
        /// <returns>購入回数サマリー</returns>
        Task<PurchaseCountSummary> GetPurchaseCountSummaryAsync(int storeId, int days = 365);

        /// <summary>
        /// 購入回数詳細を取得
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <returns>購入回数詳細リスト</returns>
        Task<List<PurchaseCountDetail>> GetPurchaseCountDetailsAsync(PurchaseCountAnalysisRequest request);
        
        /// <summary>
        /// 購入回数詳細を取得（セグメント顧客IDフィルタ付き）
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <param name="segmentCustomerIds">セグメント顧客IDリスト（nullの場合は全顧客）</param>
        /// <returns>購入回数詳細リスト</returns>
        Task<List<PurchaseCountDetail>> GetPurchaseCountDetailsAsync(PurchaseCountAnalysisRequest request, List<int> segmentCustomerIds);
    }
}