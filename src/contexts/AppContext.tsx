"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { FilterProvider } from "./FilterContext"
import { ZustandProvider } from "@/components/providers/ZustandProvider"

export type TabType = "sales" | "customers" | "ai" | "purchase"
export type PeriodType = "thisMonth" | "lastMonth" | "thisQuarter" | "custom"
export type CustomerSegmentType = "全顧客" | "新規" | "リピーター" | "VIP" | "休眠"

export interface MenuItem {
  id: string
  label: string
  icon: string
  href?: string  // Optional for parent items
  category: "sales" | "purchase" | "customers" | "ai-insights"
  isImplemented: boolean
  description?: string
  children?: MenuItem[]  // For submenu items
}

export const menuStructure: MenuItem[] = [
  // 一時的に非表示
  // {
  //   id: "sales-dashboard",
  //   label: "売上ダッシュボード",
  //   icon: "📊",
  //   href: "/sales/dashboard",
  //   category: "sales",
  //   isImplemented: true,
  //   description: "売上の全体像と主要KPIを確認"
  // },
  {
    id: "year-over-year",
    label: "前年同月比【商品】",
    icon: "📈",
    href: "/sales/year-over-year",
    category: "sales",
    isImplemented: true,
    description: "商品別の売上トレンドを前年と比較"
  },
  {
    id: "purchase-frequency",
    label: "購入頻度【商品】",
    icon: "🔄",
    href: "/sales/purchase-frequency",
    category: "sales",
    isImplemented: true,
    description: "商品別のリピート購入パターン分析"
  },
  {
    id: "market-basket",
    label: "組み合わせ商品【商品】",
    icon: "🛒",
    href: "/sales/market-basket",
    category: "sales",
    isImplemented: true,
    description: "一緒に購入される商品の組み合わせ分析"
  },
  {
    id: "monthly-stats",
    label: "月別売上統計【購買】",
    icon: "📅",
    href: "/sales/monthly-stats",
    category: "sales",
    isImplemented: true,
    description: "商品別×月別の売上推移を数量・金額で把握"
  },
  {
    id: "frequency-detail",
    label: "購入回数【購買】",
    icon: "🔢",
    href: "/purchase/frequency-detail",
    category: "purchase",
    isImplemented: true,
    description: "顧客の購入回数別セグメント分析と前年比較"
  },
  {
    id: "f-tier-trend",
    label: "F階層傾向【購買】",
    icon: "📊",
    href: "/purchase/f-tier-trend",
    category: "purchase",
    isImplemented: true,
    description: "購入頻度による顧客階層の時系列変化分析"
  },
  // 一時的に非表示
  // {
  //   id: "customer-dashboard",
  //   label: "顧客ダッシュボード",
  //   icon: "👥",
  //   href: "/customers/dashboard",
  //   category: "customers",
  //   isImplemented: true,
  //   description: "顧客の全体像と主要セグメント"
  // },
  {
    id: "customer-profile",
    label: "顧客購買【顧客】",
    icon: "👤",
    href: "/customers/profile",
    category: "customers",
    isImplemented: true,
    description: "顧客別の詳細な購買プロファイル分析"
  },
  {
    id: "dormant-customers",
    label: "休眠顧客【顧客】",
    icon: "😴",
    href: "/customers/dormant",
    category: "customers",
    isImplemented: true,
    description: "最終購入からの経過期間別に顧客を分類・管理"
  },
  // 一時的に非表示
  // {
  //   id: "ai-insights",
  //   label: "AIインサイト",
  //   icon: "🤖",
  //   href: "/ai-insights",
  //   category: "ai-insights",
  //   isImplemented: true,
  //   description: "AIによる予測分析と自動インサイト生成"
  // }
]

export const getMenuByCategory = (category: string) => {
  return menuStructure.filter(item => item.category === category)
}

interface AppContextType {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  
  // 🔄 Legacy: 段階的移行のため一時的に維持（FilterContextへ移行予定）
  selectedPeriod: PeriodType
  setSelectedPeriod: (period: PeriodType) => void
  selectedCustomerSegment: CustomerSegmentType
  setSelectedCustomerSegment: (segment: CustomerSegmentType) => void
  
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  isExporting: boolean
  setIsExporting: (exporting: boolean) => void
  refreshData: () => void
  exportData: () => void
  
  menuStructure: MenuItem[]
  getMenuByCategory: (category: string) => MenuItem[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>("sales")
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("thisMonth")
  const [selectedCustomerSegment, setSelectedCustomerSegment] = useState<CustomerSegmentType>("全顧客")
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const refreshData = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  const exportData = useCallback(() => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
    }, 2000)
  }, [])

  const value: AppContextType = {
    activeTab,
    setActiveTab,
    selectedPeriod,
    setSelectedPeriod,
    selectedCustomerSegment,
    setSelectedCustomerSegment,
    isLoading,
    setIsLoading,
    isExporting,
    setIsExporting,
    refreshData,
    exportData,
    menuStructure,
    getMenuByCategory,
  }

  return (
    <AppContext.Provider value={value}>
      <ZustandProvider>
        <FilterProvider>
          {children}
        </FilterProvider>
      </ZustandProvider>
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

// =============================================================================
// Migration Helper - 段階的移行サポート
// =============================================================================

/**
 * AppContextとFilterContextの互換性を提供する移行用フック
 * 既存コンポーネントの段階的移行をサポート
 */
export function useLegacyFilters() {
  const appContext = useAppContext()
  
  // TODO: FilterContextとの同期が必要な場合はここに実装
  // import { useCustomerFilters } from "./FilterContext"
  // const { filters, setSegment, setPeriod } = useCustomerFilters()
  
  return {
    // AppContextから取得（Legacy）
    selectedPeriod: appContext.selectedPeriod,
    setSelectedPeriod: appContext.setSelectedPeriod,
    selectedCustomerSegment: appContext.selectedCustomerSegment,
    setSelectedCustomerSegment: appContext.setSelectedCustomerSegment,
    
    // Migration Notice
    _migrationNote: "この関数は非推奨です。useCustomerFilters() または useDormantFilters() への移行を推奨します。"
  }
}
