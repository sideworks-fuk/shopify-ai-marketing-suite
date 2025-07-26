using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客分析・統計サービスのインターフェース
    /// 責任範囲: 休眠顧客の統計分析とレポート生成
    /// </summary>
    public interface IDormantAnalyticsService
    {
        /// <summary>
        /// 休眠顧客サマリー統計を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>サマリー統計</returns>
        Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId);

        /// <summary>
        /// セグメント別分布を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>セグメント分布リスト</returns>
        Task<List<DormantSegmentDistribution>> GetSegmentDistributionsAsync(int storeId);

        /// <summary>
        /// 休眠顧客トレンド分析を実行
        /// </summary>
        /// <param name="request">トレンド分析リクエスト</param>
        /// <returns>期間別トレンドデータ</returns>
        Task<List<DormantTrendData>> GetDormantTrendsAsync(DormantTrendRequest request);

        /// <summary>
        /// 復帰可能性分析を実行
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>復帰可能性統計</returns>
        Task<ReactivationPotentialStats> GetReactivationPotentialAsync(int storeId);

        /// <summary>
        /// 休眠顧客の収益影響分析
        /// </summary>
        /// <param name="request">収益分析リクエスト</param>
        /// <returns>収益影響統計</returns>
        Task<DormantRevenueImpact> GetRevenueImpactAnalysisAsync(RevenueImpactRequest request);
    }

    /// <summary>
    /// 休眠顧客サマリー統計
    /// </summary>
    public class DormantSummaryStats
    {
        public int TotalDormantCustomers { get; set; }
        public Dictionary<string, int> SegmentCounts { get; set; } = new();
        public Dictionary<string, decimal> SegmentRevenue { get; set; } = new();
        public decimal AverageChurnProbability { get; set; }
        public decimal TotalLostRevenue { get; set; }
        public decimal PotentialRecoverableRevenue { get; set; }
        public DateTime AnalysisDate { get; set; }
    }

    /// <summary>
    /// 休眠セグメント分布
    /// </summary>
    public class DormantSegmentDistribution
    {
        public string Segment { get; set; } = string.Empty;
        public int CustomerCount { get; set; }
        public decimal Percentage { get; set; }
        public decimal AverageRevenue { get; set; }
        public decimal TotalRevenue { get; set; }
        public int AverageDaysSinceLastPurchase { get; set; }
        public CustomerRiskLevel RiskLevel { get; set; }
    }

    /// <summary>
    /// 休眠トレンドリクエスト
    /// </summary>
    public class DormantTrendRequest
    {
        public int StoreId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public TrendGranularity Granularity { get; set; } = TrendGranularity.Monthly;
        public List<string>? SegmentFilters { get; set; }
    }

    /// <summary>
    /// 休眠トレンドデータ
    /// </summary>
    public class DormantTrendData
    {
        public DateTime PeriodDate { get; set; }
        public string PeriodLabel { get; set; } = string.Empty;
        public int NewDormantCustomers { get; set; }
        public int ReactivatedCustomers { get; set; }
        public int TotalDormantCustomers { get; set; }
        public decimal DormantRate { get; set; }
        public decimal ReactivationRate { get; set; }
    }

    /// <summary>
    /// 復帰可能性統計
    /// </summary>
    public class ReactivationPotentialStats
    {
        public int HighPotentialCustomers { get; set; }
        public int MediumPotentialCustomers { get; set; }
        public int LowPotentialCustomers { get; set; }
        public decimal EstimatedReactivationRevenue { get; set; }
        public List<ReactivationStrategy> RecommendedStrategies { get; set; } = new();
    }

    /// <summary>
    /// 復帰戦略
    /// </summary>
    public class ReactivationStrategy
    {
        public string StrategyName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int TargetCustomerCount { get; set; }
        public decimal EstimatedSuccessRate { get; set; }
        public decimal EstimatedRevenue { get; set; }
    }

    /// <summary>
    /// 収益影響リクエスト
    /// </summary>
    public class RevenueImpactRequest
    {
        public int StoreId { get; set; }
        public DateTime AnalysisStartDate { get; set; }
        public DateTime AnalysisEndDate { get; set; }
        public bool IncludeProjections { get; set; } = true;
    }

    /// <summary>
    /// 休眠顧客収益影響
    /// </summary>
    public class DormantRevenueImpact
    {
        public decimal HistoricalRevenueLoss { get; set; }
        public decimal ProjectedRevenueLoss { get; set; }
        public decimal RecoverablePotential { get; set; }
        public List<SegmentRevenueImpact> SegmentBreakdown { get; set; } = new();
    }

    /// <summary>
    /// セグメント別収益影響
    /// </summary>
    public class SegmentRevenueImpact
    {
        public string SegmentName { get; set; } = string.Empty;
        public decimal RevenueLoss { get; set; }
        public decimal CustomerValue { get; set; }
        public int CustomerCount { get; set; }
    }

    /// <summary>
    /// トレンド粒度
    /// </summary>
    public enum TrendGranularity
    {
        Daily = 1,
        Weekly = 2,
        Monthly = 3,
        Quarterly = 4
    }
}