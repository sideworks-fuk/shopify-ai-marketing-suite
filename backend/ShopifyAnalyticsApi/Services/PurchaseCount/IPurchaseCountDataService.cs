using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数データアクセスサービスのインターフェース
    /// 責任範囲: データクエリ・顧客セグメント取得
    /// </summary>
    public interface IPurchaseCountDataService
    {
        /// <summary>
        /// 顧客購入回数データを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="startDate">開始日</param>
        /// <param name="endDate">終了日</param>
        /// <returns>顧客購入データリスト</returns>
        Task<List<CustomerPurchaseData>> GetCustomerPurchaseCountsAsync(int storeId, DateTime startDate, DateTime endDate);

        /// <summary>
        /// セグメント顧客IDを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="segment">セグメント</param>
        /// <returns>セグメント名と顧客IDリスト</returns>
        Task<(string segmentName, List<int> customerIds)> GetSegmentCustomerIdsAsync(int storeId, string segment);

        /// <summary>
        /// セグメント顧客の購入回数データを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="customerIds">顧客IDリスト</param>
        /// <param name="startDate">開始日</param>
        /// <param name="endDate">終了日</param>
        /// <returns>顧客購入データリスト</returns>
        Task<List<CustomerPurchaseData>> GetSegmentCustomerPurchaseCountsAsync(int storeId, List<int> customerIds, DateTime startDate, DateTime endDate);

        /// <summary>
        /// 期間の総売上を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="startDate">開始日</param>
        /// <param name="endDate">終了日</param>
        /// <returns>総売上</returns>
        Task<decimal> GetTotalRevenueAsync(int storeId, DateTime startDate, DateTime endDate);

        /// <summary>
        /// 月次期間の顧客購入データを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="periodStart">期間開始</param>
        /// <param name="periodEnd">期間終了</param>
        /// <returns>顧客購入データリスト</returns>
        Task<List<CustomerPurchaseData>> GetMonthlyCustomerPurchaseCountsAsync(int storeId, DateTime periodStart, DateTime periodEnd);
    }
}