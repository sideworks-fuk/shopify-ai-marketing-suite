"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { CustomerSegment, DormantSegment, CustomerFilters, DormantCustomerFilters } from '../types/models/customer'

// =============================================================================
// 型定義
// =============================================================================

export type PeriodType = "thisMonth" | "lastMonth" | "thisQuarter" | "custom"
export type CustomerSegmentType = "全顧客" | "新規" | "リピーター" | "VIP" | "休眠"

export interface DateRange {
  start: Date | null
  end: Date | null
}

export interface SearchFilters {
  query: string
  isActive: boolean
}

export interface CustomerFiltersState {
  // 基本フィルター
  period: PeriodType
  segment: CustomerSegmentType
  dateRange: DateRange
  search: SearchFilters
  
  // LTV関連
  ltvMin: number | null
  ltvMax: number | null
  
  // 購入関連
  purchaseCountMin: number | null
  purchaseCountMax: number | null
  
  // リスクレベル
  riskLevel: 'all' | 'low' | 'medium' | 'high' | 'critical'
}

export interface DormantFiltersState {
  // 休眠期間
  dormancyDaysMin: number | null
  dormancyDaysMax: number | null
  selectedSegment: DormantSegment | null
  
  // 休眠理由
  dormancyReason: 'all' | 'price_sensitivity' | 'product_dissatisfaction' | 'competitor_switch' | 'natural_churn' | 'seasonal' | 'unknown'
  
  // リスクレベル
  riskLevel: 'all' | 'low' | 'medium' | 'high' | 'critical'
  
  // アクション
  hasRecommendedActions: boolean | null
}

export interface FilterContextType {
  // 顧客フィルター
  customerFilters: CustomerFiltersState
  updateCustomerFilter: <K extends keyof CustomerFiltersState>(
    key: K, 
    value: CustomerFiltersState[K]
  ) => void
  resetCustomerFilters: () => void
  
  // 休眠顧客フィルター
  dormantFilters: DormantFiltersState
  updateDormantFilter: <K extends keyof DormantFiltersState>(
    key: K, 
    value: DormantFiltersState[K]
  ) => void
  resetDormantFilters: () => void
  
  // 共通操作
  resetAllFilters: () => void
  
  // フィルター状態の確認
  hasActiveFilters: boolean
  getActiveFilterCount: () => number
}

// =============================================================================
// デフォルト値
// =============================================================================

const defaultCustomerFilters: CustomerFiltersState = {
  period: "thisMonth",
  segment: "全顧客",
  dateRange: { start: null, end: null },
  search: { query: "", isActive: false },
  ltvMin: null,
  ltvMax: null,
  purchaseCountMin: null,
  purchaseCountMax: null,
  riskLevel: 'all'
}

const defaultDormantFilters: DormantFiltersState = {
  dormancyDaysMin: null,
  dormancyDaysMax: null,
  selectedSegment: null,
  dormancyReason: 'all',
  riskLevel: 'all',
  hasRecommendedActions: null
}

// =============================================================================
// Context作成
// =============================================================================

const FilterContext = createContext<FilterContextType | undefined>(undefined)

// =============================================================================
// Provider実装
// =============================================================================

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [customerFilters, setCustomerFilters] = useState<CustomerFiltersState>(defaultCustomerFilters)
  const [dormantFilters, setDormantFilters] = useState<DormantFiltersState>(defaultDormantFilters)

  // 顧客フィルター更新
  const updateCustomerFilter = useCallback(<K extends keyof CustomerFiltersState>(
    key: K,
    value: CustomerFiltersState[K]
  ) => {
    setCustomerFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // 休眠顧客フィルター更新
  const updateDormantFilter = useCallback(<K extends keyof DormantFiltersState>(
    key: K,
    value: DormantFiltersState[K]
  ) => {
    setDormantFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // 顧客フィルターリセット
  const resetCustomerFilters = useCallback(() => {
    setCustomerFilters(defaultCustomerFilters)
  }, [])

  // 休眠顧客フィルターリセット
  const resetDormantFilters = useCallback(() => {
    setDormantFilters(defaultDormantFilters)
  }, [])

  // 全フィルターリセット
  const resetAllFilters = useCallback(() => {
    resetCustomerFilters()
    resetDormantFilters()
  }, [resetCustomerFilters, resetDormantFilters])

  // アクティブフィルターの検出
  const hasActiveFilters = useMemo(() => {
    // 顧客フィルターのチェック
    const customerActive = 
      customerFilters.segment !== "全顧客" ||
      customerFilters.period !== "thisMonth" ||
      customerFilters.search.query !== "" ||
      customerFilters.ltvMin !== null ||
      customerFilters.ltvMax !== null ||
      customerFilters.purchaseCountMin !== null ||
      customerFilters.purchaseCountMax !== null ||
      customerFilters.riskLevel !== 'all' ||
      customerFilters.dateRange.start !== null ||
      customerFilters.dateRange.end !== null

    // 休眠フィルターのチェック
    const dormantActive = 
      dormantFilters.selectedSegment !== null ||
      dormantFilters.dormancyDaysMin !== null ||
      dormantFilters.dormancyDaysMax !== null ||
      dormantFilters.dormancyReason !== 'all' ||
      dormantFilters.riskLevel !== 'all' ||
      dormantFilters.hasRecommendedActions !== null

    return customerActive || dormantActive
  }, [customerFilters, dormantFilters])

  // アクティブフィルター数の計算
  const getActiveFilterCount = useCallback(() => {
    let count = 0
    
    // 顧客フィルターのカウント
    if (customerFilters.segment !== "全顧客") count++
    if (customerFilters.period !== "thisMonth") count++
    if (customerFilters.search.query !== "") count++
    if (customerFilters.ltvMin !== null || customerFilters.ltvMax !== null) count++
    if (customerFilters.purchaseCountMin !== null || customerFilters.purchaseCountMax !== null) count++
    if (customerFilters.riskLevel !== 'all') count++
    if (customerFilters.dateRange.start !== null || customerFilters.dateRange.end !== null) count++
    
    // 休眠フィルターのカウント
    if (dormantFilters.selectedSegment !== null) count++
    if (dormantFilters.dormancyDaysMin !== null || dormantFilters.dormancyDaysMax !== null) count++
    if (dormantFilters.dormancyReason !== 'all') count++
    if (dormantFilters.riskLevel !== 'all') count++
    if (dormantFilters.hasRecommendedActions !== null) count++
    
    return count
  }, [customerFilters, dormantFilters])

  const value: FilterContextType = {
    customerFilters,
    updateCustomerFilter,
    resetCustomerFilters,
    dormantFilters,
    updateDormantFilter,
    resetDormantFilters,
    resetAllFilters,
    hasActiveFilters,
    getActiveFilterCount
  }

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  )
}

// =============================================================================
// カスタムフック
// =============================================================================

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}

// =============================================================================
// 専用フック（特定用途）
// =============================================================================

/**
 * 顧客フィルター専用フック
 */
export function useCustomerFilters() {
  const { customerFilters, updateCustomerFilter, resetCustomerFilters } = useFilters()
  
  return {
    filters: customerFilters,
    updateFilter: updateCustomerFilter,
    resetFilters: resetCustomerFilters,
    
    // よく使用される操作のエイリアス
    setPeriod: (period: PeriodType) => updateCustomerFilter('period', period),
    setSegment: (segment: CustomerSegmentType) => updateCustomerFilter('segment', segment),
    setSearchQuery: (query: string) => updateCustomerFilter('search', { query, isActive: query !== "" }),
    setLTVRange: (min: number | null, max: number | null) => {
      updateCustomerFilter('ltvMin', min)
      updateCustomerFilter('ltvMax', max)
    },
    setPurchaseCountRange: (min: number | null, max: number | null) => {
      updateCustomerFilter('purchaseCountMin', min)
      updateCustomerFilter('purchaseCountMax', max)
    }
  }
}

/**
 * 休眠顧客フィルター専用フック
 */
export function useDormantFilters() {
  const { dormantFilters, updateDormantFilter, resetDormantFilters } = useFilters()
  
  return {
    filters: dormantFilters,
    updateFilter: updateDormantFilter,
    resetFilters: resetDormantFilters,
    
    // よく使用される操作のエイリアス
    setSelectedSegment: (segment: DormantSegment | null) => updateDormantFilter('selectedSegment', segment),
    setDormancyDaysRange: (min: number | null, max: number | null) => {
      updateDormantFilter('dormancyDaysMin', min)
      updateDormantFilter('dormancyDaysMax', max)
    },
    setRiskLevel: (level: DormantFiltersState['riskLevel']) => updateDormantFilter('riskLevel', level),
    setDormancyReason: (reason: DormantFiltersState['dormancyReason']) => updateDormantFilter('dormancyReason', reason)
  }
}

// =============================================================================
// データ変換ユーティリティ
// =============================================================================

/**
 * FilterContext の顧客フィルターを dataService 用の CustomerFilters に変換
 */
export function convertToCustomerFilters(filters: CustomerFiltersState): CustomerFilters {
  return {
    search: filters.search.query || undefined,
    segment: filters.segment === "全顧客" ? undefined : filters.segment,
    dateRange: (filters.dateRange.start && filters.dateRange.end) ? {
      start: filters.dateRange.start,
      end: filters.dateRange.end
    } : undefined,
    limit: undefined,
    offset: undefined
  }
}

/**
 * FilterContext の休眠フィルターを dataService 用の DormantCustomerFilters に変換
 */
export function convertToDormantFilters(filters: DormantFiltersState): DormantCustomerFilters {
  return {
    minDays: filters.dormancyDaysMin || undefined,
    maxDays: filters.dormancyDaysMax || undefined,
    segment: filters.selectedSegment?.id || undefined,
    hasActions: filters.hasRecommendedActions || undefined
  }
} 