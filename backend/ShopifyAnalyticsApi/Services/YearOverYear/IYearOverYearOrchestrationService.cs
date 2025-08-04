using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比オーケストレーションサービスのインターフェース
    /// 責任範囲: 全体調整・ワークフロー管理・キャッシュ管理
    /// </summary>
    public interface IYearOverYearOrchestrationService
    {
        /// <summary>
        /// 前年同月比分析を実行
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <returns>前年同月比レスポンス</returns>
        Task<YearOverYearResponse> GetYearOverYearAnalysisAsync(YearOverYearRequest request);

        /// <summary>
        /// 利用可能なフィルターオプションを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>フィルターオプション</returns>
        Task<YearOverYearFilterOptions> GetFilterOptionsAsync(int storeId);

        /// <summary>
        /// キャッシュをクリア
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>クリア結果</returns>
        Task<bool> ClearCacheAsync(int storeId);
    }

    /// <summary>
    /// フィルターオプション
    /// </summary>
    public class YearOverYearFilterOptions
    {
        public List<string> AvailableProductTypes { get; set; } = new();
        public List<string> AvailableVendors { get; set; } = new();
        public List<string> AvailableGrowthCategories { get; set; } = new();
        public int EarliestYear { get; set; }
        public int LatestYear { get; set; }
    }
}