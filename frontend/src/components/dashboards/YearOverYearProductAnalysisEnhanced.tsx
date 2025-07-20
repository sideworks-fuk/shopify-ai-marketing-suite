"use client"

import React, { useState, useMemo } from "react"
import { useAppStore } from "../../stores/appStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { MultiYearSelector } from "../ui/multi-year-selector"
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, Package, FileDown, FileSpreadsheet } from "lucide-react"
import type { 
  YearOverYearData, 
  MonthlyYearOverYearData, 
  YearComparison,
  ViewMode,
  FilterType,
  SortBy,
  DisplayType 
} from "../../types/yearOverYear"

const YearOverYearProductAnalysisEnhanced = () => {
  const selectedPeriod = useAppStore((state) => state.globalFilters.selectedPeriod)
  
  // 複数年選択のためのstate
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i) // 過去5年分
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear])
  const [activeTab, setActiveTab] = useState<string>("")

  // 既存のstate
  const [viewMode, setViewMode] = useState<ViewMode>("sales")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [sortBy, setSortBy] = useState<SortBy>("name")
  const [displayType, setDisplayType] = useState<DisplayType>("summary")

  // サンプル商品データ
  const products = [
    { id: "1", name: "【サンプル】カラートレースリム 150 ホワイト", category: "食品包装容器" },
    { id: "2", name: "【サンプル】カラートレー 165 ブラウン", category: "食品包装容器" },
    { id: "3", name: "【サンプル】IKトレースリム 150 黒", category: "食品包装容器" },
    { id: "4", name: "【サンプル】nwクリスマスデコ箱4号H130", category: "ギフトボックス" },
    { id: "5", name: "【サンプル】Criollo-Bitter-デコ箱4号H130", category: "ギフトボックス" },
  ]

  // 複数年比較データ生成
  const generateMultiYearData = (): YearComparison[] => {
    return selectedYears.map(currentYear => {
      const previousYear = currentYear - 1
      
      // 年次集計データ生成
      const summaryData: YearOverYearData[] = products.map(product => {
        const baseValue = 50000 + Math.floor(Math.random() * 100000)
        const growthRate = (Math.random() - 0.3) * 50
        const currentValue = Math.floor(baseValue * (1 + growthRate / 100))
        const previousValue = baseValue

        return {
          productId: product.id,
          productName: product.name,
          category: product.category,
          currentYear,
          previousYear,
          currentValue,
          previousValue,
          growthRate: Number(growthRate.toFixed(1))
        }
      })

      // 月別データ生成
      const monthlyData: MonthlyYearOverYearData[] = products.map(product => {
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        
        const monthlyEntries = months.map((month, index) => {
          const baseValue = 20000 + Math.floor(Math.random() * 40000)
          const seasonalFactor = 1 + Math.sin((index * Math.PI) / 6) * 0.3
          const growthRate = (Math.random() - 0.3) * 50
          const currentValue = Math.floor(baseValue * seasonalFactor * (1 + growthRate / 100))
          const previousValue = Math.floor(baseValue * seasonalFactor)

          return {
            month,
            currentValue,
            previousValue,
            growthRate: Number(growthRate.toFixed(1))
          }
        })

        return {
          productId: product.id,
          productName: product.name,
          category: product.category,
          monthlyData: monthlyEntries
        }
      })

      return {
        year: currentYear,
        previousYear,
        summaryData,
        monthlyData
      }
    })
  }

  const multiYearData = generateMultiYearData()

  // アクティブタブの設定
  React.useEffect(() => {
    if (selectedYears.length > 0 && !activeTab) {
      setActiveTab(`${selectedYears[0]}-${selectedYears[0] - 1}`)
    }
  }, [selectedYears, activeTab])

  // フィルタリングと並び替え（アクティブタブ用）
  const getFilteredDataForTab = (comparison: YearComparison): YearOverYearData[] => {
    let filtered = comparison.summaryData.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = 
        filterType === "all" ||
        (filterType === "growth" && item.growthRate > 10) ||
        (filterType === "stable" && item.growthRate >= -10 && item.growthRate <= 10) ||
        (filterType === "decline" && item.growthRate < -10)
      return matchesSearch && matchesFilter
    })

    switch (sortBy) {
      case "growth-desc":
        return filtered.sort((a, b) => b.growthRate - a.growthRate)
      case "growth-asc":
        return filtered.sort((a, b) => a.growthRate - b.growthRate)
      case "amount-desc":
        return filtered.sort((a, b) => b.currentValue - a.currentValue)
      case "name":
      default:
        return filtered.sort((a, b) => a.productName.localeCompare(b.productName))
    }
  }

  // 現在のアクティブな比較データ
  const activeComparison = multiYearData.find(comp => 
    `${comp.year}-${comp.previousYear}` === activeTab
  )

  // サマリー統計
  const summaryStats = useMemo(() => {
    if (!activeComparison) return null

    const data = activeComparison.summaryData
    const totalProducts = data.length
    const growthProducts = data.filter(item => item.growthRate > 10).length
    const declineProducts = data.filter(item => item.growthRate < -10).length
    const averageGrowthRate = data.reduce((acc, item) => acc + item.growthRate, 0) / data.length
    
    return {
      totalProducts,
      growthProducts,
      declineProducts,
      averageGrowthRate: Number(averageGrowthRate.toFixed(1))
    }
  }, [activeComparison])

  // 値のフォーマット
  const formatValue = (value: number, mode: ViewMode): string => {
    switch (mode) {
      case "sales":
        return `¥${value.toLocaleString()}`
      case "quantity":
        return `${Math.floor(value / 1000).toLocaleString()}個`
      case "orders":
        return `${Math.floor(value / 5000).toLocaleString()}件`
      default:
        return value.toString()
    }
  }

  // 成長率バッジの色
  const getGrowthBadgeColor = (growth: number): string => {
    if (growth >= 15) return "bg-green-100 text-green-800"
    if (growth >= 5) return "bg-blue-100 text-blue-800"
    if (growth >= 0) return "bg-gray-100 text-gray-800"
    if (growth >= -10) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  // CSVエクスポート
  const handleCSVExport = () => {
    if (!activeComparison) return

    const headers = ['商品名', 'カテゴリ', `${activeComparison.previousYear}年`, `${activeComparison.year}年`, '前年同月比', '絶対差額']
    const data = getFilteredDataForTab(activeComparison)
    const rows = data.map(item => [
      item.productName,
      item.category,
      item.previousValue.toString(),
      item.currentValue.toString(),
      `${item.growthRate}%`,
      (item.currentValue - item.previousValue).toString()
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `前年同月比分析_${activeComparison.year}vs${activeComparison.previousYear}_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (selectedYears.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 前年同月比【商品】分析
          </CardTitle>
          <CardDescription>
            年を選択して前年同月比分析を開始してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MultiYearSelector
            selectedYears={selectedYears}
            onYearsChange={setSelectedYears}
            availableYears={availableYears}
            placeholder="分析対象年を選択"
            className="max-w-md"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダーカード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 前年同月比【商品】分析
            <Badge variant="outline" className="ml-2">{selectedYears.length}年選択中</Badge>
          </CardTitle>
          <CardDescription>
            商品別の売上トレンドを前年と比較し、成長商品と要注意商品を特定できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* 年選択 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">分析対象年</label>
              <MultiYearSelector
                selectedYears={selectedYears}
                onYearsChange={setSelectedYears}
                availableYears={availableYears}
                placeholder="年を選択"
              />
            </div>

            {/* 表示モード */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">表示モード</label>
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
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

            {/* フィルター */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">成長傾向</label>
              <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="growth">成長（+10%以上）</SelectItem>
                  <SelectItem value="stable">安定（±10%以内）</SelectItem>
                  <SelectItem value="decline">減少（-10%以下）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 表示タイプ */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">データ詳細度</label>
              <Select value={displayType} onValueChange={(value: DisplayType) => setDisplayType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">年次サマリー</SelectItem>
                  <SelectItem value="monthly">月別詳細</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サマリー統計カード */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">総商品数</span>
              </div>
              <p className="text-2xl font-bold">{summaryStats.totalProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">成長商品</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{summaryStats.growthProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-gray-600">減少商品</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{summaryStats.declineProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">平均成長率</span>
              </div>
              <p className="text-2xl font-bold">{summaryStats.averageGrowthRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* メインコンテンツ */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>前年同月比較分析</CardTitle>
              <CardDescription>
                選択された年の前年比較データを表示しています
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCSVExport} size="sm" variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {multiYearData.length > 1 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-auto gap-1">
                {multiYearData.map(comparison => (
                  <TabsTrigger 
                    key={`${comparison.year}-${comparison.previousYear}`}
                    value={`${comparison.year}-${comparison.previousYear}`}
                    className="whitespace-nowrap"
                  >
                    {comparison.year}年 vs {comparison.previousYear}年
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {multiYearData.map(comparison => (
                <TabsContent 
                  key={`${comparison.year}-${comparison.previousYear}`}
                  value={`${comparison.year}-${comparison.previousYear}`}
                >
                  <ComparisonContent
                    comparison={comparison}
                    filteredData={getFilteredDataForTab(comparison)}
                    viewMode={viewMode}
                    formatValue={formatValue}
                    getGrowthBadgeColor={getGrowthBadgeColor}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    displayType={displayType}
                  />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            activeComparison && (
              <ComparisonContent
                comparison={activeComparison}
                filteredData={getFilteredDataForTab(activeComparison)}
                viewMode={viewMode}
                formatValue={formatValue}
                getGrowthBadgeColor={getGrowthBadgeColor}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortBy={sortBy}
                setSortBy={setSortBy}
                displayType={displayType}
              />
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 比較コンテンツコンポーネント
interface ComparisonContentProps {
  comparison: YearComparison
  filteredData: YearOverYearData[]
  viewMode: ViewMode
  formatValue: (value: number, mode: ViewMode) => string
  getGrowthBadgeColor: (growth: number) => string
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortBy: SortBy
  setSortBy: (sort: SortBy) => void
  displayType: DisplayType
}

const ComparisonContent: React.FC<ComparisonContentProps> = ({
  comparison,
  filteredData,
  viewMode,
  formatValue,
  getGrowthBadgeColor,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  displayType
}) => {
  // 月別データのフィルタリング
  const filteredMonthlyData = useMemo(() => {
    if (!comparison.monthlyData) return []
    
    return comparison.monthlyData.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    }).sort((a, b) => {
      switch (sortBy) {
        case "growth-desc":
          const avgGrowthA = a.monthlyData.reduce((acc, month) => acc + month.growthRate, 0) / a.monthlyData.length
          const avgGrowthB = b.monthlyData.reduce((acc, month) => acc + month.growthRate, 0) / b.monthlyData.length
          return avgGrowthB - avgGrowthA
        case "growth-asc":
          const avgGrowthA2 = a.monthlyData.reduce((acc, month) => acc + month.growthRate, 0) / a.monthlyData.length
          const avgGrowthB2 = b.monthlyData.reduce((acc, month) => acc + month.growthRate, 0) / b.monthlyData.length
          return avgGrowthA2 - avgGrowthB2
        case "amount-desc":
          const totalCurrentA = a.monthlyData.reduce((acc, month) => acc + month.currentValue, 0)
          const totalCurrentB = b.monthlyData.reduce((acc, month) => acc + month.currentValue, 0)
          return totalCurrentB - totalCurrentA
        case "name":
        default:
          return a.productName.localeCompare(b.productName)
      }
    })
  }, [comparison.monthlyData, searchTerm, sortBy])

  if (displayType === "monthly") {
    return (
      <div className="space-y-4">
        {/* 検索とソート */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="商品名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">商品名順</SelectItem>
              <SelectItem value="growth-desc">平均成長率降順</SelectItem>
              <SelectItem value="growth-asc">平均成長率昇順</SelectItem>
              <SelectItem value="amount-desc">総売上降順</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 月別データテーブル */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {comparison.year}年 vs {comparison.previousYear}年 月別詳細比較
            </CardTitle>
            <CardDescription>
              商品別月別の前年同月比較分析（横スクロールで全ての月を確認できます）
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px] border-r">
                      商品名
                    </TableHead>
                    <TableHead className="sticky left-[200px] bg-background z-10 min-w-[100px] border-r text-center">
                      カテゴリ
                    </TableHead>
                    {filteredMonthlyData[0]?.monthlyData.map((monthData, index) => (
                      <TableHead key={index} className="text-center min-w-[120px]">
                        <div className="space-y-1">
                          <div className="font-medium">{monthData.month}</div>
                          <div className="text-xs text-muted-foreground">前年同月比</div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMonthlyData.map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className="sticky left-0 bg-background font-medium border-r">
                        <div className="font-medium">{product.productName}</div>
                      </TableCell>
                      <TableCell className="sticky left-[200px] bg-background border-r text-center">
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      {product.monthlyData.map((monthData, index) => (
                        <TableCell key={index} className="text-center">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <div className="text-muted-foreground text-xs">
                                {formatValue(monthData.previousValue, viewMode)}
                              </div>
                              <div className="font-medium">
                                {formatValue(monthData.currentValue, viewMode)}
                              </div>
                            </div>
                            <Badge className={getGrowthBadgeColor(monthData.growthRate)} variant="outline">
                              {monthData.growthRate >= 0 ? "+" : ""}{monthData.growthRate}%
                            </Badge>
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {filteredMonthlyData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            検索条件に該当する商品が見つかりませんでした
          </div>
        )}
      </div>
    )
  }

  // サマリー表示（既存の実装）
  return (
    <div className="space-y-4">
      {/* 検索とソート */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="商品名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">商品名順</SelectItem>
            <SelectItem value="growth-desc">成長率降順</SelectItem>
            <SelectItem value="growth-asc">成長率昇順</SelectItem>
            <SelectItem value="amount-desc">金額降順</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* データテーブル */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead className="text-right">{comparison.previousYear}年</TableHead>
              <TableHead className="text-right">{comparison.year}年</TableHead>
              <TableHead className="text-center">前年同月比</TableHead>
              <TableHead className="text-right">差額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.productId}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="text-right">{formatValue(item.previousValue, viewMode)}</TableCell>
                <TableCell className="text-right">{formatValue(item.currentValue, viewMode)}</TableCell>
                <TableCell className="text-center">
                  <Badge className={getGrowthBadgeColor(item.growthRate)}>
                    {item.growthRate > 0 ? '+' : ''}{item.growthRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(item.currentValue - item.previousValue, viewMode)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          検索条件に該当する商品が見つかりませんでした
        </div>
      )}
    </div>
  )
}

export default YearOverYearProductAnalysisEnhanced 