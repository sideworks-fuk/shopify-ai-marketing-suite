import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// =============================================================================
// 基本型定義
// =============================================================================

export type ViewModeType = "sales" | "quantity" | "orders"
export type SortByType = "name" | "growth" | "total" | "growth-desc" | "growth-asc" | "amount-desc"
export type FilterType = "all" | "growth" | "stable" | "decline" | "positive" | "negative" | "high_growth" | "high_decline"
export type SalesRangeType = "all" | "high" | "medium" | "low"
export type DisplayModeType = "count" | "percentage" | "summary" | "monthly"
export type ComparisonModeType = "sideBySide" | "growth"

// ✅ 年月数値ベースの期間指定（PeriodSelectorと統一）
export interface DateRangePeriod {
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
}

// ✅ 従来の日付文字列ベースは削除し、DateRangePeriodに統一
export interface ProductFilters {
  searchTerm: string
  category: string
  selectedProductIds: string[]
  productFilter: 'all' | 'top10' | 'category' | 'custom'
}

// =============================================================================
// 分析フィルター定義
// =============================================================================

export interface SalesAnalysisFilters {
  viewMode: ViewModeType
  sortBy: SortByType
  dateRange: DateRangePeriod  // ✅ 型を統一
  productFilters: ProductFilters
  comparisonMode: ComparisonModeType
  appliedFilters: {
    growthRate: FilterType
    salesRange: SalesRangeType
    category: string
    searchTerm: string
  }
}

// 商品分析フィルター
export interface ProductAnalysisFilters {
  viewMode: ViewModeType
  displayMode: DisplayModeType
  maxFrequency: number | 'custom'
  customMaxFrequency: string
  dateRange: DateRangePeriod  // ✅ 型を統一
  productFilters: ProductFilters
  showHeatmap: boolean
  showConditions: boolean
}

export interface CustomerAnalysisFilters {
  ltvFilter: string
  purchaseCountFilter: string
  lastPurchaseDays: string
  // 範囲フィルター
  purchaseCountMin: string
  purchaseCountMax: string
  lastPurchaseStartDate: string
  lastPurchaseEndDate: string
  // 表示設定
  currentPage: number
  itemsPerPage: number
  sortColumn: string
  sortDirection: 'asc' | 'desc'
}

// =============================================================================
// Store Interface
// =============================================================================

export interface AnalysisFiltersState {
  // 各分析画面のフィルター状態
  salesAnalysis: SalesAnalysisFilters
  productAnalysis: ProductAnalysisFilters
  customerAnalysis: CustomerAnalysisFilters
  
  // 共通設定
  autoApplyFilters: boolean
  rememberFilters: boolean
  
  // =============================================================================
  // 売上分析操作
  // =============================================================================
  
  setSalesViewMode: (mode: ViewModeType) => void
  setSalesSortBy: (sortBy: SortByType) => void
  setSalesComparisonMode: (mode: ComparisonModeType) => void
  setSalesAppliedFilters: (filters: SalesAnalysisFilters['appliedFilters']) => void
  updateSalesDateRange: (dateRange: Partial<DateRangePeriod>) => void  // ✅ 型を統一
  updateSalesProductFilters: (filters: Partial<ProductFilters>) => void
  resetSalesFilters: () => void
  
  // =============================================================================
  // 商品分析操作
  // =============================================================================
  
  setProductViewMode: (mode: ViewModeType) => void
  setProductDisplayMode: (mode: DisplayModeType) => void
  setProductMaxFrequency: (frequency: number | 'custom') => void
  setProductCustomMaxFrequency: (frequency: string) => void
  updateProductDateRange: (dateRange: Partial<DateRangePeriod>) => void  // ✅ 型を統一
  updateProductFilters: (filters: Partial<ProductFilters>) => void
  toggleProductHeatmap: () => void
  toggleProductConditions: () => void
  resetProductFilters: () => void
  
  // =============================================================================
  // 顧客分析操作
  // =============================================================================
  
  setCustomerLtvFilter: (filter: string) => void
  setCustomerPurchaseCountFilter: (filter: string) => void
  setCustomerLastPurchaseDays: (days: string) => void
  setCustomerPurchaseCountRange: (min: string, max: string) => void
  setCustomerLastPurchaseDateRange: (startDate: string, endDate: string) => void
  setCustomerPagination: (page: number, itemsPerPage: number) => void
  setCustomerSort: (column: string, direction: 'asc' | 'desc') => void
  resetCustomerFilters: () => void
  
  // =============================================================================
  // 共通操作
  // =============================================================================
  
  setAutoApplyFilters: (auto: boolean) => void
  setRememberFilters: (remember: boolean) => void
  resetAllFilters: () => void
  exportFilterSettings: () => string
  importFilterSettings: (settings: string) => void
}

// =============================================================================
// デフォルト値（年月ベースに統一）
// =============================================================================

// ✅ デフォルト期間：直近12ヶ月（先に関数定義）
const getDefaultDateRange = (): DateRangePeriod => {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  
  let startYear = currentYear - 1
  let startMonth = currentMonth + 1
  
  if (startMonth > 12) {
    startYear = currentYear
    startMonth = startMonth - 12
  }
  
  return {
    startYear,
    startMonth,
    endYear: currentYear,
    endMonth: currentMonth
  }
}

const defaultDateRange: DateRangePeriod = getDefaultDateRange()

const defaultProductFilters: ProductFilters = {
  searchTerm: "",
  category: "all",
  selectedProductIds: [],
  productFilter: 'all'
}

const defaultSalesAnalysisFilters: SalesAnalysisFilters = {
  viewMode: "sales",
  sortBy: "growth",
  dateRange: defaultDateRange,
  productFilters: defaultProductFilters,
  comparisonMode: "sideBySide",
  appliedFilters: {
    growthRate: "all",
    salesRange: "all",
    category: "all",
    searchTerm: ""
  }
}

const defaultProductAnalysisFilters: ProductAnalysisFilters = {
  viewMode: "sales",
  displayMode: "count",
  maxFrequency: 12,
  customMaxFrequency: "12",
  dateRange: defaultDateRange,
  productFilters: defaultProductFilters,
  showHeatmap: true,
  showConditions: true
}

const defaultCustomerAnalysisFilters: CustomerAnalysisFilters = {
  ltvFilter: "all",
  purchaseCountFilter: "all", 
  lastPurchaseDays: "all",
  purchaseCountMin: "",
  purchaseCountMax: "",
  lastPurchaseStartDate: "",
  lastPurchaseEndDate: "",
  currentPage: 1,
  itemsPerPage: 10,
  sortColumn: "purchaseCount",
  sortDirection: 'desc'
}

// =============================================================================
// Store実装
// =============================================================================

export const useAnalysisFiltersStore = create<AnalysisFiltersState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // 初期状態
        salesAnalysis: defaultSalesAnalysisFilters,
        productAnalysis: defaultProductAnalysisFilters,
        customerAnalysis: defaultCustomerAnalysisFilters,
        autoApplyFilters: true,
        rememberFilters: true,
        
        // =============================================================================
        // 売上分析操作実装
        // =============================================================================
        
        setSalesViewMode: (mode: ViewModeType) =>
          set((state) => {
            state.salesAnalysis.viewMode = mode
          }),
          
        setSalesSortBy: (sortBy: SortByType) =>
          set((state) => {
            state.salesAnalysis.sortBy = sortBy
          }),
          
        setSalesComparisonMode: (mode: ComparisonModeType) =>
          set((state) => {
            state.salesAnalysis.comparisonMode = mode
          }),
          
        setSalesAppliedFilters: (filters: SalesAnalysisFilters['appliedFilters']) =>
          set((state) => {
            state.salesAnalysis.appliedFilters = filters
          }),
          
        updateSalesDateRange: (dateRange: Partial<DateRangePeriod>) =>
          set((state) => {
            Object.assign(state.salesAnalysis.dateRange, dateRange)
          }),
          
        updateSalesProductFilters: (filters: Partial<ProductFilters>) =>
          set((state) => {
            Object.assign(state.salesAnalysis.productFilters, filters)
          }),
          
        resetSalesFilters: () =>
          set((state) => {
            state.salesAnalysis = defaultSalesAnalysisFilters
          }),
        
        // =============================================================================
        // 商品分析操作実装
        // =============================================================================
        
        setProductViewMode: (mode: ViewModeType) =>
          set((state) => {
            state.productAnalysis.viewMode = mode
          }),
          
        setProductDisplayMode: (mode: DisplayModeType) =>
          set((state) => {
            state.productAnalysis.displayMode = mode
          }),
          
        setProductMaxFrequency: (frequency: number | 'custom') =>
          set((state) => {
            state.productAnalysis.maxFrequency = frequency
          }),
          
        setProductCustomMaxFrequency: (frequency: string) =>
          set((state) => {
            state.productAnalysis.customMaxFrequency = frequency
          }),
          
        updateProductDateRange: (dateRange: Partial<DateRangePeriod>) =>
          set((state) => {
            Object.assign(state.productAnalysis.dateRange, dateRange)
          }),
          
        updateProductFilters: (filters: Partial<ProductFilters>) =>
          set((state) => {
            Object.assign(state.productAnalysis.productFilters, filters)
          }),
          
        toggleProductHeatmap: () =>
          set((state) => {
            state.productAnalysis.showHeatmap = !state.productAnalysis.showHeatmap
          }),
          
        toggleProductConditions: () =>
          set((state) => {
            state.productAnalysis.showConditions = !state.productAnalysis.showConditions
          }),
          
        resetProductFilters: () =>
          set((state) => {
            state.productAnalysis = defaultProductAnalysisFilters
          }),
        
        // =============================================================================
        // 顧客分析操作実装
        // =============================================================================
        
        setCustomerLtvFilter: (filter: string) =>
          set((state) => {
            state.customerAnalysis.ltvFilter = filter
          }),
          
        setCustomerPurchaseCountFilter: (filter: string) =>
          set((state) => {
            state.customerAnalysis.purchaseCountFilter = filter
          }),
          
        setCustomerLastPurchaseDays: (days: string) =>
          set((state) => {
            state.customerAnalysis.lastPurchaseDays = days
          }),
          
        setCustomerPurchaseCountRange: (min: string, max: string) =>
          set((state) => {
            state.customerAnalysis.purchaseCountMin = min
            state.customerAnalysis.purchaseCountMax = max
          }),
          
        setCustomerLastPurchaseDateRange: (startDate: string, endDate: string) =>
          set((state) => {
            state.customerAnalysis.lastPurchaseStartDate = startDate
            state.customerAnalysis.lastPurchaseEndDate = endDate
          }),
          
        setCustomerPagination: (page: number, itemsPerPage: number) =>
          set((state) => {
            state.customerAnalysis.currentPage = page
            state.customerAnalysis.itemsPerPage = itemsPerPage
          }),
          
        setCustomerSort: (column: string, direction: 'asc' | 'desc') =>
          set((state) => {
            state.customerAnalysis.sortColumn = column
            state.customerAnalysis.sortDirection = direction
          }),
          
        resetCustomerFilters: () =>
          set((state) => {
            state.customerAnalysis = defaultCustomerAnalysisFilters
          }),
        
        // =============================================================================
        // 共通操作実装
        // =============================================================================
        
        setAutoApplyFilters: (auto: boolean) =>
          set((state) => {
            state.autoApplyFilters = auto
          }),
          
        setRememberFilters: (remember: boolean) =>
          set((state) => {
            state.rememberFilters = remember
          }),
          
        resetAllFilters: () =>
          set((state) => {
            state.salesAnalysis = defaultSalesAnalysisFilters
            state.productAnalysis = defaultProductAnalysisFilters
            state.customerAnalysis = defaultCustomerAnalysisFilters
          }),
          
        exportFilterSettings: () => {
          const state = get()
          return JSON.stringify({
            salesAnalysis: state.salesAnalysis,
            productAnalysis: state.productAnalysis,
            customerAnalysis: state.customerAnalysis,
            autoApplyFilters: state.autoApplyFilters,
            rememberFilters: state.rememberFilters,
            exportedAt: new Date().toISOString()
          }, null, 2)
        },
        
        importFilterSettings: (settings: string) => {
          try {
            const parsed = JSON.parse(settings)
            set((state) => {
              if (parsed.salesAnalysis) state.salesAnalysis = parsed.salesAnalysis
              if (parsed.productAnalysis) state.productAnalysis = parsed.productAnalysis
              if (parsed.customerAnalysis) state.customerAnalysis = parsed.customerAnalysis
              if (typeof parsed.autoApplyFilters === 'boolean') state.autoApplyFilters = parsed.autoApplyFilters
              if (typeof parsed.rememberFilters === 'boolean') state.rememberFilters = parsed.rememberFilters
            })
          } catch (error) {
            console.error('Failed to import filter settings:', error)
          }
        },
      })),
      {
        name: 'analysis-filters-storage',
        // 設定が有効な場合のみ永続化
        partialize: (state) => state.rememberFilters ? {
          salesAnalysis: state.salesAnalysis,
          productAnalysis: state.productAnalysis,
          customerAnalysis: state.customerAnalysis,
          autoApplyFilters: state.autoApplyFilters,
          rememberFilters: state.rememberFilters
        } : {
          autoApplyFilters: state.autoApplyFilters,
          rememberFilters: state.rememberFilters
        },
        // SSR対応: ハイドレーション問題を解決
        onRehydrateStorage: () => (state) => {
          // ハイドレーション完了後の処理
          if (state) {
            console.log('Analysis filters state hydrated:', state)
          }
        },
      }
    ),
    {
      name: 'analysis-filters-store',
    }
  )
)

// =============================================================================
// 便利なセレクター & カスタムフック
// =============================================================================

// 売上分析フィルター専用フック
export const useSalesAnalysisFilters = () => {
  const filters = useAnalysisFiltersStore((state) => state.salesAnalysis)
  
  // アクション関数を個別に取得（メモ化される）
  const setViewMode = useAnalysisFiltersStore((state) => state.setSalesViewMode)
  const setSortBy = useAnalysisFiltersStore((state) => state.setSalesSortBy)
  const setComparisonMode = useAnalysisFiltersStore((state) => state.setSalesComparisonMode)
  const setAppliedFilters = useAnalysisFiltersStore((state) => state.setSalesAppliedFilters)
  const updateDateRange = useAnalysisFiltersStore((state) => state.updateSalesDateRange)
  const updateProductFilters = useAnalysisFiltersStore((state) => state.updateSalesProductFilters)
  const resetFilters = useAnalysisFiltersStore((state) => state.resetSalesFilters)
  
  return { 
    filters, 
    setViewMode,
    setSortBy,
    setComparisonMode,
    setAppliedFilters,
    updateDateRange,
    updateProductFilters,
    resetFilters
  }
}

// 商品分析フィルター専用フック
export const useProductAnalysisFilters = () => {
  const filters = useAnalysisFiltersStore((state) => state.productAnalysis)
  
  // アクション関数を個別に取得（メモ化される）
  const setViewMode = useAnalysisFiltersStore((state) => state.setProductViewMode)
  const setDisplayMode = useAnalysisFiltersStore((state) => state.setProductDisplayMode)
  const setMaxFrequency = useAnalysisFiltersStore((state) => state.setProductMaxFrequency)
  const setCustomMaxFrequency = useAnalysisFiltersStore((state) => state.setProductCustomMaxFrequency)
  const updateDateRange = useAnalysisFiltersStore((state) => state.updateProductDateRange)
  const updateProductFilters = useAnalysisFiltersStore((state) => state.updateProductFilters)
  const toggleHeatmap = useAnalysisFiltersStore((state) => state.toggleProductHeatmap)
  const toggleConditions = useAnalysisFiltersStore((state) => state.toggleProductConditions)
  const resetFilters = useAnalysisFiltersStore((state) => state.resetProductFilters)
  
  return { 
    filters,
    setViewMode,
    setDisplayMode,
    setMaxFrequency,
    setCustomMaxFrequency,
    updateDateRange,
    updateProductFilters,
    toggleHeatmap,
    toggleConditions,
    resetFilters
  }
}

// 顧客分析フィルター専用フック
export const useCustomerAnalysisFilters = () => {
  const filters = useAnalysisFiltersStore((state) => state.customerAnalysis)
  
  // アクション関数を個別に取得（メモ化される）
  const setLtvFilter = useAnalysisFiltersStore((state) => state.setCustomerLtvFilter)
  const setPurchaseCountFilter = useAnalysisFiltersStore((state) => state.setCustomerPurchaseCountFilter)
  const setLastPurchaseDays = useAnalysisFiltersStore((state) => state.setCustomerLastPurchaseDays)
  const setPurchaseCountRange = useAnalysisFiltersStore((state) => state.setCustomerPurchaseCountRange)
  const setLastPurchaseDateRange = useAnalysisFiltersStore((state) => state.setCustomerLastPurchaseDateRange)
  const setPagination = useAnalysisFiltersStore((state) => state.setCustomerPagination)
  const setSort = useAnalysisFiltersStore((state) => state.setCustomerSort)
  const resetFilters = useAnalysisFiltersStore((state) => state.resetCustomerFilters)
  
  return { 
    filters,
    setLtvFilter,
    setPurchaseCountFilter,
    setLastPurchaseDays,
    setPurchaseCountRange,
    setLastPurchaseDateRange,
    setPagination,
    setSort,
    resetFilters
  }
}

// アクティブフィルター検出
export const useActiveFiltersCount = () => 
  useAnalysisFiltersStore((state) => {
    let count = 0
    
    // 売上分析
    const sales = state.salesAnalysis
    if (sales.viewMode !== "sales") count++
    if (sales.sortBy !== "growth") count++
    if (sales.comparisonMode !== "sideBySide") count++
    if (sales.productFilters.searchTerm !== "") count++
    if (sales.productFilters.category !== "all") count++
    if (sales.appliedFilters.growthRate !== "all") count++
    if (sales.appliedFilters.salesRange !== "all") count++
    
    // 商品分析
    const product = state.productAnalysis
    if (product.viewMode !== "sales") count++
    if (product.displayMode !== "count") count++
    if (product.maxFrequency !== 12) count++
    if (product.productFilters.searchTerm !== "") count++
    if (product.productFilters.category !== "all") count++
    
    // 顧客分析
    const customer = state.customerAnalysis
    if (customer.ltvFilter !== "all") count++
    if (customer.purchaseCountFilter !== "all") count++
    if (customer.lastPurchaseDays !== "all") count++
    if (customer.purchaseCountMin !== "" || customer.purchaseCountMax !== "") count++
    if (customer.lastPurchaseStartDate !== "" || customer.lastPurchaseEndDate !== "") count++
    
    return count
  }) 