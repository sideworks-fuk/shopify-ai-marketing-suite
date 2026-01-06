using System.ComponentModel.DataAnnotations;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// データ同期状態を管理するエンティティ
    /// </summary>
    public class SyncStatus
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int StoreId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string SyncType { get; set; } = string.Empty; // 'initial', 'manual', 'scheduled'
        
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = string.Empty; // 'pending', 'running', 'completed', 'failed'
        
        [Required]
        public DateTime StartDate { get; set; }
        
        public DateTime? EndDate { get; set; }
        
        public int? TotalRecords { get; set; }
        
        public int? ProcessedRecords { get; set; }
        
        public string? ErrorMessage { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // 追加プロパティ
        [MaxLength(50)]
        public string? CurrentTask { get; set; } // 現在処理中のタスク（例：注文データ取得中）
        
        [MaxLength(50)]
        public string? SyncPeriod { get; set; } // '3months', '6months', '1year', 'all'
        
        [MaxLength(50)]
        public string? EntityType { get; set; } // 'Product', 'Customer', 'Order', 'All'
        
        public string? Metadata { get; set; } // JSON形式の追加情報
    }
}