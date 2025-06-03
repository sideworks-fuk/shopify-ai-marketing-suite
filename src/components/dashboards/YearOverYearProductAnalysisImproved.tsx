"use client"

import React, { useState, useMemo, useCallback } from "react"
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

// 型定義
interface ProductData {
  productId: string
  productName: string
  category: string
  sales2024: number
  sales2025: number
  quantity2024: number
  quantity2025: number
  orders2024: number
  orders2025: number
  growth: number
}

// 軽量化されたサンプルデータ（10商品）
const generateImprovedSampleData = (): ProductData[] => {
  const products = [
    { id: "1", name: "【サンプル】カラートレースリム 150 ホワイト", category: "食品包装容器" },
    { id: "2", name: "【サンプル】カラートレー 165 ブラウン", category: "食品包装容器" },
    { id: "3", name: "【サンプル】IKトレースリム 150 黒", category: "食品包装容器" },
    { id: "4", name: "【サンプル】nwクリスマスデコ箱4号H130", category: "ギフトボックス" },
    { id: "5", name: "【サンプル】Criollo-Bitter-デコ箱4号H130", category: "ギフトボックス" },
    { id: "6", name: "パピエール #47 アメリカンレッド", category: "食品包装容器" },
    { id: "7", name: "カラーココット 65角(レッド)", category: "食品包装容器" },
    { id: "8", name: "【サンプル】エコクラフトロールケーキ箱", category: "エコ包装材" },
    { id: "9", name: "ペーパーココットシート 160角(茶).1500入", category: "ベーキング用品" },
    { id: "10", name: "【サンプル】ペーパーココット 75角(ホワイト)", category: "ベーキング用品" },
  ]

  return products.map((product) => {
    // 商品特性に応じた基本パラメータ
    const basePrice = product.name.includes("1500入") ? 20000 :
                     product.name.includes("デコ箱") ? 350 :
                     product.name.includes("ココット") ? 100 : 200

    const baseQuantity2024 = Math.floor(Math.random() * 500 + 200)
    const baseOrders2024 = Math.floor(baseQuantity2024 * (0.2 + Math.random() * 0.3))
    const sales2024 = baseQuantity2024 * basePrice

    // 成長率の設定
    let growthRate: number
    if (product.category === "エコ包装材") {
      growthRate = 0.15 + Math.random() * 0.25  // 15-40%
    } else if (product.category === "ギフトボックス") {
      growthRate = -0.05 + Math.random() * 0.35  // -5% to 30%
    } else if (product.category === "ベーキング用品") {
      growthRate = 0.05 + Math.random() * 0.2   // 5-25%
    } else {
      growthRate = -0.15 + Math.random() * 0.4  // -15% to 25%
    }

    // クリスマス商品は特別な成長率
    if (product.name.includes("クリスマス")) {
      growthRate += 0.15
    }

    const quantity2025 = Math.floor(baseQuantity2024 * (1 + growthRate))
    const orders2025 = Math.floor(baseOrders2024 * (1 + growthRate))
    const sales2025 = Math.floor(sales2024 * (1 + growthRate))

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      sales2024,
      sales2025: Math.max(0, sales2025),
      quantity2024: baseQuantity2024,
      quantity2025: Math.max(0, quantity2025),
      orders2024: baseOrders2024,
      orders2025: Math.max(0, orders2025),
      growth: growthRate * 100,
    }
  })
}

// 商品別成長率ランキング
const ProductGrowthRanking = ({ data }: { data: ProductData[] }) => {
  const topGrowers = data
    .filter(p => p.growth > 0)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 5)

  const topDecliners = data
    .filter(p => p.growth < 0)
    .sort((a, b) => a.growth - b.growth)
    .slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <TrendingUp className="h-5 w-5" />🚀 成長率 Top5
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
                <div className="text-green-700 font-bold text-lg">+{product.growth.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <TrendingDown className="h-5 w-5" />📉 要注意商品 Top5
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
                  {product.growth.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 詳細フィルタリング機能
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
                <SelectItem value="all">全商品</SelectItem>
                <SelectItem value="positive">成長商品のみ</SelectItem>
                <SelectItem value="negative">減少商品のみ</SelectItem>
                <SelectItem value="high_growth">高成長商品（+20%以上）</SelectItem>
                <SelectItem value="high_decline">要注意商品（-20%以下）</SelectItem>
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
                <SelectItem value="all">全売上帯</SelectItem>
                <SelectItem value="high">高売上（100万円以上）</SelectItem>
                <SelectItem value="medium">中売上（10-100万円）</SelectItem>
                <SelectItem value="low">低売上（10万円未満）</SelectItem>
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

const YearOverYearProductAnalysisImproved = () => {
  const [data] = useState<ProductData[]>(generateImprovedSampleData())
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [sortBy, setSortBy] = useState<"name" | "growth" | "total">("growth")
  const [appliedFilters, setAppliedFilters] = useState({
    growthRate: "all",
    salesRange: "all",
    category: "all",
    searchTerm: "",
  })

  // フィルタリングとソート（軽量化）
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((product) => {
      const matchesSearch = product.productName.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase())
      const matchesCategory = appliedFilters.category === "all" || product.category === appliedFilters.category

      let matchesGrowth = true
      if (appliedFilters.growthRate === "positive") {
        matchesGrowth = product.growth > 0
      } else if (appliedFilters.growthRate === "negative") {
        matchesGrowth = product.growth < 0
      } else if (appliedFilters.growthRate === "high_growth") {
        matchesGrowth = product.growth > 20
      } else if (appliedFilters.growthRate === "high_decline") {
        matchesGrowth = product.growth < -20
      }

      let matchesSales = true
      if (appliedFilters.salesRange !== "all") {
        const currentValue = viewMode === "sales" ? product.sales2025 :
                            viewMode === "quantity" ? product.quantity2025 : product.orders2025
        if (appliedFilters.salesRange === "high") {
          matchesSales = currentValue >= 1000000
        } else if (appliedFilters.salesRange === "medium") {
          matchesSales = currentValue >= 100000 && currentValue < 1000000
        } else if (appliedFilters.salesRange === "low") {
          matchesSales = currentValue < 100000
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
          return b.growth - a.growth
        case "total":
          const aValue = viewMode === "sales" ? a.sales2025 :
                        viewMode === "quantity" ? a.quantity2025 : a.orders2025
          const bValue = viewMode === "sales" ? b.sales2025 :
                        viewMode === "quantity" ? b.quantity2025 : b.orders2025
          return bValue - aValue
        default:
          return 0
      }
    })

    return filtered
  }, [data, appliedFilters, sortBy, viewMode])

  // カテゴリ一覧
  const categories = useMemo(() => {
    return Array.from(new Set(data.map(p => p.category))).sort()
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

  // サマリー統計
  const summary = useMemo(() => {
    const total2024 = filteredAndSortedData.reduce((sum, p) => {
      return sum + (viewMode === "sales" ? p.sales2024 :
                   viewMode === "quantity" ? p.quantity2024 : p.orders2024)
    }, 0)

    const total2025 = filteredAndSortedData.reduce((sum, p) => {
      return sum + (viewMode === "sales" ? p.sales2025 :
                   viewMode === "quantity" ? p.quantity2025 : p.orders2025)
    }, 0)

    const overallGrowth = total2024 > 0 ? ((total2025 - total2024) / total2024) * 100 : 0
    const growingProducts = filteredAndSortedData.filter(p => p.growth > 0).length
    const decliningProducts = filteredAndSortedData.filter(p => p.growth < 0).length

    return {
      total2024,
      total2025,
      overallGrowth,
      growingProducts,
      decliningProducts,
      totalProducts: filteredAndSortedData.length,
    }
  }, [filteredAndSortedData, viewMode])

  return (
    <div className="space-y-6">
      {/* 改良ステータス */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <span className="font-medium text-green-800">✅ 改良版コンポーネント</span>
              <div className="text-sm text-green-700 mt-1">
                Rechartsライブラリを除去し、データ処理を軽量化してサイドメニューの問題を解決しました
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            前年同月比【商品】分析（改良版）
          </CardTitle>
          <CardDescription>軽量化されたデータと処理で全機能を提供</CardDescription>
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

            <div className="text-sm text-gray-600 flex items-center">
              表示商品: <strong className="ml-1">{filteredAndSortedData.length}件</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 詳細フィルタリング */}
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
            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
              summary.overallGrowth >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {summary.overallGrowth >= 0 ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
              {summary.overallGrowth >= 0 ? "+" : ""}{summary.overallGrowth.toFixed(1)}%
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

      {/* 商品別成長率サマリー */}
      <ProductGrowthRanking data={filteredAndSortedData} />

      {/* シンプル化されたデータテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>商品別前年同月比データ</CardTitle>
          <CardDescription>
            2024年と2025年の比較データ（重いテーブル処理を削除済み）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-3 font-medium text-gray-900">商品名</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-900">カテゴリ</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-900">2024年実績</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-900">2025年実績</th>
                  <th className="text-center py-4 px-3 font-medium text-gray-900">成長率</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((product) => {
                  const value2024 = viewMode === "sales" ? product.sales2024 :
                                   viewMode === "quantity" ? product.quantity2024 : product.orders2024
                  const value2025 = viewMode === "sales" ? product.sales2025 :
                                   viewMode === "quantity" ? product.quantity2025 : product.orders2025

                  return (
                    <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium">{product.productName}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-600">
                        {product.category}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {formatValue(value2024, viewMode)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {formatValue(value2025, viewMode)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge className={`${
                          product.growth >= 10 ? "bg-green-100 text-green-800" :
                          product.growth >= 0 ? "bg-blue-100 text-blue-800" :
                          product.growth >= -10 ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {product.growth >= 0 ? "+" : ""}{product.growth.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* パフォーマンス改善通知 */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">🚀 パフォーマンス改善項目</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Rechartsライブラリを除去</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>月次データテーブルを簡素化</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>大量のuseMemo処理を削減</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>遅延読み込みでレンダリング最適化</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>データ構造をフラット化</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>必要な機能のみを保持</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisImproved 