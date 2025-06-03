"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle, Download } from "lucide-react"
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
const getHeatmapColor = (customers: number, maxCustomers: number): string => {
  if (customers === 0) return "bg-gray-50"
  const intensity = customers / maxCustomers
  if (intensity < 0.2) return "bg-green-100"
  if (intensity < 0.4) return "bg-green-200"
  if (intensity < 0.6) return "bg-green-300"
  if (intensity < 0.8) return "bg-green-400"
  return "bg-green-500"
}

// より本番に近いサンプルデータ
const getSamplePurchaseFrequencyData = (): PurchaseFrequencyData[] => {
  return [
    {
      productName: "【シフォン】カラートレー 10号H50 ホワイト",
      productId: "prod_color_tray_10_white",
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
      productName: "【シフォン】エコクラフト箱4号H80",
      productId: "prod_eco_craft_box_4_h80",
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
      productName: "【シフォン】ライトフラワー 5号H65",
      productId: "prod_light_flower_5_h65",
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

export default function ProductPurchaseFrequencyAnalysis({
  shopDomain,
  accessToken,
  useSampleData = true,
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

  // CSVエクスポート機能
  const exportToCsv = () => {
    if (!purchaseFrequencyData || purchaseFrequencyData.length === 0) {
      alert("エクスポートするデータがありません。")
      return
    }

    // CSVヘッダーの作成
    const headers = [
      "商品名",
      "1回",
      "2回", 
      "3回",
      "4回",
      "5回",
      "6回",
      "7回",
      "8回",
      "9回",
      "10回+",
      "総顧客数",
      "リピート率(%)"
    ]

    // CSVデータの作成
    const csvData = purchaseFrequencyData.map(product => {
      const repeatCustomers = product.frequencies.slice(1).reduce((sum, freq) => sum + freq.customers, 0)
      const repeatRate = product.totalCustomers > 0 ? 
        Math.round((repeatCustomers / product.totalCustomers) * 100) : 0

      return [
        `"${product.productName}"`, // 商品名をクォートで囲む
        ...product.frequencies.map(freq => `${freq.customers} (${freq.percentage}%)`),
        product.totalCustomers,
        repeatRate
      ]
    })

    // CSVファイルの生成
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n")

    // BOMを追加してExcelでの文字化けを防ぐ
    const bom = "\uFEFF"
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" })
    
    // ダウンロードリンクの作成
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    
    // ファイル名に現在の日付を含める
    const now = new Date()
    const timestamp = now.toISOString().slice(0, 10).replace(/-/g, "")
    link.setAttribute("download", `購入頻度分析_${timestamp}.csv`)
    
    // ダウンロード実行
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  const maxCustomers = Math.max(
    ...purchaseFrequencyData.flatMap((product) => product.frequencies.map((freq) => freq.customers)),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>商品別購入頻度分析</CardTitle>
            <CardDescription>各商品の購入回数分布を分析し、リピート購入パターンを把握します</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              disabled={isLoading || !purchaseFrequencyData || purchaseFrequencyData.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV出力
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
          <div className="min-w-[1200px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-900 min-w-[300px]">商品名</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">1回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">2回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">3回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">4回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">5回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">6回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">7回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">8回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">9回</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-900 min-w-[80px]">10回+</th>
                </tr>
              </thead>
              <tbody>
                {purchaseFrequencyData.map((product) => (
                  <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{product.productName}</td>
                    {product.frequencies.map((freq, index) => {
                      return (
                        <td
                          key={index}
                          className={`px-3 py-2 text-center ${getHeatmapColor(freq.customers, maxCustomers)}`}
                        >
                          <div className="font-bold text-gray-900">{freq.customers}</div>
                          <div className="text-xs text-gray-600">({freq.percentage}%)</div>
                        </td>
                      )
                    })}
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
                  ? purchaseFrequencyData
                      .reduce((max, product) => {
                        const repeatRate =
                          (product.frequencies.slice(1).reduce((s, f) => s + f.customers, 0) / product.totalCustomers) *
                          100
                        const maxRate =
                          (max.frequencies.slice(1).reduce((s, f) => s + f.customers, 0) / max.totalCustomers) * 100
                        return repeatRate > maxRate ? product : max
                      })
                      .productName.split("】")[1] || purchaseFrequencyData[0].productName
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
