"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, AlertCircle, Download } from "lucide-react"
import { Label } from "@/components/ui/label"
import { DataService } from "@/lib/data-service"
import PeriodSelector, { type DateRangePeriod } from "@/components/common/PeriodSelector"

// 購入回数詳細分析データの型定義
interface PurchaseFrequencyDetailData {
  purchaseCount: number
  label: string
  current: {
    orderCount: number
    totalAmount: number
  }
  previous: {
    orderCount: number
    totalAmount: number
  }
  countGrowth: number
  amountGrowth: number
}

// サンプルデータ生成
const getSamplePurchaseFrequencyDetailData = (): PurchaseFrequencyDetailData[] => {
  const data: PurchaseFrequencyDetailData[] = []

  // 初回購入者
  data.push({
    purchaseCount: 1,
    label: "初回購入者",
    current: { orderCount: 1250, totalAmount: 2500000 },
    previous: { orderCount: 1180, totalAmount: 2360000 },
    countGrowth: 5.9,
    amountGrowth: 5.9,
  })

  // 2回目〜20回目
  for (let i = 2; i <= 20; i++) {
    const baseCount = Math.max(1, Math.floor(1250 * Math.pow(0.65, i - 1)))
    const baseAmount = baseCount * 2000 * i // 購入回数が多いほど単価も上がる傾向

    data.push({
      purchaseCount: i,
      label: `${i}回目`,
      current: {
        orderCount: baseCount,
        totalAmount: baseAmount,
      },
      previous: {
        orderCount: Math.floor(baseCount * 0.95),
        totalAmount: Math.floor(baseAmount * 0.95),
      },
      countGrowth: 5.3,
      amountGrowth: 5.3,
    })
  }

  return data
}

interface PurchaseFrequencyDetailAnalysisProps {
  shopDomain?: string
  accessToken?: string
  useSampleData?: boolean
}

export default function PurchaseFrequencyDetailAnalysis({
  shopDomain,
  accessToken,
  useSampleData = true,
}: PurchaseFrequencyDetailAnalysisProps) {
  const [purchaseData, setPurchaseData] = useState<PurchaseFrequencyDetailData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ✅ 期間フィルター管理（統一UI）
  const [dateRange, setDateRange] = useState<DateRangePeriod>(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    
    return {
      startYear: currentYear,
      startMonth: currentMonth,
      endYear: currentYear,
      endMonth: currentMonth
    }
  })

  // ✅ プリセット期間の定義（購入回数分析用）
  const presetPeriods = [
    {
      label: "直近12ヶ月",
      icon: "📊",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear - 1
        let startMonth = currentMonth + 1
        
        if (startMonth > 12) {
          startYear = currentYear
          startMonth = startMonth - 12
        }
        
        return {
          startYear,
          startMonth,
          endYear: currentYear,
          endMonth: currentMonth
        }
      }
    },
    {
      label: "直近6ヶ月",
      icon: "📈",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear
        let startMonth = currentMonth - 5
        
        if (startMonth <= 0) {
          startYear = currentYear - 1
          startMonth = 12 + startMonth
        }
        
        return {
          startYear,
          startMonth,
          endYear: currentYear,
          endMonth: currentMonth
        }
      }
    },
    {
      label: "直近3ヶ月",
      icon: "📉",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear
        let startMonth = currentMonth - 2
        
        if (startMonth <= 0) {
          startYear = currentYear - 1
          startMonth = 12 + startMonth
        }
        
        return {
          startYear,
          startMonth,
          endYear: currentYear,
          endMonth: currentMonth
        }
      }
    },
    {
      label: "先月",
      icon: "📅",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let targetYear = currentYear
        let targetMonth = currentMonth - 1
        
        if (targetMonth <= 0) {
          targetYear = currentYear - 1
          targetMonth = 12
        }
        
        return {
          startYear: targetYear,
          startMonth: targetMonth,
          endYear: targetYear,
          endMonth: targetMonth
        }
      }
    }
  ]

  // ✅ 期間更新ハンドラー
  const updateDateRange = (newDateRange: DateRangePeriod) => {
    setDateRange(newDateRange)
  }

  // ✅ 期間の表示用フォーマット
  const formatDateRange = (range: DateRangePeriod): string => {
    if (range.startYear === range.endYear && range.startMonth === range.endMonth) {
      return `${range.startYear}年${range.startMonth}月`
    }
    return `${range.startYear}年${range.startMonth}月〜${range.endYear}年${range.endMonth}月`
  }

  const fetchData = async () => {
    if (useSampleData || !shopDomain || !accessToken) {
      setPurchaseData(getSamplePurchaseFrequencyDetailData())
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const dataService = new DataService(shopDomain, accessToken)
      // TODO: 実際のAPIが利用可能になったら実装
      setPurchaseData(getSamplePurchaseFrequencyDetailData())
    } catch (err) {
      console.error("Failed to fetch purchase frequency detail data:", err)
      setError("データの取得に失敗しました。サンプルデータを表示します。")
      setPurchaseData(getSamplePurchaseFrequencyDetailData())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [shopDomain, accessToken, useSampleData, dateRange])

  const handleExport = () => {
    // CSV エクスポート機能
    const csvContent = [
      ["購入回数", "現在期間-件数", "現在期間-金額", "前年同期-件数", "前年同期-金額", "件数成長率", "金額成長率"],
      ...purchaseData.map((item) => [
        item.label,
        item.current.orderCount,
        item.current.totalAmount,
        item.previous.orderCount,
        item.previous.totalAmount,
        `${item.countGrowth.toFixed(1)}%`,
        `${item.amountGrowth.toFixed(1)}%`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `購入回数分析_${formatDateRange(dateRange)}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* ヘッダーとコントロール */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📊 購入回数詳細分析
                <Badge variant="outline">詳細データ</Badge>
              </CardTitle>
              <CardDescription>顧客の購入回数別詳細分析（初回〜20回目）と前年同期比較</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                エクスポート
              </Button>
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
          </div>

        </CardHeader>
      </Card>

      {/* ✅ 分析条件設定（統一UI） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">分析条件設定</CardTitle>
          <CardDescription>期間と分析条件を設定してください</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* ✅ 期間選択（統一UI） */}
            <div className="space-y-4">
              <Label>分析期間</Label>
              <PeriodSelector
                dateRange={dateRange}
                onDateRangeChange={updateDateRange}
                title="購入回数分析期間"
                description="顧客の購入回数を分析する期間を選択してください"
                maxMonths={12}
                minMonths={1}
                presetPeriods={presetPeriods}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラーとサンプルデータ表示 */}
      {error && (
        <div className="flex items-center gap-2 text-amber-600 text-sm p-4 bg-amber-50 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {useSampleData && (
        <div className="flex items-center gap-2 text-blue-600 text-sm p-4 bg-blue-50 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          サンプルデータを表示しています
        </div>
      )}

      {/* 詳細テーブル */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left font-bold text-gray-900 border-r border-gray-300 min-w-[120px]">
                    購入回数
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 border-r border-gray-300 min-w-[100px]">
                    件数
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 border-r border-gray-300 min-w-[120px]">
                    金額
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 border-r border-gray-300 min-w-[100px]">
                    件数
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 border-r border-gray-300 min-w-[120px]">
                    金額
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 border-r border-gray-300 min-w-[100px]">
                    件数成長率
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 min-w-[100px]">金額成長率</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-center text-sm text-gray-600 border-r border-gray-300"></th>
                  <th className="px-4 py-2 text-center text-sm text-gray-600 border-r border-gray-300" colSpan={2}>
                    現在期間
                  </th>
                  <th className="px-4 py-2 text-center text-sm text-gray-600 border-r border-gray-300" colSpan={2}>
                    前年同期
                  </th>
                  <th className="px-4 py-2 text-center text-sm text-gray-600 border-r border-gray-300" colSpan={2}>
                    成長率
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-300">{item.label}</td>
                    <td className="px-4 py-3 text-center font-mono border-r border-gray-300">
                      {item.current.orderCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-mono border-r border-gray-300">
                      ¥{item.current.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-mono border-r border-gray-300">
                      {item.previous.orderCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-mono border-r border-gray-300">
                      ¥{item.previous.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300">
                      <Badge variant={item.countGrowth >= 0 ? "default" : "destructive"}>
                        {item.countGrowth >= 0 ? "+" : ""}
                        {item.countGrowth.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={item.amountGrowth >= 0 ? "default" : "destructive"}>
                        {item.amountGrowth >= 0 ? "+" : ""}
                        {item.amountGrowth.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* サマリー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {purchaseData.reduce((sum, item) => sum + item.current.orderCount, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">総件数（現在期間）</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ¥{purchaseData.reduce((sum, item) => sum + item.current.totalAmount, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">総金額（現在期間）</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {purchaseData
                  .filter((item) => item.purchaseCount > 1)
                  .reduce((sum, item) => sum + item.current.orderCount, 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">リピート件数</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(
                  (purchaseData
                    .filter((item) => item.purchaseCount > 1)
                    .reduce((sum, item) => sum + item.current.orderCount, 0) /
                    purchaseData.reduce((sum, item) => sum + item.current.orderCount, 0)) *
                  100
                ).toFixed(1)}
                %
              </div>
              <div className="text-sm text-gray-600">リピート率</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
