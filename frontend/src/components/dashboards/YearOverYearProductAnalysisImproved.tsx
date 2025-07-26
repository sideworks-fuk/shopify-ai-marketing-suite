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

// APIデータ用の統一型定義
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
  const [loading, setLoading] = useState(true) // 初期ロード時はtrue
  const [error, setError] = useState<string | null>(null)
  const [apiData, setApiData] = useState<YearOverYearProductData[] | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false) // 初期化フラグ

  // 🚀 API データ取得
  const fetchYearOverYearData = useCallback(async () => {
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
      setApiData([]) // エラー時は空配列に設定
    } finally {
      setLoading(false)
      setInitialized(true) // 初期化完了
    }
  }, [selectedYear, viewMode, sortBy, filters])

  // 初期データ取得とフィルタ変更時の再取得
  useEffect(() => {
    fetchYearOverYearData()
  }, [fetchYearOverYearData])

  // APIデータを表示形式に変換する関数
  const convertApiDataToDisplayFormat = useCallback((apiProducts: YearOverYearProductData[]): MonthlyProductData[] => {
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

  // 実際に表示するデータ（APIデータのみ）
  const displayData = useMemo(() => {
    if (apiData) {
      return convertApiDataToDisplayFormat(apiData)
    }
    return []
  }, [apiData, convertApiDataToDisplayFormat])

  // フィルタリングロジック（クライアントサイドで追加フィルタリング）
  const filteredData = useMemo(() => {
    return displayData.filter((product) => {
      // パフォーマンス最適化: 短絡評価を活用
      if (filters.searchTerm && !product.productName.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false
      }
      
      if (filters.category !== "all" && product.category !== filters.category) {
        return false
      }
      
      // 年間平均成長率を計算
      const avgGrowthRate = product.monthlyData.reduce((sum, month) => sum + month.growthRate, 0) / 12
      
      switch (filters.growthRate) {
        case "positive": return avgGrowthRate > 0
        case "negative": return avgGrowthRate < 0
        case "high_growth": return avgGrowthRate > 20
        case "high_decline": return avgGrowthRate < -20
        default: return true
      }
    })
  }, [displayData, filters])

  // 並び替えロジック（クライアントサイドソート）
  const sortedData = useMemo(() => {
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
  }, [filteredData, sortBy])

  // カテゴリ一覧（APIデータから取得）
  const allCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories
    }
    // APIデータからカテゴリを抽出
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

  // 成長率バッジ色（強化版）
  const getGrowthBadgeColor = useCallback((growth: number) => {
    if (growth >= 25) return "bg-emerald-100 text-emerald-800 border-emerald-200"
    if (growth >= 15) return "bg-green-100 text-green-800 border-green-200"
    if (growth >= 5) return "bg-blue-100 text-blue-800 border-blue-200"
    if (growth >= 0) return "bg-slate-100 text-slate-700 border-slate-200"
    if (growth >= -10) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    if (growth >= -20) return "bg-orange-100 text-orange-800 border-orange-200"
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

  // 初期化中の全画面ローディング
  if (!initialized) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-lg font-medium text-gray-700">
                前年同月比分析データを読み込み中...
              </div>
              <div className="text-sm text-gray-500">
                {selectedYear}年と{previousYear}年のデータを取得しています
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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

      {/* APIステータス表示 */}
      {(loading || error) && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">データソース:</span>
                  <Badge variant="default">API</Badge>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchYearOverYearData}
                  disabled={loading}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  再読み込み
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* サマリー統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{sortedData.length}</div>
            <div className="text-sm text-blue-700 mt-1">対象商品数</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {sortedData.filter(p => {
                const avgGrowth = p.monthlyData.reduce((sum, m) => sum + m.growthRate, 0) / 12
                return avgGrowth > 0
              }).length}
            </div>
            <div className="text-sm text-green-700 mt-1">成長商品数</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-50 to-red-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {sortedData.filter(p => {
                const avgGrowth = p.monthlyData.reduce((sum, m) => sum + m.growthRate, 0) / 12
                return avgGrowth < 0
              }).length}
            </div>
            <div className="text-sm text-red-700 mt-1">減少商品数</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {sortedData.length > 0 ? 
                (sortedData.reduce((sum, p) => {
                  const avgGrowth = p.monthlyData.reduce((s, m) => s + m.growthRate, 0) / 12
                  return sum + avgGrowth
                }, 0) / sortedData.length).toFixed(1) : "0"}%
            </div>
            <div className="text-sm text-purple-700 mt-1">平均成長率</div>
          </CardContent>
        </Card>
      </div>

      {/* データテーブル（改良版） */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                商品別月次推移データ
              </CardTitle>
              <CardDescription>
                {selectedYear}年と{previousYear}年の月別比較データ（{sortedData.length}件の商品を表示中）
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">データを読み込み中...</span>
            </div>
          ) : (
            <>
              {/* 月別詳細表示（改良版） */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-3 font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[250px] border-r">
                        商品情報
                      </th>
                      {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map(month => (
                        <th key={month} className="text-center py-4 px-2 font-semibold text-gray-900 min-w-[120px] border-r">
                          <div className="text-sm">{month}</div>
                          <div className="text-xs text-gray-500 font-normal">
                            {selectedYear} / {previousYear}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {sortedData.map((product, productIndex) => {
                      const avgGrowth = product.monthlyData.reduce((sum, m) => sum + m.growthRate, 0) / 12
                      return (
                        <tr key={product.productId} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${productIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="py-4 px-3 sticky left-0 bg-white z-10 border-r">
                            <div className="space-y-2">
                              <div className="font-medium text-gray-900 text-sm leading-tight">
                                {product.productName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.category}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getGrowthBadgeColor(avgGrowth)}>
                                  平均: {avgGrowth > 0 ? "+" : ""}{avgGrowth.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          </td>
                          {product.monthlyData.map((monthData, index) => (
                            <td key={index} className="py-4 px-2 text-center border-r">
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatValue(monthData.current, viewMode)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  前年: {formatValue(monthData.previous, viewMode)}
                                </div>
                                <Badge 
                                  size="sm" 
                                  className={`${getGrowthBadgeColor(monthData.growthRate)} text-xs font-semibold`}
                                >
                                  {monthData.growthRate > 0 ? "+" : ""}{monthData.growthRate.toFixed(1)}%
                                </Badge>
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {sortedData.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    {error ? (
                      <AlertCircle className="h-12 w-12 mx-auto" />
                    ) : (
                      <Search className="h-12 w-12 mx-auto" />
                    )}
                  </div>
                  {error ? (
                    <>
                      <div className="text-lg font-medium text-red-500 mb-2">
                        データの取得に失敗しました
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        {error}
                      </div>
                      <Button onClick={fetchYearOverYearData} disabled={loading}>
                        再読み込み
                      </Button>
                    </>
                  ) : apiData && apiData.length === 0 ? (
                    <>
                      <div className="text-lg font-medium text-gray-500 mb-2">
                        データが存在しません
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        選択した年度（{selectedYear}年）のデータがありません。<br/>
                        他の年度を選択するか、データの登録状況を確認してください。
                      </div>
                      <Button variant="outline" onClick={fetchYearOverYearData} disabled={loading}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        再読み込み
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-medium text-gray-500 mb-2">
                        検索条件に該当する商品が見つかりませんでした
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        フィルター条件を変更して再度お試しください
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setFilters({ growthRate: "all", category: "all", searchTerm: "" })}
                      >
                        フィルターをクリア
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisImproved 