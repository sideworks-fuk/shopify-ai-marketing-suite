// ====================================================================
// このファイルは非推奨です - DEPRECATED
// ====================================================================
// 
// Shopify APIへの直接アクセスは、セキュリティとアーキテクチャの観点から
// バックエンド経由で行うべきです。
// 
// 代替方法:
// - バックエンドAPI経由でShopifyデータにアクセスしてください
// - エンドポイント例:
//   - GET /api/products
//   - GET /api/customers
//   - GET /api/orders
// 
// バックエンドURL: process.env.NEXT_PUBLIC_BACKEND_URL
// 
// ====================================================================

// 型定義は引き続き使用可能です
export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  vendor: string
  product_type: string
  created_at: string
  updated_at: string
  published_at: string
  variants: ShopifyVariant[]
  images: ShopifyImage[]
  options: ShopifyOption[]
  tags: string
  status: string
}

export interface ShopifyVariant {
  id: string
  product_id: string
  title: string
  price: string
  sku: string
  inventory_quantity: number
  weight: number
  weight_unit: string
}

export interface ShopifyImage {
  id: string
  product_id: string
  src: string
  alt: string
  width: number
  height: number
}

export interface ShopifyOption {
  id: string
  product_id: string
  name: string
  position: number
  values: string[]
}

export interface ShopifyOrder {
  id: string
  order_number: string
  email: string
  created_at: string
  updated_at: string
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  financial_status: string
  fulfillment_status: string
  customer: ShopifyCustomer
  line_items: ShopifyLineItem[]
  shipping_address: ShopifyAddress
  billing_address: ShopifyAddress
}

export interface ShopifyCustomer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  created_at: string
  updated_at: string
  orders_count: number
  total_spent: string
  tags: string
  state: string
  addresses: ShopifyAddress[]
}

export interface ShopifyLineItem {
  id: string
  product_id: string
  variant_id: string
  title: string
  quantity: number
  price: string
  total_discount: string
  sku: string
  vendor: string
}

export interface ShopifyAddress {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  company: string
  address1: string
  address2: string
  city: string
  province: string
  country: string
  zip: string
  phone: string
}

// ====================================================================
// 以下のクラスと関数は非推奨です
// バックエンドAPIを使用してください
// ====================================================================

/**
 * @deprecated ShopifyAPIクラスは非推奨です。バックエンドAPI経由でアクセスしてください。
 */
export class ShopifyAPI {
  constructor(config: any) {
    console.warn('ShopifyAPI is deprecated. Use backend API endpoints instead.');
    throw new Error('ShopifyAPI is deprecated. Please use backend API endpoints.');
  }
}

/**
 * @deprecated この関数は非推奨です。バックエンドAPIの分析エンドポイントを使用してください。
 */
export function calculatePurchaseFrequency(orders: ShopifyOrder[]): Map<string, Map<string, number>> {
  console.warn('calculatePurchaseFrequency is deprecated. Use backend analysis endpoints.');
  const customerProductFrequency = new Map<string, Map<string, number>>()
  // 実装は保持（型定義のために必要な場合）
  return customerProductFrequency
}

/**
 * @deprecated この関数は非推奨です。バックエンドAPIの顧客セグメントエンドポイントを使用してください。
 */
export function calculateCustomerSegments(customers: ShopifyCustomer[]): {
  new: ShopifyCustomer[]
  repeat: ShopifyCustomer[]
  vip: ShopifyCustomer[]
  dormant: ShopifyCustomer[]
} {
  console.warn('calculateCustomerSegments is deprecated. Use backend customer segment endpoints.');
  return {
    new: [],
    repeat: [],
    vip: [],
    dormant: []
  }
}

/**
 * @deprecated この関数は非推奨です。バックエンドAPIの売上分析エンドポイントを使用してください。
 */
export function calculateSalesMetrics(orders: ShopifyOrder[]) {
  console.warn('calculateSalesMetrics is deprecated. Use backend sales analysis endpoints.');
  return {
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    productSales: []
  }
}