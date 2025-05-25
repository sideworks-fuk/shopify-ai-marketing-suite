"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { DataService } from "@/lib/data-service"

// 購入回数別分析データの型定義
interface PurchaseCountAnalysisData {
  purchaseCount: number
  current: {
    customerCount: number
    totalAmount: number
    averageOrderValue: number
  }
  previous: {
    customerCount: number
    totalAmount: number
    averageOrderValue: number
  }
  customerGrowth: number
  amountGrowth: number
  conversionRate?: number
  segment: "new" | "repeat" | "loyal" | "vip"
}

// サンプルデータ
const getSamplePurchaseCountData = (): PurchaseCountAnalysisData[] => {
  return [
    {
      purchaseCount: 1,
      current: { customerCount: 1250, totalAmount: 2500000, averageOrderValue: 2000 },
      previous: { customerCount: 1180, totalAmount: 2360000, averageOrderValue: 2000 },
      customerGrowth: 5.9,
      amountGrowth: 5.9,
      conversionRate: 35.2,
      segment: "new",
    },
    {
      purchaseCount: 2,
      current: { customerCount: 440, totalAmount: 1760000, averageOrderValue: 4000 },
      previous: { customerCount: 415, totalAmount: 1660000, averageOrderValue: 4000 },
      customerGrowth: 6.0,
      amountGrowth: 6.0,
      conversionRate: 28.5,
      segment: "repeat",
    },
    {
      purchaseCount: 3,
      current: { customerCount: 125, totalAmount: 750000, averageOrderValue: 6000 },
      previous: { customerCount: 118, totalAmount: 708000, averageOrderValue: 6000 },
      customerGrowth: 5.9,
      amountGrowth: 5.9,
      conversionRate: 22.1,
      segment: "repeat",
    },
    {
      purchaseCount: 4,
      current: { customerCount: 49, totalAmount: 392000, averageOrderValue: 8000 },
      previous: { customerCount: 46, totalAmount: 368000, averageOrderValue: 8000 },
      customerGrowth: 6.5,
      amountGrowth: 6.5,
      conversionRate: 18.7,
      segment: "loyal",
    },
    {
      purchaseCount: 5,
      current: { customerCount: 22, totalAmount: 220000, averageOrderValue: 10000 },
      previous: { customerCount: 20, totalAmount: 200000, averageOrderValue: 10000 },
      customerGrowth: 10.0,
      amountGrowth: 10.0,
      conversionRate: 15.3,
      segment: "loyal",
    },
    // 6回以上のデータも追加
    ...Array.from({ length: 15 }, (_, i) => ({
      purchaseCount: i + 6,
      current: {
        customerCount: Math.max(1, Math.floor(22 * Math.pow(0.7, i))),
        totalAmount: Math.max(10000, Math.floor(220000 * Math.pow(0.7, i))),
        averageOrderValue: 10000 + i * 1000,
      },
      previous: {
        customerCount: Math.max(1, Math.floor(20 * Math.pow(0.7, i))),
        totalAmount: Math.max(9000, Math.floor(200000 * Math.pow(0.7, i))),
        averageOrderValue: 10000 + i * 1000,
      },
      customerGrowth: 10.0 - i * 0.5,
      amountGrowth: 10.0 - i * 0.5,
      conversionRate: Math.max(5, 15.3 - i * 1.2),
      segment: i < 5 ? ("loyal" as const) : ("vip" as const),
    })),
  ]
}

// 成長率バッジコンポーネント
const GrowthBadge = ({ growth }: { growth: number }) => {
  const getVariant = () => {
    if (growth > 10) return "default" // 緑
    if (growth > 0) return "secondary" // 青
    if (growth > -10) return "outline" // 黄
    return "destructive" // 赤
  }

  return (
    <Badge variant={getVariant()} className="flex items-center gap-1">
      {growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {growth >= 0 ? "+" : ""}
      {growth.toFixed(1)}%
    </Badge>
  )
}

// セグメントバッジコンポーネント
const SegmentBadge = ({ segment }: { segment: string }) => {
  const segmentConfig = {
    new: { variant: "secondary" as const, label: "新規" },
    repeat: { variant: "default" as const, label: "リピート" },
    loyal: { variant: "outline" as const, label: "ロイヤル" },
    vip: { variant: "destructive" as const, label: "VIP" },
  }

  const config = segmentConfig[segment as keyof typeof segmentConfig] || {
    variant: "secondary" as const,
    label: "未分類",
  }

  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface CustomerSegmentAnalysisProps {
  shopDomain?: string
  accessToken?: string
  useSampleData?: boolean
}

export default function CustomerSegmentAnalysis({
  shopDomain,
  accessToken,
  useSampleData = true,
}: CustomerSegmentAnalysisProps) {
  const [purchaseCountData, setPurchaseCountData] = useState<PurchaseCountAnalysisData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"count" | "amount">("count")
  const [currentPeriod, setCurrentPeriod] = useState("2025-Q1")
  const [comparisonPeriod, setComparisonPeriod] = useState("2024-Q1")

  const fetchData = async () => {
    if (useSampleData || !shopDomain || !accessToken) {
      setPurchaseCountData(getSamplePurchaseCountData())
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const dataService = new DataService(shopDomain, accessToken)
      const data = await dataService.getPurchaseCountAnalysis(currentPeriod, comparisonPeriod)
      setPurchaseCountData(data)
    } catch (err) {
      console.error("Failed to fetch purchase count data:", err)
      setError("データの取得に失敗しました。サンプルデータを表示します。")
      setPurchaseCountData(getSamplePurchaseCountData())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [shopDomain, accessToken, useSampleData, currentPeriod, comparisonPeriod])

  // サマリー統計の計算
  const summaryStats = {
    totalCustomers: purchaseCountData.reduce((sum, item) => sum + item.current.customerCount, 0),
    totalAmount: purchaseCountData.reduce((sum, item) => sum + item.current.totalAmount, 0),
    repeatCustomers: purchaseCountData
      .filter((item) => item.purchaseCount > 1)
      .reduce((sum, item) => sum + item.current.customerCount, 0),
    vipCustomers: purchaseCountData
      .filter((item) => item.segment === "vip")
      .reduce((sum, item) => sum + item.current.customerCount, 0),
  }

  const repeatRate =
    summaryStats.totalCustomers > 0 ? (summaryStats.repeatCustomers / summaryStats.totalCustomers) * 100 : 0

  return (
    <div className="space-y-6">
      {/* ヘッダーとコントロール */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                👥 購入回数別顧客分析
                <Badge variant="outline">顧客戦略</Badge>
              </CardTitle>
              <CardDescription>
                顧客の購入回数別セグメント分析により、ロイヤリティ向上と顧客戦略の最適化を支援
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              更新
            </Button>
          </div>

          {/* 期間設定とビューモード */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex gap-2">
              <Select value={currentPeriod} onValueChange={setCurrentPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="現在期間" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-Q1">2025年Q1</SelectItem>
                  <SelectItem value="2025-Q2">2025年Q2</SelectItem>
                  <SelectItem value="2024-Q4">2024年Q4</SelectItem>
                </SelectContent>
              </Select>

              <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="比較期間" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-Q1">2024年Q1</SelectItem>
                  <SelectItem value="2024-Q2">2024年Q2</SelectItem>
                  <SelectItem value="2024-Q3">2024年Q3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "count" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("count")}
              >
                顧客数
              </Button>
              <Button
                variant={viewMode === "amount" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("amount")}
              >
                売上金額
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {useSampleData && (
            <div className="flex items-center gap-2 text-blue-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              サンプルデータを表示しています
            </div>
          )}
        </CardHeader>
      </Card>

      {/* サマリーKPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summaryStats.totalCustomers.toLocaleString()}</div>
              <div className="text-sm text-gray-600">総顧客数</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{repeatRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">リピート率</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">¥{summaryStats.totalAmount.toLocaleString()}</div>
              <div className="text-sm text-gray-600">総売上金額</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summaryStats.vipCustomers}</div>
              <div className="text-sm text-gray-600">VIP顧客数</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>購入回数別詳細分析</CardTitle>
          <CardDescription>顧客の購入回数別セグメント分析（初回〜20回以上）と前年同期比較</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-900">購入回数</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">現在期間 - 顧客数</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">現在期間 - 金額</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">前年同期 - 顧客数</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">前年同期 - 金額</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">顧客数成長率</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">金額成長率</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">転換率</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">セグメント</th>
                </tr>
              </thead>
              <tbody>
                {purchaseCountData.map((item, index) => {
                  const purchaseLabel = item.purchaseCount >= 20 ? "20回以上" : `${item.purchaseCount}回目`

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{purchaseLabel}</td>
                      <td className="px-4 py-3 text-center font-mono">{item.current.customerCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-mono">¥{item.current.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-mono">
                        {item.previous.customerCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">¥{item.previous.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <GrowthBadge growth={item.customerGrowth} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <GrowthBadge growth={item.amountGrowth} />
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {item.conversionRate ? `${item.conversionRate.toFixed(1)}%` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <SegmentBadge segment={item.segment} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 転換率分析 */}
      <Card>
        <CardHeader>
          <CardTitle>🔄 購入回数転換率分析</CardTitle>
          <CardDescription>各購入回数から次回購入への転換率（顧客リテンション分析）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchaseCountData.slice(0, 9).map((item, index) => {
              const nextItem = purchaseCountData[index + 1]
              const conversionRate =
                item.current.customerCount > 0 && nextItem
                  ? (nextItem.current.customerCount / item.current.customerCount) * 100
                  : 0

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    conversionRate < 20
                      ? "border-red-200 bg-red-50"
                      : conversionRate < 30
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-green-200 bg-green-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">
                      {item.purchaseCount}回目 → {item.purchaseCount + 1}回目
                    </div>
                    <div className="text-2xl font-bold mb-2">{conversionRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">
                      {item.current.customerCount.toLocaleString()}人 →{" "}
                      {nextItem?.current.customerCount.toLocaleString() || 0}人
                    </div>
                    {conversionRate < 20 && (
                      <Badge variant="destructive" className="mt-2">
                        要改善
                      </Badge>
                    )}
                    {conversionRate >= 20 && conversionRate < 30 && (
                      <Badge variant="outline" className="mt-2">
                        注意
                      </Badge>
                    )}
                    {conversionRate >= 30 && (
                      <Badge variant="default" className="mt-2">
                        良好
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 顧客戦略提案 */}
      <Card>
        <CardHeader>
          <CardTitle>💡 顧客戦略提案</CardTitle>
          <CardDescription>購入回数別分析に基づく具体的な改善提案</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎯</div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-800 mb-1">初回→2回目転換率向上</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    初回購入後30日以内のフォローアップメール配信により転換率を向上
                  </p>
                  <p className="text-xs text-blue-600">
                    <strong>期待効果:</strong> 転換率+8%向上、リピート顧客+110人増加
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">👑</div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-800 mb-1">VIP顧客の特別プログラム</h4>
                  <p className="text-sm text-green-700 mb-2">
                    10回以上購入のVIP顧客に専用サービスを提供し、さらなるロイヤリティ向上を図る
                  </p>
                  <p className="text-xs text-green-600">
                    <strong>期待効果:</strong> VIP顧客単価+25%向上、年間売上+500万円増加
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📊</div>
                <div className="flex-1">
                  <h4 className="font-bold text-purple-800 mb-1">セグメント別マーケティング</h4>
                  <p className="text-sm text-purple-700 mb-2">
                    各セグメントの特性に応じたパーソナライズされたマーケティング施策を実施
                  </p>
                  <p className="text-xs text-purple-600">
                    <strong>期待効果:</strong> 全体的なエンゲージメント+20%向上
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
