using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// デモセッション管理モデル
    /// デモモード認証のセッション情報を管理
    /// </summary>
    [Table("DemoSessions")]
    public class DemoSession
    {
        /// <summary>
        /// セッションID（主キー）
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// セッション識別子（ユニーク）
        /// </summary>
        [Required]
        [MaxLength(255)]
        public string SessionId { get; set; } = string.Empty;

        /// <summary>
        /// セッション作成日時（UTC）
        /// </summary>
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// セッション有効期限（UTC）
        /// </summary>
        [Required]
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// 最終アクセス日時（UTC）
        /// </summary>
        [Required]
        public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// セッション有効フラグ
        /// </summary>
        [Required]
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// セッション作成者（IPアドレス等）
        /// </summary>
        [MaxLength(255)]
        public string? CreatedBy { get; set; }
    }

    /// <summary>
    /// 認証ログモデル
    /// すべての認証試行を記録（セキュリティ監査用）
    /// </summary>
    [Table("AuthenticationLogs")]
    public class AuthenticationLog
    {
        /// <summary>
        /// ログID（主キー）
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// ユーザーID（該当する場合）
        /// </summary>
        [MaxLength(255)]
        public string? UserId { get; set; }

        /// <summary>
        /// 認証モード（'oauth', 'demo', 'dev'）
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string AuthMode { get; set; } = string.Empty;

        /// <summary>
        /// 認証成功フラグ
        /// </summary>
        [Required]
        public bool Success { get; set; }

        /// <summary>
        /// 失敗理由（失敗時のみ）
        /// </summary>
        [MaxLength(255)]
        public string? FailureReason { get; set; }

        /// <summary>
        /// IPアドレス
        /// </summary>
        [MaxLength(45)]
        public string? IpAddress { get; set; }

        /// <summary>
        /// User-Agentヘッダー
        /// </summary>
        [MaxLength(500)]
        public string? UserAgent { get; set; }

        /// <summary>
        /// ログ記録日時（UTC）
        /// </summary>
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// デモ認証結果モデル（DTO）
    /// </summary>
    public class DemoAuthResult
    {
        /// <summary>
        /// 認証成功フラグ
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// 認証トークン（成功時）
        /// </summary>
        public string? Token { get; set; }

        /// <summary>
        /// トークン有効期限（成功時）
        /// </summary>
        public DateTime? ExpiresAt { get; set; }

        /// <summary>
        /// エラーメッセージ（失敗時）
        /// </summary>
        public string? Error { get; set; }
    }
}

