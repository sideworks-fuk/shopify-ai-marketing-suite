'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Database, 
  RefreshCw,
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  Activity,
  PlayCircle,
  PauseCircle,
  Info,
  Settings,
  Building2,
  Zap,
  ArrowRight
} from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'
import { useAuth } from '@/components/providers/AuthProvider'

type SyncPeriod = '3months' | '6months' | '1year' | 'all'

interface SyncHistory {
  id: string
  startTime: string
  endTime?: string
  status: 'running' | 'completed' | 'failed'
  recordsProcessed: number
  syncType: 'initial' | 'manual' | 'scheduled'
  duration?: number
  durationMinutes?: number
}

interface SyncStats {
  totalCustomers: number
  totalOrders: number
  totalProducts: number
  lastSyncTime?: string
  nextScheduledSync?: string
}

export default function InitialSetupPage() {
  const router = useRouter()
  const { getApiClient, isApiClientReady } = useAuth()
  const [syncPeriod, setSyncPeriod] = useState<SyncPeriod>('3months')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([])
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [activeTab, setActiveTab] = useState('setup')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isMounted, setIsMounted] = useState(false) // クライアントサイドマウント状態（Hydrationエラー対策）
  
  // デモモード判定
  const [isDemoMode, setIsDemoMode] = useState(false)

  // isApiClientReady の状態変化を監視
  useEffect(() => {
    console.log('🔄 isApiClientReady 状態変化:', isApiClientReady)
  }, [isApiClientReady])

  // コンポーネントマウント時のログ
  useEffect(() => {
    console.log('📦 InitialPage マウント')
    console.log('📌 初期 isApiClientReady:', isApiClientReady)
    return () => {
      console.log('📦 InitialPage アンマウント')
    }
  }, [])

  // クライアントサイドマウント状態を設定（Hydrationエラー対策）
  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      const demoToken = localStorage.getItem('demoToken')
      setIsDemoMode(!!demoToken)
      
      // 🆕 URL パラメータから storeId を取得して localStorage に保存
      // 理由: サードパーティストレージの制限により、/auth/success で保存した値が消える可能性があるため
      const urlParams = new URLSearchParams(window.location.search);
      const storeIdFromUrl = urlParams.get('storeId');
      if (storeIdFromUrl) {
        console.log('✅ [InitialSetup] URL パラメータから storeId を取得:', storeIdFromUrl);
        localStorage.setItem('currentStoreId', storeIdFromUrl);
        localStorage.setItem('oauth_authenticated', 'true');
      } else {
        const currentStoreIdFromStorage = localStorage.getItem('currentStoreId')
      console.log('⚠️ [InitialSetup] URL パラメータに storeId がありません。localStorage の値を使用します:', currentStoreIdFromStorage)
      
      // 開発者モードの場合、localStorage に currentStoreId が保存されているか確認
      const developerToken = localStorage.getItem('developerToken')
      const authMode = localStorage.getItem('authMode')
      if ((developerToken || authMode === 'developer') && !currentStoreIdFromStorage) {
        console.warn('⚠️ [InitialSetup] 開発者モードですが、currentStoreId が localStorage に見つかりません')
        console.warn('⚠️ [InitialSetup] localStorage の内容:', {
          developerToken: !!developerToken,
          authMode,
          allKeys: Object.keys(localStorage)
        })
      } else if (currentStoreIdFromStorage) {
        // 開発者モードで currentStoreId が存在する場合、確実に保存されていることを確認
        // ページ遷移後に localStorage がクリアされる可能性があるため、再保存
        try {
          localStorage.setItem('currentStoreId', currentStoreIdFromStorage)
          console.log('✅ [InitialSetup] currentStoreId を再保存しました', { storeId: currentStoreIdFromStorage })
        } catch (error) {
          console.error('❌ [InitialSetup] currentStoreId の再保存に失敗しました', error)
        }
      }
      }
      
      // 🆕 OAuth認証成功後のリダイレクトフラグをクリア（リダイレクトが成功したことを確認）
      const redirectKey = 'auth_success_redirect_executed'
      const redirectTimestampKey = 'auth_success_redirect_timestamp'
      if (sessionStorage.getItem(redirectKey) === 'true') {
        console.log('✅ [InitialSetup] OAuth認証成功後のリダイレクトが完了しました。フラグをクリアします。')
        sessionStorage.removeItem(redirectKey)
        sessionStorage.removeItem(redirectTimestampKey) // タイムスタンプもクリア
      }
      // 🆕 auth_success_processed もクリア
      sessionStorage.removeItem('auth_success_processed');
      
      // 🆕 OAuth処理中フラグをクリア（フォールバック - localStorageに変更）
      localStorage.removeItem('oauth_in_progress');
      localStorage.removeItem('oauth_started_at');
    }
  }, [])

  // バックエンドAPIから実際の統計情報を取得
  const fetchSyncStats = useCallback(async () => {
    if (!isApiClientReady) {
      return
    }

    try {
      setIsLoadingHistory(true)
      const apiClient = getApiClient()
      
      // データベース統計を取得（ApiClientを使用してShopify App Bridgeセッショントークンを自動送信）
      const statsData = await apiClient.request<{ success: boolean; data?: { customers: number; orders: number; products: number; lastUpdated?: string } }>('/api/database/stats', {
        method: 'GET',
      })

      if (statsData.success && statsData.data) {
        // バックエンドから取得した実際のデータを設定
        setSyncStats({
          totalCustomers: statsData.data.customers || 0,
          totalOrders: statsData.data.orders || 0,
          totalProducts: statsData.data.products || 0,
          lastSyncTime: statsData.data.lastUpdated || undefined,
          nextScheduledSync: undefined // スケジュール情報は別途取得が必要
        })
        console.log('✅ 同期統計を取得:', statsData.data)
      } else {
        // データが取得できない場合は0件を表示
        setSyncStats({
          totalCustomers: 0,
          totalOrders: 0,
          totalProducts: 0,
          lastSyncTime: undefined,
          nextScheduledSync: undefined
        })
        console.log('ℹ️ 同期統計データがありません。初期状態として0件を表示します。')
      }

      // 同期履歴を取得
      try {
        const historyData = await apiClient.request<Array<{
          id: string
          type: string
          status: string
          startedAt: string
          completedAt?: string
          duration: number
          recordsProcessed: number
          message?: string
        }>>('/api/sync/history?limit=10', {
          method: 'GET',
        })
        
        if (Array.isArray(historyData) && historyData.length > 0) {
          // バックエンドのレスポンスをフロントエンドのSyncHistory形式にマッピング
          const mappedHistory: SyncHistory[] = historyData.map(h => ({
            id: h.id,
            startTime: h.startedAt,
            endTime: h.completedAt,
            status: h.status === 'success' ? 'completed' : 
                    h.status === 'error' ? 'failed' : 
                    h.status === 'syncing' ? 'running' : 'completed',
            recordsProcessed: h.recordsProcessed,
            syncType: h.type === 'all' ? 'initial' : 'manual',
            duration: h.duration,
            durationMinutes: h.durationMinutes
          }))
          setSyncHistory(mappedHistory)
          console.log('✅ 同期履歴を取得:', mappedHistory.length, '件')
        } else {
          setSyncHistory([])
          console.log('ℹ️ 同期履歴がありません')
        }
      } catch (historyErr) {
        console.warn('⚠️ 同期履歴の取得に失敗（統計データは正常に取得）:', historyErr)
        setSyncHistory([])
      }
    } catch (err) {
      console.error('❌ 同期統計の取得中にエラーが発生:', err)
      // エラー時も0件を表示
      setSyncStats({
        totalCustomers: 0,
        totalOrders: 0,
        totalProducts: 0,
        lastSyncTime: undefined,
        nextScheduledSync: undefined
      })
      setSyncHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }, [isApiClientReady, getApiClient])

  // 初回ロード時に同期統計を取得
  useEffect(() => {
    if (!isApiClientReady) {
      return
    }
    void fetchSyncStats()
  }, [isApiClientReady, fetchSyncStats])

  // 同期履歴タブがアクティブで、進行中のジョブがある場合、ポーリングで更新
  useEffect(() => {
    if (activeTab !== 'history' || !isApiClientReady) {
      return
    }

    // 進行中のジョブがあるか確認
    const hasRunningJob = syncHistory.some(h => h.status === 'running')
    if (!hasRunningJob) {
      return
    }

    // 10秒ごとに同期履歴を更新
    const interval = setInterval(() => {
      console.log('🔄 同期履歴をポーリング更新中...')
      void fetchSyncStats()
    }, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [activeTab, syncHistory, isApiClientReady, fetchSyncStats])

  const handleStartSync = async () => {
    // ========== デバッグログ開始 ==========
    console.log('========================================')
    console.log('🚀 handleStartSync が呼ばれました')
    console.log('📌 タイムスタンプ:', new Date().toISOString())
    console.log('📌 isApiClientReady:', isApiClientReady)
    console.log('📌 syncPeriod:', syncPeriod)
    console.log('📌 isLoading:', isLoading)
    console.log('📌 error:', error)
    
    // 環境情報の確認
    if (typeof window !== 'undefined') {
      console.log('📌 環境情報:')
      console.log('  - window.location.href:', window.location.href)
      console.log('  - localStorage.oauth_authenticated:', localStorage.getItem('oauth_authenticated'))
      console.log('  - localStorage.currentStoreId:', localStorage.getItem('currentStoreId'))
      console.log('  - localStorage.demoToken:', localStorage.getItem('demoToken') ? '存在' : 'なし')
      console.log('  - sessionStorage.ec-ranger-syncId:', sessionStorage.getItem('ec-ranger-syncId'))
    }
    console.log('========================================')
    
    // isApiClientReady のチェック
    if (!isApiClientReady) {
      console.error('❌ isApiClientReady = false のため早期リターン')
      console.error('💡 AuthProvider の初期化が完了していません')
      console.error('💡 考えられる原因:')
      console.error('  1. AuthProvider の初期化がまだ完了していない')
      console.error('  2. Shopify App Bridge のトークン取得に失敗している')
      console.error('  3. OAuth認証が完了していない')
      alert('APIクライアントが準備中です。数秒待ってから再度お試しください。')
      return
    }
    // ========== デバッグログ終了 ==========
    
    setIsLoading(true)
    setError(null)

    try {
      console.log('📡 APIクライアントを取得中...')
      const apiClient = getApiClient()
      console.log('✅ APIクライアント取得成功')
      console.log('📌 APIクライアントの型:', apiClient.constructor.name)
      
      // リクエスト送信前の詳細確認
      const requestBody = { syncPeriod }
      const requestBodyString = JSON.stringify(requestBody)
      console.log('📤 POST /api/sync/initial 送信準備完了')
      console.log('📤 リクエストボディ:', requestBodyString)
      console.log('📤 リクエストボディサイズ:', requestBodyString.length, 'bytes')
      console.log('📤 リクエストメソッド: POST')
      console.log('📤 エンドポイント: /api/sync/initial')
      
      // リクエスト送信開始時刻を記録
      const requestStartTime = Date.now()
      console.log('⏰ リクエスト送信開始時刻:', new Date(requestStartTime).toISOString())
      
      let data: any
      try {
        data = await apiClient.request<any>('/api/sync/initial', {
          method: 'POST',
          body: requestBodyString,
        })
        
        const requestEndTime = Date.now()
        const requestDuration = requestEndTime - requestStartTime
        console.log('✅ リクエスト成功')
        console.log('⏰ リクエスト完了時刻:', new Date(requestEndTime).toISOString())
        console.log('⏰ リクエスト所要時間:', requestDuration, 'ms')
        
      } catch (requestError: any) {
        const requestEndTime = Date.now()
        const requestDuration = requestEndTime - requestStartTime
        console.error('❌ リクエストエラー発生')
        console.error('⏰ エラー発生時刻:', new Date(requestEndTime).toISOString())
        console.error('⏰ リクエスト所要時間:', requestDuration, 'ms')
        console.error('❌ エラーオブジェクト:', requestError)
        console.error('❌ エラーメッセージ:', requestError?.message)
        console.error('❌ エラースタック:', requestError?.stack)
        
        // ネットワークエラーの詳細確認
        if (requestError instanceof TypeError && requestError.message.includes('fetch')) {
          console.error('🌐 ネットワークエラーの可能性:')
          console.error('  - CORSエラーの可能性')
          console.error('  - ネットワーク接続の問題')
          console.error('  - バックエンドサーバーが応答していない')
        }
        
        // エラーを再スローしてcatchブロックで処理
        throw requestError
      }
      
      console.log('📥 レスポンス受信:')
      console.log('📥 レスポンスタイプ:', typeof data)
      console.log('📥 レスポンス全体:', JSON.stringify(data, null, 2))
      
      // レスポンスの構造確認
      if (data && typeof data === 'object') {
        console.log('📥 レスポンスのキー:', Object.keys(data))
        console.log('📥 レスポンスの値:', Object.values(data))
      }
      
      // PascalCase と camelCase 両方に対応
      const syncId = data.syncId ?? data.SyncId ?? data.id ?? data.Id
      console.log('🔑 取得したsyncId:', syncId)
      console.log('🔑 syncIdの型:', typeof syncId)
      console.log('🔑 syncIdの値の確認:')
      console.log('  - data.syncId:', data.syncId)
      console.log('  - data.SyncId:', data.SyncId)
      console.log('  - data.id:', data.id)
      console.log('  - data.Id:', data.Id)
      
      if (!syncId) {
        console.error('❌ syncId が取得できません')
        console.error('📋 レスポンス全体:', data)
        console.error('📋 レスポンスの型:', typeof data)
        console.error('📋 レスポンスが配列か:', Array.isArray(data))
        setError('同期IDが取得できませんでした。管理者に連絡してください。')
        setIsLoading(false)
        return
      }
      
      console.log('✅ 同期開始成功: syncId =', syncId)
      
      // 同期履歴タブに自動切り替え
      setActiveTab('history')
      
      // 同期履歴を即座に更新（新しい同期ジョブを表示するため）
      await fetchSyncStats()
      
      setIsLoading(false)
      
    } catch (err) {
      console.error('❌ エラー発生（catchブロック）')
      console.error('❌ エラーオブジェクト:', err)
      console.error('❌ エラーメッセージ:', err instanceof Error ? err.message : String(err))
      console.error('❌ エラースタック:', err instanceof Error ? err.stack : 'スタック情報なし')
      console.error('❌ エラーの型:', err?.constructor?.name || typeof err)
      
      // エラーの詳細分析
      if (err instanceof Error) {
        console.error('❌ エラー詳細分析:')
        console.error('  - name:', err.name)
        console.error('  - message:', err.message)
        console.error('  - stack:', err.stack)
        
        // ネットワークエラーの場合
        if (err.message.includes('fetch') || err.message.includes('network')) {
          console.error('🌐 ネットワークエラーの可能性が高いです')
          console.error('💡 確認事項:')
          console.error('  1. バックエンドサーバーが起動しているか')
          console.error('  2. CORS設定が正しいか')
          console.error('  3. ネットワーク接続が正常か')
        }
        
        // 認証エラーの場合
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          console.error('🔐 認証エラーの可能性が高いです')
          console.error('💡 確認事項:')
          console.error('  1. Shopify App Bridge のトークンが取得できているか')
          console.error('  2. OAuth認証が完了しているか')
          console.error('  3. 認証ヘッダーが正しく送信されているか')
        }
      }
      
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    setShowSkipWarning(true)
  }

  const confirmSkip = async () => {
    try {
      // 初期設定を完了としてマーク
      const apiClient = getApiClient()
      await apiClient.request('/api/setup/complete', {
        method: 'POST',
      })
      
      router.push('/dashboard')
    } catch (err) {
      setError('スキップ処理に失敗しました')
    }
  }

  // クライアントサイドでのみレンダリング（Hydrationエラー対策）
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Building2 className="h-10 w-10 text-blue-600" />
            <span>EC Ranger データ同期ダッシュボード</span>
          </h1>
          <p className="text-gray-600">
            Shopifyストアのデータを同期・管理し、AI分析を実行します
          </p>
        </div>

        {/* 統計カード */}
        {isLoadingHistory ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between h-16">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : syncStats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">顧客データ</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {syncStats.totalCustomers.toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-green-600 font-medium">注文データ</p>
                    <p className="text-2xl font-bold text-green-900">
                      {syncStats.totalOrders.toLocaleString()}
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">商品データ</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {syncStats.totalProducts.toLocaleString()}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">最終同期</p>
                    <p className="text-xl font-bold text-orange-900">
                      {syncStats.lastSyncTime && syncStats.lastSyncTime !== 'null' 
                        ? new Date(syncStats.lastSyncTime).toLocaleString('ja-JP', {
                            timeZone: 'Asia/Tokyo',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).replace(/\//g, '/') 
                        : '未同期'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">顧客データ</p>
                    <p className="text-2xl font-bold text-blue-900">0</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-green-600 font-medium">注文データ</p>
                    <p className="text-2xl font-bold text-green-900">0</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">商品データ</p>
                    <p className="text-2xl font-bold text-purple-900">0</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between h-16">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">最終同期</p>
                    <p className="text-xl font-bold text-orange-900">未同期</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* メインコンテンツ */}
        <Card className="shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="setup" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  初期設定
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  同期履歴
                </TabsTrigger>
                <TabsTrigger value="trigger" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  手動同期
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="setup" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  初期データ同期
                </h2>
                <p className="text-gray-600">
                  分析を開始するために、過去のデータを取得します。初回同期はデータ量に応じて時間がかかる場合があります。
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isDemoMode && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>デモモード</strong><br />
                    デモモードではデータ同期を実行できません。実際のデータ同期を行うには、Shopifyアプリとしてインストールしてください。
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <Label className="text-base">データ取得期間を選択してください：</Label>
                <RadioGroup value={syncPeriod} onValueChange={(value) => setSyncPeriod(value as SyncPeriod)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="3months" id="3months" />
                    <Label htmlFor="3months" className="cursor-pointer flex-1">
                      過去3ヶ月（推奨）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="6months" id="6months" />
                    <Label htmlFor="6months" className="cursor-pointer flex-1">
                      過去6ヶ月
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="1year" id="1year" />
                    <Label htmlFor="1year" className="cursor-pointer flex-1">
                      過去1年
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer flex-1">
                      <span>全期間</span>
                      <span className="ml-2 text-xs text-gray-500">※削除された商品も整理されます</span>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-gray-500 mt-2">
                  💡 ヒント: 「全期間」を選択すると、Shopifyで削除された商品がこちらからも削除（非表示）されます。
                  定期的に全期間同期を実行することをお勧めします。
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button"
                  onClick={handleStartSync} 
                  disabled={isLoading || isDemoMode || !isApiClientReady}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  size="lg"
                >
                  {!isApiClientReady ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      クライアント初期化中...
                    </>
                  ) : isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      同期を開始中...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      同期を開始
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSkip}
                  disabled={isLoading}
                  size="lg"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  スキップ
                </Button>
              </div>

              {showSkipWarning && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="mb-3">
                      データ同期をスキップすると、分析機能が制限される可能性があります。
                      後から設定メニューで同期を実行できます。
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowSkipWarning(false)}>
                        キャンセル
                      </Button>
                      <Button size="sm" onClick={confirmSkip}>
                        スキップを確定
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* 同期履歴タブ */}
            <TabsContent value="history" className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  同期履歴
                </h2>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>同期履歴がありません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syncHistory.map((history) => {
                      const isRunning = history.status === 'running'
                      return (
                        <Card 
                          key={history.id} 
                          className={`border-l-4 ${
                            isRunning 
                              ? 'border-l-blue-500 bg-blue-50 shadow-md' 
                              : history.status === 'completed'
                              ? 'border-l-green-500'
                              : 'border-l-red-500'
                          } ${isRunning ? 'animate-pulse' : ''}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {history.status === 'completed' ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : history.status === 'running' ? (
                                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {history.syncType === 'initial' ? '初期同期' :
                                       history.syncType === 'manual' ? '手動同期' : 'スケジュール同期'}
                                    </span>
                                    <Badge variant={history.status === 'completed' ? 'default' : 
                                                  history.status === 'running' ? 'secondary' : 'destructive'}>
                                      {history.status === 'completed' ? '完了' :
                                       history.status === 'running' ? '実行中' : '失敗'}
                                    </Badge>
                                    {isRunning && (
                                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                        更新中...
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {new Date(history.startTime).toLocaleString('ja-JP', {
                                      timeZone: 'Asia/Tokyo'
                                    })}
                                    {history.durationMinutes !== undefined && history.durationMinutes > 0 && ` （所要時間: ${history.durationMinutes}分）`}
                                    {isRunning && !history.endTime && (
                                      <span className="ml-2 text-blue-600 font-medium">進行中...</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{history.recordsProcessed.toLocaleString()}</p>
                                <p className="text-sm text-gray-600">レコード</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 手動同期タブ */}
            <TabsContent value="trigger" className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-green-600" />
                  手動データ同期
                </h2>
                <p className="text-gray-600 mb-4">
                  最新のデータを取得したい場合は、手動で同期を実行できます。データ取得期間を選択して同期を開始できます。
                </p>
              </div>

              {isDemoMode && (
                <Alert className="border-amber-200 bg-amber-50">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>デモモード</strong><br />
                    デモモードではデータ同期を実行できません。実際のデータ同期を行うには、Shopifyアプリとしてインストールしてください。
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>自動同期スケジュール</strong><br />
                  データは毎日午前2時に自動的に同期されます。
                  {syncStats?.nextScheduledSync && (
                    <span className="block mt-1">
                      次回スケジュール: {new Date(syncStats.nextScheduledSync).toLocaleString('ja-JP')}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* 同期期間選択UIを追加 */}
              <div className="space-y-4">
                <Label className="text-base">データ取得期間を選択してください：</Label>
                <RadioGroup value={syncPeriod} onValueChange={(value) => setSyncPeriod(value as SyncPeriod)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="3months" id="trigger-3months" />
                    <Label htmlFor="trigger-3months" className="cursor-pointer flex-1">
                      過去3ヶ月（推奨）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="6months" id="trigger-6months" />
                    <Label htmlFor="trigger-6months" className="cursor-pointer flex-1">
                      過去6ヶ月
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="1year" id="trigger-1year" />
                    <Label htmlFor="trigger-1year" className="cursor-pointer flex-1">
                      過去1年
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="all" id="trigger-all" />
                    <Label htmlFor="trigger-all" className="cursor-pointer flex-1">
                      全期間
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Database className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">ワンクリック同期</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        ボタンをクリックするだけで選択した期間のデータを取得
                      </p>
                    </div>
                    <Button 
                      type="button"
                      size="lg" 
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      onClick={handleStartSync}
                      disabled={isLoading || isDemoMode || !isApiClientReady}
                    >
                      {!isApiClientReady ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          クライアント初期化中...
                        </>
                      ) : isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          同期中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          今すぐ同期を実行
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-orange-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-orange-900">差分同期</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          前回同期以降の変更分のみを取得し、高速に同期
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-purple-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-purple-900">リアルタイム同期</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Webhookを使用してデータの変更を即座に反映
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}