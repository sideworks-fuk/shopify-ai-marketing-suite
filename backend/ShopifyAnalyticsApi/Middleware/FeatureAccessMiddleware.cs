using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// 機能アクセス制御ミドルウェア
    /// プランと選択機能に基づいてアクセスを制御
    /// </summary>
    public class FeatureAccessMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<FeatureAccessMiddleware> _logger;
        private readonly IMemoryCache _cache;

        // 機能別のエンドポイントマッピング（文字列定数を使用）
        private readonly Dictionary<string, string> _featureEndpoints = new()
        {
            { "/api/analytics", FeatureConstants.DormantAnalysis }, // デフォルトで休眠顧客分析にマップ
            { "/api/dormant", FeatureConstants.DormantAnalysis },
            { "/api/yearoveryear", FeatureConstants.YoyComparison },
            { "/api/yoy", FeatureConstants.YoyComparison },
            { "/api/monthlysales", FeatureConstants.PurchaseFrequency },
            { "/api/purchase", FeatureConstants.PurchaseFrequency }
        };

        public FeatureAccessMiddleware(
            RequestDelegate next,
            ILogger<FeatureAccessMiddleware> logger,
            IMemoryCache cache)
        {
            _next = next;
            _logger = logger;
            _cache = cache;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // 対象外のパスはスキップ
            if (!RequiresFeatureCheck(context.Request.Path))
            {
                await _next(context);
                return;
            }

            // ストア情報取得
            var storeId = GetStoreId(context);
            if (string.IsNullOrEmpty(storeId))
            {
                _logger.LogWarning("Store ID not found in request context");
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Store authentication required");
                return;
            }

            // サービススコープ内でFeatureSelectionServiceを取得
            using (var scope = context.RequestServices.CreateScope())
            {
                var featureService = scope.ServiceProvider.GetRequiredService<IFeatureSelectionService>();

                // キャッシュキー
                var cacheKey = $"feature_access_{storeId}";
                
                // キャッシュから取得または新規取得
                var accessInfo = await _cache.GetOrCreateAsync(cacheKey, async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
                    
                    // サブスクリプション状態を確認（データベースから直接取得）
                    var storeIdInt = int.Parse(storeId);
                    var dbContext = scope.ServiceProvider.GetRequiredService<Data.ShopifyDbContext>();
                    var subscription = await dbContext.StoreSubscriptions
                        .Include(ss => ss.Plan)
                        .FirstOrDefaultAsync(ss => ss.StoreId == storeIdInt && ss.Status == "active");
                    var isPaid = subscription != null && subscription.Plan?.Name != "Free";
                    
                    // 選択された機能を取得
                    var selectedFeatures = await featureService.GetSelectedFeaturesAsync(storeId);
                    
                    return new FeatureAccessInfo
                    {
                        IsPaidPlan = isPaid,
                        SelectedFeatures = selectedFeatures?.Select(f => f.FeatureId).ToList() ?? new List<string>()
                    };
                });

                // アクセス権限チェック
                var requestedFeature = GetRequestedFeature(context.Request.Path);
                if (!string.IsNullOrEmpty(requestedFeature))
                {
                    var hasAccess = CheckFeatureAccess(accessInfo, requestedFeature);
                    
                    if (!hasAccess)
                    {
                        _logger.LogWarning($"Feature access denied for store {storeId}, feature: {requestedFeature}");
                        
                        context.Response.StatusCode = 403;
                        context.Response.ContentType = "application/json";
                        
                        var response = new
                        {
                            error = "Feature not available",
                            message = accessInfo.IsPaidPlan 
                                ? "This feature is not available in your current plan."
                                : "This feature is not selected in your free plan. Please select this feature in settings or upgrade to a paid plan.",
                            requiredFeature = requestedFeature,
                            currentPlan = accessInfo.IsPaidPlan ? "paid" : "free",
                            selectedFeatures = accessInfo.SelectedFeatures.ToArray()
                        };
                        
                        await context.Response.WriteAsJsonAsync(response);
                        return;
                    }
                }
            }

            await _next(context);
        }

        private bool RequiresFeatureCheck(PathString path)
        {
            var pathValue = path.Value?.ToLower() ?? "";
            
            // 除外パス（認証、ヘルスチェック、セットアップなど）
            var excludedPaths = new[]
            {
                "/api/auth",
                "/api/health",
                "/api/setup",
                "/api/webhook",
                "/api/subscription",
                "/api/feature-selection",
                "/api/store"
            };

            if (excludedPaths.Any(ep => pathValue.StartsWith(ep)))
                return false;

            // 機能エンドポイントのチェック
            return _featureEndpoints.Keys.Any(ep => pathValue.StartsWith(ep));
        }

        private string GetRequestedFeature(PathString path)
        {
            var pathValue = path.Value?.ToLower() ?? "";
            
            foreach (var kvp in _featureEndpoints)
            {
                if (pathValue.StartsWith(kvp.Key))
                    return kvp.Value;
            }
            
            return null;
        }

        private bool CheckFeatureAccess(FeatureAccessInfo accessInfo, string requestedFeature)
        {
            // 有料プランは全機能アクセス可能
            if (accessInfo.IsPaidPlan)
                return true;

            // 無料プランは選択された機能のみアクセス可能
            return accessInfo.SelectedFeatures.Contains(requestedFeature);
        }

        private string GetStoreId(HttpContext context)
        {
            // ヘッダーから取得
            if (context.Request.Headers.TryGetValue("X-Store-Id", out var storeIdHeader))
                return storeIdHeader.ToString();

            // HttpContextのItemsから取得（StoreContextMiddlewareで設定）
            if (context.Items.TryGetValue("StoreId", out var storeIdItem))
                return storeIdItem?.ToString();

            // クエリパラメータから取得
            if (context.Request.Query.TryGetValue("shop", out var shopQuery))
                return shopQuery.ToString().Replace(".myshopify.com", "");

            return null;
        }

        private class FeatureAccessInfo
        {
            public bool IsPaidPlan { get; set; }
            public List<string> SelectedFeatures { get; set; }
        }
    }

    // Extension method for registration
    public static class FeatureAccessMiddlewareExtensions
    {
        public static IApplicationBuilder UseFeatureAccess(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<FeatureAccessMiddleware>();
        }
    }
}