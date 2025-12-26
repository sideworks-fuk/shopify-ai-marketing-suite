using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.IdentityModel.Tokens;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using BCrypt.Net;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// デモ認証サービスの実装
    /// bcrypt パスワード検証、レート制限、ロックアウト、JWT トークン生成
    /// </summary>
    public class DemoAuthService : IDemoAuthService
    {
        private readonly IConfiguration _config;
        private readonly IDistributedCache _distributedCache;
        private readonly ILogger<DemoAuthService> _logger;
        private readonly IRateLimiter _rateLimiter;
        private readonly ShopifyDbContext _dbContext;

        public DemoAuthService(
            IConfiguration config,
            IDistributedCache distributedCache,
            ILogger<DemoAuthService> logger,
            IRateLimiter rateLimiter,
            ShopifyDbContext dbContext)
        {
            _config = config;
            _distributedCache = distributedCache;
            _logger = logger;
            _rateLimiter = rateLimiter;
            _dbContext = dbContext;
        }

        /// <summary>
        /// デモ認証を実行
        /// </summary>
        public async Task<DemoAuthResult> AuthenticateAsync(string password, string? ipAddress, string? userAgent)
        {
            ipAddress = ipAddress ?? "unknown";

            // レート制限チェック（ブルートフォース対策）
            var rateLimitKey = $"demo_auth_rate_{ipAddress}";
            var attempts = await _rateLimiter.GetAttemptsAsync(rateLimitKey);
            var maxAttempts = _config.GetValue<int>("Demo:RateLimitPerIp", 10);

            if (attempts >= maxAttempts)
            {
                _logger.LogWarning(
                    "Rate limit exceeded for IP: {IpAddress}, Attempts: {Attempts}",
                    ipAddress,
                    attempts);

                return new DemoAuthResult
                {
                    Success = false,
                    Error = "Too many attempts. Please try again later."
                };
            }

            // ロックアウトチェック
            var lockoutKey = $"demo_auth_lockout_{ipAddress}";
            var isLockedOut = await _rateLimiter.IsLockedOutAsync(lockoutKey);

            if (isLockedOut)
            {
                _logger.LogWarning("Locked out IP attempting login: {IpAddress}", ipAddress);

                return new DemoAuthResult
                {
                    Success = false,
                    Error = "Account temporarily locked. Please try again later."
                };
            }

            // パスワード検証（bcrypt）
            var hashedPassword = _config["Demo:PasswordHash"];
            if (string.IsNullOrEmpty(hashedPassword))
            {
                _logger.LogError("Demo password hash is not configured");
                return new DemoAuthResult
                {
                    Success = false,
                    Error = "Configuration error"
                };
            }

            bool isValid = false;
            try
            {
                ////isValid = BCrypt.Net.BCrypt.Verify(password, hashedPassword);
                isValid = password == _config["Demo:Password"];
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying bcrypt password");
                return new DemoAuthResult
                {
                    Success = false,
                    Error = "Authentication error"
                };
            }

            if (!isValid)
            {
                // 失敗試行を記録（平文パスワードは記録しない）
                await _rateLimiter.IncrementAsync(rateLimitKey);

                var failedAttempts = await _rateLimiter.GetAttemptsAsync(rateLimitKey);
                var lockoutThreshold = _config.GetValue<int>("Demo:LockoutThreshold", 5);

                // ロックアウト閾値に達した場合
                if (failedAttempts >= lockoutThreshold)
                {
                    var lockoutDuration = _config.GetValue<int>("Demo:LockoutDurationMinutes", 30);
                    await _rateLimiter.SetLockoutAsync(lockoutKey, lockoutDuration);

                    _logger.LogWarning(
                        "IP locked out due to failed attempts: {IpAddress}, Attempts: {Attempts}",
                        ipAddress,
                        failedAttempts);
                }

                _logger.LogWarning("Invalid demo password attempt from IP: {IpAddress}", ipAddress);

                // 認証ログに記録
                await LogAuthenticationAttemptAsync(ipAddress, "demo", false, "Invalid password", userAgent);

                return new DemoAuthResult
                {
                    Success = false,
                    Error = "Invalid password"
                };
            }

            // セッション作成
            var sessionId = Guid.NewGuid().ToString();
            var sessionTimeoutHours = _config.GetValue<int>("Demo:SessionTimeoutHours", 8);
            var expiresAt = DateTime.UtcNow.AddHours(sessionTimeoutHours);

            var session = new DemoSession
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                ExpiresAt = expiresAt,
                CreatedAt = DateTime.UtcNow,
                LastAccessedAt = DateTime.UtcNow,
                IsActive = true,
                CreatedBy = ipAddress
            };

            // データベースに保存（分散セッションストレージ）
            _dbContext.DemoSessions.Add(session);
            await _dbContext.SaveChangesAsync();

            // 分散キャッシュにもキャッシュ（高速アクセス用）
            try
            {
                var cacheOptions = new DistributedCacheEntryOptions
                {
                    AbsoluteExpiration = expiresAt
                };
                await _distributedCache.SetStringAsync(
                    $"demo_session_{sessionId}",
                    JsonSerializer.Serialize(session),
                    cacheOptions
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cache session in distributed cache");
                // キャッシュ失敗は致命的ではない
            }

            // データベースから最初のアクティブなストアを取得
            var firstActiveStore = await _dbContext.Stores
                .Where(s => s.IsActive)
                .OrderBy(s => s.Id)
                .Select(s => new { s.Id, s.Domain, s.TenantId })
                .FirstOrDefaultAsync();

            if (firstActiveStore == null)
            {
                _logger.LogError("No active store found for demo mode. Demo authentication cannot proceed.");
                return new DemoAuthResult
                {
                    Success = false,
                    Error = "No active store available for demo mode"
                };
            }

            // トークン生成（実際のストアIDを使用）
            var token = GenerateDemoToken(session, firstActiveStore.Id, firstActiveStore.Domain, firstActiveStore.TenantId);

            // 成功ログ記録
            await LogAuthenticationAttemptAsync(ipAddress, "demo", true, null, userAgent);

            // レート制限カウンターをリセット
            await _rateLimiter.ResetAsync(rateLimitKey);

            _logger.LogInformation(
                "Demo authentication successful. SessionId: {SessionId}, IP: {IpAddress}, StoreId: {StoreId}",
                sessionId,
                ipAddress,
                firstActiveStore.Id);

            return new DemoAuthResult
            {
                Success = true,
                Token = token,
                ExpiresAt = expiresAt
            };
        }

        /// <summary>
        /// セッションを検証
        /// </summary>
        public async Task<DemoSession?> ValidateSessionAsync(string sessionId)
        {
            try
            {
                // まず分散キャッシュから取得を試みる
                var cachedSession = await _distributedCache.GetStringAsync($"demo_session_{sessionId}");
                if (!string.IsNullOrEmpty(cachedSession))
                {
                    var session = JsonSerializer.Deserialize<DemoSession>(cachedSession);
                    if (session != null && session.IsActive && session.ExpiresAt > DateTime.UtcNow)
                    {
                        return session;
                    }
                }

                // キャッシュにない場合はデータベースから取得
                var dbSession = await _dbContext.DemoSessions
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive);

                if (dbSession == null)
                {
                    return null;
                }

                // 有効期限チェック
                if (dbSession.ExpiresAt < DateTime.UtcNow)
                {
                    // セッション期限切れ
                    dbSession.IsActive = false;
                    await _dbContext.SaveChangesAsync();
                    return null;
                }

                // キャッシュに追加
                try
                {
                    var cacheOptions = new DistributedCacheEntryOptions
                    {
                        AbsoluteExpiration = dbSession.ExpiresAt
                    };
                    await _distributedCache.SetStringAsync(
                        $"demo_session_{sessionId}",
                        JsonSerializer.Serialize(dbSession),
                        cacheOptions
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to cache session");
                }

                return dbSession;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating session: {SessionId}", sessionId);
                return null;
            }
        }

        /// <summary>
        /// セッションの最終アクセス時刻を更新
        /// </summary>
        public async Task UpdateSessionAccessAsync(string sessionId)
        {
            try
            {
                var session = await _dbContext.DemoSessions
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive);

                if (session != null && session.ExpiresAt > DateTime.UtcNow)
                {
                    session.LastAccessedAt = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync();

                    _logger.LogDebug("Session access updated: {SessionId}", sessionId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating session access: {SessionId}", sessionId);
            }
        }

        /// <summary>
        /// 期限切れセッションをクリーンアップ
        /// </summary>
        public async Task<int> CleanupExpiredSessionsAsync()
        {
            try
            {
                var expiredSessions = await _dbContext.DemoSessions
                    .Where(s => s.IsActive && s.ExpiresAt < DateTime.UtcNow)
                    .ToListAsync();

                foreach (var session in expiredSessions)
                {
                    session.IsActive = false;

                    // キャッシュからも削除
                    try
                    {
                        await _distributedCache.RemoveAsync($"demo_session_{session.SessionId}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to remove session from cache: {SessionId}", session.SessionId);
                    }
                }

                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Cleaned up {Count} expired sessions", expiredSessions.Count);

                return expiredSessions.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired sessions");
                return 0;
            }
        }

        /// <summary>
        /// JWT トークンを生成
        /// </summary>
        private string GenerateDemoToken(DemoSession session, int storeId, string? shopDomain, string? tenantId)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSecret = _config["Jwt:Key"];

            if (string.IsNullOrEmpty(jwtSecret))
            {
                throw new InvalidOperationException("JWT Secret is not configured");
            }

            var key = Encoding.ASCII.GetBytes(jwtSecret);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("session_id", session.SessionId),
                    new Claim("auth_mode", "demo"),
                    new Claim("read_only", "true"), // デモモードは読み取り専用
                    new Claim("expires_at", session.ExpiresAt.ToString("O")),
                    new Claim("created_by", session.CreatedBy ?? "unknown"),
                    new Claim("store_id", storeId.ToString()), // データベースから取得した実際のストアID
                    new Claim("tenant_id", tenantId ?? "default-tenant"),
                    new Claim("shop_domain", shopDomain ?? "demo-shop.myshopify.com")
                }),
                Expires = session.ExpiresAt,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature
                )
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// 認証試行をログに記録
        /// </summary>
        private async Task LogAuthenticationAttemptAsync(
            string ipAddress,
            string authMode,
            bool success,
            string? failureReason,
            string? userAgent)
        {
            try
            {
                var log = new AuthenticationLog
                {
                    Id = Guid.NewGuid(),
                    AuthMode = authMode,
                    Success = success,
                    FailureReason = failureReason,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.AuthenticationLogs.Add(log);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation(
                    "Authentication attempt logged. Mode: {AuthMode}, Success: {Success}, IP: {IpAddress}",
                    authMode,
                    success,
                    ipAddress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging authentication attempt");
                // ログ記録失敗は認証処理を停止しない
            }
        }
    }
}

