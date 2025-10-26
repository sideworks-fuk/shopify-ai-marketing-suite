using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 認証サービスの実装
    /// Shopify OAuth認証とデモモード認証を提供
    /// </summary>
    public class AuthenticationService : IAuthenticationService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<AuthenticationService> _logger;
        private readonly ShopifyDbContext _dbContext;
        private readonly IDemoAuthService _demoAuthService;

        public AuthenticationService(
            IConfiguration config,
            ILogger<AuthenticationService> logger,
            ShopifyDbContext dbContext,
            IDemoAuthService demoAuthService)
        {
            _config = config;
            _logger = logger;
            _dbContext = dbContext;
            _demoAuthService = demoAuthService;
        }

        /// <summary>
        /// Shopify App Bridgeセッショントークンを検証
        /// </summary>
        public async Task<AuthenticationResult> ValidateShopifySessionTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var apiSecret = _config["Shopify:ApiSecret"];

                if (string.IsNullOrEmpty(apiSecret))
                {
                    _logger.LogError("Shopify API Secret is not configured");
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Configuration error"
                    };
                }

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(apiSecret)),
                    ValidateIssuer = true,
                    ValidIssuer = "https://shopify.com",
                    ValidateAudience = true,
                    ValidAudience = _config["Shopify:ApiKey"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5)
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

                // トークンからストア情報を取得
                var shopDomainClaim = principal.FindFirst("dest")?.Value;
                var userId = principal.FindFirst("sub")?.Value;

                if (string.IsNullOrEmpty(shopDomainClaim))
                {
                    _logger.LogWarning("Shop domain not found in token");
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid token: shop domain not found"
                    };
                }

                // dest claimの正規化（https://プレフィックスを削除）
                var normalizedDomain = NormalizeShopDomain(shopDomainClaim);
                _logger.LogDebug("Original dest claim: {Original}, Normalized: {Normalized}", 
                    shopDomainClaim, normalizedDomain);

                // データベースからストア情報を取得
                var store = await _dbContext.Stores
                    .FirstOrDefaultAsync(s => s.Domain == normalizedDomain);

                if (store == null)
                {
                    _logger.LogWarning("Store not found for domain: {Domain} (normalized from: {Original})", 
                        normalizedDomain, shopDomainClaim);
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Store not found"
                    };
                }

                _logger.LogInformation(
                    "Shopify session token validated successfully. Store: {StoreId}, Domain: {Domain}",
                    store.Id,
                    normalizedDomain);

                return new AuthenticationResult
                {
                    IsValid = true,
                    UserId = userId,
                    StoreId = store.Id,
                    AuthMode = "oauth",
                    IsReadOnly = false
                };
            }
            catch (SecurityTokenExpiredException ex)
            {
                _logger.LogWarning(ex, "Token has expired");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token expired"
                };
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Invalid token");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Invalid token"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating Shopify session token");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Authentication error"
                };
            }
        }

        /// <summary>
        /// デモモードトークンを検証
        /// DemoAuthServiceを使用してセッション検証を実施
        /// </summary>
        public async Task<AuthenticationResult> ValidateDemoTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtSecret = _config["Authentication:JwtSecret"];

                if (string.IsNullOrEmpty(jwtSecret))
                {
                    _logger.LogError("JWT Secret is not configured");
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Configuration error"
                    };
                }

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecret)),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5)
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

                // トークンからセッション情報を取得
                var sessionId = principal.FindFirst("session_id")?.Value;
                var authMode = principal.FindFirst("auth_mode")?.Value;

                if (authMode != "demo")
                {
                    _logger.LogWarning("Token is not a demo token");
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid demo token"
                    };
                }

                if (string.IsNullOrEmpty(sessionId))
                {
                    _logger.LogWarning("Session ID not found in demo token");
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid demo token"
                    };
                }

                // DemoAuthServiceを使用してセッション検証
                var session = await _demoAuthService.ValidateSessionAsync(sessionId);

                if (session == null)
                {
                    _logger.LogWarning("Demo session not found or expired: {SessionId}", sessionId);
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Session not found or expired"
                    };
                }

                // セッションの最終アクセス時刻を更新
                await _demoAuthService.UpdateSessionAccessAsync(sessionId);

                _logger.LogInformation(
                    "Demo token validated successfully. SessionId: {SessionId}",
                    sessionId);

                return new AuthenticationResult
                {
                    IsValid = true,
                    UserId = sessionId,
                    AuthMode = "demo",
                    IsReadOnly = true
                };
            }
            catch (SecurityTokenExpiredException ex)
            {
                _logger.LogWarning(ex, "Demo token has expired");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token expired"
                };
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Invalid demo token");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Invalid token"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating demo token");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Authentication error"
                };
            }
        }

        /// <summary>
        /// 認証ログを記録
        /// </summary>
        public async Task LogAuthenticationAttemptAsync(
            string? userId,
            string authMode,
            bool success,
            string? failureReason,
            string? ipAddress,
            string? userAgent)
        {
            try
            {
                var log = new AuthenticationLog
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
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
                    "Authentication attempt logged. Mode: {AuthMode}, Success: {Success}, User: {UserId}",
                    authMode,
                    success,
                    userId ?? "unknown");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error logging authentication attempt");
                // ログ記録失敗は認証処理を停止しない
            }
        }

        /// <summary>
        /// Shopifyドメインを正規化する
        /// dest claimからhttps://プレフィックスを削除し、ドメインのみを抽出
        /// </summary>
        /// <param name="destClaim">dest claimの値</param>
        /// <returns>正規化されたドメイン</returns>
        private static string NormalizeShopDomain(string destClaim)
        {
            if (string.IsNullOrEmpty(destClaim))
                return destClaim;

            // https://プレフィックスを削除
            if (destClaim.StartsWith("https://"))
            {
                return destClaim.Substring("https://".Length);
            }

            // http://プレフィックスを削除（念のため）
            if (destClaim.StartsWith("http://"))
            {
                return destClaim.Substring("http://".Length);
            }

            return destClaim;
        }
    }
}

