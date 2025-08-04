using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客トレンド分析サービスのインターフェース
    /// 責任範囲: トレンドデータ計算・期間別分析
    /// </summary>
    public interface IDormantTrendAnalysisService
    {
        /// <summary>
        /// 休眠顧客トレンド分析を実行
        /// </summary>
        /// <param name="request">トレンド分析リクエスト</param>
        /// <returns>トレンドデータリスト</returns>
        Task<List<DormantTrendData>> GetDormantTrendsAsync(DormantTrendRequest request);

        /// <summary>
        /// 期間のトレンドデータを計算
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="periodDate">期間日付</param>
        /// <param name="granularity">粒度</param>
        /// <returns>トレンドデータ</returns>
        Task<DormantTrendData> CalculateTrendDataForPeriodAsync(int storeId, DateTime periodDate, TrendGranularity granularity);

        /// <summary>
        /// 新規休眠顧客数を計算
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="periodStart">期間開始</param>
        /// <param name="periodEnd">期間終了</param>
        /// <returns>新規休眠顧客数</returns>
        Task<int> CalculateNewDormantCustomersAsync(int storeId, DateTime periodStart, DateTime periodEnd);

        /// <summary>
        /// 復帰顧客数を計算
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="periodStart">期間開始</param>
        /// <param name="periodEnd">期間終了</param>
        /// <returns>復帰顧客数</returns>
        Task<int> CalculateReactivatedCustomersAsync(int storeId, DateTime periodStart, DateTime periodEnd);

        /// <summary>
        /// 期間を生成
        /// </summary>
        /// <param name="startDate">開始日</param>
        /// <param name="endDate">終了日</param>
        /// <param name="granularity">粒度</param>
        /// <returns>期間リスト</returns>
        List<DateTime> GeneratePeriods(DateTime startDate, DateTime endDate, TrendGranularity granularity);
    }
}