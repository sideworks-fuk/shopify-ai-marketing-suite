using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 前年同月比分析サービスのインターフェース
    /// </summary>
    public interface IYearOverYearService
    {
        /// <summary>
        /// 前年同月比分析データを取得
        /// </summary>
        /// <param name="request">分析リクエストパラメータ</param>
        /// <returns>前年同月比分析結果</returns>
        Task<YearOverYearResponse> GetYearOverYearAnalysisAsync(YearOverYearRequest request);

        /// <summary>
        /// 利用可能な商品タイプ一覧を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>商品タイプ一覧</returns>
        Task<List<string>> GetAvailableProductTypesAsync(int storeId);

        /// <summary>
        /// 利用可能なベンダー一覧を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>ベンダー一覧</returns>
        Task<List<string>> GetAvailableVendorsAsync(int storeId);

        /// <summary>
        /// 指定ストアの分析可能期間を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>最古年と最新年のタプル</returns>
        Task<(int EarliestYear, int LatestYear)> GetAnalysisDateRangeAsync(int storeId);
    }
}