"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// 統一された休眠顧客分析コンポーネント
import DormantCustomerAnalysis from "@/components/dashboards/DormantCustomerAnalysis"
import { AnalyticsHeaderUnified } from "@/components/layout/AnalyticsHeaderUnified"

import { api } from "@/lib/api-client"
import { API_CONFIG } from "@/lib/api-config"
import { useDormantFilters } from "@/contexts/FilterContext"
import { useState, useEffect } from "react"

export default function DormantCustomersPage() {
  // ✅ Props Drilling解消: フィルター状態は FilterContext で管理
  const { filters } = useDormantFilters()
  
  // API データ管理
  const [dormantData, setDormantData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // API からデータを取得
  useEffect(() => {
    const fetchDormantData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('🔄 休眠顧客データの取得を開始...')
        
        const response = await api.dormantCustomers({
          storeId: 1,
          pageSize: 1000, // 全件取得してフィルタリング
          sortBy: 'DaysSinceLastPurchase',
          descending: true
        })
        
        console.log('✅ APIレスポンス取得成功:', response)
        setDormantData(response.data || [])
        
      } catch (err) {
        console.error('❌ 休眠顧客データの取得に失敗:', err)
        
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

  // フィルタリングされた顧客データ（表示用）- useMemoで最適化
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
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">休眠顧客データを読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  // エラー状態
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
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
                  console.log('  - API Config:', { API_CONFIG });
                }} 
                variant="secondary"
                size="sm"
              >
                デバッグ情報
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統一ヘッダー */}
      <AnalyticsHeaderUnified 
        mainTitle="休眠顧客分析【顧客】"
        description="最終購入からの経過期間別に顧客を分析し、復帰施策の効果的な立案と実行に活用できます"
        currentAnalysis={{
          title: "期間別休眠顧客セグメント分析",
          description: "90日以上購入のない顧客を期間別に分析し、復帰可能性を評価します",
          targetCount: filteredCustomers.length
        }}
        badges={[
          { label: `${filteredCustomers.length}名`, variant: "outline" as const },
          { label: "復帰施策", variant: "secondary" as const },
          { label: "期間セグメント", variant: "default" as const },
          { label: "🔗 API連携", variant: "default" as const }
        ]}
      />

      {/* 統一された休眠顧客分析コンポーネント */}
      <DormantCustomerAnalysis />
    </div>
  )
} 