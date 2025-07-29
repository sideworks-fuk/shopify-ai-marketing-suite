"use client"

import { useState, useMemo, useEffect } from "react"
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
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Info
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
  const [purchaseCountFilter, setPurchaseCountFilter] = useState(1) // デフォルト: 1回以上
  const [purchaseHistoryFilter, setPurchaseHistoryFilter] = useState<"all" | "with-purchase" | "no-purchase">("with-purchase") // 新規追加
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<string>("daysSinceLastPurchase")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isLoading, setIsLoading] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(30) // パフォーマンス改善: 初期表示数を30に設定

  // 購入履歴なし顧客を判定するヘルパー関数
  const hasNoPurchaseHistory = (customer: ApiDormantCustomer): boolean => {
    return (customer.totalOrders === 0 || 
            customer.lastPurchaseDate === '0001-01-01T00:00:00' ||
            customer.lastPurchaseDate === '0001/01/01' ||
            !customer.lastPurchaseDate ||
            customer.totalSpent === 0)
  }

  // 購入履歴なし顧客の表示用データ処理
  const processCustomerDisplayData = (customer: ApiDormantCustomer) => {
    const isNoPurchase = hasNoPurchaseHistory(customer)
    
    return {
      ...customer,
      hasNoPurchaseHistory: isNoPurchase,
      displayLastPurchaseDate: isNoPurchase ? '購入履歴なし' : customer.lastPurchaseDate,
      displayDormancyDays: isNoPurchase ? '-' : customer.daysSinceLastPurchase,
      displayRiskLevel: isNoPurchase ? 'unrated' : customer.riskLevel,
      displayTotalSpent: isNoPurchase ? 0 : customer.totalSpent
    }
  }

  // リスクレベルのバッジ取得
  const getRiskBadge = (level: RiskLevel | 'unrated') => {
    const riskConfig = {
      low: { label: "低", color: "bg-green-100 text-green-800", variant: "secondary" as const },
      medium: { label: "中", color: "bg-yellow-100 text-yellow-800", variant: "secondary" as const },
      high: { label: "高", color: "bg-orange-100 text-orange-800", variant: "destructive" as const },
      critical: { label: "危険", color: "bg-red-100 text-red-800", variant: "destructive" as const },
      unrated: { label: "未評価", color: "bg-gray-100 text-gray-600", variant: "secondary" as const }
    }
    return riskConfig[level] || riskConfig.medium
  }

  // ソート処理
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // ソートアイコンを取得
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : 
      <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
  }

  // フィルタリングとソートされた顧客データ
  const filteredAndSortedCustomers = useMemo(() => {
    console.log('🔍 DormantCustomerList - フィルタリング開始:', {
      dormantDataLength: dormantData.length,
      selectedSegment,
      searchTerm,
      riskFilter,
      purchaseCountFilter,
      sampleCustomer: dormantData[0]
    })

    let result = dormantData.filter((customer) => {
      const processedCustomer = processCustomerDisplayData(customer)
      
      // 検索条件
      const customerName = customer.name || ''
      const customerId = customer.customerId || ''
      const customerCompany = customer.company || ''
      const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customerId.toString().includes(searchTerm) ||
                          customerCompany.toLowerCase().includes(searchTerm.toLowerCase())

      // 購入履歴フィルタ条件（新規追加）
      const matchesPurchaseHistory = (() => {
        switch (purchaseHistoryFilter) {
          case 'with-purchase':
            return !processedCustomer.hasNoPurchaseHistory
          case 'no-purchase':
            return processedCustomer.hasNoPurchaseHistory
          case 'all':
          default:
            return true
        }
      })()

      // セグメント条件 - APIの dormancySegment を優先使用
      const matchesSegment = !selectedSegment || (() => {
        const customerSegment = customer.dormancySegment
        if (customerSegment) {
          const segmentMatch = customerSegment === selectedSegment.label
          return segmentMatch
        }
        
        const daysSince = customer.daysSinceLastPurchase || 0
        const rangeMatch = daysSince >= selectedSegment.range[0] &&
               (selectedSegment.range[1] === 9999 || daysSince <= selectedSegment.range[1])
        return rangeMatch
      })()

      // リスクレベル条件
      const riskLevel = processedCustomer.displayRiskLevel || 'medium'
      const matchesRisk = riskFilter === "all" || riskLevel === riskFilter

      // 購入回数条件（購入履歴フィルタが適用されている場合は調整）
      const totalOrders = customer.totalOrders || 0
      const matchesPurchaseCount = purchaseHistoryFilter === 'no-purchase' ? true : totalOrders >= purchaseCountFilter

      return matchesSearch && matchesPurchaseHistory && matchesSegment && matchesRisk && matchesPurchaseCount
    })

    // ソート処理
    result.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "name":
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
          break
        case "lastPurchaseDate":
          aValue = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0
          bValue = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0
          break
        case "daysSinceLastPurchase":
          aValue = a.daysSinceLastPurchase || 0
          bValue = b.daysSinceLastPurchase || 0
          break
        case "totalSpent":
          aValue = a.totalSpent || 0
          bValue = b.totalSpent || 0
          break
        case "totalOrders":
          aValue = a.totalOrders || 0
          bValue = b.totalOrders || 0
          break
        case "churnProbability":
          aValue = a.churnProbability || 0
          bValue = b.churnProbability || 0
          break
        default:
          aValue = 0
          bValue = 0
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    console.log('✅ DormantCustomerList - フィルタリング&ソート結果:', {
      originalCount: dormantData.length,
      filteredCount: result.length,
      sortField,
      sortDirection
    })

    return result
  }, [dormantData, searchTerm, selectedSegment, riskFilter, purchaseCountFilter, purchaseHistoryFilter, sortField, sortDirection])

  // フィルタ変更時にページを1に戻す
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, riskFilter, purchaseCountFilter, purchaseHistoryFilter, selectedSegment])

  // ページネーション
  const totalPages = Math.ceil(filteredAndSortedCustomers.length / itemsPerPage)
  const paginatedCustomers = filteredAndSortedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // ページ変更時の処理
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 300) // 短いローディング表示
  }

  // ページサイズ変更時の処理
  const handlePageSizeChange = (newPageSize: number) => {
    setItemsPerPage(newPageSize)
    setCurrentPage(1) // 最初のページに戻る
  }

  // CSV エクスポート（フィルタ適用後のデータのみ）
  const exportToCSV = () => {
    const headers = [
      '顧客ID', '顧客名', '会社名', 'メールアドレス', '最終購入日', '休眠期間（日）', '休眠セグメント', 
      'リスクレベル', '復帰確率', '総購入金額', '購入回数', '平均注文金額', '推奨アクション'
    ]
    
    const csvData = filteredAndSortedCustomers.map(customer => {
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
        `${Math.round((1 - churnProbability) * 100)}%`, // 復帰確率に変更
        totalSpent.toLocaleString(),
        customer.totalOrders || 0,
        (customer.averageOrderValue || 0).toLocaleString(),
        customer.insight?.recommendedAction || ''
      ]
    })

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `dormant_customers_filtered_${format(new Date(), 'yyyyMMdd')}.csv`
    link.click()
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">休眠顧客一覧</span>
            <Badge variant="outline" className="ml-2">
              {filteredAndSortedCustomers.length.toLocaleString()}名
            </Badge>
            {purchaseHistoryFilter !== "with-purchase" && (
              <Badge variant="secondary" className="text-xs">
                {purchaseHistoryFilter === "no-purchase" ? "購入履歴なし" : "すべて表示"}
              </Badge>
            )}
            {purchaseCountFilter > 0 && purchaseHistoryFilter !== "no-purchase" && (
              <Badge variant="secondary" className="text-xs">
                購入{purchaseCountFilter}回以上
              </Badge>
            )}
            {riskFilter !== "all" && (
              <Badge variant="outline" className="text-xs">
                {riskFilter === "critical" ? "高リスク" : 
                 riskFilter === "high" ? "中高リスク" :
                 riskFilter === "medium" ? "中リスク" : 
                 riskFilter === "low" ? "低リスク" : "未評価"}のみ
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="outline" className="text-xs">
                「{searchTerm}」で検索
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
              disabled={filteredAndSortedCustomers.length === 0}
            >
              <Download className="h-4 w-4" />
              CSV出力
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* フィルター */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">フィルター条件</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="顧客名・会社名・IDで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={purchaseHistoryFilter} onValueChange={(value) => setPurchaseHistoryFilter(value as "all" | "with-purchase" | "no-purchase")}>
            <SelectTrigger>
              <SelectValue placeholder="購入履歴" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="with-purchase">購入履歴あり</SelectItem>
              <SelectItem value="no-purchase">購入履歴なし</SelectItem>
              <SelectItem value="all">すべて表示</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as RiskLevel | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="リスクレベル" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              <SelectItem value="critical">高（危険）</SelectItem>
              <SelectItem value="high">中高（高リスク）</SelectItem>
              <SelectItem value="medium">中（中リスク）</SelectItem>
              <SelectItem value="low">低（低リスク）</SelectItem>
              <SelectItem value="unrated">未評価</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={purchaseCountFilter.toString()} 
            onValueChange={(value) => setPurchaseCountFilter(parseInt(value))}
            disabled={purchaseHistoryFilter === 'no-purchase'}
          >
            <SelectTrigger>
              <SelectValue placeholder="購入回数" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">全て</SelectItem>
              <SelectItem value="1">1回以上</SelectItem>
              <SelectItem value="2">2回以上</SelectItem>
              <SelectItem value="3">3回以上</SelectItem>
              <SelectItem value="5">5回以上</SelectItem>
              <SelectItem value="10">10回以上</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setRiskFilter("all")
                setPurchaseCountFilter(1)
                setPurchaseHistoryFilter("with-purchase")
                setCurrentPage(1)
              }}
            >
              フィルタクリア
            </Button>
          </div>
        </div>

        {/* データ読み込み中表示 - スケルトンローダー */}
        {isLoading && (
          <div className="space-y-4">
            {/* テーブルヘッダースケルトン */}
            <div className="rounded-md border">
              <div className="border-b px-4 py-3">
                <div className="flex space-x-4">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="h-4 bg-gray-200 rounded animate-pulse" style={{width: index === 0 ? '120px' : index === 5 ? '100px' : '80px'}}></div>
                  ))}
                </div>
              </div>
              {/* テーブル行スケルトン */}
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="border-b px-4 py-3 animate-pulse">
                  <div className="flex space-x-4 items-center">
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    <div className="h-6 w-12 bg-gray-200 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">データを取得中...</p>
            </div>
          </div>
        )}

        {/* テーブル形式の顧客リスト */}
        {!isLoading && (
          <>            
            {paginatedCustomers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {filteredAndSortedCustomers.length === 0
                    ? (dormantData.length === 0 
                        ? (
                            <div>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                              <p>データを取得中...</p>
                            </div>
                          )
                        : (
                            <div>
                              <div className="text-4xl mb-4">🔍</div>
                              <p className="text-lg mb-2">該当する顧客が見つかりません</p>
                              <p className="text-sm">フィルタ条件を変更して再度お試しください</p>
                            </div>
                          ))
                    : 'データがありません'}
                </div>
                {dormantData.length > 0 && filteredAndSortedCustomers.length === 0 && (
                  <div className="text-sm text-gray-400 mt-4 p-3 bg-gray-50 rounded-lg">
                    <p>💡 ヒント: フィルタ条件を緩和してみてください</p>
                    <p>全体データ: {dormantData.length.toLocaleString()}件</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[180px]">
                        <Button variant="ghost" onClick={() => handleSort("name")} className="h-auto p-0 font-semibold hover:bg-gray-100">
                          顧客名
                          {getSortIcon("name")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">顧客ID</TableHead>
                      <TableHead className="w-[120px]">
                        <Button variant="ghost" onClick={() => handleSort("lastPurchaseDate")} className="h-auto p-0 font-semibold hover:bg-gray-100">
                          最終購入日
                          {getSortIcon("lastPurchaseDate")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <Button variant="ghost" onClick={() => handleSort("daysSinceLastPurchase")} className="h-auto p-0 font-semibold hover:bg-gray-100">
                          休眠日数
                          {getSortIcon("daysSinceLastPurchase")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">リスクレベル</TableHead>
                      <TableHead className="w-[140px]">
                        <Button variant="ghost" onClick={() => handleSort("totalSpent")} className="h-auto p-0 font-semibold hover:bg-gray-100">
                          累計購入額
                          {getSortIcon("totalSpent")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <Button variant="ghost" onClick={() => handleSort("churnProbability")} className="h-auto p-0 font-semibold hover:bg-gray-100">
                          復帰確率
                          {getSortIcon("churnProbability")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[120px] text-right">アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((customer) => {
                      const processedCustomer = processCustomerDisplayData(customer)
                      const customerId = customer.customerId?.toString() || ''
                      const customerName = customer.name || ''
                      const churnProbability = customer.churnProbability || 0
                      const returnProbability = Math.round((1 - churnProbability) * 100)
                      
                      return (
                        <TableRow 
                          key={customerId} 
                          className={`hover:bg-gray-50 ${
                            processedCustomer.hasNoPurchaseHistory ? 'bg-gray-50/50 text-gray-600' : ''
                          }`}
                        >
                          <TableCell>
                            <div>
                              <div className={`font-medium ${processedCustomer.hasNoPurchaseHistory ? 'text-gray-600' : ''}`}>
                                {customerName}
                                {processedCustomer.hasNoPurchaseHistory && (
                                  <Info className="inline ml-1 h-3 w-3 text-gray-400" />
                                )}
                              </div>
                              {customer.company && (
                                <div className="text-sm text-gray-500">{customer.company}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{customerId}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {processedCustomer.hasNoPurchaseHistory ? (
                                <span className="text-gray-500 italic">購入履歴なし</span>
                              ) : (
                                processedCustomer.displayLastPurchaseDate ? (
                                  typeof processedCustomer.displayLastPurchaseDate === 'string' 
                                    ? format(new Date(processedCustomer.displayLastPurchaseDate), 'yyyy/MM/dd')
                                    : format(processedCustomer.displayLastPurchaseDate, 'yyyy/MM/dd')
                                ) : 'データなし'
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`font-medium ${processedCustomer.hasNoPurchaseHistory ? 'text-gray-500' : ''}`}>
                              {processedCustomer.hasNoPurchaseHistory ? (
                                <span className="italic">-</span>
                              ) : (
                                `${(processedCustomer.displayDormancyDays || 0).toLocaleString()}日`
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {processedCustomer.hasNoPurchaseHistory ? (
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                <Info className="w-3 h-3 mr-1" />
                                未評価
                              </Badge>
                            ) : (
                              <Badge variant={getRiskBadge(processedCustomer.displayRiskLevel as RiskLevel).variant} className="text-xs">
                                {getRiskBadge(processedCustomer.displayRiskLevel as RiskLevel).label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className={`font-medium ${processedCustomer.hasNoPurchaseHistory ? 'text-gray-500' : ''}`}>
                              ¥{(processedCustomer.displayTotalSpent || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {processedCustomer.hasNoPurchaseHistory ? (
                                <span className="italic">購入なし</span>
                              ) : (
                                `${customer.totalOrders || 0}回購入`
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {processedCustomer.hasNoPurchaseHistory ? (
                                <span className="text-sm text-gray-400 italic">N/A</span>
                              ) : (
                                <div className={`text-sm font-medium ${
                                  returnProbability >= 70 ? 'text-green-600' :
                                  returnProbability >= 40 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {returnProbability}%
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="メール送信"
                                disabled={processedCustomer.hasNoPurchaseHistory}
                                className={processedCustomer.hasNoPurchaseHistory ? 'opacity-50' : ''}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="クーポン発行"
                                disabled={processedCustomer.hasNoPurchaseHistory}
                                className={processedCustomer.hasNoPurchaseHistory ? 'opacity-50' : ''}
                              >
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
            )}
          </>
        )}

        {/* ページネーション */}
        {!isLoading && filteredAndSortedCustomers.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-500">
              <div className="flex flex-col sm:flex-row gap-1">
                <span>
                  {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedCustomers.length)}件表示
                </span>
                <span className="text-slate-400">
                  / 全{filteredAndSortedCustomers.length.toLocaleString()}件
                </span>
                {totalPages > 1 && (
                  <span className="text-slate-400">
                    ({totalPages}ページ)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* ページサイズ選択 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">表示件数:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ページネーションコントロール */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  前へ
                </Button>
              
              <div className="flex items-center gap-1">
                {/* 最初のページ */}
                {currentPage > 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </Button>
                    {currentPage > 4 && <span className="px-2">...</span>}
                  </>
                )}
                
                {/* 現在ページ周辺 */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                
                {/* 最後のページ */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}