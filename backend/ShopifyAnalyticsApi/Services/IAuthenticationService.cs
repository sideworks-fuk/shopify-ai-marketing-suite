using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 認証サービスのインターフェース
    /// Shopify OAuth認証とデモモード認証を統一的に扱う
    /// </summary>
    public interface IAuthenticationService
    {
        /// <summary>
        /// Shopify App Bridgeセッショントークンを検証
        /// </summary>
        /// <param name="token">検証するトークン</param>
        /// <returns>検証結果</returns>
        Task<AuthenticationResult> ValidateShopifySessionTokenAsync(string token);

        /// <summary>
        /// デモモードトークンを検証
        /// </summary>
        /// <param name="token">検証するトークン</param>
        /// <returns>検証結果</returns>
        Task<AuthenticationResult> ValidateDemoTokenAsync(string token);

        /// <summary>
        /// 認証ログを記録
        /// </summary>
        /// <param name="userId">ユーザーID</param>
        /// <param name="authMode">認証モード</param>
        /// <param name="success">成功フラグ</param>
        /// <param name="failureReason">失敗理由</param>
        /// <param name="ipAddress">IPアドレス</param>
        /// <param name="userAgent">User-Agent</param>
        Task LogAuthenticationAttemptAsync(
            string? userId,
            string authMode,
            bool success,
            string? failureReason,
            string? ipAddress,
            string? userAgent);
    }

    /// <summary>
    /// 認証結果
    /// </summary>
    public class AuthenticationResult
    {
        /// <summary>
        /// 認証成功フラグ
        /// </summary>
        public bool IsValid { get; set; }

        /// <summary>
        /// ユーザーID
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// ストアID
        /// </summary>
        public int? StoreId { get; set; }

        /// <summary>
        /// Shopifyストアドメイン
        /// </summary>
        public string? ShopDomain { get; set; }

        /// <summary>
        /// 認証モード
        /// </summary>
        public string AuthMode { get; set; } = string.Empty;

        /// <summary>
        /// 読み取り専用フラグ
        /// </summary>
        public bool IsReadOnly { get; set; }

        /// <summary>
        /// エラーメッセージ
        /// </summary>
        public string? ErrorMessage { get; set; }
    }
}

