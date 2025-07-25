using System.ComponentModel.DataAnnotations;

namespace ShopifyTestApi.Models
{
    // 顧客セグメントデータ
    public class CustomerSegment
    {
        public string Name { get; set; } = string.Empty;
        public int Value { get; set; }
        public string Color { get; set; } = string.Empty;
    }

    // 顧客獲得データ
    public class CustomerAcquisition
    {
        public string Month { get; set; } = string.Empty;
        public int NewCustomers { get; set; }
        public decimal Cost { get; set; }
    }

    // 顧客生涯価値データ
    public class CustomerLifetimeValue
    {
        public string Segment { get; set; } = string.Empty;
        public decimal Ltv { get; set; }
        public decimal Orders { get; set; }
    }

    // トップ顧客データ
    public class TopCustomer
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal TotalSpent { get; set; }
        public int Orders { get; set; }
        public string LastOrder { get; set; } = string.Empty;
        public string Segment { get; set; } = string.Empty;
    }

    // 購買頻度データ
    public class PurchaseFrequency
    {
        public string Frequency { get; set; } = string.Empty;
        public int Current { get; set; }
        public int Previous { get; set; }
    }

    // 商品情報
    public class ProductInfo
    {
        public string Name { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Percentage { get; set; }
        public string Category { get; set; } = string.Empty;
        public bool IsRepeat { get; set; }
    }

    // 顧客詳細データ
    public class CustomerDetail
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int PurchaseCount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal Frequency { get; set; }
        public int AvgInterval { get; set; }
        public string TopProduct { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime LastOrderDate { get; set; }
        public List<ProductInfo> TopProducts { get; set; } = new();
        public List<string> ProductCategories { get; set; } = new();
        public int RepeatProducts { get; set; }
    }

    // F階層トレンドデータ
    public class FLayerTrend
    {
        public string Month { get; set; } = string.Empty;
        public int F1 { get; set; }
        public int F2 { get; set; }
        public int F3 { get; set; }
        public int F4 { get; set; }
        public int F5 { get; set; }
    }

    // 休眠顧客データ
    public class DormantCustomer
    {
        public string Period { get; set; } = string.Empty;
        public int Count { get; set; }
        public string Action { get; set; } = string.Empty;
    }

    // 顧客ダッシュボードデータ
    public class CustomerDashboardData
    {
        public List<CustomerSegment> CustomerSegments { get; set; } = new();
        public List<CustomerAcquisition> CustomerAcquisition { get; set; } = new();
        public List<CustomerLifetimeValue> CustomerLifetimeValue { get; set; } = new();
        public List<TopCustomer> TopCustomers { get; set; } = new();
        public List<PurchaseFrequency> PurchaseFrequencies { get; set; } = new();
        public List<FLayerTrend> FLayerTrends { get; set; } = new();
        public List<DormantCustomer> DormantCustomers { get; set; } = new();
        public List<CustomerDetail> CustomerDetails { get; set; } = new();
    }

    // ==============================================
    // 休眠顧客分析用DTOモデル (Phase 1実装)
    // ==============================================

    /// <summary>
    /// 休眠顧客分析リクエスト
    /// </summary>
    public class DormantCustomerRequest
    {
        public int StoreId { get; set; } = 1; // デフォルトストアID
        public string? Segment { get; set; } // "all", "90-180日", "180-365日", "365日以上"
        public string? RiskLevel { get; set; } // "low", "medium", "high", "critical"
        public decimal? MinTotalSpent { get; set; }
        public decimal? MaxTotalSpent { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20; // パフォーマンス改善: 50→20に削減
        public string SortBy { get; set; } = "DaysSinceLastPurchase";
        public bool Descending { get; set; } = true;
    }

    /// <summary>
    /// 休眠顧客分析レスポンス
    /// </summary>
    public class DormantCustomerResponse
    {
        public List<DormantCustomerDto> Customers { get; set; } = new();
        public DormantSummaryStats Summary { get; set; } = new();
        public List<SegmentDistribution> SegmentDistributions { get; set; } = new();
        public PaginationInfo Pagination { get; set; } = new();
    }

    /// <summary>
    /// 休眠顧客DTO
    /// </summary>
    public class DormantCustomerDto
    {
        public int CustomerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime? LastPurchaseDate { get; set; }
        public int DaysSinceLastPurchase { get; set; }
        public string DormancySegment { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
        public decimal ChurnProbability { get; set; }
        public decimal TotalSpent { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
        public List<string> Tags { get; set; } = new();
        public List<string> PreferredCategories { get; set; } = new();
        public ReactivationInsight Insight { get; set; } = new();
    }

    /// <summary>
    /// 休眠顧客サマリー統計
    /// </summary>
    public class DormantSummaryStats
    {
        public int TotalDormantCustomers { get; set; }
        public decimal DormantRate { get; set; }
        public int AverageDormancyDays { get; set; }
        public decimal EstimatedLostRevenue { get; set; }
        public decimal ReactivationRate { get; set; }
        public decimal RecoveredRevenue { get; set; }
        public Dictionary<string, int> SegmentCounts { get; set; } = new();
        public Dictionary<string, decimal> SegmentRevenue { get; set; } = new();
    }

    /// <summary>
    /// セグメント分布データ
    /// </summary>
    public class SegmentDistribution
    {
        public string Segment { get; set; } = string.Empty;
        public int Count { get; set; }
        public decimal Percentage { get; set; }
        public decimal Revenue { get; set; }
    }

    /// <summary>
    /// 復帰インサイト
    /// </summary>
    public class ReactivationInsight
    {
        public string RecommendedAction { get; set; } = string.Empty;
        public string OptimalTiming { get; set; } = string.Empty;
        public decimal EstimatedSuccessRate { get; set; }
        public string SuggestedOffer { get; set; } = string.Empty;
        public List<string> PersonalizationTips { get; set; } = new();
    }

    /// <summary>
    /// ページング情報
    /// </summary>
    public class PaginationInfo
    {
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasNextPage => CurrentPage < TotalPages;
        public bool HasPreviousPage => CurrentPage > 1;
    }

    // ==============================================
    // API共通レスポンス形式
    // ==============================================

    /// <summary>
    /// API共通レスポンス形式
    /// </summary>
    /// <typeparam name="T">レスポンスデータの型</typeparam>
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public List<string> Errors { get; set; } = new();
    }
} 