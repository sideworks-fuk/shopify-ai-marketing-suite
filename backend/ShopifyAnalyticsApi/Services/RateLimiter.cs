using Microsoft.Extensions.Caching.Distributed;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// レート制限サービスの実装
    /// 分散キャッシュを使用してブルートフォース攻撃を防止
    /// </summary>
    public class RateLimiter : IRateLimiter
    {
        private readonly IDistributedCache _distributedCache;
        private readonly ILogger<RateLimiter> _logger;

        public RateLimiter(
            IDistributedCache distributedCache,
            ILogger<RateLimiter> logger)
        {
            _distributedCache = distributedCache;
            _logger = logger;
        }

        /// <summary>
        /// 試行回数を取得
        /// </summary>
        public async Task<int> GetAttemptsAsync(string key)
        {
            try
            {
                var value = await _distributedCache.GetStringAsync(key);
                if (string.IsNullOrEmpty(value))
                {
                    return 0;
                }

                return int.TryParse(value, out var attempts) ? attempts : 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting rate limit attempts for key: {Key}", key);
                return 0;
            }
        }

        /// <summary>
        /// 試行回数をインクリメント
        /// </summary>
        public async Task IncrementAsync(string key, int windowMinutes = 60)
        {
            try
            {
                var currentAttempts = await GetAttemptsAsync(key);
                var newAttempts = currentAttempts + 1;

                var options = new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(windowMinutes)
                };

                await _distributedCache.SetStringAsync(key, newAttempts.ToString(), options);

                _logger.LogInformation(
                    "Rate limit incremented for key: {Key}, Attempts: {Attempts}",
                    key,
                    newAttempts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error incrementing rate limit for key: {Key}", key);
            }
        }

        /// <summary>
        /// 試行回数をリセット
        /// </summary>
        public async Task ResetAsync(string key)
        {
            try
            {
                await _distributedCache.RemoveAsync(key);

                _logger.LogInformation("Rate limit reset for key: {Key}", key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting rate limit for key: {Key}", key);
            }
        }

        /// <summary>
        /// ロックアウト状態をチェック
        /// </summary>
        public async Task<bool> IsLockedOutAsync(string key)
        {
            try
            {
                var value = await _distributedCache.GetStringAsync(key);
                var isLockedOut = !string.IsNullOrEmpty(value);

                if (isLockedOut)
                {
                    _logger.LogWarning("Lockout detected for key: {Key}", key);
                }

                return isLockedOut;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking lockout for key: {Key}", key);
                return false;
            }
        }

        /// <summary>
        /// ロックアウトを設定
        /// </summary>
        public async Task SetLockoutAsync(string key, int durationMinutes)
        {
            try
            {
                var options = new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(durationMinutes)
                };

                await _distributedCache.SetStringAsync(key, "locked", options);

                _logger.LogWarning(
                    "Lockout set for key: {Key}, Duration: {Duration} minutes",
                    key,
                    durationMinutes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting lockout for key: {Key}", key);
            }
        }
    }
}

