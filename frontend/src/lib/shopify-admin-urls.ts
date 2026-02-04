/**
 * Shopify Admin 画面のURLを生成するヘルパー
 * 例: 顧客画面 https://admin.shopify.com/store/{store-slug}/customers/{shopify-customer-id}
 */

const ADMIN_BASE = "https://admin.shopify.com/store"

/**
 * myshopify.com ドメインからストアスラッグ（store-slug）を取得する。
 * 例: "acs-goods-3.myshopify.com" → "acs-goods-3"
 */
export function getStoreSlugFromShopDomain(shopDomain: string | null | undefined): string | null {
  if (!shopDomain || typeof shopDomain !== "string") return null
  const s = shopDomain.trim().toLowerCase()
  if (!s) return null
  return s.replace(/\.myshopify\.com$/i, "")
}

/**
 * Shopify Admin の顧客画面URLを生成する。
 * @param shopDomain - ストアドメイン（例: acs-goods-3.myshopify.com）
 * @param shopifyCustomerId - Shopify顧客ID（例: 9755569291545）
 * @returns URL または生成できない場合は null
 */
export function buildShopifyCustomerAdminUrl(
  shopDomain: string | null | undefined,
  shopifyCustomerId: string | null | undefined
): string | null {
  const slug = getStoreSlugFromShopDomain(shopDomain)
  const id = shopifyCustomerId != null && String(shopifyCustomerId).trim() !== ""
    ? String(shopifyCustomerId).trim()
    : null
  if (!slug || !id) return null
  return `${ADMIN_BASE}/${slug}/customers/${id}`
}
