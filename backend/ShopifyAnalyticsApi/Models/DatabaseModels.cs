using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// ストアエンティティ（マルチストア対応）
    /// </summary>
    public class Store
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Domain { get; set; }
        
        [MaxLength(100)]
        public string? ShopifyShopId { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // ナビゲーションプロパティ
        public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
        public virtual ICollection<Product> Products { get; set; } = new List<Product>();
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    }

    /// <summary>
    /// 顧客エンティティ (Shopify CSV対応拡張版)
    /// </summary>
    public class Customer
    {
        [Key]
        public int Id { get; set; }
        
        // ストア識別子（マルチストア対応）
        [Required]
        public int StoreId { get; set; }
        
        // Shopify Customer ID (分析・連携用)
        [MaxLength(50)]
        public string? ShopifyCustomerId { get; set; }  // Shopifyの顧客ID
        
        // 基本個人情報 (匿名化済み)
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? Phone { get; set; }
        
        // 住所情報 (匿名化済み)
        [MaxLength(100)]
        public string? Company { get; set; }
        
        // Address1, Address2, Zipは匿名化でNULLになるため削除
        
        [MaxLength(50)]
        public string? City { get; set; }
        
        [MaxLength(10)]
        public string? ProvinceCode { get; set; }  // 地域分析用
        
        [MaxLength(10)]
        public string? CountryCode { get; set; }   // 国別分析用
        
        [MaxLength(20)]
        public string? AddressPhone { get; set; }  // Default Address Phone
        
        // マーケティング許可設定 (分析用)
        public bool AcceptsEmailMarketing { get; set; } = false;
        public bool AcceptsSMSMarketing { get; set; } = false;
        
        // 購買統計 (重要な分析指標)
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalSpent { get; set; } = 0;
        
        public int TotalOrders { get; set; } = 0;
        
        // 顧客属性
        public bool TaxExempt { get; set; } = false;
        
        [MaxLength(1000)]
        public string? Tags { get; set; }  // フィルタ済みタグ (VIP, 新規, リピーター等)
        
        // Shopify Metafields (匿名化・分析用)
        [MaxLength(100)]
        public string? CompanyStoreName { get; set; }  // 会社名または店舗名 (匿名化済み)
        
        [MaxLength(100)]
        public string? Industry { get; set; }  // 業種名 (分析用)
        
        // システム管理用
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // 従来の互換性フィールド (非推奨だが既存データ用)
        [MaxLength(50)]
        public string CustomerSegment { get; set; } = "新規顧客";
        
        [Obsolete("Use TotalOrders instead")]
        public int OrdersCount { get; set; } = 0;
        
        // ナビゲーションプロパティ
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
        
        // 計算プロパティ
        [NotMapped]
        public decimal AverageOrderValue => TotalOrders > 0 ? TotalSpent / TotalOrders : 0;
        
        [NotMapped]
        public string DisplayName => $"{FirstName} {LastName}";
        
        [NotMapped]
        public bool IsHighValueCustomer => TotalSpent > 100000; // 10万円以上
        
        [NotMapped]
        public bool IsFrequentBuyer => TotalOrders > 10;
        
        [NotMapped]
        public string? RegionDisplay => !string.IsNullOrEmpty(ProvinceCode) ? 
            $"{City}, {ProvinceCode}" : City;
    }

    /// <summary>
    /// 注文エンティティ
    /// </summary>
    public class Order
    {
        [Key]
        public int Id { get; set; }
        
        // ストア識別子（マルチストア対応）
        [Required]
        public int StoreId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string OrderNumber { get; set; } = string.Empty;
        
        [ForeignKey("Customer")]
        public int CustomerId { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPrice { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal SubtotalPrice { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TaxPrice { get; set; }
        
        [MaxLength(50)]
        public string Currency { get; set; } = "JPY";
        
        [MaxLength(50)]
        public string Status { get; set; } = "pending";
        
        [MaxLength(50)]
        public string FinancialStatus { get; set; } = "pending";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // 計算プロパティ
        [NotMapped]
        public int Year => CreatedAt.Year;
        
        [NotMapped]
        public int Month => CreatedAt.Month;
        
        [NotMapped]
        public string YearMonth => CreatedAt.ToString("yyyy-MM");
        
        // ナビゲーションプロパティ
        public virtual Customer Customer { get; set; } = null!;
        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }

    /// <summary>
    /// 商品エンティティ
    /// </summary>
    public class Product
    {
        [Key]
        public int Id { get; set; }
        
        // ストア識別子（マルチストア対応）
        [Required]
        public int StoreId { get; set; }
        
        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? Handle { get; set; }  // Shopify商品ハンドル
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        [MaxLength(100)]
        public string? Category { get; set; }
        
        [MaxLength(100)]
        public string? Vendor { get; set; }  // メーカー・ベンダー情報
        
        [MaxLength(100)]
        public string? ProductType { get; set; }  // 商品タイプ
        
        public int InventoryQuantity { get; set; } = 0;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // ナビゲーションプロパティ
        public virtual ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
        // OrderItemは商品情報のスナップショットを保存するため、ナビゲーションプロパティは不要
        // public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }

    /// <summary>
    /// 商品バリアントエンティティ（Shopifyのバリアント構造に対応）
    /// </summary>
    public class ProductVariant
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("Product")]
        public int ProductId { get; set; }
        
        [MaxLength(100)]
        public string? Sku { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? CompareAtPrice { get; set; }
        
        public int InventoryQuantity { get; set; } = 0;
        
        [MaxLength(100)]
        public string? Option1Name { get; set; }  // 例: "サイズ"
        
        [MaxLength(100)]
        public string? Option1Value { get; set; } // 例: "M"
        
        [MaxLength(100)]
        public string? Option2Name { get; set; }  // 例: "カラー"
        
        [MaxLength(100)]
        public string? Option2Value { get; set; } // 例: "ブルー"
        
        [MaxLength(100)]
        public string? Option3Name { get; set; }
        
        [MaxLength(100)]
        public string? Option3Value { get; set; }
        
        [MaxLength(100)]
        public string? Barcode { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? Weight { get; set; }
        
        [MaxLength(10)]
        public string? WeightUnit { get; set; }
        
        public bool RequiresShipping { get; set; } = true;
        public bool Taxable { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // ナビゲーションプロパティ
        public virtual Product Product { get; set; } = null!;
        // OrderItemは商品情報のスナップショットを保存するため、ナビゲーションプロパティは不要
        // public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }

    /// <summary>
    /// 注文明細エンティティ（注文時の商品情報スナップショット）
    /// </summary>
    public class OrderItem
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("Order")]
        public int OrderId { get; set; }
        
        // 商品情報のスナップショット（注文時の情報を保存）
        [MaxLength(50)]
        public string? ProductId { get; set; }  // Shopify Product ID for reference
        
        [MaxLength(255)]
        public string ProductTitle { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string? ProductHandle { get; set; }
        
        [MaxLength(100)]
        public string? ProductVendor { get; set; }
        
        [MaxLength(100)]
        public string? ProductType { get; set; }
        
        [MaxLength(100)]
        public string? Sku { get; set; }
        
        [MaxLength(100)]
        public string? VariantTitle { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal? CompareAtPrice { get; set; }
        
        public int Quantity { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPrice { get; set; }
        
        [MaxLength(100)]
        public string? Option1Name { get; set; }
        
        [MaxLength(100)]
        public string? Option1Value { get; set; }
        
        [MaxLength(100)]
        public string? Option2Name { get; set; }
        
        [MaxLength(100)]
        public string? Option2Value { get; set; }
        
        [MaxLength(100)]
        public string? Option3Name { get; set; }
        
        [MaxLength(100)]
        public string? Option3Value { get; set; }
        
        public bool RequiresShipping { get; set; } = true;
        public bool Taxable { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // ナビゲーションプロパティ
        public virtual Order Order { get; set; } = null!;
    }
} 