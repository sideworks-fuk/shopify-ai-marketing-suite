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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { filters } = useDormantFilters()

  // API からデータを取得
  useEffect(() => {
    const fetchDormantData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔄 休眠顧客分析データの取得を開始...')
        
        // 並行して両方のAPIを呼び出し
        const [customersResponse, summaryResponse] = await Promise.all([
          api.dormantCustomers({
            storeId: 1,
            pageSize: 1000, // 全件取得
            sortBy: 'DaysSinceLastPurchase',
            descending: true
          }),
          api.dormantSummary(1)
        ])
        
        console.log('✅ 休眠顧客データ取得成功:', customersResponse)
        console.log('✅ サマリーデータ取得成功:', summaryResponse)
        
        setDormantData(customersResponse.data || [])
        setSummaryData(summaryResponse.data)
        
      } catch (err) {
        console.error('❌ 休眠顧客分析データの取得に失敗:', err)
        
        // より詳細なエラー情報を構築
        let errorMessage = 'データの取得に失敗しました'
        let errorDetails = ''
        
        if (err instanceof Error) {
          errorMessage = err.message
          errorDetails = err.stack || ''
        } else if (typeof err === 'string') {
          errorMessage = err
        } else if (err && typeof err === 'object') {
          errorMessage = JSON.stringify(err)
        }
        
        console.error('📋 エラー詳細:', {
          message: errorMessage,
          details: errorDetails,
          type: typeof err,
          constructor: err?.constructor?.name
        })
        
        setError(`${errorMessage}\n\n詳細: ${errorDetails}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDormantData()
  }, [])

  // フィルタリングされた顧客データ
  const filteredCustomers = useMemo(() => {
    if (!dormantData) return []
    
    const selectedSegment = filters.selectedSegment
    return selectedSegment 
      ? dormantData.filter(customer => {
          const daysSince = customer.daysSinceLastPurchase || customer.dormancy?.daysSincePurchase || 0
          return daysSince >= selectedSegment.range[0] && daysSince < selectedSegment.range[1]
        })
      : dormantData
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
        <DormantPeriodFilter />
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