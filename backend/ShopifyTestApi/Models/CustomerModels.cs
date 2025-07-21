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
        public string Status { get; set; } = string.Empty; // "VIP" | "リピーター" | "新規" | "休眠"
        public DateTime LastOrderDate { get; set; }
        public List<ProductInfo> TopProducts { get; set; } = new();
        public List<string> ProductCategories { get; set; } = new();
        public int RepeatProducts { get; set; }
    }

    // APIレスポンス用のデータ集約クラス
    public class CustomerDashboardData
    {
        public List<CustomerSegment> CustomerSegments { get; set; } = new();
        public List<CustomerAcquisition> CustomerAcquisitions { get; set; } = new();
        public List<CustomerLifetimeValue> CustomerLifetimeValues { get; set; } = new();
        public List<TopCustomer> TopCustomers { get; set; } = new();
        public List<PurchaseFrequency> PurchaseFrequencies { get; set; } = new();
        public List<CustomerDetail> CustomerDetails { get; set; } = new();
    }

    // API共通レスポンス形式
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
} 