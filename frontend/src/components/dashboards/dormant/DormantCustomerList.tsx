"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Filter
} from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

import { 
  type DormantSegment,
  type RiskLevel,
  type DormancyReason 
} from "@/types/models/customer"

// API データの型定義（簡易版）
interface ApiDormantCustomer {
  customerId?: string | number;
  name?: string;
  email?: string;
  lastPurchaseDate?: string | Date;
  daysSinceLastPurchase?: number;
  dormancySegment?: string;
  riskLevel?: string;
  churnProbability?: number;
  totalSpent?: number;
  totalOrders?: number;
  averageOrderValue?: number;
  insight?: {
    recommendedAction?: string;
    optimalTiming?: string;
    estimatedSuccessRate?: number;
    suggestedOffer?: string;
  };
}

interface DormantCustomerListProps {
  selectedSegment?: DormantSegment | null;
  dormantData?: ApiDormantCustomer[];
}

export function DormantCustomerList({ selectedSegment, dormantData = [] }: DormantCustomerListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // リスクレベルのバッジ取得
  const getRiskBadge = (level: RiskLevel) => {
    const riskConfig = {
      low: { label: "低", color: "bg-green-100 text-green-800", variant: "secondary" as const },
      medium: { label: "中", color: "bg-yellow-100 text-yellow-800", variant: "secondary" as const },
      high: { label: "高", color: "bg-orange-100 text-orange-800", variant: "destructive" as const },
      critical: { label: "危険", color: "bg-red-100 text-red-800", variant: "destructive" as const }
    }
    return riskConfig[level] || riskConfig.medium
  }

  // フィルタリングされた顧客データ
  const filteredCustomers = useMemo(() => {
    let result = dormantData.filter((customer) => {
      // 検索条件
      const customerName = customer.name || ''
      const customerId = customer.customerId || ''
      const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customerId.toString().includes(searchTerm)

      // セグメント条件 - APIの dormancySegment を優先使用
      const matchesSegment = !selectedSegment || (() => {
        const customerSegment = customer.dormancySegment
        if (customerSegment) {
          return customerSegment === selectedSegment.label
        }
        
        // フォールバック: daysSinceLastPurchase による範囲チェック
        const daysSince = customer.daysSinceLastPurchase || 0
        return daysSince >= selectedSegment.range[0] &&
               (selectedSegment.range[1] === 9999 || daysSince <= selectedSegment.range[1])
      })()

      // リスクレベル条件
      const riskLevel = customer.riskLevel || 'medium'
      const matchesRisk = riskFilter === "all" || riskLevel === riskFilter

      return matchesSearch && matchesSegment && matchesRisk
    })

    return result
  }, [dormantData, searchTerm, selectedSegment, riskFilter])

  // ページネーション
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // CSV エクスポート
  const exportToCSV = () => {
    const headers = [
      '顧客ID', '顧客名', 'メールアドレス', '最終購入日', '休眠期間（日）', '休眠セグメント', 
      'リスクレベル', '離脱確率', '総購入金額', '購入回数', '平均注文金額', '推奨アクション'
    ]
    
    const csvData = filteredCustomers.map(customer => {
      const customerId = customer.customerId?.toString() || ''
      const customerName = customer.name || ''
      const lastPurchaseDate = customer.lastPurchaseDate
      const daysSince = customer.daysSinceLastPurchase || 0
      const riskLevel = customer.riskLevel || 'medium'
      const churnProbability = customer.churnProbability || 0
      const totalSpent = customer.totalSpent || 0
      
      return [
        customerId,
        customerName,
        customer.email || '',
        lastPurchaseDate ? (typeof lastPurchaseDate === 'string' 
          ? format(new Date(lastPurchaseDate), 'yyyy-MM-dd')
          : format(lastPurchaseDate, 'yyyy-MM-dd')) : '',
        daysSince,
        customer.dormancySegment || '',
        getRiskBadge(riskLevel as RiskLevel).label,
        `${Math.round(churnProbability * 100)}%`,
        totalSpent,
        customer.totalOrders || 0,
        customer.averageOrderValue || 0,
        customer.insight?.recommendedAction || ''
      ]
    })

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
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* フィルター */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="顧客名・IDで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as RiskLevel | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="リスクレベル" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのリスクレベル</SelectItem>
              <SelectItem value="low">低リスク</SelectItem>
              <SelectItem value="medium">中リスク</SelectItem>
              <SelectItem value="high">高リスク</SelectItem>
              <SelectItem value="critical">危険</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* テーブル */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>顧客情報</TableHead>
                <TableHead>休眠状況</TableHead>
                <TableHead>リスク</TableHead>
                <TableHead>購入実績</TableHead>
                <TableHead>推奨アクション</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer) => {
                const customerId = customer.customerId?.toString() || ''
                const customerName = customer.name || ''
                const lastPurchaseDate = customer.lastPurchaseDate
                const daysSince = customer.daysSinceLastPurchase || 0
                const riskLevel = customer.riskLevel || 'medium'
                const churnProbability = customer.churnProbability || 0
                const totalSpent = customer.totalSpent || 0
                
                return (
                  <TableRow key={customerId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customerName}</div>
                        <div className="text-sm text-gray-500">ID: {customerId}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{daysSince}日前</div>
                        <div className="text-sm text-gray-500">
                          {lastPurchaseDate ? (
                            typeof lastPurchaseDate === 'string' 
                              ? format(new Date(lastPurchaseDate), 'yyyy/MM/dd')
                              : format(lastPurchaseDate, 'yyyy/MM/dd')
                          ) : 'データなし'}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {customer.dormancySegment || ''}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge variant={getRiskBadge(riskLevel as RiskLevel).variant}>
                          {getRiskBadge(riskLevel as RiskLevel).label}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1">
                          離脱確率: {Math.round(churnProbability * 100)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">¥{totalSpent.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">
                          {customer.totalOrders || 0}回購入
                        </div>
                        <div className="text-sm text-gray-500">
                          平均: ¥{Math.round(customer.averageOrderValue || 0).toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.insight?.recommendedAction || 'アクション提案なし'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {customer.insight?.optimalTiming || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="メール送信">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="クーポン発行">
                          <Gift className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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