using System.Security.Claims;

namespace ShopifyAnalyticsApi.Middleware;

/// <summary>
/// デモモード用ミドルウェア
/// X-Demo-Mode: true ヘッダーが存在する場合、JWT認証をスキップし、
/// デモ用のClaimsPrincipalを設定します。
/// </summary>
public class DemoModeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<DemoModeMiddleware> _logger;

    public DemoModeMiddleware(RequestDelegate next, ILogger<DemoModeMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 開発環境のみでX-Demo-Modeヘッダーをチェック
        var environment = context.RequestServices.GetRequiredService<IHostEnvironment>();
        
        if (!environment.IsDevelopment())
        {
            // 開発環境以外では何もしない（トークンベース認証のみ）
            await _next(context);
            return;
        }

        // セキュリティ: Authorizationヘッダーをマスクしてログ出力（開発環境のみ）
        var safeHeaders = context.Request.Headers
            .Where(h => h.Key != "Authorization") // Authorizationヘッダーを除外
            .Select(h => $"{h.Key}={h.Value}");
        
        var authHeader = context.Request.Headers.ContainsKey("Authorization") 
            ? "Authorization=***MASKED***" 
            : "Authorization=not-present";
        
        _logger.LogInformation("🔍 [DemoMode] Request headers: {Headers}", 
            string.Join(", ", safeHeaders.Concat(new[] { authHeader })));

        // X-Demo-Mode ヘッダーをチェック（開発環境のみ）
        if (context.Request.Headers.TryGetValue("X-Demo-Mode", out var demoModeValue))
        {
            _logger.LogInformation("🔍 [DemoMode] X-Demo-Mode header detected: {Value}", demoModeValue);

            if (demoModeValue == "true")
            {
                _logger.LogInformation("🎯 Demo mode: Skipping authentication");

                // デモ用のClaimsPrincipalを作成
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, "demo-user"),
                    new Claim(ClaimTypes.Role, "demo"),
                    new Claim("auth_mode", "demo"),
                    new Claim("store_id", "1"),
                    new Claim("is_read_only", "true")
                };

                var identity = new ClaimsIdentity(claims, "demo");
                var principal = new ClaimsPrincipal(identity);

                context.User = principal;

                // デモモードフラグを設定
                context.Items["AuthMode"] = "demo";
                context.Items["IsReadOnly"] = true;

                _logger.LogInformation("✅ Demo mode authentication completed");
            }
        }

        await _next(context);
    }
}

/// <summary>
/// DemoModeMiddleware の拡張メソッド
/// </summary>
public static class DemoModeMiddlewareExtensions
{
    public static IApplicationBuilder UseDemoMode(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<DemoModeMiddleware>();
    }
}

