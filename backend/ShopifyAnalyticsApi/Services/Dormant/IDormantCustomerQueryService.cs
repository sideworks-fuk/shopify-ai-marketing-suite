using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// 休眠顧客データ取得サービスのインターフェース
    /// 責任範囲: 休眠顧客データの読み取り専用操作
    /// </summary>
    public interface IDormantCustomerQueryService
    {
        /// <summary>
        /// 休眠顧客リストを取得（ページング対応）
        /// </summary>
        /// <param name="query">検索クエリパラメータ</param>
        /// <returns>ページング結果付きの休眠顧客リスト</returns>
        Task<PaginatedResult<DormantCustomerDto>> GetDormantCustomersAsync(DormantCustomerQuery query);

        /// <summary>
        /// 指定されたIDの休眠顧客を取得
        /// </summary>
        /// <param name="customerId">顧客ID</param>
        /// <returns>休眠顧客詳細、見つからない場合はnull</returns>
        Task<DormantCustomerDto?> GetDormantCustomerByIdAsync(int customerId);

        /// <summary>
        /// 休眠顧客の総数を取得
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="filters">フィルター条件</param>
        /// <returns>条件に一致する休眠顧客数</returns>
        Task<int> GetDormantCustomerCountAsync(int storeId, DormantCustomerFilters? filters = null);
    }

    /// <summary>
    /// 休眠顧客検索用クエリパラメータ
    /// </summary>
    public class DormantCustomerQuery
    {
        public int StoreId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        public string SortBy { get; set; } = "DaysSinceLastPurchase";
        public bool Descending { get; set; } = false;
        public DormantCustomerFilters? Filters { get; set; }
    }

    /// <summary>
    /// 休眠顧客フィルター条件
    /// </summary>
    public class DormantCustomerFilters
    {
        public int? MinDaysSinceLastPurchase { get; set; }
        public int? MaxDaysSinceLastPurchase { get; set; }
        public decimal? MinTotalSpent { get; set; }
        public decimal? MaxTotalSpent { get; set; }
        public string? DormancySegment { get; set; }
        public string? RiskLevel { get; set; }
        public List<string>? CustomerTags { get; set; }
    }

    /// <summary>
    /// ページング結果
    /// </summary>
    public class PaginatedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public PaginationMetadata Pagination { get; set; } = new();
    }

    /// <summary>
    /// ページング情報（新サービス用）
    /// </summary>
    public class PaginationMetadata
    {
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalItems / PageSize);
        public bool HasNextPage => CurrentPage < TotalPages;
        public bool HasPreviousPage => CurrentPage > 1;
    }

}