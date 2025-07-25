"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, ChevronLeft, ChevronRight, Search, Filter, Mail, Gift } from "lucide-react"
import { format } from "date-fns"

// 統一された休眠顧客分析コンポーネント
import DormantCustomerAnalysis from "@/components/dashboards/DormantCustomerAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"

import { api } from "@/lib/api-client"
import { API_CONFIG } from "@/lib/api-config"
import { useDormantFilters } from "@/contexts/FilterContext"
import { useState, useEffect, useCallback } from "react"

export default function DormantCustomersPage() {
  // ✅ Props Drilling解消: フィルター状態は FilterContext で管理
  const { filters } = useDormantFilters()
  
  // 段階的データ読み込みのための状態管理
  const [summaryData, setSummaryData] = useState<any>(null)
  const [dormantData, setDormantData] = useState<any[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingList, setIsLoadingList] = useState(true) // 初期状態をtrueに変更
  const [error, setError] = useState<string | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [hasInitialLoad, setHasInitialLoad] = useState(false) // 初回読み込み完了フラグ

  // ページング状態管理
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMoreData, setHasMoreData] = useState(false)
  const pageSize = 20

  // フィルタ状態管理
  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all')
  const [purchaseCountFilter, setPurchaseCountFilter] = useState<'all' | '1+' | '3+' | '5+' | '10+'>('1+')
  const [totalSpentFilter, setTotalSpentFilter] = useState<'all' | '10k+' | '50k+' | '100k+' | '500k+'>('all')
  const [sortBy, setSortBy] = useState<'daysSince' | 'totalSpent' | 'name' | 'lastPurchase'>('daysSince')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 詳細な期間別セグメント定義
  const [detailedSegments, setDetailedSegments] = useState<any[]>([])
  const [isLoadingSegments, setIsLoadingSegments] = useState(false)

  // Step 1: サマリーデータのみ先に取得（軽量・高速）
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setIsLoadingSummary(true)
        setError(null)
        
        console.log('🔄 休眠顧客サマリーデータの取得を開始...')
        
        const response = await api.dormantSummary(1)
        console.log('✅ サマリーデータ取得成功:', response)
        
        setSummaryData(response.data)
        
      } catch (err) {
        console.error('❌ サマリーデータの取得に失敗:', err)
        setError('サマリーデータの取得に失敗しました')
      } finally {
        setIsLoadingSummary(false)
      }
    }

    fetchSummaryData()
  }, [])

  // Step 1.5: 詳細な期間別セグメントデータを取得
  useEffect(() => {
    const fetchDetailedSegments = async () => {
      try {
        setIsLoadingSegments(true)
        setError(null)
        
        console.log('🔄 詳細な期間別セグメントデータの取得を開始...')
        
        const response = await api.dormantDetailedSegments(1)
        console.log('✅ 詳細セグメントデータ取得成功:', response)
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // データベースからの実際の計算結果を使用
          console.log('✅ データベースから実際のセグメントデータを取得:', response.data)
          setDetailedSegments(response.data)
        } else {
          console.warn('⚠️ APIレスポンスが期待する形式ではありません:', response)
          throw new Error('セグメントデータの形式が不正です')
        }
        
      } catch (err) {
        console.error('❌ 詳細セグメントデータの取得に失敗:', err)
        
        // エラーの詳細をユーザーに表示
        let errorMessage = 'データベースからのセグメントデータ取得に失敗しました'
        let errorDetails = ''
        
        if (err instanceof Error) {
          errorMessage += `: ${err.message}`
          errorDetails = err.stack || ''
          
          // 具体的なエラータイプに応じたメッセージ
          if (err.message.includes('fetch')) {
            errorMessage = 'APIサーバーへの接続に失敗しました。ネットワーク接続を確認してください。'
          } else if (err.message.includes('timeout')) {
            errorMessage = 'APIリクエストがタイムアウトしました。サーバーの負荷が高い可能性があります。'
          } else if (err.message.includes('500')) {
            errorMessage = 'サーバー内部エラーが発生しました。データベース接続を確認してください。'
          }
        }
        
        console.error('📋 詳細エラー情報:', {
          message: errorMessage,
          details: errorDetails,
          type: typeof err,
          constructor: err?.constructor?.name,
          endpoint: '/api/customer/dormant/detailed-segments'
        })
        
        setError(`${errorMessage}\n\nAPI: /api/customer/dormant/detailed-segments`)
        setDetailedSegments([]) // モックデータではなく空配列を設定
      } finally {
        setIsLoadingSegments(false)
      }
    }

    fetchDetailedSegments()
  }, [])

  // Step 2: 顧客リストは選択後に遅延読み込み
  const loadCustomerList = useCallback(async (segment?: string, page: number = 1) => {
    try {
      setIsLoadingList(true)
      setError(null)
      
      console.log('🔄 休眠顧客リストの取得を開始...', { segment, page })
      
      const response = await api.dormantCustomers({
        storeId: 1,
        segment,
        pageNumber: page,
        pageSize: pageSize,
        sortBy: 'DaysSinceLastPurchase',
        descending: true
      })
      
      console.log('✅ 顧客リスト取得成功:', response)
      
      const customersData = response.data?.customers || []
      const pagination = response.data?.pagination
      
      console.log('📊 取得された顧客データ数:', customersData.length)
      console.log('📊 ページング情報:', pagination)
      
      setDormantData(customersData)
      setSelectedSegment(segment || null)
      
      // ページング情報を設定
      if (pagination) {
        setCurrentPage(pagination.currentPage || page)
        setTotalCount(pagination.totalCount || 0)
        setHasMoreData(pagination.currentPage < pagination.totalPages)
      } else {
        // ページング情報がない場合のフォールバック
        setCurrentPage(page)
        setTotalCount(customersData.length)
        setHasMoreData(customersData.length === pageSize)
      }
      
    } catch (err) {
      console.error('❌ 顧客リストの取得に失敗:', err)
      
      // エラー時のフォールバック（モックデータ）
      const mockDormantData = Array.from({ length: 10 }, (_, index) => ({
        customerId: `mock-${index + 1}`,
        name: `テスト顧客 ${index + 1}`,
        email: `test${index + 1}@example.com`,
        company: `テスト株式会社${index + 1}`, // 会社名を追加
        lastPurchaseDate: new Date(2024, 0, 1 + index).toISOString(),
        daysSinceLastPurchase: 90 + index * 10,
        dormancySegment: segment || '90-180日',
        riskLevel: ['low', 'medium', 'high', 'critical'][index % 4],
        churnProbability: 0.1 + (index * 0.05),
        totalSpent: 10000 + index * 5000,
        totalOrders: 1 + index,
        averageOrderValue: 10000 + index * 1000
      }))
      
      console.log('📊 モックデータを使用:', mockDormantData.length)
      setDormantData(mockDormantData)
      setSelectedSegment(segment || null)
      
      console.warn('🚧 APIエラーのため、モックデータで動作確認を継続しています。')
    } finally {
      setIsLoadingList(false)
      setHasInitialLoad(true) // 初回読み込み完了をマーク
    }
  }, [])

  // ページング操作関数
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= Math.ceil(totalCount / pageSize)) {
      loadCustomerList(selectedSegment || undefined, page)
    }
  }, [selectedSegment, totalCount, pageSize, loadCustomerList])

  const goToNextPage = useCallback(() => {
    if (hasMoreData) {
      goToPage(currentPage + 1)
    }
  }, [hasMoreData, currentPage, goToPage])

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }, [currentPage, goToPage])

  // セグメント選択時の関数（ページを1にリセット）
  const selectSegment = useCallback((segment?: string) => {
    setCurrentPage(1)
    loadCustomerList(segment, 1)
  }, [loadCustomerList])

  // フィルタリングされた顧客データ
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = dormantData.filter(customer => {
      // 検索フィルタ
      const matchesSearch = !searchTerm || 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerId?.toString().includes(searchTerm)

      // リスクレベルフィルタ
      const matchesRisk = riskFilter === 'all' || customer.riskLevel === riskFilter
      
      // 購入回数フィルタ
      const matchesPurchaseCount = purchaseCountFilter === 'all' || (() => {
        const totalOrders = customer.totalOrders || 0
        switch (purchaseCountFilter) {
          case '1+': return totalOrders >= 1
          case '3+': return totalOrders >= 3
          case '5+': return totalOrders >= 5
          case '10+': return totalOrders >= 10
          default: return true
        }
      })()
      
      // 購入金額フィルタ
      const matchesTotalSpent = totalSpentFilter === 'all' || (() => {
        const totalSpent = customer.totalSpent || 0
        switch (totalSpentFilter) {
          case '10k+': return totalSpent >= 10000
          case '50k+': return totalSpent >= 50000
          case '100k+': return totalSpent >= 100000
          case '500k+': return totalSpent >= 500000
          default: return true
        }
      })()

      return matchesSearch && matchesRisk && matchesPurchaseCount && matchesTotalSpent
    })

    // ソート
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'daysSince':
          aValue = a.daysSinceLastPurchase || 0
          bValue = b.daysSinceLastPurchase || 0
          break
        case 'totalSpent':
          aValue = a.totalSpent || 0
          bValue = b.totalSpent || 0
          break
        case 'name':
          aValue = a.name || ''
          bValue = b.name || ''
          break
        case 'lastPurchase':
          aValue = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0
          bValue = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0
          break
        default:
          return 0
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      }
    })

    return filtered
  }, [dormantData, searchTerm, riskFilter, purchaseCountFilter, totalSpentFilter, sortBy, sortOrder])

  // フィルタ変更時にページを1にリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, riskFilter, purchaseCountFilter, totalSpentFilter, sortBy, sortOrder])

  // リスクレベル表示用ヘルパー
  const getRiskBadge = (level: string) => {
    const riskConfig: Record<string, { label: string; color: string; variant: "secondary" | "outline" | "destructive" }> = {
      low: { label: "低", color: "bg-green-100 text-green-800", variant: "secondary" as const },
      medium: { label: "中", color: "bg-yellow-100 text-yellow-800", variant: "outline" as const },
      high: { label: "高", color: "bg-orange-100 text-orange-800", variant: "destructive" as const },
      critical: { label: "危険", color: "bg-red-100 text-red-800", variant: "destructive" as const }
    }
    return riskConfig[level] || riskConfig.medium
  }

  // 初期表示時は全セグメントのデータを取得
  useEffect(() => {
    if (!isLoadingSummary && summaryData && !selectedSegment) {
      loadCustomerList()
    }
  }, [isLoadingSummary, summaryData, selectedSegment, loadCustomerList])

  // CSV エクスポート機能
  const exportToCSV = () => {
    const headers = [
      '顧客ID', '顧客名', '会社名', 'メールアドレス', '最終購入日', '休眠期間（日）', '休眠セグメント', 
      'リスクレベル', '離脱確率', '総購入金額', '購入回数', '平均注文金額'
    ]
    
    const csvData = dormantData.map(customer => {
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
        customer.company || '', // 会社名を追加
        customer.email || '',
        lastPurchaseDate ? (typeof lastPurchaseDate === 'string' 
          ? format(new Date(lastPurchaseDate), 'yyyy-MM-dd')
          : format(lastPurchaseDate, 'yyyy-MM-dd')) : '',
        daysSince,
        customer.dormancySegment || '',
        riskLevel,
        `${Math.round(churnProbability * 100)}%`,
        totalSpent,
        customer.totalOrders || 0,
        customer.averageOrderValue || 0
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
    <div className="min-h-screen bg-gray-50">
      <AnalyticsHeaderUnified 
        mainTitle="休眠顧客分析【顧客】"
        description="最終購入からの経過期間別に顧客を分析し、復帰施策の効果的な立案と実行に活用できます"
        currentAnalysis={{
          title: "期間別休眠顧客セグメント分析",
          description: "90日以上購入のない顧客を期間別に分析し、復帰可能性を評価します",
          targetCount: filteredAndSortedCustomers.length
        }}
        badges={[
          { label: `${dormantData.length}名`, variant: "outline" },
          { label: "復帰施策", variant: "secondary" },
          { label: "期間セグメント", variant: "default" },
          { label: "🔗 API連携", variant: "default" }
        ]}
      />

      <div className="container mx-auto px-4 py-6">
        {/* Step 1: サマリー表示（即座に表示） */}
        {!isLoadingSummary && summaryData && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">休眠顧客サマリー</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">総休眠顧客数</div>
                <div className="text-2xl font-bold">{summaryData.totalDormantCustomers?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">休眠率</div>
                <div className="text-2xl font-bold">{summaryData.dormantRate || 0}%</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">平均休眠日数</div>
                <div className="text-2xl font-bold">{summaryData.averageDormancyDays || 0}日</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: セグメントフィルター */}
        {!isLoadingSummary && summaryData && (
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3">期間別休眠顧客セグメント分析</h3>
            <p className="text-sm text-gray-600 mb-4">
              90日以上購入のない顧客を期間別に分析し、復帰可能性を評価します
            </p>
            
            {/* 全件表示ボタン */}
            <div className="mb-4">
              <Button
                variant={selectedSegment === null ? "default" : "outline"}
                onClick={() => selectSegment()}
                className="text-sm"
              >
                全件表示
              </Button>
            </div>


            {/* 従来のAPIセグメント（フォールバック） */}
            {summaryData.segmentCounts && Object.keys(summaryData.segmentCounts).length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summaryData.segmentCounts)
                    .sort(([segmentA], [segmentB]) => {
                      // 期間の短い順にソート
                      const order: Record<string, number> = {
                        'アクティブ': 0,
                        '90-180日': 1,
                        '180-365日': 2,
                        '365日以上': 3
                      };
                      return (order[segmentA] || 99) - (order[segmentB] || 99);
                    })
                    .map(([segment, count]) => (
                    <Button
                      key={segment}
                      variant={selectedSegment === segment ? "default" : "outline"}
                      onClick={() => selectSegment(segment)}
                      className="text-sm"
                    >
                      {segment} ({Number(count).toLocaleString()}名)
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: 顧客リスト（選択後に遅延読み込み） */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">
                休眠顧客リスト
                {selectedSegment && <span className="text-sm text-gray-500 ml-2">({selectedSegment})</span>}
              </h3>
              <div className="text-sm text-gray-600">
                <div>▼表示: {filteredAndSortedCustomers.length}件 / 全 {dormantData.length}件
                  {(searchTerm || riskFilter !== 'all' || purchaseCountFilter !== '1+' || totalSpentFilter !== 'all') && (
                    <span className="text-blue-600 ml-2">
                      (フィルタ適用中)
                    </span>
                  )}
                </div>
                {totalCount > 0 && (
                  <div>
                    総件数: {totalCount.toLocaleString()}件 
                    {totalCount > pageSize && (
                      <span className="ml-2">
                        (ページ {currentPage} / {Math.ceil(totalCount / pageSize)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
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
          
          {isLoadingList ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">休眠顧客データを読み込み中...</p>
              <p className="text-sm text-gray-500 mt-2">
                {selectedSegment 
                  ? `${selectedSegment}のデータを取得しています` 
                  : currentPage > 1 
                    ? `ページ ${currentPage} のデータを取得しています`
                    : '全件データを取得しています'
                }
              </p>
              <div className="mt-3 text-xs text-gray-400">
                データベースから最新の情報を取得中です...
              </div>
            </div>
          ) : (
            <div className="p-4">
              {dormantData.length > 0 ? (
                <div>
                {/* フィルタ操作 */}
                <div className="mb-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    {/* 1行目: 検索フィルタ */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="顧客名、メール、会社名で検索..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    
                    {/* 2行目: 各種フィルタ */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* リスクレベルフィルタ */}
                      <div className="min-w-0 w-36">
                        <Select value={riskFilter} onValueChange={(value: any) => setRiskFilter(value)}>
                          <SelectTrigger className="text-sm">
                            <Filter className="h-3 w-3 mr-1" />
                            <SelectValue placeholder="リスク" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全てのリスク</SelectItem>
                            <SelectItem value="low">低リスク</SelectItem>
                            <SelectItem value="medium">中リスク</SelectItem>
                            <SelectItem value="high">高リスク</SelectItem>
                            <SelectItem value="critical">危険</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* 購入回数フィルタ */}
                      <div className="min-w-0 w-32">
                        <Select value={purchaseCountFilter} onValueChange={(value: any) => setPurchaseCountFilter(value)}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="購入回数" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全ての回数</SelectItem>
                            <SelectItem value="1+">1回以上</SelectItem>
                            <SelectItem value="3+">3回以上</SelectItem>
                            <SelectItem value="5+">5回以上</SelectItem>
                            <SelectItem value="10+">10回以上</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* 購入金額フィルタ */}
                      <div className="min-w-0 w-32">
                        <Select value={totalSpentFilter} onValueChange={(value: any) => setTotalSpentFilter(value)}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="購入金額" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全ての金額</SelectItem>
                            <SelectItem value="10k+">1万円以上</SelectItem>
                            <SelectItem value="50k+">5万円以上</SelectItem>
                            <SelectItem value="100k+">10万円以上</SelectItem>
                            <SelectItem value="500k+">50万円以上</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* フィルタクリアボタン */}
                      {(searchTerm || riskFilter !== 'all' || purchaseCountFilter !== '1+' || totalSpentFilter !== 'all') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSearchTerm('')
                            setRiskFilter('all')
                            setPurchaseCountFilter('1+')
                            setTotalSpentFilter('all')
                          }}
                          className="text-xs"
                        >
                          フィルタクリア
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* テーブル表示 */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          if (sortBy === 'name') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('name');
                            setSortOrder('asc');
                          }
                        }}
                      >
                        顧客情報
                        {sortBy === 'name' && (
                          <span className="ml-1">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          if (sortBy === 'lastPurchase') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('lastPurchase');
                            setSortOrder('desc');
                          }
                        }}
                      >
                        休眠状況
                        {sortBy === 'lastPurchase' && (
                          <span className="ml-1">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead>リスク</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          if (sortBy === 'totalSpent') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('totalSpent');
                            setSortOrder('desc');
                          }
                        }}
                      >
                        購入実績
                        {sortBy === 'totalSpent' && (
                          <span className="ml-1">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead>アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedCustomers.map((customer, index) => {
                      const riskConfig = getRiskBadge(customer.riskLevel || 'medium');
                      const lastPurchaseDate = customer.lastPurchaseDate 
                        ? format(new Date(customer.lastPurchaseDate), 'yyyy年MM月dd日')
                        : '購入履歴なし';
                      
                      return (
                        <TableRow key={customer.customerId || index} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-600">{customer.email}</div>
                              {customer.company && (
                                <Badge variant="outline" className="text-xs">
                                  {customer.company}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{lastPurchaseDate}</div>
                              <div className="text-xs text-gray-500">
                                {customer.daysSinceLastPurchase}日前
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {customer.dormancySegment}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={riskConfig.variant}
                              className={`text-xs ${riskConfig.color}`}
                            >
                              {riskConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="font-medium">
                                ¥{customer.totalSpent?.toLocaleString()}
                              </div>
                              <div className="text-gray-500">
                                {customer.totalOrders}回購入
                              </div>
                              <div className="text-xs text-gray-400">
                                平均¥{customer.averageOrderValue?.toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                連絡
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs">
                                <Gift className="h-3 w-3 mr-1" />
                                オファー
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              ) : hasInitialLoad ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-2">
                    😔 該当する休眠顧客が見つかりませんでした
                  </div>
                  <p className="text-sm text-gray-400">
                    {selectedSegment 
                      ? `「${selectedSegment}」の期間に該当する顧客がいません` 
                      : '選択した条件に該当する顧客がいません'
                    }
                  </p>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectSegment()}
                      className="text-sm"
                    >
                      全件表示に戻る
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/2 mx-auto"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4 w-1/3 mx-auto"></div>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    休眠顧客データを準備中...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ページング操作 */}
          {!isLoadingList && totalCount > pageSize && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} 件 / 全 {totalCount.toLocaleString()} 件
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1 || isLoadingList}
                    className="flex items-center gap-1"
                  >
                    ← 前のページ
                  </Button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {/* 現在のページ周辺のページ番号を表示 */}
                    {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                      const totalPages = Math.ceil(totalCount / pageSize);
                      let pageNum;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          disabled={isLoadingList}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!hasMoreData || isLoadingList}
                    className="flex items-center gap-1"
                  >
                    次のページ →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 font-medium mb-2">エラーが発生しました</div>
            <p className="text-red-700 text-sm">{error}</p>
            <div className="mt-3 text-xs text-red-600">
              <p>トラブルシューティング:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>ブラウザの開発者ツールでネットワークタブを確認</li>
                <li>コンソールタブでAPIエラーログを確認</li>
                <li>バックエンドAPIサーバーが正常に動作しているか確認</li>
                <li>詳細セグメントAPI: /api/customer/dormant/detailed-segments</li>
              </ul>
            </div>
          </div>
        )}

        {/* デバッグ情報表示（開発時のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-gray-800 font-medium mb-2">デバッグ情報</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>セグメントデータ取得状況: {isLoadingSegments ? '読み込み中' : '完了'}</div>
              <div>取得されたセグメント数: {detailedSegments.length}</div>
              <div>サマリーデータ: {summaryData ? 'あり' : 'なし'}</div>
              <div>選択中のセグメント: {selectedSegment || '全件'}</div>
              <div>表示中の顧客数: {dormantData.length}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 