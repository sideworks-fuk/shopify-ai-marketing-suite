"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Period = "今月" | "前月" | "今四半期" | "カスタム"
type ProductFilter = "全商品" | "売上上位10" | "カテゴリ別"
type CustomerSegment = "全顧客" | "新規" | "リピーター" | "VIP" | "休眠"
type ActiveTab = "sales" | "customers" | "ai"

interface AppContextType {
  selectedPeriod: Period
  setSelectedPeriod: (period: Period) => void
  selectedProductFilter: ProductFilter
  setSelectedProductFilter: (filter: ProductFilter) => void
  selectedCustomerSegment: CustomerSegment
  setSelectedCustomerSegment: (segment: CustomerSegment) => void
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  refreshData: () => void
  isLoading: boolean
  exportData: () => void
  isExporting: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("今月")
  const [selectedProductFilter, setSelectedProductFilter] = useState<ProductFilter>("全商品")
  const [selectedCustomerSegment, setSelectedCustomerSegment] = useState<CustomerSegment>("全顧客")
  const [activeTab, setActiveTab] = useState<ActiveTab>("sales")
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // セッション内でタブ状態を保持
  useEffect(() => {
    const savedTab = sessionStorage.getItem("activeTab") as ActiveTab | null
    if (savedTab) {
      setActiveTab(savedTab)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem("activeTab", activeTab)
  }, [activeTab])

  const refreshData = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 800)
  }

  const exportData = () => {
    setIsExporting(true)
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false)
      alert("データのエクスポートが完了しました")
    }, 1200)
  }

  return (
    <AppContext.Provider
      value={{
        selectedPeriod,
        setSelectedPeriod,
        selectedProductFilter,
        setSelectedProductFilter,
        selectedCustomerSegment,
        setSelectedCustomerSegment,
        activeTab,
        setActiveTab,
        refreshData,
        isLoading,
        exportData,
        isExporting,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}
