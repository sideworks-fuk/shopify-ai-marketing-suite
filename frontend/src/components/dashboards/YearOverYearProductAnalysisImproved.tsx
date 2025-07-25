"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Badge } from "../ui/badge"
import {
  Search,
  Download,
  BarChart3,
  Settings,
  ChevronUp,
  ChevronDown,
  Calendar,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { yearOverYearApi, YearOverYearProductData, MonthlyComparisonData } from "../../lib/api/year-over-year"

// 型定義（レガシーモック用 - 段階的移行のため保持）
interface MonthlyProductData {
  productId: string
  productName: string
  category: string
  monthlyData: Array<{
    month: string
    current: number
    previous: number
    growthRate: number
  }>
}

// 月別データ生成
const generateMonthlyData = (selectedYear: number): MonthlyProductData[] => {
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

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  
  return products.map(product => {
    const monthlyDataEntries = months.map((month, index) => {
      const baseValuePrevious = 20000 + Math.floor(Math.random() * 40000)
      const seasonalFactor = 1 + Math.sin((index * Math.PI) / 6) * 0.3
      const growthRate = (Math.random() - 0.3) * 50
      const currentValue = Math.floor(baseValuePrevious * seasonalFactor * (1 + growthRate / 100))

      return {
        month,
        previous: Math.floor(baseValuePrevious * seasonalFactor),
        current: currentValue,
        growthRate: Number(growthRate.toFixed(1))
      }
    })

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      monthlyData: monthlyDataEntries
    }
  })
}

const YearOverYearProductAnalysisImproved = () => {
  // ✅ 年選択機能
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  
  // ✅ 分析条件トグル状態
  const [showConditions, setShowConditions] = useState(true)
  
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [sortBy, setSortBy] = useState<"growth" | "total" | "name">("growth")
  const [filters, setFilters] = useState({
    growthRate: "all",
    category: "all",
    searchTerm: "",
  })

  // 前年を自動計算
  const previousYear = selectedYear - 1

  // 🔄 API状態管理
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiData, setApiData] = useState<YearOverYearProductData[] | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [useApi, setUseApi] = useState(true) // APIとモックの切り替え

  // データ生成（年選択に対応） - フォールバック用
  const mockData = useMemo(() => generateMonthlyData(selectedYear), [selectedYear])

  // 🚀 API データ取得
  const fetchYearOverYearData = useCallback(async () => {
    if (!useApi) return

    setLoading(true)
    setError(null)

    try {
      const response = await yearOverYearApi.getYearOverYearAnalysis({
        storeId: 1,
        year: selectedYear,
        viewMode: viewMode,
        sortBy: sortBy === "growth" ? "growth_rate" : sortBy === "total" ? "total_sales" : "name",
        sortDescending: true,
        searchTerm: filters.searchTerm || undefined,
        growthRateFilter: filters.growthRate === "all" ? undefined : filters.growthRate as any,
        category: filters.category === "all" ? undefined : filters.category,
      })

      if (response.success && response.data) {
        setApiData(response.data.products)
        
        // カテゴリ一覧を更新
        const uniqueCategories = Array.from(new Set(response.data.products.map(p => p.productType)))
        setCategories(uniqueCategories)
      } else {
        throw new Error(response.message || 'データの取得に失敗しました')
      }
    } catch (err) {
      console.error('年次比較データ取得エラー:', err)
      setError(err instanceof Error ? err.message : 'データの取得中にエラーが発生しました')
      // エラー時はモックデータにフォールバック
      setUseApi(false)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, viewMode, sortBy, filters, useApi])

  // 初期データ取得とフィルタ変更時の再取得
  useEffect(() => {
    fetchYearOverYearData()
  }, [fetchYearOverYearData])

  // 実際に使用するデータを決定
  const activeData = useApi && apiData ? apiData : null

  // APIデータをモック形式に変換する関数
  const convertApiDataToMockFormat = useCallback((apiProducts: YearOverYearProductData[]): MonthlyProductData[] => {
    return apiProducts.map((product, index) => ({
      productId: `api_${index}`,
      productName: product.productTitle,
      category: product.productType,
      monthlyData: product.monthlyData.map(monthData => ({
        month: monthData.monthName,
        current: monthData.currentValue,
        previous: monthData.previousValue,
        growthRate: monthData.growthRate
      }))
    }))
  }, [])

  // 実際に表示するデータ（APIまたはモック）
  const displayData = useMemo(() => {
    if (activeData) {
      return convertApiDataToMockFormat(activeData)
    }
    return mockData
  }, [activeData, convertApiDataToMockFormat, mockData])

  // フィルタリングロジック（APIデータの場合はサーバーサイドフィルタされているため、追加フィルタのみ）
  const filteredData = useMemo(() => {
    if (activeData) {
      // APIデータの場合、基本的なフィルタは既に適用済み
      // 追加のクライアントサイドフィルタが必要な場合のみ適用
      return displayData
    }
    
    return displayData.filter((product) => {
      const searchMatch = product.productName.toLowerCase().includes(filters.searchTerm.toLowerCase())
      const categoryMatch = filters.category === "all" || product.category === filters.category
      
      // 年間平均成長率を計算
      const avgGrowthRate = product.monthlyData.reduce((sum, month) => sum + month.growthRate, 0) / 12
      
      let growthMatch = true
      if (filters.growthRate === "positive") growthMatch = avgGrowthRate > 0
      else if (filters.growthRate === "negative") growthMatch = avgGrowthRate < 0
      else if (filters.growthRate === "high_growth") growthMatch = avgGrowthRate > 20
      else if (filters.growthRate === "high_decline") growthMatch = avgGrowthRate < -20

      return searchMatch && categoryMatch && growthMatch
    })
  }, [displayData, filters, activeData])

  // 並び替えロジック（APIデータの場合はサーバーサイドソート済み）
  const sortedData = useMemo(() => {
    if (activeData) {
      // APIデータは既にソート済み
      return filteredData
    }
    
    const sorted = [...filteredData]
    switch (sortBy) {
      case "growth":
        return sorted.sort((a, b) => {
          const avgA = a.monthlyData.reduce((sum, month) => sum + month.growthRate, 0) / 12
          const avgB = b.monthlyData.reduce((sum, month) => sum + month.growthRate, 0) / 12
          return avgB - avgA
        })
      case "total":
        return sorted.sort((a, b) => {
          const totalA = a.monthlyData.reduce((sum, month) => sum + month.current, 0)
          const totalB = b.monthlyData.reduce((sum, month) => sum + month.current, 0)
          return totalB - totalA
        })
      case "name":
        return sorted.sort((a, b) => a.productName.localeCompare(b.productName))
      default:
        return sorted
    }
  }, [filteredData, sortBy, activeData])

  // カテゴリ一覧（APIまたはモック）
  const allCategories = useMemo(() => {
    if (categories.length > 0) {
      // APIから取得したカテゴリを使用
      return categories
    }
    // モックデータからカテゴリを抽出
    const uniqueCategories = Array.from(new Set(displayData.map(p => p.category)))
    return uniqueCategories
  }, [categories, displayData])

  // フィルタ変更ハンドラ
  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // フォーマット関数
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

  // 成長率バッジ色
  const getGrowthBadgeColor = useCallback((growth: number) => {
    if (growth >= 15) return "bg-green-100 text-green-800 border-green-200"
    if (growth >= 0) return "bg-blue-100 text-blue-800 border-blue-200"
    if (growth >= -10) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }, [])

  // CSV/Excelエクスポート（月別詳細データ）
  const handleExport = useCallback((format: 'csv' | 'excel') => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    const headers = ['商品名', 'カテゴリ', ...months.map(m => `${m}${selectedYear}`), ...months.map(m => `${m}${previousYear}`), ...months.map(m => `${m}成長率`)]
    
    const rows = sortedData.map(item => {
      const row = [item.productName, item.category]
      
      // 現在年のデータ
      item.monthlyData.forEach(monthData => {
        row.push(formatValue(monthData.current, viewMode))
      })
      
      // 前年のデータ
      item.monthlyData.forEach(monthData => {
        row.push(formatValue(monthData.previous, viewMode))
      })
      
      // 成長率
      item.monthlyData.forEach(monthData => {
        row.push(`${monthData.growthRate}%`)
      })
      
      return row
    })

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `前年同月比月別分析_${selectedYear}vs${previousYear}_${new Date().toISOString().slice(0, 10)}.${format}`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [sortedData, selectedYear, previousYear, viewMode, formatValue])

  return (
    <div className="space-y-6">
      {/* ✅ 分析条件トグル機能付きフィルターセクション */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">分析条件設定</CardTitle>
              <CardDescription>期間・商品・表示条件を設定してください</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowConditions(!showConditions)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              分析条件
              {showConditions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        
        {showConditions && (
          <CardContent>
            <div className="space-y-6">
              {/* ✅ 年選択と表示設定 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    対象年
                  </label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}年 vs {year - 1}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    <BarChart3 className="h-4 w-4 inline mr-1" />
                    表示モード
                  </label>
                  <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm">
                    📅 月別詳細表示（固定）
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">表示データ</label>
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">並び順</label>
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
                </div>
              </div>

              {/* 詳細フィルター */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">成長状況</label>
                  <Select value={filters.growthRate} onValueChange={(value) => handleFilterChange({ growthRate: value })}>
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">商品カテゴリ</label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange({ category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全カテゴリ</SelectItem>
                      {allCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">商品検索</label>
                  <Input
                    placeholder="商品名で検索..."
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-2">
                <Button>
                  <Search className="h-4 w-4 mr-2" />
                  分析実行
                </Button>
                <Button variant="outline" onClick={() => setFilters({ growthRate: "all", category: "all", searchTerm: "" })}>
                  条件クリア
                </Button>
                <Button variant="outline" onClick={() => handleExport('csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV出力
                </Button>
                <Button variant="outline" onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel出力
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* API/モック切り替えとステータス表示 */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">データソース:</span>
                <Badge variant={useApi && !error ? "default" : "secondary"}>
                  {useApi && !error ? "API" : "モック"}
                </Badge>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setUseApi(!useApi)
                  setError(null)
                }}
              >
                {useApi ? "モック表示" : "API接続"}
              </Button>
              
              {useApi && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchYearOverYearData}
                  disabled={loading}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  再読み込み
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 条件サマリーバッジ（折りたたみ時に表示） */}
      {!showConditions && (
        <Card className="bg-slate-50">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-slate-600 mr-2">現在の条件:</span>
              <Badge variant="outline">{selectedYear}年 vs {previousYear}年</Badge>
              <Badge variant="outline">月別詳細表示</Badge>
              <Badge variant="outline">{viewMode === "sales" ? "売上金額" : viewMode === "quantity" ? "販売数量" : "注文件数"}</Badge>
              <Badge variant="outline">{sortBy === "growth" ? "成長率順" : sortBy === "total" ? "売上順" : "商品名順"}</Badge>
              {filters.category !== "all" && <Badge variant="outline">カテゴリ: {filters.category}</Badge>}
              {filters.growthRate !== "all" && <Badge variant="outline">成長状況フィルター適用</Badge>}
              {filters.searchTerm && <Badge variant="outline">検索: {filters.searchTerm}</Badge>}
              <Badge variant="secondary">{sortedData.length}件表示</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>
            商品別月次推移データ
          </CardTitle>
          <CardDescription>
            {selectedYear}年と{previousYear}年の月別比較データ（{sortedData.length}件の商品を表示中）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 月別詳細表示 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-3 font-medium text-gray-900 sticky left-0 bg-white">商品名</th>
                  {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map(month => (
                    <th key={month} className="text-center py-4 px-2 font-medium text-gray-900 min-w-[80px]">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((product) => (
                  <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 sticky left-0 bg-white">
                      <div className="font-medium text-gray-900 text-xs">{product.productName}</div>
                      <div className="text-xs text-gray-500">{product.category}</div>
                    </td>
                    {product.monthlyData.map((monthData, index) => (
                      <td key={index} className="py-3 px-2 text-center">
                        <div className="text-xs font-mono text-gray-900">
                          {formatValue(monthData.current, viewMode)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ({formatValue(monthData.previous, viewMode)})
                        </div>
                        <Badge className={getGrowthBadgeColor(monthData.growthRate)}>
                          {monthData.growthRate > 0 ? "+" : ""}{monthData.growthRate.toFixed(1)}%
                        </Badge>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {sortedData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              検索条件に該当する商品が見つかりませんでした
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisImproved 