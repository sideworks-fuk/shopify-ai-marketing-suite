using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// チャーン分析サービスのインターフェース
    /// 責任範囲: 顧客の離反確率計算とリスク分析
    /// </summary>
    public interface IChurnAnalysisService
    {
        /// <summary>
        /// 指定された顧客のチャーン確率を計算
        /// </summary>
        /// <param name="customerId">顧客ID</param>
        /// <returns>チャーン確率（0.0-1.0）</returns>
        Task<decimal> CalculateChurnProbabilityAsync(int customerId);

        /// <summary>
        /// 複数顧客のチャーン確率を一括計算
        /// </summary>
        /// <param name="customerIds">顧客IDリスト</param>
        /// <returns>顧客IDとチャーン確率のマッピング</returns>
        Task<Dictionary<int, decimal>> CalculateBatchChurnProbabilityAsync(List<int> customerIds);

        /// <summary>
        /// チャーンリスクセグメント分析を実行
        /// </summary>
        /// <param name="request">分析リクエスト</param>
        /// <returns>リスクセグメント別の統計</returns>
        Task<List<ChurnRiskSegment>> AnalyzeChurnRiskSegmentsAsync(ChurnAnalysisRequest request);

        /// <summary>
        /// 顧客のリスクレベルを判定
        /// </summary>
        /// <param name="customerId">顧客ID</param>
        /// <returns>リスクレベル（Low, Medium, High, Critical）</returns>
        Task<CustomerRiskLevel> DetermineRiskLevelAsync(int customerId);
    }

    /// <summary>
    /// チャーン分析リクエスト
    /// </summary>
    public class ChurnAnalysisRequest
    {
        public int StoreId { get; set; }
        public DateTime? AnalysisStartDate { get; set; }
        public DateTime? AnalysisEndDate { get; set; }
        public List<string>? SegmentFilters { get; set; }
        public bool IncludeHistoricalData { get; set; } = false;
    }

    /// <summary>
    /// チャーンリスクセグメント
    /// </summary>
    public class ChurnRiskSegment
    {
        public string SegmentName { get; set; } = string.Empty;
        public CustomerRiskLevel RiskLevel { get; set; }
        public int CustomerCount { get; set; }
        public decimal AverageChurnProbability { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal PotentialLoss { get; set; }
        public List<ChurnRiskFactor> TopRiskFactors { get; set; } = new();
    }

    /// <summary>
    /// チャーンリスクファクター
    /// </summary>
    public class ChurnRiskFactor
    {
        public string FactorName { get; set; } = string.Empty;
        public decimal ImpactScore { get; set; }
        public string Description { get; set; } = string.Empty;
    }

}