"use client"

import React from "react"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import { Search, Download, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

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

// サンプルデータ生成
const generateSampleData = (): ProductYearData[] => {
  const products = [
    { id: "1", name: "【サンプル】カラートレースリム 150 ホワイト", category: "食品包装容器" },
    { id: "2", name: "【サンプル】カラートレー 165 ブラウン", category: "食品包装容器" },
    { id: "3", name: "【サンプル】IKトレースリム 150 黒", category: "食品包装容器" },
    { id: "4", name: "【サンプル】IKトレー 165 浅黄", category: "食品包装容器" },
    { id: "5", name: "【サンプル】nwクリスマスデコ箱4号H130(窓冷凍スペース付)", category: "ギフトボックス" },
    { id: "6", name: "【サンプル】nwクレープ箱4号H130(窓冷凍スペース付)", category: "ギフトボックス" },
    { id: "7", name: "【サンプル】Criollo-Bitter-デコ箱4号H130", category: "ギフトボックス" },
    { id: "8", name: "【サンプル】Criollo-Bitter-デコ箱5号H150", category: "ギフトボックス" },
    { id: "9", name: "【サンプル】Criollo-Bitter-デコ箱6号H150", category: "ギフトボックス" },
    { id: "10", name: "パピエール #47 アメリカンレッド", category: "食品包装容器" },
    { id: "11", name: "カラーココット 65角(レッド)", category: "食品包装容器" },
    { id: "12", name: "カラーココット 65角(ウォルナット)", category: "食品包装容器" },
    { id: "13", name: "【サンプル】UNIエコクラフトロールケーキ箱", category: "エコ包装材" },
    { id: "14", name: "【サンプル】エコクラフトロールケーキ箱H150", category: "エコ包装材" },
    { id: "15", name: "【サンプル】エコクラフトデコ箱5号H130", category: "エコ包装材" },
    { id: "16", name: "【サンプル】エコクラフトデコ箱5号H113", category: "エコ包装材" },
    { id: "17", name: "【サンプル】エコクラフトデコ箱6号H150", category: "エコ包装材" },
    { id: "18", name: "ペーパーココットシート 160角(茶).1500入", category: "ベーキング用品" },
    { id: "19", name: "ペーパーココットシート 150角(ブレンチ茶).1500入", category: "ベーキング用品" },
    { id: "20", name: "ペーパーココットシート 140角(茶).1500入", category: "ベーキング用品" },
    { id: "21", name: "【サンプル】ペーパーココット 75角(ホワイト)", category: "ベーキング用品" },
    { id: "22", name: "【サンプル】ペーパーココット 63角(ジェントルサンタ)", category: "ベーキング用品" },
  ]

  return products.map((product) => {
    const monthlyData: { [key: string]: MonthlyData } = {}
    const yearOverYearGrowth: { [month: string]: number } = {}

    // 商品特性に応じた売上パターンを設定
    const getSeasonalMultiplier = (month: number, productName: string) => {
      // クリスマス商品は12月にピーク
      if (productName.includes("クリスマス")) {
        return month === 12 ? 3.0 : month === 11 ? 2.0 : month === 1 ? 1.5 : 0.8
      }
      // ケーキ箱は春・秋にピーク（イベントシーズン）
      if (productName.includes("ケーキ箱") || productName.includes("デコ箱")) {
        return month === 3 || month === 4 || month === 10 || month === 11
          ? 1.8
          : month === 12 || month === 2
            ? 1.5
            : 1.0
      }
      // ココット系は夏場に需要増
      if (productName.includes("ココット")) {
        return month >= 6 && month <= 8 ? 1.6 : 1.0
      }
      // エコ系は年間通して安定
      if (productName.includes("エコ")) {
        return 1.0 + Math.sin(((month - 1) * Math.PI) / 6) * 0.2
      }
      return 1.0
    }

    // 商品価格帯設定
    const getProductPriceRange = (productName: string) => {
      if (productName.includes("1500入")) return { min: 15000, max: 25000 } // 大容量商品
      if (productName.includes("デコ箱")) return { min: 200, max: 500 } // デコ箱
      if (productName.includes("ケーキ箱")) return { min: 150, max: 400 } // ケーキ箱
      if (productName.includes("ココット")) return { min: 50, max: 150 } // ココット
      if (productName.includes("トレー")) return { min: 80, max: 200 } // トレー
      return { min: 100, max: 300 } // その他
    }

    const priceRange = getProductPriceRange(product.name)
    const basePrice = Math.floor(Math.random() * (priceRange.max - priceRange.min) + priceRange.min)

    // 2024年と2025年のデータを生成
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, "0")
      const seasonalMultiplier = getSeasonalMultiplier(month, product.name)

      // 2024年データ（ベースライン）
      const baseQuantity = Math.floor((Math.random() * 200 + 50) * seasonalMultiplier)
      const baseOrders = Math.floor(baseQuantity * (0.3 + Math.random() * 0.4)) // 注文数は数量の30-70%
      const baseSales = baseQuantity * basePrice

      monthlyData[`2024-${monthStr}`] = {
        sales: baseSales,
        quantity: baseQuantity,
        orders: baseOrders,
      }

      // 2025年データ（成長率を考慮）
      let growthRate: number

      // 商品カテゴリ別の成長トレンド
      if (product.category === "エコ包装材") {
        growthRate = 0.1 + Math.random() * 0.3 // エコ商品は10-40%成長
      } else if (product.category === "ギフトボックス") {
        growthRate = -0.1 + Math.random() * 0.4 // ギフト系は-10%から+30%
      } else if (product.category === "ベーキング用品") {
        growthRate = 0.05 + Math.random() * 0.25 // ベーキング用品は5-30%成長
      } else {
        growthRate = -0.2 + Math.random() * 0.5 // その他は-20%から+30%
      }

      // 季節性も考慮
      if (product.name.includes("クリスマス") && month === 12) {
        growthRate += 0.2 // クリスマス商品の12月はさらに成長
      }

      const sales2025 = Math.floor(baseSales * (1 + growthRate))
      const quantity2025 = Math.floor(baseQuantity * (1 + growthRate))
      const orders2025 = Math.floor(baseOrders * (1 + growthRate))

      monthlyData[`2025-${monthStr}`] = {
        sales: Math.max(0, sales2025),
        quantity: Math.max(0, quantity2025),
        orders: Math.max(0, orders2025),
      }

      // 成長率計算
      yearOverYearGrowth[monthStr] = growthRate * 100
    }

    // 年間平均成長率計算
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
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [comparisonMode, setComparisonMode] = useState<"sideBySide" | "growth">("sideBySide")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "growth" | "total">("growth")

  // フィルタリングとソート
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((product) => {
      const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      return matchesSearch && matchesCategory
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
            .filter((key) => key.toString().startsWith("2025"))
            .reduce((sum, month) => sum + (month[viewMode] || 0), 0)
          const bTotal = Object.values(b.monthlyData)
            .filter((key) => key.toString().startsWith("2025"))
            .reduce((sum, month) => sum + (month[viewMode] || 0), 0)
          return bTotal - aTotal
        default:
          return 0
      }
    })

    return filtered
  }, [data, searchTerm, selectedCategory, sortBy, viewMode])

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
      // 年間合計計算
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, "0")
        const data2024 = product.monthlyData[`2024-${monthStr}`]?.[viewMode] || 0
        const data2025 = product.monthlyData[`2025-${monthStr}`]?.[viewMode] || 0
        total2024 += data2024
        total2025 += data2025
      }

      // 成長・減少商品カウント
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

      // 上位5商品のデータを追加
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="商品名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリ" />
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

            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              エクスポート
            </Button>
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">成長率順</SelectItem>
                  <SelectItem value="total">売上順</SelectItem>
                  <SelectItem value="name">商品名順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[2000px]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="sticky left-0 bg-white z-10 text-left py-4 px-3 font-medium text-gray-900 border-r border-gray-200 min-w-[200px]">
                      商品名
                    </th>
                    {comparisonMode === "sideBySide"
                      ? // 年度並列表示ヘッダー
                        Array.from({ length: 12 }, (_, i) => {
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
                      : // 成長率表示ヘッダー
                        Array.from({ length: 12 }, (_, i) => {
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
                          <th className="text-center py-2 px-1 text-xs font-medium text-gray-700 border-r border-gray-100 bg-blue-25 min-w-[70px]">
                            2024
                          </th>
                          <th className="text-center py-2 px-1 text-xs font-medium text-gray-700 border-r border-gray-200 bg-green-25 min-w-[70px]">
                            2025
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
                        ? // 年度並列表示データ
                          Array.from({ length: 12 }, (_, i) => {
                            const month = (i + 1).toString().padStart(2, "0")
                            const data2024 = product.monthlyData[`2024-${month}`]?.[viewMode] || 0
                            const data2025 = product.monthlyData[`2025-${month}`]?.[viewMode] || 0

                            return (
                              <React.Fragment key={month}>
                                <td className="py-3 px-1 text-center text-xs font-mono border-r border-gray-100">
                                  {formatValue(data2024, viewMode)}
                                </td>
                                <td className="py-3 px-1 text-center text-xs font-mono border-r border-gray-200">
                                  {formatValue(data2025, viewMode)}
                                </td>
                              </React.Fragment>
                            )
                          })
                        : // 成長率表示データ
                          Array.from({ length: 12 }, (_, i) => {
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
