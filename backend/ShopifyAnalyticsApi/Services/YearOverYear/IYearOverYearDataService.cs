using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比データアクセスサービスのインターフェース
    /// 責任範囲: データクエリ・マスタデータ取得
    /// </summary>
    public interface IYearOverYearDataService
    {
        /// <summary>
        /// 注文商品データを取得
        /// </summary>
        /// <param name="request">リクエスト</param>
        /// <param name="currentYear">現在年</param>
        /// <param name="previousYear">前年</param>
        /// <returns>注文商品分析データリスト</returns>
        Task<List<OrderItemAnalysisData>> GetOrderItemsDataAsync(YearOverYearRequest request, int currentYear, int previousYear);

        /// <summary>
        /// 利用可能な商品タイプを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>商品タイプリスト</returns>
        Task<List<string>> GetAvailableProductTypesAsync(int storeId);

        /// <summary>
        /// 利用可能なベンダーを取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>ベンダーリスト</returns>
        Task<List<string>> GetAvailableVendorsAsync(int storeId);

        /// <summary>
        /// 分析可能な期間を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>最早年と最新年のタプル</returns>
        Task<(int EarliestYear, int LatestYear)> GetAnalysisDateRangeAsync(int storeId);
    }

    /// <summary>
    /// 注文商品分析データ
    /// </summary>
    public class OrderItemAnalysisData
    {
        public string ProductName { get; set; } = string.Empty;
        public string ProductType { get; set; } = string.Empty;
        public string Vendor { get; set; } = string.Empty;
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TotalQuantity { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
    }
}