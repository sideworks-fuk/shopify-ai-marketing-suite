using Microsoft.AspNetCore.Mvc;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// デモモード認証コントローラー
    /// Level 2: デモモード（ステージング・開発環境）
    /// </summary>
    [ApiController]
    [Route("api/demo")]
    public class DemoAuthController : ControllerBase
    {
        private readonly IDemoAuthService _demoAuthService;
        private readonly IAuthenticationService _authenticationService;
        private readonly ILogger<DemoAuthController> _logger;
        private readonly IConfiguration _config;

        public DemoAuthController(
            IDemoAuthService demoAuthService,
            IAuthenticationService authenticationService,
            ILogger<DemoAuthController> logger,
            IConfiguration config)
        {
            _demoAuthService = demoAuthService;
            _authenticationService = authenticationService;
            _logger = logger;
            _config = config;
        }

        /// <summary>
        /// デモモードログイン
        /// </summary>
        /// <param name="request">ログインリクエスト（パスワード）</param>
        /// <returns>JWT トークンと有効期限</returns>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] DemoLoginRequest request)
        {
            // デモモード有効チェック
            var demoEnabled = _config.GetValue<bool>("Demo:Enabled", false);
            if (!demoEnabled)
            {
                _logger.LogWarning("Demo login attempted but demo mode is disabled");
                return NotFound(new
                {
                    error = "Not Found",
                    message = "Demo mode is not enabled in this environment."
                });
            }

            // 入力検証
            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new
                {
                    error = "Bad Request",
                    message = "Password is required"
                });
            }

            // 🔒 セキュリティ: ストアドメイン必須チェック
            if (string.IsNullOrWhiteSpace(request.ShopDomain))
            {
                return BadRequest(new
                {
                    error = "Bad Request",
                    message = "ストアドメインは必須です"
                });
            }

            // IPアドレスとUser-Agentを取得
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();

            // 🔒 ストアドメイン必須版の認証を呼び出し
            var result = await _demoAuthService.AuthenticateAsync(
                request.Password,
                request.ShopDomain,
                ipAddress,
                userAgent);

            if (!result.Success)
            {
                _logger.LogWarning(
                    "Demo login failed. IP: {IpAddress}, Error: {Error}",
                    ipAddress,
                    result.Error);

                return Unauthorized(new
                {
                    error = "Unauthorized",
                    message = result.Error
                });
            }

            _logger.LogInformation("Demo login successful. IP: {IpAddress}", ipAddress);

            return Ok(new
            {
                token = result.Token,
                expiresAt = result.ExpiresAt,
                authMode = "demo",
                readOnly = true,
                canAccessDevTools = false
            });
        }

        /// <summary>
        /// デモモードログアウト
        /// </summary>
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            // Authorizationヘッダーからトークンを取得
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return BadRequest(new
                {
                    error = "Bad Request",
                    message = "Authorization token is required"
                });
            }

            var token = authHeader.Substring("Bearer ".Length).Trim();

            // セッション無効化（キャッシュから削除）
            // TODO: DemoAuthServiceにLogoutAsyncを追加するか、直接キャッシュ削除
            var success = true; // 仮実装

            if (success)
            {
                _logger.LogInformation("Demo logout successful");
                return Ok(new
                {
                    message = "Logged out successfully"
                });
            }

            return StatusCode(500, new
            {
                error = "Internal Server Error",
                message = "Failed to logout"
            });
        }

        /// <summary>
        /// デモセッション情報取得
        /// </summary>
        [HttpGet("session")]
        public async Task<IActionResult> GetSession()
        {
            // Authorizationヘッダーからトークンを取得
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(new
                {
                    error = "Unauthorized",
                    message = "Authorization token is required"
                });
            }

            var token = authHeader.Substring("Bearer ".Length).Trim();

            // トークン検証
            var authResult = await _authenticationService.ValidateDemoTokenAsync(token);

            if (!authResult.IsValid)
            {
                return Unauthorized(new
                {
                    error = "Unauthorized",
                    message = "Invalid or expired token"
                });
            }

            return Ok(new
            {
                userId = authResult.UserId,
                authMode = authResult.AuthMode,
                readOnly = authResult.IsReadOnly,
                canAccessDevTools = false,
                isValid = true
            });
        }
    }

    /// <summary>
    /// デモログインリクエスト
    /// </summary>
    public class DemoLoginRequest
    {
        public string Password { get; set; } = string.Empty;
        /// <summary>
        /// ストアドメイン（必須）
        /// </summary>
        public string ShopDomain { get; set; } = string.Empty;
    }
}

