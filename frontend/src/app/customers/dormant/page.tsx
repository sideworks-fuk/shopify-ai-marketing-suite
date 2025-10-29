"use client"

import React, { useMemo, useState, useEffect, useCallback, Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// React.lazy を使用したコード分割
const DormantCustomerAnalysis = React.lazy(() => import("@/components/dashboards/DormantCustomerAnalysis"))
const DormantCustomerList = React.lazy(() => import("@/components/dashboards/dormant/DormantCustomerList").then(module => ({ default: module.DormantCustomerList })))
const AnalyticsHeaderUnified = React.lazy(() => import("@/components/layout/AnalyticsHeaderUnified").then(module => ({ default: module.AnalyticsHeaderUnified })))
const FeatureLockedScreen = React.lazy(() => import("@/components/billing/FeatureLockedScreen"))

// ローディングコンポーネント
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

import { API_CONFIG, getCurrentStoreId } from "@/lib/api-config"
import { useDormantFilters } from "@/contexts/FilterContext"
import { useFeatureAccess } from "@/hooks/useFeatureAccess"
import { useAuth } from "@/components/providers/AuthProvider"

export default function DormantCustomersPage() {
  // 機能アクセス制御
  const { hasAccess, isLoading: isAccessLoading } = useFeatureAccess('dormant_analysis')
  const { getApiClient } = useAuth()
  const api = getApiClient()
  
  // ✅ Props Drilling解消: フィルター状態は FilterContext で管理
  // Note: All hooks must be called before any conditional returns
  const { filters } = useDormantFilters()
  
  // 段階的データ読み込みのための状態管理
  const [summaryData, setSummaryData] = useState<any>(null)
  const [dormantData, setDormantData] = useState<any[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)

  // 主要3区分セグメント定義
  const [detailedSegments, setDetailedSegments] = useState<any[]>([])
  const [isLoadingSegments, setIsLoadingSegments] = useState(false)

  // 購入履歴のある顧客のみで平均休眠日数を計算
  const calculateAdjustedAverageDormancyDays = useCallback((summaryData: any) => {
    if (!summaryData || !summaryData.segmentCounts) {
      return (summaryData?.averageDormancyDays || 0).toLocaleString()
    }

    try {
      // セグメント別の顧客数を取得（購入履歴のある顧客のみ）
      const segmentCounts = summaryData.segmentCounts
      const purchasedCustomerSegments = ['90-180日', '180-365日', '365日以上']
      
      let totalCustomers = 0
      let weightedDaysSum = 0
      
      // 各セグメントの中央値を使って重み付き平均を計算
      purchasedCustomerSegments.forEach(segment => {
        const count = Number(segmentCounts[segment] || 0)
        if (count > 0) {
          totalCustomers += count
          
          // セグメントの中央値を計算
          let avgDaysForSegment = 0
          switch (segment) {
            case '90-180日':
              avgDaysForSegment = 135 // (90 + 180) / 2
              break
            case '180-365日':
              avgDaysForSegment = 272 // (180 + 365) / 2
              break
            case '365日以上':
              avgDaysForSegment = 450 // 365日以上の平均的な値
              break
          }
          
          weightedDaysSum += count * avgDaysForSegment
        }
      })
      
      if (totalCustomers > 0) {
        const adjustedAverage = Math.round(weightedDaysSum / totalCustomers)
        console.log('📊 平均休眠日数の計算詳細:', {
          originalAverage: summaryData.averageDormancyDays,
          adjustedAverage,
          totalPurchasedCustomers: totalCustomers,
          weightedDaysSum,
          segmentBreakdown: purchasedCustomerSegments.map(segment => ({
            segment,
            count: segmentCounts[segment],
            avgDays: segment === '90-180日' ? 135 : segment === '180-365日' ? 272 : 450
          })),
          improvement: `${Math.abs(summaryData.averageDormancyDays - adjustedAverage)}日の調整`
        })
        return adjustedAverage.toLocaleString()
      }
    } catch (error) {
      console.error('平均休眠日数の計算エラー:', error)
    }
    
    // フォールバック: 元の値を使用
    return (summaryData?.averageDormancyDays || 0).toLocaleString()
  }, [])

  // Step 1: サマリーデータのみ先に取得（軽量・高速）
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setIsLoadingSummary(true)
        setError(null)
        
        console.log('🔄 休眠顧客サマリーデータの取得を開始...')
        
        const response = await api.dormantSummary(getCurrentStoreId())
        console.log('✅ サマリーデータ取得成功:', response)
        console.log('📊 サマリーデータの内容:', {
          success: response.success,
          data: response.data,
          segmentCounts: response.data?.segmentCounts,
          totalDormantCustomers: response.data?.totalDormantCustomers
        })
        
        setSummaryData(response.data)
        
      } catch (err) {
        console.error('❌ サマリーデータの取得に失敗:', err)
        // 重要なエラーのみユーザーに表示
        if (err instanceof Error && err.message.includes('Network')) {
          setError('ネットワークエラー: サーバーに接続できません')
        } else {
          console.warn('サマリーデータの取得に失敗しましたが、モックデータで継続します')
        }
      } finally {
        setIsLoadingSummary(false)
      }
    }

    fetchSummaryData()
  }, [])

  // Step 1.5: 主要期間区分データを取得
  useEffect(() => {
    const fetchDetailedSegments = async () => {
      try {
        setIsLoadingSegments(true)
        setError(null)
        
        console.log('🔄 主要期間区分データの取得を開始...')
        const storeId = getCurrentStoreId()
        console.log('🔍 APIエンドポイント:', `/api/customer/dormant/detailed-segments?storeId=${storeId}`)
        
        const response = await api.dormantDetailedSegments(storeId)
        console.log('✅ 主要期間区分データ取得成功:', response)
        console.log('📊 レスポンスデータ構造:', {
          success: response.success,
          dataType: typeof response.data,
          dataIsArray: Array.isArray(response.data),
          dataLength: response.data ? response.data.length : 0,
          sampleData: response.data ? response.data.slice(0, 2) : null
        })
        
        if (response.data && Array.isArray(response.data)) {
          console.log('🔍 フィルタリング前のデータ:', response.data.map((item: any) => ({
            label: item.label,
            count: item.count,
            range: item.range
          })))
          
          // 主要3区分のみをフィルタして指定順でソート
          const segmentOrder = ['90-180日', '180-365日', '365日以上']
          const mainSegments = response.data
            .filter((segment: any) => segmentOrder.includes(segment.label))
            .sort((a: any, b: any) => segmentOrder.indexOf(a.label) - segmentOrder.indexOf(b.label))
          
          console.log('📊 フィルタリング後のデータ:', mainSegments)
          setDetailedSegments(mainSegments)
        } else {
          console.warn('⚠️ データが配列でないか、空です:', response.data)
          // 空の場合でも基本の3セグメントを0件で表示
          const emptySegments = [
            { label: '90-180日', range: '90-180日', count: 0 },
            { label: '180-365日', range: '180-365日', count: 0 },
            { label: '365日以上', range: '365日以上', count: 0 }
          ]
          setDetailedSegments(emptySegments)
        }
        
      } catch (err) {
        console.error('❌ 主要期間区分データの取得に失敗:', err)
        console.error('❌ エラー詳細:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        })
        
        // エラー時は基本の3セグメントを0件で表示（サマリーデータで後から上書きされる）
        const fallbackSegments = [
          { label: '90-180日', range: '90-180日', count: 0 },
          { label: '180-365日', range: '180-365日', count: 0 },
          { label: '365日以上', range: '365日以上', count: 0 }
        ]
        setDetailedSegments(fallbackSegments)
        
        // エラーメッセージは詳細セグメントが重要でない場合は表示しない
        // サマリーデータからフォールバックが可能なためエラーを抑制
        console.warn('詳細セグメントAPI失敗、サマリーデータからのフォールバックを期待')
      } finally {
        setIsLoadingSegments(false)
      }
    }

    fetchDetailedSegments()
  }, [])

  // 代替案: サマリーデータからセグメント情報を作成
  useEffect(() => {
    if (summaryData && summaryData.segmentCounts) {
      console.log('📋 サマリーデータからセグメント情報を作成...')
      console.log('📊 summaryData.segmentCounts:', summaryData.segmentCounts)
      
      const segmentOrder = ['90-180日', '180-365日', '365日以上']
      const segmentData: Array<{ label: string; range: string; count: number }> = []
      
      // 必須セグメントを順番通りに作成
      segmentOrder.forEach(segment => {
        const count = Number(summaryData.segmentCounts[segment] || 0)
        segmentData.push({
          label: segment,
          range: segment,
          count: count
        })
        console.log(`📊 セグメント作成: ${segment} = ${count}件`)
      })
      
      console.log('✅ サマリーデータから作成されたセグメント:', segmentData)
      
      // 詳細セグメントAPIが失敗した場合や、データがない場合のみ上書き
      if (!detailedSegments || detailedSegments.length === 0 || detailedSegments.every(seg => seg.count === 0)) {
        console.log('🔄 詳細セグメントデータを上書き')
        setDetailedSegments(segmentData)
      } else {
        console.log('✅ 詳細セグメントデータは既に存在、上書きしない')
      }
    }
  }, [summaryData])

  // Step 2: 顧客リストは選択後に遅延読み込み
  const loadCustomerList = useCallback(async (segment?: string) => {
    try {
      setIsLoadingList(true)
      setError(null)
      
      console.log('🔄 休眠顧客リストの取得を開始...', { segment })
      
      const response = await api.dormantCustomers({
        storeId: getCurrentStoreId(),
        segment,
        pageSize: 200, // ページング機能のため十分なデータを取得
        sortBy: 'DaysSinceLastPurchase',
        descending: true
      })
      
      console.log('✅ 顧客リスト取得成功:', response)
      
      const customersData = response.data?.customers || []
      console.log('📊 取得された顧客データ数:', customersData.length)
      
      setDormantData(customersData)
      setSelectedSegment(segment || null)
      
    } catch (err) {
      console.error('❌ 顧客リストの取得に失敗:', err)
      setError('顧客リストの取得に失敗しました')
      setDormantData([])
      setSelectedSegment(segment || null)
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  // 初期表示時は全セグメントのデータを取得
  useEffect(() => {
    if (!isLoadingSummary && summaryData && !selectedSegment) {
      loadCustomerList()
    }
  }, [isLoadingSummary, summaryData, selectedSegment, loadCustomerList])

  // アクセス権限の確認中
  if (isAccessLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // アクセス権限がない場合
  if (!hasAccess) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <FeatureLockedScreen 
          featureName="休眠顧客分析"
          featureType="dormant_analysis"
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingSpinner />}>
        <AnalyticsHeaderUnified 
          mainTitle="休眠顧客分析【顧客】"
          description="最終購入からの期間で顧客を分析し、休眠期間に応じた復帰施策の立案と効果測定に役立てます"
          badges={[
            { label: `${dormantData.length}名`, variant: "outline" },
            { label: "復帰施策", variant: "secondary" },
            { label: "期間セグメント", variant: "default" },
            { label: "🔗 API連携", variant: "default" }
          ]}
        />
      </Suspense>

      <div className="container mx-auto px-4 py-6">
        {/* 全体ローディング状態 */}
        {(isLoadingSummary || isLoadingSegments) && (
          <div className="text-center py-12">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse text-blue-600 text-xs font-bold">分析</div>
              </div>
            </div>
            <p className="text-xl text-gray-700 mb-3">🔍 休眠顧客分析を準備中</p>
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>進捗</span>
                <span>
                  {!isLoadingSummary && isLoadingSegments ? 'セグメント分析中...' : 
                   isLoadingSummary && !isLoadingSegments ? 'サマリー取得中...' : 
                   '初期化中...'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{
                    width: !isLoadingSummary && !isLoadingSegments ? '100%' :
                           !isLoadingSummary || !isLoadingSegments ? '70%' : '30%'
                  }}
                ></div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              <p>💡 初回読み込みには少しお時間をいただく場合があります</p>
            </div>
          </div>
        )}
        
        {/* ローディング完了後のコンテンツ */}
        {!isLoadingSummary && !isLoadingSegments && (
          <>
            {/* Step 1: サマリー表示 */}
            {summaryData && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">休眠顧客サマリー</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">総休眠顧客数</div>
                    <div className="text-2xl font-bold">{(summaryData.totalDormantCustomers || 0).toLocaleString()}名</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">休眠率</div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const rate = Number(summaryData.dormantRate || 0);
                        // 小数点以下1桁で表示、必要に応じて整数表示
                        return rate % 1 === 0 ? `${rate}%` : `${rate.toFixed(1)}%`;
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ※購入履歴のある顧客のみで算出
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">平均休眠日数</div>
                    <div className="text-2xl font-bold">{calculateAdjustedAverageDormancyDays(summaryData)}日</div>
                    <div className="text-xs text-gray-500 mt-1">
                      ※購入履歴のある顧客のみで算出<br/>
                      （一度も購入していない顧客を除外）
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: セグメントフィルター */}
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-3">主要期間区分による分析</h3>
              <p className="text-sm text-gray-600 mb-4">
                休眠期間を3つの主要区分に分けて、効率的な分析と施策立案を支援します
              </p>

              {/* 詳細な期間別セグメント */}
              {detailedSegments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {detailedSegments.map((segment) => (
                    <div
                      key={segment.label}
                      className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedSegment === segment.range
                          ? 'bg-blue-50 border-blue-300 shadow-md'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        // 既に選択されているセグメントの場合は全件表示に戻す（トグル動作）
                        if (selectedSegment === segment.range) {
                          loadCustomerList()
                        } else {
                          loadCustomerList(segment.range)
                        }
                      }}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-3">
                          {segment.label.includes('90-180') ? '⚠️' : 
                           segment.label.includes('180-365') ? '🚨' : '🔴'}
                        </div>
                        <div className="text-lg font-bold text-gray-800 mb-2">
                          {segment.label}
                        </div>
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {segment.count.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          名の顧客
                        </div>
                        <div className="mt-3 text-xs text-gray-400">
                          クリックして詳細表示
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">期間区分データがありません</p>
                  <p className="text-sm text-gray-400 mt-2">データを読み込み中...</p>
                </div>
              )}
            </div>

            {/* Step 3: 顧客リスト（テーブル形式・フィルタ・ページネーション対応） */}
            <Suspense fallback={<LoadingSpinner />}>
              <DormantCustomerList 
                selectedSegment={filters.selectedSegment}
                dormantData={dormantData}
              />
            </Suspense>
          </>
        )}

        {/* エラー表示（ローディング中は非表示） */}
        {error && !isLoadingSummary && !isLoadingSegments && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
} 