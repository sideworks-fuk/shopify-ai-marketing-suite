using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ShopifyAnalyticsApi.Services
{
    public interface ITokenService
    {
        string GenerateAccessToken(int storeId, string shopDomain, string? tenantId = null);
        string GenerateRefreshToken(int storeId);
        TokenValidationResult ValidateToken(string token);
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    }

    public class TokenService : ITokenService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<TokenService> _logger;

        public TokenService(IConfiguration configuration, ILogger<TokenService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public string GenerateAccessToken(int storeId, string shopDomain, string? tenantId = null)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, storeId.ToString()),
                new Claim("store_id", storeId.ToString()),
                new Claim("shop_domain", shopDomain),
                new Claim(ClaimTypes.Name, shopDomain),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
            };
            
            // テナントIDが提供されている場合は追加
            if (!string.IsNullOrEmpty(tenantId))
            {
                claims.Add(new Claim("tenant_id", tenantId));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiryMinutes"] ?? "60")),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            _logger.LogInformation("Access token generated for Store {StoreId}, Shop {ShopDomain}", storeId, shopDomain);
            
            return tokenString;
        }

        public string GenerateRefreshToken(int storeId)
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            var refreshToken = Convert.ToBase64String(randomNumber);
            
            _logger.LogInformation("Refresh token generated for Store {StoreId}", storeId);
            
            // TODO: 実際の実装では、リフレッシュトークンをデータベースに保存する必要があります
            // 例: _context.RefreshTokens.Add(new RefreshToken { Token = refreshToken, StoreId = storeId, ExpiresAt = DateTime.UtcNow.AddDays(7) });
            
            return refreshToken;
        }

        public TokenValidationResult ValidateToken(string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                return new TokenValidationResult { IsValid = false, Error = "Token is empty" };
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));

            try
            {
                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _configuration["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = _configuration["Jwt:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
                var jwtToken = (JwtSecurityToken)validatedToken;
                var storeId = int.Parse(principal.FindFirst("store_id")?.Value ?? "0");
                var shopDomain = principal.FindFirst("shop_domain")?.Value ?? "";

                return new TokenValidationResult
                {
                    IsValid = true,
                    StoreId = storeId,
                    ShopDomain = shopDomain,
                    Principal = principal
                };
            }
            catch (SecurityTokenExpiredException)
            {
                _logger.LogWarning("Token validation failed: Token expired");
                return new TokenValidationResult { IsValid = false, Error = "Token expired" };
            }
            catch (SecurityTokenInvalidSignatureException)
            {
                _logger.LogWarning("Token validation failed: Invalid signature");
                return new TokenValidationResult { IsValid = false, Error = "Invalid token signature" };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token validation failed");
                return new TokenValidationResult { IsValid = false, Error = "Token validation failed" };
            }
        }

        public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"));

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"],
                ValidateLifetime = false, // ここでは有効期限をチェックしない
                ClockSkew = TimeSpan.Zero
            };

            try
            {
                var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
                return principal;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get principal from expired token");
                return null;
            }
        }
    }

    public class TokenValidationResult
    {
        public bool IsValid { get; set; }
        public string? Error { get; set; }
        public int StoreId { get; set; }
        public string ShopDomain { get; set; } = string.Empty;
        public ClaimsPrincipal? Principal { get; set; }
    }
}