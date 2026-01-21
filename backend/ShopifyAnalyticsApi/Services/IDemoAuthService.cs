using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// デモ認証サービスのインターフェース
    /// </summary>
    public interface IDemoAuthService
    {
        /// <summary>
        /// デモ認証を実行（ストアドメイン必須、DataType制限対応）
        /// </summary>
        /// <param name="password">パスワード</param>
        /// <param name="shopDomain">ストアドメイン（必須）</param>
        /// <param name="ipAddress">IPアドレス</param>
        /// <param name="userAgent">User-Agent</param>
        /// <returns>認証結果</returns>
        Task<DemoAuthResult> AuthenticateAsync(string password, string shopDomain, string? ipAddress, string? userAgent);

        /// <summary>
        /// セッションを検証
        /// </summary>
        /// <param name="sessionId">セッションID</param>
        /// <returns>検証結果</returns>
        Task<DemoSession?> ValidateSessionAsync(string sessionId);

        /// <summary>
        /// セッションを更新
        /// </summary>
        /// <param name="sessionId">セッションID</param>
        /// <returns></returns>
        Task UpdateSessionAccessAsync(string sessionId);

        /// <summary>
        /// 期限切れセッションをクリーンアップ
        /// </summary>
        /// <returns>クリーンアップされたセッション数</returns>
        Task<int> CleanupExpiredSessionsAsync();
    }
}

