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
  Mail, 
  Download, 
  Gift,
  Search,
  ChevronDown,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RotateCcw
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

  // フィルタリングされた顧客データ
  const filteredCustomers = useMemo(() => {
    return dormantCustomerDetails.filter((customer) => {
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
  }, [dormantCustomerDetails, searchTerm, selectedSegment, riskFilter, reasonFilter])

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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
                <TableHead>顧客情報</TableHead>
                <TableHead>休眠状況</TableHead>
                <TableHead>リスク</TableHead>
                <TableHead>復帰予測</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const riskConfig = getRiskBadge(customer.dormancy.riskLevel)
                const isSelected = selectedCustomers.includes(customer.id)

                return (
                  <TableRow key={customer.id} className={isSelected ? "bg-blue-50" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCustomerSelect(customer.id)}
                        className="rounded"
                        aria-label={`${customer.name}を選択`}
                      />
                    </TableCell>

                    {/* 顧客情報 */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">{customer.name}</div>
                        <div className="text-xs text-slate-500">ID: {customer.id}</div>
                        <div className="text-xs text-slate-600">
                          LTV: {formatCurrency(customer.analytics.ltv)}
                        </div>
                      </div>
                    </TableCell>

                    {/* 休眠状況 */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {format(customer.dormancy.lastPurchaseDate, 'MM/dd', { locale: ja })}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-slate-900">
                          {customer.dormancy.daysSincePurchase}日前
                        </div>
                        <div className="text-xs text-slate-500">
                          {getReasonLabel(customer.dormancy.estimatedReason)}
                        </div>
                      </div>
                    </TableCell>

                    {/* リスク */}
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant={riskConfig.variant} className={riskConfig.className}>
                          {riskConfig.label}リスク
                        </Badge>
                        <div className="text-xs text-slate-500">
                          購入減少: {customer.analytics.purchaseDecline}%
                        </div>
                      </div>
                    </TableCell>

                    {/* 復帰予測 */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-sm font-medium text-green-600">
                            {customer.reactivation.probability}%
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          推定売上: {formatCurrency(customer.reactivation.estimatedValue)}
                        </div>
                        <div className="text-xs text-slate-400">
                          最適タイミング: {format(customer.reactivation.optimalTiming, 'MM/dd', { locale: ja })}
                        </div>
                      </div>
                    </TableCell>

                    {/* アクション */}
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <RotateCcw className="h-3 w-3" />
                            詳細
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <RotateCcw className="h-5 w-5" />
                              {customer.name}の復帰施策
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* 顧客分析サマリー */}
                            <div className="grid grid-cols-2 gap-4">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">休眠分析</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>休眠期間:</span>
                                    <span className="font-medium">{customer.dormancy.daysSincePurchase}日</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>休眠理由:</span>
                                    <span className="font-medium">{getReasonLabel(customer.dormancy.estimatedReason)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>購入減少率:</span>
                                    <span className="font-medium text-red-600">{customer.analytics.purchaseDecline}%</span>
                                  </div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">復帰予測</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>復帰可能性:</span>
                                    <span className="font-medium text-green-600">{customer.reactivation.probability}%</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>推定売上:</span>
                                    <span className="font-medium">{formatCurrency(customer.reactivation.estimatedValue)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>最適タイミング:</span>
                                    <span className="font-medium">{format(customer.reactivation.optimalTiming, 'MM/dd', { locale: ja })}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* 推奨アクション */}
                            <div>
                              <h4 className="text-sm font-semibold mb-3">推奨アクション</h4>
                              <div className="space-y-3">
                                {customer.reactivation.recommendedActions.map((action, index) => (
                                  <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          優先度 {action.priority}
                                        </Badge>
                                        <span className="font-medium">{action.name}</span>
                                      </div>
                                      <p className="text-sm text-slate-600 mt-1">{action.description}</p>
                                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                        <span>コスト: {formatCurrency(action.estimatedCost)}</span>
                                        <span>期待効果: {formatCurrency(action.expectedReturn)}</span>
                                        <span className="text-green-600">
                                          ROI: {((action.expectedReturn - action.estimatedCost) / action.estimatedCost * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                    <Button size="sm" className="ml-4">
                                      実行
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>条件に一致する休眠顧客が見つかりませんでした</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 