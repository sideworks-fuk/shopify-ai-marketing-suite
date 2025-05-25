"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"

export type TabType = "sales" | "customers" | "ai"
export type PeriodType = "thisMonth" | "lastMonth" | "thisQuarter" | "custom"

interface AppContextType {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  selectedPeriod: PeriodType
  setSelectedPeriod: (period: PeriodType) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  isExporting: boolean
  setIsExporting: (exporting: boolean) => void
  refreshData: () => void
  exportData: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>("sales")
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("thisMonth")
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
    isLoading,
    setIsLoading,
    isExporting,
    setIsExporting,
    refreshData,
    exportData,
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
