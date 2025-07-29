using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数オーケストレーションサービスのインターフェース
    /// 責任範囲: 全体調整・ワークフロー管理・インサイト生成
    /// </summary>
    public interface IPurchaseCountOrchestrationService
    {
        /// <summary>
        /// 購入回数分析を実行
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <returns>購入回数分析レスポンス</returns>
        Task<PurchaseCountAnalysisResponse> GetPurchaseCountAnalysisAsync(PurchaseCountAnalysisRequest request);

        /// <summary>
        /// インサイトを生成
        /// </summary>
        /// <param name="response">分析レスポンス</param>
        /// <returns>購入回数インサイト</returns>
        PurchaseCountInsights GenerateInsights(PurchaseCountAnalysisResponse response);

        /// <summary>
        /// 簡易版購入回数分析を実行（5階層）
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <returns>購入回数分析レスポンス（5階層）</returns>
        Task<PurchaseCountAnalysisResponse> GetSimplifiedPurchaseCountAnalysisAsync(PurchaseCountAnalysisRequest request);
    }
}