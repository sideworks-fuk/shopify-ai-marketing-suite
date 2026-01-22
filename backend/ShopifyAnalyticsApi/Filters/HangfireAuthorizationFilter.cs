using System;
using System.Linq;
using Hangfire.Annotations;
using Hangfire.Dashboard;
using Microsoft.Extensions.Configuration;

namespace ShopifyAnalyticsApi.Filters
{
    /// <summary>
    /// HangFireダッシュボードへのアクセスを制御する認証フィルター
    /// </summary>
    public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
    {
        private readonly IConfiguration _configuration;

        public HangfireAuthorizationFilter()
        {
            // Program.csで設定される前なので、直接ConfigurationBuilderを使用
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
                .AddEnvironmentVariables();
            
            _configuration = builder.Build();
        }

        public bool Authorize([NotNull] DashboardContext context)
        {
            var httpContext = context.GetHttpContext();

            // 開発環境では認証をスキップ（オプション）
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            var skipAuthInDev = _configuration.GetValue<bool>("Admin:BasicAuth:SkipInDevelopment", false);
            if (environment == "Development" && skipAuthInDev)
            {
                return true;
            }

            // 1. 共通の管理者認証セッションCookieをチェック（優先）
            const string AdminAuthCookieName = "admin_auth_session";
            const string AdminAuthCookieValue = "authenticated";
            if (httpContext.Request.Cookies[AdminAuthCookieName] == AdminAuthCookieValue)
            {
                return true;
            }

            // 2. ローカルアクセスを許可
            if (httpContext.Connection.RemoteIpAddress?.ToString() == "127.0.0.1" ||
                httpContext.Connection.RemoteIpAddress?.ToString() == "::1")
            {
                return true;
            }

            // 3. 認証済みユーザーのチェック
            if (httpContext.User?.Identity?.IsAuthenticated == true)
            {
                // 管理者ロールを持つユーザーのみアクセス可能
                if (httpContext.User.IsInRole("Admin") || 
                    httpContext.User.IsInRole("SystemAdmin"))
                {
                    return true;
                }

                // または特定のクレームを持つユーザー
                if (httpContext.User.HasClaim("Permission", "ViewHangfireDashboard"))
                {
                    return true;
                }
            }

            // 4. Basic認証のチェック（フォールバック）
            var authHeader = httpContext.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Basic "))
            {
                try
                {
                    var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();
                    var decodedCredentials = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(encodedCredentials));
                    var parts = decodedCredentials.Split(':', 2);
                    
                    if (parts.Length == 2)
                    {
                        var username = parts[0];
                        var password = parts[1];
                        
                        // 共通の管理者認証情報を使用（優先順位: Admin > Swagger > Hangfire）
                        var expectedUsername = _configuration["Admin:BasicAuth:Username"] 
                            ?? _configuration["Swagger:BasicAuth:Username"] 
                            ?? _configuration["Hangfire:Dashboard:Username"] 
                            ?? "admin";
                        
                        var expectedPassword = _configuration["Admin:BasicAuth:Password"] 
                            ?? _configuration["Swagger:BasicAuth:Password"] 
                            ?? _configuration["Hangfire:Dashboard:Password"] 
                            ?? "Admin2025!";
                        
                        if (username == expectedUsername && password == expectedPassword)
                        {
                            return true;
                        }
                    }
                }
                catch
                {
                    // Basic認証のパースに失敗した場合は無視
                }
            }

            // 全ての認証チェックに失敗した場合はアクセス拒否
            return false;
        }
    }
}