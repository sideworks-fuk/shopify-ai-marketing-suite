// 前年同月比機能の型定義

export interface YearOverYearData {
  productId: string
  productName: string
  category: string
  currentYear: number
  previousYear: number
  currentValue: number
  previousValue: number
  growthRate: number
}

export interface MonthlyYearOverYearData {
  productId: string
  productName: string
  category: string
  monthlyData: Array<{
    month: string
    currentValue: number
    previousValue: number
    growthRate: number
  }>
}

export interface YearComparison {
  year: number
  previousYear: number
  summaryData: YearOverYearData[]
  monthlyData: MonthlyYearOverYearData[]
}

export interface MultiYearComparisonResponse {
  comparisons: YearComparison[]
}

export type ViewMode = "sales" | "quantity" | "orders"
export type FilterType = "all" | "growth" | "stable" | "decline"
export type SortBy = "name" | "growth-desc" | "growth-asc" | "amount-desc"
export type DisplayType = "summary" | "monthly" 