"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import { DataService } from "@/lib/data-service"

// 購入頻度データの型定義
interface PurchaseFrequencyData {
  productName: string
  productId: string
  frequencies: {
    count: number // 購入回数（1回、2回...）
    customers: number // 該当する顧客数
    percentage: number // 割合
  }[]
  totalCustomers: number // 商品を購入した総顧客数
}

// ヒートマップの色計算
const getHeatmapColor = (percentage: number): string => {
  if (percentage === 0) return "bg-gray-50"
  if (percentage < 10) return "bg-green-100"
  if (percentage < 20) return "bg-green-200"
  if (percentage < 30) return "bg-green-300"
  if (percentage < 40) return "bg-green-400"
  if (percentage < 50) return "bg-green-500"
  if (percentage < 60) return "bg-green-600"
  return "bg-green-700"
}

// サンプルデータ（フォールバック用）
const getSamplePurchaseFrequencyData = (): PurchaseFrequencyData[] => {
  return [
    {
      productName: "商品A",
      productId: "prod_a",
      totalCustomers: 200,
      frequencies: [
        { count: 1, customers: 120, percentage: 60 },
        { count: 2, customers: 50, percentage: 25 },
        { count: 3, customers: 20, percentage: 10 },
        { count: 4, customers: 8, percentage: 4 },
        { count: 5, customers: 2, percentage: 1 },
        { count: 6, customers: 0, percentage: 0 },
        { count: 7, customers: 0, percentage: 0 },
        { count: 8, customers: 0, percentage: 0 },
        { count: 9, customers: 0, percentage: 0 },
        { count: 10, customers: 0, percentage: 0 },
      ],
    },
    {
      productName: "商品B",
      productId: "prod_b",
      totalCustomers: 198,
      frequencies: [
        { count: 1, customers: 89, percentage: 45 },
        { count: 2, customers: 65, percentage: 33 },
        { count: 3, customers: 30, percentage: 15 },
        { count: 4, customers: 10, percentage: 5 },
        { count: 5, customers: 4, percentage: 2 },
        { count: 6, customers: 0, percentage: 0 },
        { count: 7, customers: 0, percentage: 0 },
        { count: 8, customers: 0, percentage: 0 },
        { count: 9, customers: 0, percentage: 0 },
        { count: 10, customers: 0, percentage: 0 },
      ],
    },
    {
      productName: "商品C",
      productId: "prod_c",
      totalCustomers: 222,
      frequencies: [
        { count: 1, customers: 156, percentage: 70 },
        { count: 2, customers: 40, percentage: 18 },
        { count: 3, customers: 15, percentage: 7 },
        { count: 4, customers: 8, percentage: 4 },
        { count: 5, customers: 3, percentage: 1 },
        { count: 6, customers: 0, percentage: 0 },
        { count: 7, customers: 0, percentage: 0 },
        { count: 8, customers: 0, percentage: 0 },
        { count: 9, customers: 0, percentage: 0 },
        { count: 10, customers: 0, percentage: 0 },
      ],
    },
  ]
}

interface PurchaseFrequencyAnalysisProps {
  shopDomain?: string
  accessToken?: string
  useSampleData?: boolean
}

export default function PurchaseFrequencyAnalysis({
  shopDomain,
  accessToken,
  useSampleData = false,
}: PurchaseFrequencyAnalysisProps) {
  const [purchaseFrequencyData, setPurchaseFrequencyData] = useState<PurchaseFrequencyData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (useSampleData || !shopDomain || !accessToken) {
      setPurchaseFrequencyData(getSamplePurchaseFrequencyData())
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const dataService = new DataService(shopDomain, accessToken)
      const data = await dataService.getPurchaseFrequencyAnalysis()
      setPurchaseFrequencyData(data)
    } catch (err) {
      console.error("Failed to fetch purchase frequency data:", err)
      setError("データの取得に失敗しました。サンプルデータを表示します。")
      setPurchaseFrequencyData(getSamplePurchaseFrequencyData())
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [shopDomain, accessToken, useSampleData])

  if (!purchaseFrequencyData || purchaseFrequencyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>商品別購入頻度分析</CardTitle>
          <CardDescription>各商品の購入回数分布を分析し、リピート購入パターンを把握します</CardDescription>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>商品別購入頻度分析</CardTitle>
            <CardDescription>各商品の購入回数分布を分析し、リピート購入パターンを把握します</CardDescription>
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
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-900">商品名</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">1回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">2回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">3回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">4回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">5回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">6回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">7回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">8回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">9回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900">10回+</th>
                </tr>
              </thead>
              <tbody>
                {purchaseFrequencyData.map((product) => (
                  <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{product.productName}</td>
                    {product.frequencies.map((freq, index) => (
                      <td
                        key={index}
                        className={`px-4 py-3 text-center border-l border-gray-100 ${getHeatmapColor(freq.percentage)}`}
                      >
                        <div className="font-medium text-gray-900">{freq.customers}</div>
                        <div className="text-xs text-gray-600">({freq.percentage}%)</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">ヒートマップ:</span> 濃い緑色ほど購入割合が高い
          </div>
          <div className="flex items-center space-x-2">
            <span>低</span>
            <div className="flex space-x-1">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200"></div>
              <div className="w-4 h-4 bg-green-100"></div>
              <div className="w-4 h-4 bg-green-200"></div>
              <div className="w-4 h-4 bg-green-300"></div>
              <div className="w-4 h-4 bg-green-400"></div>
              <div className="w-4 h-4 bg-green-500"></div>
              <div className="w-4 h-4 bg-green-600"></div>
              <div className="w-4 h-4 bg-green-700"></div>
            </div>
            <span>高</span>
          </div>
        </div>

        {/* 分析サマリー */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">分析サマリー</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">総商品数:</span>
              <span className="ml-2 text-blue-900">{purchaseFrequencyData.length}商品</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">平均リピート率:</span>
              <span className="ml-2 text-blue-900">
                {purchaseFrequencyData.length > 0
                  ? Math.round(
                      purchaseFrequencyData.reduce((sum, product) => {
                        const repeatCustomers = product.frequencies.slice(1).reduce((s, f) => s + f.customers, 0)
                        return sum + (product.totalCustomers > 0 ? (repeatCustomers / product.totalCustomers) * 100 : 0)
                      }, 0) / purchaseFrequencyData.length,
                    )
                  : 0}
                %
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">最高リピート商品:</span>
              <span className="ml-2 text-blue-900">
                {purchaseFrequencyData.length > 0
                  ? purchaseFrequencyData.reduce((max, product) => {
                      const repeatRate =
                        (product.frequencies.slice(1).reduce((s, f) => s + f.customers, 0) / product.totalCustomers) *
                        100
                      const maxRate =
                        (max.frequencies.slice(1).reduce((s, f) => s + f.customers, 0) / max.totalCustomers) * 100
                      return repeatRate > maxRate ? product : max
                    }).productName
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
