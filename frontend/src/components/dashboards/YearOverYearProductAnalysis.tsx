"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import { VirtualScroll } from "../ui/VirtualScroll"
import {
  Search,
  Download,
  BarChart3,
  Calendar,
  Loader2,
  AlertCircle,
  Play,
} from "lucide-react"
import type { ApiResponse } from "../../lib/data-access/types/api"
import type { YearOverYearProductData, YearOverYearResponse } from "../../lib/api/year-over-year"
import { useAuth } from "@/components/providers/AuthProvider"
import { getCurrentStoreId } from "@/lib/api-config"
import FeatureLockedScreen from "@/components/billing/FeatureLockedScreen"

// APIデータ用の統一型定義
interface MonthlyProductData {
  productId: string
  productName: string
  category: string
  monthlyData: Array<{
    month: string
    current: number
    previous: number
    growthRate: number
  }>
}

// テーブル行コンポーネント（メモ化してパフォーマンス最適化）
const ProductTableRow = React.memo(({
  product,
  productIndex,
  viewMode,
  formatValue,
  getGrowthBadgeColor,
}: {
  product: MonthlyProductData
  productIndex: number
  viewMode: "sales" | "quantity" | "orders"
  formatValue: (value: number, mode: string) => string
  getGrowthBadgeColor: (growth: number) => string
}) => {
  const avgGrowth = product.monthlyData.reduce((sum, m) => sum + m.growthRate, 0) / 12
  
  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${productIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
      <td className="py-4 px-3 sticky left-0 bg-white z-10 border-r">
        <div className="space-y-2">
          <div className="font-medium text-gray-900 text-sm leading-tight">
            {product.productName}
          </div>
          <div className="text-xs text-gray-500">
            {product.category}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getGrowthBadgeColor(avgGrowth)}>
              平均: {avgGrowth > 0 ? "+" : ""}{avgGrowth.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </td>
      {product.monthlyData.map((monthData, index) => (
        <td key={index} className="py-4 px-2 text-center border-r">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900">
              {formatValue(monthData.current, viewMode)}
            </div>
            <div className="text-xs text-gray-500">
              前年: {formatValue(monthData.previous, viewMode)}
            </div>
            <Badge 
              className={`${getGrowthBadgeColor(monthData.growthRate)} text-xs font-semibold`}
            >
              {monthData.growthRate > 0 ? "+" : ""}{monthData.growthRate.toFixed(1)}%
            </Badge>
          </div>
        </td>
      ))}
    </tr>
  )
})

ProductTableRow.displayName = "ProductTableRow"

// 仮想スクロール用のテーブル行コンポーネント（divベース）
const ProductTableRowVirtual = React.memo(({
  product,
  productIndex,
  viewMode,
  formatValue,
  getGrowthBadgeColor,
}: {
  product: MonthlyProductData
  productIndex: number
  viewMode: "sales" | "quantity" | "orders"
  formatValue: (value: number, mode: string) => string
  getGrowthBadgeColor: (growth: number) => string
}) => {
  const avgGrowth = product.monthlyData.reduce((sum, m) => sum + m.growthRate, 0) / 12
  const bgColor = productIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
  
  return (
    <div className={`flex border-b border-gray-100 hover:bg-gray-50 transition-colors min-h-[120px] ${bgColor}`}>
      {/* 商品名列（固定） */}
      <div className={`sticky left-0 z-10 w-[250px] py-5 px-3 border-r-2 border-gray-200 flex-shrink-0 ${bgColor} shadow-sm`}>
        <div className="space-y-2">
          <div className="font-medium text-gray-900 text-sm leading-relaxed">
            {product.productName}
          </div>
          <div className="text-xs text-gray-500">
            {product.category}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getGrowthBadgeColor(avgGrowth)}>
              平均: {avgGrowth > 0 ? "+" : ""}{avgGrowth.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </div>
      {/* 月別データ列 */}
      <div className="flex flex-1 min-w-[1440px]">
        {product.monthlyData.map((monthData, index) => (
          <div key={index} className="flex-1 py-5 px-2 text-center border-r border-gray-200 min-w-[120px]">
            <div className="space-y-1.5">
              <div className="text-sm font-semibold text-gray-900">
                {formatValue(monthData.current, viewMode)}
              </div>
              <div className="text-xs text-gray-500">
                前年: {formatValue(monthData.previous, viewMode)}
              </div>
              <Badge 
                className={`${getGrowthBadgeColor(monthData.growthRate)} text-xs font-semibold`}
              >
                {monthData.growthRate > 0 ? "+" : ""}{monthData.growthRate.toFixed(1)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

ProductTableRowVirtual.displayName = "ProductTableRowVirtual"

const YearOverYearProductAnalysis = () => {
  const { getApiClient, currentStoreId: authCurrentStoreId, setCurrentStoreId, resolveStoreId } = useAuth()
  // ✅ 年選択機能
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  
  // 仮想スクロール用の設定
  const ROW_HEIGHT = 100 // 行の高さ（px）
  const TABLE_HEIGHT = 600 // テーブルの高さ（px）
  
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [sortBy, setSortBy] = useState<"growth" | "total" | "name">("growth")
  const [filters, setFilters] = useState({
    growthRate: "all",
    category: "all",
    searchTerm: "",
  })

  // 前年を自動計算
  const previousYear = selectedYear - 1

  // 🔄 API状態管理
  const [loading, setLoading] = useState(false) // 初期状態はfalse（分析実行ボタンで取得）
  const [error, setError] = useState<string | null>(null)
  const [apiData, setApiData] = useState<YearOverYearProductData[] | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [hasData, setHasData] = useState(false) // データ取得済みフラグ
  const [lastFetchViewMode, setLastFetchViewMode] = useState<"sales" | "quantity" | "orders" | null>(null) // 最後に取得したviewMode
  const [lastFetchYear, setLastFetchYear] = useState<number | null>(null) // 最後に取得した対象年
  const [featureDenied, setFeatureDenied] = useState<string | null>(null)

  // 🆕 ページマウント時に currentStoreId を復元（開発者モード・デモモード対応）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // localStorage から取得を試みる
      let savedStoreId = localStorage.getItem('currentStoreId')
      
      // localStorage になければ sessionStorage から取得を試みる
      if (!savedStoreId) {
        savedStoreId = sessionStorage.getItem('currentStoreId')
        // sessionStorage にあった場合は localStorage にも保存（次回以降のため）
        if (savedStoreId) {
          try {
            localStorage.setItem('currentStoreId', savedStoreId)
            console.log('✅ [YearOverYear] sessionStorage から取得し、localStorage にも保存しました', { storeId: savedStoreId })
          } catch (error) {
            console.warn('⚠️ [YearOverYear] localStorage への保存に失敗しました', error)
          }
        }
      }
      
      if (savedStoreId) {
        const storeId = parseInt(savedStoreId, 10)
        if (!isNaN(storeId) && storeId > 0) {
          // AuthProvider の currentStoreId が設定されていない、または異なる場合のみ更新
          if (!authCurrentStoreId || authCurrentStoreId !== storeId) {
            console.log('🔄 [YearOverYear] ページマウント時に currentStoreId を復元:', { storeId, previousStoreId: authCurrentStoreId })
            setCurrentStoreId(storeId)
          }
        }
      } else {
        console.warn('⚠️ [YearOverYear] currentStoreId が localStorage にも sessionStorage にも見つかりません')
      }
    }
  }, [authCurrentStoreId, setCurrentStoreId])

  // 🆕 AuthProvider の resolveStoreId を使用（汎用的な実装）

  // 🚀 API データ取得
  const fetchYearOverYearData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFeatureDenied(null)

    try {
      // 🆕 resolveStoreId()は非同期関数になったため、awaitを追加
      const storeId = await resolveStoreId()
      if (!storeId) {
        throw new Error('ストア情報が取得できません。Shopify管理画面からアプリを起動し直してください。')
      }

      const params = new URLSearchParams()
      params.append('storeId', String(storeId))
      params.append('year', String(selectedYear))
      params.append('viewMode', viewMode)
      params.append(
        'sortBy',
        sortBy === 'growth' ? 'growth_rate' : sortBy === 'total' ? 'total_sales' : 'name',
      )
      params.append('sortDescending', 'true')
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm)
      if (filters.growthRate !== 'all') params.append('growthRateFilter', filters.growthRate)
      if (filters.category !== 'all') params.append('category', filters.category)

      const apiClient = getApiClient()
      const response = await apiClient.get<ApiResponse<YearOverYearResponse>>(
        `/api/analytics/year-over-year?${params.toString()}`,
      )

      if (response.success && response.data) {
        setApiData(response.data.products)
        setLastFetchViewMode(viewMode) // 取得時のviewModeを保存
        setLastFetchYear(selectedYear) // 取得時の対象年を保存
        
        // カテゴリ一覧を更新
        const uniqueCategories = Array.from(new Set(response.data.products.map(p => p.productType)))
        setCategories(uniqueCategories)
      } else {
        throw new Error(response.message || 'データの取得に失敗しました')
      }
    } catch (err) {
      console.error('年次比較データ取得エラー:', err)

      // 403（機能制限）は「エラー」ではなくロック画面で案内する
      const message = err instanceof Error ? err.message : ''
      if (message.includes('403') && message.includes('Feature not available')) {
        setFeatureDenied('year_over_year')
        setError(null)
      } else {
        setError(err instanceof Error ? err.message : 'データの取得中にエラーが発生しました')
      }
      setApiData([]) // エラー時は空配列に設定
    } finally {
      setLoading(false)
      setHasData(true) // データ取得試行完了
    }
  }, [filters, getApiClient, resolveStoreId, selectedYear, sortBy, viewMode])

  // APIデータを表示形式に変換する関数
  const convertApiDataToDisplayFormat = useCallback((apiProducts: YearOverYearProductData[]): MonthlyProductData[] => {
    return apiProducts.map((product, index) => ({
      productId: `api_${index}`,
      productName: product.productTitle,
      category: product.productType,
      monthlyData: product.monthlyData.map(monthData => ({
        month: monthData.monthName,
        current: monthData.currentValue,
        previous: monthData.previousValue,
        growthRate: monthData.growthRate
      }))
    }))
  }, [])

  // 実際に表示するデータ（APIデータのみ）
  const displayData = useMemo(() => {
    if (apiData) {
      return convertApiDataToDisplayFormat(apiData)
    }
    return []
  }, [apiData, convertApiDataToDisplayFormat])

  // フィルタリングロジック（クライアントサイドで追加フィルタリング）
  const filteredData = useMemo(() => {
    return displayData.filter((product) => {
      // パフォーマンス最適化: 短絡評価を活用
      if (filters.searchTerm && !product.productName.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false
      }
      
      if (filters.category !== "all" && product.category !== filters.category) {
        return false
      }
      
      // 年間平均成長率を計算
      const avgGrowthRate = product.monthlyData.reduce((sum, month) => sum + month.growthRate, 0) / 12
      
      switch (filters.growthRate) {
        case "positive": return avgGrowthRate > 0
        case "negative": return avgGrowthRate < 0
        case "high_growth": return avgGrowthRate > 20
        case "high_decline": return avgGrowthRate < -20
        default: return true
      }
    })
  }, [displayData, filters])

  // 並び替えロジック（クライアントサイドソート）
  const sortedData = useMemo(() => {
    const sorted = [...filteredData]
    switch (sortBy) {
      case "growth":
        return sorted.sort((a, b) => {
          const avgA = a.monthlyData.reduce((sum, month) => sum + month.growthRate, 0) / 12
          const avgB = b.monthlyData.reduce((sum, month) => sum + month.growthRate, 0) / 12
          return avgB - avgA
        })
      case "total":
        return sorted.sort((a, b) => {
          const totalA = a.monthlyData.reduce((sum, month) => sum + month.current, 0)
          const totalB = b.monthlyData.reduce((sum, month) => sum + month.current, 0)
          return totalB - totalA
        })
      case "name":
        return sorted.sort((a, b) => a.productName.localeCompare(b.productName))
      default:
        return sorted
    }
  }, [filteredData, sortBy])

  // カテゴリ一覧（APIデータから取得）
  const allCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories
    }
    // APIデータからカテゴリを抽出
    const uniqueCategories = Array.from(new Set(displayData.map(p => p.category)))
    return uniqueCategories
  }, [categories, displayData])

  // フィルタ変更ハンドラ
  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // フォーマット関数
  const formatValue = useCallback((value: number, mode: string) => {
    switch (mode) {
      case "sales":
        return `¥${value.toLocaleString()}`
      case "quantity":
        return `${value.toLocaleString()}個`
      case "orders":
        return `${value.toLocaleString()}件`
      default:
        return value.toString()
    }
  }, [])

  // 成長率バッジ色（強化版）
  const getGrowthBadgeColor = useCallback((growth: number) => {
    if (growth >= 25) return "bg-emerald-100 text-emerald-800 border-emerald-200"
    if (growth >= 15) return "bg-green-100 text-green-800 border-green-200"
    if (growth >= 5) return "bg-blue-100 text-blue-800 border-blue-200"
    if (growth >= 0) return "bg-slate-100 text-slate-700 border-slate-200"
    if (growth >= -10) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (growth >= -20) return "bg-orange-100 text-orange-800 border-orange-200"
    return "bg-red-100 text-red-800 border-red-200"
  }, [])

  // CSV用の値フォーマット（カンマ・通貨記号なし、数値のみ）
  const formatValueForCsv = useCallback((value: number, mode: string) => {
    switch (mode) {
      case "sales":
        return value.toString()
      case "quantity":
        return value.toString()
      case "orders":
        return value.toString()
      default:
        return value.toString()
    }
  }, [])

  // CSV/Excelエクスポート（月別詳細データ）
  const handleExport = useCallback((format: 'csv' | 'excel') => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    const headers = ['商品名', 'カテゴリ', ...months.map(m => `${selectedYear}年${m}`), ...months.map(m => `${previousYear}年${m}`), ...months.map(m => `${m}成長率`)]

    const rows = sortedData.map(item => {
      const row = [item.productName, item.category]

      // 現在年のデータ
      item.monthlyData.forEach(monthData => {
        row.push(formatValueForCsv(monthData.current, viewMode))
      })

      // 前年のデータ
      item.monthlyData.forEach(monthData => {
        row.push(formatValueForCsv(monthData.previous, viewMode))
      })

      // 成長率
      item.monthlyData.forEach(monthData => {
        row.push(`${monthData.growthRate}%`)
      })

      return row
    })

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const extension = format === 'excel' ? 'csv' : 'csv'
    link.setAttribute('href', url)
    link.setAttribute('download', `前年同月比月別分析_${selectedYear}vs${previousYear}_${new Date().toISOString().slice(0, 10)}.${extension}`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [sortedData, selectedYear, previousYear, viewMode, formatValueForCsv])

  // ⚠️ 重要: hooksの呼び出し順序が変わらないよう、早期returnはhooks定義の後に行う
  if (featureDenied) {
    return (
      <FeatureLockedScreen
        featureName="前年同月比分析"
        featureType="year_over_year"
      />
    )
  }


  return (
    <div className="space-y-6 w-full max-w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">分析条件設定</CardTitle>
          <CardDescription>期間・商品・表示条件を設定してください</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
              {/* 分析条件（変更時はデータクリア → 「分析実行」が必要） */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">分析条件</h3>
                  <span className="text-xs text-gray-500">変更後は「分析実行」を押してください</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      対象年
                    </label>
                    <Select value={selectedYear.toString()} onValueChange={(value) => {
                      const newYear = parseInt(value)
                      setSelectedYear(newYear)
                      if (hasData && lastFetchYear !== newYear) {
                        setApiData(null)
                        setHasData(false)
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}年 vs {year - 1}年
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">表示データ</label>
                    <Select
                      value={viewMode}
                      onValueChange={(value: any) => {
                        setViewMode(value)
                        if (hasData && lastFetchViewMode !== value) {
                          setApiData(null)
                          setHasData(false)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">売上金額</SelectItem>
                        <SelectItem value="quantity">販売数量</SelectItem>
                        <SelectItem value="orders">注文件数</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={fetchYearOverYearData}
                      disabled={loading}
                      size="lg"
                      className="min-w-[120px]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          分析中...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          分析実行
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* 表示設定（即時反映） */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">表示設定</h3>
                  <span className="text-xs text-gray-500">変更は即時反映されます</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">並び順</label>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="growth">成長率順</SelectItem>
                        <SelectItem value="total">売上順</SelectItem>
                        <SelectItem value="name">商品名順</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">成長状況</label>
                    <Select value={filters.growthRate} onValueChange={(value) => handleFilterChange({ growthRate: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全商品</SelectItem>
                        <SelectItem value="positive">成長商品のみ</SelectItem>
                        <SelectItem value="negative">減少商品のみ</SelectItem>
                        <SelectItem value="high_growth">高成長商品（+20%以上）</SelectItem>
                        <SelectItem value="high_decline">要注意商品（-20%以下）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">商品カテゴリ</label>
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange({ category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全カテゴリ</SelectItem>
                        {allCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">商品検索</label>
                    <Input
                      placeholder="商品名で検索..."
                      value={filters.searchTerm}
                      onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
      </Card>

      {/* サマリー統計カード（データ取得済みの場合のみ表示） */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{sortedData.length}</div>
              <div className="text-sm text-blue-700 mt-1">対象商品数</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-50 to-green-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {sortedData.filter(p => {
                  const avgGrowth = p.monthlyData.reduce((sum, m) => sum + m.growthRate, 0) / 12
                  return avgGrowth > 0
                }).length}
              </div>
              <div className="text-sm text-green-700 mt-1">成長商品数</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-red-50 to-red-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {sortedData.filter(p => {
                  const avgGrowth = p.monthlyData.reduce((sum, m) => sum + m.growthRate, 0) / 12
                  return avgGrowth < 0
                }).length}
              </div>
              <div className="text-sm text-red-700 mt-1">減少商品数</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sortedData.length > 0 ? 
                  (sortedData.reduce((sum, p) => {
                    const avgGrowth = p.monthlyData.reduce((s, m) => s + m.growthRate, 0) / 12
                    return sum + avgGrowth
                  }, 0) / sortedData.length).toFixed(1) : "0"}%
              </div>
              <div className="text-sm text-purple-700 mt-1">平均成長率</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* データテーブル（改良版）- データ取得済みの場合のみ表示 */}
      {hasData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  商品別月次推移データ
                </CardTitle>
                <CardDescription>
                  {selectedYear}年と{previousYear}年の月別比較データ（{sortedData.length}件の商品を表示中）
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">データを読み込み中...</span>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
              <div className="text-lg font-medium text-gray-700 mb-2">
                分析を実行してください
              </div>
              <div className="text-sm text-gray-500 text-center max-w-md">
                分析条件を設定して「分析実行」ボタンをクリックすると、
                {selectedYear}年と{previousYear}年の月別比較データが表示されます。
              </div>
            </div>
          ) : (
            <>
              {/* 月別詳細表示（改善版：ブラウザスクロール利用） */}
              <div className="relative border rounded-lg">
                {/* 横スクロールコンテナ */}
                <div className="overflow-x-auto">
                <div className="min-w-[1690px]">
                    {/* テーブルヘッダー（sticky で固定） */}
                    <div className="sticky top-0 z-20 bg-gray-50 border-b-2 border-gray-200 shadow-sm">
                    <div className="flex">
                        <div className="sticky left-0 bg-gray-50 z-30 w-[250px] flex-shrink-0 border-r-2 border-gray-200">
                        <div className="py-4 px-3 font-semibold text-gray-900 text-sm">
                          商品情報
                        </div>
                      </div>
                      <div className="flex flex-1 min-w-[1440px]">
                        {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map(month => (
                          <div key={month} className="flex-1 py-4 px-2 text-center font-semibold text-gray-900 min-w-[120px] border-r border-gray-200">
                            <div className="text-sm">{month}</div>
                            <div className="text-xs text-gray-500 font-normal">
                              {selectedYear} / {previousYear}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                    {/* テーブルボディ（ブラウザスクロール利用） */}
                  <div className="bg-white">
                      {/* 全データを表示（仮想スクロール削除） */}
                      {sortedData.map((product, index) => (
                        <ProductTableRowVirtual
                          key={product.productId}
                          product={product}
                          productIndex={index}
                          viewMode={viewMode}
                          formatValue={formatValue}
                          getGrowthBadgeColor={getGrowthBadgeColor}
                        />
                      ))}
                      {/* データが少ない場合の最小高さ確保 */}
                      {sortedData.length === 0 && (
                        <div className="py-20 text-center text-gray-500">
                          データがありません
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {sortedData.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    {error ? (
                      <AlertCircle className="h-12 w-12 mx-auto" />
                    ) : (
                      <Search className="h-12 w-12 mx-auto" />
                    )}
                  </div>
                  {error ? (
                    <>
                      <div className="text-lg font-medium text-red-500 mb-2">
                        データの取得に失敗しました
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        {error}
                      </div>
                      <Button onClick={fetchYearOverYearData} disabled={loading}>
                        再読み込み
                      </Button>
                    </>
                  ) : apiData && apiData.length === 0 ? (
                    <>
                      <div className="text-lg font-medium text-gray-500 mb-2">
                        データが存在しません
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        選択した年度（{selectedYear}年）のデータがありません。<br/>
                        他の年度を選択するか、データの登録状況を確認してください。
                      </div>
                      <Button variant="outline" onClick={fetchYearOverYearData} disabled={loading}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        再読み込み
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-medium text-gray-500 mb-2">
                        検索条件に該当する商品が見つかりませんでした
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        フィルター条件を変更して再度お試しください
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setFilters({ growthRate: "all", category: "all", searchTerm: "" })}
                      >
                        フィルターをクリア
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
        </Card>
      )}
    </div>
  )
}

export default YearOverYearProductAnalysis