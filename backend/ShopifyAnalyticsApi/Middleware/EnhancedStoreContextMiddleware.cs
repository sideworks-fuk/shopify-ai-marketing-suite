using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// 強化版ストアコンテキストミドルウェア
    /// ストア間のデータ分離を確実に行う
    /// </summary>
    public class EnhancedStoreContextMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<EnhancedStoreContextMiddleware> _logger;

        public EnhancedStoreContextMiddleware(
            RequestDelegate next,
            ILogger<EnhancedStoreContextMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // 認証不要のパスはスキップ
            if (ShouldSkipAuthentication(context.Request.Path))
            {
                await _next(context);
                return;
            }

            var storeValidationService = context.RequestServices.GetRequiredService<IStoreValidationService>();
            
            // 1. JWTトークンからストア情報を取得
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                
                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    var jsonToken = handler.ReadJwtToken(token);
                    
                    var storeIdClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "store_id")?.Value;
                    var shopDomainClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "shop_domain")?.Value;
                    var tenantIdClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "tenant_id")?.Value;

                    if (!string.IsNullOrEmpty(storeIdClaim) && !string.IsNullOrEmpty(shopDomainClaim))
                    {
                        // ストアが登録されているか確認
                        if (!await storeValidationService.IsStoreRegisteredAsync(shopDomainClaim))
                        {
                            _logger.LogWarning("Access denied: Unregistered store {ShopDomain}", shopDomainClaim);
                            context.Response.StatusCode = 403;
                            await context.Response.WriteAsync("Store not registered");
                            return;
                        }

                        // コンテキストにストア情報を設定
                        context.Items["StoreId"] = int.Parse(storeIdClaim);
                        context.Items["ShopDomain"] = shopDomainClaim;
                        context.Items["TenantId"] = tenantIdClaim;
                        
                        _logger.LogDebug("Store context set from JWT: StoreId={StoreId}, ShopDomain={ShopDomain}", 
                            storeIdClaim, shopDomainClaim);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing JWT token");
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Invalid token");
                    return;
                }
            }
            // 2. API Keyヘッダーからストア情報を取得（より厳格な検証）
            else
            {
                var storeIdHeader = context.Request.Headers["X-Store-Id"].FirstOrDefault();
                var apiKeyHeader = context.Request.Headers["X-API-Key"].FirstOrDefault();
                var shopDomainHeader = context.Request.Headers["X-Shop-Domain"].FirstOrDefault();

                if (!string.IsNullOrEmpty(storeIdHeader) && !string.IsNullOrEmpty(apiKeyHeader))
                {
                    if (!int.TryParse(storeIdHeader, out var headerStoreId))
                    {
                        context.Response.StatusCode = 400;
                        await context.Response.WriteAsync("Invalid Store ID format");
                        return;
                    }

                    // API Keyの検証
                    if (!await storeValidationService.ValidateApiKeyAsync(headerStoreId, apiKeyHeader))
                    {
                        _logger.LogWarning("Invalid API key for StoreId: {StoreId}", headerStoreId);
                        context.Response.StatusCode = 401;
                        await context.Response.WriteAsync("Invalid API key");
                        return;
                    }

                    // ストアドメインが提供されている場合、登録確認
                    if (!string.IsNullOrEmpty(shopDomainHeader))
                    {
                        if (!await storeValidationService.IsStoreRegisteredAsync(shopDomainHeader))
                        {
                            _logger.LogWarning("Access denied: Unregistered store {ShopDomain}", shopDomainHeader);
                            context.Response.StatusCode = 403;
                            await context.Response.WriteAsync("Store not registered");
                            return;
                        }
                    }

                    context.Items["StoreId"] = headerStoreId;
                    context.Items["ShopDomain"] = shopDomainHeader;
                    
                    _logger.LogDebug("Store context set from headers: StoreId={StoreId}", headerStoreId);
                }
            }

            // 3. ストア情報が設定されていない場合のチェック
            if (!context.Items.ContainsKey("StoreId") && RequiresAuthentication(context.Request.Path))
            {
                _logger.LogWarning("No store context found for path: {Path}", context.Request.Path);
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Store authentication required");
                return;
            }

            await _next(context);
        }

        private bool ShouldSkipAuthentication(PathString path)
        {
            var skipPaths = new[]
            {
                "/api/health",
                "/api/shopify/install",
                "/api/shopify/callback",
                "/api/shopify/process-callback",
                "/api/webhooks",
                "/swagger"
            };

            return skipPaths.Any(p => path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase));
        }

        private bool RequiresAuthentication(PathString path)
        {
            // APIパスは認証必須
            return path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);
        }
    }
}