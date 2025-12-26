using System.Security.Claims;
using ShopifyAnalyticsApi.Data;
using Microsoft.EntityFrameworkCore;

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

                // データベースから最初のアクティブなストアを取得
                var dbContext = context.RequestServices.GetRequiredService<ShopifyDbContext>();
                var firstActiveStore = await dbContext.Stores
                    .Where(s => s.IsActive)
                    .OrderBy(s => s.Id)
                    .Select(s => new { s.Id, s.Domain, s.TenantId })
                    .FirstOrDefaultAsync();

                if (firstActiveStore == null)
                {
                    _logger.LogError("No active store found for demo mode. Cannot proceed with demo authentication.");
                    context.Response.StatusCode = 500;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = "Configuration Error",
                        message = "No active store available for demo mode"
                    });
                    return;
                }

                // デモ用のClaimsPrincipalを作成（実際のストアIDを使用）
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, "demo-user"),
                    new Claim(ClaimTypes.Role, "demo"),
                    new Claim("auth_mode", "demo"),
                    new Claim("store_id", firstActiveStore.Id.ToString()),
                    new Claim("tenant_id", firstActiveStore.TenantId ?? "default-tenant"),
                    new Claim("shop_domain", firstActiveStore.Domain ?? "demo-shop.myshopify.com"),
                    new Claim("is_read_only", "true")
                };

                var identity = new ClaimsIdentity(claims, "demo");
                var principal = new ClaimsPrincipal(identity);

                context.User = principal;

                // デモモードフラグを設定
                context.Items["AuthMode"] = "demo";
                context.Items["IsReadOnly"] = true;

                _logger.LogInformation("✅ Demo mode authentication completed. StoreId: {StoreId}", firstActiveStore.Id);
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

