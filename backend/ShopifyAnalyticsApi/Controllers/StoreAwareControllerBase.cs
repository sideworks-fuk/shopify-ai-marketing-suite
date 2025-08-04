using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

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
        /// <summary>
        /// 現在のストアID
        /// </summary>
        protected int StoreId
        {
            get
            {
                if (HttpContext.Items.TryGetValue("StoreId", out var storeId) && storeId is int id)
                {
                    return id;
                }
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