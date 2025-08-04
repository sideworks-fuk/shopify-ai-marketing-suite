using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客復帰分析サービスのインターフェース
    /// 責任範囲: 復帰可能性分析・戦略生成・収益影響計算
    /// </summary>
    public interface IDormantReactivationService
    {
        /// <summary>
        /// 復帰可能性分析を実行
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>復帰可能性統計</returns>
        Task<ReactivationPotentialStats> GetReactivationPotentialAsync(int storeId);

        /// <summary>
        /// 休眠顧客の収益影響分析
        /// </summary>
        /// <param name="request">収益影響分析リクエスト</param>
        /// <returns>収益影響データ</returns>
        Task<DormantRevenueImpact> GetRevenueImpactAnalysisAsync(RevenueImpactRequest request);

        /// <summary>
        /// 復帰可能性を分類
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <returns>可能性分類データ</returns>
        Task<ReactivationPotentialClassification> ClassifyReactivationPotentialAsync(List<Customer> customers);

        /// <summary>
        /// 復帰戦略を生成
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <param name="classification">可能性分類</param>
        /// <returns>復帰戦略リスト</returns>
        Task<List<ReactivationStrategy>> GenerateReactivationStrategiesAsync(
            List<Customer> customers, 
            ReactivationPotentialClassification classification);

        /// <summary>
        /// 推定収益を計算
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <param name="strategies">復帰戦略リスト</param>
        /// <returns>推定収益データ</returns>
        Task<EstimatedRevenueData> CalculateEstimatedRevenueAsync(
            List<Customer> customers, 
            List<ReactivationStrategy> strategies);

        /// <summary>
        /// 過去の収益損失を計算
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <param name="periodMonths">期間（月数）</param>
        /// <returns>収益損失データ</returns>
        Task<RevenueLossData> CalculateHistoricalRevenueLossAsync(List<Customer> customers, int periodMonths);

        /// <summary>
        /// 将来の収益損失を予測
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <param name="projectionMonths">予測期間（月数）</param>
        /// <returns>予測収益損失データ</returns>
        Task<RevenueLossData> CalculateProjectedRevenueLossAsync(List<Customer> customers, int projectionMonths);
    }

    /// <summary>
    /// 復帰可能性分類
    /// </summary>
    public class ReactivationPotentialClassification
    {
        public int HighPotentialCount { get; set; }
        public int MediumPotentialCount { get; set; }
        public int LowPotentialCount { get; set; }
        public List<int> HighPotentialCustomerIds { get; set; } = new();
        public List<int> MediumPotentialCustomerIds { get; set; } = new();
        public List<int> LowPotentialCustomerIds { get; set; } = new();
    }

    /// <summary>
    /// 推定収益データ
    /// </summary>
    public class EstimatedRevenueData
    {
        public decimal TotalEstimatedRevenue { get; set; }
        public decimal AverageRevenuePerCustomer { get; set; }
        public Dictionary<string, decimal> RevenueByStrategy { get; set; } = new();
    }

    /// <summary>
    /// 収益損失データ
    /// </summary>
    public class RevenueLossData
    {
        public decimal TotalLoss { get; set; }
        public decimal AverageLossPerCustomer { get; set; }
        public decimal MonthlyAverageLoss { get; set; }
        public Dictionary<string, decimal> LossBySegment { get; set; } = new();
    }
}