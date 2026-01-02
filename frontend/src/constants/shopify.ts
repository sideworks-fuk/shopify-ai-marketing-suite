/**
 * Shopify関連の定数
 * 環境変数で設定可能、未設定時はフォールバック値を使用
 */

/**
 * Shopify App Store URL
 * 環境変数: NEXT_PUBLIC_SHOPIFY_APP_STORE_URL
 */
export const SHOPIFY_APP_STORE_URL = 
  process.env.NEXT_PUBLIC_SHOPIFY_APP_STORE_URL || '';

/**
 * アプリタイプ
 * - Public: 公開アプリ（App Store経由のみ）
 * - Custom: カスタムアプリ（直接インストール可能）
 */
export type ShopifyAppType = 'Public' | 'Custom';

export const SHOPIFY_APP_TYPE: ShopifyAppType = 
  (process.env.NEXT_PUBLIC_SHOPIFY_APP_TYPE as ShopifyAppType) || 'Public';
