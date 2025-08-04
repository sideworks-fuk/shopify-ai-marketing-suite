namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// ストア情報DTO
    /// </summary>
    public class StoreDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string DataType { get; set; } = "production";
        public bool IsActive { get; set; }
        public string ShopDomain { get; set; } = string.Empty;
        public string? TenantId { get; set; }
    }

    /// <summary>
    /// ストア一覧レスポンス
    /// </summary>
    public class StoreListResponse
    {
        public List<StoreDto> Stores { get; set; } = new();
        public int TotalCount { get; set; }
    }

    /// <summary>
    /// ストア詳細レスポンス
    /// </summary>
    public class StoreDetailResponse
    {
        public StoreDto Store { get; set; } = new();
        public DateTime LastDataUpdate { get; set; }
        public StoreStatistics? Statistics { get; set; }
    }

    /// <summary>
    /// ストア統計情報
    /// </summary>
    public class StoreStatistics
    {
        public int TotalCustomers { get; set; }
        public int TotalOrders { get; set; }
        public int TotalProducts { get; set; }
        public decimal TotalRevenue { get; set; }
        public DateTime? LastOrderDate { get; set; }
    }
}