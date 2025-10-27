namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// レート制限サービスのインターフェース
    /// ブルートフォース攻撃対策用
    /// </summary>
    public interface IRateLimiter
    {
        /// <summary>
        /// 試行回数を取得
        /// </summary>
        /// <param name="key">レート制限キー</param>
        /// <returns>試行回数</returns>
        Task<int> GetAttemptsAsync(string key);

        /// <summary>
        /// 試行回数をインクリメント
        /// </summary>
        /// <param name="key">レート制限キー</param>
        /// <param name="windowMinutes">時間窓（分）</param>
        /// <returns></returns>
        Task IncrementAsync(string key, int windowMinutes = 60);

        /// <summary>
        /// 試行回数をリセット
        /// </summary>
        /// <param name="key">レート制限キー</param>
        /// <returns></returns>
        Task ResetAsync(string key);

        /// <summary>
        /// ロックアウト状態をチェック
        /// </summary>
        /// <param name="key">ロックアウトキー</param>
        /// <returns>ロックアウト中かどうか</returns>
        Task<bool> IsLockedOutAsync(string key);

        /// <summary>
        /// ロックアウトを設定
        /// </summary>
        /// <param name="key">ロックアウトキー</param>
        /// <param name="durationMinutes">ロックアウト期間（分）</param>
        /// <returns></returns>
        Task SetLockoutAsync(string key, int durationMinutes);
    }
}

