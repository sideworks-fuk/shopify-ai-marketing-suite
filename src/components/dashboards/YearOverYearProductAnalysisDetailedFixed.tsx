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
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react"

// 正しい前年同月比データ型定義
interface YearOverYearProductData {
  productId: string
  productName: string
  category: string
  // 月次前年同月比データ（12ヶ月分）
  monthlyComparison: {
    month: number // 1-12
    monthName: string // "1月", "2月", etc.
    currentYear: {
      year: number // 2024
      sales: number
      quantity: number
      orders: number
    }
    previousYear: {
      year: number // 2023
      sales: number
      quantity: number
      orders: number
    }
    growth: {
      sales: number // 前年同月比成長率(%)
      quantity: number
      orders: number
    }
  }[]
  // 年間合計
  yearTotal: {
    currentYear: {
      year: number
      sales: number
      quantity: number
      orders: number
    }
    previousYear: {
      year: number
      sales: number
      quantity: number
      orders: number
    }
    growth: {
      sales: number
      quantity: number
      orders: number
    }
  }
}

// 正しい前年同月比サンプルデータ生成
const generateYearOverYearSampleData = (): YearOverYearProductData[] => {
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

  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]

  return products.map((product) => {
    // 商品特性に応じた基本パラメータ
    const basePrice = product.name.includes("デコ箱") ? 350 :
                     product.name.includes("ココット") ? 100 : 200
    
    // 商品カテゴリによる成長傾向
    const basegrowthTrend = product.category === "エコ包装材" ? 0.15 : 
                           product.category === "ギフトボックス" ? 0.1 : 0.08

    // 月次前年同月比データ生成
    const monthlyComparison = monthNames.map((monthName, index) => {
      const month = index + 1
      
      // 季節性を考慮（12月はギフト需要増、夏場は食品容器需要増）
      const isDecember = month === 12
      const isSummer = [6, 7, 8].includes(month)
      
      let seasonalMultiplier = 1
      if (product.category === "ギフトボックス" && isDecember) {
        seasonalMultiplier = 2.2 // 12月はギフト需要で大幅増
      } else if (product.category === "食品包装容器" && isSummer) {
        seasonalMultiplier = 1.3 // 夏場は食品容器需要増
      }

      // 2023年（前年）データ
      const baseQuantity2023 = Math.floor((Math.random() * 30 + 25) * seasonalMultiplier)
      const orders2023 = Math.floor(baseQuantity2023 * (0.25 + Math.random() * 0.15))
      const sales2023 = baseQuantity2023 * basePrice

      // 2024年（当年）データ - 月別で成長率にバラつきを持たせる
      const monthlyGrowthVariation = (Math.random() - 0.5) * 0.4 // ±20%の月次変動
      const monthlyGrowthRate = basegrowthTrend + monthlyGrowthVariation
      
      const quantity2024 = Math.floor(baseQuantity2023 * (1 + monthlyGrowthRate))
      const orders2024 = Math.floor(orders2023 * (1 + monthlyGrowthRate * 0.8)) // 注文件数は控えめな成長
      const sales2024 = Math.floor(sales2023 * (1 + monthlyGrowthRate))

      // 前年同月比成長率計算
      const salesGrowth = sales2023 > 0 ? ((sales2024 - sales2023) / sales2023) * 100 : 0
      const quantityGrowth = baseQuantity2023 > 0 ? ((quantity2024 - baseQuantity2023) / baseQuantity2023) * 100 : 0
      const ordersGrowth = orders2023 > 0 ? ((orders2024 - orders2023) / orders2023) * 100 : 0

      return {
        month,
        monthName,
        currentYear: {
          year: 2024,
          sales: Math.max(0, sales2024),
          quantity: Math.max(0, quantity2024),
          orders: Math.max(0, orders2024),
        },
        previousYear: {
          year: 2023,
          sales: sales2023,
          quantity: baseQuantity2023,
          orders: orders2023,
        },
        growth: {
          sales: Number(salesGrowth.toFixed(1)),
          quantity: Number(quantityGrowth.toFixed(1)),
          orders: Number(ordersGrowth.toFixed(1)),
        }
      }
    })

    // 年間合計計算
    const currentYearTotal = {
      year: 2024,
      sales: monthlyComparison.reduce((sum, m) => sum + m.currentYear.sales, 0),
      quantity: monthlyComparison.reduce((sum, m) => sum + m.currentYear.quantity, 0),
      orders: monthlyComparison.reduce((sum, m) => sum + m.currentYear.orders, 0),
    }

    const previousYearTotal = {
      year: 2023,
      sales: monthlyComparison.reduce((sum, m) => sum + m.previousYear.sales, 0),
      quantity: monthlyComparison.reduce((sum, m) => sum + m.previousYear.quantity, 0),
      orders: monthlyComparison.reduce((sum, m) => sum + m.previousYear.orders, 0),
    }

    const yearGrowth = {
      sales: previousYearTotal.sales > 0 ? ((currentYearTotal.sales - previousYearTotal.sales) / previousYearTotal.sales) * 100 : 0,
      quantity: previousYearTotal.quantity > 0 ? ((currentYearTotal.quantity - previousYearTotal.quantity) / previousYearTotal.quantity) * 100 : 0,
      orders: previousYearTotal.orders > 0 ? ((currentYearTotal.orders - previousYearTotal.orders) / previousYearTotal.orders) * 100 : 0,
    }

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      monthlyComparison,
      yearTotal: {
        currentYear: currentYearTotal,
        previousYear: previousYearTotal,
        growth: {
          sales: Number(yearGrowth.sales.toFixed(1)),
          quantity: Number(yearGrowth.quantity.toFixed(1)),
          orders: Number(yearGrowth.orders.toFixed(1)),
        }
      }
    }
  })
}

// 前年同月比テーブル表示コンポーネント
const YearOverYearDataTable = ({ 
  data, 
  viewMode, 
  showMonthlyData, 
  selectedMonth,
  currentPage, 
  itemsPerPage,
  onPageChange 
}: {
  data: YearOverYearProductData[]
  viewMode: "sales" | "quantity" | "orders"
  showMonthlyData: boolean
  selectedMonth: number | null // 特定月の表示（null = 年間合計）
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

  const getGrowthBadgeColor = useCallback((growth: number) => {
    if (growth >= 15) return "bg-green-100 text-green-800"
    if (growth >= 5) return "bg-blue-100 text-blue-800"
    if (growth >= 0) return "bg-gray-100 text-gray-800"
    if (growth >= -10) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            前年同月比詳細データ
            {selectedMonth && (
              <Badge variant="outline" className="ml-2">
                {selectedMonth}月 特化表示
              </Badge>
            )}
          </span>
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
          2024年 vs 2023年の前年同月比分析
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
                  2023年{selectedMonth ? `${selectedMonth}月` : '年間'}
                </th>
                <th className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[120px]">
                  2024年{selectedMonth ? `${selectedMonth}月` : '年間'}
                </th>
                <th className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[100px]">
                  前年同月比
                </th>
                {showMonthlyData && !selectedMonth && (
                  <>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="text-center py-3 px-3 font-medium text-gray-900 border-r min-w-[140px]">
                        {`${i + 1}月比較`}
                      </th>
                    ))}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((product, index) => {
                // 表示データを取得（月指定時は該当月、そうでなければ年間合計）
                const currentValue = selectedMonth 
                  ? product.monthlyComparison[selectedMonth - 1].currentYear[viewMode]
                  : product.yearTotal.currentYear[viewMode]
                
                const previousValue = selectedMonth
                  ? product.monthlyComparison[selectedMonth - 1].previousYear[viewMode]
                  : product.yearTotal.previousYear[viewMode]

                const growthValue = selectedMonth
                  ? product.monthlyComparison[selectedMonth - 1].growth[viewMode]
                  : product.yearTotal.growth[viewMode]

                return (
                  <tr key={product.productId} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                    <td className="py-3 px-4 border-r sticky left-0 bg-white z-10">
                      <div className="font-medium text-sm">{product.productName}</div>
                    </td>
                    <td className="py-3 px-3 text-center text-gray-600 border-r">
                      {product.category}
                    </td>
                    <td className="py-3 px-3 text-center font-mono border-r text-gray-600">
                      {formatValue(previousValue, viewMode)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono border-r font-semibold">
                      {formatValue(currentValue, viewMode)}
                    </td>
                    <td className="py-3 px-3 text-center border-r">
                      <Badge className={getGrowthBadgeColor(growthValue)}>
                        {growthValue >= 0 ? "+" : ""}{growthValue}%
                      </Badge>
                    </td>
                    {showMonthlyData && !selectedMonth && (
                      <>
                        {product.monthlyComparison.map((monthData, monthIndex) => {
                          const monthGrowth = monthData.growth[viewMode]
                          return (
                                                         <td key={monthIndex} className="py-3 px-3 text-center font-mono text-xs border-r">
                               <div className="space-y-1">
                                 <div className="text-gray-500">
                                   {formatValue(monthData.previousYear[viewMode], viewMode)}
                                 </div>
                                 <div className="font-semibold">
                                   {formatValue(monthData.currentYear[viewMode], viewMode)}
                                 </div>
                                 <Badge className={`text-xs ${getGrowthBadgeColor(monthGrowth)}`}>
                                   {monthGrowth >= 0 ? "+" : ""}{monthGrowth}%
                                 </Badge>
                               </div>
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

const YearOverYearProductAnalysisDetailedFixed = () => {
  const [data] = useState<YearOverYearProductData[]>(generateYearOverYearSampleData())
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [showMonthlyData, setShowMonthlyData] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null) // 特定月表示
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
    setCurrentPage(1)
  }, [showMonthlyData])

  return (
    <div className="space-y-6">


      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            前年同月比【商品】詳細分析
          </CardTitle>
          <CardDescription>前年同月比較による商品パフォーマンス分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
              <label className="block text-sm font-medium mb-2">対象月</label>
              <Select value={selectedMonth?.toString() || "all"} onValueChange={(value) => setSelectedMonth(value === "all" ? null : Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">年間合計</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>
                      {i + 1}月
                    </SelectItem>
                  ))}
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
                disabled={selectedMonth !== null} // 特定月選択時は無効
              >
                {showMonthlyData ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                全月比較
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

      {/* 前年同月比データテーブル */}
      <YearOverYearDataTable
        data={filteredData}
        viewMode={viewMode}
        showMonthlyData={showMonthlyData}
        selectedMonth={selectedMonth}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />

      {/* 前年同月比分析の説明 */}
      <Card>
        <CardContent className="p-6">
          <h4 className="font-medium text-gray-900 mb-3">📊 前年同月比分析の特徴</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>同月比較</strong>: 季節性を考慮した同期間での比較</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>季節性分析</strong>: 商品特性に応じた需要変動分析</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>月別詳細分析</strong>: 特定月に焦点を当てた詳細確認</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>年間パフォーマンス</strong>: 12ヶ月すべての成長傾向確認</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>成長率可視化</strong>: 直感的な色分け表示</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>柔軟な表示切替</strong>: 月別詳細・年間合計の表示選択</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisDetailedFixed 