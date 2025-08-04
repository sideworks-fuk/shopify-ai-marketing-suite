using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客統計サービスのインターフェース
    /// 責任範囲: サマリー統計計算・セグメント統計生成
    /// </summary>
    public interface IDormantStatisticsService
    {
        /// <summary>
        /// 休眠顧客サマリー統計を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>休眠顧客サマリー統計</returns>
        Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId);

        /// <summary>
        /// セグメント統計を計算
        /// </summary>
        /// <param name="dormantCustomers">休眠顧客リスト</param>
        /// <returns>セグメント統計データ</returns>
        Task<Dictionary<string, DormantSegmentStats>> CalculateSegmentStatsAsync(List<Customer> dormantCustomers);

        /// <summary>
        /// チャーン統計を計算
        /// </summary>
        /// <param name="dormantCustomers">休眠顧客リスト</param>
        /// <returns>チャーン統計データ</returns>
        Task<DormantChurnStats> CalculateChurnStatsAsync(List<Customer> dormantCustomers);

        /// <summary>
        /// 収益統計を計算
        /// </summary>
        /// <param name="dormantCustomers">休眠顧客リスト</param>
        /// <returns>収益統計データ</returns>
        DormantRevenueStats CalculateRevenueStats(List<Customer> dormantCustomers);

        /// <summary>
        /// 休眠顧客データを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>休眠顧客リスト</returns>
        Task<List<Customer>> GetDormantCustomersAsync(int storeId);
    }

    /// <summary>
    /// 休眠顧客セグメント統計
    /// </summary>
    public class DormantSegmentStats
    {
        public int CustomerCount { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal AverageRevenue { get; set; }
        public int AverageDormancyDays { get; set; }
    }

    /// <summary>
    /// 休眠顧客チャーン統計
    /// </summary>
    public class DormantChurnStats
    {
        public decimal AverageChurnProbability { get; set; }
        public int HighRiskCount { get; set; }
        public int MediumRiskCount { get; set; }
        public int LowRiskCount { get; set; }
    }

    /// <summary>
    /// 休眠顧客収益統計
    /// </summary>
    public class DormantRevenueStats
    {
        public decimal TotalLostRevenue { get; set; }
        public decimal AverageCustomerRevenue { get; set; }
        public decimal PotentialRecoverableRevenue { get; set; }
        public decimal AverageOrderValue { get; set; }
    }
}