using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// ストアコンテキストを利用する基底コントローラー
    /// マルチテナント対応のため、全てのストア関連APIはこのクラスを継承する
    /// </summary>
    [Authorize]
    [ApiController]
    public abstract class StoreAwareControllerBase : ControllerBase
    {
        private readonly ILogger _logger;

        protected StoreAwareControllerBase(ILogger logger)
        {
            _logger = logger;
        }
        /// <summary>
        /// 現在のストアID
        /// </summary>
        protected int StoreId
        {
            get
            {
                // HttpContext.Itemsの内容をデバッグログに出力
                var itemsKeys = HttpContext.Items.Keys.Cast<string>().ToArray();
                _logger.LogDebug("StoreAwareControllerBase - HttpContext.Items keys: [{Keys}]", string.Join(", ", itemsKeys));
                
                // ユーザー情報も確認
                var user = HttpContext.User;
                _logger.LogDebug("StoreAwareControllerBase - User: {User}, IsAuthenticated: {IsAuthenticated}", 
                    user?.Identity?.Name ?? "null", user?.Identity?.IsAuthenticated ?? false);
                
                if (user?.Identity?.IsAuthenticated == true)
                {
                    var allClaims = user.Claims.Select(c => $"{c.Type}={c.Value}").ToArray();
                    _logger.LogDebug("StoreAwareControllerBase - All claims: [{Claims}]", string.Join(", ", allClaims));
                }

                if (HttpContext.Items.TryGetValue("StoreId", out var storeId) && storeId is int id)
                {
                    _logger.LogDebug("StoreAwareControllerBase - StoreId found: {StoreId}", id);
                    return id;
                }
                
                _logger.LogError("StoreAwareControllerBase - StoreId not found in HttpContext.Items. Available keys: [{Keys}]", 
                    string.Join(", ", itemsKeys));
                throw new UnauthorizedAccessException("Store context is not available");
            }
        }

        /// <summary>
        /// 現在のテナントID
        /// </summary>
        protected string TenantId
        {
            get
            {
                if (HttpContext.Items.TryGetValue("TenantId", out var tenantId) && tenantId is string id)
                {
                    return id;
                }
                return "default-tenant"; // 既存データの互換性のため
            }
        }

        /// <summary>
        /// 現在のショップドメイン（オプション）
        /// </summary>
        protected string? ShopDomain
        {
            get
            {
                if (HttpContext.Items.TryGetValue("ShopDomain", out var domain) && domain is string shopDomain)
                {
                    return shopDomain;
                }
                return null;
            }
        }

        /// <summary>
        /// ストアコンテキストが利用可能かチェック
        /// </summary>
        protected bool HasStoreContext => HttpContext.Items.ContainsKey("StoreId");

        /// <summary>
        /// テナントコンテキストが利用可能かチェック
        /// </summary>
        protected bool HasTenantContext => HttpContext.Items.ContainsKey("TenantId");

        /// <summary>
        /// ログ出力用のストアコンテキスト情報を取得
        /// </summary>
        protected Dictionary<string, object?> GetStoreContextForLogging()
        {
            return new Dictionary<string, object?>
            {
                ["StoreId"] = HasStoreContext ? StoreId : null,
                ["TenantId"] = HasTenantContext ? TenantId : null,
                ["ShopDomain"] = ShopDomain
            };
        }
    }
}