using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// GDPR要求管理エンティティ
    /// Shopifyから受信したGDPR関連の要求を管理
    /// </summary>
    public class GDPRRequest
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// ストアID（削除済みストアの場合はnull）
        /// </summary>
        public int? StoreId { get; set; }

        /// <summary>
        /// ショップドメイン
        /// </summary>
        [Required]
        [MaxLength(255)]
        public string ShopDomain { get; set; } = string.Empty;

        /// <summary>
        /// リクエストタイプ
        /// - customers_data_request: 顧客データ提供要求
        /// - customers_redact: 顧客データ削除要求
        /// - shop_redact: ショップデータ削除要求
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string RequestType { get; set; } = string.Empty;

        /// <summary>
        /// ShopifyからのリクエストID
        /// </summary>
        [MaxLength(100)]
        public string? ShopifyRequestId { get; set; }

        /// <summary>
        /// 顧客ID（顧客関連の要求の場合）
        /// </summary>
        public long? CustomerId { get; set; }

        /// <summary>
        /// 顧客メール（記録用）
        /// </summary>
        [MaxLength(255)]
        public string? CustomerEmail { get; set; }

        /// <summary>
        /// 削除対象の注文ID（JSON配列）
        /// </summary>
        public string? OrdersToRedact { get; set; }

        /// <summary>
        /// 処理状態
        /// - pending: 処理待ち
        /// - processing: 処理中
        /// - completed: 完了
        /// - failed: 失敗
        /// - exported: エクスポート済み（data_requestの場合）
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "pending";

        /// <summary>
        /// 要求受信日時
        /// </summary>
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// 法的期限
        /// </summary>
        public DateTime DueDate { get; set; }

        /// <summary>
        /// 処理予定日時
        /// </summary>
        public DateTime? ScheduledFor { get; set; }

        /// <summary>
        /// 処理開始日時
        /// </summary>
        public DateTime? ProcessingStartedAt { get; set; }

        /// <summary>
        /// 処理完了日時
        /// </summary>
        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// エクスポートデータ（data_requestの場合）
        /// </summary>
        public string? ExportedData { get; set; }

        /// <summary>
        /// エクスポートデータのURL（Azure Blob Storage等）
        /// </summary>
        [MaxLength(500)]
        public string? ExportUrl { get; set; }

        /// <summary>
        /// 処理結果の詳細
        /// </summary>
        public string? ProcessingDetails { get; set; }

        /// <summary>
        /// エラーメッセージ
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// リトライ回数
        /// </summary>
        public int RetryCount { get; set; } = 0;

        /// <summary>
        /// 最大リトライ回数
        /// </summary>
        public int MaxRetries { get; set; } = 3;

        /// <summary>
        /// Webhookペイロード（元のリクエスト）
        /// </summary>
        public string? WebhookPayload { get; set; }

        /// <summary>
        /// 冪等性キー（重複処理防止）
        /// </summary>
        [MaxLength(255)]
        public string? IdempotencyKey { get; set; }

        /// <summary>
        /// 監査ログ（JSON形式）
        /// </summary>
        public string? AuditLog { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }

        // 計算プロパティ
        [NotMapped]
        public bool IsOverdue => Status != "completed" && DateTime.UtcNow > DueDate;

        [NotMapped]
        public int DaysUntilDue => (int)(DueDate - DateTime.UtcNow).TotalDays;

        [NotMapped]
        public bool CanRetry => RetryCount < MaxRetries && Status == "failed";
    }

    /// <summary>
    /// GDPRデータ削除履歴エンティティ
    /// 削除されたデータの監査証跡
    /// </summary>
    public class GDPRDeletionLog
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// GDPR要求ID
        /// </summary>
        public int GDPRRequestId { get; set; }

        /// <summary>
        /// 削除対象のエンティティタイプ
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string EntityType { get; set; } = string.Empty;

        /// <summary>
        /// 削除されたエンティティID
        /// </summary>
        public string? EntityId { get; set; }

        /// <summary>
        /// 削除前のデータ（匿名化済み）
        /// </summary>
        public string? AnonymizedData { get; set; }

        /// <summary>
        /// 削除日時
        /// </summary>
        public DateTime DeletedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// 削除方法（delete, anonymize, redact）
        /// </summary>
        [MaxLength(50)]
        public string DeletionMethod { get; set; } = "delete";

        /// <summary>
        /// 削除を実行したサービス
        /// </summary>
        [MaxLength(100)]
        public string? DeletedBy { get; set; }

        // ナビゲーションプロパティ
        [ForeignKey("GDPRRequestId")]
        public virtual GDPRRequest? GDPRRequest { get; set; }
    }

    /// <summary>
    /// GDPR処理統計エンティティ
    /// コンプライアンスレポート用
    /// </summary>
    public class GDPRStatistics
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// 統計期間（年月）
        /// </summary>
        [Required]
        [MaxLength(7)]
        public string Period { get; set; } = string.Empty; // YYYY-MM

        /// <summary>
        /// リクエストタイプ
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string RequestType { get; set; } = string.Empty;

        /// <summary>
        /// 受信リクエスト数
        /// </summary>
        public int TotalRequests { get; set; }

        /// <summary>
        /// 完了リクエスト数
        /// </summary>
        public int CompletedRequests { get; set; }

        /// <summary>
        /// 期限内完了数
        /// </summary>
        public int CompletedOnTime { get; set; }

        /// <summary>
        /// 期限超過数
        /// </summary>
        public int Overdue { get; set; }

        /// <summary>
        /// 失敗数
        /// </summary>
        public int Failed { get; set; }

        /// <summary>
        /// 平均処理時間（時間）
        /// </summary>
        public double AverageProcessingHours { get; set; }

        /// <summary>
        /// 最短処理時間（時間）
        /// </summary>
        public double MinProcessingHours { get; set; }

        /// <summary>
        /// 最長処理時間（時間）
        /// </summary>
        public double MaxProcessingHours { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}