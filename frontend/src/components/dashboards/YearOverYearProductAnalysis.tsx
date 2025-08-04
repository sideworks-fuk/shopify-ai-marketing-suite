"use client"

import React from "react"

import { useState, useMemo, useCallback, useEffect } from "react"
import { YearOverYearProductAnalysisCondition, AnalysisConditions } from "./YearOverYearProductAnalysisCondition"
import { TableSkeleton, CardSkeleton, ProgressiveLoader } from "../ui/PerformanceOptimized"
import { YearOverYearProductTable } from "./YearOverYearProductTable"
import { YearOverYearProductErrorHandling, classifyError, AnalysisError } from "./YearOverYearProductErrorHandling"
import { useProductAnalysisFilters } from "../../stores/analysisFiltersStore"
import { useAppStore } from "../../stores/appStore"
import { yearOverYearApi, YearOverYearProductData, MonthlyComparisonData } from "../../lib/api/year-over-year"
import { handleApiError, handleError } from "../../lib/error-handler"
import { getCurrentStoreId } from "@/lib/api-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import {
  Search,
  Download,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Calendar,
  Filter,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

// 型定義
type ViewMode = 'sales' | 'quantity' | 'orders'

interface MonthlyData {
  sales: number
  quantity: number
  orders: number
  [key: string]: number // インデックスシグネチャを追加
}

interface ProductYearData {
  productId: string
  productName: string
  category: string
  monthlyData: {
    [key: string]: MonthlyData // "2024-01", "2025-01" format
  }
  yearOverYearGrowth: {
    [month: string]: number // 前年同月比成長率
  }
  totalGrowth: number
  avgGrowth: number
}

// 改善1: 視覚的な前年同月比表示強化
const EnhancedDataCell = ({
  currentValue,
  previousValue,
  viewMode,
}: {
  currentValue: number
  previousValue: number
  viewMode: ViewMode
}) => {
  const growthRate = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

  const getCellStyle = () => {
    if (growthRate > 20) return "bg-green-100 text-green-800 border-green-200"
    if (growthRate > 10) return "bg-green-50 text-green-700 border-green-100"
    if (growthRate > 0) return "bg-blue-50 text-blue-700 border-blue-100"
    if (growthRate > -10) return "bg-yellow-50 text-yellow-700 border-yellow-100"
    if (growthRate > -20) return "bg-orange-50 text-orange-700 border-orange-100"
    return "bg-red-50 text-red-700 border-red-100"
  }

  const formatValue = (value: number) => {
    switch (viewMode) {
      case "sales":
        return `¥${value.toLocaleString()}`
      case "quantity":
        return `${value.toLocaleString()}個`
      case "orders":
        return `${value.toLocaleString()}件`
      default:
        return value.toString()
    }
  }

  return (
    <div className={`p-2 text-center relative border ${getCellStyle()} rounded-sm`}>
      <div className="font-bold text-sm">{formatValue(currentValue)}</div>
      <div className="text-xs font-medium">
        {growthRate > 0 ? "+" : ""}
        {growthRate.toFixed(1)}%
      </div>
    </div>
  )
}

// 改善3: 商品別成長率サマリー追加
const ProductGrowthRanking = ({ data, viewMode }: { data: ProductYearData[]; viewMode: ViewMode }) => {
  const calculateAverageGrowthRate = (product: ProductYearData) => {
    const growthValues = Object.values(product.yearOverYearGrowth)
    return growthValues.reduce((sum, val) => sum + val, 0) / growthValues.length
  }

  const topGrowers = data
    .map((product) => ({
      ...product,
      totalGrowthRate: calculateAverageGrowthRate(product),
    }))
    .sort((a, b) => b.totalGrowthRate - a.totalGrowthRate)
    .slice(0, 10)

  const topDecliners = data
    .map((product) => ({
      ...product,
      totalGrowthRate: calculateAverageGrowthRate(product),
    }))
    .sort((a, b) => a.totalGrowthRate - b.totalGrowthRate)
    .slice(0, 10)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <TrendingUp className="h-5 w-5" />🚀 成長率 Top10
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topGrowers.map((product, index) => (
              <div
                key={product.productId}
                className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium text-sm">{product.productName}</div>
                    <div className="text-xs text-gray-500">{product.category}</div>
                  </div>
                </div>
                <div className="text-green-700 font-bold text-lg">+{product.totalGrowthRate.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <TrendingDown className="h-5 w-5" />📉 要注意商品 Top10
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topDecliners.map((product, index) => (
              <div
                key={product.productId}
                className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium text-sm">{product.productName}</div>
                    <div className="text-xs text-gray-500">{product.category}</div>
                  </div>
                </div>
                <div className="text-red-700 font-bold text-lg flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {product.totalGrowthRate.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 改善4: 季節性分析機能
const SeasonalAnalysis = ({ data, viewMode }: { data: ProductYearData[]; viewMode: string }) => {
  const seasons = {
    spring: { months: [3, 4, 5], name: "春季", icon: "🌸", color: "green" },
    summer: { months: [6, 7, 8], name: "夏季", icon: "☀️", color: "yellow" },
    autumn: { months: [9, 10, 11], name: "秋季", icon: "🍂", color: "orange" },
    winter: { months: [12, 1, 2], name: "冬季", icon: "❄️", color: "blue" },
  }

  const seasonalData = Object.entries(seasons).map(([seasonKey, season]) => {
    const seasonTotal2024 = data.reduce((sum, product) => {
      return (
        sum +
        season.months.reduce((monthSum, month) => {
          const monthStr = month.toString().padStart(2, "0")
          return monthSum + (product.monthlyData[`2024-${monthStr}`]?.[viewMode] || 0)
        }, 0)
      )
    }, 0)

    const seasonTotal2025 = data.reduce((sum, product) => {
      return (
        sum +
        season.months.reduce((monthSum, month) => {
          const monthStr = month.toString().padStart(2, "0")
          return monthSum + (product.monthlyData[`2025-${monthStr}`]?.[viewMode] || 0)
        }, 0)
      )
    }, 0)

    const growth = seasonTotal2024 > 0 ? ((seasonTotal2025 - seasonTotal2024) / seasonTotal2024) * 100 : 0

    return {
      season: season.name,
      icon: season.icon,
      total2024: seasonTotal2024,
      total2025: seasonTotal2025,
      growth,
      color: season.color,
    }
  })

  const formatValue = (value: number) => {
    switch (viewMode) {
      case "sales":
        return `¥${value.toLocaleString()}`
      case "quantity":
        return `${value.toLocaleString()}個`
      case "orders":
        return `${value.toLocaleString()}件`
      default:
        return value.toString()
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🌸 季節別売上分析</CardTitle>
        <CardDescription>四季別の売上推移と前年同期比較</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {seasonalData.map((season) => (
            <div key={season.season} className="text-center p-4 bg-gray-50 rounded-lg border">
              <div className="text-2xl mb-2">{season.icon}</div>
              <div className="text-lg font-bold mb-2">{season.season}</div>
              <div className="space-y-1">
                <div className="text-sm text-gray-600">2024: {formatValue(season.total2024)}</div>
                <div className="text-sm text-gray-600">2025: {formatValue(season.total2025)}</div>
                <div className={`text-lg font-bold ${season.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {season.growth >= 0 ? "+" : ""}
                  {season.growth.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 季節別チャート */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seasonalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="season" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatValue(value)} />
              <Legend />
              <Bar dataKey="total2024" fill="#3B82F6" name="2024年" />
              <Bar dataKey="total2025" fill="#10B981" name="2025年" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// 改善5: 詳細フィルタリング機能強化
const AdvancedFilters = ({
  onFilterChange,
  categories,
}: {
  onFilterChange: (filters: any) => void
  categories: string[]
}) => {
  const [filters, setFilters] = useState({
    growthRate: "all",
    salesRange: "all",
    category: "all",
    searchTerm: "",
  })

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const growthOptions = [
    { label: "全商品", value: "all" },
    { label: "成長商品のみ", value: "positive" },
    { label: "減少商品のみ", value: "negative" },
    { label: "高成長商品（+20%以上）", value: "high_growth" },
    { label: "要注意商品（-20%以下）", value: "high_decline" },
  ]

  const salesRangeOptions = [
    { label: "全売上帯", value: "all" },
    { label: "高売上（100万円以上）", value: "high" },
    { label: "中売上（10-100万円）", value: "medium" },
    { label: "低売上（10万円未満）", value: "low" },
  ]

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🔍 詳細フィルタ</CardTitle>
        <CardDescription>商品の絞り込み条件を設定</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">商品名検索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={filters.searchTerm}
                onChange={(e) => updateFilter("searchTerm", e.target.value)}
                placeholder="商品名で検索..."
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">成長状況</label>
            <Select value={filters.growthRate} onValueChange={(value) => updateFilter("growthRate", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {growthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">売上規模</label>
            <Select value={filters.salesRange} onValueChange={(value) => updateFilter("salesRange", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {salesRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">カテゴリ</label>
            <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全カテゴリ</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// APIデータ変換関数
const convertApiDataToProductYearData = (apiData: YearOverYearProductData[], currentYear: number): ProductYearData[] => {
  const previousYear = currentYear - 1
  
  return apiData.map((product, index) => {
    const monthlyData: { [key: string]: MonthlyData } = {}
    const yearOverYearGrowth: { [month: string]: number } = {}

    // APIデータから月別データを変換
    product.monthlyData.forEach((monthData) => {
      const monthStr = monthData.month.toString().padStart(2, "0")
      
      // 現在年と前年のデータを設定
      monthlyData[`${currentYear}-${monthStr}`] = {
        sales: monthData.currentValue,
        quantity: monthData.currentValue, // API側で適切な数量データが提供される予定
        orders: monthData.currentValue, // API側で適切な注文数データが提供される予定
      }
      
      monthlyData[`${previousYear}-${monthStr}`] = {
        sales: monthData.previousValue,
        quantity: monthData.previousValue,
        orders: monthData.previousValue,
      }

      yearOverYearGrowth[monthStr] = monthData.growthRate
    })

    // 平均成長率を計算
    const growthValues = Object.values(yearOverYearGrowth)
    const avgGrowth = growthValues.length > 0 ? growthValues.reduce((sum, val) => sum + val, 0) / growthValues.length : 0

    // デバッグ用: 最初の商品の成長率をログ出力
    if (index === 0) {
      console.log('🔍 First product growth rates:', {
        productName: product.productTitle,
        yearOverYearGrowth,
        avgGrowth,
        monthlyData: product.monthlyData.slice(0, 3) // 最初の3ヶ月分
      })
    }

    return {
      productId: `api_${index}`,
      productName: product.productTitle,
      category: product.productType,
      monthlyData,
      yearOverYearGrowth,
      totalGrowth: avgGrowth,
      avgGrowth,
    }
  })
}

// React.memoでメモ化したコンポーネント
const YearOverYearProductAnalysis = React.memo(() => {
  // ✅ Zustand移行: 商品分析フィルター使用
  const { 
    filters,
    setViewMode,
    setDisplayMode,
    updateProductFilters,
    resetFilters
  } = useProductAnalysisFilters()
  
  const setLoading = useAppStore((state) => state.setLoading)
  const showToast = useAppStore((state) => state.showToast)
  
  // 🎯 条件設定→分析実行パターンの状態管理
  const [analysisExecuted, setAnalysisExecuted] = useState(false)
  const [analysisConditions, setAnalysisConditions] = useState<AnalysisConditions | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [analysisError, setAnalysisError] = useState<AnalysisError | null>(null)
  
  // エラーハンドラーの初期化
  useEffect(() => {
    const { errorHandler } = require('../../lib/error-handler')
    errorHandler.setToastHandler(showToast)
  }, [showToast])
  
  // ✅ 年選択機能
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  
  // 🔄 API状態管理
  const [loading, setLoadingState] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiData, setApiData] = useState<YearOverYearProductData[] | null>(null)
  const [initialized, setInitialized] = useState(false)
  
  // 前年を自動計算
  const previousYear = selectedYear - 1
  
  // ✅ データとビューモード状態をZustandから取得
  const viewMode = filters.viewMode === "sales" ? "sales" : filters.viewMode === "quantity" ? "quantity" : "orders"
  
  // ✅ ローカル状態を一時的に維持（段階的移行）
  const [comparisonMode, setComparisonMode] = useState<"sideBySide" | "growth">("sideBySide")
  const [sortBy, setSortBy] = useState<"name" | "growth" | "total">("growth")
  
  // ✅ フィルター状態をZustandから取得
  const appliedFilters = useMemo(() => ({
    growthRate: "all", // TODO: filters.appliedFiltersから取得予定
    salesRange: "all",
    category: filters.productFilters.category || "all",
    searchTerm: filters.productFilters.searchTerm || "",
  }), [filters.productFilters.category, filters.productFilters.searchTerm])
  
  // 🚀 API データ取得（条件付き）
  const fetchYearOverYearData = useCallback(async (conditions?: AnalysisConditions) => {
    setLoadingState(true)
    setError(null)

    // 条件が指定された場合はそれを優先、そうでなければ現在の値を使用
    const yearToUse = conditions?.selectedYear || selectedYear
    const viewModeToUse = conditions?.viewMode || viewMode
    const categoryToUse = conditions?.categories?.[0] || (appliedFilters.category === "all" ? undefined : appliedFilters.category)

    try {
      const response = await yearOverYearApi.getYearOverYearAnalysis({
        storeId: getCurrentStoreId(),
        year: yearToUse,
        viewMode: viewModeToUse,
        sortBy: sortBy === "growth" ? "growth_rate" : sortBy === "total" ? "total_sales" : "name",
        sortDescending: true,
        searchTerm: appliedFilters.searchTerm || undefined,
        category: categoryToUse,
        excludeServiceItems: conditions?.excludeServiceItems,
      })

      if (response.success && response.data) {
        setApiData(response.data.products)
      } else {
        throw new Error(response.message || 'データの取得に失敗しました')
      }
    } catch (err) {
      // 統一エラーハンドラーでAPI取得エラーを処理
      await handleApiError(err, '/api/year-over-year', 'GET', {
        context: 'YearOverYearProductAnalysis',
        severity: 'error',
        userMessage: '前年同月比データの取得に失敗しました',
        showToUser: true,
        fallback: { 
          enabled: true,
          customHandler: () => {
            setApiData([])
            setError(err instanceof Error ? err.message : 'データの取得中にエラーが発生しました')
          }
        }
      })
    } finally {
      setLoadingState(false)
      setInitialized(true)
    }
  }, [selectedYear, viewMode, sortBy, appliedFilters])

  // 分析実行後のデータ取得（条件設定→分析実行パターンでは自動取得しない）
  useEffect(() => {
    if (analysisExecuted && !apiData) {
      fetchYearOverYearData(analysisConditions || undefined)
    }
  }, [analysisExecuted, apiData, analysisConditions, fetchYearOverYearData])
  
  // 実際に表示するデータ（APIデータを変換）
  const data = useMemo(() => {
    if (apiData) {
      return convertApiDataToProductYearData(apiData, selectedYear)
    }
    return []
  }, [apiData, selectedYear])

  // フィルタリングとソート
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((product) => {
      // 検索フィルタ
      const matchesSearch = product.productName.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase())

      // カテゴリフィルタ
      const matchesCategory = appliedFilters.category === "all" || product.category === appliedFilters.category

      // 成長率フィルタ
      let matchesGrowth = true
      if (appliedFilters.growthRate === "positive") {
        matchesGrowth = product.avgGrowth > 0
      } else if (appliedFilters.growthRate === "negative") {
        matchesGrowth = product.avgGrowth < 0
      } else if (appliedFilters.growthRate === "high_growth") {
        matchesGrowth = product.avgGrowth > 20
      } else if (appliedFilters.growthRate === "high_decline") {
        matchesGrowth = product.avgGrowth < -20
      }

      // 売上規模フィルタ
      let matchesSales = true
      if (appliedFilters.salesRange !== "all") {
        const totalSales2025 = Object.values(product.monthlyData)
          .filter((_, index) => index % 2 === 1) // 2025年のデータのみ
          .reduce((sum, month) => sum + (month[viewMode] || 0), 0)

        if (appliedFilters.salesRange === "high") {
          matchesSales = totalSales2025 >= 1000000
        } else if (appliedFilters.salesRange === "medium") {
          matchesSales = totalSales2025 >= 100000 && totalSales2025 < 1000000
        } else if (appliedFilters.salesRange === "low") {
          matchesSales = totalSales2025 < 100000
        }
      }

      return matchesSearch && matchesCategory && matchesGrowth && matchesSales
    })

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.productName.localeCompare(b.productName)
        case "growth":
          return b.avgGrowth - a.avgGrowth
        case "total":
          const aTotal = Object.values(a.monthlyData)
            .filter((_, index) => index % 2 === 1)
            .reduce((sum, month) => sum + (month[viewMode] || 0), 0)
          const bTotal = Object.values(b.monthlyData)
            .filter((_, index) => index % 2 === 1)
            .reduce((sum, month) => sum + (month[viewMode] || 0), 0)
          return bTotal - aTotal
        default:
          return 0
      }
    })

    return filtered
  }, [data, appliedFilters, sortBy, viewMode])

  // カテゴリ一覧取得
  const categories = useMemo(() => {
    const cats = Array.from(new Set(data.map((p) => p.category)))
    return cats.sort()
  }, [data])

  // 値のフォーマット
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

  // 成長率のフォーマット
  const formatGrowthRate = useCallback((rate: number) => {
    const sign = rate > 0 ? "+" : ""
    return `${sign}${rate.toFixed(1)}%`
  }, [])

  // 成長率の色取得
  const getGrowthColor = useCallback((rate: number) => {
    if (rate > 10) return "text-green-600 bg-green-50"
    if (rate > 0) return "text-green-500 bg-green-25"
    if (rate > -10) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }, [])

  // サマリー統計計算
  const summary = useMemo(() => {
    let totalPrevious = 0,
      totalCurrent = 0
    let growingProducts = 0,
      decliningProducts = 0

    filteredAndSortedData.forEach((product) => {
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, "0")
        const dataPrevious = product.monthlyData[`${previousYear}-${monthStr}`]?.[viewMode] || 0
        const dataCurrent = product.monthlyData[`${selectedYear}-${monthStr}`]?.[viewMode] || 0
        totalPrevious += dataPrevious
        totalCurrent += dataCurrent
      }

      if (product.avgGrowth > 0) growingProducts++
      else if (product.avgGrowth < 0) decliningProducts++
    })

    const overallGrowth = totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0

    return {
      totalPrevious,
      totalCurrent,
      overallGrowth,
      growingProducts,
      decliningProducts,
      totalProducts: filteredAndSortedData.length,
    }
  }, [filteredAndSortedData, viewMode, selectedYear, previousYear])

  // チャート用データ生成
  const chartData = useMemo(() => {
    const months: Array<{ month: string; [key: string]: string | number }> = []
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, "0")
      const monthData: { month: string; [key: string]: string | number } = { month: `${month}月` }

      const topProducts = filteredAndSortedData.slice(0, 5)
      topProducts.forEach((product) => {
        const dataPrevious = product.monthlyData[`${previousYear}-${monthStr}`]?.[viewMode] || 0
        const dataCurrent = product.monthlyData[`${selectedYear}-${monthStr}`]?.[viewMode] || 0

        monthData[`${product.productName}_${previousYear}`] = dataPrevious
        monthData[`${product.productName}_${selectedYear}`] = dataCurrent
      })

      months.push(monthData)
    }
    return months
  }, [filteredAndSortedData, viewMode, selectedYear, previousYear])

  // 🎯 条件設定→分析実行パターン: 分析実行ハンドラー
  const executeAnalysis = useCallback(async (conditions: AnalysisConditions) => {
    setAnalysisConditions(conditions)
    setIsExecuting(true)
    
    try {
      // 条件に基づいて年度を設定
      if (conditions.selectedYear) {
        setSelectedYear(conditions.selectedYear)
      }
      
      // ビューモードを設定
      setViewMode(conditions.viewMode)
      
      // カテゴリフィルターを設定
      if (conditions.categories.length > 0) {
        updateProductFilters({ category: conditions.categories[0] }) // 複数カテゴリ対応は今後実装
      }
      
      // 最小売上閾値の設定（今後のAPI改修で対応）
      // TODO: API側でminSalesパラメータをサポート
      
      await fetchYearOverYearData()
      setAnalysisExecuted(true)
      setAnalysisError(null)
    } catch (error) {
      console.error('Analysis execution error:', error)
      const classifiedError = classifyError(error)
      setAnalysisError(classifiedError)
      showToast(classifiedError.message, 'error')
    } finally {
      setIsExecuting(false)
    }
  }, [fetchYearOverYearData, setSelectedYear, setViewMode, updateProductFilters, showToast])
  
  // 🎯 条件設定画面を表示（分析未実行時）
  if (!analysisExecuted) {
    return (
      <YearOverYearProductAnalysisCondition
        onExecute={executeAnalysis}
        isExecuting={isExecuting}
        availableCategories={[]} // TODO: カテゴリマスタから取得
      />
    )
  }
  
  // 🚨 エラー画面の表示
  if (analysisError && !isExecuting) {
    return (
      <YearOverYearProductErrorHandling
        error={analysisError}
        onRetry={() => {
          setAnalysisError(null)
          executeAnalysis(analysisConditions!)
        }}
        onGoBack={() => {
          setAnalysisExecuted(false)
          setAnalysisError(null)
          setApiData(null)
          setInitialized(false)
        }}
      />
    )
  }
  
  // 分析実行後のスケルトンローダー表示
  if (isExecuting || (!initialized && analysisExecuted)) {
    return (
      <div className="space-y-6">
        {/* コントロールパネルのスケルトン */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  前年同月比【商品】分析
                </CardTitle>
                <CardDescription>商品別の{analysisConditions?.selectedYear || selectedYear}年/{previousYear}年月次データ比較と成長率分析</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* フィルターセクションのスケルトン */}
        <Card>
          <CardHeader>
            <CardTitle>詳細フィルタリング</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* メインデータテーブルのスケルトン */}
        <Card>
          <CardHeader>
            <CardTitle>商品別売上データ</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={10} columns={13} />
          </CardContent>
        </Card>

        {/* プログレスローダー（オプション） */}
        {isExecuting && (
          <div className="fixed bottom-4 right-4 z-50">
            <ProgressiveLoader
              current={0}
              total={100}
              message="データを分析中..."
              subMessage="しばらくお待ちください"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                前年同月比【商品】分析
              </CardTitle>
              <CardDescription>商品別の{selectedYear}年/{previousYear}年月次データ比較と成長率分析</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAnalysisExecuted(false)
                setAnalysisConditions(null)
                setApiData(null)
                setInitialized(false)
              }}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              条件を変更
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
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

            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">売上金額</SelectItem>
                <SelectItem value="quantity">販売数量</SelectItem>
                <SelectItem value="orders">注文件数</SelectItem>
              </SelectContent>
            </Select>

            <Select value={comparisonMode} onValueChange={(value: any) => setComparisonMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sideBySide">年度並列表示</SelectItem>
                <SelectItem value="growth">成長率表示</SelectItem>
              </SelectContent>
            </Select>

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

            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              エクスポート
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 改善5: 詳細フィルタリング */}
      <AdvancedFilters 
        onFilterChange={(filters) => {
          updateProductFilters({
            searchTerm: filters.searchTerm,
            category: filters.category
          })
        }} 
        categories={categories} 
      />

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{formatValue(summary.totalPrevious, viewMode)}</div>
            <div className="text-sm text-gray-600 mt-1">{previousYear}年合計</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{formatValue(summary.totalCurrent, viewMode)}</div>
            <div className="text-sm text-gray-600 mt-1">{selectedYear}年合計</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div
              className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                summary.overallGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {summary.overallGrowth >= 0 ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
              {formatGrowthRate(summary.overallGrowth)}
            </div>
            <div className="text-sm text-gray-600 mt-1">全体成長率</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-500">{summary.growingProducts}</div>
            <div className="text-sm text-gray-600 mt-1">成長商品数</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-red-500">{summary.decliningProducts}</div>
            <div className="text-sm text-gray-600 mt-1">減少商品数</div>
          </CardContent>
        </Card>
      </div>

      {/* 改善3: 商品別成長率サマリー */}
      <ProductGrowthRanking data={filteredAndSortedData} viewMode={viewMode} />

      {/* 改善4: 季節性分析 */}
      <SeasonalAnalysis data={filteredAndSortedData} viewMode={viewMode} />

      {/* メインデータテーブル - 段階的表示対応 */}
      <YearOverYearProductTable
        data={filteredAndSortedData}
        viewMode={viewMode}
        comparisonMode={comparisonMode}
        selectedYear={selectedYear}
        previousYear={previousYear}
      />

      {/* トレンドチャート */}
      <Card>
        <CardHeader>
          <CardTitle>商品別トレンド比較（上位5商品）</CardTitle>
          <CardDescription>
            {viewMode === "sales" ? "売上金額" : viewMode === "quantity" ? "販売数量" : "注文件数"}の月次推移
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => formatValue(value, viewMode)}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />

                {filteredAndSortedData.slice(0, 5).map((product, index) => {
                  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

                  return [
                    <Line
                      key={`${product.productId}_${previousYear}`}
                      type="monotone"
                      dataKey={`${product.productName}_${previousYear}`}
                      stroke={colors[index]}
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      name={`${product.productName} (${previousYear})`}
                      dot={{ r: 3 }}
                    />,
                    <Line
                      key={`${product.productId}_${selectedYear}`}
                      type="monotone"
                      dataKey={`${product.productName}_${selectedYear}`}
                      stroke={colors[index]}
                      strokeWidth={3}
                      name={`${product.productName} (${selectedYear})`}
                      dot={{ r: 4 }}
                    />,
                  ]
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

// 表示名を設定（デバッグ用）
YearOverYearProductAnalysis.displayName = 'YearOverYearProductAnalysis'

export default YearOverYearProductAnalysis
