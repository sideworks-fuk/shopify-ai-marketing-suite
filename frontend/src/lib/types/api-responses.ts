/**
 * API レスポンス型定義
 * 
 * @author YUKI
 * @date 2025-08-02
 * @description 統一されたAPIレスポンス型定義（any型の部分修正）
 */

// =============================================================================
// 基本レスポンス型
// =============================================================================

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
  timestamp: string
  errors?: string[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// =============================================================================
// 休眠顧客分析 レスポンス型
// =============================================================================

export interface DormantCustomerDetail {
  customerId: string
  customerName: string
  email: string
  lastPurchaseDate: string
  daysSincePurchase: number
  totalOrderValue: number
  totalOrders: number
  segment: string
  reactivationProbability: number
  riskLevel: 'high' | 'medium' | 'low'
}

export interface DormantSummary {
  totalDormantCustomers: number
  averageDormancyDays: number
  totalLostValue: number
  segmentCounts: {
    [key: string]: number
  }
  reactivationRate: number
}

export interface DormantSegmentDistribution {
  segment: string
  count: number
  percentage: number
  averageDormancyDays: number
  totalValue: number
}

// 実際のAPI構造に合わせたレスポンス型（暫定的に緩い型定義）
export interface DormantCustomersResponse {
  success: boolean
  data: {
    customers?: DormantCustomerDetail[]
    pagination?: {
      page: number
      pageSize: number
      totalCount: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    totalDormantCustomers?: number
    segmentCounts?: {
      [key: string]: number
    }
    segmentRevenue?: {
      [key: string]: number
    }
  } | null
  message: string
  timestamp: string
  summary?: DormantSummary
  segments?: DormantSegmentDistribution[]
}

// =============================================================================
// 前年同月比分析 レスポンス型
// =============================================================================

export interface YearOverYearProductData {
  productId: string
  productName: string
  currentYear: {
    year: number
    totalSales: number
    totalQuantity: number
    totalOrders: number
    monthlyData: MonthlyProductData[]
  }
  previousYear: {
    year: number
    totalSales: number
    totalQuantity: number
    totalOrders: number
    monthlyData: MonthlyProductData[]
  }
  growthRates: {
    salesGrowth: number
    quantityGrowth: number
    ordersGrowth: number
  }
  trend: 'up' | 'down' | 'stable'
}

export interface MonthlyProductData {
  month: string // "2024-01" format
  sales: number
  quantity: number
  orders: number
}

export interface YearOverYearSummary {
  totalProducts: number
  averageGrowthRate: number
  topGrowingProducts: string[]
  decliningProducts: string[]
  stableProducts: string[]
}

export interface YearOverYearResponse extends ApiResponse<YearOverYearProductData[]> {
  summary: YearOverYearSummary
  availableYears: number[]
}

// =============================================================================
// 購入回数分析 レスポンス型
// =============================================================================

export interface PurchaseCountTierData {
  purchaseCount: number | string // 1, 2, "3-5", "6-10", "11+"
  label: string
  currentPeriod: {
    customerCount: number
    totalRevenue: number
    averageOrderValue: number
  }
  previousPeriod: {
    customerCount: number
    totalRevenue: number
    averageOrderValue: number
  }
  growthRates: {
    customerGrowth: number
    revenueGrowth: number
    aovGrowth: number
  }
}

export interface PurchaseCountSummary {
  totalCustomers: number
  totalRevenue: number
  averagePurchaseCount: number
  retentionRate: number
}

export interface PurchaseCountResponse extends ApiResponse<PurchaseCountTierData[]> {
  summary: PurchaseCountSummary
  comparisonPeriod: {
    current: string
    previous: string
  }
}

// =============================================================================
// 月次売上分析 レスポンス型
// =============================================================================

export interface MonthlySalesData {
  month: string // "2024-01" format
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  newCustomers: number
  returningCustomers: number
}

export interface MonthlySalesResponse extends ApiResponse<MonthlySalesData[]> {
  summary: {
    totalPeriodSales: number
    totalPeriodOrders: number
    averageMonthlyGrowth: number
    seasonalTrends: {
      peakMonth: string
      lowMonth: string
    }
  }
}

// =============================================================================
// エラーレスポンス型
// =============================================================================

export interface ApiErrorResponse {
  success: false
  message: string
  errors: string[]
  timestamp: string
  statusCode: number
  path: string
}

// =============================================================================
// 型ガード関数
// =============================================================================

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value &&
    'message' in value &&
    'timestamp' in value
  )
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as any).success === false &&
    'errors' in value
  )
}

export function isDormantCustomersResponse(value: unknown): value is DormantCustomersResponse {
  return (
    isApiResponse(value) &&
    'summary' in value &&
    'segments' in value
  )
}

export function isYearOverYearResponse(value: unknown): value is YearOverYearResponse {
  return (
    isApiResponse(value) &&
    'summary' in value &&
    'availableYears' in value
  )
}