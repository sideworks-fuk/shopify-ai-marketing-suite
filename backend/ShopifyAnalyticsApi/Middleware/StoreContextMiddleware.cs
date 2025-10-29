using System.Security.Claims;
using ShopifyAnalyticsApi.Data;
using Microsoft.EntityFrameworkCore;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// ストアコンテキストを設定するミドルウェア
    /// マルチテナント対応のため、リクエストごとにストアIDとカスタマーIDを特定
    /// </summary>
    public class StoreContextMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<StoreContextMiddleware> _logger;

        public StoreContextMiddleware(RequestDelegate next, ILogger<StoreContextMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider)
        {
            try
            {
                // WebhookやOAuthなど認証不要のエンドポイントはスキップ
                var path = context.Request.Path.Value?.ToLower() ?? "";
                if (IsExcludedPath(path))
                {
                    await _next(context);
                    return;
                }

                // JWTトークンからクレームを取得
                var user = context.User;
                _logger.LogDebug("StoreContextMiddleware - User: {User}, IsAuthenticated: {IsAuthenticated}, Identity: {Identity}", 
                    user?.Identity?.Name ?? "null", 
                    user?.Identity?.IsAuthenticated ?? false,
                    user?.Identity?.AuthenticationType ?? "null");

                if (user?.Identity?.IsAuthenticated == true)
                {
                    try
                    {
                        // すべてのクレームをログ出力
                        var allClaims = user.Claims.Select(c => $"{c.Type}={c.Value}").ToArray();
                        _logger.LogDebug("StoreContextMiddleware - All claims: [{Claims}]", string.Join(", ", allClaims));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "StoreContextMiddleware - Error processing claims");
                    }

                    var storeIdClaim = user.FindFirst("store_id")?.Value;
                    var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
                    var shopDomainClaim = user.FindFirst("shop_domain")?.Value;

                    _logger.LogDebug("StoreContextMiddleware - Extracted claims: store_id={StoreId}, tenant_id={TenantId}, shop_domain={ShopDomain}", 
                        storeIdClaim ?? "null", tenantIdClaim ?? "null", shopDomainClaim ?? "null");

                    if (!string.IsNullOrEmpty(storeIdClaim) && int.TryParse(storeIdClaim, out var storeId))
                    {
                        context.Items["StoreId"] = storeId;
                        context.Items["ShopDomain"] = shopDomainClaim;
                        
                        // テナントIDが存在する場合は設定
                        if (!string.IsNullOrEmpty(tenantIdClaim))
                        {
                            context.Items["TenantId"] = tenantIdClaim;
                        }
                        else
                        {
                            // 既存のストアで TenantId がない場合はデータベースから取得
                            using var scope = serviceProvider.CreateScope();
                            var dbContext = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
                            var store = await dbContext.Stores
                                .Where(s => s.Id == storeId)
                                .Select(s => new { s.TenantId })
                                .FirstOrDefaultAsync();
                            
                            if (store?.TenantId != null)
                            {
                                context.Items["TenantId"] = store.TenantId;
                            }
                            else
                            {
                                // デフォルトテナントを使用
                                context.Items["TenantId"] = "default-tenant";
                            }
                        }

                        _logger.LogDebug("Store context set: StoreId={StoreId}, TenantId={TenantId}, ShopDomain={ShopDomain}", 
                            storeId, context.Items["TenantId"], shopDomainClaim);
                    }
                    else
                    {
                        _logger.LogWarning("Store ID not found in JWT claims for authenticated user. store_id claim: {StoreIdClaim}", storeIdClaim ?? "null");
                    }
                }
                else
                {
                    // 未認証の場合、ヘッダーからストア情報を取得（API Key認証用）
                    var storeIdHeader = context.Request.Headers["X-Store-Id"].FirstOrDefault();
                    var tenantIdHeader = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();
                    
                    if (!string.IsNullOrEmpty(storeIdHeader) && int.TryParse(storeIdHeader, out var headerStoreId))
                    {
                        context.Items["StoreId"] = headerStoreId;
                        
                        if (!string.IsNullOrEmpty(tenantIdHeader))
                        {
                            context.Items["TenantId"] = tenantIdHeader;
                        }
                        
                        _logger.LogDebug("Store context set from headers: StoreId={StoreId}, TenantId={TenantId}", 
                            headerStoreId, tenantIdHeader);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in StoreContextMiddleware");
                // エラーが発生してもリクエストは継続
            }

            await _next(context);
        }

        private bool IsExcludedPath(string path)
        {
            var excludedPaths = new[]
            {
                "/api/webhook",
                "/api/shopify/install",
                "/api/shopify/callback",
                "/api/shopify/process-callback",
                "/api/auth/login",
                "/api/auth/refresh",
                "/api/demo/login",
                "/api/developer/login",
                "/api/health",
                "/swagger"
            };

            return excludedPaths.Any(excluded => path.StartsWith(excluded));
        }
    }

    /// <summary>
    /// StoreContextMiddleware 拡張メソッド
    /// </summary>
    public static class StoreContextMiddlewareExtensions
    {
        public static IApplicationBuilder UseStoreContext(this IApplicationBuilder app)
        {
            return app.UseMiddleware<StoreContextMiddleware>();
        }
    }
}