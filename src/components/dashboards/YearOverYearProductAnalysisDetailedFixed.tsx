"use client"

import React, { useState, useMemo } from "react"
import { useAppContext } from "../../contexts/AppContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, Package, FileDown, FileSpreadsheet } from "lucide-react"

// 型定義
interface YearOverYearData {
  productId: string
  productName: string
  category: string
  current2024: number
  previous2023: number
  growthRate: number
}

interface MonthlyYearOverYearData {
  productId: string
  productName: string
  category: string
  monthlyData: Array<{
    month: string
    current2024: number
    previous2023: number
    growthRate: number
  }>
}

const YearOverYearProductAnalysisDetailedFixed = () => {
  const { selectedPeriod } = useAppContext()
  const [viewMode, setViewMode] = useState<"sales" | "quantity" | "orders">("sales")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "growth" | "stable" | "decline">("all")
  const [sortBy, setSortBy] = useState<"name" | "growth-desc" | "growth-asc" | "amount-desc">("name")
  const [displayType, setDisplayType] = useState<"summary" | "monthly">("summary")

  // サンプル商品データ
  const products = [
    { id: "1", name: "【サンプル】カラートレースリム 150 ホワイト", category: "食品包装容器" },
    { id: "2", name: "【サンプル】カラートレー 165 ブラウン", category: "食品包装容器" },
    { id: "3", name: "【サンプル】IKトレースリム 150 黒", category: "食品包装容器" },
    { id: "4", name: "【サンプル】nwクリスマスデコ箱4号H130", category: "ギフトボックス" },
    { id: "5", name: "【サンプル】Criollo-Bitter-デコ箱4号H130", category: "ギフトボックス" },
  ]

  // 簡単な前年同月比データ生成
  const generateSampleData = (): YearOverYearData[] => {
    return products.map(product => {
      const baseValue2023 = 50000 + Math.floor(Math.random() * 100000)
      const growthRate = (Math.random() - 0.3) * 50 // -15% ~ +35%の範囲
      const current2024 = Math.floor(baseValue2023 * (1 + growthRate / 100))

      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        current2024,
        previous2023: baseValue2023,
        growthRate: Number(growthRate.toFixed(1))
      }
    })
  }

  const data = generateSampleData()

  // 月別データ生成
  const generateMonthlyData = (): MonthlyYearOverYearData[] => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    
    return products.map(product => {
      const monthlyData = months.map((month, index) => {
        const baseValue2023 = 20000 + Math.floor(Math.random() * 40000)
        const seasonalFactor = 1 + Math.sin((index * Math.PI) / 6) * 0.3 // 季節性変動
        const growthRate = (Math.random() - 0.3) * 50 // -15% ~ +35%の範囲
        const current2024 = Math.floor(baseValue2023 * seasonalFactor * (1 + growthRate / 100))

        return {
          month,
          previous2023: Math.floor(baseValue2023 * seasonalFactor),
          current2024,
          growthRate: Number(growthRate.toFixed(1))
        }
      })

      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        monthlyData
      }
    })
  }

  const monthlyData = generateMonthlyData()

  // フィルタリングと並び替え
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = 
        filterType === "all" ||
        (filterType === "growth" && item.growthRate > 10) ||
        (filterType === "stable" && item.growthRate >= -10 && item.growthRate <= 10) ||
        (filterType === "decline" && item.growthRate < -10)
      return matchesSearch && matchesFilter
    })

    // 並び替え
    switch (sortBy) {
      case "growth-desc":
        return filtered.sort((a, b) => b.growthRate - a.growthRate)
      case "growth-asc":
        return filtered.sort((a, b) => a.growthRate - b.growthRate)
      case "amount-desc":
        return filtered.sort((a, b) => b.current2024 - a.current2024)
      case "name":
      default:
        return filtered.sort((a, b) => a.productName.localeCompare(b.productName))
    }
  }, [data, searchTerm, filterType, sortBy])

  // サマリー統計
  const summaryStats = useMemo(() => {
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
  }, [data])

  // 値のフォーマット
  const formatValue = (value: number, mode: string): string => {
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
    if (displayType === "summary") {
      const headers = ['商品名', 'カテゴリ', '2023年', '2024年', '前年同月比', '絶対差額']
      const rows = filteredAndSortedData.map(item => [
        item.productName,
        item.category,
        item.previous2023.toString(),
        item.current2024.toString(),
        `${item.growthRate}%`,
        (item.current2024 - item.previous2023).toString()
      ])

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `前年同月比分析_${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // 月別データのCSVエクスポート
      const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      const headers = ['商品名', 'カテゴリ', ...months.map(m => `${m}2023`), ...months.map(m => `${m}2024`), ...months.map(m => `${m}成長率`)]
      
      const rows = monthlyData.map(item => {
        const row = [item.productName, item.category]
        // 2023年データ
        item.monthlyData.forEach(month => row.push(month.previous2023.toString()))
        // 2024年データ
        item.monthlyData.forEach(month => row.push(month.current2024.toString()))
        // 成長率データ
        item.monthlyData.forEach(month => row.push(`${month.growthRate}%`))
        return row
      })

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `前年同月比月別分析_${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Excelエクスポート（今後実装予定）
  const handleExcelExport = () => {
    // Phase 2で実装予定
    alert('Excel エクスポート機能は Phase 2 で実装予定です')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー部分 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6" />
            前年同月比【商品】詳細分析
          </h1>
          <p className="text-muted-foreground">
            商品別の売上トレンドを前年と比較し、成長商品と要注意商品を特定できます
          </p>
        </div>
        
        {/* エクスポートボタンを右上に配置 */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCSVExport}>
            <FileDown className="w-4 h-4 mr-2" />
            CSVダウンロード
          </Button>
          <Button variant="outline" onClick={handleExcelExport}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excelダウンロード
          </Button>
        </div>
      </div>

      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">表示設定</CardTitle>
          <CardDescription>
            データの表示方法とフィルタリング条件を設定
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 上段: 表示項目選択 */}
            <div className="flex flex-wrap gap-4">
              <Select value={displayType} onValueChange={(value: any) => setDisplayType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="表示形式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">サマリー表示</SelectItem>
                  <SelectItem value="monthly">全月表示</SelectItem>
                </SelectContent>
              </Select>

              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="表示項目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">売上金額</SelectItem>
                  <SelectItem value="quantity">販売数量</SelectItem>
                  <SelectItem value="orders">注文件数</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 下段: フィルタリング */}
            <div className="flex flex-wrap gap-4">
              <Input
                placeholder="商品名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="表示フィルター" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての商品</SelectItem>
                  <SelectItem value="growth">成長商品のみ（+10%以上）</SelectItem>
                  <SelectItem value="stable">安定商品（±10%）</SelectItem>
                  <SelectItem value="decline">要注意商品（-10%以下）</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="並び順" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">商品名順</SelectItem>
                  <SelectItem value="growth-desc">成長率（高い順）</SelectItem>
                  <SelectItem value="growth-asc">成長率（低い順）</SelectItem>
                  <SelectItem value="amount-desc">売上金額（高い順）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* フィルタ結果表示 */}
            {(searchTerm || filterType !== "all") && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                フィルタ結果: {filteredAndSortedData.length}件 / 全{data.length}件
                {searchTerm && <span className="ml-2">検索: "{searchTerm}"</span>}
                {filterType !== "all" && <span className="ml-2">フィルター: {
                  filterType === "growth" ? "成長商品" :
                  filterType === "stable" ? "安定商品" :
                  filterType === "decline" ? "要注意商品" : ""
                }</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 改善されたサマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">総商品数</span>
                </div>
                <div className="text-2xl font-bold">{summaryStats.totalProducts}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-muted-foreground">成長商品数</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{summaryStats.growthProducts}</div>
                <div className="text-xs text-muted-foreground">
                  {((summaryStats.growthProducts / summaryStats.totalProducts) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-muted-foreground">要注意商品数</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{summaryStats.declineProducts}</div>
                <div className="text-xs text-muted-foreground">
                  {((summaryStats.declineProducts / summaryStats.totalProducts) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className={`h-4 w-4 ${summaryStats.averageGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="text-sm font-medium text-muted-foreground">平均成長率</span>
                </div>
                <div className={`text-2xl font-bold ${summaryStats.averageGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summaryStats.averageGrowthRate >= 0 ? '+' : ''}{summaryStats.averageGrowthRate}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 前年同月比データテーブル */}
      {displayType === "summary" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              前年同月比詳細データ
            </CardTitle>
            <CardDescription>2024年 vs 2023年の商品別比較分析</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">商品名</TableHead>
                    <TableHead className="text-center">カテゴリ</TableHead>
                    <TableHead className="text-center">2023年</TableHead>
                    <TableHead className="text-center">2024年</TableHead>
                    <TableHead className="text-center">前年同月比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{item.productName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {formatValue(item.previous2023, viewMode)}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold">
                        {formatValue(item.current2024, viewMode)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getGrowthBadgeColor(item.growthRate)}>
                          {item.growthRate >= 0 ? "+" : ""}{item.growthRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              前年同月比月別詳細データ
            </CardTitle>
            <CardDescription>2024年 vs 2023年の商品別月別比較分析（横スクロールで全ての月を確認できます）</CardDescription>
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
                    {monthlyData[0]?.monthlyData.map((monthData, index) => (
                      <TableHead key={index} className="text-center min-w-[100px]">
                        <div className="space-y-1">
                          <div className="font-medium">{monthData.month}</div>
                          <div className="text-xs text-muted-foreground">前年同月比</div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((product) => (
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
                              <div className="text-muted-foreground">{formatValue(monthData.previous2023, viewMode)}</div>
                              <div className="font-medium">{formatValue(monthData.current2024, viewMode)}</div>
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
      )}

      {/* ステータス表示 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            選択期間: {selectedPeriod} | 表示モード: {viewMode} | データ範囲: 2024年 vs 2023年
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default YearOverYearProductAnalysisDetailedFixed 