using Hangfire.Annotations;
using Hangfire.Dashboard;

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

            // 開発環境では認証をスキップ
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (environment == "Development")
            {
                return true;
            }

            // 本番環境での認証チェック
            // 1. ローカルアクセスを許可
            if (httpContext.Connection.RemoteIpAddress?.ToString() == "127.0.0.1" ||
                httpContext.Connection.RemoteIpAddress?.ToString() == "::1")
            {
                return true;
            }

            // 2. 認証済みユーザーのチェック
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

            // 3. Basic認証のチェック（オプション）
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
                        
                        // 環境変数または設定から認証情報を取得
                        var expectedUsername = _configuration["Hangfire:Dashboard:Username"] ?? "admin";
                        var expectedPassword = _configuration["Hangfire:Dashboard:Password"] ?? "HangfireAdmin2025!";
                        
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