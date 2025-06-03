"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
// import { Switch } from "@/components/ui/switch" // 一時的にコメントアウト
import {
  Search,
  Download,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// 型定義
interface DetailedProductData {
  productId: string
  productName: string
  category: string
  // 年間合計データ
  sales2024: number
  sales2025: number
  quantity2024: number
  quantity2025: number
  orders2024: number
  orders2025: number
  growth: number
  // 月次データ（12ヶ月分）
  monthlyData: {
    month: string
    sales2024: number
    sales2025: number
    quantity2024: number
    quantity2025: number
    orders2024: number
    orders2025: number
  }[]
}

// 詳細サンプルデータ生成（月次データ付き）
const generateDetailedSampleData = (): DetailedProductData[] => {
  const products = [
    { id: "1", name: "【サンプル】カラートレースリム 150 ホワイト", category: "食品包装容器" },
    { id: "2", name: "【サンプル】カラートレー 165 ブラウン", category: "食品包装容器" },
    { id: "3", name: "【サンプル】IKトレースリム 150 黒", category: "食品包装容器" },
    { id: "4", name: "【サンプル】nwクリスマスデコ箱4号H130", category: "ギフトボックス" },
    { id: "5", name: "【サンプル】Criollo-Bitter-デコ箱4号H130", category: "ギフトボックス" },
    { id: "6", name: "パピエール #47 アメリカンレッド", category: "食品包装容器" },
    { id: "7", name: "カラーココット 65角(レッド)", category: "食品包装容器" },
    { id: "8", name: "【サンプル】エコクラフトロールケーキ箱", category: "エコ包装材" },
  ]

  const months = [
    "2024/1月", "2024/2月", "2024/3月", "2024/4月", "2024/5月", "2024/6月",
    "2024/7月", "2024/8月", "2024/9月", "2024/10月", "2024/11月", "2024/12月"
  ]

  return products.map((product) => {
    // 商品特性に応じた基本パラメータ
    const basePrice = product.name.includes("デコ箱") ? 350 :
                     product.name.includes("ココット") ? 100 : 200

    // 月次データ生成
    const monthlyData = months.map((month, index) => {
      const isDecember = index === 11 // 12月はギフト需要で増加
      const seasonalMultiplier = product.category === "ギフトボックス" && isDecember ? 2.5 : 1
      
      const baseQuantity2024 = Math.floor((Math.random() * 40 + 30) * seasonalMultiplier)
      const baseOrders2024 = Math.floor(baseQuantity2024 * (0.3 + Math.random() * 0.2))
      const sales2024 = baseQuantity2024 * basePrice

      // 2025年の成長率（商品により異なる）
      let growthRate = product.category === "エコ包装材" ? 0.2 : 
                      product.category === "ギフトボックス" ? 0.15 : 0.1
      growthRate += (Math.random() - 0.5) * 0.3 // ±15%のランダム変動

      const quantity2025 = Math.floor(baseQuantity2024 * (1 + growthRate))
      const orders2025 = Math.floor(baseOrders2024 * (1 + growthRate))
      const sales2025 = Math.floor(sales2024 * (1 + growthRate))

      return {
        month,
        sales2024,
        sales2025: Math.max(0, sales2025),
        quantity2024: baseQuantity2024,
        quantity2025: Math.max(0, quantity2025),
        orders2024: baseOrders2024,
        orders2025: Math.max(0, orders2025),
      }
    })

    // 年間合計を計算
    const sales2024 = monthlyData.reduce((sum, m) => sum + m.sales2024, 0)
    const sales2025 = monthlyData.reduce((sum, m) => sum + m.sales2025, 0)
    const quantity2024 = monthlyData.reduce((sum, m) => sum + m.quantity2024, 0)
    const quantity2025 = monthlyData.reduce((sum, m) => sum + m.quantity2025, 0)
    const orders2024 = monthlyData.reduce((sum, m) => sum + m.orders2024, 0)
    const orders2025 = monthlyData.reduce((sum, m) => sum + m.orders2025, 0)

    const growth = sales2024 > 0 ? ((sales2025 - sales2024) / sales2024) * 100 : 0

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      sales2024,
      sales2025,
      quantity2024,
      quantity2025,
      orders2024,
      orders2025,
      growth,
      monthlyData,
    }
  })
}

// 詳細テーブル表示コンポーネント
const DetailedDataTable = ({ 
  data, 
  viewMode, 
  showMonthlyData, 
  currentPage, 
  itemsPerPage,
  onPageChange 
}: {
  data: DetailedProductData[]
  viewMode: "sales" | "quantity" | "orders"
  showMonthlyData: boolean
  currentPage: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}) => {
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return data.slice(startIndex, startIndex + itemsPerPage)
  }, [data, currentPage, itemsPerPage])

  const totalPages = Math.ceil(data.length / itemsPerPage)

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>詳細データテーブル</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">月次データ表示</span>
                             <Button
                 variant={showMonthlyData ? "default" : "outline"}
                 size="sm"
                 disabled
               >
                 {showMonthlyData ? "ON" : "OFF"}
               </Button>
            </div>
            <Badge variant="outline">
              {data.length}商品 / ページ{currentPage}/{totalPages}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          顧客要求の詳細テーブル表示（段階的読み込み最適化済み）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900 border-r sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                  商品名
                </th>
                <th className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[100px]">
                  カテゴリ
                </th>
                <th className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[120px]">
                  2024年合計
                </th>
                <th className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[120px]">
                  2025年合計
                </th>
                <th className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[100px]">
                  成長率
                </th>
                {showMonthlyData && (
                  <>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[120px]">
                        {`${i + 1}月`}
                      </th>
                    ))}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((product, index) => {
                const value2024 = viewMode === "sales" ? product.sales2024 :
                                 viewMode === "quantity" ? product.quantity2024 : product.orders2024
                const value2025 = viewMode === "sales" ? product.sales2025 :
                                 viewMode === "quantity" ? product.quantity2025 : product.orders2025

                return (
                  <tr key={product.productId} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                    <td className="py-3 px-4 border-r sticky left-0 bg-white z-10">
                      <div className="font-medium text-sm">{product.productName}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-600 border-r">
                      {product.category}
                    </td>
                    <td className="py-3 px-3 text-center font-mono border-r">
                      {formatValue(value2024, viewMode)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono border-r">
                      {formatValue(value2025, viewMode)}
                    </td>
                    <td className="py-3 px-3 text-center border-r">
                      <Badge className={`${
                        product.growth >= 10 ? "bg-green-100 text-green-800" :
                        product.growth >= 0 ? "bg-blue-100 text-blue-800" :
                        product.growth >= -10 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {product.growth >= 0 ? "+" : ""}{product.growth.toFixed(1)}%
                      </Badge>
                    </td>
                    {showMonthlyData && (
                      <>
                        {product.monthlyData.map((monthData, monthIndex) => {
                          const monthValue = viewMode === "sales" ? monthData.sales2025 :
                                           viewMode === "quantity" ? monthData.quantity2025 : monthData.orders2025
                          return (
                            <td key={monthIndex} className="py-3 px-3 text-center font-mono text-xs border-r">
                              {formatValue(monthValue, viewMode)}
                            </td>
                          )
                        })}
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            表示中: {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, data.length)} / 
            全{data.length}商品
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              前へ
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              次へ
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const YearOverYearProductAnalysisDetailed = () => {
  const [data] = useState<DetailedProductData[]>(generateDetailedSampleData())
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [showMonthlyData, setShowMonthlyData] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState("")

  // フィルタリング
  const filteredData = useMemo(() => {
    return data.filter(product =>
      product.productName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleMonthlyDataToggle = useCallback(() => {
    setShowMonthlyData(!showMonthlyData)
    setCurrentPage(1) // 表示切替時はページをリセット
  }, [showMonthlyData])

  return (
    <div className="space-y-6">
      {/* 機能ステータス */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div>
              <span className="font-medium text-blue-800">📋 詳細テーブル表示（顧客要求対応版）</span>
              <div className="text-sm text-blue-700 mt-1">
                月次データ対応・ページネーション・段階的読み込み最適化済み
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
            前年同月比【商品】詳細分析
          </CardTitle>
          <CardDescription>顧客要求に対応した詳細データテーブル表示</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">表示項目</label>
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">表示件数</label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5件/ページ</SelectItem>
                  <SelectItem value="10">10件/ページ</SelectItem>
                  <SelectItem value="20">20件/ページ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">商品検索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="商品名で検索..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button 
                variant={showMonthlyData ? "default" : "outline"} 
                onClick={handleMonthlyDataToggle}
                className="w-full"
              >
                {showMonthlyData ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                月次データ
              </Button>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* パフォーマンス警告 */}
      {showMonthlyData && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <span className="font-medium text-yellow-800">⚡ パフォーマンス最適化</span>
                <div className="text-sm text-yellow-700 mt-1">
                  月次データ表示時は{itemsPerPage}件ずつ段階的に読み込み、スムーズな表示を実現
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 詳細データテーブル */}
      <DetailedDataTable
        data={filteredData}
        viewMode={viewMode}
        showMonthlyData={showMonthlyData}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />

      {/* 機能説明 */}
      <Card>
        <CardContent className="p-6">
          <h4 className="font-medium text-gray-900 mb-3">🎯 詳細テーブル表示の特徴</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>顧客要求の詳細テーブル表示に対応</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>月次データの表示・非表示切替</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>ページネーションで軽量表示</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>レスポンシブ対応のスクロール表示</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>商品名固定列でナビゲーション最適化</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>サイドメニューを維持したまま動作</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisDetailed 