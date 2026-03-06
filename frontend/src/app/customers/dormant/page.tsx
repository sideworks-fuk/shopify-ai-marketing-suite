"use client"

import React, { useMemo, useState, useEffect, useCallback, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

// デバッグ用カウンター
let loadCustomerListCallCount = 0

// 初期表示でカードが「選択状態」で表示するセグメント（一覧APIのデフォルトと一致させる）
const DEFAULT_DORMANT_SEGMENT = '180-365日'

export default function DormantCustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 機能アクセス制御
  const { hasAccess, isLoading: isAccessLoading } = useFeatureAccess('dormant_analysis')
  const { getApiClient, isAuthenticated, isInitializing, isApiClientReady, currentStoreId: authCurrentStoreId, setCurrentStoreId, resolveStoreId } = useAuth()
  
  // ✅ Props Drilling解消: フィルター状態は FilterContext で管理
  // Note: All hooks must be called before any conditional returns
  const { filters } = useDormantFilters()
  
  // 段階的データ読み込みのための状態管理
  const [summaryData, setSummaryData] = useState<any>(null)
  const [dormantData, setDormantData] = useState<any[]>([])
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const isLoadingRef = useRef(false)  // ローディング状態をrefでも管理
  const hasInitialLoadRef = useRef(false)  // 初期ロードが完了したかを追跡
  
  // 🆕 クライアントサイドマウント状態（Hydrationエラー対策）
  const [isMounted, setIsMounted] = useState(false)
  
  // isLoadingListの変更を監視
  useEffect(() => {
    console.log(`🔄 isLoadingList: ${isLoadingList}, isLoadingRef: ${isLoadingRef.current}`)
  }, [isLoadingList])

  const [error, setError] = useState<string | null>(null)
  const [selectedSegment, setSelectedSegmentInternal] = useState<string | null>(null)
  
  // selectedSegmentの変更を監視するラッパー関数
  const setSelectedSegment = (segment: string | null) => {
    console.log('🔄 [setSelectedSegment] 状態更新', {
      oldValue: selectedSegment,
      newValue: segment,
      timestamp: new Date().toISOString()
    })
    setSelectedSegmentInternal(segment)
  }

  // 主要3区分セグメント定義
  const [detailedSegments, setDetailedSegments] = useState<any[]>([])
  const [isLoadingSegments, setIsLoadingSegments] = useState(false)
  
  // isLoadingSegmentsの変更を監視
  useEffect(() => {
    console.log('🎆 [isLoadingSegments状態変更]', {
      isLoadingSegments,
      timestamp: new Date().toISOString()
    })
  }, [isLoadingSegments])

  // dormantDataの変更を監視
  useEffect(() => {
    console.log('📊 [dormantData更新]', {
      dataLength: dormantData.length,
      selectedSegment,
      timestamp: new Date().toISOString(),
      firstItem: dormantData[0] || null
    })
  }, [dormantData, selectedSegment])
  
  // 最大表示件数の管理
  const [maxDisplayCount, setMaxDisplayCount] = useState(200)

  // 🆕 クライアントサイドマウント状態を設定（Hydrationエラー対策）
  useEffect(() => {
    setIsMounted(true)
    
    // 🆕 ページマウント時に currentStoreId を復元（開発者モード・デモモード対応）
    if (typeof window !== 'undefined') {
      // localStorage から取得を試みる
      let savedStoreId = localStorage.getItem('currentStoreId')
      
      // localStorage になければ sessionStorage から取得を試みる
      if (!savedStoreId) {
        savedStoreId = sessionStorage.getItem('currentStoreId')
        // sessionStorage にあった場合は localStorage にも保存（次回以降のため）
        if (savedStoreId) {
          try {
            localStorage.setItem('currentStoreId', savedStoreId)
            console.log('✅ [DormantPage] sessionStorage から取得し、localStorage にも保存しました', { storeId: savedStoreId })
          } catch (error) {
            console.warn('⚠️ [DormantPage] localStorage への保存に失敗しました', error)
          }
        }
      }
      
      if (savedStoreId) {
        const storeId = parseInt(savedStoreId, 10)
        if (!isNaN(storeId) && storeId > 0) {
          // AuthProvider の currentStoreId が設定されていない、または異なる場合のみ更新
          if (!authCurrentStoreId || authCurrentStoreId !== storeId) {
            console.log('🔄 [DormantPage] ページマウント時に currentStoreId を復元:', { storeId, previousStoreId: authCurrentStoreId })
            setCurrentStoreId(storeId)
          }
        }
      } else {
        console.warn('⚠️ [DormantPage] currentStoreId が localStorage にも sessionStorage にも見つかりません')
      }
    }
  }, [authCurrentStoreId, setCurrentStoreId])

  // 認証チェック: AuthProvider に完全に委任
  // 
  // 注意: サードパーティストレージの制限により、Shopify iframe 内では
  // localStorage への書き込みが無視される可能性があります。
  // そのため、ページ固有の認証チェックロジックは削除し、
  // AuthProvider の auth:error イベントハンドラに認証管理を委任します。
  // 
  // AuthProvider は以下の場合に /install へのリダイレクトをスキップします:
  // - /install, /auth/callback 以外のアプリページ
  // これにより、サードパーティストレージの制限下でも正常に動作します。

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
    // APIクライアントの準備を待つ
    // 注意: isAuthenticated はサードパーティストレージの制限により false になる可能性があるため、
    // ここではチェックしない。API 呼び出し時に 401 エラーが発生した場合は、
    // ApiClient が auth:error イベントを発火し、AuthProvider が適切に処理する。
    if (isInitializing || !isApiClientReady) {
      return
    }

    const fetchSummaryData = async (retryCount = 0) => {
      try {
        setIsLoadingSummary(true)
        setError(null)

        console.log('🔄 休眠顧客サマリーデータの取得を開始...', { retryCount })

        // resolveStoreId()を使用（APIからストア情報を取得する処理も含む）
        const storeId = await resolveStoreId()
        console.log('🔍 [DormantPage] 使用する storeId:', { authCurrentStoreId, finalStoreId: storeId })

        // storeId が null の場合はリトライ（最大2回、1秒間隔）
        if (storeId === null) {
          if (retryCount < 2) {
            console.warn(`⚠️ [DormantPage] storeId が取得できません。${retryCount + 1}回目のリトライを1秒後に実行...`)
            setTimeout(() => fetchSummaryData(retryCount + 1), 1000)
            return
          }
          console.warn('⚠️ [DormantPage] storeId が取得できませんでした。API呼び出しをスキップします。')
          return
        }
        
        const apiClient = getApiClient()
        const response = await apiClient.dormantSummary(storeId)
        console.log('✅ サマリーデータ取得成功:', response)
        console.log('📊 サマリーデータの内容:', {
          success: response.success,
          data: response.data,
          segmentCounts: response.data?.segmentCounts,
          totalDormantCustomers: response.data?.totalDormantCustomers
        })
        
        setSummaryData(response.data)
        console.log('✅ summaryDataをセット完了:', response.data)
        console.log('✅ totalDormantCustomers値:', response.data?.totalDormantCustomers)
        
      } catch (err: any) {
        console.error('❌ サマリーデータの取得に失敗:', err)
        
        // 401エラーの場合は、AuthProvider の auth:error イベントに処理を委任
        // ページ固有のリダイレクトロジックは削除（サードパーティストレージの制限対策）
        if (err?.status === 401 || (err instanceof Error && err.message.includes('401'))) {
          console.warn('⚠️ [休眠顧客ページ] 401エラー: 認証エラーが発生しました。AuthProvider に処理を委任します。')
          // ApiClient が auth:error イベントを発火するため、ここでのリダイレクトは不要
          return
        }
        
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
  }, [getApiClient, isAuthenticated, isInitializing, isApiClientReady, router, searchParams, authCurrentStoreId, resolveStoreId])

  // Step 1.5: 主要期間区分データを取得
  useEffect(() => {
    const fetchDetailedSegments = async (retryCount = 0) => {
      try {
        setError(null)

        console.log('🔄 主要期間区分データの取得を開始...', { retryCount })
        const storeId = await resolveStoreId()
        console.log('🔍 [DormantPage] 使用する storeId:', { authCurrentStoreId, finalStoreId: storeId })

        // storeId が null の場合はリトライ
        if (storeId === null) {
          if (retryCount < 2) {
            console.warn(`⚠️ [DormantPage] storeId が取得できません。詳細セグメント: ${retryCount + 1}回目のリトライを1秒後に実行...`)
            setTimeout(() => fetchDetailedSegments(retryCount + 1), 1000)
            return
          }
          console.warn('⚠️ [DormantPage] storeId が取得できませんでした。詳細セグメントAPI呼び出しをスキップします。')
          return
        }
        
        const apiClient = getApiClient()
        const response = await apiClient.dormantDetailedSegments(storeId)
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
        // setIsLoadingSegments(false)
      }
    }

    fetchDetailedSegments()
  }, [getApiClient, authCurrentStoreId, resolveStoreId, isAuthenticated, isApiClientReady, searchParams])

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
  const loadCustomerList = useCallback(async (segment?: string, retryCount = 0) => {
    loadCustomerListCallCount++
    console.log(`🚀 [loadCustomerList] 開始 #${loadCustomerListCallCount} - segment: ${segment}, isLoadingList: ${isLoadingList}, isLoadingRef: ${isLoadingRef.current}, retryCount: ${retryCount}`)

    // ローディング中フラグを確認（リトライ時はスキップしない）
    if (isLoadingRef.current && retryCount === 0) {
      console.warn('⚠️ [loadCustomerList] 既にローディング中のためスキップ (refチェック)')
      return
    }

    try {
      console.log('🔄 [loadCustomerList] setIsLoadingList(true)呼び出し')
      isLoadingRef.current = true  // refも更新
      setIsLoadingList(true)
      console.log('🔄 [loadCustomerList] setIsLoadingList(true)完了')
      setError(null)

      console.log('🔄 休眠顧客リストの取得を開始...', { segment, maxDisplayCount })

      // APIリクエストパラメータを構築
      // セグメントが指定されている場合のみパラメータに含める
      // 🆕 resolveStoreId()を使用（APIからストア情報を取得する処理も含む）
      const storeId = await resolveStoreId()
      console.log('🔍 [DormantPage.loadCustomerList] 使用する storeId:', { authCurrentStoreId, finalStoreId: storeId })

      // storeId が null の場合はリトライ（最大2回、1秒間隔）
      if (storeId === null) {
        if (retryCount < 2) {
          console.warn(`⚠️ [DormantPage.loadCustomerList] storeId が取得できません。${retryCount + 1}回目のリトライを1秒後に実行...`)
          isLoadingRef.current = false
          setTimeout(() => loadCustomerList(segment, retryCount + 1), 1000)
          return
        }
        console.warn('⚠️ [DormantPage.loadCustomerList] storeId が取得できませんでした。API呼び出しをスキップします。')
        return
      }
      
      const requestParams: any = {
        storeId: storeId,
        pageSize: maxDisplayCount, // ユーザーが選択した最大表示件数
        sortBy: 'DaysSinceLastPurchase',
        descending: true
      }
      
      console.log('🎆 [パラメータ構築] segment判定', {
        segment,
        isSegmentTruthy: !!segment,
        isSegmentNotAll: segment !== 'all',
        willAddSegment: !!(segment && segment !== 'all'),
        timestamp: new Date().toISOString()
      })
      
      // セグメントが指定されている場合のみ追加
      if (segment && segment !== 'all') {
        requestParams.segment = segment
        console.log('✅ segmentパラメータを追加:', segment)
      } else {
        console.log('⚠️ segmentパラメータを追加しない:', { segment })
      }
      
      console.log('📤 APIリクエストパラメータ:', requestParams)
      
      console.log('⏳ [loadCustomerList] API呼び出し前', {
        requestParams,
        timestamp: new Date().toISOString()
      })
      
      let response
      try {
        const apiClient = getApiClient()
        response = await apiClient.dormantCustomers(requestParams)
        console.log('🎉 [loadCustomerList] API呼び出し完了', {
          hasResponse: !!response,
          responseKeys: response ? Object.keys(response) : [],
          timestamp: new Date().toISOString()
        })
      } catch (apiError) {
        console.error('🚨 [loadCustomerList] API呼び出しエラー', apiError)
        throw apiError
      }
      
      console.log('✅ 顧客リスト取得成功:', {
        response,
        dataLength: response?.data?.customers?.length,
        timestamp: new Date().toISOString()
      })
      
      // レスポンスの妥当性チェック
      if (!response) {
        console.error('❌ [loadCustomerList] responseがnull/undefined')
        throw new Error('APIレスポンスが空です')
      }
      
      if (!response.data) {
        console.error('❌ [loadCustomerList] response.dataがnull/undefined', {
          response,
          responseKeys: Object.keys(response)
        })
        throw new Error('APIレスポンスにdataが含まれていません')
      }
      
      const customersData = response.data?.customers || []
      console.log('📊 取得された顧客データ数:', customersData.length)
      console.log('📊 要求した最大件数:', maxDisplayCount)
      
      // 0件の場合の特別な処理
      if (customersData.length === 0) {
        console.log('ℹ️ [loadCustomerList] データが0件です', {
          segment,
          timestamp: new Date().toISOString()
        })
      }
      
      // 実際のデータ数が要求数より少ない場合の警告
      if (customersData.length < maxDisplayCount && maxDisplayCount > 200) {
        console.log('⚠️ 実際のデータ数が要求数より少ない:', {
          要求: maxDisplayCount,
          実際: customersData.length,
          差分: maxDisplayCount - customersData.length
        })
      }
      
      console.log('💾 [loadCustomerList] データ設定前', {
        customersDataLength: customersData.length,
        segment,
        timestamp: new Date().toISOString()
      })
      
      console.log('🔄 [loadCustomerList] データ設定実行', {
        customersDataLength: customersData.length,
        segment,
        timestamp: new Date().toISOString(),
        customersDataSample: customersData.slice(0, 3)  // 最初の3件のサンプル
      })
      
      // 明示的に空配列でも設定を試みる
      const dataToSet = customersData || []
      console.log('📝 [loadCustomerList] setDormantData呼び出し前', {
        dataToSetLength: dataToSet.length,
        dataToSetType: Array.isArray(dataToSet) ? 'array' : typeof dataToSet,
        currentDormantDataLength: dormantData.length
      })
      
      // 新しい配列参照を作成して確実に更新をトリガー
      const newData = [...dataToSet];
      console.log('🔄 [setDormantData] 実行直前', {
        newDataLength: newData.length,
        newDataSample: newData.slice(0, 2)
      });
      setDormantData(newData);
      console.log('✅ [setDormantData] 実行完了');
      // setSelectedSegmentは既にクリック時に設定済みなのでここでは呼ばない
      // setSelectedSegment(segment || null)
      
      // State更新後の確認（非同期なので実際の更新は見えない）
      console.log('✨ [loadCustomerList] 完了', {
        segment,
        dataCount: dataToSet.length,
        timestamp: new Date().toISOString(),
        stateWillBeUpdated: true
      })
      
    } catch (err) {
      console.error('❌ 顧客リストの取得に失敗:', err)
      
      // エラーメッセージを詳細化
      let errorMessage = '顧客リストの取得に失敗しました'
      if (err instanceof Error) {
        if (err.message.includes('Network')) {
          errorMessage = 'ネットワークエラー: サーバーに接続できません'
        } else if (err.message.includes('timeout')) {
          errorMessage = 'タイムアウト: データの読み込みに時間がかかっています'
        } else {
          errorMessage = `エラー: ${err.message}`
        }
      }
      
      setError(errorMessage)
      setDormantData([])
      // エラー時もsetSelectedSegmentは呼ばない
      // setSelectedSegment(segment || null)
    } finally {
      console.log('🏁 [loadCustomerList] finally処理開始', {
        segment,
        currentIsLoadingRef: isLoadingRef.current,
        timestamp: new Date().toISOString()
      })
      // 必ずローディング状態をfalseにする
      console.log('🏁 [loadCustomerList] ローディング状態をリセット')
      isLoadingRef.current = false  // refも更新
      setIsLoadingList(false)  // stateを更新（これが再レンダリングをトリガー）
      console.log('🏁 [loadCustomerList] ローディング状態リセット完了')
      
      // // 強制再レンダリングは不要
      // requestAnimationFrame(() => {
      //   setIsLoadingList(false)
      // })
    }
  }, [maxDisplayCount, getApiClient, authCurrentStoreId, resolveStoreId])  // getApiClientとauthCurrentStoreId、resolveStoreIdを追加

  // 初期表示時: UIで「180-365日」が選択表示されているので、同じセグメントでAPI取得・状態を同期
  useEffect(() => {
    console.log('🔄 [useEffect - 初期ロード]', {
      isLoadingSummary,
      hasSummaryData: !!summaryData,
      selectedSegment,
      dormantDataLength: dormantData.length,
      timestamp: new Date().toISOString()
    });
    
    if (!isLoadingSummary && summaryData && !hasInitialLoadRef.current && !isLoadingList) {
      // 初期は selectedSegment が null のため、UIでは「180-365日」が選択表示される。
      // 一覧データも同じセグメントで取得し、状態を「180-365日」に合わせる。
      const segmentToLoad = selectedSegment ?? DEFAULT_DORMANT_SEGMENT;
      if (selectedSegment !== segmentToLoad) {
        setSelectedSegmentInternal(segmentToLoad);
      }
      hasInitialLoadRef.current = true;
      console.log('✋ [初期ロード] セグメント指定で取得', { segmentToLoad });
      loadCustomerList(segmentToLoad).catch(err => {
        console.error('🚨 [初期ロード] エラー', err)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingSummary, summaryData])  // loadCustomerListは意図的に除外
  
  // maxDisplayCountが変更された時にデータを再取得
  const prevMaxDisplayCount = React.useRef(maxDisplayCount)
  useEffect(() => {
    console.log('🔄 [useEffect - 件数変更]', {
      prevCount: prevMaxDisplayCount.current,
      currentCount: maxDisplayCount,
      selectedSegment,
      isLoadingSummary,
      hasSummaryData: !!summaryData,
      timestamp: new Date().toISOString()
    });
    
    if (!isLoadingSummary && summaryData && prevMaxDisplayCount.current !== maxDisplayCount) {
      console.log('📊 [件数変更] 最大表示件数が変更されました:', maxDisplayCount)
      prevMaxDisplayCount.current = maxDisplayCount
      // 現在の選択状態に応じてデータを再取得
      loadCustomerList(selectedSegment || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDisplayCount, selectedSegment])  // loadCustomerListは意図的に除外

  // 🆕 クライアントサイドでのみレンダリング（Hydrationエラー対策）
  // 理由: useSearchParams() を使用しているため、サーバーサイドとクライアントサイドで
  // レンダリング結果が異なる可能性がある。isMounted チェックにより、
  // クライアントサイドでのみコンテンツをレンダリングし、Hydration エラーを防止する。
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

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
            { label: `${summaryData ? (summaryData.totalDormantCustomers || 0).toLocaleString() : '読込中...'}名`, variant: "outline" },
            { label: "復帰施策", variant: "secondary" },
            { label: "期間セグメント", variant: "default" },
            { label: "🔗 API連携", variant: "default" }
          ]}
        />
      </Suspense>

      <div className="container mx-auto px-4 py-6">
        {/* 全体ローディング状態 */}
        {isLoadingSummary && (
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
                  className={`bg-blue-600 h-2 rounded-full transition-all duration-500 ${
                    !isLoadingSummary && !isLoadingSegments ? 'w-full' :
                    !isLoadingSummary || !isLoadingSegments ? 'w-[70%]' : 'w-[30%]'
                  }`}
                ></div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              <p>💡 初回読み込みには少しお時間をいただく場合があります</p>
            </div>
          </div>
        )}
        
        {/* ローディング完了後のコンテンツ */}
        {!isLoadingSummary && summaryData && (
          <>
            {/* Step 1: サマリー表示 */}
            {(
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">休眠顧客サマリー</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">総休眠顧客数</div>
                    <div className="text-2xl font-bold">{(summaryData?.totalDormantCustomers || 0).toLocaleString()}名</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">休眠率</div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const rate = Number(summaryData.dormantRate || 0);
                        return rate % 1 === 0 ? `${rate}%` : `${rate.toFixed(1)}%`;
                      })()}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">平均休眠日数</div>
                    <div className="text-2xl font-bold">{calculateAdjustedAverageDormancyDays(summaryData)}日</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">※購入履歴のある顧客のみで算出</p>
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
                  {detailedSegments.map((segment) => {
                    // 初期表示時（selectedSegmentがnull）で、180-365日のセグメントは選択状態とする
                    // または明示的に選択されている場合
                    const isSelected = selectedSegment === segment.label || 
                                     (!selectedSegment && segment.label === '180-365日' && segment.count > 0)
                    return (
                    <div
                      key={segment.label}
                      className={`p-6 rounded-lg border transition-all ${
                          isLoadingList
                          ? 'cursor-not-allowed opacity-60 pointer-events-none'
                          : isSelected
                            ? 'cursor-pointer bg-blue-50 border-blue-300 shadow-md hover:shadow-md'
                            : 'cursor-pointer bg-white border-gray-200 hover:bg-gray-50 hover:shadow-md'
                      }`}
                      onClick={() => {
                          console.log('🖱️ [セグメントクリック]', {
                            segment: segment.label,
                            isSelected,
                            isLoadingList,
                            timestamp: new Date().toISOString()
                          })

                          // ローディング中はクリックを無効化
                          if (isLoadingList) {
                            console.log('⚠️ 現在データを読み込み中です')
                            return
                          }
                          
                          // async関数でラップして適切にerror処理を行う
                          const handleSegmentAction = async () => {
                            try {
                              if (isSelected) {
                                console.log('🔄 [セグメント解除] 全件表示に戻す', segment.label)
                                // 先にselectedSegmentをクリア
                                setSelectedSegment(null)
                                // その後全データを取得
                                await loadCustomerList()
                        } else {
                                console.log('✅ [セグメント選択]', segment.label)
                                // 先にselectedSegmentを設定
                                setSelectedSegment(segment.label)
                                // その後データを取得
                                await loadCustomerList(segment.label)
                              }
                            } catch (err) {
                              console.error('🚨 [セグメントアクション] エラー', err)
                              // エラー時にローディング状態を確実に解除
                              setIsLoadingList(false)
                        }
                          }
                          
                          // 非同期関数を実行
                          handleSegmentAction()
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
                          {isLoadingList && isSelected ? '読み込み中...' : 'クリックして詳細表示'}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">期間区分データがありません</p>
                  <p className="text-sm text-gray-400 mt-2">データを読み込み中...</p>
                </div>
              )}
            </div>

            {/* Step 3: 顧客リスト（テーブル形式・フィルタ・ページネーション対応） */}
            {(() => {
              console.log('🎨 [レンダリング条件チェック]', {
                isLoadingList,
                isLoadingSummary,
                hasSummaryData: !!summaryData,
                dormantDataLength: dormantData.length,
                selectedSegment,
                timestamp: new Date().toISOString()
              })
              return null
            })()}
            {isLoadingList ? (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                  <p className="text-gray-600">データを取得中...</p>
                  {maxDisplayCount >= 1000 && (
                    <p className="text-sm text-gray-500 mt-2">
                      {maxDisplayCount.toLocaleString()}件のデータを取得しています。しばらくお待ちください...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Suspense fallback={<LoadingSpinner />}>
                {/* デバッグ: 実際に渡されるデータを確認 */}
                {(() => {
                  console.log('🚀 [DormantCustomerList描画]', {
                    selectedSegment,
                    dormantDataLength: dormantData.length,
                    isLoadingList,
                    timestamp: new Date().toISOString()
                  })
                  return null
                })()}
                <DormantCustomerList 
                  selectedSegment={selectedSegment}
                  dormantData={dormantData}
                  maxDisplayCount={maxDisplayCount}
                  isLoading={isLoadingList}
                  onMaxDisplayCountChange={(newCount) => {
                    setMaxDisplayCount(newCount)
                    // 表示件数変更時にデータを再取得
                    loadCustomerList(selectedSegment || undefined)
                  }}
                />
              </Suspense>
            )}
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