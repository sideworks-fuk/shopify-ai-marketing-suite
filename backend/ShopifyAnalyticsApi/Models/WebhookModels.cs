using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// Webhookイベント履歴エンティティ
    /// Shopifyから受信した全てのWebhookイベントを記録
    /// </summary>
    public class WebhookEvent
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        [MaxLength(255)]
        public string ShopDomain { get; set; } = string.Empty;

        /// <summary>
        /// Webhookトピック
        /// 例: app/uninstalled, customers/redact, shop/redact, customers/data_request
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string Topic { get; set; } = string.Empty;

        /// <summary>
        /// WebhookペイロードのJSON
        /// </summary>
        public string? Payload { get; set; }

        /// <summary>
        /// 処理状態: pending, processing, completed, failed
        /// </summary>
        [MaxLength(50)]
        public string Status { get; set; } = "pending";

        /// <summary>
        /// 処理完了日時
        /// </summary>
        public DateTime? ProcessedAt { get; set; }

        /// <summary>
        /// GDPR削除予定日
        /// </summary>
        public DateTime? ScheduledDeletionDate { get; set; }

        /// <summary>
        /// エラーメッセージ
        /// </summary>
        public string? ErrorMessage { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// インストール履歴エンティティ
    /// アプリのインストール/アンインストール履歴を追跡
    /// </summary>
    public class InstallationHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        [MaxLength(255)]
        public string ShopDomain { get; set; } = string.Empty;

        /// <summary>
        /// アクション: installed, uninstalled, reinstalled
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// アクセストークン（暗号化して保存）
        /// </summary>
        public string? AccessToken { get; set; }

        /// <summary>
        /// 付与されたスコープ
        /// </summary>
        [MaxLength(500)]
        public string? Scopes { get; set; }

        /// <summary>
        /// インストール日時
        /// </summary>
        public DateTime? InstalledAt { get; set; }

        /// <summary>
        /// アンインストール日時
        /// </summary>
        public DateTime? UninstalledAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// GDPRコンプライアンスログエンティティ
    /// GDPR要求の処理状況を監査証跡として記録
    /// </summary>
    public class GDPRComplianceLog
    {
        [Key]
        public int Id { get; set; }

        public int? StoreId { get; set; }

        [Required]
        [MaxLength(255)]
        public string ShopDomain { get; set; } = string.Empty;

        /// <summary>
        /// リクエストタイプ: customer_redact, shop_redact, data_request
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string RequestType { get; set; } = string.Empty;

        /// <summary>
        /// ShopifyからのリクエストID
        /// </summary>
        [MaxLength(100)]
        public string? RequestId { get; set; }

        /// <summary>
        /// 顧客ID（顧客データ削除の場合）
        /// </summary>
        public long? CustomerId { get; set; }

        /// <summary>
        /// リクエスト受信日時
        /// </summary>
        public DateTime RequestedAt { get; set; }

        /// <summary>
        /// 処理完了日時
        /// </summary>
        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// 法的期限
        /// </summary>
        public DateTime DueDate { get; set; }

        /// <summary>
        /// 処理状態
        /// </summary>
        [MaxLength(50)]
        public string Status { get; set; } = "pending";

        /// <summary>
        /// 詳細情報（JSON形式）
        /// </summary>
        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// サブスクリプションプランエンティティ
    /// </summary>
    public class SubscriptionPlan
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Price { get; set; }

        /// <summary>
        /// 無料トライアル日数
        /// </summary>
        public int TrialDays { get; set; } = 7;

        /// <summary>
        /// 機能情報（JSON形式）
        /// </summary>
        public string? Features { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        public virtual ICollection<StoreSubscription> StoreSubscriptions { get; set; } = new List<StoreSubscription>();
    }

    /// <summary>
    /// ストアサブスクリプションエンティティ
    /// </summary>
    public class StoreSubscription
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        public int PlanId { get; set; }

        /// <summary>
        /// ShopifyのCharge ID
        /// </summary>
        public long? ShopifyChargeId { get; set; }

        /// <summary>
        /// 状態: pending, active, cancelled, expired
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "pending";

        /// <summary>
        /// トライアル終了日
        /// </summary>
        public DateTime? TrialEndsAt { get; set; }

        /// <summary>
        /// 現在の課金期間終了日
        /// </summary>
        public DateTime? CurrentPeriodEnd { get; set; }

        /// <summary>
        /// 課金開始日
        /// </summary>
        public DateTime? ActivatedAt { get; set; }

        /// <summary>
        /// キャンセル日
        /// </summary>
        public DateTime? CancelledAt { get; set; }

        /// <summary>
        /// Shopify確認URL
        /// </summary>
        [MaxLength(500)]
        public string? ConfirmationUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }

        [ForeignKey("PlanId")]
        public virtual SubscriptionPlan? Plan { get; set; }

        // 計算プロパティ
        [NotMapped]
        public bool IsInTrialPeriod => TrialEndsAt.HasValue && TrialEndsAt > DateTime.UtcNow && Status == "active";

        [NotMapped]
        public bool IsActive => Status == "active" && (CurrentPeriodEnd == null || CurrentPeriodEnd > DateTime.UtcNow);

        [NotMapped]
        public int? DaysLeftInTrial => TrialEndsAt.HasValue && TrialEndsAt > DateTime.UtcNow 
            ? (int)(TrialEndsAt.Value - DateTime.UtcNow).TotalDays 
            : null;
    }
}