using System;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// 管理者向けエンドポイント（/admin, /swagger, /hangfire）へのアクセスを共通のBasic認証で制御するミドルウェア
    /// 認証成功時はセッションCookieを設定し、SwaggerとHangFireでも同じ認証状態を共有
    /// </summary>
    public class AdminBasicAuthMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AdminBasicAuthMiddleware> _logger;
        private const string AdminAuthCookieName = "admin_auth_session";
        private const string AdminAuthCookieValue = "authenticated";

        public AdminBasicAuthMiddleware(
            RequestDelegate next,
            IConfiguration configuration,
            ILogger<AdminBasicAuthMiddleware> logger)
        {
            _next = next;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            
            // 対象パスをチェック
            var targetPaths = new[] { "/admin", "/swagger", "/hangfire" };
            var isTargetPath = targetPaths.Any(targetPath => path.StartsWith(targetPath));

            if (!isTargetPath)
            {
                await _next(context);
                return;
            }

            // 開発環境では認証をスキップ（オプション）
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            var skipAuthInDev = _configuration.GetValue<bool>("Admin:BasicAuth:SkipInDevelopment", false);
            if (environment == "Development" && skipAuthInDev)
            {
                await _next(context);
                return;
            }

            // セッションCookieをチェック（既に認証済みの場合）
            if (context.Request.Cookies[AdminAuthCookieName] == AdminAuthCookieValue)
            {
                _logger.LogDebug("Admin authentication session cookie found for path: {Path}", path);
                await _next(context);
                return;
            }

            // Basic認証のチェック
            var authHeader = context.Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();
                    var decodedCredentials = Encoding.UTF8.GetString(Convert.FromBase64String(encodedCredentials));
                    var parts = decodedCredentials.Split(':', 2);
                    
                    if (parts.Length == 2)
                    {
                        var username = parts[0];
                        var password = parts[1];
                        
                        // 設定から認証情報を取得（優先順位: Admin > Swagger > Hangfire）
                        // "Will be overridden by environment variable" などのプレースホルダーは無視
                        var expectedUsername = GetConfigValue(
                            _configuration["Admin:BasicAuth:Username"],
                            _configuration["Swagger:BasicAuth:Username"],
                            _configuration["Hangfire:Dashboard:Username"],
                            "admin");
                        
                        var expectedPassword = GetConfigValue(
                            _configuration["Admin:BasicAuth:Password"],
                            _configuration["Swagger:BasicAuth:Password"],
                            _configuration["Hangfire:Dashboard:Password"],
                            "Admin2025!");
                        
                        // デバッグログ（本番環境では削除推奨）
                        _logger.LogDebug(
                            "Admin Basic auth check - Username: {Username}, ExpectedUsername: {ExpectedUsername}, Password match: {PasswordMatch}",
                            username, expectedUsername, password == expectedPassword);
                        
                        if (username == expectedUsername && password == expectedPassword)
                        {
                            // 認証成功: セッションCookieを設定
                            var cookieOptions = new CookieOptions
                            {
                                HttpOnly = true,
                                Secure = true, // HTTPS必須
                                SameSite = SameSiteMode.Lax,
                                Expires = DateTimeOffset.UtcNow.AddHours(8) // 8時間有効
                            };
                            
                            context.Response.Cookies.Append(AdminAuthCookieName, AdminAuthCookieValue, cookieOptions);
                            
                            _logger.LogInformation("Admin Basic authentication successful for path: {Path}, Username: {Username}", 
                                path, username);
                            
                            await _next(context);
                            return;
                        }
                        else
                        {
                            _logger.LogWarning("Admin Basic authentication failed for path: {Path}, Username: {Username}", 
                                path, username);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to parse Basic authentication credentials for path: {Path}", path);
                }
            }

            // 認証失敗: 401 Unauthorizedを返す
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"EC Ranger Admin\"";
            
            // JSON形式でエラーレスポンスを返す（/admin/info などのAPIエンドポイント用）
            if (path.StartsWith("/admin") && path.Contains("/info"))
            {
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"error\":\"Unauthorized\",\"message\":\"管理者認証が必要です\"}");
            }
            else
            {
                await context.Response.WriteAsync("Unauthorized");
            }
        }

        /// <summary>
        /// 設定値から有効な値を取得（プレースホルダーを無視）
        /// </summary>
        private string GetConfigValue(string? adminValue, string? swaggerValue, string? hangfireValue, string defaultValue)
        {
            // プレースホルダー文字列を無視
            var placeholderStrings = new[] 
            { 
                "Will be overridden by environment variable",
                "will be overridden by environment variable",
                "WILL BE OVERRIDDEN BY ENVIRONMENT VARIABLE"
            };
            
            if (!string.IsNullOrEmpty(adminValue) && !placeholderStrings.Contains(adminValue))
                return adminValue;
            
            if (!string.IsNullOrEmpty(swaggerValue) && !placeholderStrings.Contains(swaggerValue))
                return swaggerValue;
            
            if (!string.IsNullOrEmpty(hangfireValue) && !placeholderStrings.Contains(hangfireValue))
                return hangfireValue;
            
            return defaultValue;
        }
    }

    /// <summary>
    /// AdminBasicAuthMiddleware の拡張メソッド
    /// </summary>
    public static class AdminBasicAuthMiddlewareExtensions
    {
        /// <summary>
        /// 管理者向けBasic認証ミドルウェアを追加
        /// </summary>
        public static IApplicationBuilder UseAdminBasicAuth(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<AdminBasicAuthMiddleware>();
        }
    }
}
