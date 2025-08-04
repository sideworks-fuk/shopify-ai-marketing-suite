using System.ComponentModel.DataAnnotations;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// テナント（顧客企業）エンティティ
    /// マルチテナント対応用
    /// </summary>
    public class Tenant
    {
        /// <summary>
        /// テナントを一意に識別するID（URLセーフ）
        /// プライマリキーとして使用
        /// </summary>
        [Key]
        [Required]
        [StringLength(100)]
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// 会社名
        /// </summary>
        [Required]
        [StringLength(255)]
        public string CompanyName { get; set; } = string.Empty;

        /// <summary>
        /// 連絡先メールアドレス
        /// </summary>
        [Required]
        [StringLength(255)]
        [EmailAddress]
        public string ContactEmail { get; set; } = string.Empty;

        /// <summary>
        /// 作成日時
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// 更新日時
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// ステータス（active, suspended, cancelled）
        /// </summary>
        [StringLength(50)]
        public string Status { get; set; } = "active";

        // ナビゲーションプロパティ
        public virtual ICollection<Store> Stores { get; set; } = new List<Store>();
    }
}