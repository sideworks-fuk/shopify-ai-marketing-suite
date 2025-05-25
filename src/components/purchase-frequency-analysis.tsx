"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Users, BarChart3 } from "lucide-react"

// 購入回数データの型定義
interface ProductPurchaseFrequencyData {
  productName: string
  productId: string
  category: string
  totalCustomers: number
  purchaseFrequencies: {
    current: { [purchaseCount: string]: number } // "1回目": 120, "2回目": 50, etc.
    previous: { [purchaseCount: string]: number } // 前年同期データ
  }
  conversionRates: { [transition: string]: number } // "1→2": 45.5, "2→3": 30.2, etc.
  avgGrowthRate: number // 平均成長率
  status: "成長" | "安定" | "要注意" // 商品ステータス
}

// ヒートマップの色計算（成長率ベース）
const getHeatmapColor = (growth: number): string => {
  if (growth > 20) return "bg-green-200 text-green-900"
  if (growth > 10) return "bg-green-100 text-green-800"
  if (growth > 0) return "bg-blue-100 text-blue-800"
  if (growth > -10) return "bg-yellow-100 text-yellow-800"
  if (growth > -20) return "bg-orange-100 text-orange-800"
  return "bg-red-100 text-red-800"
}

// 成長率バッジコンポーネント
const GrowthBadge = ({ growth }: { growth: number }) => {
  const sign = growth > 0 ? "+" : ""
  return (
    <Badge className={getHeatmapColor(growth)}>
      {sign}
      {growth.toFixed(1)}%
    </Badge>
  )
}

// 商品ステータスバッジ
const ProductStatusBadge = ({ status, avgGrowth }: { status: string; avgGrowth: number }) => {
  if (status === "成長") return <Badge className="bg-green-100 text-green-800">🚀 成長商品</Badge>
  if (status === "安定") return <Badge className="bg-blue-100 text-blue-800">📈 安定商品</Badge>
  return <Badge className="bg-red-100 text-red-800">⚠️ 要注意商品</Badge>
}

// 実際の商品データを使用したサンプルデータ生成
const generateSampleData = (): ProductPurchaseFrequencyData[] => {
  const products = [
    { id: "1", name: "【サンプル】カラートレースリム 150 ホワイト", category: "食品包装容器" },
    { id: "2", name: "【サンプル】カラートレー 165 ブラウン", category: "食品包装容器" },
    { id: "3", name: "【サンプル】IKトレースリム 150 黒", category: "食品包装容器" },
    { id: "4", name: "【サンプル】nwクリスマスデコ箱4号H130", category: "ギフトボックス" },
    { id: "5", name: "【サンプル】Criollo-Bitter-デコ箱5号H150", category: "ギフトボックス" },
    { id: "6", name: "【サンプル】UNIエコクラフトロールケーキ箱", category: "エコ包装材" },
    { id: "7", name: "【サンプル】エコクラフトデコ箱5号H130", category: "エコ包装材" },
    { id: "8", name: "ペーパーココットシート 160角(茶).1500入", category: "ベーキング用品" },
    { id: "9", name: "【サンプル】ペーパーココット 75角(ホワイト)", category: "ベーキング用品" },
    { id: "10", name: "カラーココット 65角(レッド)", category: "食品包装容器" },
  ]

  return products.map((product) => {
    const purchaseFrequencies = {
      current: {} as { [purchaseCount: string]: number },
      previous: {} as { [purchaseCount: string]: number },
    }
    const conversionRates: { [transition: string]: number } = {}
    let totalGrowth = 0
    let growthCount = 0

    // 商品特性に応じたベース顧客数設定
    const getBaseCustomerCount = (productName: string, purchaseCount: number) => {
      let baseMultiplier = 1.0

      // 商品特性による調整
      if (productName.includes("クリスマス")) {
        baseMultiplier = 0.8 // 季節商品は顧客数少なめ
      } else if (productName.includes("エコ")) {
        baseMultiplier = 1.3 // エコ商品は人気
      } else if (productName.includes("1500入")) {
        baseMultiplier = 0.6 // 大容量商品は顧客数少なめ
      }

      // 購入回数による減衰
      const decayFactor = Math.pow(0.7, purchaseCount - 1)
      return Math.floor(500 * baseMultiplier * decayFactor * (0.8 + Math.random() * 0.4))
    }

    // 12回分のデータ生成
    for (let i = 1; i <= 12; i++) {
      const purchaseCountKey = `${i}回目`

      // 現在期間のデータ
      const currentCount = getBaseCustomerCount(product.name, i)
      purchaseFrequencies.current[purchaseCountKey] = currentCount

      // 前年同期のデータ（商品カテゴリによる成長トレンド）
      let growthRate: number
      if (product.category === "エコ包装材") {
        growthRate = 0.15 + Math.random() * 0.25 // 15-40%成長
      } else if (product.category === "ギフトボックス") {
        growthRate = -0.05 + Math.random() * 0.3 // -5%から+25%
      } else if (product.category === "ベーキング用品") {
        growthRate = 0.05 + Math.random() * 0.2 // 5-25%成長
      } else {
        growthRate = -0.1 + Math.random() * 0.4 // -10%から+30%
      }

      const previousCount = Math.floor(currentCount / (1 + growthRate))
      purchaseFrequencies.previous[purchaseCountKey] = Math.max(1, previousCount)

      totalGrowth += growthRate * 100
      growthCount++

      // 転換率計算（i回目 → i+1回目）
      if (i < 12) {
        const nextCount = getBaseCustomerCount(product.name, i + 1)
        const conversionRate = currentCount > 0 ? (nextCount / currentCount) * 100 : 0
        conversionRates[`${i}→${i + 1}`] = Math.min(conversionRate, 100) // 100%を上限
      }
    }

    const avgGrowthRate = growthCount > 0 ? totalGrowth / growthCount : 0

    // ステータス判定
    let status: "成長" | "安定" | "要注意"
    if (avgGrowthRate > 15) status = "成長"
    else if (avgGrowthRate > -5) status = "安定"
    else status = "要注意"

    const totalCustomers = Object.values(purchaseFrequencies.current).reduce((sum, count) => sum + count, 0)

    return {
      productName: product.name,
      productId: product.id,
      category: product.category,
      totalCustomers,
      purchaseFrequencies,
      conversionRates,
      avgGrowthRate,
      status,
    }
  })
}

// 商品別成長率ランキング
const ProductGrowthRanking = ({ data }: { data: ProductPurchaseFrequencyData[] }) => {
  const topGrowers = [...data].sort((a, b) => b.avgGrowthRate - a.avgGrowthRate).slice(0, 5)
  const topDecliners = [...data].sort((a, b) => a.avgGrowthRate - b.avgGrowthRate).slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <TrendingUp className="h-5 w-5" />
            成長商品 Top5
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
                <div className="text-green-700 font-bold">+{product.avgGrowthRate.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <TrendingDown className="h-5 w-5" />
            要注意商品 Top5
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
                <div className="text-red-700 font-bold">{product.avgGrowthRate.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 転換率分析
const ConversionAnalysis = ({ data }: { data: ProductPurchaseFrequencyData[] }) => {
  const conversionData = data.map((product) => ({
    productName: product.productName,
    conversion1to2: product.conversionRates["1→2"] || 0,
    conversion2to3: product.conversionRates["2→3"] || 0,
    conversion3to4: product.conversionRates["3→4"] || 0,
    avgConversion:
      Object.values(product.conversionRates).reduce((sum, rate) => sum + rate, 0) /
      Object.keys(product.conversionRates).length,
  }))

  const topConversionProducts = [...conversionData].sort((a, b) => b.avgConversion - a.avgConversion).slice(0, 5)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          商品別転換率分析
        </CardTitle>
        <CardDescription>各商品の購入回数転換率（リピート購入率）</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {topConversionProducts.map((product, index) => (
            <div key={index} className="p-4 rounded-lg border bg-blue-50">
              <div className="text-sm font-medium mb-2">{product.productName}</div>
              <div className="space-y-1 text-xs">
                <div>1→2回目: {product.conversion1to2.toFixed(1)}%</div>
                <div>2→3回目: {product.conversion2to3.toFixed(1)}%</div>
                <div>3→4回目: {product.conversion3to4.toFixed(1)}%</div>
                <div className="font-bold text-blue-700">平均: {product.avgConversion.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-bold text-blue-800 mb-2">💡 転換率改善提案</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 転換率30%未満の商品は、初回購入後のフォローアップを強化</li>
            <li>• エコ商品は転換率が高い傾向 - 類似商品の開発を検討</li>
            <li>• 季節商品は適切なタイミングでのリマインド施策が効果的</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

interface ProductPurchaseFrequencyAnalysisProps {
  shopDomain?: string
  accessToken?: string
  useSampleData?: boolean
}

export default function ProductPurchaseFrequencyAnalysis({
  shopDomain,
  accessToken,
  useSampleData = true,
}: ProductPurchaseFrequencyAnalysisProps) {
  const [data, setData] = useState<ProductPurchaseFrequencyData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"current" | "comparison">("current")
  const [periodSettings, setPeriodSettings] = useState({
    currentPeriod: "2025-Q1",
    previousPeriod: "2024-Q1",
  })

  const fetchData = async () => {
    if (useSampleData || !shopDomain || !accessToken) {
      setData(generateSampleData())
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/analytics/product-purchase-frequency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(periodSettings),
      })
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error("Failed to fetch product purchase frequency data:", err)
      setError("データの取得に失敗しました。サンプルデータを表示します。")
      setData(generateSampleData())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [shopDomain, accessToken, useSampleData, periodSettings])

  // サマリー統計計算
  const summary = useMemo(() => {
    const totalCustomers = data.reduce((sum, product) => sum + product.totalCustomers, 0)
    const growingProducts = data.filter((product) => product.avgGrowthRate > 0).length
    const decliningProducts = data.filter((product) => product.avgGrowthRate < 0).length
    const avgGrowthRate = data.reduce((sum, product) => sum + product.avgGrowthRate, 0) / data.length

    return {
      totalCustomers,
      growingProducts,
      decliningProducts,
      avgGrowthRate,
      totalProducts: data.length,
    }
  }, [data])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>商品別購入回数分析</CardTitle>
          <CardDescription>各商品の購入回数別顧客分布と成長率分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                データを読み込み中...
              </div>
            ) : (
              "データがありません"
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const purchaseCounts = Array.from({ length: 12 }, (_, i) => `${i + 1}回目`)

  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            商品別購入回数分析
          </CardTitle>
          <CardDescription>各商品の購入回数別顧客分布と前年同期比較</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">現在期間</label>
              <Select
                value={periodSettings.currentPeriod}
                onValueChange={(value) => setPeriodSettings({ ...periodSettings, currentPeriod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-Q1">2025年Q1</SelectItem>
                  <SelectItem value="2025-Q2">2025年Q2</SelectItem>
                  <SelectItem value="2025-Q3">2025年Q3</SelectItem>
                  <SelectItem value="2025-Q4">2025年Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">比較期間</label>
              <Select
                value={periodSettings.previousPeriod}
                onValueChange={(value) => setPeriodSettings({ ...periodSettings, previousPeriod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-Q1">2024年Q1</SelectItem>
                  <SelectItem value="2024-Q2">2024年Q2</SelectItem>
                  <SelectItem value="2024-Q3">2024年Q3</SelectItem>
                  <SelectItem value="2024-Q4">2024年Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">表示モード</label>
              <Select value={viewMode} onValueChange={(value: "current" | "comparison") => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">現在期間</SelectItem>
                  <SelectItem value="comparison">前年同期比較</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchData} disabled={isLoading} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              更新
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mt-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {useSampleData && (
            <div className="flex items-center gap-2 text-blue-600 text-sm mt-4">
              <AlertCircle className="h-4 w-4" />
              サンプルデータを表示しています
            </div>
          )}
        </CardContent>
      </Card>

      {/* サマリー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{summary.totalCustomers.toLocaleString()}</div>
              <div className="text-sm text-gray-600">総顧客数</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summary.growingProducts}</div>
              <div className="text-sm text-gray-600">成長商品数</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{summary.decliningProducts}</div>
              <div className="text-sm text-gray-600">要注意商品数</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${summary.avgGrowthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                {summary.avgGrowthRate >= 0 ? "+" : ""}
                {summary.avgGrowthRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">平均成長率</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 商品別成長率ランキング */}
      <ProductGrowthRanking data={data} />

      {/* 転換率分析 */}
      <ConversionAnalysis data={data} />

      {/* メインデータテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>商品別購入回数詳細データ</CardTitle>
          <CardDescription>
            {viewMode === "current" ? "現在期間の購入回数別顧客数" : "前年同期比較（成長率をヒートマップで表示）"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[1400px]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="sticky left-0 bg-white z-10 text-left py-4 px-3 font-medium text-gray-900 border-r border-gray-200 min-w-[200px]">
                      商品名
                    </th>
                    {purchaseCounts.map((count) => (
                      <th
                        key={count}
                        className="text-center py-2 px-2 font-medium text-gray-900 border-r border-gray-200 bg-blue-50 min-w-[80px]"
                      >
                        {count}
                      </th>
                    ))}
                    <th className="text-center py-2 px-2 font-medium text-gray-900 bg-green-50 min-w-[100px]">
                      ステータス
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((product) => (
                    <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 bg-white z-10 py-3 px-3 font-medium text-gray-900 border-r border-gray-200">
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-gray-500">{product.category}</div>
                          <Badge variant="outline" className="mt-1">
                            平均成長率: {product.avgGrowthRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </td>
                      {purchaseCounts.map((count) => {
                        const currentCount = product.purchaseFrequencies.current[count] || 0
                        const previousCount = product.purchaseFrequencies.previous[count] || 0
                        const growth = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0

                        return (
                          <td
                            key={`${product.productId}-${count}`}
                            className="py-2 px-2 text-center border-r border-gray-200"
                          >
                            {viewMode === "current" ? (
                              <div className="font-mono">{currentCount.toLocaleString()}</div>
                            ) : (
                              <div className={`p-2 rounded ${getHeatmapColor(growth)}`}>
                                <div className="font-mono font-bold">{currentCount.toLocaleString()}</div>
                                <div className="text-xs">
                                  {growth > 0 ? "+" : ""}
                                  {growth.toFixed(1)}%
                                </div>
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-3 px-2 text-center">
                        <ProductStatusBadge status={product.status} avgGrowth={product.avgGrowthRate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
