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
    /// 開発者認証サービスの実装
    /// bcrypt パスワード検証、レート制限、ロックアウト、JWT トークン生成
    /// Level 1: 開発者モード（開発環境のみ）
    /// </summary>
    public class DeveloperAuthService : IDeveloperAuthService
    {
        private readonly IConfiguration _config;
        private readonly IDistributedCache _distributedCache;
        private readonly ILogger<DeveloperAuthService> _logger;
        private readonly IRateLimiter _rateLimiter;
        private readonly ShopifyDbContext _dbContext;
        private readonly IHostEnvironment _env;

        public DeveloperAuthService(
            IConfiguration config,
            IDistributedCache distributedCache,
            ILogger<DeveloperAuthService> logger,
            IRateLimiter rateLimiter,
            ShopifyDbContext dbContext,
            IHostEnvironment env)
        {
            _config = config;
            _distributedCache = distributedCache;
            _logger = logger;
            _rateLimiter = rateLimiter;
            _dbContext = dbContext;
            _env = env;
        }

        /// <summary>
        /// 開発者認証を実行
        /// </summary>
        public async Task<DeveloperAuthResult> AuthenticateAsync(string password, string? ipAddress, string? userAgent)
        {
            ipAddress = ipAddress ?? "unknown";

            // 開発環境チェック
            if (_env.EnvironmentName != "Development")
            {
                _logger.LogWarning("Developer mode authentication attempted in non-development environment: {Environment}", _env.EnvironmentName);
                return new DeveloperAuthResult
                {
                    Success = false,
                    Error = "Developer mode is only available in development environment."
                };
            }

            // 開発者モード有効チェック
            var developerEnabled = _config.GetValue<bool>("Developer:Enabled", false);
            if (!developerEnabled)
            {
                _logger.LogWarning("Developer mode is disabled in configuration");
                return new DeveloperAuthResult
                {
                    Success = false,
                    Error = "Developer mode is not enabled."
                };
            }

            // レート制限チェック（ブルートフォース対策）
            var rateLimitKey = $"developer_auth_rate_{ipAddress}";
            var attempts = await _rateLimiter.GetAttemptsAsync(rateLimitKey);
            var maxAttempts = _config.GetValue<int>("Developer:RateLimitPerIp", 10);

            if (attempts >= maxAttempts)
            {
                _logger.LogWarning(
                    "Developer auth rate limit exceeded for IP: {IpAddress}, Attempts: {Attempts}",
                    ipAddress,
                    attempts);

                return new DeveloperAuthResult
                {
                    Success = false,
                    Error = "Too many attempts. Please try again later."
                };
            }

            // ロックアウトチェック
            var lockoutKey = $"developer_auth_lockout_{ipAddress}";
            var isLockedOut = await _rateLimiter.IsLockedOutAsync(lockoutKey);

            if (isLockedOut)
            {
                _logger.LogWarning("Locked out IP attempting developer login: {IpAddress}", ipAddress);

                return new DeveloperAuthResult
                {
                    Success = false,
                    Error = "Account temporarily locked. Please try again later."
                };
            }

            // パスワード検証（bcrypt）
            var hashedPassword = _config["Developer:PasswordHash"];
            if (string.IsNullOrEmpty(hashedPassword))
            {
                _logger.LogError("Developer password hash is not configured");
                return new DeveloperAuthResult
                {
                    Success = false,
                    Error = "Configuration error"
                };
            }

            bool isValid = false;
            try
            {
                isValid = BCrypt.Net.BCrypt.Verify(password, hashedPassword);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying bcrypt password for developer mode");
                return new DeveloperAuthResult
                {
                    Success = false,
                    Error = "Authentication error"
                };
            }

            // 認証失敗時の処理
            if (!isValid)
            {
                // レート制限カウンター増加
                await _rateLimiter.IncrementAsync(rateLimitKey, 15);

                // 失敗試行を記録
                var failureKey = $"developer_auth_failures_{ipAddress}";
                var failures = await _rateLimiter.GetAttemptsAsync(failureKey);
                await _rateLimiter.IncrementAsync(failureKey, 60);

                // ロックアウト閾値チェック
                var lockoutThreshold = _config.GetValue<int>("Developer:LockoutThreshold", 5);
                if (failures + 1 >= lockoutThreshold)
                {
                    var lockoutDuration = _config.GetValue<int>("Developer:LockoutDurationMinutes", 30);
                    await _rateLimiter.SetLockoutAsync(lockoutKey, lockoutDuration);

                    _logger.LogWarning(
                        "IP locked out due to repeated failures. IP: {IpAddress}, Failures: {Failures}",
                        ipAddress,
                        failures + 1);

                    return new DeveloperAuthResult
                    {
                        Success = false,
                        Error = "Too many failed attempts. Account locked for 30 minutes."
                    };
                }

                _logger.LogWarning(
                    "Developer authentication failed. IP: {IpAddress}, Failures: {Failures}",
                    ipAddress,
                    failures + 1);

                return new DeveloperAuthResult
                {
                    Success = false,
                    Error = "Invalid password"
                };
            }

            // 認証成功: カウンターリセット
            await _rateLimiter.ResetAsync(rateLimitKey);
            await _rateLimiter.ResetAsync($"developer_auth_failures_{ipAddress}");

            // JWT トークン生成
            var token = GenerateDeveloperToken();
            var expiresAt = DateTime.UtcNow.AddHours(_config.GetValue<int>("Developer:SessionTimeoutHours", 8));

            // セッション情報をキャッシュに保存
            var sessionData = new
            {
                UserId = "developer",
                AuthMode = "developer",
                ReadOnly = false,
                CanAccessDevTools = true,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            var cacheKey = $"developer_session_{token}";
            var sessionJson = JsonSerializer.Serialize(sessionData);
            await _distributedCache.SetStringAsync(
                cacheKey,
                sessionJson,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpiration = expiresAt
                });

            _logger.LogInformation(
                "Developer authentication successful. IP: {IpAddress}",
                ipAddress);

            // 認証ログをDBに記録
            await LogAuthenticationAttemptAsync("developer", "developer", true, null, ipAddress, userAgent);

            return new DeveloperAuthResult
            {
                Success = true,
                Token = token,
                ExpiresAt = expiresAt
            };
        }

        /// <summary>
        /// 開発者トークンを検証
        /// </summary>
        public async Task<AuthenticationResult> ValidateDeveloperTokenAsync(string token)
        {
            try
            {
                var cacheKey = $"developer_session_{token}";
                var sessionJson = await _distributedCache.GetStringAsync(cacheKey);

                if (string.IsNullOrEmpty(sessionJson))
                {
                    _logger.LogDebug("Developer session not found or expired: {TokenPrefix}", token.Substring(0, Math.Min(8, token.Length)));
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Session not found or expired"
                    };
                }

                var sessionData = JsonSerializer.Deserialize<Dictionary<string, object>>(sessionJson);
                if (sessionData == null)
                {
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid session data"
                    };
                }

                return new AuthenticationResult
                {
                    IsValid = true,
                    UserId = "developer",
                    AuthMode = "developer",
                    IsReadOnly = false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating developer token");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token validation error"
                };
            }
        }

        /// <summary>
        /// 開発者セッションを無効化（ログアウト）
        /// </summary>
        public async Task<bool> LogoutAsync(string token)
        {
            try
            {
                var cacheKey = $"developer_session_{token}";
                await _distributedCache.RemoveAsync(cacheKey);

                _logger.LogInformation("Developer session logged out successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging out developer session");
                return false;
            }
        }

        /// <summary>
        /// 開発者トークンを生成
        /// </summary>
        private string GenerateDeveloperToken()
        {
            var jwtSecret = _config["Jwt:Key"];
            if (string.IsNullOrEmpty(jwtSecret))
            {
                throw new InvalidOperationException("JWT Secret is not configured");
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, "developer"),
                new Claim("auth_mode", "developer"),
                new Claim("read_only", "false"),
                new Claim("can_access_dev_tools", "true"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
            };

            var expiryHours = _config.GetValue<int>("Developer:SessionTimeoutHours", 8);
            var token = new JwtSecurityToken(
                issuer: _config["Authentication:Issuer"] ?? "ec-ranger",
                audience: _config["Authentication:Audience"] ?? "developers",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(expiryHours),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        /// <summary>
        /// 認証試行をログに記録
        /// </summary>
        private async Task LogAuthenticationAttemptAsync(
            string? userId,
            string authMode,
            bool success,
            string? errorMessage,
            string? ipAddress,
            string? userAgent)
        {
            try
            {
                var log = new AuthenticationLog
                {
                    UserId = userId,
                    AuthMode = authMode,
                    Success = success,
                    FailureReason = errorMessage,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.AuthenticationLogs.Add(log);
                await _dbContext.SaveChangesAsync();

                _logger.LogDebug(
                    "Authentication attempt logged. Mode: {AuthMode}, Success: {Success}, IP: {IpAddress}",
                    authMode,
                    success,
                    ipAddress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging authentication attempt");
            }
        }
    }

    /// <summary>
    /// 開発者認証サービスのインターフェース
    /// </summary>
    public interface IDeveloperAuthService
    {
        Task<DeveloperAuthResult> AuthenticateAsync(string password, string? ipAddress, string? userAgent);
        Task<AuthenticationResult> ValidateDeveloperTokenAsync(string token);
        Task<bool> LogoutAsync(string token);
    }

    /// <summary>
    /// 開発者認証結果
    /// </summary>
    public class DeveloperAuthResult
    {
        public bool Success { get; set; }
        public string? Token { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? Error { get; set; }
    }
}

