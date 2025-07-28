"use client"

import React, { useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VirtualScroll, useVirtualScrollPerformance } from "@/components/ui/VirtualScroll"
import { 
  Mail, 
  Download, 
  Gift,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { 
  type DormantSegment,
  type RiskLevel
} from "@/types/models/customer"

/**
 * 休眠顧客テーブル - 仮想スクロール対応版
 * 
 * @author YUKI
 * @date 2025-07-28
 * @description 大量の休眠顧客データを高速表示するための仮想スクロール実装
 */

// API データの型定義
interface ApiDormantCustomer {
  customerId?: string | number
  name?: string
  email?: string
  company?: string
  lastPurchaseDate?: string | Date
  daysSinceLastPurchase?: number
  dormancySegment?: string
  riskLevel?: string
  churnProbability?: number
  totalSpent?: number
  totalOrders?: number
  averageOrderValue?: number
  insight?: {
    recommendedAction?: string
    optimalTiming?: string
    estimatedSuccessRate?: number
    suggestedOffer?: string
  }
}

interface DormantCustomerTableVirtualProps {
  selectedSegment?: DormantSegment | null
  dormantData?: ApiDormantCustomer[]
  containerHeight?: number
}

// 購入履歴なし判定
const hasNoPurchaseHistory = (customer: ApiDormantCustomer): boolean => {
  return (customer.totalOrders === 0 || 
          customer.lastPurchaseDate === '0001-01-01T00:00:00' ||
          customer.lastPurchaseDate === '0001/01/01' ||
          !customer.lastPurchaseDate ||
          customer.totalSpent === 0)
}

// リスクレベルのバッジ設定
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

// 顧客行コンポーネント（メモ化）
const CustomerRow = React.memo(({ customer }: { customer: ApiDormantCustomer }) => {
  const isNoPurchase = hasNoPurchaseHistory(customer)
  const customerId = customer.customerId?.toString() || ''
  const customerName = customer.name || ''
  const churnProbability = customer.churnProbability || 0
  const returnProbability = Math.round((1 - churnProbability) * 100)
  const riskLevel = (isNoPurchase ? 'unrated' : customer.riskLevel || 'medium') as RiskLevel | 'unrated'
  
  return (
    <div 
      className={cn(
        "flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors",
        isNoPurchase && "bg-gray-50/50 text-gray-600"
      )}
      style={{ height: 72 }}
    >
      {/* 顧客名 */}
      <div className="flex-shrink-0 w-[200px] px-4">
        <div className={cn("font-medium", isNoPurchase && "text-gray-600")}>
          {customerName}
          {isNoPurchase && <Info className="inline ml-1 h-3 w-3 text-gray-400" />}
        </div>
        {customer.company && (
          <div className="text-sm text-gray-500">{customer.company}</div>
        )}
      </div>
      
      {/* 顧客ID */}
      <div className="flex-shrink-0 w-[100px] px-4 text-sm">
        {customerId}
      </div>
      
      {/* 最終購入日 */}
      <div className="flex-shrink-0 w-[120px] px-4">
        <div className="text-sm">
          {isNoPurchase ? (
            <span className="text-gray-500 italic">購入履歴なし</span>
          ) : (
            customer.lastPurchaseDate && (
              typeof customer.lastPurchaseDate === 'string' 
                ? format(new Date(customer.lastPurchaseDate), 'yyyy/MM/dd')
                : format(customer.lastPurchaseDate, 'yyyy/MM/dd')
            )
          )}
        </div>
      </div>
      
      {/* 休眠日数 */}
      <div className="flex-shrink-0 w-[100px] px-4">
        <div className={cn("font-medium", isNoPurchase && "text-gray-500")}>
          {isNoPurchase ? '-' : `${(customer.daysSinceLastPurchase || 0).toLocaleString()}日`}
        </div>
      </div>
      
      {/* リスクレベル */}
      <div className="flex-shrink-0 w-[100px] px-4">
        <Badge variant={getRiskBadge(riskLevel).variant} className="text-xs">
          {isNoPurchase && <Info className="w-3 h-3 mr-1" />}
          {getRiskBadge(riskLevel).label}
        </Badge>
      </div>
      
      {/* 累計購入額 */}
      <div className="flex-shrink-0 w-[140px] px-4">
        <div className={cn("font-medium", isNoPurchase && "text-gray-500")}>
          ¥{(customer.totalSpent || 0).toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">
          {isNoPurchase ? '購入なし' : `${customer.totalOrders || 0}回購入`}
        </div>
      </div>
      
      {/* 復帰確率 */}
      <div className="flex-shrink-0 w-[100px] px-4">
        {isNoPurchase ? (
          <span className="text-sm text-gray-400 italic">N/A</span>
        ) : (
          <div className={cn(
            "text-sm font-medium",
            returnProbability >= 70 ? 'text-green-600' :
            returnProbability >= 40 ? 'text-yellow-600' : 'text-red-600'
          )}>
            {returnProbability}%
          </div>
        )}
      </div>
      
      {/* アクション */}
      <div className="flex-1 px-4 text-right">
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            title="メール送信"
            disabled={isNoPurchase}
            className={isNoPurchase ? 'opacity-50' : ''}
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="クーポン発行"
            disabled={isNoPurchase}
            className={isNoPurchase ? 'opacity-50' : ''}
          >
            <Gift className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
})

CustomerRow.displayName = "CustomerRow"

export function DormantCustomerTableVirtual({ 
  selectedSegment, 
  dormantData = [],
  containerHeight = 600 
}: DormantCustomerTableVirtualProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [riskFilter, setRiskFilter] = React.useState<RiskLevel | "all">("all")
  const [purchaseCountFilter, setPurchaseCountFilter] = React.useState(1)
  const [purchaseHistoryFilter, setPurchaseHistoryFilter] = React.useState<"all" | "with-purchase" | "no-purchase">("with-purchase")
  const [sortField, setSortField] = React.useState<string>("daysSinceLastPurchase")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")
  
  const { measureScrollPerformance } = useVirtualScrollPerformance('DormantCustomerTable')
  
  // ヘッダーとフィルターの高さ
  const headerHeight = 48
  const filterHeight = 140
  const tableHeaderHeight = 48
  const rowHeight = 72
  const scrollAreaHeight = containerHeight - headerHeight - filterHeight - tableHeaderHeight
  
  // ソート処理
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }
  
  // ソートアイコン
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : 
      <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
  }
  
  // フィルタリングとソート
  const filteredAndSortedCustomers = useMemo(() => {
    let result = dormantData.filter((customer) => {
      const isNoPurchase = hasNoPurchaseHistory(customer)
      
      // 検索条件
      const customerName = customer.name || ''
      const customerId = customer.customerId?.toString() || ''
      const customerCompany = customer.company || ''
      const matchesSearch = 
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerId.includes(searchTerm) ||
        customerCompany.toLowerCase().includes(searchTerm.toLowerCase())
      
      // 購入履歴フィルタ
      const matchesPurchaseHistory = (() => {
        switch (purchaseHistoryFilter) {
          case 'with-purchase':
            return !isNoPurchase
          case 'no-purchase':
            return isNoPurchase
          case 'all':
          default:
            return true
        }
      })()
      
      // セグメント条件
      const matchesSegment = !selectedSegment || (() => {
        const customerSegment = customer.dormancySegment
        if (customerSegment) {
          return customerSegment === selectedSegment.label
        }
        
        const daysSince = customer.daysSinceLastPurchase || 0
        return daysSince >= selectedSegment.range[0] &&
               (selectedSegment.range[1] === 9999 || daysSince <= selectedSegment.range[1])
      })()
      
      // リスクレベル条件
      const riskLevel = (isNoPurchase ? 'unrated' : customer.riskLevel || 'medium')
      const matchesRisk = riskFilter === "all" || riskLevel === riskFilter
      
      // 購入回数条件
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
    
    return result
  }, [dormantData, searchTerm, selectedSegment, riskFilter, purchaseCountFilter, purchaseHistoryFilter, sortField, sortDirection])
  
  // CSV エクスポート
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
        `${Math.round((1 - churnProbability) * 100)}%`,
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
  
  // スクロールハンドラー
  const handleScroll = useCallback((scrollTop: number) => {
    measureScrollPerformance(() => {
      // スクロール時の処理（必要に応じて）
    })
  }, [measureScrollPerformance])
  
  // テーブルヘッダー（メモ化）
  const tableHeader = useMemo(() => (
    <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 flex items-center" style={{ height: tableHeaderHeight }}>
      <div className="flex-shrink-0 w-[200px] px-4">
        <Button variant="ghost" onClick={() => handleSort("name")} className="h-auto p-0 font-semibold hover:bg-gray-100">
          顧客名
          {getSortIcon("name")}
        </Button>
      </div>
      <div className="flex-shrink-0 w-[100px] px-4 font-semibold">顧客ID</div>
      <div className="flex-shrink-0 w-[120px] px-4">
        <Button variant="ghost" onClick={() => handleSort("lastPurchaseDate")} className="h-auto p-0 font-semibold hover:bg-gray-100">
          最終購入日
          {getSortIcon("lastPurchaseDate")}
        </Button>
      </div>
      <div className="flex-shrink-0 w-[100px] px-4">
        <Button variant="ghost" onClick={() => handleSort("daysSinceLastPurchase")} className="h-auto p-0 font-semibold hover:bg-gray-100">
          休眠日数
          {getSortIcon("daysSinceLastPurchase")}
        </Button>
      </div>
      <div className="flex-shrink-0 w-[100px] px-4 font-semibold">リスクレベル</div>
      <div className="flex-shrink-0 w-[140px] px-4">
        <Button variant="ghost" onClick={() => handleSort("totalSpent")} className="h-auto p-0 font-semibold hover:bg-gray-100">
          累計購入額
          {getSortIcon("totalSpent")}
        </Button>
      </div>
      <div className="flex-shrink-0 w-[100px] px-4">
        <Button variant="ghost" onClick={() => handleSort("churnProbability")} className="h-auto p-0 font-semibold hover:bg-gray-100">
          復帰確率
          {getSortIcon("churnProbability")}
        </Button>
      </div>
      <div className="flex-1 px-4 text-right font-semibold">アクション</div>
    </div>
  ), [sortField, sortDirection])
  
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">休眠顧客一覧（高速表示版）</span>
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
      
      <CardContent className="p-0">
        {/* フィルター */}
        <div className="p-6 border-b border-gray-200" style={{ height: filterHeight }}>
          <h3 className="text-sm font-medium text-gray-700 mb-3">フィルター条件</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                }}
              >
                フィルタクリア
              </Button>
            </div>
          </div>
        </div>
        
        {/* テーブル */}
        <div className="relative" style={{ height: scrollAreaHeight + tableHeaderHeight }}>
          {tableHeader}
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {filteredAndSortedCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    {dormantData.length === 0 ? (
                      <div>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p>データを取得中...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-4">🔍</div>
                        <p className="text-lg mb-2">該当する顧客が見つかりません</p>
                        <p className="text-sm">フィルタ条件を変更して再度お試しください</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <VirtualScroll
                  items={filteredAndSortedCustomers}
                  itemHeight={rowHeight}
                  containerHeight={scrollAreaHeight}
                  renderItem={(customer, index) => <CustomerRow key={customer.customerId || index} customer={customer} />}
                  overscan={10}
                  onScroll={handleScroll}
                  className="bg-white"
                />
              )}
            </div>
          </div>
        </div>
        
        {/* フッター情報 */}
        {filteredAndSortedCustomers.length > 0 && (
          <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
            <div className="flex items-center justify-between">
              <span>
                仮想スクロールで{filteredAndSortedCustomers.length.toLocaleString()}件を高速表示中
              </span>
              <span className="text-xs text-gray-400">
                パフォーマンス最適化: 表示領域のみレンダリング
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}