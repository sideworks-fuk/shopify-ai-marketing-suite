"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  AlertTriangle
} from "lucide-react"

// 休眠顧客分析コンポーネントのインポート
import { DormantPeriodFilter } from "@/components/dashboards/dormant/DormantPeriodFilter"
import { DormantKPICards } from "@/components/dashboards/dormant/DormantKPICards"
import { DormantAnalysisChart } from "@/components/dashboards/dormant/DormantAnalysisChart"
import { DormantCustomerList } from "@/components/dashboards/dormant/DormantCustomerList"
import { ReactivationInsights } from "@/components/dashboards/dormant/ReactivationInsights"

import { api } from "@/lib/api-client"
import { useDormantFilters } from "@/contexts/FilterContext"

export default function DormantCustomerAnalysis() {
  const [showConditions, setShowConditions] = useState(true)
  const [dormantData, setDormantData] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [segmentDistributions, setSegmentDistributions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreData, setHasMoreData] = useState(true)
  
  const { filters } = useDormantFilters()

  // API からデータを取得
  useEffect(() => {
    const fetchDormantData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔄 休眠顧客分析データの取得を開始...')
        
        try {
          // 並行して両方のAPIを呼び出し
          const [customersResponse, summaryResponse] = await Promise.all([
            api.dormantCustomers({
              storeId: 1,
              pageSize: 100, // パフォーマンス改善のため適切なサイズに調整
              sortBy: 'DaysSinceLastPurchase',
              descending: false // 昇順で表示（休眠期間の短い順）
            }),
            api.dormantSummary(1)
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
            ? (Number(count) / summaryResponse.data.totalDormantCustomers * 100) 
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
        
        // 初期ページネーション情報の設定
        if (pagination) {
          setCurrentPage(pagination.currentPage || 1)
          setHasMoreData(pagination.hasNextPage || false)
        } else {
          // ページネーション情報がない場合は、データ数で判断
          setHasMoreData(customersData.length === 20) // pageSize分だけ取得できた場合は続きがある可能性
        }
        
        } catch (apiError) {
          console.error('❌ API呼び出しエラー、モックデータを使用:', apiError);
          
          // API エラー時のモックデータフォールバック
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
          setHasMoreData(false) // モックデータは固定なので追加読み込みなし
          
          console.warn('🚧 APIエラーによりモックデータを表示中')
        }
        
      } catch (error) {
        console.error('❌ 休眠顧客データ取得エラー:', error);
        
        // 最終的なエラー処理
        if (error instanceof Error && error.message.includes('timeout')) {
          setError('データの取得に失敗しました。リクエストがタイムアウトしました。データが多いため時間がかかっています。詳細: ページサイズを小さくするか、しばらく待ってから再試行してください。');
        } else if (error instanceof Error && error.message.includes('Invalid JSON')) {
          setError('APIサーバーとの通信に問題があります。バックエンドAPIの状態を確認してください。');
        } else {
          setError(`データの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
        
        setIsLoading(false);
      }
    }

    fetchDormantData()
  }, [])

  // 追加データを読み込む関数（もっと見る機能）
  const loadMoreData = async () => {
    if (isLoadingMore || !hasMoreData) return
    
    try {
      setIsLoadingMore(true)
      const nextPage = currentPage + 1
      
      console.log('🔄 追加データの取得を開始...', { nextPage })
      
      const response = await api.dormantCustomers({
        storeId: 1,
        pageSize: 20,
        pageNumber: nextPage,
        sortBy: 'DaysSinceLastPurchase',
        descending: true
      })
      
      const newCustomers = response.data?.customers || []
      console.log('✅ 追加データ取得成功:', { newCount: newCustomers.length })
      
      if (newCustomers.length === 0) {
        setHasMoreData(false)
        console.log('🔚 これ以上データがありません')
      } else {
        setDormantData(prev => [...prev, ...newCustomers])
        setCurrentPage(nextPage)
        
        // ページネーション情報から残りページを確認
        const pagination = response.data?.pagination
        if (pagination && nextPage >= pagination.totalPages) {
          setHasMoreData(false)
        }
      }
    } catch (error) {
      console.error('❌ 追加データ取得エラー:', error)
      setError('追加データの取得に失敗しました')
    } finally {
      setIsLoadingMore(false)
    }
  }

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

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">分析データを読み込み中...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
        <DormantPeriodFilter segmentDistributions={segmentDistributions} />
      </div>

      {/* 分析チャート - オプション機能として一時非表示 */}
      {/* <DormantAnalysisChart /> */}

      {/* 復帰インサイト - オプション機能として一時非表示 */}
      {/* <ReactivationInsights /> */}

      {/* 休眠顧客一覧 */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          休眠顧客一覧
          {filters.selectedSegment && (
            <Badge variant="outline" className="ml-2">
              {filters.selectedSegment.label}フィルター適用中
            </Badge>
          )}
        </h2>
        <DormantCustomerList 
          selectedSegment={filters.selectedSegment}
          dormantData={dormantData}
        />
        
        {/* もっと見るボタン */}
        {hasMoreData && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={loadMoreData}
              disabled={isLoadingMore}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  読み込み中...
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  もっと見る（20件追加）
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* データの読み込み状況表示 */}
        {!hasMoreData && filteredCustomers.length > 20 && (
          <div className="text-center mt-4 text-sm text-gray-500">
            全 {filteredCustomers.length} 件のデータを表示しています
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
}