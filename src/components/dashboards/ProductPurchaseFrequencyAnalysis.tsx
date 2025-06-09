"use client"

import { useState, useEffect, useMemo } from "react"
import { useProductAnalysisFilters } from "../../stores/analysisFiltersStore"
import { useAppStore } from "../../stores/appStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { RefreshCw, Download, AlertCircle, Search, Info, RotateCcw, Filter, Settings, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { DataService } from "@/lib/data-service"
import PeriodSelector, { type DateRangePeriod } from "@/components/common/PeriodSelector"
import { SAMPLE_PRODUCTS, PRODUCT_CATEGORIES, getCategoryStyle, getCategoryName, getTopProducts, getProductsByCategory, type SampleProduct } from '@/lib/sample-products'
import { ProductSelectorModal } from '@/components/ui/product-selector-modal'

interface PurchaseFrequencyData {
  productId: string
  productName: string
  category: string
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
  // ✅ Zustand移行: 商品分析フィルター使用
  const { 
    filters,
    setMaxFrequency,
    setCustomMaxFrequency,
    setDisplayMode,
    updateDateRange,
    updateProductFilters,
    toggleHeatmap,
    resetFilters
  } = useProductAnalysisFilters()
  
  const setLoading = useAppStore((state) => state.setLoading)
  const showToast = useAppStore((state) => state.showToast)
  
  // ✅ データ管理用の必要最小限ローカル状態
  const [purchaseFrequencyData, setPurchaseFrequencyData] = useState<PurchaseFrequencyData[]>([])
  const [filteredData, setFilteredData] = useState<PurchaseFrequencyData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ 一時的なローカル状態（段階的移行）
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [showConditions, setShowConditions] = useState(true)
  
  // ✅ 商品選択用のローカル状態（Zustand移行対応）
  const setSelectedProducts = (products: string[]) => {
    updateProductFilters({ selectedProductIds: products })
  }
  
  const setProductFilter = (filter: string) => {
    updateProductFilters({ productFilter: filter as any })
  }
  
  const setSelectedCategory = (category: string) => {
    updateProductFilters({ category })
  }
  
  const setShowHeatmap = (show: boolean) => {
    toggleHeatmap()
  }
  
  // ✅ Zustandから状態を取得（年月ベースに変更）
  const dateRange = filters.dateRange
  const maxFrequency = filters.maxFrequency
  const customMaxFrequency = filters.customMaxFrequency
  const displayMode = filters.displayMode
  const productFilter = filters.productFilters.productFilter
  const selectedCategory = filters.productFilters.category
  const selectedProducts = filters.productFilters.selectedProductIds
  const showHeatmap = filters.showHeatmap

  // ✅ プリセット期間の定義（購入頻度分析用）
  const presetPeriods = [
    {
      label: "直近18ヶ月",
      icon: "📊",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear - 1
        let startMonth = currentMonth - 5  // 18ヶ月前
        
        if (startMonth <= 0) {
          startYear = currentYear - 2
          startMonth = 12 + startMonth
        }
        
        return {
          startYear,
          startMonth,
          endYear: currentYear,
          endMonth: currentMonth
        }
      }
    },
    {
      label: "直近12ヶ月",
      icon: "📈",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear - 1
        let startMonth = currentMonth + 1
        
        if (startMonth > 12) {
          startYear = currentYear
          startMonth = startMonth - 12
        }
        
        return {
          startYear,
          startMonth,
          endYear: currentYear,
          endMonth: currentMonth
        }
      }
    },
    {
      label: "直近6ヶ月",
      icon: "📉",
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

  // ✅ 年月を日付文字列に変換（既存のデータ生成ロジック用）
  const formatDateRange = (dateRange: DateRangePeriod) => {
    const startDate = `${dateRange.startYear}-${String(dateRange.startMonth).padStart(2, '0')}-01`
    const endYear = dateRange.endYear
    const endMonth = dateRange.endMonth
    const lastDay = new Date(endYear, endMonth, 0).getDate()
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    return { startDate, endDate }
  }

  // ✅ 現在の期間を日付文字列として取得
  const { startDate, endDate } = formatDateRange(dateRange)

  // 成長率の計算と色分けのためのヘルパー関数
  const renderGrowthCell = (currentValue: number, previousValue: number) => {
    const growthRate = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
    const colorClass = growthRate > 0 ? 'text-green-600' : growthRate < 0 ? 'text-red-600' : 'text-gray-600'
    
    return (
      <div className="text-center">
        <div>{currentValue.toLocaleString()}</div>
        <div className={`text-xs ${colorClass}`}>
          {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
        </div>
      </div>
    )
  }

  // 転換率計算
  const calculateConversionRates = (data: PurchaseFrequencyData[]) => {
    if (!data.length) return { conversion1to2: 0, conversion2to3: 0 }
    
    // 全体の転換率を計算（平均）
    let total1to2 = 0
    let total2to3 = 0
    let validProducts1to2 = 0
    let validProducts2to3 = 0
    
    data.forEach(product => {
      const freq1 = product.frequencies.find(f => f.count === 1)
      const freq2 = product.frequencies.find(f => f.count === 2)
      const freq3 = product.frequencies.find(f => f.count === 3)
      
      if (freq1 && freq2 && freq1.customers > 0) {
        total1to2 += (freq2.customers / freq1.customers) * 100
        validProducts1to2++
      }
      
      if (freq2 && freq3 && freq2.customers > 0) {
        total2to3 += (freq3.customers / freq2.customers) * 100
        validProducts2to3++
      }
    })
    
    return {
      conversion1to2: validProducts1to2 > 0 ? total1to2 / validProducts1to2 : 0,
      conversion2to3: validProducts2to3 > 0 ? total2to3 / validProducts2to3 : 0
    }
  }

  // 動的サンプルデータ生成（統一商品リスト使用）
  const generateSampleData = (): PurchaseFrequencyData[] => {
    const productsToUse = getFilteredProducts()
    
    return productsToUse.map(product => {
      const totalCustomers = 80 + Math.floor(Math.random() * 40) // 80-120人
      const frequencies = []
      let remainingCustomers = totalCustomers
      
      // 動的に頻度データを生成
      const effectiveMaxFreq = maxFrequency === 'custom' ? parseInt(customMaxFrequency) : maxFrequency
      
      // 商品カテゴリによる購入パターンの調整
      const getPurchasePattern = (categoryId: string) => {
        const categoryName = getCategoryName(categoryId)
        
        if (categoryName.includes('デコ箱') || categoryName.includes('ギフトボックス')) {
          // 季節商品は1-2回購入が多い
          return { firstPurchaseRate: 0.6, repeatDecline: 0.7 }
        } else if (categoryName.includes('包装材') || categoryName.includes('紙袋')) {
          // 包装材は定期購入されやすい
          return { firstPurchaseRate: 0.4, repeatDecline: 0.5 }
        } else if (categoryName.includes('保冷材')) {
          // 保冷材は夏季に集中購入
          return { firstPurchaseRate: 0.5, repeatDecline: 0.6 }
        } else if (categoryName.includes('ダンボール')) {
          // ダンボールは定期購入
          return { firstPurchaseRate: 0.35, repeatDecline: 0.4 }
        } else {
          // その他の商品
          return { firstPurchaseRate: 0.5, repeatDecline: 0.6 }
        }
      }
      
      const pattern = getPurchasePattern(product.category)
      
      for (let i = 1; i <= effectiveMaxFreq; i++) {
        let customers = 0
        if (i === 1) {
          // 1回購入（パターンに基づく）
          customers = Math.floor(totalCustomers * pattern.firstPurchaseRate)
        } else {
          // 2回目以降は指数的に減少
          customers = Math.floor(remainingCustomers * Math.pow(pattern.repeatDecline, i - 2) * (0.1 + Math.random() * 0.2))
        }
        
        customers = Math.min(customers, remainingCustomers)
        remainingCustomers -= customers
        
        const percentage = Math.round((customers / totalCustomers) * 100)
        frequencies.push({ count: i, customers, percentage })
        
        if (remainingCustomers <= 0) break
      }
      
      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        frequencies,
        totalCustomers
      }
    })
  }

  // フィルター対象商品の取得
  const getFilteredProducts = (): SampleProduct[] => {
    switch (productFilter) {
      case 'top10':
        return getTopProducts(10)
      case 'category':
        return selectedCategory ? getProductsByCategory(selectedCategory) : SAMPLE_PRODUCTS
      case 'custom':
        return SAMPLE_PRODUCTS.filter(p => selectedProducts.includes(p.id))
      default:
        return SAMPLE_PRODUCTS
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (useSampleData) {
        // サンプルデータを使用
        await new Promise(resolve => setTimeout(resolve, 500)) // Loading simulation
        const data = generateSampleData()
        setPurchaseFrequencyData(data)
        setFilteredData(data)
      } else {
        // 実際のAPI呼び出し
        if (shopDomain && accessToken) {
          const dataService = new DataService(shopDomain, accessToken)
          const data = await dataService.getPurchaseFrequencyAnalysis()
          setPurchaseFrequencyData(data)
          setFilteredData(data)
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
  }, [useSampleData]) // ✅ selectedPeriod削除: Zustand管理に移行

  // 条件変更時のデータ更新
  useEffect(() => {
    if (purchaseFrequencyData.length > 0) {
      const filtered = purchaseFrequencyData.filter(item => {
        const product = SAMPLE_PRODUCTS.find(p => p.id === item.productId)
        if (!product) return false
        
        switch (productFilter) {
          case 'top10':
            return getTopProducts(10).some(p => p.id === product.id)
          case 'category':
            return selectedCategory ? product.category === selectedCategory : true
          case 'custom':
            return selectedProducts.includes(product.id)
          default:
            return true
        }
      })
      setFilteredData(filtered)
    }
  }, [productFilter, selectedCategory, selectedProducts, purchaseFrequencyData])

  // 条件リセット
  const handleReset = () => {
    resetFilters() // ✅ Zustand統一リセット機能を使用
  }

  // 分析実行
  const handleAnalyze = () => {
    loadData()
  }

  const exportToCsv = () => {
    const headers = [
      '商品ID', '商品名', 'カテゴリー', '総顧客数',
      ...Array.from({ length: maxFrequency === 'custom' ? parseInt(customMaxFrequency) : maxFrequency }, (_, i) => `${i + 1}回`)
    ]
    
    const csvData = [
      headers.join(','),
      ...filteredData.map(item => [
        item.productId,
        `"${item.productName}"`,
        `"${getCategoryName(item.category)}"`,
        item.totalCustomers,
        ...item.frequencies.map(f => displayMode === 'count' ? f.customers : f.percentage)
      ].join(','))
    ]
    
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `purchase-frequency-analysis-${dateRange.startYear}-${dateRange.startMonth}-to-${dateRange.endYear}-${dateRange.endMonth}.csv`)  // ✅ 年月ベースのファイル名
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
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

  const effectiveMaxFreq = maxFrequency === 'custom' ? parseInt(customMaxFrequency) : maxFrequency

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">購入回数詳細分析【商品】</h2>
          <p className="text-gray-600 mt-1">
            商品別の顧客購入回数分布を分析し、リピート購入パターンと転換率を把握できます
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowConditions(!showConditions)}
          >
            <Settings className="h-4 w-4 mr-2" />
            抽出条件
            {showConditions ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
          <Button onClick={exportToCsv} disabled={isLoading || filteredData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV出力
          </Button>
        </div>
      </div>

      {/* 分析条件設定 */}
      {showConditions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">分析条件設定</CardTitle>
            <CardDescription>期間と分析条件を設定してください</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* ✅ 期間選択（統一UI） */}
              <div className="space-y-4">
                <Label>分析期間</Label>
                <PeriodSelector
                  dateRange={dateRange}
                  onDateRangeChange={updateDateRange}
                  title="購入頻度分析期間"
                  description="商品の購入頻度を分析する期間を選択してください"
                  maxMonths={18}
                  minMonths={3}
                  presetPeriods={presetPeriods}
                />
              </div>
              
              {/* 商品絞り込み */}
              <div className="space-y-4">
                <Label>商品選択</Label>
                <div className="flex gap-2">
                  <Select value={productFilter} onValueChange={(value: any) => setProductFilter(value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="商品を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべての商品</SelectItem>
                      <SelectItem value="top10">売上上位10商品</SelectItem>
                      <SelectItem value="category">カテゴリー別</SelectItem>
                      <SelectItem value="custom">個別選択</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* カテゴリー選択 */}
                  {productFilter === 'category' && (
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="カテゴリー" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* 個別選択ボタン */}
                  {productFilter === 'custom' && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowProductSelector(true)}
                    >
                      商品を選択 ({selectedProducts.length}件)
                    </Button>
                  )}
                </div>
              </div>

              {/* 表示設定 */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 最大表示回数 */}
                <div>
                  <Label>最大表示回数</Label>
                  <RadioGroup 
                    value={maxFrequency.toString()} 
                    onValueChange={(v) => setMaxFrequency(v === 'custom' ? 'custom' : Number(v))}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="12" id="f12" />
                      <Label htmlFor="f12">12回まで</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="20" id="f20" />
                      <Label htmlFor="f20">20回まで</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="fcustom" />
                      <Label htmlFor="fcustom">カスタム</Label>
                      {maxFrequency === 'custom' && (
                        <Input 
                          type="number" 
                          value={customMaxFrequency} 
                          onChange={(e) => setCustomMaxFrequency(e.target.value)}
                          className="w-20"
                          min="1"
                          max="50"
                        />
                      )}
                    </div>
                  </RadioGroup>
                </div>

                {/* 表示モード */}
                <div>
                  <Label>表示モード</Label>
                  <RadioGroup 
                    value={displayMode} 
                    onValueChange={(v: any) => setDisplayMode(v)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="count" id="mode-count" />
                      <Label htmlFor="mode-count">購入人数</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentage" id="mode-percentage" />
                      <Label htmlFor="mode-percentage">構成比率(%)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 表示オプション */}
                <div>
                  <Label>表示オプション</Label>
                  <div className="mt-2 space-y-2">
                                         <div className="flex items-center space-x-2">
                       <Checkbox 
                         checked={showHeatmap} 
                         onCheckedChange={(checked) => setShowHeatmap(checked === true)}
                         id="show-heatmap"
                       />
                       <Label htmlFor="show-heatmap">ヒートマップ表示</Label>
                     </div>
                  </div>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex gap-2">
                <Button onClick={handleAnalyze} disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  分析実行
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  条件クリア
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 商品選択モーダル */}
      <ProductSelectorModal
        isOpen={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        title="分析対象商品の選択"
        description="購入頻度を分析する商品を選択してください"
      />

      {/* 結果表示 */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-600">データを読み込み中...</span>
            </div>
          </CardContent>
        </Card>
      ) : filteredData.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>購入頻度分析結果</CardTitle>
                <CardDescription>
                  {filteredData.length}商品 | 
                  期間: {dateRange.startYear}年{dateRange.startMonth}月 ～ {dateRange.endYear}年{dateRange.endMonth}月 | 
                  表示: {displayMode === 'count' ? '購入人数' : '構成比率(%)'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  <Filter className="h-3 w-3 mr-1" />
                  {productFilter === 'all' ? 'すべて' : 
                   productFilter === 'top10' ? '上位10商品' :
                   productFilter === 'category' ? `${PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'カテゴリー'}` :
                   `${selectedProducts.length}商品選択`}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left font-medium sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                      商品名
                    </th>
                    <th className="p-3 text-center font-medium min-w-[80px]">カテゴリー</th>
                    {Array.from({ length: effectiveMaxFreq }, (_, i) => (
                      <th key={i + 1} className="p-3 text-center font-medium min-w-[60px]">
                        {i + 1}回
                        {/* 重要な回数にバッジを追加 */}
                        {i + 1 === 1 && (
                          <Badge variant="outline" className="ml-1 text-xs">新規</Badge>
                        )}
                        {i + 1 >= 10 && (
                          <Badge variant="outline" className="ml-1 text-xs text-green-600">優良</Badge>
                        )}
                      </th>
                    ))}
                    <th className="p-3 text-center font-medium min-w-[80px]">
                      {effectiveMaxFreq + 1}回以上
                    </th>
                    <th className="p-3 text-center font-medium min-w-[80px]">総顧客数</th>
                    <th className="p-3 text-center font-medium min-w-[100px]">リピート率</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((product, productIndex) => {
                    const categoryStyle = getCategoryStyle(product.category)
                    const repeatCustomers = product.frequencies.slice(1).reduce((sum, freq) => sum + freq.customers, 0)
                    const repeatRate = product.totalCustomers > 0 ? Math.round((repeatCustomers / product.totalCustomers) * 100) : 0
                    
                    // ヒートマップ用の最大値計算
                    const maxValue = Math.max(...product.frequencies.map(f => 
                      displayMode === 'count' ? f.customers : f.percentage
                    ))
                    
                    const getHeatmapColor = (value: number): string => {
                      if (!showHeatmap || maxValue === 0) return ''
                      const intensity = value / maxValue
                      if (intensity > 0.8) return 'bg-red-100 text-red-900'
                      if (intensity > 0.6) return 'bg-orange-100 text-orange-900'
                      if (intensity > 0.4) return 'bg-yellow-100 text-yellow-900'
                      if (intensity > 0.2) return 'bg-blue-100 text-blue-900'
                      if (intensity > 0) return 'bg-gray-100 text-gray-700'
                      return ''
                    }

                    return (
                      <tr key={productIndex} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium sticky left-0 bg-white z-10 max-w-[200px]">
                          <div className="truncate" title={product.productName}>
                            {product.productName}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`${categoryStyle.bgColor} ${categoryStyle.textColor} border-0`}>
                            {categoryStyle.name}
                          </Badge>
                        </td>
                        {Array.from({ length: effectiveMaxFreq }, (_, i) => {
                          const freq = product.frequencies.find(f => f.count === i + 1)
                          const value = freq ? (displayMode === 'count' ? freq.customers : freq.percentage) : 0
                          const displayValue = displayMode === 'count' ? value : `${value}%`
                          
                          // 重要指標のハイライト
                          let cellClass = `p-3 text-center ${getHeatmapColor(value)}`
                          if (i + 1 === 1) cellClass += ' bg-blue-50 border-l-2 border-blue-300'
                          if (i + 1 >= 10) cellClass += ' bg-green-50 border-l-2 border-green-300'
                          
                          return (
                            <td key={i + 1} className={cellClass}>
                              {displayValue}
                            </td>
                          )
                        })}
                        <td className="p-3 text-center">
                          {(() => {
                            const overMaxCustomers = product.frequencies
                              .filter(f => f.count > effectiveMaxFreq)
                              .reduce((sum, freq) => sum + freq.customers, 0)
                            const overMaxPercentage = product.totalCustomers > 0 ? 
                              Math.round((overMaxCustomers / product.totalCustomers) * 100) : 0
                            return displayMode === 'count' ? overMaxCustomers : `${overMaxPercentage}%`
                          })()}
                        </td>
                        <td className="p-3 text-center font-medium">
                          {product.totalCustomers}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={repeatRate >= 30 ? "default" : "secondary"}>
                            {repeatRate}%
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* 転換率表示 */}
            {(() => {
              const conversionRates = calculateConversionRates(filteredData)
              return (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold mb-2">主要転換率</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">1回→2回:</span>
                      <Badge variant="outline" className="font-medium">
                        {conversionRates.conversion1to2.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">2回→3回:</span>
                      <Badge variant="outline" className="font-medium">
                        {conversionRates.conversion2to3.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">全体リピート率:</span>
                      <Badge variant="default" className="font-medium">
                        {(() => {
                          const totalCustomers = filteredData.reduce((sum, p) => sum + p.totalCustomers, 0)
                          const repeatCustomers = filteredData.reduce((sum, p) => 
                            sum + p.frequencies.slice(1).reduce((pSum, f) => pSum + f.customers, 0), 0)
                          return totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : '0.0'
                        })()}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">分析商品数:</span>
                      <Badge variant="secondary" className="font-medium">
                        {filteredData.length}商品
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })()}
            
            {/* ヒートマップ凡例 */}
            {showHeatmap && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">ヒートマップ凡例</h4>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 border rounded"></div>
                    <span>最高値</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-100 border rounded"></div>
                    <span>高</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-100 border rounded"></div>
                    <span>中</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-100 border rounded"></div>
                    <span>低</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-100 border rounded"></div>
                    <span>最低値</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">データがありません</h3>
              <p>選択した条件に該当するデータが見つかりませんでした。</p>
              <p className="text-sm mt-2">条件を変更して再度分析を実行してください。</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
