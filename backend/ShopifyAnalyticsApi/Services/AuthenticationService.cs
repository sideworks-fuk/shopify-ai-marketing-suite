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

                // マルチアプリ対応:
                // Shopify session token の aud(=Client ID / ApiKey) に応じて ShopifyApps から ApiSecret を選択する
                // これを行わないと、Prod2で発行されたトークンをProd1のSecretで検証してしまい401になる
                string? audienceApiKey = null;
                try
                {
                    var jwt = tokenHandler.ReadJwtToken(token);
                    audienceApiKey = jwt.Audiences?.FirstOrDefault();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to read JWT (audience extraction). Falling back to configured Shopify:ApiKey");
                }

                if (string.IsNullOrEmpty(audienceApiKey))
                {
                    audienceApiKey = _config["Shopify:ApiKey"];
                }

                string? apiSecret = null;
                if (!string.IsNullOrEmpty(audienceApiKey))
                {
                    apiSecret = await _dbContext.ShopifyApps
                        .Where(a => a.ApiKey == audienceApiKey && a.IsActive)
                        .Select(a => a.ApiSecret)
                        .FirstOrDefaultAsync();

                    if (!string.IsNullOrEmpty(apiSecret))
                    {
                        _logger.LogInformation("Resolved Shopify ApiSecret from ShopifyApps by audience(ApiKey). ApiKey: {ApiKey}", audienceApiKey);
                    }
                }

                // フォールバック（単一アプリ構成/後方互換）
                apiSecret ??= _config["Shopify:ApiSecret"];

                if (string.IsNullOrEmpty(apiSecret))
                {
                    _logger.LogError("Shopify API Secret is not configured (neither ShopifyApps nor configuration). ApiKey: {ApiKey}", audienceApiKey ?? "null");
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
                    ValidateIssuer = true, // trueに変更
                    IssuerValidator = (issuer, token, parameters) =>
                    {
                        // Shopifyの正規のissuerのみを許可
                        if (string.IsNullOrEmpty(issuer))
                        {
                            throw new SecurityTokenInvalidIssuerException("Issuer is null or empty");
                        }

                        try
                        {
                            var uri = new Uri(issuer);
                            // Shopifyの正規ドメインをチェック
                            if (uri.Host.EndsWith(".myshopify.com") || uri.Host == "admin.shopify.com")
                            {
                                return issuer;
                            }
                            throw new SecurityTokenInvalidIssuerException($"Invalid issuer: {issuer}");
                        }
                        catch (UriFormatException)
                        {
                            throw new SecurityTokenInvalidIssuerException($"Invalid issuer format: {issuer}");
                        }
                    },
                    ValidateAudience = true,
                    ValidAudience = audienceApiKey,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5)
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

                // トークンからストア情報を取得（destクレーム、なければissクレームにフォールバック）
                var shopDomainClaim = principal.FindFirst("dest")?.Value;
                
                // destが存在しない場合、issクレームからドメインを抽出
                if (string.IsNullOrEmpty(shopDomainClaim))
                {
                    var issuerClaim = principal.FindFirst("iss")?.Value;
                    if (!string.IsNullOrEmpty(issuerClaim))
                    {
                        try
                        {
                            var issuerUri = new Uri(issuerClaim);
                            if (issuerUri.Host.EndsWith(".myshopify.com"))
                            {
                                shopDomainClaim = issuerUri.Host;
                                _logger.LogDebug("Using iss claim as fallback for shop domain: {Issuer} -> {Domain}", 
                                    issuerClaim, shopDomainClaim);
                            }
                        }
                        catch (UriFormatException)
                        {
                            _logger.LogWarning("Invalid iss claim format: {Issuer}", issuerClaim);
                        }
                    }
                }
                
                var userId = principal.FindFirst("sub")?.Value;

                if (string.IsNullOrEmpty(shopDomainClaim))
                {
                    _logger.LogWarning("Shop domain not found in token (neither dest nor iss)");
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

                // 正規化後のドメインを検証
                if (!normalizedDomain.EndsWith(".myshopify.com"))
                {
                    _logger.LogWarning("Invalid shop domain: {Domain}", normalizedDomain);
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid shop domain"
                    };
                }

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
                var jwtSecret = _config["Jwt:Key"];

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

                SecurityToken validatedToken;
                System.Security.Claims.ClaimsPrincipal principal;
                
                try
                {
                    principal = tokenHandler.ValidateToken(token, validationParameters, out validatedToken);
                }
                catch (Microsoft.IdentityModel.Tokens.SecurityTokenSignatureKeyNotFoundException ex)
                {
                    // JWTトークンにkidが含まれていない、または署名検証に失敗した場合
                    // これはデモトークンではない可能性が高いため、無効なトークンとして扱う
                    _logger.LogDebug("Token signature validation failed (likely not a demo token): {Error}", ex.Message);
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid demo token format"
                    };
                }
                catch (Microsoft.IdentityModel.Tokens.SecurityTokenException ex)
                {
                    // その他のJWT検証エラー（有効期限切れ、形式不正など）
                    _logger.LogDebug("Token validation failed (likely not a demo token): {Error}", ex.Message);
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid demo token"
                    };
                }

                // トークンからセッション情報を取得
                var sessionId = principal.FindFirst("session_id")?.Value;
                var authMode = principal.FindFirst("auth_mode")?.Value;
                
                // 🔧 デモトークンからStoreIdを取得
                var storeIdClaim = principal.FindFirst("store_id")?.Value;
                int? storeId = null;
                if (!string.IsNullOrEmpty(storeIdClaim) && int.TryParse(storeIdClaim, out var parsedStoreId))
                {
                    storeId = parsedStoreId;
                    _logger.LogDebug("StoreId extracted from demo token: {StoreId}", storeId);
                }

                if (authMode != "demo")
                {
                    _logger.LogDebug("Token is not a demo token (expected behavior for non-demo tokens)");
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Invalid demo token"
                    };
                }

                if (string.IsNullOrEmpty(sessionId))
                {
                    _logger.LogDebug("Session ID not found in demo token");
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
                    _logger.LogDebug("Demo session not found or expired: {SessionId}", sessionId);
                    return new AuthenticationResult
                    {
                        IsValid = false,
                        ErrorMessage = "Session not found or expired"
                    };
                }

                // セッションの最終アクセス時刻を更新
                await _demoAuthService.UpdateSessionAccessAsync(sessionId);

                _logger.LogInformation(
                    "Demo token validated successfully. SessionId: {SessionId}, StoreId: {StoreId}",
                    sessionId,
                    storeId);

                return new AuthenticationResult
                {
                    IsValid = true,
                    UserId = sessionId,
                    AuthMode = "demo",
                    IsReadOnly = true,
                    StoreId = storeId // 🔧 StoreIdを返す
                };
            }
            catch (SecurityTokenExpiredException ex)
            {
                _logger.LogDebug(ex, "Demo token has expired");
                return new AuthenticationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token expired"
                };
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogDebug(ex, "Invalid demo token (expected behavior for non-demo tokens)");
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
        /// dest claimからドメインを正規化
        /// URIパースとホスト抽出を使用してより安全に処理
        /// </summary>
        /// <param name="destClaim">dest claimの値</param>
        /// <returns>正規化されたドメイン</returns>
        private static string NormalizeShopDomain(string destClaim)
        {
            if (string.IsNullOrEmpty(destClaim))
                return destClaim;

            try
            {
                // URIとしてパースしてホストを抽出
                if (Uri.TryCreate(destClaim, UriKind.Absolute, out var uri))
                {
                    return uri.Host; // example.myshopify.com
                }

                // フォールバック: スラッシュで分割して最初の部分を取得
                var parts = destClaim.Split('/');
                var firstPart = parts[0];
                
                // プロトコルプレフィックスを削除
                if (firstPart.StartsWith("https://"))
                {
                    return firstPart.Substring("https://".Length);
                }
                
                if (firstPart.StartsWith("http://"))
                {
                    return firstPart.Substring("http://".Length);
                }

                return firstPart;
            }
            catch (Exception)
            {
                // パースに失敗した場合は元の値を返す
                return destClaim;
            }
        }
    }
}

