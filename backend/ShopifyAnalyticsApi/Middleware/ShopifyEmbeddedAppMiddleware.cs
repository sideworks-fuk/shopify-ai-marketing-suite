using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// Shopify埋め込みアプリ用のミドルウェア
    /// Shopifyセッショントークンの検証とJWT認証の統合を行う
    /// </summary>
    public class ShopifyEmbeddedAppMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ShopifyEmbeddedAppMiddleware> _logger;
        private readonly IConfiguration _configuration;

        public ShopifyEmbeddedAppMiddleware(
            RequestDelegate next,
            ILogger<ShopifyEmbeddedAppMiddleware> logger,
            IConfiguration configuration)
        {
            _next = next;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Shopifyセッショントークンのチェック
            if (context.Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                var token = authHeader.ToString();
                
                // "session-token:" プレフィックスをチェック
                if (token.StartsWith("Bearer session-token:", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        var sessionToken = token.Replace("Bearer session-token:", "", StringComparison.OrdinalIgnoreCase).Trim();
                        
                        // Shopifyセッショントークンの検証
                        var validatedToken = ValidateShopifySessionToken(sessionToken);
                        
                        if (validatedToken != null)
                        {
                            // セッショントークンから店舗情報を取得
                            var storeDomain = validatedToken.Claims.FirstOrDefault(c => c.Type == "dest")?.Value;
                            var storeId = ExtractStoreIdFromDomain(storeDomain);
                            
                            // 既存のJWTトークンを生成または取得
                            var jwtToken = await GetOrCreateJwtToken(storeId, storeDomain);
                            
                            // AuthorizationヘッダーをJWTトークンに置き換え
                            context.Request.Headers["Authorization"] = $"Bearer {jwtToken}";
                            
                            _logger.LogInformation("Shopify session token validated for store: {StoreDomain}", storeDomain);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to validate Shopify session token");
                    }
                }
            }

            await _next(context);
        }

        private JwtSecurityToken? ValidateShopifySessionToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var shopifySecret = _configuration["Shopify:ApiSecret"];
                
                if (string.IsNullOrEmpty(shopifySecret))
                {
                    _logger.LogWarning("Shopify client secret not configured");
                    return null;
                }

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(shopifySecret)),
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    // Shopifyのトークンは "dest" (destination) と "aud" (audience) を使用
                    ValidAudience = _configuration["Shopify:ApiKey"],
                    ValidIssuer = null // Shopifyはissuerを含まない場合がある
                };

                SecurityToken validatedToken;
                var principal = tokenHandler.ValidateToken(token, validationParameters, out validatedToken);
                
                return validatedToken as JwtSecurityToken;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Shopify session token validation failed");
                return null;
            }
        }

        private string ExtractStoreIdFromDomain(string? storeDomain)
        {
            if (string.IsNullOrEmpty(storeDomain))
                return "unknown";

            // "example.myshopify.com" -> "example"
            var storeId = storeDomain.Replace(".myshopify.com", "", StringComparison.OrdinalIgnoreCase);
            return storeId;
        }

        private async Task<string> GetOrCreateJwtToken(string storeId, string? storeDomain)
        {
            // 既存のトークンサービスを使用してJWTトークンを生成
            // 注: この実装では、ShopifyセッショントークンからアプリケーションJWTへの変換を行う
            
            var key = _configuration["Jwt:Key"];
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];

            if (string.IsNullOrEmpty(key))
                throw new InvalidOperationException("JWT Key not configured");

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenKey = Encoding.UTF8.GetBytes(key);
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, storeId),
                new Claim("store_id", storeId),
                new Claim("store_domain", storeDomain ?? ""),
                new Claim(ClaimTypes.Role, "Store"),
                new Claim("token_source", "shopify_session")
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(24),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(tokenKey),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    /// <summary>
    /// ShopifyEmbeddedAppMiddleware拡張メソッド
    /// </summary>
    public static class ShopifyEmbeddedAppMiddlewareExtensions
    {
        public static IApplicationBuilder UseShopifyEmbeddedApp(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<ShopifyEmbeddedAppMiddleware>();
        }
    }
}