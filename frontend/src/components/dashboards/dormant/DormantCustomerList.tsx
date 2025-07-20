"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Mail, 
  Download, 
  Gift,
  Search,
  ChevronDown,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Filter,
  SlidersHorizontal,
  X,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Eye,
  EyeOff
} from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { 
  dormantCustomerDetails, 
  reactivationActions,
  type DormantCustomerDetail, 
  type DormantSegment,
  type RiskLevel,
  type DormancyReason 
} from "@/data/mock/customerData"

interface DormantCustomerListProps {
  selectedSegment?: DormantSegment | null;
}

export function DormantCustomerList({ selectedSegment }: DormantCustomerListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all")
  const [reasonFilter, setReasonFilter] = useState<DormancyReason | "all">("all")
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [visibleColumns, setVisibleColumns] = useState({
    customerInfo: true,
    dormancyStatus: true,
    risk: true,
    reactivation: true,
    actions: true
  })

  // フィルタリングされた顧客データ
  const filteredCustomers = useMemo(() => {
    let result = dormantCustomerDetails.filter((customer) => {
      // 検索条件
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.id.includes(searchTerm)

      // セグメント条件
      const matchesSegment = !selectedSegment || (
        customer.dormancy.daysSincePurchase >= selectedSegment.range[0] &&
        (selectedSegment.range[1] === 9999 || customer.dormancy.daysSincePurchase <= selectedSegment.range[1])
      )

      // リスクレベル条件
      const matchesRisk = riskFilter === "all" || customer.dormancy.riskLevel === riskFilter

      // 休眠理由条件
      const matchesReason = reasonFilter === "all" || customer.dormancy.estimatedReason === reasonFilter

      return matchesSearch && matchesSegment && matchesRisk && matchesReason
    })

    // ソート処理
    if (sortConfig) {
      result.sort((a, b) => {
        if (sortConfig.key === 'name') {
          return sortConfig.direction === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        }
        if (sortConfig.key === 'daysSincePurchase') {
          return sortConfig.direction === 'asc'
            ? a.dormancy.daysSincePurchase - b.dormancy.daysSincePurchase
            : b.dormancy.daysSincePurchase - a.dormancy.daysSincePurchase
        }
        if (sortConfig.key === 'ltv') {
          return sortConfig.direction === 'asc'
            ? a.analytics.ltv - b.analytics.ltv
            : b.analytics.ltv - a.analytics.ltv
        }
        return 0
      })
    }

    return result
  }, [dormantCustomerDetails, searchTerm, selectedSegment, riskFilter, reasonFilter, sortConfig])

  // ページネーション
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return null
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
  }

  const getRiskBadge = (riskLevel: RiskLevel) => {
    const configs = {
      low: { variant: "secondary" as const, label: "低", className: "bg-green-50 text-green-700" },
      medium: { variant: "secondary" as const, label: "中", className: "bg-yellow-50 text-yellow-700" },
      high: { variant: "secondary" as const, label: "高", className: "bg-orange-50 text-orange-700" },
      critical: { variant: "destructive" as const, label: "緊急", className: "bg-red-50 text-red-700" }
    }
    return configs[riskLevel] || configs.low
  }

  const getReasonLabel = (reason: DormancyReason) => {
    const labels = {
      price_sensitivity: "価格感度",
      product_dissatisfaction: "商品不満",
      competitor_switch: "競合流出",
      natural_churn: "自然離脱",
      seasonal: "季節要因",
      unknown: "不明"
    }
    return labels[reason] || "不明"
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString('ja-JP')}`
  }

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id))
    }
  }

  const exportToCSV = () => {
    const headers = [
      '顧客ID', '顧客名', '最終購入日', '休眠期間（日）', 'リスクレベル',
      '休眠理由', 'LTV', '復帰可能性', '推定復帰売上', '推奨アクション'
    ]
    
    const csvData = filteredCustomers.map(customer => [
      customer.id,
      customer.name,
      format(customer.dormancy.lastPurchaseDate, 'yyyy-MM-dd'),
      customer.dormancy.daysSincePurchase,
      getRiskBadge(customer.dormancy.riskLevel).label,
      getReasonLabel(customer.dormancy.estimatedReason),
      customer.analytics.ltv,
      `${customer.reactivation.probability}%`,
      customer.reactivation.estimatedValue,
      customer.reactivation.recommendedActions.map(a => a.name).join('; ')
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `dormant_customers_${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">休眠顧客一覧</span>
            <Badge variant="outline" className="ml-2">
              {filteredCustomers.length}名
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  表示設定
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setVisibleColumns(prev => ({ ...prev, customerInfo: !prev.customerInfo }))}>
                  {visibleColumns.customerInfo ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  顧客情報
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibleColumns(prev => ({ ...prev, dormancyStatus: !prev.dormancyStatus }))}>
                  {visibleColumns.dormancyStatus ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  休眠状況
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibleColumns(prev => ({ ...prev, risk: !prev.risk }))}>
                  {visibleColumns.risk ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  リスク
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibleColumns(prev => ({ ...prev, reactivation: !prev.reactivation }))}>
                  {visibleColumns.reactivation ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  復帰予測
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCustomers.length === 0}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              メール作成
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCustomers.length === 0}
              className="flex items-center gap-2"
            >
              <Gift className="h-4 w-4" />
              クーポン発行
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* フィルター */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <div className="flex items-center justify-between mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                フィルター
                {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              {(searchTerm || riskFilter !== "all" || reasonFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setRiskFilter("all")
                    setReasonFilter("all")
                  }}
                  className="flex items-center gap-2 text-slate-600"
                >
                  <X className="h-4 w-4" />
                  フィルターをクリア
                </Button>
              )}
            </div>
          </div>
          <CollapsibleContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="顧客名・IDで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as RiskLevel | "all")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="リスクレベル" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全てのリスク</SelectItem>
                  <SelectItem value="low">低リスク</SelectItem>
                  <SelectItem value="medium">中リスク</SelectItem>
                  <SelectItem value="high">高リスク</SelectItem>
                  <SelectItem value="critical">緊急</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reasonFilter} onValueChange={(value) => setReasonFilter(value as DormancyReason | "all")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="休眠理由" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ての理由</SelectItem>
                  <SelectItem value="price_sensitivity">価格感度</SelectItem>
                  <SelectItem value="product_dissatisfaction">商品不満</SelectItem>
                  <SelectItem value="competitor_switch">競合流出</SelectItem>
                  <SelectItem value="natural_churn">自然離脱</SelectItem>
                  <SelectItem value="seasonal">季節要因</SelectItem>
                  <SelectItem value="unknown">不明</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* アクティブなフィルター表示 */}
        {(searchTerm || riskFilter !== "all" || reasonFilter !== "all") && (
          <div className="flex flex-wrap gap-2 mb-4">
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center gap-1">
                検索: {searchTerm}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Badge>
            )}
            {riskFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                リスク: {getRiskBadge(riskFilter).label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setRiskFilter("all")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Badge>
            )}
            {reasonFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                理由: {getReasonLabel(reasonFilter)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setReasonFilter("all")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Badge>
            )}
          </div>
        )}

        {/* テーブル */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                    aria-label="全ての顧客を選択"
                  />
                </TableHead>
                {visibleColumns.customerInfo && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleSort('name')}
                    >
                      顧客情報
                      {getSortIcon('name')}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.dormancyStatus && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleSort('daysSincePurchase')}
                    >
                      休眠状況
                      {getSortIcon('daysSincePurchase')}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.risk && <TableHead>リスク</TableHead>}
                {visibleColumns.reactivation && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleSort('ltv')}
                    >
                      復帰予測
                      {getSortIcon('ltv')}
                    </Button>
                  </TableHead>
                )}
                {visibleColumns.actions && <TableHead>アクション</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => handleCustomerSelect(customer.id)}
                      className="rounded"
                      aria-label={`${customer.name}を選択`}
                    />
                  </TableCell>
                  {visibleColumns.customerInfo && (
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-slate-500">{customer.id}</div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.dormancyStatus && (
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {format(customer.dormancy.lastPurchaseDate, 'yyyy/MM/dd', { locale: ja })}
                        </div>
                        <div className="text-sm text-slate-500">
                          {customer.dormancy.daysSincePurchase}日
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.risk && (
                    <TableCell>
                      <Badge
                        variant={getRiskBadge(customer.dormancy.riskLevel).variant}
                        className={getRiskBadge(customer.dormancy.riskLevel).className}
                      >
                        {getRiskBadge(customer.dormancy.riskLevel).label}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.reactivation && (
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">
                          {formatCurrency(customer.reactivation.estimatedValue)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {customer.reactivation.probability}%
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.actions && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Gift className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500">
              {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} / {filteredCustomers.length}件
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                次へ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 