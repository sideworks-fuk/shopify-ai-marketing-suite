import {
  type ShopifyOrder,
  type ShopifyCustomer,
  type ShopifyProduct,
  calculatePurchaseFrequency,
  calculateCustomerSegments,
  calculateSalesMetrics,
} from "./shopify-deprecated"

export interface AnalyticsData {
  salesMetrics: {
    totalSales: number
    totalOrders: number
    averageOrderValue: number
    productSales: Array<{
      productId: string
      title: string
      quantity: number
      revenue: number
    }>
  }
  customerSegments: {
    new: ShopifyCustomer[]
    repeat: ShopifyCustomer[]
    vip: ShopifyCustomer[]
    dormant: ShopifyCustomer[]
  }
  purchaseFrequency: Map<string, Map<string, number>>
}

export class DataService {
  private shopDomain: string
  private accessToken: string

  constructor(shopDomain: string, accessToken: string) {
    this.shopDomain = shopDomain
    this.accessToken = accessToken
  }

  private async fetchShopifyData(endpoint: string, params: Record<string, string> = {}) {
    const searchParams = new URLSearchParams({
      shop: this.shopDomain,
      access_token: this.accessToken,
      ...params,
    })

    const response = await fetch(`/api/shopify${endpoint}?${searchParams}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${endpoint}`)
    }

    return response.json()
  }

  async getProducts(limit = 50): Promise<ShopifyProduct[]> {
    const data = await this.fetchShopifyData("/products", { limit: limit.toString() })
    return data.products
  }

  async getOrders(limit = 250, startDate?: string, endDate?: string): Promise<ShopifyOrder[]> {
    const params: Record<string, string> = { limit: limit.toString() }
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const data = await this.fetchShopifyData("/orders", params)
    return data.orders
  }

  async getCustomers(limit = 250): Promise<ShopifyCustomer[]> {
    const data = await this.fetchShopifyData("/customers", { limit: limit.toString() })
    return data.customers
  }

  async getAnalyticsData(period = "current_month"): Promise<AnalyticsData> {
    // Calculate date range based on period
    const now = new Date()
    let startDate: string
    let endDate: string = now.toISOString()

    switch (period) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        break
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        startDate = lastMonth.toISOString()
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
        break
      case "current_quarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        startDate = quarterStart.toISOString()
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }

    // Fetch data in parallel
    const [orders, customers] = await Promise.all([this.getOrders(250, startDate, endDate), this.getCustomers(250)])

    // Calculate analytics
    const salesMetrics = calculateSalesMetrics(orders)
    const customerSegments = calculateCustomerSegments(customers)
    const purchaseFrequency = calculatePurchaseFrequency(orders)

    return {
      salesMetrics,
      customerSegments,
      purchaseFrequency,
    }
  }

  async getPurchaseFrequencyAnalysis(): Promise<
    Array<{
      productName: string
      productId: string
      category: string
      totalCustomers: number
      frequencies: Array<{
        count: number
        customers: number
        percentage: number
      }>
    }>
  > {
    const orders = await this.getOrders(250)
    const purchaseFrequency = calculatePurchaseFrequency(orders)

    // Group by product
    const productFrequency = new Map<string, Map<number, number>>()
    const productNames = new Map<string, string>()

    // Collect product names from orders
    orders.forEach((order) => {
      order.line_items.forEach((item: any) => {
        productNames.set(item.product_id, item.title)
      })
    })

    // Calculate frequency distribution for each product
    purchaseFrequency.forEach((customerProducts: Map<string, number>, customerId: string) => {
      customerProducts.forEach((quantity: number, productId: string) => {
        if (!productFrequency.has(productId)) {
          productFrequency.set(productId, new Map())
        }

        const productMap = productFrequency.get(productId)!
        const currentCount = productMap.get(quantity) || 0
        productMap.set(quantity, currentCount + 1)
      })
    })

    // Convert to analysis format
    const analysis = Array.from(productFrequency.entries()).map(([productId, frequencies]) => {
      const totalCustomers = Array.from(frequencies.values()).reduce((sum, count) => sum + count, 0)

      // Create frequency array for 1-10+ purchases
      const frequencyArray = Array.from({ length: 10 }, (_, index) => {
        const count = index + 1
        const customers = frequencies.get(count) || 0
        const percentage = totalCustomers > 0 ? Math.round((customers / totalCustomers) * 100) : 0

        return {
          count,
          customers,
          percentage,
        }
      })

      const productName = productNames.get(productId) || `Product ${productId}`
      
      // 商品名からカテゴリーを推定
      const inferCategory = (name: string): string => {
        const lowerName = name.toLowerCase()
        if (lowerName.includes('デコ缶') || lowerName.includes('カット') || lowerName.includes('ケーキ')) {
          return 'cake'
        } else if (lowerName.includes('パウンド')) {
          return 'pound_cake'
        } else if (lowerName.includes('プロテーン') || lowerName.includes('サプリ')) {
          return 'supplement'
        } else if (lowerName.includes('ギフト') || lowerName.includes('ボックス')) {
          return 'gift'
        } else if (lowerName.includes('クラフト') || lowerName.includes('イーグラップ')) {
          return 'craft'
        }
        return 'other'
      }

      return {
        productName,
        productId,
        category: inferCategory(productName),
        totalCustomers,
        frequencies: frequencyArray,
      }
    })

    return analysis.sort((a, b) => b.totalCustomers - a.totalCustomers)
  }
}
