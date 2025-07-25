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
  company?: string;  // 会社名を追加
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
    console.log('🔍 DormantCustomerList - フィルタリング開始:', {
      dormantDataLength: dormantData.length,
      selectedSegment,
      searchTerm,
      riskFilter,
      sampleCustomer: dormantData[0]
    })

    let result = dormantData.filter((customer) => {
      // 検索条件
      const customerName = customer.name || ''
      const customerId = customer.customerId || ''
      const customerCompany = customer.company || ''
      const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customerId.toString().includes(searchTerm) ||
                          customerCompany.toLowerCase().includes(searchTerm.toLowerCase())

      // セグメント条件 - APIの dormancySegment を優先使用
      const matchesSegment = !selectedSegment || (() => {
        const customerSegment = customer.dormancySegment
        if (customerSegment) {
          // セグメント名の完全一致を確認
          const segmentMatch = customerSegment === selectedSegment.label
          console.log('🔍 セグメントマッチング（API値使用）:', {
            customerId: customer.customerId,
            customerSegment,
            selectedLabel: selectedSegment.label,
            matches: segmentMatch
          })
          return segmentMatch
        }
        
        // フォールバック: daysSinceLastPurchase による範囲チェック
        const daysSince = customer.daysSinceLastPurchase || 0
        const rangeMatch = daysSince >= selectedSegment.range[0] &&
               (selectedSegment.range[1] === 9999 || daysSince <= selectedSegment.range[1])
        console.log('🔍 セグメントマッチング（範囲チェック）:', {
          customerId: customer.customerId,
          daysSince,
          range: selectedSegment.range,
          matches: rangeMatch
        })
        return rangeMatch
      })()

      // リスクレベル条件
      const riskLevel = customer.riskLevel || 'medium'
      const matchesRisk = riskFilter === "all" || riskLevel === riskFilter

      const finalMatch = matchesSearch && matchesSegment && matchesRisk
      
      if (selectedSegment && !finalMatch) {
        console.log('🔍 フィルタ除外:', {
          customerId: customer.customerId,
          matchesSearch,
          matchesSegment,
          matchesRisk,
          finalMatch
        })
      }

      return finalMatch
    })

    console.log('✅ DormantCustomerList - フィルタリング結果:', {
      originalCount: dormantData.length,
      filteredCount: result.length,
      hasSelectedSegment: !!selectedSegment,
      expectedCount: selectedSegment?.count || 0 // フィルター欄に表示されている人数
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
      '顧客ID', '顧客名', '会社名', 'メールアドレス', '最終購入日', '休眠期間（日）', '休眠セグメント', 
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
        customer.company || '',
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
              placeholder="顧客名・会社名・IDで検索..."
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

        {/* カードベースの顧客リスト */}
        <div className="space-y-4">
          {paginatedCustomers.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">
                {selectedSegment 
                  ? `選択されたセグメント「${selectedSegment.label}」に該当する顧客が見つかりません` 
                  : 'データがありません'}
              </div>
              {dormantData.length > 0 && (
                <div className="text-sm text-gray-400 mt-2">
                  全体データ: {dormantData.length}件
                </div>
              )}
            </div>
          )}
          
          {paginatedCustomers.map((customer) => {
            const customerId = customer.customerId?.toString() || ''
            const customerName = customer.name || ''
            const lastPurchaseDate = customer.lastPurchaseDate
            const daysSince = customer.daysSinceLastPurchase || 0
            const riskLevel = customer.riskLevel || 'medium'
            const churnProbability = customer.churnProbability || 0
            const totalSpent = customer.totalSpent || 0
            
            return (
              <Card key={customerId} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-lg">{customerName}</h3>
                      {customer.company && (
                        <Badge variant="outline" className="text-xs">
                          {customer.company}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-500">メールアドレス</div>
                        <div className="text-sm">{customer.email}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500">最終購入日</div>
                        <div className="text-sm">
                          {lastPurchaseDate ? (
                            typeof lastPurchaseDate === 'string' 
                              ? format(new Date(lastPurchaseDate), 'yyyy/MM/dd')
                              : format(lastPurchaseDate, 'yyyy/MM/dd')
                          ) : 'データなし'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500">休眠期間</div>
                        <div className="text-sm font-medium">{daysSince}日前</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500">総購入金額</div>
                        <div className="text-sm font-medium">¥{totalSpent.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">
                        {customer.dormancySegment || ''}
                      </Badge>
                      <Badge variant={getRiskBadge(riskLevel as RiskLevel).variant}>
                        {getRiskBadge(riskLevel as RiskLevel).label}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        離脱確率: {Math.round(churnProbability * 100)}%
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {customer.insight?.recommendedAction || 'アクション提案なし'}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm" title="メール送信">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="クーポン発行">
                      <Gift className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
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