"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "../../stores/appStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Download, Package, DollarSign, TrendingUp, AlertTriangle } from "lucide-react"

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

interface DateRangePeriod {
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
}

interface MonthlyStatsAnalysisProps {
  useSampleData?: boolean
}

export default function MonthlyStatsAnalysis({
  useSampleData = true,
}: MonthlyStatsAnalysisProps) {
  const selectedPeriod = useAppStore((state) => state.globalFilters.selectedPeriod)
  const [displayMode, setDisplayMode] = useState<'quantity' | 'amount' | 'both'>('amount')
  
  // 期間選択の状態管理
  const currentYear = new Date().getFullYear()
  
  // デフォルト期間計算関数（直近12ヶ月）
  const getDefaultDateRange = (): DateRangePeriod => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1 // 1-12
    
    // 12ヶ月前を計算
    let startYear = currentYear
    let startMonth = currentMonth - 11
    
    if (startMonth <= 0) {
      startYear = currentYear - 1
      startMonth = 12 + startMonth
    }
    
    return {
      startYear,
      startMonth,
      endYear: currentYear,
      endMonth: currentMonth
    }
  }
  
  const [dateRange, setDateRange] = useState<DateRangePeriod>(getDefaultDateRange())
  const [validationError, setValidationError] = useState<string>("")

  // 利用可能な年・月の配列
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const availableMonths = Array.from({ length: 12 }, (_, i) => i + 1)
  
  // プリセット期間の定義
  const presetPeriods = [
    {
      label: "直近12ヶ月",
      icon: "📈",
      getValue: () => getDefaultDateRange()
    },
    {
      label: "今年度",
      icon: "📅", 
      getValue: () => ({
        startYear: currentYear,
        startMonth: 1,
        endYear: currentYear,
        endMonth: 12
      })
    },
    {
      label: "直近6ヶ月",
      icon: "⏰",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear
        let startMonth = currentMonth - 5
        
        if (startMonth <= 0) {
          startYear = currentYear - 1
          startMonth = 12 + startMonth
        }
        
        return {
          startYear,
          startMonth,
          endYear: currentYear,
          endMonth: currentMonth
        }
      }
    }
  ]

  // サンプル商品データ
  const products: Product[] = [
    { id: '1', name: 'プロテインパウダー', category: 'サプリメント' },
    { id: '2', name: 'ビタミンC', category: 'サプリメント' },
    { id: '3', name: '青汁', category: '健康食品' },
    { id: '4', name: 'コラーゲン', category: '美容' },
    { id: '5', name: 'マルチビタミン', category: 'サプリメント' },
  ]

  // 期間バリデーション関数
  const validateDateRange = (newRange: DateRangePeriod): { isValid: boolean; message: string; monthCount: number } => {
    const monthDiff = (newRange.endYear - newRange.startYear) * 12 + (newRange.endMonth - newRange.startMonth) + 1
    
    if (monthDiff <= 0) {
      return { isValid: false, message: "開始年月は終了年月より前を指定してください", monthCount: 0 }
    }
    
    if (monthDiff > 12) {
      return { isValid: false, message: "期間は12ヶ月以内で指定してください", monthCount: monthDiff }
    }
    
    return { isValid: true, message: "", monthCount: monthDiff }
  }

  // 期間変更ハンドラー
  const handleDateRangeChange = (field: keyof DateRangePeriod, value: number) => {
    const newRange = { ...dateRange, [field]: value }
    const validation = validateDateRange(newRange)
    
    if (validation.isValid) {
      setValidationError("")
      setDateRange(newRange)
    } else {
      setValidationError(validation.message)
      // エラーがある場合でも一時的に状態を更新（ユーザーの入力を妨げないため）
      setDateRange(newRange)
    }
  }

  // プリセット期間適用ハンドラー
  const handlePresetPeriod = (preset: typeof presetPeriods[0]) => {
    const newRange = preset.getValue()
    setDateRange(newRange)
    setValidationError("")
  }

  // 動的月ヘッダー生成
  const months = useMemo(() => {
    if (!validateDateRange(dateRange).isValid) {
      return []
    }

    const headers = []
    let currentYear = dateRange.startYear
    let currentMonth = dateRange.startMonth
    
    while (currentYear < dateRange.endYear || (currentYear === dateRange.endYear && currentMonth <= dateRange.endMonth)) {
      if (dateRange.startYear !== dateRange.endYear) {
        headers.push(`${currentYear}年${currentMonth}月`)
      } else {
        headers.push(`${currentMonth}月`)
      }
      
      currentMonth++
      if (currentMonth > 12) {
        currentMonth = 1
        currentYear++
      }
    }
    
    return headers
  }, [dateRange])

  // 選択期間の月数計算
  const selectedMonthsCount = useMemo(() => {
    return validateDateRange(dateRange).monthCount
  }, [dateRange])

  // 簡単なサンプルデータ生成（期間に基づく）
  const generateSampleData = (productId: string, monthIndex: number): ProductMonthlyData => {
    // 期間が無効な場合は0を返す
    if (!validateDateRange(dateRange).isValid) {
      return { quantity: 0, amount: 0 }
    }

    const baseQuantity = 80 + Math.floor(Math.random() * 40)
    const unitPrice = 1500 + Math.floor(Math.random() * 500)
    return {
      quantity: baseQuantity,
      amount: baseQuantity * unitPrice
    }
  }

  // セル内容のレンダリング
  const renderCellContent = (productId: string, monthIndex: number) => {
    const data = generateSampleData(productId, monthIndex)

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

  // 統計計算（選択期間に基づく）
  const calculateTotalAmount = (): number => {
    if (!validateDateRange(dateRange).isValid) return 0
    
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
    if (!validateDateRange(dateRange).isValid) return 0
    
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
    const totalAmount = calculateTotalAmount()
    return months.length > 0 ? Math.floor(totalAmount / months.length) : 0
  }

  // CSVエクスポート機能（期間対応）
  const handleExport = () => {
    if (!validateDateRange(dateRange).isValid) {
      alert('有効な期間を選択してからエクスポートしてください')
      return
    }

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
    
    // ファイル名に期間情報を含める
    const periodStr = `${dateRange.startYear}${dateRange.startMonth.toString().padStart(2, '0')}-${dateRange.endYear}${dateRange.endMonth.toString().padStart(2, '0')}`
    link.setAttribute('download', `月別売上統計_${periodStr}_${new Date().toISOString().slice(0, 10)}.csv`)
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
          <CardDescription>
            商品別の月別売上推移と季節性分析（デフォルト：直近12ヶ月、最大12ヶ月指定可能）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* プリセット期間ボタン */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 flex items-center mr-2">
                クイック選択:
              </span>
              {presetPeriods.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetPeriod(preset)}
                  className="h-8 text-xs"
                >
                  {preset.icon} {preset.label}
                </Button>
              ))}
            </div>

            {/* 期間選択UI */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">期間:</span>
                
                {/* 開始年月 */}
                <Select value={dateRange.startYear.toString()} onValueChange={(value) => handleDateRangeChange('startYear', parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={dateRange.startMonth.toString()} onValueChange={(value) => handleDateRangeChange('startMonth', parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(month => (
                      <SelectItem key={month} value={month.toString()}>{month}月</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span className="text-muted-foreground">〜</span>
                
                {/* 終了年月 */}
                <Select value={dateRange.endYear.toString()} onValueChange={(value) => handleDateRangeChange('endYear', parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={dateRange.endMonth.toString()} onValueChange={(value) => handleDateRangeChange('endMonth', parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(month => (
                      <SelectItem key={month} value={month.toString()}>{month}月</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span className="text-sm text-green-600 font-medium">
                  📈 {selectedMonthsCount}ヶ月間のトレンド
                </span>
              </div>
            </div>

            {/* バリデーションエラー表示 */}
            {validationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* 表示モードとエクスポート */}
            <div className="flex flex-wrap gap-4">
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

              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={!validateDateRange(dateRange).isValid}
              >
                <Download className="w-4 h-4 mr-2" />
                CSVダウンロード
              </Button>
            </div>
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
            <div className="text-2xl font-bold">{selectedMonthsCount}ヶ月</div>
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
      {validateDateRange(dateRange).isValid ? (
        <Card>
          <CardHeader>
            <CardTitle>商品別月別売上マトリックス</CardTitle>
            <CardDescription>
              📊 {dateRange.startYear}年{dateRange.startMonth}月 〜 {dateRange.endYear}年{dateRange.endMonth}月
              <span className="ml-2 text-green-600 font-medium">（{selectedMonthsCount}ヶ月間のトレンド）</span>
              {months.length > 6 && "・横スクロールで全ての月を確認できます"}
            </CardDescription>
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
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">有効な期間を選択してください</p>
              <p className="text-sm text-muted-foreground mt-2">
                開始年月と終了年月を正しく設定し、期間が12ヶ月以内になるようにしてください
              </p>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  )
}