"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

// 型定義
export type TabType = "sales" | "customers" | "ai"
export type PeriodType = "thisMonth" | "lastMonth" | "thisQuarter" | "custom"
export type CustomerSegmentType = "all" | "new" | "returning" | "vip"
export type ProductCategoryType = "all" | "electronics" | "clothing" | "books" | "home"

interface AppContextType {
  // タブ管理
  activeTab: TabType
  setActiveTab: (tab: TabType) => void

  // 期間選択
  selectedPeriod: PeriodType
  setSelectedPeriod: (period: PeriodType) => void

  // 顧客セグメント
  selectedCustomerSegment: CustomerSegmentType
  setSelectedCustomerSegment: (segment: CustomerSegmentType) => void

  // 商品カテゴリ
  selectedProductCategory: ProductCategoryType
  setSelectedProductCategory: (category: ProductCategoryType) => void

  // データ操作
  refreshData: () => Promise<void>
  exportData: () => Promise<void>

  // ローディング状態
  isLoading: boolean
  isExporting: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  // 状態管理
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("activeTab") as TabType) || "sales"
    }
    return "sales"
  })

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("thisMonth")
  const [selectedCustomerSegment, setSelectedCustomerSegment] = useState<CustomerSegmentType>("all")
  const [selectedProductCategory, setSelectedProductCategory] = useState<ProductCategoryType>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // タブ切り替え関数
  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("activeTab", tab)
    }
  }, [])

  // データ更新関数
  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      // データ更新ロジック（実装予定）
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error("データ更新エラー:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // データエクスポート関数
  const exportData = useCallback(async () => {
    setIsExporting(true)
    try {
      // エクスポートロジック（実装予定）
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      console.error("エクスポートエラー:", error)
    } finally {
      setIsExporting(false)
    }
  }, [])

  const value: AppContextType = {
    activeTab,
    setActiveTab,
    selectedPeriod,
    setSelectedPeriod,
    selectedCustomerSegment,
    setSelectedCustomerSegment,
    selectedProductCategory,
    setSelectedProductCategory,
    refreshData,
    exportData,
    isLoading,
    isExporting,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}
