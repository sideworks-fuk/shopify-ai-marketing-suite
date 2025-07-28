using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ITokenService _tokenService;
        private readonly IStoreService _storeService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            ITokenService tokenService,
            IStoreService storeService,
            ILogger<AuthController> logger)
        {
            _tokenService = tokenService;
            _storeService = storeService;
            _logger = logger;
        }

        [HttpPost("token")]
        [AllowAnonymous]
        public async Task<IActionResult> GenerateToken([FromBody] TokenRequest request)
        {
            try
            {
                // ストアの存在確認
                var store = await _storeService.GetStoreByIdAsync(request.StoreId);
                if (store == null)
                {
                    return Unauthorized(new { error = "Invalid store" });
                }

                // TODO: ここで実際のShopify OAuth検証を行う
                // 現在は開発用の簡易実装

                // アクセストークンとリフレッシュトークンを生成
                var accessToken = _tokenService.GenerateAccessToken(store.Id, store.ShopDomain);
                var refreshToken = _tokenService.GenerateRefreshToken(store.Id);

                _logger.LogInformation("Token generated for Store {StoreId}", store.Id);

                return Ok(new TokenResponse
                {
                    AccessToken = accessToken,
                    RefreshToken = refreshToken,
                    ExpiresIn = 3600, // 1時間
                    TokenType = "Bearer"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating token for Store {StoreId}", request.StoreId);
                return StatusCode(500, new { error = "Token generation failed" });
            }
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                // TODO: リフレッシュトークンの検証をデータベースで行う
                // 現在は簡易実装

                var principal = _tokenService.GetPrincipalFromExpiredToken(request.AccessToken);
                if (principal == null)
                {
                    return Unauthorized(new { error = "Invalid token" });
                }

                var storeIdClaim = principal.FindFirst("store_id")?.Value;
                if (!int.TryParse(storeIdClaim, out var storeId))
                {
                    return Unauthorized(new { error = "Invalid token claims" });
                }

                var store = await _storeService.GetStoreByIdAsync(storeId);
                if (store == null)
                {
                    return Unauthorized(new { error = "Invalid store" });
                }

                // 新しいアクセストークンを生成
                var newAccessToken = _tokenService.GenerateAccessToken(store.Id, store.ShopDomain);
                var newRefreshToken = _tokenService.GenerateRefreshToken(store.Id);

                _logger.LogInformation("Token refreshed for Store {StoreId}", store.Id);

                return Ok(new TokenResponse
                {
                    AccessToken = newAccessToken,
                    RefreshToken = newRefreshToken,
                    ExpiresIn = 3600,
                    TokenType = "Bearer"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing token");
                return StatusCode(500, new { error = "Token refresh failed" });
            }
        }

        [HttpPost("validate")]
        [Authorize]
        public IActionResult ValidateToken()
        {
            // 認証済みの場合のみこのエンドポイントに到達
            var storeId = User.FindFirst("store_id")?.Value;
            var shopDomain = User.FindFirst("shop_domain")?.Value;

            return Ok(new
            {
                valid = true,
                storeId,
                shopDomain
            });
        }
    }

    public class TokenRequest
    {
        public int StoreId { get; set; }
        public string ShopDomain { get; set; } = string.Empty;
        // TODO: Shopify OAuthコードやセッショントークンを追加
    }

    public class RefreshTokenRequest
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class TokenResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public int ExpiresIn { get; set; }
        public string TokenType { get; set; } = string.Empty;
    }
}