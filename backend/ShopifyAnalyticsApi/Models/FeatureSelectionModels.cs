using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// 機能制限マスタ
    /// </summary>
    public class FeatureLimit
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string PlanType { get; set; } = string.Empty; // 'free' or 'paid'

        [Required]
        [MaxLength(100)]
        public string FeatureId { get; set; } = string.Empty; // 'dormant_analysis', 'yoy_comparison', 'purchase_frequency'

        public int? DailyLimit { get; set; } // NULLは無制限

        public int? MonthlyLimit { get; set; } // NULLは無制限

        public int ChangeCooldownDays { get; set; } = 30; // 機能変更のクールダウン期間（日数）

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// ユーザー機能選択
    /// </summary>
    public class UserFeatureSelection
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StoreId { get; set; }

        [MaxLength(100)]
        public string? SelectedFeatureId { get; set; } // NULLは未選択

        public DateTime? LastChangeDate { get; set; } // 最後に変更した日時（UTC）

        public DateTime? NextChangeAvailableDate { get; set; } // 次回変更可能日時（UTC）

        public bool IsActive { get; set; } = true; // 現在有効な選択かどうか

        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>(); // 楽観ロック用

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }

        // 計算プロパティ
        [NotMapped]
        public bool CanChangeToday => NextChangeAvailableDate == null || NextChangeAvailableDate <= DateTime.UtcNow;

        [NotMapped]
        public int? DaysUntilNextChange => NextChangeAvailableDate.HasValue && NextChangeAvailableDate > DateTime.UtcNow
            ? (int)(NextChangeAvailableDate.Value - DateTime.UtcNow).TotalDays
            : null;
    }

    /// <summary>
    /// 機能使用ログ
    /// </summary>
    public class FeatureUsageLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StoreId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FeatureId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string EventType { get; set; } = string.Empty; // 'change', 'access', 'limit_reached', 'plan_upgraded', 'plan_downgraded'

        [MaxLength(100)]
        public string? BeforeFeatureId { get; set; } // 変更前の機能ID（変更イベントの場合）

        [MaxLength(100)]
        public string? AfterFeatureId { get; set; } // 変更後の機能ID（変更イベントの場合）

        [Required]
        [MaxLength(50)]
        public string Result { get; set; } = string.Empty; // 'success', 'limited', 'error'

        [MaxLength(500)]
        public string? ErrorMessage { get; set; }

        [MaxLength(50)]
        public string? IpAddress { get; set; }

        [MaxLength(500)]
        public string? UserAgent { get; set; }

        [MaxLength(255)]
        public string? IdempotencyToken { get; set; } // 冪等性トークン

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// 機能選択変更履歴
    /// </summary>
    public class FeatureSelectionChangeHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StoreId { get; set; }

        [MaxLength(100)]
        public string? BeforeFeatureId { get; set; }

        [MaxLength(100)]
        public string? AfterFeatureId { get; set; }

        [MaxLength(500)]
        public string? ChangeReason { get; set; } // 'user_requested', 'plan_downgraded', 'admin_override'

        [MaxLength(255)]
        public string? ChangedBy { get; set; } // ユーザーIDまたはシステム

        [MaxLength(255)]
        public string? IdempotencyToken { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ナビゲーションプロパティ
        [ForeignKey("StoreId")]
        public virtual Store? Store { get; set; }
    }

    /// <summary>
    /// 機能選択リクエスト
    /// </summary>
    public class SelectFeatureRequest
    {
        [Required]
        [MaxLength(100)]
        public string FeatureId { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Reason { get; set; }
    }

    /// <summary>
    /// 現在の選択状態レスポンス
    /// </summary>
    public class CurrentSelectionResponse
    {
        public string? SelectedFeature { get; set; } // 'dormant_analysis' | 'yoy_comparison' | 'purchase_frequency' | null

        public bool CanChangeToday { get; set; }

        public DateTime NextChangeAvailableDate { get; set; } // UTC

        public UsageLimit UsageLimit { get; set; } = new UsageLimit();

        public string PlanType { get; set; } = "free"; // 'free' or 'paid'

        public List<string> AvailableFeatures { get; set; } = new List<string>();
    }

    /// <summary>
    /// 使用制限情報
    /// </summary>
    public class UsageLimit
    {
        public int Remaining { get; set; }

        public int Total { get; set; }

        public string Period { get; set; } = "daily"; // 'daily' or 'monthly'
    }

    /// <summary>
    /// 利用可能な機能情報
    /// </summary>
    public class AvailableFeature
    {
        [Required]
        public string FeatureId { get; set; } = string.Empty;

        [Required]
        public string DisplayName { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool IsSelected { get; set; }

        public bool IsAccessible { get; set; }

        public string? IconName { get; set; }

        public int? SortOrder { get; set; }
    }

    /// <summary>
    /// 機能使用状況レスポンス
    /// </summary>
    public class FeatureUsageResponse
    {
        public string FeatureId { get; set; } = string.Empty;

        public int TodayUsageCount { get; set; }

        public int MonthlyUsageCount { get; set; }

        public int? DailyLimit { get; set; }

        public int? MonthlyLimit { get; set; }

        public DateTime? LastUsedAt { get; set; }

        public List<UsageHistoryItem> RecentUsage { get; set; } = new List<UsageHistoryItem>();
    }

    /// <summary>
    /// 使用履歴項目
    /// </summary>
    public class UsageHistoryItem
    {
        public DateTime UsedAt { get; set; }

        public string EventType { get; set; } = string.Empty;

        public string Result { get; set; } = string.Empty;
    }

    /// <summary>
    /// 機能アクセス権限チェック結果
    /// </summary>
    public class FeatureAccessResult
    {
        public bool IsAllowed { get; set; }

        public string? DeniedReason { get; set; } // 'not_selected', 'limit_reached', 'plan_required'

        public string? RequiredPlan { get; set; }

        public string? Message { get; set; }
    }

    /// <summary>
    /// 機能定義（定数）
    /// </summary>
    public static class FeatureConstants
    {
        public const string DormantAnalysis = "dormant_analysis";
        public const string YoyComparison = "yoy_comparison";
        public const string PurchaseFrequency = "purchase_frequency";

        public static readonly Dictionary<string, string> FeatureDisplayNames = new()
        {
            { DormantAnalysis, "休眠顧客分析" },
            { YoyComparison, "前年同月比分析" },
            { PurchaseFrequency, "購入回数詳細分析" }
        };

        public static readonly Dictionary<string, string> FeatureDescriptions = new()
        {
            { DormantAnalysis, "一定期間購入のない顧客を特定し、再活性化の施策を立案できます" },
            { YoyComparison, "売上や顧客数を前年同月と比較し、成長率を把握できます" },
            { PurchaseFrequency, "顧客の購入頻度を詳細に分析し、優良顧客を特定できます" }
        };

        public static readonly List<string> FreeSelectableFeatures = new()
        {
            DormantAnalysis,
            YoyComparison,
            PurchaseFrequency
        };

        public static bool IsValidFeature(string featureId)
        {
            return FreeSelectableFeatures.Contains(featureId);
        }
    }

    /// <summary>
    /// プラン種別（定数）
    /// </summary>
    public static class PlanTypes
    {
        public const string Free = "free";
        public const string Basic = "basic";
        public const string Professional = "professional";

        public static bool IsPaidPlan(string planType)
        {
            return planType != Free;
        }
    }
}