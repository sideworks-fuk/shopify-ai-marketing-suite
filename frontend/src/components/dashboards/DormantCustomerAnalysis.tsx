"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Settings, 
  ChevronUp, 
  ChevronDown, 
  Play, 
  FileSpreadsheet, 
  Download, 
  RefreshCw,
  MessageSquare,
  Users,
  Clock,
  TrendingDown,
  AlertTriangle,
  Loader2
} from "lucide-react"

// 休眠顧客分析コンポーネントのインポート
import { DormantPeriodFilter } from "@/components/dashboards/dormant/DormantPeriodFilter"
import { DormantKPICards } from "@/components/dashboards/dormant/DormantKPICards"
import { DormantAnalysisChart } from "@/components/dashboards/dormant/DormantAnalysisChart"
import { DormantCustomerList } from "@/components/dashboards/dormant/DormantCustomerList"
import { DormantCustomerTableVirtual } from "@/components/dashboards/dormant/DormantCustomerTableVirtual"
import { ReactivationInsights } from "@/components/dashboards/dormant/ReactivationInsights"
import { DormantCustomerTableSkeleton, DormantKPISkeleton, DormantTableSkeleton } from "@/components/dashboards/dormant/DormantCustomerTableSkeleton"

import { api } from "@/lib/api-client"
import { useDormantFilters } from "@/contexts/FilterContext"
import { useAppStore } from "@/stores/appStore"
import { handleApiError, handleError } from "@/lib/error-handler"
import { getCurrentStoreId } from "@/lib/api-config"

// デバウンス用のユーティリティ関数
function debounce<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<void> {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    return new Promise<void>((resolve) => {
      if (timeout) clearTimeout(timeout)
      
      timeout = setTimeout(async () => {
        await func(...args)
        resolve()
      }, wait)
    })
  }
}

// React.memoでメモ化したコンポーネント
const DormantCustomerAnalysis = React.memo(function DormantCustomerAnalysis() {
  const [showConditions, setShowConditions] = useState(true)
  const [dormantData, setDormantData] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [segmentDistributions, setSegmentDistributions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [useVirtualScroll, setUseVirtualScroll] = useState(false)
  
  const { filters } = useDormantFilters()
  const showToast = useAppStore((state) => state.showToast)
  
  // 無限スクロール用のRef
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  // パフォーマンスメトリクス
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalLoaded: 0,
    loadTime: 0,
    memoryUsage: 0,
    lastLoadTime: 0
  })
  
  // グローバルローディング状態
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("")
  const [progressValue, setProgressValue] = useState(0)
  
  // キャンセル機能用のAbortController
  const abortControllerRef = useRef<AbortController | null>(null)

  // エラーハンドラーの初期化
  useEffect(() => {
    // 統一エラーハンドラーにトースト機能を設定
    const { errorHandler } = require('@/lib/error-handler')
    errorHandler.setToastHandler(showToast)
  }, [showToast])

  // API からデータを取得
  useEffect(() => {
    const fetchDormantData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔄 休眠顧客分析データの取得を開始...')
        
        // パフォーマンス計測開始
        const startTime = performance.now()
        
        try {
          // 並行して両方のAPIを呼び出し
          const [customersResponse, summaryResponse] = await Promise.all([
            api.dormantCustomers({
              storeId: getCurrentStoreId(),
              pageSize: 100, // パフォーマンス改善のため適切なサイズに調整
              sortBy: 'DaysSinceLastPurchase',
              descending: false // 昇順で表示（休眠期間の短い順）
            }),
            api.dormantSummary(getCurrentStoreId())
          ])
        
        console.log('✅ 休眠顧客データ取得成功:', customersResponse)
        console.log('✅ サマリーデータ取得成功:', summaryResponse)
        
        // APIレスポンスから顧客データを正しく取得
        const customersData = customersResponse.data?.customers || []
        const pagination = customersResponse.data?.pagination
        
        // サマリーデータからセグメント分布を配列形式に変換
        const summarySegments = summaryResponse.data?.segmentCounts || {}
        const segmentData = Object.entries(summarySegments).map(([segment, count]) => ({
          segment,
          count: Number(count),
          percentage: summaryResponse.data?.totalDormantCustomers > 0 
            ? Number((Number(count) / summaryResponse.data.totalDormantCustomers * 100).toFixed(1))
            : 0,
          revenue: summaryResponse.data?.segmentRevenue?.[segment] || 0
        }))
        
        console.log('📊 取得した顧客数:', customersData.length)
        console.log('📊 ページネーション情報:', pagination)
        console.log('📊 変換前セグメントカウント:', summarySegments)
        console.log('📊 変換後セグメント分布:', segmentData)
        console.log('📊 合計休眠顧客数:', summaryResponse.data?.totalDormantCustomers)
        
        setDormantData(customersData)
        setSummaryData(summaryResponse.data)
        setSegmentDistributions(segmentData)
        
        // パフォーマンス計測終了と初期メトリクス設定
        const endTime = performance.now()
        const loadTime = endTime - startTime
        setPerformanceMetrics({
          totalLoaded: customersData.length,
          loadTime: loadTime,
          lastLoadTime: loadTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        })
        
        // 初期ページネーション情報の設定
        if (pagination) {
          setCurrentPage(pagination.currentPage || 1)
          setHasMoreData(pagination.hasNextPage || false)
        } else {
          // ページネーション情報がない場合は、データ数で判断
          setHasMoreData(customersData.length === 100) // pageSize分だけ取得できた場合は続きがある可能性
        }
        
        } catch (apiError) {
          // 統一エラーハンドラーで処理 - モックデータフォールバック付き
          await handleApiError(apiError, '/api/dormant', 'GET', {
            context: 'DormantCustomerAnalysis',
            severity: 'error',
            userMessage: 'APIエラーのためモックデータで表示しています',
            fallback: { 
              enabled: true, 
              useMockData: true,
              customHandler: () => {
                // モックデータの設定
                const mockCustomersData = Array.from({ length: 10 }, (_, index) => ({
                  customerId: `mock-${index + 1}`,
                  name: `モック顧客 ${index + 1}`,
                  email: `mock${index + 1}@example.com`,
                  lastPurchaseDate: new Date(2024, 0, 1 + index).toISOString(),
                  daysSinceLastPurchase: 90 + index * 15,
                  dormancySegment: index < 3 ? '90-180日' : index < 7 ? '180-365日' : '365日以上',
                  riskLevel: ['low', 'medium', 'high', 'critical'][index % 4],
                  churnProbability: 0.2 + (index * 0.1),
                  totalSpent: 50000 + index * 10000,
                  totalOrders: 2 + index,
                  averageOrderValue: 25000 + index * 2000
                }))
                
                const mockSummaryData = {
                  totalDormantCustomers: 1500,
                  segmentCounts: {
                    '90-180日': 600,
                    '180-365日': 500,
                    '365日以上': 400
                  },
                  segmentRevenue: {
                    '90-180日': 30000000,
                    '180-365日': 25000000,
                    '365日以上': 20000000
                  }
                }
                
                const mockSegmentData = [
                  { segment: '90-180日', count: 600, percentage: 40, revenue: 30000000 },
                  { segment: '180-365日', count: 500, percentage: 33.3, revenue: 25000000 },
                  { segment: '365日以上', count: 400, percentage: 26.7, revenue: 20000000 }
                ]
                
                setDormantData(mockCustomersData)
                setSummaryData(mockSummaryData)
                setSegmentDistributions(mockSegmentData)
                setHasMoreData(false)
              }
            }
          })
        }
        
      } catch (error) {
        // 統一エラーハンドラーで最終エラー処理
        await handleError(error, {
          context: 'DormantCustomerAnalysis - fetchDormantData',
          severity: 'error',
          showToUser: true,
          notifyType: 'inline' // インライン表示用
        })
        
        // エラー状態を設定（コンポーネントで表示用）
        if (error instanceof Error && error.message.includes('timeout')) {
          setError('リクエストがタイムアウトしました。ページサイズを小さくするか、しばらく待ってから再試行してください。')
        } else if (error instanceof Error && error.message.includes('Invalid JSON')) {
          setError('APIサーバーとの通信に問題があります。')
        } else {
          setError(error instanceof Error ? error.message : '予期しないエラーが発生しました')
        }
        
        setIsLoading(false)
      }
    }

    fetchDormantData()
  }, [])

  // 追加データを読み込む関数（もっと見る機能）
  const loadMoreData = useCallback(async () => {
    if (isLoadingMore || !hasMoreData) return
    
    try {
      setIsLoadingMore(true)
      const nextPage = currentPage + 1
      
      // パフォーマンス計測開始
      const startTime = performance.now()
      console.log('🔄 追加データの取得を開始...', { nextPage })
      
      const response = await api.dormantCustomers({
        storeId: getCurrentStoreId(),
        pageSize: 20,
        pageNumber: nextPage,
        sortBy: 'DaysSinceLastPurchase',
        descending: false // 初期データと同じ昇順に統一
      })
      
      const newCustomers = response.data?.customers || []
      console.log('✅ 追加データ取得成功:', { newCount: newCustomers.length })
      
      // パフォーマンス計測終了
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      if (newCustomers.length === 0) {
        setHasMoreData(false)
        console.log('🔚 これ以上データがありません')
      } else {
        setDormantData(prev => {
          const newTotal = [...prev, ...newCustomers]
          
          // パフォーマンスメトリクス更新
          setPerformanceMetrics(prevMetrics => ({
            totalLoaded: newTotal.length,
            loadTime: prevMetrics.loadTime + loadTime,
            lastLoadTime: loadTime,
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
          }))
          
          return newTotal
        })
        setCurrentPage(nextPage)
        
        // ページネーション情報から残りページを確認
        const pagination = response.data?.pagination
        if (pagination && nextPage >= pagination.totalPages) {
          setHasMoreData(false)
        }
      }
    } catch (error) {
      // 統一エラーハンドラーで追加データ取得エラーを処理
      await handleApiError(error, '/api/dormant/more', 'GET', {
        context: 'DormantCustomerAnalysis - loadMoreData',
        severity: 'warning', // 追加データなので警告レベル
        userMessage: '追加データの取得に失敗しました。再度お試しください。',
        showToUser: true,
        notifyType: 'toast'
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMoreData, currentPage])

  // タイムアウト付きフェッチ関数
  const fetchWithTimeout = useCallback(async (
    fetchFunction: () => Promise<any>, 
    timeout = 30000
  ) => {
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeout)
    
    try {
      const result = await fetchFunction()
      clearTimeout(timeoutId)
      return result
    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error('データ取得がタイムアウトしました。処理を中止しました。')
      }
      throw error
    } finally {
      abortControllerRef.current = null
    }
  }, [])

  // 処理のキャンセル機能
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('🛑 処理をキャンセルしています...')
      abortControllerRef.current.abort()
      setIsProcessing(false)
      setProcessingMessage("")
      setProgressValue(0)
      showToast('処理をキャンセルしました。', 'info')
    }
  }, [showToast])

  // 365日以上データの特別処理（大量データ対応）
  const fetchLargeDataset = useCallback(async (segment: string) => {
    console.log('🔄 大量データセット取得開始:', segment)
    const BATCH_SIZE = 50 // バッチサイズを小さくしてUIの応答性を向上
    let allData: any[] = []
    let page = 1
    let hasMore = true
    
    while (hasMore) {
      // プログレス更新（推定進捗）
      const estimatedProgress = Math.min((page - 1) * 10, 80)
      setProgressValue(estimatedProgress)
      setProcessingMessage(
        `大量データを処理中... ${allData.length}件取得済み (ページ${page})`
      )
      
      try {
        const batch = await api.dormantCustomers({
          storeId: getCurrentStoreId(),
          pageNumber: page,
          pageSize: BATCH_SIZE,
          segment: segment,
          sortBy: 'DaysSinceLastPurchase',
          descending: false
        })
        
        const newCustomers = batch.data?.customers || []
        allData = [...allData, ...newCustomers]
        
        hasMore = newCustomers.length === BATCH_SIZE
        page++
        
        console.log(`📊 バッチ${page-1}完了: ${newCustomers.length}件追加, 合計${allData.length}件`)
        
        // UIの更新を許可（フリーズ防止）
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // 1000件以上の場合は制限
        if (allData.length >= 1000) {
          console.log('⚠️ 1000件制限に達しました')
          hasMore = false
        }
        
      } catch (error) {
        console.error('❌ バッチ処理エラー:', error)
        throw error
      }
    }
    
    setProgressValue(100)
    console.log('✅ 大量データ取得完了:', allData.length, '件')
    return allData
  }, [])

  // セグメント選択時のデータ取得処理
  const handleSegmentSelect = useCallback(async (segment: any) => {
    if (!segment) {
      // セグメントクリア時はリセット
      console.log('🔄 セグメントクリア - 全データ表示')
      return
    }
    
    try {
      setIsProcessing(true)
      setProgressValue(0)
      
      // 365日以上の場合は特別な処理（タイムアウト対応）
      if (segment.label === "365日以上") {
        setProcessingMessage("大量のデータを処理しています。キャンセル可能です...")
        
        const largeData = await fetchWithTimeout(
          () => fetchLargeDataset(segment.label),
          60000 // 60秒タイムアウト（大量データのため長め）
        )
        
        // バッチで表示データを更新（UIの応答性向上）
        setDormantData(largeData)
        
      } else {
        setProcessingMessage("データを取得しています...")
        setProgressValue(50)
        
        // 通常のセグメントデータ取得（タイムアウト対応）
        const response = await fetchWithTimeout(
          () => api.dormantCustomers({
            storeId: getCurrentStoreId(),
            pageSize: 200, // 365日以上以外は200件程度で十分
            segment: segment.label,
            sortBy: 'DaysSinceLastPurchase',
            descending: false
          }),
          15000 // 15秒タイムアウト
        )
        
        const customersData = response.data?.customers || []
        setDormantData(customersData)
        setProgressValue(100)
      }
      
      console.log('✅ セグメント選択完了:', segment.label)
      
    } catch (error) {
      console.error('❌ セグメント選択エラー:', error)
      await handleApiError(error, '/api/dormant/segment', 'GET', {
        context: 'DormantCustomerAnalysis - handleSegmentSelect',
        severity: 'error',
        userMessage: 'セグメントデータの取得に失敗しました。',
        showToUser: true,
        notifyType: 'toast'
      })
    } finally {
      setIsProcessing(false)
      setProcessingMessage("")
      setProgressValue(0)
    }
  }, [fetchLargeDataset, fetchWithTimeout])

  // デバウンスされたセグメント選択関数（連続クリック防止）
  const debouncedSegmentSelect = useMemo(
    () => debounce(async (segment: any) => {
      console.log('🔄 デバウンス処理実行:', segment?.label || 'クリア')
      await handleSegmentSelect(segment)
    }, 300), // 300ms の遅延
    [handleSegmentSelect]
  )

  // 無限スクロール用のIntersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMoreData && !isLoadingMore) {
          console.log('🔄 無限スクロール: 自動読み込み開始')
          loadMoreData()
        }
      },
      {
        threshold: 0,
        rootMargin: '100px' // 100px前に発火
      }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMoreData, isLoadingMore, loadMoreData])

  // フィルタリングされた顧客データ
  const filteredCustomers = useMemo(() => {
    if (!dormantData) return []
    
    const selectedSegment = filters.selectedSegment
    console.log('🔍 フィルタリング開始:', {
      selectedSegment,
      totalCustomers: dormantData.length,
      sampleCustomers: dormantData.slice(0, 3).map(c => ({
        id: c.customerId,
        dormancySegment: c.dormancySegment,
        daysSince: c.daysSinceLastPurchase
      }))
    })
    
    if (!selectedSegment) {
      console.log('✅ セグメント未選択 - 全件表示:', dormantData.length)
      return dormantData
    }
    
    const filtered = dormantData.filter(customer => {
      // APIの dormancySegment フィールドを優先的に使用
      const customerSegment = customer.dormancySegment
      const daysSince = customer.daysSinceLastPurchase || customer.dormancy?.daysSincePurchase || 0
      
      let matches = false
      
      if (customerSegment) {
        // セグメント名の完全一致を確認
        matches = customerSegment === selectedSegment.label
        console.log('🔍 セグメントマッチング:', {
          customerId: customer.customerId,
          customerSegment,
          selectedLabel: selectedSegment.label,
          matches,
          daysSince
        })
      } else {
        // フォールバック: daysSinceLastPurchase による範囲チェック
        matches = daysSince >= selectedSegment.range[0] && 
                 (selectedSegment.range[1] === 9999 || daysSince <= selectedSegment.range[1])
        console.log('🔍 範囲マッチング:', {
          customerId: customer.customerId,
          daysSince,
          range: selectedSegment.range,
          matches
        })
      }
      
      return matches
    })
    
    console.log('✅ フィルタリング結果:', {
      selectedSegment: selectedSegment.label,
      filteredCount: filtered.length,
      totalCount: dormantData.length,
      expectedCount: selectedSegment.count // フィルター欄に表示されている人数
    })
    
    return filtered
  }, [dormantData, filters.selectedSegment])

  // ローディング状態 - スケルトンローダーを表示
  if (isLoading) {
    return <DormantCustomerTableSkeleton />
  }

  // エラー状態
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="text-center max-w-2xl">
                <div className="text-red-500 text-lg mb-4">❌ データの取得に失敗しました</div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <pre className="text-sm text-red-700 whitespace-pre-wrap overflow-auto max-h-40">
                    {error}
                  </pre>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <p>💡 トラブルシューティング:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>ブラウザの開発者ツールでネットワークタブを確認</li>
                    <li>コンソールタブでエラーログを確認</li>
                    <li>APIサーバーが正常に動作しているか確認</li>
                  </ul>
                </div>
                <div className="space-x-4">
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                  >
                    再読み込み
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('🔍 デバッグ情報:');
                      console.log('  - Current URL:', window.location.href);
                      console.log('  - User Agent:', navigator.userAgent);
                    }} 
                    variant="secondary"
                    size="sm"
                  >
                    デバッグ情報
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* グローバルプログレスバー */}
      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">{processingMessage}</span>
                </div>
                {/* キャンセルボタン */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelProcessing}
                  className="text-xs"
                >
                  キャンセル
                </Button>
              </div>
              <Progress value={progressValue} className="mt-2 h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>進捗: {progressValue.toFixed(0)}%</span>
                <span>処理中... 長時間かかる場合はキャンセルしてください</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分析条件設定エリア */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-6 py-3">
          <CardTitle className="text-lg font-semibold">分析条件設定</CardTitle>
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
            {/* 3列グリッドレイアウト：分析期間(2fr) + 休眠セグメント(1fr) + 表示オプション(1fr) */}
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分析期間
                </label>
                <div className="text-sm text-gray-600">
                  過去24ヶ月の購買データを分析対象とします
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  休眠セグメント
                </label>
                <div className="text-sm text-gray-600">
                  {filters.selectedSegment ? filters.selectedSegment.label : "全セグメント"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象条件
                </label>
                <div className="text-sm text-gray-600">
                  90日以上購入なし
                </div>
              </div>
            </div>

            {/* アクションボタン - 非表示 */}
            {/* <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <Button variant="default" size="sm">
                <Play className="h-4 w-4 mr-2" />
                分析実行
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                CSV出力
              </Button>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel出力
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                復帰メール
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                データ更新
              </Button>
            </div> */}
          </CardContent>
        )}
      </Card>

      {/* KPI サマリーカード - オプション機能として一時非表示 */}
      {/* <DormantKPICards /> */}

      {/* 期間別セグメントフィルター */}
      <div>
        <h2 className="text-xl font-semibold mb-4">期間別セグメント</h2>
        <DormantPeriodFilter 
          segmentDistributions={segmentDistributions}
          onSegmentSelect={debouncedSegmentSelect}
          isDataLoading={isLoading || isProcessing}
        />
      </div>

      {/* 分析チャート - オプション機能として一時非表示 */}
      {/* <DormantAnalysisChart /> */}

      {/* 復帰インサイト - オプション機能として一時非表示 */}
      {/* <ReactivationInsights /> */}

      {/* 休眠顧客一覧 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            休眠顧客一覧
            {filters.selectedSegment && (
              <Badge variant="outline" className="ml-2">
                {filters.selectedSegment.label}フィルター適用中
              </Badge>
            )}
          </h2>
          {/* 仮想スクロール切り替えボタン（100件以上のデータの場合に表示） */}
          {filteredCustomers.length > 100 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseVirtualScroll(!useVirtualScroll)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {useVirtualScroll ? '通常表示に切替' : '高速表示に切替'}
              <Badge variant="secondary" className="ml-1">
                {useVirtualScroll ? 'Virtual' : 'Normal'}
              </Badge>
            </Button>
          )}
        </div>
        {/* 期間選択中はスケルトンローダーを表示 */}
        {isProcessing ? (
          <DormantTableSkeleton />
        ) : (
          useVirtualScroll ? (
            <DormantCustomerTableVirtual 
              selectedSegment={filters.selectedSegment}
              dormantData={filteredCustomers}
              containerHeight={800}
            />
          ) : (
            <DormantCustomerList 
              selectedSegment={filters.selectedSegment}
              dormantData={filteredCustomers}
            />
          )
        )}
        
        {/* さらに表示ボタン */}
        {hasMoreData && dormantData.length >= 100 && (
          <div className="mt-6 text-center">
            <Button
              onClick={loadMoreData}
              disabled={isLoadingMore}
              variant="outline"
              size="lg"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  読み込み中...
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  さらに表示
                </>
              )}
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              全{dormantData.length}件のうち{filteredCustomers.length}件を表示中
              {hasMoreData && ' / さらにデータがあります'}
            </p>
          </div>
        )}
        
        {/* 無限スクロール用の参照要素 */}
        <div ref={loadMoreRef} className="h-10 flex justify-center items-center">
          {isLoadingMore && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              追加データを読み込んでいます...
            </div>
          )}
        </div>
        
        {/* パフォーマンスメトリクス表示（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && performanceMetrics.totalLoaded > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium">パフォーマンスメトリクス</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <div className="font-medium">読み込み件数</div>
                <div className="text-blue-600">{performanceMetrics.totalLoaded}件</div>
              </div>
              <div>
                <div className="font-medium">累積読み込み時間</div>
                <div className="text-green-600">{performanceMetrics.loadTime.toFixed(1)}ms</div>
              </div>
              <div>
                <div className="font-medium">最終読み込み時間</div>
                <div className="text-orange-600">{performanceMetrics.lastLoadTime.toFixed(1)}ms</div>
              </div>
              <div>
                <div className="font-medium">メモリ使用量</div>
                <div className="text-purple-600">
                  {performanceMetrics.memoryUsage ? 
                    `${(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 
                    'N/A'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* フッター情報 - オプション機能として一時非表示 */}
      {/* <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800">データ更新</h4>
              <p className="text-sm text-slate-600">毎日午前2時に自動更新</p>
            </div>
            <div>
              <TrendingDown className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800">分析期間</h4>
              <p className="text-sm text-slate-600">過去24ヶ月の購買データ</p>
            </div>
            <div>
              <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800">対象顧客</h4>
              <p className="text-sm text-slate-600">90日以上購入のない顧客</p>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
})

// デフォルトエクスポート
export default DormantCustomerAnalysis