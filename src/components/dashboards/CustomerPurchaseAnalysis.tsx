"use client"

import { useState, useMemo, useCallback } from "react"
import { useAppStore } from "../../stores/appStore"
import { useCustomerAnalysisFilters } from "../../stores/analysisFiltersStore"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  Users,
  AlertTriangle,
  Diamond,
  Search,
  Download,
  Mail,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Eye,
  MoreHorizontal,
  Crown,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  DollarSign,
  ShoppingCart,
  Target,
  UserCheck,
  Activity,
  Settings,
  Play,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { CustomerStatusBadge } from "../ui/customer-status-badge"
import { useCustomerTable } from "../../hooks/useCustomerTable"
import { customerDetailData as mockCustomerData, ProductInfo, CustomerDetail } from "../../data/mock/customerData"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import PeriodSelector, { type DateRangePeriod } from "@/components/common/PeriodSelector"

// KPIサマリーデータの型定義
interface KPISummary {
  totalCustomers: number
  vipCustomers: number
  avgLTV: number
  activeRate: number
  newCustomersThisMonth: number
  churnRate: number
}

// 顧客分析用のサンプルデータ
const customerSegmentData = [
  { name: "新規顧客", value: 35, color: "#3b82f6", count: 420 },
  { name: "リピーター", value: 45, color: "#10b981", count: 540 },
  { name: "VIP顧客", value: 15, color: "#f59e0b", count: 180 },
  { name: "休眠顧客", value: 5, color: "#ef4444", count: 60 },
]

// KPIサマリー計算
const calculateKPISummary = (): KPISummary => {
  const totalCustomers = customerSegmentData.reduce((sum, segment) => sum + segment.count, 0)
  const vipCustomers = customerSegmentData.find(s => s.name === "VIP顧客")?.count || 0
  const avgLTV = 85000 // 平均LTV（サンプル値）
  const activeCustomers = totalCustomers - (customerSegmentData.find(s => s.name === "休眠顧客")?.count || 0)
  const activeRate = (activeCustomers / totalCustomers) * 100
  const newCustomersThisMonth = customerSegmentData.find(s => s.name === "新規顧客")?.count || 0
  const churnRate = 2.5 // 離脱率（サンプル値）

  return {
    totalCustomers,
    vipCustomers,
    avgLTV,
    activeRate,
    newCustomersThisMonth,
    churnRate,
  }
}

// LTV範囲フィルターの選択肢
const ltvRanges = [
  { label: "全て", value: "all", min: 0, max: Infinity },
  { label: "～5万円", value: "0-50000", min: 0, max: 50000 },
  { label: "5万円～10万円", value: "50000-100000", min: 50000, max: 100000 },
  { label: "10万円～30万円", value: "100000-300000", min: 100000, max: 300000 },
  { label: "30万円～", value: "300000+", min: 300000, max: Infinity },
]

// 購入回数範囲フィルターの選択肢
const purchaseCountRanges = [
  { label: "全て", value: "all", min: 0, max: Infinity },
  { label: "1回", value: "1", min: 1, max: 1 },
  { label: "2-3回", value: "2-3", min: 2, max: 3 },
  { label: "4-6回", value: "4-6", min: 4, max: 6 },
  { label: "7回以上", value: "7+", min: 7, max: Infinity },
]

interface CustomerPurchaseAnalysisProps {
  shopDomain?: string
  accessToken?: string
  useSampleData?: boolean
}

export default function CustomerPurchaseAnalysis({
  shopDomain,
  accessToken,
  useSampleData = true,
}: CustomerPurchaseAnalysisProps) {
  // ✅ Zustand移行: AppStore & AnalysisFiltersStore使用（個別セレクター）
  const selectedCustomerId = useAppStore((state) => state.selectionState.selectedCustomerId)
  const selectCustomer = useAppStore((state) => state.selectCustomer)
  const setLoading = useAppStore((state) => state.setLoading)
  const showToast = useAppStore((state) => state.showToast)
  
  const { 
    filters, 
    setLtvFilter,
    setPurchaseCountFilter,
    setLastPurchaseDays,
    setPurchaseCountRange,
    setLastPurchaseDateRange,
    setPagination,
    setSort,
    resetFilters
  } = useCustomerAnalysisFilters()
  
  // ✅ 必要最小限のローカル状態のみ保持
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  // ✅ 期間フィルター管理（統一UI）
  const [dateRange, setDateRange] = useState<DateRangePeriod>(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    
    return {
      startYear: currentYear,
      startMonth: currentMonth,
      endYear: currentYear,
      endMonth: currentMonth
    }
  })
  
  // ✅ セグメントフィルター管理（簡易版）
  const [selectedCustomerSegment, setSelectedCustomerSegment] = useState<string>("全顧客")

  // ✅ プリセット期間の定義（購買分析用）
  const presetPeriods = [
    {
      label: "直近12ヶ月",
      icon: "📊",
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
      icon: "📈",
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
    },
    {
      label: "直近3ヶ月",
      icon: "📉",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let startYear = currentYear
        let startMonth = currentMonth - 2
        
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
    },
    {
      label: "先月",
      icon: "📅",
      getValue: () => {
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth() + 1
        
        let targetYear = currentYear
        let targetMonth = currentMonth - 1
        
        if (targetMonth <= 0) {
          targetYear = currentYear - 1
          targetMonth = 12
        }
        
        return {
          startYear: targetYear,
          startMonth: targetMonth,
          endYear: targetYear,
          endMonth: targetMonth
        }
      }
    }
  ]

  // ✅ フィルタリング済みデータ（Zustand移行）
  const filteredMockData = useMemo(() => {
    let filtered = mockCustomerData

    // LTVフィルター
    if (filters.ltvFilter !== "all") {
      const range = ltvRanges.find(r => r.value === filters.ltvFilter)
      if (range) {
        filtered = filtered.filter(customer => 
          customer.totalAmount >= range.min && customer.totalAmount < range.max
        )
      }
    }

    // 購入回数フィルター
    if (filters.purchaseCountFilter !== "all") {
      const range = purchaseCountRanges.find(r => r.value === filters.purchaseCountFilter)
      if (range) {
        filtered = filtered.filter(customer => 
          customer.purchaseCount >= range.min && customer.purchaseCount <= range.max
        )
      }
    }

    // 最終購入日フィルター
    if (filters.lastPurchaseDays !== "all") {
      const days = parseInt(filters.lastPurchaseDays)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      filtered = filtered.filter(customer => {
        const lastPurchase = new Date(customer.lastOrderDate)
        return lastPurchase >= cutoffDate
      })
    }

    // ✅ 購入回数範囲フィルター（Zustand）
    if (filters.purchaseCountMin !== "" || filters.purchaseCountMax !== "") {
      const minCount = filters.purchaseCountMin === "" ? 0 : parseInt(filters.purchaseCountMin)
      const maxCount = filters.purchaseCountMax === "" ? Infinity : parseInt(filters.purchaseCountMax)
      
      filtered = filtered.filter(customer => 
        customer.purchaseCount >= minCount && customer.purchaseCount <= maxCount
      )
    }

    // ✅ 最終購入日範囲フィルター（Zustand）
    if (filters.lastPurchaseStartDate !== "" || filters.lastPurchaseEndDate !== "") {
      const startDate = filters.lastPurchaseStartDate === "" ? new Date("1900-01-01") : new Date(filters.lastPurchaseStartDate)
      const endDate = filters.lastPurchaseEndDate === "" ? new Date() : new Date(filters.lastPurchaseEndDate)
      
      filtered = filtered.filter(customer => {
        const lastPurchase = new Date(customer.lastOrderDate)
        return lastPurchase >= startDate && lastPurchase <= endDate
      })
    }

    return filtered
  }, [filters])

  // ✅ useCustomerTableフックで統一管理（Zustand移行）
  const {
    searchQuery,
    filteredCustomers,
    paginatedCustomers,
    totalPages,
    currentPage,
    sortColumn,
    sortDirection,
    setSearchQuery,
    handleSort,
    handlePageChange,
  } = useCustomerTable({
    data: filteredMockData,
    itemsPerPage: filters.itemsPerPage,
    selectedSegment: "全顧客", // TODO: AppContext依存削除後に適切なセグメント値を設定
    initialSortColumn: (filters.sortColumn || 'purchaseCount') as keyof CustomerDetail,
    initialSortDirection: filters.sortDirection
  })

  // ✅ 期間更新ハンドラー
  const updateDateRange = useCallback((newDateRange: DateRangePeriod) => {
    setDateRange(newDateRange)
  }, [])

  // ✅ 期間の表示用フォーマット
  const formatDateRange = (range: DateRangePeriod): string => {
    if (range.startYear === range.endYear && range.startMonth === range.endMonth) {
      return `${range.startYear}年${range.startMonth}月`
    }
    return `${range.startYear}年${range.startMonth}月〜${range.endYear}年${range.endMonth}月`
  }

  const kpiSummary = calculateKPISummary()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("ja-JP").format(value)
  }

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDetailModalOpen(true)
  }

  const exportCustomerData = () => {
    const csvData = [
      ["顧客ID", "顧客名", "セグメント", "総購入金額", "購入回数", "平均単価", "よく買う商品", "商品カテゴリ", "リピート商品数", "最終購入日"],
      ...filteredCustomers.map(customer => [
        customer.id,
        customer.name,
        customer.status,
        customer.totalAmount,
        customer.purchaseCount,
        Math.round(customer.totalAmount / customer.purchaseCount),
        customer.topProducts.map(p => p.name).join(";"),
        customer.productCategories.join(";"),
        customer.repeatProducts,
        customer.lastOrderDate,
      ])
    ]
    
    const csvContent = csvData.map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `顧客分析データ_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 異常値検出
  const isAnomalous = (value: number, type: 'churn' | 'active' | 'vip') => {
    switch (type) {
      case 'churn':
        return value > 5.0 // 離脱率5%超で異常
      case 'active':
        return value < 85.0 // アクティブ率85%未満で異常
      case 'vip':
        return value < 10.0 // VIP率10%未満で異常
      default:
        return false
    }
  }

  const getTrendIcon = (value: number, type: 'growth' | 'decline') => {
    if (type === 'growth') {
      return value > 5 ? (
        <div className="text-green-600"><TrendingUp className="h-4 w-4" /></div>
      ) : value < -5 ? (
        <div className="text-red-600"><TrendingDown className="h-4 w-4" /></div>
      ) : (
        <div className="text-gray-500">➡️</div>
      )
    } else {
      return value < -5 ? (
        <div className="text-green-600"><TrendingDown className="h-4 w-4" /></div>
      ) : value > 5 ? (
        <div className="text-red-600"><TrendingUp className="h-4 w-4" /></div>
      ) : (
        <div className="text-gray-500">➡️</div>
      )
    }
  }

  // Phase 2: 商品表示用コンポーネント
  const ProductBadges = ({ products }: { products: ProductInfo[] }) => {
    const displayProducts = products.slice(0, 3) // 上位3商品のみ表示
    return (
      <div className="flex flex-wrap gap-1">
        {displayProducts.map((product, index) => (
          <Badge 
            key={index} 
            variant={product.isRepeat ? "default" : "outline"}
            className={`text-xs ${product.isRepeat ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
          >
            {product.name}
            {product.isRepeat && (
              <div className="ml-1 text-green-600">🔄</div>
            )}
          </Badge>
        ))}
        {products.length > 3 && (
          <Badge variant="outline" className="text-xs text-gray-400">
            +{products.length - 3}個
          </Badge>
        )}
      </div>
    )
  }

  const CategoryBadges = ({ categories }: { categories: string[] }) => {
    return (
      <div className="flex flex-wrap gap-1">
        {categories.map((category, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {category}
          </Badge>
        ))}
      </div>
    )
  }

  const [showConditions, setShowConditions] = useState(true)

  return (
    <div className="space-y-6">
      {/* 分析条件設定 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-2 pb-4">
          <CardTitle className="text-base font-medium">分析条件設定</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConditions(!showConditions)}
            className="h-8 px-2"
          >
            <Settings className="h-4 w-4 mr-1" />
            分析条件
            {showConditions ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
        </CardHeader>
        {showConditions && (
          <CardContent className="px-6 pt-2 pb-4">
            <div className="space-y-4">
              {/* 分析条件グリッド */}
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
                {/* 分析期間 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">分析期間</label>
                  <PeriodSelector
                    dateRange={dateRange}
                    onDateRangeChange={updateDateRange}
                    title=""
                    description=""
                    maxMonths={12}
                    minMonths={1}
                    presetPeriods={presetPeriods}
                  />
                </div>

                {/* 顧客セグメント */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">顧客セグメント</label>
                  <Select value={selectedCustomerSegment} onValueChange={setSelectedCustomerSegment}>
                    <SelectTrigger>
                      <SelectValue placeholder="セグメント選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="全顧客">全セグメント</SelectItem>
                      <SelectItem value="VIP">VIP顧客</SelectItem>
                      <SelectItem value="リピーター">リピーター</SelectItem>
                      <SelectItem value="新規">新規顧客</SelectItem>
                      <SelectItem value="休眠">休眠顧客</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* LTV範囲 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">LTV範囲</label>
                  <Select value={filters.ltvFilter} onValueChange={setLtvFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="LTV範囲" />
                    </SelectTrigger>
                    <SelectContent>
                      {ltvRanges.map(range => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* アクションボタンエリア */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  分析実行
                </Button>
                <Button variant="outline" onClick={exportCustomerData} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  CSV出力
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel出力
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  セグメント
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  更新
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* KPIサマリーダッシュボード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 総顧客数 */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総顧客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpiSummary.totalCustomers)}</div>
            <div className="flex items-center gap-1 mt-1">
              {getTrendIcon(8.5, 'growth')}
              <span className="text-xs text-green-600">+8.5%</span>
              <span className="text-xs text-muted-foreground">前月比</span>
            </div>
          </CardContent>
        </Card>

        {/* VIP顧客数 */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP顧客数</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatNumber(kpiSummary.vipCustomers)}</div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="text-xs border-amber-200 text-amber-700">
                {((kpiSummary.vipCustomers / kpiSummary.totalCustomers) * 100).toFixed(1)}%
              </Badge>
              {isAnomalous((kpiSummary.vipCustomers / kpiSummary.totalCustomers) * 100, 'vip') && (
                <div className="text-yellow-500 animate-pulse">⚠️</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 平均LTV */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均LTV</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiSummary.avgLTV)}</div>
            <div className="flex items-center gap-1 mt-1">
              {getTrendIcon(12.3, 'growth')}
              <span className="text-xs text-green-600">+12.3%</span>
              <span className="text-xs text-muted-foreground">前月比</span>
            </div>
          </CardContent>
        </Card>

        {/* アクティブ率 */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブ率</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiSummary.activeRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 mt-1">
              {getTrendIcon(-2.1, 'decline')}
              <span className="text-xs text-red-600">-2.1%</span>
              <span className="text-xs text-muted-foreground">前月比</span>
              {isAnomalous(kpiSummary.activeRate, 'active') && (
                <div className="text-yellow-500 animate-pulse">⚠️</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 新規顧客数 */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">新規顧客数</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpiSummary.newCustomersThisMonth)}</div>
            <div className="flex items-center gap-1 mt-1">
              {getTrendIcon(15.8, 'growth')}
              <span className="text-xs text-green-600">+15.8%</span>
              <span className="text-xs text-muted-foreground">前月比</span>
            </div>
          </CardContent>
        </Card>

        {/* 離脱率 */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">離脱率</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiSummary.churnRate}%</div>
            <div className="flex items-center gap-1 mt-1">
              {getTrendIcon(-0.5, 'decline')}
              <span className="text-xs text-green-600">-0.5%</span>
              <span className="text-xs text-muted-foreground">前月比</span>
              {isAnomalous(kpiSummary.churnRate, 'churn') && (
                <div className="text-yellow-500 animate-pulse">⚠️</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 顧客リスト */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">顧客一覧</CardTitle>
              <CardDescription>
                購買プロファイル順で表示 • クリックで詳細表示
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportCustomerData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                リストエクスポート
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      顧客名
                      {sortColumn === "name" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>セグメント</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none text-right"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      総購入金額
                      {sortColumn === "totalAmount" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none text-center"
                    onClick={() => handleSort("purchaseCount")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      購入回数
                      {sortColumn === "purchaseCount" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">平均単価</TableHead>
                  <TableHead className="text-left">よく買う商品</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort("lastOrderDate")}
                  >
                    <div className="flex items-center gap-1">
                      最終購入日
                      {sortColumn === "lastOrderDate" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCustomerClick(customer)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-semibold">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <CustomerStatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(customer.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-medium">
                        {customer.purchaseCount}回
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Math.round(customer.totalAmount / customer.purchaseCount))}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="space-y-1">
                        <ProductBadges products={customer.topProducts} />
                        {customer.repeatProducts > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <span>🔄</span>
                            <span>リピート: {customer.repeatProducts}商品</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(customer.lastOrderDate).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCustomerClick(customer)}>
                            <Eye className="h-4 w-4 mr-2" />
                            詳細表示
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            メール送信
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Target className="h-4 w-4 mr-2" />
                            キャンペーン追加
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                {(currentPage - 1) * 10 + 1} - {Math.min(currentPage * 10, filteredCustomers.length)} / {filteredCustomers.length}件
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <span className="text-sm px-3 py-1 bg-gray-100 rounded">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 顧客詳細モーダル */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  {selectedCustomer.name} さんの詳細プロファイル
                </DialogTitle>
                <DialogDescription>
                  顧客ID: {selectedCustomer.id} • セグメント: {selectedCustomer.segment}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">概要</TabsTrigger>
                  <TabsTrigger value="purchases">購入履歴</TabsTrigger>
                  <TabsTrigger value="products">よく買う商品</TabsTrigger>
                  <TabsTrigger value="insights">インサイト</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">基本情報</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">メール:</span>
                          <span className="text-sm font-medium">{selectedCustomer.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">登録日:</span>
                          <span className="text-sm font-medium">
                            {new Date(selectedCustomer.registrationDate).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">最終ログイン:</span>
                          <span className="text-sm font-medium">
                            {new Date(selectedCustomer.lastLoginDate).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">購買サマリー</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">総購入金額:</span>
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(selectedCustomer.totalPurchaseAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">購入回数:</span>
                          <span className="text-sm font-medium">{selectedCustomer.purchaseCount}回</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">平均単価:</span>
                          <span className="text-sm font-medium">
                            {formatCurrency(Math.round(selectedCustomer.totalPurchaseAmount / selectedCustomer.purchaseCount))}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">RFMスコア</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Recency:</span>
                          <Badge variant="outline">{selectedCustomer.rfmScore?.recency || 3}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Frequency:</span>
                          <Badge variant="outline">{selectedCustomer.rfmScore?.frequency || 4}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Monetary:</span>
                          <Badge variant="outline">{selectedCustomer.rfmScore?.monetary || 5}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="purchases" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">最近の購入履歴</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedCustomer.recentPurchases?.slice(0, 5).map((purchase: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{purchase.productName}</div>
                              <div className="text-sm text-gray-600">{purchase.date}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{formatCurrency(purchase.amount)}</div>
                              <div className="text-sm text-gray-600">数量: {purchase.quantity}</div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center text-gray-500 py-4">
                            購入履歴データを読み込み中...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          よく購入する商品
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedCustomer.topProducts?.map((product: ProductInfo, index: number) => (
                            <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{product.name}</div>
                                  {product.isRepeat && (
                                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                      🔄 リピート
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">カテゴリ: {product.category}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{product.count}回購入</div>
                                <div className="text-sm text-gray-600">
                                  購入割合: {product.percentage}%
                                </div>
                              </div>
                            </div>
                          )) || (
                            <div className="text-center text-gray-500 py-4">
                              商品データを読み込み中...
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          商品分析サマリー
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* カテゴリ分析 */}
                          <div>
                            <div className="text-sm font-medium mb-2">購入カテゴリ</div>
                            <CategoryBadges categories={selectedCustomer.productCategories || []} />
                          </div>

                          {/* リピート分析 */}
                          <div>
                            <div className="text-sm font-medium mb-2">リピート購入分析</div>
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="text-green-600">🔄</div>
                                <span className="text-sm font-medium">リピート商品数</span>
                              </div>
                              <div className="text-lg font-bold text-green-600">
                                {selectedCustomer.repeatProducts || 0}商品
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              リピート率: {selectedCustomer.topProducts ? 
                                Math.round((selectedCustomer.repeatProducts / selectedCustomer.topProducts.length) * 100) : 0}%
                            </div>
                          </div>

                          {/* 商品多様性 */}
                          <div>
                            <div className="text-sm font-medium mb-2">商品多様性</div>
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="text-blue-600">📊</div>
                                <span className="text-sm font-medium">購入商品数</span>
                              </div>
                              <div className="text-lg font-bold text-blue-600">
                                {selectedCustomer.topProducts?.length || 0}商品
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              カテゴリ数: {selectedCustomer.productCategories?.length || 0}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">推奨アクション</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-800">クロスセル機会</span>
                            </div>
                            <p className="text-sm text-blue-700">
                              過去の購入パターンから、関連商品のレコメンドが効果的です
                            </p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">リテンション施策</span>
                            </div>
                            <p className="text-sm text-green-700">
                              VIP顧客として、特別オファーメールの配信をお勧めします
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">予測分析</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">次回購入予測:</span>
                            <span className="text-sm font-medium">7-14日後</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">推定CLV:</span>
                            <span className="text-sm font-medium">
                              {formatCurrency(selectedCustomer.predictedCLV || 150000)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">チャーンリスク:</span>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              低 (15%)
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 