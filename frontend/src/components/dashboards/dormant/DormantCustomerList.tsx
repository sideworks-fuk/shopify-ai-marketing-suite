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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  Info,
  Lightbulb,
  Inbox
} from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

import { 
  type DormantSegment,
  type RiskLevel,
  type DormancyReason 
} from "@/types/models/customer"
import { useAuth } from "@/components/providers/AuthProvider"
import { getCurrentStoreId } from "@/lib/api-config"

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
  selectedSegment?: string | null;  // 文字列に変更（セグメント名）
  dormantData?: ApiDormantCustomer[];
  maxDisplayCount?: number;
  onMaxDisplayCountChange?: (count: number) => void;
  isLoading?: boolean;
}

export function DormantCustomerList({ selectedSegment, dormantData = [], maxDisplayCount = 200, onMaxDisplayCountChange, isLoading: externalIsLoading = false }: DormantCustomerListProps) {
  const riskLevelValues = useMemo(() => (['low', 'medium', 'high', 'critical'] as const), [])

  const toRiskLevel = useMemo(() => {
    return (value: unknown): RiskLevel | null => {
      if (typeof value !== 'string') return null
      return (riskLevelValues as readonly string[]).includes(value) ? (value as RiskLevel) : null
    }
  }, [riskLevelValues])

  // Propsの受け取り確認
  useEffect(() => {
    console.log('🎯 [DormantCustomerList] Props受け取り', {
      selectedSegment,
      dormantDataLength: dormantData?.length || 0,
      dormantDataType: Array.isArray(dormantData) ? 'array' : typeof dormantData,
      maxDisplayCount,
      externalIsLoading,
      timestamp: new Date().toISOString()
    })
  }, [selectedSegment, dormantData, maxDisplayCount, externalIsLoading])

  const [searchTerm, setSearchTerm] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all" | "unrated">("all")
  const [purchaseCountFilter, setPurchaseCountFilter] = useState(0) // デフォルト: 0回以上（すべて表示）
  const [purchaseHistoryFilter, setPurchaseHistoryFilter] = useState<"all" | "with-purchase" | "no-purchase">("all") // デフォルトを"all"に変更
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
    const normalizedRiskLevel: RiskLevel | 'unrated' =
      isNoPurchase ? 'unrated' : (toRiskLevel(customer.riskLevel) ?? 'medium')
    
    return {
      ...customer,
      hasNoPurchaseHistory: isNoPurchase,
      displayLastPurchaseDate: isNoPurchase ? '購入履歴なし' : customer.lastPurchaseDate,
      displayDormancyDays: isNoPurchase ? '-' : customer.daysSinceLastPurchase,
      displayRiskLevel: normalizedRiskLevel,
      displayTotalSpent: isNoPurchase ? 0 : customer.totalSpent
    }
  }

  // リスクレベルの定義と説明
  const riskLevelDefinitions = {
    low: {
      label: "低",
      description: "休眠期間: 0-90日",
      detail: "最近購入があった顧客。定期的なフォローで関係維持。",
      action: "ニュースレターや新商品情報の定期配信"
    },
    medium: {
      label: "中", 
      description: "休眠期間: 91-180日",
      detail: "購入から時間が経過。再購入を促す施策が必要。",
      action: "限定クーポンや特別オファーの送付を推奨"
    },
    high: {
      label: "高",
      description: "休眠期間: 181-365日",
      detail: "長期間購入なし。積極的なアプローチが必要。",
      action: "大幅割引やカムバックキャンペーンを検討"
    },
    critical: {
      label: "危険",
      description: "休眠期間: 365日以上",
      detail: "離脱リスクが非常に高い。早急な対応が必要。",
      action: "特別な復帰プログラムや個別アプローチを推奨"
    },
    unrated: {
      label: "未評価",
      description: "データ不足",
      detail: "購入履歴がないため評価できません。",
      action: "初回購入を促すキャンペーンを検討"
    }
  }

  // リスクレベルのバッジ取得
  const getRiskBadge = (level: RiskLevel | 'unrated' | undefined | null) => {
    const riskConfig = {
      low: { label: "低", color: "bg-green-100 text-green-800", variant: "secondary" as const },
      medium: { label: "中", color: "bg-yellow-100 text-yellow-800", variant: "secondary" as const },
      high: { label: "高", color: "bg-orange-100 text-orange-800", variant: "destructive" as const },
      critical: { label: "危険", color: "bg-red-100 text-red-800", variant: "destructive" as const },
      unrated: { label: "未評価", color: "bg-gray-100 text-gray-600", variant: "secondary" as const }
    }
    const safeLevel = level || 'unrated'
    return riskConfig[safeLevel as keyof typeof riskConfig] || riskConfig.unrated
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
      return <ArrowUpDown className="inline-block ml-1 h-3 w-3 text-gray-500 opacity-60" />
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="inline-block ml-1 h-3 w-3 text-blue-600" /> : 
      <ArrowDown className="inline-block ml-1 h-3 w-3 text-blue-600" />
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
          // 文字列で直接比較
          const segmentMatch = customerSegment === selectedSegment
          return segmentMatch
        }
        
        // dormancySegmentがない場合は日数で判定
        const daysSince = customer.daysSinceLastPurchase || 0
        
        // セグメント文字列から範囲を判定
        let minDays = 0, maxDays = 9999
        if (selectedSegment === '90-180日') {
          minDays = 90
          maxDays = 180
        } else if (selectedSegment === '180-365日') {
          minDays = 180
          maxDays = 365
        } else if (selectedSegment === '365日以上') {
          minDays = 365
          maxDays = 9999
        }
        
        const rangeMatch = daysSince >= minDays && (maxDays === 9999 || daysSince <= maxDays)
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

  // CSV エクスポート（全データ取得オプション付き）
  const exportToCSV = async () => {
    // 表示制限がある場合、全データ取得オプションを提供
    let dataToExport = filteredAndSortedCustomers
    
    if (dormantData.length >= maxDisplayCount) {
      const confirmExportAll = window.confirm(
        `現在、最大${maxDisplayCount}件のデータが表示されています。\n\n` +
        '全データをエクスポートしますか？\n' +
        '「OK」: サーバーから全データを取得（時間がかかる場合があります）\n' +
        '「キャンセル」: 現在表示中のデータのみエクスポート'
      )
      
      if (confirmExportAll) {
        try {
          // API クライアントを取得
          const { getApiClient } = useAuth()
          const api = getApiClient()
          
          // 簡易的なローディング表示
          const loadingMessage = document.createElement('div')
          loadingMessage.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 1px solid #ccc; border-radius: 8px; z-index: 9999;">全データを取得中...</div>'
          document.body.appendChild(loadingMessage)
          
          // 全データ取得
          const response = await api.dormantCustomers({
            storeId: getCurrentStoreId(),
            pageSize: 50000, // 大きな値で全件取得を試みる
            sortBy: sortField,
            descending: sortDirection === 'desc'
          })
          
          dataToExport = response.data?.customers || []
          console.log(`✅ 全データ取得完了: ${dataToExport.length}件`)
          
          // ローディング表示を削除
          document.body.removeChild(loadingMessage)
          
          // フィルタを適用（全データに対して現在のフィルタ条件を適用）
          if (purchaseHistoryFilter !== "all" || purchaseCountFilter > 0 || riskFilter !== "all" || searchTerm) {
            dataToExport = dataToExport.filter(customer => {
              // 既存のフィルタロジックを適用
              const processedCustomer = processCustomerDisplayData(customer)
              
              // 購入履歴フィルタ
              if (purchaseHistoryFilter === "no-purchase" && !processedCustomer.hasNoPurchaseHistory) return false
              if (purchaseHistoryFilter === "with-purchase" && processedCustomer.hasNoPurchaseHistory) return false
              
              // 購入回数フィルタ
              if (purchaseCountFilter > 0 && !processedCustomer.hasNoPurchaseHistory && 
                  (customer.totalOrders || 0) < purchaseCountFilter) return false
              
              // リスクレベルフィルタ
              if (riskFilter !== "all" && processedCustomer.displayRiskLevel !== riskFilter) return false
              
              // 検索フィルタ
              if (searchTerm) {
                const searchLower = searchTerm.toLowerCase()
                const customerName = String(customer.name || '').toLowerCase()
                const customerEmail = String(customer.email || '').toLowerCase()
                const companyName = String(customer.company || '').toLowerCase()
                
                if (!customerName.includes(searchLower) && 
                    !customerEmail.includes(searchLower) && 
                    !companyName.includes(searchLower)) {
                  return false
                }
              }
              
              return true
            })
          }
          
        } catch (error) {
          console.error('❌ 全データ取得エラー:', error)
          // ローディング表示があれば削除
          const loadingEl = document.querySelector('div[style*="position: fixed"]')
          if (loadingEl) loadingEl.remove()
          
          alert('全データの取得に失敗しました。表示中のデータをエクスポートします。')
          dataToExport = filteredAndSortedCustomers
        }
      }
    }
    
    // CSV用のデータ作成
    const headers = [
      '顧客ID', '顧客名', '会社名', 'メールアドレス', '最終購入日', '休眠期間（日）', '休眠セグメント', 
      'リスクレベル', '総購入金額', '購入回数', '平均注文金額', '推奨アクション'
    ]
    
    const csvData = dataToExport.map(customer => {
      const customerId = customer.customerId?.toString() || ''
      const customerName = customer.name || ''
      const lastPurchaseDate = customer.lastPurchaseDate
      const daysSince = customer.daysSinceLastPurchase || 0
      const riskLevel = toRiskLevel(customer.riskLevel) ?? 'medium'
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
        getRiskBadge(riskLevel).label,
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
            {/* フィルタ適用状態の表示 */}
            {(purchaseHistoryFilter !== "all" || purchaseCountFilter > 0 || riskFilter !== "all" || searchTerm) ? (
              <Badge variant="outline" className="ml-2">
                {filteredAndSortedCustomers.length.toLocaleString()}件
                <span className="ml-1 text-xs opacity-70">(フィルタ適用)</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2">
                {filteredAndSortedCustomers.length.toLocaleString()}件
                {/* 実際のデータ数が最大表示件数より少ない場合 */}
                {dormantData.length < maxDisplayCount && maxDisplayCount > 200 && (
                  <span className="ml-1 text-xs opacity-70">(全データ)</span>
                )}
                {/* 最大表示件数に達している場合 */}
                {dormantData.length >= maxDisplayCount && (
                  <span className="ml-1 text-xs opacity-70">(最大{maxDisplayCount.toLocaleString()}件表示)</span>
                )}
              </Badge>
            )}
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
                {riskFilter === "critical" ? "危険" : 
                 riskFilter === "high" ? "高" :
                 riskFilter === "medium" ? "中" : 
                 riskFilter === "low" ? "低" : "未評価"}リスクのみ
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
              onClick={() => exportToCSV()}
              className="flex items-center gap-2"
              disabled={filteredAndSortedCustomers.length === 0}
            >
              <Download className="h-4 w-4" />
              CSV出力
              {dormantData.length >= maxDisplayCount && (
                <span className="ml-1 text-xs">(全件取得可)</span>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* データ取得状況のアラート */}
        {!externalIsLoading && dormantData.length < maxDisplayCount && maxDisplayCount > 200 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">データ取得完了</p>
                <p className="text-xs mt-1">
                  最大{maxDisplayCount.toLocaleString()}件を要求しましたが、実際に取得できたデータは
                  <span className="font-semibold mx-1">{dormantData.length.toLocaleString()}件</span>
                  です。これがすべての該当データです。
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 最大表示件数の選択 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">最大表示件数:</label>
            <select
              value={maxDisplayCount}
              onChange={(e) => {
                const newCount = parseInt(e.target.value)
                if (onMaxDisplayCountChange) {
                  onMaxDisplayCountChange(newCount)
                }
              }}
              disabled={externalIsLoading}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={100}>100件</option>
              <option value={200}>200件</option>
              <option value={500}>500件</option>
              <option value={1000}>1,000件</option>
              <option value={2000}>2,000件</option>
              <option value={5000}>5,000件</option>
              <option value={10000}>10,000件</option>
            </select>
            {externalIsLoading ? (
              <span className="text-xs text-blue-600 ml-2 flex items-center gap-1">
                <span className="inline-block animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                {maxDisplayCount >= 1000 
                  ? `${maxDisplayCount.toLocaleString()}件のデータを取得中...` 
                  : 'データを取得中...'}
              </span>
            ) : (
              <>
                {/* 実際のデータ数が最大表示件数より少ない場合の表示 */}
                {dormantData.length < maxDisplayCount && (
                  <span className="text-xs text-gray-600 ml-2">
                    実際のデータ: {dormantData.length.toLocaleString()}件
                    {dormantData.length === 0 && ' (データなし)'}
                  </span>
                )}
                {/* 最大表示件数に達している場合 */}
                {dormantData.length === maxDisplayCount && maxDisplayCount >= 1000 && (
                  <span className="text-xs text-orange-600 ml-2">
                    {maxDisplayCount.toLocaleString()}件表示中（さらにデータが存在する可能性があります）
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* フィルター */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">フィルター条件</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-600 mb-1 block" htmlFor="customer-search">顧客検索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="customer-search"
                placeholder="顧客名・会社名・IDで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="顧客名・会社名・IDで検索"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">購買履歴</label>
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
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs text-gray-600">リスクレベル</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      className="inline-flex items-center justify-center rounded-full w-3 h-3 bg-blue-100 hover:bg-blue-200 transition-colors text-[10px] font-bold text-blue-600"
                      aria-label="リスクレベルの説明"
                    >
                      ?
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3 z-50">
                    <div className="space-y-2">
                      <p className="font-semibold text-xs">判定基準</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800 text-xs px-1 py-0">危険</Badge>
                          <span className="text-xs">365日以上</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800 text-xs px-1 py-0">高</Badge>
                          <span className="text-xs">181-365日</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs px-1 py-0">中</Badge>
                          <span className="text-xs">91-180日</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 text-xs px-1 py-0">低</Badge>
                          <span className="text-xs">0-90日</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 pt-1 border-t">
                        ※優良顧客は1段階軽減
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={riskFilter} 
              onValueChange={(value) => {
                if (value === "all" || value === "low" || value === "medium" || value === "high" || value === "critical" || value === "unrated") {
                  setRiskFilter(value as RiskLevel | "all" | "unrated")
                }
              }}
            >
              <SelectTrigger aria-label="リスクレベル選択">
                <SelectValue placeholder="リスクレベル" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="critical">危険</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="unrated">未評価</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-600 mb-1 block">購入回数</label>
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
          </div>

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
                    <div 
                      key={index} 
                      className={`h-4 bg-gray-200 rounded animate-pulse ${
                        index === 0 ? 'w-[120px]' : index === 5 ? 'w-[100px]' : 'w-[80px]'
                      }`}
                    />
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
                        ? (externalIsLoading
                            ? (
                                <div>
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                  <p>データを取得中...</p>
                                </div>
                              )
                            : (
                                <div>
                                  <div className="mb-4">
                                    <Inbox className="h-12 w-12 mx-auto text-gray-400" />
                                  </div>
                                  <p className="text-lg mb-2">該当するデータがありません</p>
                                  <p className="text-sm text-gray-500">このセグメントには顧客が存在しません</p>
                                </div>
                              )
                          )
                        : (
                            <div>
                              <div className="mb-4">
                                <Search className="h-12 w-12 mx-auto text-gray-400" />
                              </div>
                              <p className="text-lg mb-2">該当する顧客が見つかりません</p>
                              <p className="text-sm">フィルタ条件を変更して再度お試しください</p>
                            </div>
                          ))
                    : 'データがありません'}
                </div>
                {dormantData.length > 0 && filteredAndSortedCustomers.length === 0 && (
                  <div className="text-sm text-gray-400 mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2">
                      <Lightbulb className="h-4 w-4 text-gray-400" />
                      <p>ヒント: フィルタ条件を緩和してみてください</p>
                    </div>
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
                      <TableHead className="w-[120px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">リスクレベル</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  type="button" 
                                  className="inline-flex items-center justify-center rounded-full w-4 h-4 bg-gray-200 hover:bg-gray-300 transition-colors"
                                >
                                  <span className="text-xs font-bold text-gray-600">?</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm p-4 z-50">
                                <div className="space-y-3">
                                  <p className="font-semibold text-sm">リスクレベルの判定基準</p>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-red-100 text-red-800">危険</Badge>
                                      <span>365日以上</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-orange-100 text-orange-800">高</Badge>
                                      <span>181-365日</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-yellow-100 text-yellow-800">中</Badge>
                                      <span>91-180日</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-green-100 text-green-800">低</Badge>
                                      <span>0-90日</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600 pt-2 border-t">
                                    ※購入回数10回以上の優良顧客は<br/>リスクレベルが1段階下がります
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <Button variant="ghost" onClick={() => handleSort("totalSpent")} className="h-auto p-0 font-semibold hover:bg-gray-100">
                          累計購入額
                          {getSortIcon("totalSpent")}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <Button variant="ghost" onClick={() => handleSort("totalOrders")} className="h-auto p-0 font-semibold hover:bg-gray-100">
                          累計購入数
                          {getSortIcon("totalOrders")}
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {processedCustomer.hasNoPurchaseHistory ? (
                                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 cursor-help">
                                      <Info className="w-3 h-3 mr-1" />
                                      未評価
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      variant={getRiskBadge(processedCustomer.displayRiskLevel).variant} 
                                      className="text-xs cursor-help"
                                    >
                                      {getRiskBadge(processedCustomer.displayRiskLevel).label}
                                    </Badge>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3">
                                  <div className="space-y-2">
                                    <div className="font-semibold text-sm">
                                      {riskLevelDefinitions[processedCustomer.displayRiskLevel as keyof typeof riskLevelDefinitions]?.label || "不明"}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {riskLevelDefinitions[processedCustomer.displayRiskLevel as keyof typeof riskLevelDefinitions]?.description || ""}
                                    </div>
                                    <div className="text-xs">
                                      {riskLevelDefinitions[processedCustomer.displayRiskLevel as keyof typeof riskLevelDefinitions]?.detail || ""}
                                    </div>
                                    <div className="pt-2 border-t">
                                      <div className="text-xs font-medium">推奨アクション:</div>
                                      <div className="text-xs text-gray-600">
                                        {riskLevelDefinitions[processedCustomer.displayRiskLevel as keyof typeof riskLevelDefinitions]?.action || ""}
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <div className={`font-medium ${processedCustomer.hasNoPurchaseHistory ? 'text-gray-500' : ''}`}>
                              ¥{(processedCustomer.displayTotalSpent || 0).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className={`font-medium ${processedCustomer.hasNoPurchaseHistory ? 'text-gray-500' : ''}`}>
                                {processedCustomer.hasNoPurchaseHistory ? (
                                  <span className="italic">-</span>
                                ) : (
                                  `${customer.totalOrders || 0}回`
                                )}
                              </div>
                              {!processedCustomer.hasNoPurchaseHistory && (customer.totalOrders || 0) >= 10 && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  優良顧客
                                </Badge>
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
                    (全{totalPages}ページ中 {currentPage}ページ目)
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
                {/* 最初のページと省略記号 */}
                {totalPages > 7 && currentPage > 4 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </Button>
                    <span className="px-2 text-gray-400">...</span>
                  </>
                )}
                
                {/* 現在ページ周辺 */}
                {(() => {
                  // ページ番号ボタンの表示ロジックを改善
                  const pageButtons = [];
                  
                  if (totalPages <= 7) {
                    // 7ページ以下の場合は全て表示
                    for (let i = 1; i <= totalPages; i++) {
                      pageButtons.push(i);
                    }
                  } else {
                    // 8ページ以上の場合は省略表示
                    if (currentPage <= 4) {
                      // 前半の場合
                      for (let i = 1; i <= 5; i++) {
                        pageButtons.push(i);
                      }
                    } else if (currentPage >= totalPages - 3) {
                      // 後半の場合
                      for (let i = totalPages - 4; i <= totalPages; i++) {
                        pageButtons.push(i);
                      }
                    } else {
                      // 中間の場合
                      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                        pageButtons.push(i);
                      }
                    }
                  }
                  
                  return pageButtons.map(pageNum => (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ));
                })()}
                
                {/* 最後のページと省略記号 */}
                {totalPages > 7 && currentPage < totalPages - 3 && (
                  <>
                    <span className="px-2 text-gray-400">...</span>
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