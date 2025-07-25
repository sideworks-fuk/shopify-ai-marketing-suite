// Shopify API client configuration
export interface ShopifyConfig {
  apiKey: string
  apiSecret: string
  scopes: string
  shopDomain?: string
  accessToken?: string
}

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

export class ShopifyAPI {
  private config: ShopifyConfig
  private baseUrl: string

  constructor(config: ShopifyConfig) {
    this.config = config
    this.baseUrl = config.shopDomain ? `https://${config.shopDomain}.myshopify.com/admin/api/2023-10` : ""
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.config.accessToken) {
      throw new Error("Access token is required for API requests")
    }

    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": this.config.accessToken,
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Products API
  async getProducts(limit = 50, page_info?: string): Promise<{ products: ShopifyProduct[] }> {
    let endpoint = `/products.json?limit=${limit}`
    if (page_info) {
      endpoint += `&page_info=${page_info}`
    }
    return this.makeRequest(endpoint)
  }

  async getProduct(productId: string): Promise<{ product: ShopifyProduct }> {
    return this.makeRequest(`/products/${productId}.json`)
  }

  // Orders API
  async getOrders(limit = 50, status = "any", page_info?: string): Promise<{ orders: ShopifyOrder[] }> {
    let endpoint = `/orders.json?limit=${limit}&status=${status}`
    if (page_info) {
      endpoint += `&page_info=${page_info}`
    }
    return this.makeRequest(endpoint)
  }

  async getOrder(orderId: string): Promise<{ order: ShopifyOrder }> {
    return this.makeRequest(`/orders/${orderId}.json`)
  }

  // Customers API
  async getCustomers(limit = 50, page_info?: string): Promise<{ customers: ShopifyCustomer[] }> {
    let endpoint = `/customers.json?limit=${limit}`
    if (page_info) {
      endpoint += `&page_info=${page_info}`
    }
    return this.makeRequest(endpoint)
  }

  async getCustomer(customerId: string): Promise<{ customer: ShopifyCustomer }> {
    return this.makeRequest(`/customers/${customerId}.json`)
  }

  // Analytics methods
  async getOrdersByDateRange(startDate: string, endDate: string): Promise<{ orders: ShopifyOrder[] }> {
    const endpoint = `/orders.json?created_at_min=${startDate}&created_at_max=${endDate}&limit=250`
    return this.makeRequest(endpoint)
  }

  async getCustomersByDateRange(startDate: string, endDate: string): Promise<{ customers: ShopifyCustomer[] }> {
    const endpoint = `/customers.json?created_at_min=${startDate}&created_at_max=${endDate}&limit=250`
    return this.makeRequest(endpoint)
  }
}

// Utility functions for data analysis
export function calculatePurchaseFrequency(orders: ShopifyOrder[]): Map<string, Map<string, number>> {
  const customerProductFrequency = new Map<string, Map<string, number>>()

  orders.forEach((order) => {
    const customerId = order.customer.id

    order.line_items.forEach((item) => {
      const productId = item.product_id

      if (!customerProductFrequency.has(customerId)) {
        customerProductFrequency.set(customerId, new Map())
      }

      const customerMap = customerProductFrequency.get(customerId)!
      const currentCount = customerMap.get(productId) || 0
      customerMap.set(productId, currentCount + item.quantity)
    })
  })

  return customerProductFrequency
}

export function calculateCustomerSegments(customers: ShopifyCustomer[]): {
  new: ShopifyCustomer[]
  repeat: ShopifyCustomer[]
  vip: ShopifyCustomer[]
  dormant: ShopifyCustomer[]
} {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  return {
    new: customers.filter((c) => c.orders_count === 1),
    repeat: customers.filter((c) => c.orders_count >= 2 && c.orders_count < 10),
    vip: customers.filter((c) => c.orders_count >= 10 || Number.parseFloat(c.total_spent) >= 100000),
    dormant: customers.filter((c) => new Date(c.updated_at) < sixMonthsAgo),
  }
}

export function calculateSalesMetrics(orders: ShopifyOrder[]) {
  const totalSales = orders.reduce((sum, order) => sum + Number.parseFloat(order.total_price), 0)
  const totalOrders = orders.length
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

  const productSales = new Map<string, { quantity: number; revenue: number; title: string }>()

  orders.forEach((order) => {
    order.line_items.forEach((item) => {
      const existing = productSales.get(item.product_id) || { quantity: 0, revenue: 0, title: item.title }
      existing.quantity += item.quantity
      existing.revenue += Number.parseFloat(item.price) * item.quantity
      existing.title = item.title
      productSales.set(item.product_id, existing)
    })
  })

  return {
    totalSales,
    totalOrders,
    averageOrderValue,
    productSales: Array.from(productSales.entries()).map(([id, data]) => ({
      productId: id,
      ...data,
    })),
  }
}
