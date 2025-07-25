"use client"

import { useState, useMemo, useEffect } from "react"
import { useAppStore } from "../../stores/appStore"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Download, Package, DollarSign, TrendingUp, AlertTriangle, Settings, ChevronUp, ChevronDown, Search } from "lucide-react"
import { getTopProducts, getCategoryStyle, type SampleProduct } from "@/lib/sample-products"
import { Label } from "@/components/ui/label"

// 型定義
interface ProductMonthlyData {
  quantity: number
  amount: number
}

// Product型をSampleProductに置き換え

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
  useSampleData = false, // Changed to false to use API by default
}: MonthlyStatsAnalysisProps) {
  const selectedPeriod = useAppStore((state) => state.globalFilters.selectedPeriod)
  const [displayMode, setDisplayMode] = useState<'quantity' | 'amount' | 'both'>('amount')
  const [showConditions, setShowConditions] = useState(true)
  
  // API data state
  const [apiData, setApiData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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

  // API データ取得関数
  const fetchMonthlySalesData = async (dateRange: DateRangePeriod) => {
    if (!validateDateRange(dateRange).isValid) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching monthly sales data:', dateRange)
      
      const response = await api.monthlySales({
        storeId: 1,
        startYear: dateRange.startYear,
        startMonth: dateRange.startMonth,
        endYear: dateRange.endYear,
        endMonth: dateRange.endMonth,
        displayMode: displayMode,
        maxProducts: 20
      })

      console.log('✅ Monthly sales API response:', response)
      setApiData(response.data)
    } catch (err) {
      console.error('❌ Monthly sales API error:', err)
      setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 初回ロード時とdateRange変更時にAPIデータを取得
  useEffect(() => {
    if (!useSampleData) {
      fetchMonthlySalesData(dateRange)
    }
  }, [dateRange, displayMode, useSampleData])

  // 実際の商品データを使用（上位売上商品を取得 or APIデータ）
  const products: SampleProduct[] = useSampleData 
    ? getTopProducts(15)
    : (apiData?.products || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        category: product.category || 'その他',
        price: product.handle ? undefined : 0
      }))

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

  // 商品カテゴリーに基づく現実的なサンプルデータ生成
  const generateSampleData = (productId: string, monthIndex: number): ProductMonthlyData => {
    // 期間が無効な場合は0を返す
    if (!validateDateRange(dateRange).isValid) {
      return { quantity: 0, amount: 0 }
    }

    const product = products.find(p => p.id === productId)
    if (!product) {
      return { quantity: 0, amount: 0 }
    }

    // カテゴリースタイル情報を取得
    const categoryStyle = getCategoryStyle(product.category)
    
    // 季節性を考慮した月の係数（1月=1, 12月=12）
    const currentMonthInYear = ((dateRange.startMonth + monthIndex - 1) % 12) + 1
    
    // カテゴリー別の季節性パターンと基本数量・価格設定
    const getProductMetrics = (category: string, month: number) => {
      switch (category) {
        case 'deco_box': // デコ箱
          const seasonalMultiplier = [1.0, 0.8, 1.3, 1.2, 1.1, 1.4, 0.9, 0.8, 0.9, 1.0, 1.5, 1.8][month - 1]
          return {
            baseQuantity: 150 + Math.floor(Math.random() * 100),
            seasonalMultiplier,
            basePrice: product.price || 1200
          }
        
        case 'gift_box': // ギフトボックス
          const giftSeasonality = [1.2, 1.8, 1.5, 1.3, 1.4, 1.6, 0.8, 0.7, 0.9, 1.0, 1.4, 2.0][month - 1]
          return {
            baseQuantity: 120 + Math.floor(Math.random() * 80),
            seasonalMultiplier: giftSeasonality,
            basePrice: product.price || 850
          }
        
        case 'pound_cake_box': // パウンドケーキ箱
          const cakeSeasonality = [1.1, 1.0, 1.2, 1.1, 1.3, 1.2, 1.0, 0.9, 1.0, 1.1, 1.4, 1.6][month - 1]
          return {
            baseQuantity: 200 + Math.floor(Math.random() * 150),
            seasonalMultiplier: cakeSeasonality,
            basePrice: product.price || 620
          }
        
        case 'paper_bag': // 紙袋
          return {
            baseQuantity: 300 + Math.floor(Math.random() * 200),
            seasonalMultiplier: 1.0 + (Math.random() * 0.4 - 0.2), // ±20%の変動
            basePrice: product.price || 180
          }
        
        case 'packaging': // 包装材
          return {
            baseQuantity: 400 + Math.floor(Math.random() * 300),
            seasonalMultiplier: 1.0 + (Math.random() * 0.3 - 0.15), // ±15%の変動
            basePrice: product.price || 120
          }
        
        case 'accessories': // 保冷材・アクセサリー
          const coolingSeasonality = [0.5, 0.6, 0.8, 1.0, 1.3, 1.8, 2.0, 1.9, 1.5, 1.0, 0.7, 0.5][month - 1]
          return {
            baseQuantity: 80 + Math.floor(Math.random() * 120),
            seasonalMultiplier: coolingSeasonality,
            basePrice: product.price || 80
          }
        
        default:
          return {
            baseQuantity: 100 + Math.floor(Math.random() * 80),
            seasonalMultiplier: 1.0 + (Math.random() * 0.3 - 0.15),
            basePrice: product.price || 500
          }
      }
    }

    const metrics = getProductMetrics(product.category, currentMonthInYear)
    const quantity = Math.floor(metrics.baseQuantity * metrics.seasonalMultiplier)
    const amount = quantity * metrics.basePrice

    return {
      quantity: Math.max(0, quantity),
      amount: Math.max(0, amount)
    }
  }

  // セル内容のレンダリング（API データまたはサンプルデータ）
  const renderCellContent = (productId: string, monthIndex: number) => {
    let data: ProductMonthlyData
    
    if (useSampleData || !apiData) {
      data = generateSampleData(productId, monthIndex)
    } else {
      // API データから該当する商品の月別データを取得
      const product = apiData.products.find((p: any) => p.id === productId)
      
      // 月キーの生成: months[monthIndex] から年月を抽出
      let monthKey = ''
      if (months[monthIndex]) {
        const monthStr = months[monthIndex] // "2025年1月" or "1月"
        if (monthStr.includes('年')) {
          // "2025年1月" -> "2025-01"
          const parts = monthStr.split('年')
          const year = parts[0]
          const month = parts[1].replace('月', '').padStart(2, '0')
          monthKey = `${year}-${month}`
        } else {
          // "1月" -> 現在の年を使用
          const month = monthStr.replace('月', '').padStart(2, '0')
          monthKey = `${dateRange.startYear === dateRange.endYear ? dateRange.startYear : new Date().getFullYear()}-${month}`
        }
      }
      
      if (product && product.monthlyData && product.monthlyData[monthKey]) {
        const monthlyData = product.monthlyData[monthKey]
        data = {
          quantity: monthlyData.quantity || 0,
          amount: monthlyData.amount || 0
        }
      } else {
        data = { quantity: 0, amount: 0 }
      }
    }

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

  // 統計計算（選択期間に基づく、API データまたはサンプルデータ）
  const calculateTotalAmount = (): number => {
    if (!validateDateRange(dateRange).isValid) return 0
    
    if (!useSampleData && apiData?.summary) {
      return apiData.summary.totalAmount || 0
    }
    
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
    
    if (!useSampleData && apiData?.summary) {
      return apiData.summary.totalQuantity || 0
    }
    
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
    if (!useSampleData && apiData?.summary) {
      return Math.floor(apiData.summary.monthlyAverage || 0)
    }
    
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">分析条件設定</CardTitle>
              <CardDescription>期間と分析条件を設定してください</CardDescription>
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
          <CardContent className="px-6 pt-2 pb-4">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-4">
              {/* 期間選択 */}
              <div>
                <Label className="text-sm font-medium">分析期間</Label>
                <div className="mt-2 space-y-3">
                  {/* プリセット期間ボタン */}
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex flex-wrap gap-2 items-center">
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
                    
                    <span className="text-xs text-green-600 font-medium">
                      📈 {selectedMonthsCount}ヶ月間
                    </span>
                  </div>

                  {/* バリデーションエラー表示 */}
                  {validationError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {/* API エラー表示 */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
              
              {/* 商品選択（将来拡張用） */}
              <div>
                <Label className="text-sm font-medium">商品選択</Label>
                <Select defaultValue="top15">
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="商品を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top15">売上上位15商品</SelectItem>
                    <SelectItem value="all">すべての商品</SelectItem>
                    <SelectItem value="category">カテゴリー別</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 表示設定 */}
              <div>
                <Label className="text-sm font-medium">表示設定</Label>
                <Select value={displayMode} onValueChange={(value: any) => setDisplayMode(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="表示項目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity">数量</SelectItem>
                    <SelectItem value="amount">金額</SelectItem>
                    <SelectItem value="both">数量/金額</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2 pt-2 mt-4 border-t">
              <Button 
                onClick={() => fetchMonthlySalesData(dateRange)} 
                disabled={isLoading || !validateDateRange(dateRange).isValid}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                {isLoading ? '分析中...' : '分析実行'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={!validateDateRange(dateRange).isValid}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                CSV出力
              </Button>
            </div>
          </CardContent>
        )}
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

      {/* ローディング表示 */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-lg font-medium text-muted-foreground">月別売上データを取得中...</p>
              <p className="text-sm text-muted-foreground mt-2">
                しばらくお待ちください
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* メインテーブル */}
      {!isLoading && validateDateRange(dateRange).isValid ? (
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
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {getCategoryStyle(product.category).name}
                          </div>
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