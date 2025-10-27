using System.Security.Claims;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// 認証モード制御ミドルウェア
    /// 環境に応じた認証方式を制御し、セキュリティを強化
    /// </summary>
    public class AuthModeMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthModeMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public AuthModeMiddleware(
            RequestDelegate next,
            IConfiguration config,
            ILogger<AuthModeMiddleware> logger,
            IHostEnvironment env)
        {
            _next = next;
            _config = config;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context, IAuthenticationService authService)
        {
            // 認証モード取得
            var authMode = _config["Authentication:Mode"] ?? "OAuthRequired";
            var environment = _env.EnvironmentName;

            // 本番環境での安全弁（セキュリティチェック）
            if (environment == "Production" && authMode != "OAuthRequired")
            {
                _logger.LogCritical(
                    "SECURITY: Invalid authentication mode for production environment. " +
                    "Environment: {Environment}, Mode: {Mode}",
                    environment,
                    authMode);

                context.Response.StatusCode = 500;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Configuration Error",
                    message = "Production environment must use OAuthRequired mode"
                });
                return;
            }

            // ホスト名検証（オプション）
            var allowedHostnames = _config.GetSection("Environment:AllowedHostnames").Get<string[]>();
            if (allowedHostnames?.Length > 0)
            {
                var hostname = context.Request.Host.Host;
                if (!allowedHostnames.Contains(hostname))
                {
                    _logger.LogWarning(
                        "Request from unauthorized hostname: {Hostname}",
                        hostname);
                }
            }

            // Authorizationヘッダーからトークンを取得（Shopify埋め込みアプリ対応）
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            string? token = null;

            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                token = authHeader.Substring("Bearer ".Length).Trim();
            }

            bool isOAuthValid = false;
            bool isDemoValid = false;
            AuthenticationResult? authResult = null;

            // トークン検証
            if (!string.IsNullOrEmpty(token))
            {
                try
                {
                    // Shopify App Bridgeセッショントークンの検証
                    var oauthResult = await authService.ValidateShopifySessionTokenAsync(token);
                    isOAuthValid = oauthResult.IsValid;

                    if (isOAuthValid)
                    {
                        authResult = oauthResult;
                        _logger.LogDebug("Shopify OAuth token validation successful");
                    }
                    else
                    {
                        // デモトークンの検証
                        var demoResult = await authService.ValidateDemoTokenAsync(token);
                        isDemoValid = demoResult.IsValid;

                        if (isDemoValid)
                        {
                            authResult = demoResult;
                            _logger.LogDebug("Demo token validation successful");
                        }
                        else
                        {
                            _logger.LogDebug("Both OAuth and demo token validation failed");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Token validation error for path: {Path}", context.Request.Path);
                    
                    // 認証エラーをログに記録
                    await authService.LogAuthenticationAttemptAsync(
                        null,
                        "unknown",
                        false,
                        $"Token validation error: {ex.Message}",
                        context.Connection.RemoteIpAddress?.ToString(),
                        context.Request.Headers["User-Agent"].FirstOrDefault());
                    
                    // エラーが発生した場合は認証失敗として扱う
                    isOAuthValid = false;
                    isDemoValid = false;
                }
            }

            // 認証モード別の処理
            switch (authMode)
            {
                case "OAuthRequired":
                    if (!isOAuthValid)
                    {
                        _logger.LogWarning(
                            "OAuth authentication required but not provided. Path: {Path}",
                            context.Request.Path);

                        context.Response.StatusCode = 401;
                        await context.Response.WriteAsJsonAsync(new
                        {
                            error = "Unauthorized",
                            message = "OAuth authentication required"
                        });

                        // 認証ログ記録
                        await authService.LogAuthenticationAttemptAsync(
                            null,
                            "oauth",
                            false,
                            "OAuth token not provided or invalid",
                            context.Connection.RemoteIpAddress?.ToString(),
                            context.Request.Headers["User-Agent"].FirstOrDefault());

                        return;
                    }
                    break;

                case "DemoAllowed":
                    if (!isOAuthValid && !isDemoValid)
                    {
                        _logger.LogWarning(
                            "OAuth or demo authentication required but not provided. Path: {Path}",
                            context.Request.Path);

                        context.Response.StatusCode = 401;
                        await context.Response.WriteAsJsonAsync(new
                        {
                            error = "Unauthorized",
                            message = "OAuth or demo authentication required"
                        });

                        // 認証ログ記録
                        await authService.LogAuthenticationAttemptAsync(
                            null,
                            "oauth_or_demo",
                            false,
                            "No valid authentication token provided",
                            context.Connection.RemoteIpAddress?.ToString(),
                            context.Request.Headers["User-Agent"].FirstOrDefault());

                        return;
                    }
                    break;

                case "AllAllowed":
                    // すべての認証方式を許可（開発環境のみ）
                    _logger.LogInformation(
                        "AllAllowed mode enabled. Path: {Path}",
                        context.Request.Path);
                    break;

                default:
                    _logger.LogError(
                        "Unknown authentication mode: {AuthMode}",
                        authMode);

                    context.Response.StatusCode = 500;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = "Configuration Error",
                        message = "Unknown authentication mode"
                    });
                    return;
            }

            // 認証情報をコンテキストに設定
            if (authResult != null && authResult.IsValid)
            {
                // 認証モードを設定
                context.Items["AuthMode"] = authResult.AuthMode;
                context.Items["IsReadOnly"] = authResult.IsReadOnly;
                context.Items["StoreId"] = authResult.StoreId;
                context.Items["UserId"] = authResult.UserId;

                // デモモード時のクレーム設定
                if (isDemoValid && !isOAuthValid)
                {
                    // IsDemoModeフラグを設定（DemoReadOnlyFilterで使用）
                    context.Items["IsDemoMode"] = true;
                    
                    var claims = new List<Claim>
                    {
                        new Claim("auth_mode", "demo"),
                        new Claim("read_only", "true"),
                        new Claim(ClaimTypes.Name, authResult.UserId ?? "demo-user"), // Rate Limiter用
                        new Claim(ClaimTypes.NameIdentifier, authResult.UserId ?? "demo-user")
                    };

                    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Demo"));

                    _logger.LogInformation(
                        "Demo mode authentication successful. UserId: {UserId}",
                        authResult.UserId);
                }
                else if (isOAuthValid)
                {
                    // IsDemoModeフラグは設定しない（OAuth認証）
                    context.Items["IsDemoMode"] = false;
                    
                    var claims = new List<Claim>
                    {
                        new Claim("auth_mode", "oauth"),
                        new Claim("read_only", "false"),
                        new Claim(ClaimTypes.Name, authResult.UserId ?? "oauth-user"), // Rate Limiter用
                        new Claim(ClaimTypes.NameIdentifier, authResult.UserId ?? "oauth-user")
                    };

                    if (authResult.StoreId.HasValue)
                    {
                        claims.Add(new Claim("store_id", authResult.StoreId.Value.ToString()));
                    }

                    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "OAuth"));

                    _logger.LogInformation(
                        "OAuth authentication successful. UserId: {UserId}, StoreId: {StoreId}",
                        authResult.UserId,
                        authResult.StoreId);
                }

                // 認証成功ログ記録
                await authService.LogAuthenticationAttemptAsync(
                    authResult.UserId,
                    authResult.AuthMode,
                    true,
                    null,
                    context.Connection.RemoteIpAddress?.ToString(),
                    context.Request.Headers["User-Agent"].FirstOrDefault());
            }

            // 次のミドルウェアを実行
            await _next(context);
        }
    }

    /// <summary>
    /// AuthModeMiddleware の拡張メソッド
    /// </summary>
    public static class AuthModeMiddlewareExtensions
    {
        /// <summary>
        /// 認証モードミドルウェアを追加
        /// </summary>
        public static IApplicationBuilder UseAuthModeMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<AuthModeMiddleware>();
        }
    }
}

