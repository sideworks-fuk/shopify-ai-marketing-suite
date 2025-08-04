using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客セグメンテーションサービスのインターフェース
    /// 責任範囲: セグメント分布計算・分類・リスク判定
    /// </summary>
    public interface IDormantSegmentationService
    {
        /// <summary>
        /// セグメント別分布を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>セグメント分布リスト</returns>
        Task<List<DormantSegmentDistribution>> GetSegmentDistributionsAsync(int storeId);

        /// <summary>
        /// 休眠期間別分布を計算
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <returns>休眠期間別分布リスト</returns>
        Task<List<DormantSegmentDistribution>> CalculateDormancyDistributionsAsync(List<Customer> customers);

        /// <summary>
        /// 購入金額別分布を計算
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <returns>購入金額別分布リスト</returns>
        Task<List<DormantSegmentDistribution>> CalculateSpendingDistributionsAsync(List<Customer> customers);

        /// <summary>
        /// 購入頻度別分布を計算
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <returns>購入頻度別分布リスト</returns>
        Task<List<DormantSegmentDistribution>> CalculateFrequencyDistributionsAsync(List<Customer> customers);

        /// <summary>
        /// セグメントのリスクレベルを判定
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <returns>リスクレベル</returns>
        Task<CustomerRiskLevel> DetermineSegmentRiskLevelAsync(List<Customer> customers);

        /// <summary>
        /// 休眠期間範囲内の顧客を取得
        /// </summary>
        /// <param name="customers">顧客リスト</param>
        /// <param name="minDays">最小日数</param>
        /// <param name="maxDays">最大日数</param>
        /// <returns>フィルタされた顧客リスト</returns>
        List<Customer> GetCustomersInDormancyRange(List<Customer> customers, int minDays, int maxDays);
    }
}