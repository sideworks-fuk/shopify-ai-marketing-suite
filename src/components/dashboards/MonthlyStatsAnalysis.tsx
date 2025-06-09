"use client"

import { useState } from "react"
import { useAppStore } from "../../stores/appStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Download, Package, DollarSign, TrendingUp } from "lucide-react"

// 型定義
interface ProductMonthlyData {
  quantity: number
  amount: number
}

interface Product {
  id: string
  name: string
  category: string
}

interface MonthlyStatsAnalysisProps {
  useSampleData?: boolean
}

export default function MonthlyStatsAnalysis({
  useSampleData = true,
}: MonthlyStatsAnalysisProps) {
  const selectedPeriod = useAppStore((state) => state.globalFilters.selectedPeriod)
  const [displayMode, setDisplayMode] = useState<'quantity' | 'amount' | 'both'>('amount')
  const [selectedYear, setSelectedYear] = useState<string>('2024')

  // サンプル商品データ
  const products: Product[] = [
    { id: '1', name: 'プロテインパウダー', category: 'サプリメント' },
    { id: '2', name: 'ビタミンC', category: 'サプリメント' },
    { id: '3', name: '青汁', category: '健康食品' },
    { id: '4', name: 'コラーゲン', category: '美容' },
    { id: '5', name: 'マルチビタミン', category: 'サプリメント' },
  ]

  // 月別の名前
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  // 簡単なサンプルデータ生成
  const generateSampleData = (productId: string, month: number): ProductMonthlyData => {
    const baseQuantity = 80 + Math.floor(Math.random() * 40)
    const unitPrice = 1500 + Math.floor(Math.random() * 500)
    return {
      quantity: baseQuantity,
      amount: baseQuantity * unitPrice
    }
  }

  // セル内容のレンダリング
  const renderCellContent = (productId: string, month: number) => {
    const data = generateSampleData(productId, month)

    switch (displayMode) {
      case 'quantity':
        return <span>{data.quantity.toLocaleString()}</span>
      
      case 'amount':
        return <span>¥{data.amount.toLocaleString()}</span>
      
      case 'both':
        return (
          <div className="space-y-0.5">
            <div className="text-sm font-medium">{data.quantity.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">¥{data.amount.toLocaleString()}</div>
          </div>
        )
    }
  }

  // 統計計算
  const calculateTotalAmount = (): number => {
    let total = 0
    products.forEach(product => {
      months.forEach((_, monthIndex) => {
        const data = generateSampleData(product.id, monthIndex)
        total += data.amount
      })
    })
    return total
  }

  const calculateTotalQuantity = (): number => {
    let total = 0
    products.forEach(product => {
      months.forEach((_, monthIndex) => {
        const data = generateSampleData(product.id, monthIndex)
        total += data.quantity
      })
    })
    return total
  }

  const calculateMonthlyAverage = (): number => {
    return Math.floor(calculateTotalAmount() / months.length)
  }

  // CSVエクスポート機能
  const handleExport = () => {
    const headers = ['商品名', ...months]
    const rows = products.map(product => {
      const row = [product.name]
      months.forEach((_, monthIndex) => {
        const data = generateSampleData(product.id, monthIndex)
        if (displayMode === 'quantity') {
          row.push(data.quantity.toString())
        } else if (displayMode === 'amount') {
          row.push(data.amount.toString())
        } else {
          row.push(`${data.quantity} / ¥${data.amount.toLocaleString()}`)
        }
      })
      return row
    })

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `月別売上統計_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            月別売上統計分析
          </CardTitle>
          <CardDescription>商品別の月別売上推移と季節性分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024年</SelectItem>
                <SelectItem value="2023">2023年</SelectItem>
                <SelectItem value="all">全期間</SelectItem>
              </SelectContent>
            </Select>

            <Select value={displayMode} onValueChange={(value: any) => setDisplayMode(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="表示項目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">数量</SelectItem>
                <SelectItem value="amount">金額</SelectItem>
                <SelectItem value="both">数量/金額</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              CSVダウンロード
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">対象期間</span>
            </div>
            <div className="text-2xl font-bold">{months.length}ヶ月</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">総売上金額</span>
            </div>
            <div className="text-2xl font-bold">¥{calculateTotalAmount().toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">総販売数量</span>
            </div>
            <div className="text-2xl font-bold">{calculateTotalQuantity().toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">月平均売上</span>
            </div>
            <div className="text-2xl font-bold">¥{calculateMonthlyAverage().toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* メインテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>商品別月別売上マトリックス</CardTitle>
          <CardDescription>横スクロールで全ての月を確認できます</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px] border-r">
                    商品名
                  </TableHead>
                  {months.map((month, index) => (
                    <TableHead key={index} className="text-center min-w-[120px]">
                      {month}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="sticky left-0 bg-background font-medium border-r">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.category}</div>
                      </div>
                    </TableCell>
                    {months.map((_, monthIndex) => (
                      <TableCell key={monthIndex} className="text-right">
                        {renderCellContent(product.id, monthIndex)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ステータス表示 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            選択期間: {selectedPeriod} | 表示モード: {displayMode} | 対象年: {selectedYear}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}