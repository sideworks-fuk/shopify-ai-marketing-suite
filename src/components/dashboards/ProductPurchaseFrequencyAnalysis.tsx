"use client"

import { useState, useEffect } from "react"
import { useAppContext } from "../../contexts/AppContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, AlertCircle } from "lucide-react"
import { DataService } from "@/lib/data-service"

interface PurchaseFrequencyData {
  productName: string
  frequencies: {
    count: number
    customers: number
    percentage: number
  }[]
  totalCustomers: number
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
  const { selectedPeriod } = useAppContext()
  const [purchaseFrequencyData, setPurchaseFrequencyData] = useState<PurchaseFrequencyData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // サンプルデータ
  const sampleData: PurchaseFrequencyData[] = [
    {
      productName: "プロテインパウダー",
      frequencies: [
        { count: 1, customers: 45, percentage: 45 },
        { count: 2, customers: 30, percentage: 30 },
        { count: 3, customers: 15, percentage: 15 },
        { count: 4, customers: 7, percentage: 7 },
        { count: 5, customers: 3, percentage: 3 },
      ],
      totalCustomers: 100
    },
    {
      productName: "ビタミンサプリ",
      frequencies: [
        { count: 1, customers: 60, percentage: 60 },
        { count: 2, customers: 25, percentage: 25 },
        { count: 3, customers: 10, percentage: 10 },
        { count: 4, customers: 3, percentage: 3 },
        { count: 5, customers: 2, percentage: 2 },
      ],
      totalCustomers: 100
    }
  ]

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (useSampleData) {
        // サンプルデータを使用
        await new Promise(resolve => setTimeout(resolve, 500)) // Loading simulation
        setPurchaseFrequencyData(sampleData)
      } else {
        // 実際のAPI呼び出し
        if (shopDomain && accessToken) {
          const dataService = new DataService(shopDomain, accessToken)
          const data = await dataService.getPurchaseFrequencyAnalysis()
          setPurchaseFrequencyData(data)
        } else {
          throw new Error('shopDomain または accessToken が設定されていません')
        }
      }
    } catch (err) {
      setError('データの読み込みに失敗しました')
      console.error('Error loading purchase frequency data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedPeriod, useSampleData])

  const exportToCsv = () => {
    if (!purchaseFrequencyData || purchaseFrequencyData.length === 0) {
      alert("エクスポートするデータがありません。")
      return
    }

    // CSVヘッダー
    const headers = ["商品名", "1回", "2回", "3回", "4回", "5回", "総顧客数", "リピート率(%)"]
    
    // CSVデータ
    const csvData = purchaseFrequencyData.map(product => {
      const repeatCustomers = product.frequencies.slice(1).reduce((sum, freq) => sum + freq.customers, 0)
      const repeatRate = product.totalCustomers > 0 ? Math.round((repeatCustomers / product.totalCustomers) * 100) : 0
      
      return [
        `"${product.productName}"`,
        ...product.frequencies.map(freq => `${freq.customers} (${freq.percentage}%)`),
        product.totalCustomers,
        `${repeatRate}%`
      ]
    })

    // CSV文字列作成
    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n")
    
    // ダウンロード実行
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `purchase_frequency_analysis_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-center">
            <div>
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">エラーが発生しました</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                再試行
              </Button>
            </div>
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              disabled={isLoading || purchaseFrequencyData.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV出力
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">購入頻度データを読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchaseFrequencyData.map((product, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">{product.productName}</h3>
                <div className="grid grid-cols-6 gap-2 text-sm">
                  <div className="font-medium text-gray-600">購入回数</div>
                  {product.frequencies.map((freq, freqIndex) => (
                    <div key={freqIndex} className="text-center">
                      <div className="font-medium">{freq.count}回</div>
                      <div className="text-blue-600">{freq.customers}人</div>
                      <div className="text-gray-500">{freq.percentage}%</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                  <span>総顧客数: {product.totalCustomers}人</span>
                  <span className="ml-4">
                    リピート率: {product.totalCustomers > 0 ? 
                      Math.round((product.frequencies.slice(1).reduce((sum, freq) => sum + freq.customers, 0) / product.totalCustomers) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
