"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp, TrendingDown, BarChart, Users, ShoppingCart, Target, UserCheck, UserPlus, AlertTriangle, Activity } from "lucide-react"
import { useAppContext } from "@/contexts/AppContext"
import { LineChart, Line, BarChart as RechartBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

// F階層傾向データの型定義
interface FLayerTrendData {
  month: string
  F1: number // 1回購入
  F2: number // 2回購入
  F3: number // 3-5回購入
  F4: number // 6-10回購入
  F5: number // 11回以上購入
}

interface FLayerSummary {
  tier: string
  description: string
  current: number
  previous: number
  growth: number
  percentage: number
}

// F階層傾向サンプルデータ（拡張版）
const fLayerTrendData: FLayerTrendData[] = [
  { month: "1月", F1: 120, F2: 80, F3: 45, F4: 28, F5: 15 },
  { month: "2月", F1: 135, F2: 85, F3: 50, F4: 30, F5: 18 },
  { month: "3月", F1: 150, F2: 90, F3: 55, F4: 32, F5: 20 },
  { month: "4月", F1: 140, F2: 88, F3: 52, F4: 31, F5: 19 },
  { month: "5月", F1: 160, F2: 95, F3: 58, F4: 35, F5: 22 },
  { month: "6月", F1: 170, F2: 100, F3: 60, F4: 38, F5: 24 },
  { month: "7月", F1: 180, F2: 105, F3: 65, F4: 40, F5: 26 },
  { month: "8月", F1: 190, F2: 110, F3: 68, F4: 42, F5: 28 },
  { month: "9月", F1: 175, F2: 102, F3: 62, F4: 39, F5: 25 },
  { month: "10月", F1: 165, F2: 98, F3: 59, F4: 36, F5: 23 },
  { month: "11月", F1: 155, F2: 92, F3: 56, F4: 34, F5: 21 },
  { month: "12月", F1: 145, F2: 87, F3: 53, F4: 33, F5: 20 },
]

// 色定義
const tierColors = {
  F1: "#EF4444", // 赤系 - 新規顧客
  F2: "#F59E0B", // オレンジ系 - リピート開始
  F3: "#10B981", // 緑系 - ロイヤル顧客
  F4: "#3B82F6", // 青系 - 高頻度顧客
  F5: "#8B5CF6", // 紫系 - 最高頻度顧客
}

const heatmapColors = ["#DCFCE7", "#86EFAC", "#4ADE80", "#22C55E", "#16A34A"]

interface FTierTrendAnalysisProps {
  shopDomain?: string
  accessToken?: string
  useSampleData?: boolean
}

export default function FTierTrendAnalysis({
  shopDomain,
  accessToken,
  useSampleData = true,
}: FTierTrendAnalysisProps) {
  const { selectedPeriod } = useAppContext()
  const [viewMode, setViewMode] = useState<'heatmap' | 'chart' | 'both'>('both')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [analysisRange, setAnalysisRange] = useState<'全年' | '上半期' | '下半期' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('全年')

  // データフィルタリング
  const filteredData = useMemo(() => {
    let startIndex = 0
    let endIndex = fLayerTrendData.length

    switch (analysisRange) {
      case '上半期':
        startIndex = 0
        endIndex = 6
        break
      case '下半期':
        startIndex = 6
        endIndex = 12
        break
      case 'Q1':
        startIndex = 0
        endIndex = 3
        break
      case 'Q2':
        startIndex = 3
        endIndex = 6
        break
      case 'Q3':
        startIndex = 6
        endIndex = 9
        break
      case 'Q4':
        startIndex = 9
        endIndex = 12
        break
    }

    return fLayerTrendData.slice(startIndex, endIndex)
  }, [analysisRange])

  // F階層サマリー計算
  const tierSummary: FLayerSummary[] = useMemo(() => {
    const current = filteredData[filteredData.length - 1]
    const previous = filteredData[0]
    const total = current ? Object.values(current).slice(1).reduce((sum: number, val) => sum + (val as number), 0) : 0

    if (!current || !previous) return []

    return [
      {
        tier: 'F1',
        description: '新規顧客 (1回購入)',
        current: current.F1,
        previous: previous.F1,
        growth: previous.F1 > 0 ? ((current.F1 - previous.F1) / previous.F1) * 100 : 0,
        percentage: total > 0 ? (current.F1 / total) * 100 : 0,
      },
      {
        tier: 'F2',
        description: 'リピート開始 (2回購入)',
        current: current.F2,
        previous: previous.F2,
        growth: previous.F2 > 0 ? ((current.F2 - previous.F2) / previous.F2) * 100 : 0,
        percentage: total > 0 ? (current.F2 / total) * 100 : 0,
      },
      {
        tier: 'F3',
        description: 'ロイヤル顧客 (3-5回)',
        current: current.F3,
        previous: previous.F3,
        growth: previous.F3 > 0 ? ((current.F3 - previous.F3) / previous.F3) * 100 : 0,
        percentage: total > 0 ? (current.F3 / total) * 100 : 0,
      },
      {
        tier: 'F4',
        description: '高頻度顧客 (6-10回)',
        current: current.F4,
        previous: previous.F4,
        growth: previous.F4 > 0 ? ((current.F4 - previous.F4) / previous.F4) * 100 : 0,
        percentage: total > 0 ? (current.F4 / total) * 100 : 0,
      },
      {
        tier: 'F5',
        description: '最高頻度顧客 (11回以上)',
        current: current.F5,
        previous: previous.F5,
        growth: previous.F5 > 0 ? ((current.F5 - previous.F5) / previous.F5) * 100 : 0,
        percentage: total > 0 ? (current.F5 / total) * 100 : 0,
      },
    ]
  }, [filteredData])

  // KPIサマリー計算
  const kpiSummary = useMemo(() => {
    const current = filteredData[filteredData.length - 1]
    const previous = filteredData[0]
    
    if (!current || !previous) return null

    const currentTotal = current.F1 + current.F2 + current.F3 + current.F4 + current.F5
    const previousTotal = previous.F1 + previous.F2 + previous.F3 + previous.F4 + previous.F5
    
    // 平均購入頻度計算（重み付き平均）
    const currentFreq = (current.F1 * 1 + current.F2 * 2 + current.F3 * 4 + current.F4 * 8 + current.F5 * 12) / currentTotal
    const previousFreq = (previous.F1 * 1 + previous.F2 * 2 + previous.F3 * 4 + previous.F4 * 8 + previous.F5 * 12) / previousTotal
    
    // ロイヤル顧客率（F3以上）
    const loyalCustomers = current.F3 + current.F4 + current.F5
    const previousLoyalCustomers = previous.F3 + previous.F4 + previous.F5
    const loyalRate = (loyalCustomers / currentTotal) * 100
    const previousLoyalRate = (previousLoyalCustomers / previousTotal) * 100
    
    // 離脱リスク顧客（新規顧客の増加が過度な場合）
    const newCustomerRate = (current.F1 / currentTotal) * 100
    const riskThreshold = 60 // 60%以上が新規の場合はリスク
    
    return {
      totalCustomers: {
        current: currentTotal,
        previous: previousTotal,
        growth: previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0,
        isAbnormal: Math.abs(((currentTotal - previousTotal) / previousTotal) * 100) > 20
      },
      avgFrequency: {
        current: currentFreq,
        previous: previousFreq,
        growth: previousFreq > 0 ? ((currentFreq - previousFreq) / previousFreq) * 100 : 0,
        isAbnormal: Math.abs(((currentFreq - previousFreq) / previousFreq) * 100) > 15
      },
      loyalCustomerRate: {
        current: loyalRate,
        previous: previousLoyalRate,
        growth: previousLoyalRate > 0 ? ((loyalRate - previousLoyalRate) / previousLoyalRate) * 100 : 0,
        isAbnormal: loyalRate < 25 // 25%未満は異常値
      },
      riskCustomers: {
        count: newCustomerRate > riskThreshold ? Math.floor(current.F1 * 0.3) : 0, // 新規顧客の30%がリスクと仮定
        rate: newCustomerRate,
        isHigh: newCustomerRate > riskThreshold
      }
    }
  }, [filteredData])

  // CSVエクスポート
  const exportToCsv = () => {
    const headers = ["月", "F1 (1回)", "F2 (2回)", "F3 (3-5回)", "F4 (6-10回)", "F5 (11回以上)", "合計"]
    
    const csvData = filteredData.map(row => {
      const total = row.F1 + row.F2 + row.F3 + row.F4 + row.F5
      return [row.month, row.F1, row.F2, row.F3, row.F4, row.F5, total]
    })

    // サマリー追加
    csvData.push([])
    csvData.push(["F階層", "現在値", "開始値", "成長率(%)", "構成比(%)"])
    tierSummary.forEach(tier => {
      csvData.push([
        tier.description,
        tier.current,
        tier.previous,
        tier.growth.toFixed(1),
        tier.percentage.toFixed(1)
      ])
    })

    const csvContent = "data:text/csv;charset=utf-8," + 
      headers.join(",") + "\n" +
      csvData.map(row => row.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `F階層傾向分析_${analysisRange}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ヒートマップ用色計算（改良版）
  const getHeatmapColor = (value: number, tier: keyof typeof tierColors, isAbnormal: boolean = false): string => {
    const maxValues = {
      F1: 200, F2: 120, F3: 70, F4: 45, F5: 30
    }
    const opacity = Math.min(value / maxValues[tier], 1)
    
    // 異常値の場合は強調表示
    if (isAbnormal) {
      return 'bg-red-200 text-red-900 border-2 border-red-400 animate-pulse'
    }
    
    // ティア別色分け（改良版）
    switch (tier) {
      case 'F1':
        if (opacity > 0.8) return 'bg-red-500 text-white font-bold'
        if (opacity > 0.6) return 'bg-red-400 text-white'
        if (opacity > 0.4) return 'bg-red-300 text-red-900'
        if (opacity > 0.2) return 'bg-red-200 text-red-800'
        return 'bg-red-100 text-red-700'
        
      case 'F2':
        if (opacity > 0.8) return 'bg-orange-500 text-white font-bold'
        if (opacity > 0.6) return 'bg-orange-400 text-white'
        if (opacity > 0.4) return 'bg-orange-300 text-orange-900'
        if (opacity > 0.2) return 'bg-orange-200 text-orange-800'
        return 'bg-orange-100 text-orange-700'
        
      case 'F3':
        if (opacity > 0.8) return 'bg-green-500 text-white font-bold'
        if (opacity > 0.6) return 'bg-green-400 text-white'
        if (opacity > 0.4) return 'bg-green-300 text-green-900'
        if (opacity > 0.2) return 'bg-green-200 text-green-800'
        return 'bg-green-100 text-green-700'
        
      case 'F4':
        if (opacity > 0.8) return 'bg-blue-500 text-white font-bold'
        if (opacity > 0.6) return 'bg-blue-400 text-white'
        if (opacity > 0.4) return 'bg-blue-300 text-blue-900'
        if (opacity > 0.2) return 'bg-blue-200 text-blue-800'
        return 'bg-blue-100 text-blue-700'
        
      case 'F5':
        if (opacity > 0.8) return 'bg-purple-500 text-white font-bold'
        if (opacity > 0.6) return 'bg-purple-400 text-white'
        if (opacity > 0.4) return 'bg-purple-300 text-purple-900'
        if (opacity > 0.2) return 'bg-purple-200 text-purple-800'
        return 'bg-purple-100 text-purple-700'
        
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // トレンドアイコンの取得
  const getTrendIcon = (growth: number, isAbnormal: boolean = false) => {
    if (isAbnormal) {
      return <AlertTriangle className="h-3 w-3 text-red-500" />
    }
    if (growth > 5) return <TrendingUp className="h-3 w-3 text-green-600" />
    if (growth < -5) return <TrendingDown className="h-3 w-3 text-red-600" />
    return <Activity className="h-3 w-3 text-gray-500" />
  }

  // フィルタ済みデータの表示
  const chartData = filteredData

  return (
    <div className="space-y-6">
      {/* ヘッダーエリア */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📊 F階層傾向【購買】</h1>
            <p className="text-gray-600 mt-2">
              購入頻度による顧客階層の時系列変化を分析し、顧客ロイヤリティの推移とリテンション施策の効果測定
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={analysisRange} onValueChange={(value: any) => setAnalysisRange(value)}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全年">全年</SelectItem>
                <SelectItem value="上半期">上半期</SelectItem>
                <SelectItem value="下半期">下半期</SelectItem>
                <SelectItem value="Q1">Q1</SelectItem>
                <SelectItem value="Q2">Q2</SelectItem>
                <SelectItem value="Q3">Q3</SelectItem>
                <SelectItem value="Q4">Q4</SelectItem>
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">両方表示</SelectItem>
                <SelectItem value="heatmap">ヒートマップ</SelectItem>
                <SelectItem value="chart">チャート</SelectItem>
              </SelectContent>
            </Select>

            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">ライン</SelectItem>
                <SelectItem value="bar">バー</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToCsv} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV出力
            </Button>
          </div>
        </div>
      </div>

      {/* KPIサマリーダッシュボード */}
      {kpiSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 総顧客数 */}
          <Card className={kpiSummary.totalCustomers.isAbnormal ? "border-yellow-400 bg-yellow-50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総顧客数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiSummary.totalCustomers.current.toLocaleString()}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  前期: {kpiSummary.totalCustomers.previous.toLocaleString()}
                </span>
                <div className="flex items-center">
                  {getTrendIcon(kpiSummary.totalCustomers.growth, kpiSummary.totalCustomers.isAbnormal)}
                  <span className={`text-xs ml-1 ${
                    kpiSummary.totalCustomers.growth > 0 ? 'text-green-600' : 
                    kpiSummary.totalCustomers.growth < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {kpiSummary.totalCustomers.growth > 0 ? '+' : ''}{kpiSummary.totalCustomers.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 平均購入頻度 */}
          <Card className={kpiSummary.avgFrequency.isAbnormal ? "border-yellow-400 bg-yellow-50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均購入頻度</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiSummary.avgFrequency.current.toFixed(1)}回</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  前期: {kpiSummary.avgFrequency.previous.toFixed(1)}回
                </span>
                <div className="flex items-center">
                  {getTrendIcon(kpiSummary.avgFrequency.growth, kpiSummary.avgFrequency.isAbnormal)}
                  <span className={`text-xs ml-1 ${
                    kpiSummary.avgFrequency.growth > 0 ? 'text-green-600' : 
                    kpiSummary.avgFrequency.growth < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {kpiSummary.avgFrequency.growth > 0 ? '+' : ''}{kpiSummary.avgFrequency.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ロイヤル顧客率 */}
          <Card className={kpiSummary.loyalCustomerRate.isAbnormal ? "border-red-400 bg-red-50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ロイヤル顧客率</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiSummary.loyalCustomerRate.current.toFixed(1)}%</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  F3以上の顧客比率
                </span>
                <div className="flex items-center">
                  {getTrendIcon(kpiSummary.loyalCustomerRate.growth, kpiSummary.loyalCustomerRate.isAbnormal)}
                  <span className={`text-xs ml-1 ${
                    kpiSummary.loyalCustomerRate.growth > 0 ? 'text-green-600' : 
                    kpiSummary.loyalCustomerRate.growth < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {kpiSummary.loyalCustomerRate.growth > 0 ? '+' : ''}{kpiSummary.loyalCustomerRate.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
              {kpiSummary.loyalCustomerRate.isAbnormal && (
                <div className="mt-2 text-xs text-red-600">
                  ⚠️ ロイヤル顧客率が低下しています
                </div>
              )}
            </CardContent>
          </Card>

          {/* 離脱リスク顧客 */}
          <Card className={kpiSummary.riskCustomers.isHigh ? "border-red-400 bg-red-50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">離脱リスク顧客</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiSummary.riskCustomers.count.toLocaleString()}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  新規率: {kpiSummary.riskCustomers.rate.toFixed(1)}%
                </span>
                {kpiSummary.riskCustomers.isHigh && (
                  <Badge variant="destructive" className="text-xs">
                    ⚠️ 高リスク
                  </Badge>
                )}
              </div>
              {kpiSummary.riskCustomers.isHigh && (
                <div className="mt-2 text-xs text-red-600">
                  新規顧客比率が高く、リテンション施策が必要
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* F階層詳細サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {tierSummary.map((tier) => {
          const isAbnormal = Math.abs(tier.growth) > 30 // 30%以上の変化は異常値
          const isImportant = tier.tier === 'F1' || tier.tier === 'F5' // F1(新規)とF5(VIP)は重要
          
          return (
            <Card key={tier.tier} className={`
              ${isAbnormal ? 'border-yellow-400 bg-yellow-50' : ''}
              ${isImportant ? 'border-2 border-blue-200' : ''}
            `}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">{tier.tier}</CardTitle>
                  {isImportant && (
                    <Badge variant={tier.tier === 'F1' ? 'destructive' : 'default'} className="text-xs">
                      {tier.tier === 'F1' ? '新規' : 'VIP'}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {isAbnormal && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tier.current.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    構成比: {tier.percentage.toFixed(1)}%
                  </span>
                  <div className="flex items-center">
                    {getTrendIcon(tier.growth, isAbnormal)}
                    <span className={`text-xs ml-1 ${
                      tier.growth > 0 ? 'text-green-600' : tier.growth < 0 ? 'text-red-600' : 'text-gray-600'
                    } ${isAbnormal ? 'font-bold' : ''}`}>
                      {tier.growth > 0 ? '+' : ''}{tier.growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {isAbnormal && (
                  <div className="mt-2 text-xs text-yellow-700">
                    ⚠️ 大きな変化が検出されました
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ヒートマップ表示 */}
      {(viewMode === 'heatmap' || viewMode === 'both') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              F階層傾向ヒートマップ
            </CardTitle>
            <CardDescription>月別 × 購入回数階層のマトリックス（濃い色ほど高い値）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">月</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">F1 (1回)</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">F2 (2回)</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">F3 (3-5回)</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">F4 (6-10回)</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">F5 (11回+)</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => {
                    const total = item.F1 + item.F2 + item.F3 + item.F4 + item.F5
                    
                    // 異常値判定（平均から大きく外れる値をチェック）
                    const avgF1 = filteredData.reduce((sum, d) => sum + d.F1, 0) / filteredData.length
                    const avgF2 = filteredData.reduce((sum, d) => sum + d.F2, 0) / filteredData.length
                    const avgF3 = filteredData.reduce((sum, d) => sum + d.F3, 0) / filteredData.length
                    const avgF4 = filteredData.reduce((sum, d) => sum + d.F4, 0) / filteredData.length
                    const avgF5 = filteredData.reduce((sum, d) => sum + d.F5, 0) / filteredData.length
                    
                    const isF1Abnormal = Math.abs(item.F1 - avgF1) > avgF1 * 0.4 // 40%以上の差
                    const isF2Abnormal = Math.abs(item.F2 - avgF2) > avgF2 * 0.4
                    const isF3Abnormal = Math.abs(item.F3 - avgF3) > avgF3 * 0.4
                    const isF4Abnormal = Math.abs(item.F4 - avgF4) > avgF4 * 0.4
                    const isF5Abnormal = Math.abs(item.F5 - avgF5) > avgF5 * 0.4
                    
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {item.month}
                            {(isF1Abnormal || isF2Abnormal || isF3Abnormal || isF4Abnormal || isF5Abnormal) && (
                              <div title="異常値を含む月">
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className={`mx-auto rounded-md py-2 text-center text-xs font-medium ${getHeatmapColor(item.F1, 'F1', isF1Abnormal)}`}>
                            {item.F1}
                            {isF1Abnormal && <span className="ml-1">⚠️</span>}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className={`mx-auto rounded-md py-2 text-center text-xs font-medium ${getHeatmapColor(item.F2, 'F2', isF2Abnormal)}`}>
                            {item.F2}
                            {isF2Abnormal && <span className="ml-1">⚠️</span>}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className={`mx-auto rounded-md py-2 text-center text-xs font-medium ${getHeatmapColor(item.F3, 'F3', isF3Abnormal)}`}>
                            {item.F3}
                            {isF3Abnormal && <span className="ml-1">⚠️</span>}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className={`mx-auto rounded-md py-2 text-center text-xs font-medium ${getHeatmapColor(item.F4, 'F4', isF4Abnormal)}`}>
                            {item.F4}
                            {isF4Abnormal && <span className="ml-1">⚠️</span>}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className={`mx-auto rounded-md py-2 text-center text-xs font-medium ${getHeatmapColor(item.F5, 'F5', isF5Abnormal)}`}>
                            {item.F5}
                            {isF5Abnormal && <span className="ml-1">⚠️</span>}
                          </div>
                        </td>
                        
                        <td className="py-3 px-4 text-center font-semibold">
                          {total.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ヒートマップ凡例 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-3">ヒートマップ凡例</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {tierSummary.map((tier) => (
                  <div key={tier.tier} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded`} style={{ backgroundColor: tierColors[tier.tier as keyof typeof tierColors] }}></div>
                    <span className="text-xs">{tier.tier}: {tier.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* チャート表示 */}
      {(viewMode === 'chart' || viewMode === 'both') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              F階層推移チャート
            </CardTitle>
            <CardDescription>各階層の時系列変化を可視化</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value}人`,
                        name === 'F1' ? 'F1 (1回)' :
                        name === 'F2' ? 'F2 (2回)' :
                        name === 'F3' ? 'F3 (3-5回)' :
                        name === 'F4' ? 'F4 (6-10回)' :
                        'F5 (11回以上)'
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="F1" stroke={tierColors.F1} strokeWidth={2} name="F1 (1回)" />
                    <Line type="monotone" dataKey="F2" stroke={tierColors.F2} strokeWidth={2} name="F2 (2回)" />
                    <Line type="monotone" dataKey="F3" stroke={tierColors.F3} strokeWidth={2} name="F3 (3-5回)" />
                    <Line type="monotone" dataKey="F4" stroke={tierColors.F4} strokeWidth={2} name="F4 (6-10回)" />
                    <Line type="monotone" dataKey="F5" stroke={tierColors.F5} strokeWidth={2} name="F5 (11回以上)" />
                  </LineChart>
                ) : (
                  <RechartBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value}人`,
                        name === 'F1' ? 'F1 (1回)' :
                        name === 'F2' ? 'F2 (2回)' :
                        name === 'F3' ? 'F3 (3-5回)' :
                        name === 'F4' ? 'F4 (6-10回)' :
                        'F5 (11回以上)'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="F1" fill={tierColors.F1} name="F1 (1回)" />
                    <Bar dataKey="F2" fill={tierColors.F2} name="F2 (2回)" />
                    <Bar dataKey="F3" fill={tierColors.F3} name="F3 (3-5回)" />
                    <Bar dataKey="F4" fill={tierColors.F4} name="F4 (6-10回)" />
                    <Bar dataKey="F5" fill={tierColors.F5} name="F5 (11回以上)" />
                  </RechartBarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 詳細統計 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            F階層詳細統計
          </CardTitle>
          <CardDescription>分析期間: {analysisRange}における各階層の詳細分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* リピート率分析 */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">リピート率分析</h4>
              <div className="space-y-1 text-sm">
                {(() => {
                  const latest = filteredData[filteredData.length - 1]
                  if (!latest) return <div>データがありません</div>
                  
                  const total = latest.F1 + latest.F2 + latest.F3 + latest.F4 + latest.F5
                  const repeatCustomers = latest.F2 + latest.F3 + latest.F4 + latest.F5
                  const repeatRate = total > 0 ? (repeatCustomers / total) * 100 : 0
                  
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">リピート率:</span>
                        <Badge variant="default">{repeatRate.toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">新規比率:</span>
                        <Badge variant="outline">{((latest.F1 / total) * 100).toFixed(1)}%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ロイヤル顧客:</span>
                        <Badge variant="secondary">{(((latest.F4 + latest.F5) / total) * 100).toFixed(1)}%</Badge>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* 成長傾向 */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">成長傾向</h4>
              <div className="space-y-1 text-sm">
                {tierSummary.slice(0, 3).map((tier) => (
                  <div key={tier.tier} className="flex justify-between">
                    <span className="text-muted-foreground">{tier.tier}:</span>
                    <Badge variant={tier.growth > 0 ? "default" : tier.growth < 0 ? "destructive" : "outline"}>
                      {tier.growth > 0 ? '+' : ''}{tier.growth.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* 階層分布 */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">階層分布</h4>
              <div className="space-y-1 text-sm">
                {tierSummary.map((tier) => (
                  <div key={tier.tier} className="flex justify-between">
                    <span className="text-muted-foreground">{tier.tier}:</span>
                    <span className="font-medium">{tier.current.toLocaleString()}人</span>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span>合計:</span>
                    <span>{tierSummary.reduce((sum, tier) => sum + tier.current, 0).toLocaleString()}人</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 