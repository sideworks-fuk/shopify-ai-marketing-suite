using ShopifyTestApi.Models;

namespace ShopifyTestApi.Services
{
    /// <summary>
    /// 購入回数分析サービスインターフェース
    /// </summary>
    public interface IPurchaseCountAnalysisService
    {
        /// <summary>
        /// 購入回数分析データを取得
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <returns>購入回数分析レスポンス</returns>
        Task<PurchaseCountAnalysisResponse> GetPurchaseCountAnalysisAsync(PurchaseCountAnalysisRequest request);

        /// <summary>
        /// 購入回数分析サマリーを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="days">分析対象日数</param>
        /// <returns>サマリーデータ</returns>
        Task<PurchaseCountSummary> GetPurchaseCountSummaryAsync(int storeId, int days = 365);

        /// <summary>
        /// 購入回数トレンドデータを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="months">過去何ヶ月分</param>
        /// <returns>トレンドデータ</returns>
        Task<List<PurchaseCountTrend>> GetPurchaseCountTrendsAsync(int storeId, int months = 12);

        /// <summary>
        /// セグメント別購入回数分析を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="segment">セグメント</param>
        /// <returns>セグメント分析データ</returns>
        Task<SegmentAnalysisData> GetSegmentAnalysisAsync(int storeId, string segment);
    }
}