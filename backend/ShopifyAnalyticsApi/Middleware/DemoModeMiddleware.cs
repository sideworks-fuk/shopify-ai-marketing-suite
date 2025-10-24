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
        // 🆕 すべてのリクエストヘッダーをログ出力（デバッグ用）
        _logger.LogInformation("🔍 [DemoMode] リクエストヘッダー: {Headers}", 
            string.Join(", ", context.Request.Headers.Select(h => $"{h.Key}={h.Value}")));

        // X-Demo-Mode ヘッダーをチェック
        if (context.Request.Headers.TryGetValue("X-Demo-Mode", out var demoModeValue))
        {
            _logger.LogInformation("🔍 [DemoMode] X-Demo-Mode ヘッダー検出: {Value}", demoModeValue);

            if (demoModeValue == "true")
            {
                _logger.LogInformation("🎯 デモモード: 認証をスキップします");

                // デモ用のClaimsPrincipalを作成
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, "demo-user"),
                    new Claim(ClaimTypes.Role, "demo"),
                    new Claim("demo_mode", "true"),
                    new Claim("store_id", "2") // デモ用ストアID
                };

                var identity = new ClaimsIdentity(claims, "DemoMode");
                var principal = new ClaimsPrincipal(identity);

                // HttpContextにデモユーザーを設定
                context.User = principal;
                
                // デモモードフラグを設定（後続のミドルウェアで使用）
                context.Items["IsDemoMode"] = true;

                _logger.LogInformation("✅ デモモード: デモユーザーを設定しました (User.Identity.IsAuthenticated={IsAuthenticated})", 
                    context.User.Identity?.IsAuthenticated);
            }
            else
            {
                _logger.LogWarning("⚠️ [DemoMode] X-Demo-Mode ヘッダーの値が 'true' ではありません: {Value}", demoModeValue);
            }
        }
        else
        {
            _logger.LogInformation("ℹ️ [DemoMode] X-Demo-Mode ヘッダーが見つかりません");
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

