using Microsoft.AspNetCore.Mvc;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 開発者モード認証コントローラー
    /// Level 1: 開発者モード（開発環境のみ）
    /// </summary>
    [ApiController]
    [Route("api/developer")]
    public class DeveloperAuthController : ControllerBase
    {
        private readonly IDeveloperAuthService _developerAuthService;
        private readonly ILogger<DeveloperAuthController> _logger;
        private readonly IHostEnvironment _env;

        public DeveloperAuthController(
            IDeveloperAuthService developerAuthService,
            ILogger<DeveloperAuthController> logger,
            IHostEnvironment env)
        {
            _developerAuthService = developerAuthService;
            _logger = logger;
            _env = env;
        }

        /// <summary>
        /// 開発者モードログイン
        /// </summary>
        /// <param name="request">ログインリクエスト（パスワード）</param>
        /// <returns>JWT トークンと有効期限</returns>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] DeveloperLoginRequest request)
        {
            // 開発環境チェック（Development または LocalDevelopment）
            if (!_env.IsDevelopment() && _env.EnvironmentName != "LocalDevelopment")
            {
                _logger.LogWarning("Developer login attempted in non-development environment: {Environment}", _env.EnvironmentName);
                return NotFound(new
                {
                    error = "Not Found",
                    message = "This endpoint is only available in development environment."
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

            // IPアドレスとUser-Agentを取得
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].FirstOrDefault();

            // 認証実行
             var result = await _developerAuthService.AuthenticateAsync(
                request.Password,
                ipAddress,
                userAgent);

            if (!result.Success)
            {
                _logger.LogWarning(
                    "Developer login failed. IP: {IpAddress}, Error: {Error}",
                    ipAddress,
                    result.Error);

                return Unauthorized(new
                {
                    error = "Unauthorized",
                    message = result.Error
                });
            }

            _logger.LogInformation("Developer login successful. IP: {IpAddress}", ipAddress);

            return Ok(new
            {
                token = result.Token,
                expiresAt = result.ExpiresAt,
                authMode = "developer",
                readOnly = false,
                canAccessDevTools = true
            });
        }

        /// <summary>
        /// 開発者モードログアウト
        /// </summary>
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            // 開発環境チェック（Development または LocalDevelopment）
            if (!_env.IsDevelopment() && _env.EnvironmentName != "LocalDevelopment")
            {
                return NotFound();
            }

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

            // セッション無効化
            var success = await _developerAuthService.LogoutAsync(token);

            if (success)
            {
                _logger.LogInformation("Developer logout successful");
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
        /// 開発者セッション情報取得
        /// </summary>
        [HttpGet("session")]
        public async Task<IActionResult> GetSession()
        {
            // 開発環境チェック（Development または LocalDevelopment）
            if (!_env.IsDevelopment() && _env.EnvironmentName != "LocalDevelopment")
            {
                return NotFound();
            }

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
            var authResult = await _developerAuthService.ValidateDeveloperTokenAsync(token);

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
                canAccessDevTools = true,
                isValid = true
            });
        }
    }

    /// <summary>
    /// 開発者ログインリクエスト
    /// </summary>
    public class DeveloperLoginRequest
    {
        public string Password { get; set; } = string.Empty;
    }
}




