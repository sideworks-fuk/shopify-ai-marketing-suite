using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// 同期範囲設定エンティティ
    /// </summary>
    public class SyncRangeSetting
    {
        [Key]
        public int SettingId { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        [MaxLength(50)]
        public string DataType { get; set; } = string.Empty;

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public int YearsBack { get; set; } = 3;

        public bool IncludeArchived { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? CreatedBy { get; set; }

        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// 同期進捗詳細エンティティ
    /// </summary>
    public class SyncProgressDetail
    {
        [Key]
        public int ProgressId { get; set; }

        [Required]
        public int SyncStateId { get; set; }

        [Required]
        [MaxLength(50)]
        public string DataType { get; set; } = string.Empty;

        public string? CurrentPage { get; set; }

        public int CurrentBatch { get; set; } = 0;

        public int? TotalBatches { get; set; }

        public DateTime? BatchStartedAt { get; set; }

        public DateTime LastUpdateAt { get; set; } = DateTime.UtcNow;

        public DateTime? EstimatedCompletionTime { get; set; }

        public float? RecordsPerSecond { get; set; }

        public int? AverageResponseTime { get; set; }

        public int? RecordsInDateRange { get; set; }

        public int RecordsSkipped { get; set; } = 0;

        public int RecordsWithErrors { get; set; } = 0;
        
        // 追加フィールド
        public string? BatchIdentifier { get; set; }
        
        public int RecordsInBatch { get; set; } = 0;
        
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
        
        [MaxLength(50)]
        public string Status { get; set; } = "Processing";
        
        public string? ErrorMessage { get; set; }

        [ForeignKey("SyncStateId")]
        public virtual SyncState? SyncState { get; set; }
    }

    /// <summary>
    /// 同期チェックポイントエンティティ
    /// </summary>
    public class SyncCheckpoint
    {
        [Key]
        public int CheckpointId { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        [MaxLength(50)]
        public string DataType { get; set; } = string.Empty;

        public string? LastSuccessfulCursor { get; set; }

        public DateTime? LastProcessedDate { get; set; }

        public int RecordsProcessedSoFar { get; set; } = 0;

        public DateTime? SyncStartDate { get; set; }

        public DateTime? SyncEndDate { get; set; }

        public bool CanResume { get; set; } = true;

        public DateTime? ExpiresAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// 同期状態エンティティ（既存のテーブルを拡張）
    /// </summary>
    public class SyncState
    {
        [Key]
        public int SyncStateId { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        [MaxLength(50)]
        public string SyncType { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        public int TotalRecordsProcessed { get; set; } = 0;

        public int TotalRecordsFailed { get; set; } = 0;

        public string? ErrorMessage { get; set; }

        public string? ProductCursor { get; set; }

        public string? CustomerCursor { get; set; }

        public string? OrderCursor { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // 追加フィールド
        public int TotalRecords { get; set; } = 0;
        
        public int ProcessedRecords { get; set; } = 0;
        
        public int FailedRecords { get; set; } = 0;
        
        public decimal ProgressPercentage { get; set; } = 0;
        
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? DateRangeStart { get; set; }
        
        public DateTime? DateRangeEnd { get; set; }

        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }

        public virtual ICollection<SyncProgressDetail> ProgressDetails { get; set; } = new List<SyncProgressDetail>();
    }

    /// <summary>
    /// 同期履歴エンティティ
    /// </summary>
    public class SyncHistory
    {
        [Key]
        public int HistoryId { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        [MaxLength(50)]
        public string SyncType { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = string.Empty;

        public DateTime StartedAt { get; set; }

        public DateTime CompletedAt { get; set; }

        public int RecordsProcessed { get; set; } = 0;

        public int RecordsFailed { get; set; } = 0;

        public TimeSpan? Duration { get; set; }

        public string? ErrorDetails { get; set; }

        [MaxLength(100)]
        public string? TriggeredBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // 追加フィールド
        public int TotalRecords { get; set; } = 0;
        
        public int ProcessedRecords { get; set; } = 0;
        
        public int FailedRecords { get; set; } = 0;
        
        public bool Success { get; set; } = false;
        
        public string? ErrorMessage { get; set; }
        
        public DateTime? DateRangeStart { get; set; }
        
        public DateTime? DateRangeEnd { get; set; }

        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// 初回同期オプション
    /// </summary>
    public class InitialSyncOptions
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int MaxYearsBack { get; set; } = 3;
        public bool IncludeArchived { get; set; } = false;
        /// <summary>
        /// 顧客データ同期をスキップする（Protected Customer Data未承認時の一時的な回避策）
        /// </summary>
        public bool SkipCustomers { get; set; } = false;
    }

    /// <summary>
    /// 日付範囲
    /// </summary>
    public class DateRange
    {
        public DateTime Start { get; set; }
        public DateTime End { get; set; }

        public DateRange(DateTime start, DateTime end)
        {
            Start = start;
            End = end;
        }
    }

    /// <summary>
    /// 再開情報
    /// </summary>
    public class ResumeInfo
    {
        public string? LastCursor { get; set; }
        public int RecordsAlreadyProcessed { get; set; }
        public DateTime? LastProcessedDate { get; set; }
    }
}