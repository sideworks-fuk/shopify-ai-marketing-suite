"use client"

import React from "react"

import { useState, useMemo, useCallback } from "react"
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
interface MonthlyData {
  sales: number
  quantity: number
  orders: number
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
  viewMode: string
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
const ProductGrowthRanking = ({ data, viewMode }: { data: ProductYearData[]; viewMode: string }) => {
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

// サンプルデータ生成（既存のコードを使用）
const generateSampleData = (): ProductYearData[] => {
  // 実際のShopify商品名を使用
  const products = [
    { id: "1", name: "ナチュラルグレーデコ缶5号H150", category: "ケーキ・デコ缶" },
    { id: "2", name: "エコクラフトデコ缶4号H130", category: "ケーキ・デコ缶" },
    { id: "3", name: "UNIエコクラフトカットケーキ1号SS", category: "ケーキ・デコ缶" },
    { id: "4", name: "UNIエコクラフトカットケーキ2号S", category: "ケーキ・デコ缶" },
    { id: "5", name: "パウンドケーキ(チョコレート)", category: "パウンドケーキ" },
    { id: "6", name: "パウンドケーキS(ニュートラルグレー)", category: "パウンドケーキ" },
    { id: "7", name: "プロテーン4号サイズ(ホワイト)", category: "プロテーン・サプリ" },
    { id: "8", name: "ギフトボックスM(ナチュラルグレー)", category: "ギフトボックス" },
    { id: "9", name: "イーグラップ S クラフト", category: "クラフト・容器" },
    { id: "10", name: "保冷バッグ M", category: "その他・付属品" },
  ]

  return products.map((product) => {
    const monthlyData: { [key: string]: MonthlyData } = {}
    const yearOverYearGrowth: { [month: string]: number } = {}

    // 商品特性に応じた売上パターンを設定
    const getSeasonalMultiplier = (month: number, productName: string) => {
      if (productName.includes("クリスマス")) {
        return month === 12 ? 3.0 : month === 11 ? 2.0 : month === 1 ? 1.5 : 0.8
      }
      if (productName.includes("デコ缶") || productName.includes("ケーキ")) {
        return month === 3 || month === 4 || month === 10 || month === 11
          ? 1.8
          : month === 12 || month === 2
            ? 1.5
            : 1.0
      }
      if (productName.includes("パウンドケーキ")) {
        return month >= 10 && month <= 12 ? 1.6 : month >= 2 && month <= 4 ? 1.4 : 1.0
      }
      if (productName.includes("ギフトボックス")) {
        return month === 12 || month === 2 ? 2.0 : month === 3 || month === 5 ? 1.5 : 1.0
      }
      if (productName.includes("エコ") || productName.includes("クラフト")) {
        return 1.0 + Math.sin(((month - 1) * Math.PI) / 6) * 0.2
      }
      return 1.0
    }

    const getProductPriceRange = (productName: string) => {
      if (productName.includes("プロテーン")) return { min: 3000, max: 5000 }
      if (productName.includes("デコ缶")) return { min: 2000, max: 4000 }
      if (productName.includes("パウンドケーキ")) return { min: 1800, max: 3000 }
      if (productName.includes("ギフトボックス")) return { min: 1500, max: 2500 }
      if (productName.includes("カットケーキ")) return { min: 1000, max: 2000 }
      if (productName.includes("クラフト") || productName.includes("イーグラップ")) return { min: 500, max: 1000 }
      if (productName.includes("保冷")) return { min: 300, max: 1500 }
      return { min: 800, max: 2000 }
    }

    const priceRange = getProductPriceRange(product.name)
    const basePrice = Math.floor(Math.random() * (priceRange.max - priceRange.min) + priceRange.min)

    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, "0")
      const seasonalMultiplier = getSeasonalMultiplier(month, product.name)

      const baseQuantity = Math.floor((Math.random() * 200 + 50) * seasonalMultiplier)
      const baseOrders = Math.floor(baseQuantity * (0.3 + Math.random() * 0.4))
      const baseSales = baseQuantity * basePrice

      monthlyData[`2024-${monthStr}`] = {
        sales: baseSales,
        quantity: baseQuantity,
        orders: baseOrders,
      }

      let growthRate: number
      if (product.category === "ケーキ・デコ缶") {
        growthRate = 0.05 + Math.random() * 0.3
      } else if (product.category === "パウンドケーキ") {
        growthRate = 0.1 + Math.random() * 0.25
      } else if (product.category === "プロテーン・サプリ") {
        growthRate = 0.15 + Math.random() * 0.35
      } else if (product.category === "ギフトボックス") {
        growthRate = -0.05 + Math.random() * 0.4
      } else if (product.category === "クラフト・容器") {
        growthRate = 0.05 + Math.random() * 0.25
      } else {
        growthRate = -0.1 + Math.random() * 0.4
      }

      if (product.name.includes("クリスマス") && month === 12) {
        growthRate += 0.2
      }

      const sales2025 = Math.floor(baseSales * (1 + growthRate))
      const quantity2025 = Math.floor(baseQuantity * (1 + growthRate))
      const orders2025 = Math.floor(baseOrders * (1 + growthRate))

      monthlyData[`2025-${monthStr}`] = {
        sales: Math.max(0, sales2025),
        quantity: Math.max(0, quantity2025),
        orders: Math.max(0, orders2025),
      }

      yearOverYearGrowth[monthStr] = growthRate * 100
    }

    const growthValues = Object.values(yearOverYearGrowth)
    const avgGrowth = growthValues.reduce((sum, val) => sum + val, 0) / growthValues.length

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      monthlyData,
      yearOverYearGrowth,
      totalGrowth: avgGrowth,
      avgGrowth,
    }
  })
}

const YearOverYearProductAnalysis = () => {
  const [data] = useState<ProductYearData[]>(generateSampleData())
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [comparisonMode, setComparisonMode] = useState<"sideBySide" | "growth">("sideBySide")
  const [sortBy, setSortBy] = useState<"name" | "growth" | "total">("growth")
  const [appliedFilters, setAppliedFilters] = useState({
    growthRate: "all",
    salesRange: "all",
    category: "all",
    searchTerm: "",
  })

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
    let total2024 = 0,
      total2025 = 0
    let growingProducts = 0,
      decliningProducts = 0

    filteredAndSortedData.forEach((product) => {
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, "0")
        const data2024 = product.monthlyData[`2024-${monthStr}`]?.[viewMode] || 0
        const data2025 = product.monthlyData[`2025-${monthStr}`]?.[viewMode] || 0
        total2024 += data2024
        total2025 += data2025
      }

      if (product.avgGrowth > 0) growingProducts++
      else if (product.avgGrowth < 0) decliningProducts++
    })

    const overallGrowth = total2024 > 0 ? ((total2025 - total2024) / total2024) * 100 : 0

    return {
      total2024,
      total2025,
      overallGrowth,
      growingProducts,
      decliningProducts,
      totalProducts: filteredAndSortedData.length,
    }
  }, [filteredAndSortedData, viewMode])

  // チャート用データ生成
  const chartData = useMemo(() => {
    const months = []
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, "0")
      const monthData = { month: `${month}月` }

      const topProducts = filteredAndSortedData.slice(0, 5)
      topProducts.forEach((product) => {
        const data2024 = product.monthlyData[`2024-${monthStr}`]?.[viewMode] || 0
        const data2025 = product.monthlyData[`2025-${monthStr}`]?.[viewMode] || 0

        monthData[`${product.productName}_2024`] = data2024
        monthData[`${product.productName}_2025`] = data2025
      })

      months.push(monthData)
    }
    return months
  }, [filteredAndSortedData, viewMode])

  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            前年同月比【商品】分析
          </CardTitle>
          <CardDescription>商品別の2024年/2025年月次データ比較と成長率分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <AdvancedFilters onFilterChange={setAppliedFilters} categories={categories} />

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{formatValue(summary.total2024, viewMode)}</div>
            <div className="text-sm text-gray-600 mt-1">2024年合計</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{formatValue(summary.total2025, viewMode)}</div>
            <div className="text-sm text-gray-600 mt-1">2025年合計</div>
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

      {/* メインデータテーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>商品別月次データ</CardTitle>
              <CardDescription>
                {comparisonMode === "sideBySide"
                  ? "各月の2024年/2025年データを並列表示"
                  : "前年同月比成長率を表示（正値：成長、負値：減少）"}
              </CardDescription>
            </div>
            <div className="text-sm text-gray-500">{filteredAndSortedData.length}件の商品を表示中</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[2000px]">
              <table className="w-full text-sm border-collapse">
                {/* 改善2: ヘッダーの前年/当年明確化 */}
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="sticky left-0 bg-white z-10 text-left py-4 px-3 font-medium text-gray-900 border-r border-gray-200 min-w-[200px]">
                      商品名
                    </th>
                    {comparisonMode === "sideBySide"
                      ? Array.from({ length: 12 }, (_, i) => {
                          const month = (i + 1).toString().padStart(2, "0")
                          return (
                            <th
                              key={month}
                              colSpan={2}
                              className="text-center py-2 px-2 font-medium text-gray-900 border-r border-gray-200 bg-blue-50"
                            >
                              {month}月
                            </th>
                          )
                        })
                      : Array.from({ length: 12 }, (_, i) => {
                          const month = (i + 1).toString().padStart(2, "0")
                          return (
                            <th
                              key={month}
                              className="text-center py-2 px-2 font-medium text-gray-900 border-r border-gray-200 bg-green-50 min-w-[80px]"
                            >
                              {month}月成長率
                            </th>
                          )
                        })}
                  </tr>
                  {comparisonMode === "sideBySide" && (
                    <tr className="border-b border-gray-200">
                      <th className="sticky left-0 bg-white z-10"></th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <React.Fragment key={i}>
                          <th className="text-center py-2 px-1 text-xs font-medium text-blue-800 border-r border-gray-100 bg-blue-100 min-w-[70px]">
                            2024年
                          </th>
                          <th className="text-center py-2 px-1 text-xs font-medium text-green-800 border-r border-gray-200 bg-green-100 min-w-[70px]">
                            2025年
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredAndSortedData.map((product, index) => (
                    <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white z-10 py-3 px-3 font-medium text-gray-900 border-r border-gray-200">
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-gray-500">{product.category}</div>
                          <Badge variant="outline" className={`mt-1 ${getGrowthColor(product.avgGrowth)}`}>
                            {formatGrowthRate(product.avgGrowth)}
                          </Badge>
                        </div>
                      </td>
                      {comparisonMode === "sideBySide"
                        ? Array.from({ length: 12 }, (_, i) => {
                            const month = (i + 1).toString().padStart(2, "0")
                            const data2024 = product.monthlyData[`2024-${month}`]?.[viewMode] || 0
                            const data2025 = product.monthlyData[`2025-${month}`]?.[viewMode] || 0

                            return (
                              <React.Fragment key={month}>
                                <td className="py-1 px-1 text-center border-r border-gray-100">
                                  <EnhancedDataCell
                                    currentValue={data2024}
                                    previousValue={data2024}
                                    viewMode={viewMode}
                                  />
                                </td>
                                <td className="py-1 px-1 text-center border-r border-gray-200">
                                  <EnhancedDataCell
                                    currentValue={data2025}
                                    previousValue={data2024}
                                    viewMode={viewMode}
                                  />
                                </td>
                              </React.Fragment>
                            )
                          })
                        : Array.from({ length: 12 }, (_, i) => {
                            const month = (i + 1).toString().padStart(2, "0")
                            const growth = product.yearOverYearGrowth[month] || 0

                            return (
                              <td
                                key={month}
                                className="py-3 px-1 text-center text-xs font-mono border-r border-gray-200"
                              >
                                <span className={`px-2 py-1 rounded ${getGrowthColor(growth)}`}>
                                  {formatGrowthRate(growth)}
                                </span>
                              </td>
                            )
                          })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      key={`${product.productId}_2024`}
                      type="monotone"
                      dataKey={`${product.productName}_2024`}
                      stroke={colors[index]}
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      name={`${product.productName} (2024)`}
                      dot={{ r: 3 }}
                    />,
                    <Line
                      key={`${product.productId}_2025`}
                      type="monotone"
                      dataKey={`${product.productName}_2025`}
                      stroke={colors[index]}
                      strokeWidth={3}
                      name={`${product.productName} (2025)`}
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
}

export default YearOverYearProductAnalysis
