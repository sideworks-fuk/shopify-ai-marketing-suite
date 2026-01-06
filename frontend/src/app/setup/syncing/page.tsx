'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Building2, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

interface SyncStatus {
  syncId: string | number
  jobId?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'started'
  progress?: {
    total: number
    processed: number
    percentage: number
  }
  currentTask?: string
  estimatedTimeRemaining?: number
  errorMessage?: string
  message?: string
}

export default function SyncingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getApiClient, isApiClientReady, setCurrentStoreId, currentStoreId: authCurrentStoreId } = useAuth()
  
  const [syncId, setSyncId] = useState<string | null>(null)
  const [syncIdLoaded, setSyncIdLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0) // 連続エラーカウント
  const [lastSuccessTime, setLastSuccessTime] = useState<number | null>(null) // 最後に成功した時刻

  // ★ syncId の取得（URLパラメータ → sessionStorage フォールバック）
  useEffect(() => {
    const getSyncId = (): string | null => {
      // 1. まずURLパラメータから取得
      const urlSyncId = searchParams?.get('syncId')
      if (urlSyncId) {
        console.log('📌 syncId (URLから取得):', urlSyncId)
        return urlSyncId
      }
      
      // 2. URLになければ sessionStorage から取得（App Bridge対策）
      try {
        const storedSyncId = sessionStorage.getItem('ec-ranger-syncId')
        if (storedSyncId) {
          console.log('📌 syncId (sessionStorageから取得):', storedSyncId)
          return storedSyncId
        }
      } catch (e) {
        console.warn('sessionStorage からの取得に失敗:', e)
      }
      
      console.error('❌ syncId が取得できません（URL にも sessionStorage にもない）')
      return null
    }

    const id = getSyncId()
    setSyncId(id)
    setSyncIdLoaded(true)
    
    if (!id) {
      setError('同期IDが見つかりません。初期設定画面からやり直してください。')
      setIsInitializing(false)
    }
  }, [searchParams])

  // デバッグ: isApiClientReady の状態変化を監視
  useEffect(() => {
    console.log('🔄 [SyncingPage] isApiClientReady 状態変化:', isApiClientReady)
  }, [isApiClientReady])

  // デバッグ: コンポーネントマウント時
  useEffect(() => {
    console.log('📦 [SyncingPage] マウント')
    
    // 🆕 currentStoreId が localStorage に存在するか確認
    if (typeof window !== 'undefined') {
      const currentStoreId = localStorage.getItem('currentStoreId')
      console.log('🔍 [SyncingPage] localStorage から currentStoreId を確認:', currentStoreId)
      
      if (!currentStoreId) {
        // sessionStorage からも確認
        const sessionStoreId = sessionStorage.getItem('currentStoreId')
        console.log('🔍 [SyncingPage] sessionStorage から currentStoreId を確認:', sessionStoreId)
        
        if (sessionStoreId) {
          // sessionStorage にあった場合は localStorage にも保存
          try {
            localStorage.setItem('currentStoreId', sessionStoreId)
            const parsedStoreId = parseInt(sessionStoreId, 10)
            if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
              setCurrentStoreId(parsedStoreId)
              console.log('✅ [SyncingPage] currentStoreId を sessionStorage から localStorage にコピーし、AuthProvider にも設定しました', { storeId: parsedStoreId })
            }
          } catch (error) {
            console.error('❌ [SyncingPage] localStorage への保存に失敗しました', error)
          }
        } else {
          console.error('❌ [SyncingPage] currentStoreId が localStorage にも sessionStorage にも見つかりません')
          console.error('❌ [SyncingPage] 開発者モードでログインし直してください')
          setError('ストアIDが見つかりません。開発者モードでログインし直してください。')
          setIsInitializing(false) // 🆕 エラー時は初期化を完了させる
        }
      } else {
        console.log('✅ [SyncingPage] currentStoreId が localStorage に存在します:', currentStoreId)
        // 🆕 AuthProvider にも設定
        const parsedStoreId = parseInt(currentStoreId, 10)
        if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
          setCurrentStoreId(parsedStoreId)
          console.log('✅ [SyncingPage] currentStoreId を AuthProvider に設定しました', { storeId: parsedStoreId })
          // 🆕 currentStoreId が取得できた場合、エラーメッセージをクリア
          setError(null)
        }
      }
    }
    
    return () => {
      console.log('📦 [SyncingPage] アンマウント')
    }
  }, [])

  const fetchSyncStatus = useCallback(async () => {
    if (!syncId) {
      console.error('❌ syncId がありません')
      return
    }

    if (!isApiClientReady) {
      console.log('⏳ APIクライアントが準備中のため待機...')
      return
    }

    // 🆕 currentStoreId が設定されているか確認（AuthProvider → localStorage → sessionStorage の順で確認）
    if (typeof window !== 'undefined') {
      // まず AuthProvider から取得を試みる
      let currentStoreId: string | null = null
      if (authCurrentStoreId !== null && authCurrentStoreId > 0) {
        currentStoreId = authCurrentStoreId.toString()
        console.log('✅ [SyncingPage.fetchSyncStatus] AuthProvider から currentStoreId を取得:', currentStoreId)
      } else {
        // AuthProvider になければ localStorage/sessionStorage から取得
        currentStoreId = localStorage.getItem('currentStoreId') || sessionStorage.getItem('currentStoreId')
      }
      
      if (!currentStoreId) {
        console.warn('⚠️ [SyncingPage.fetchSyncStatus] currentStoreId が見つかりません。待機します...')
        // currentStoreId が設定されるまで待機（最大5秒）
        let retryCount = 0
        const maxRetries = 10
        while (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500))
          const retryStoreId = localStorage.getItem('currentStoreId') || sessionStorage.getItem('currentStoreId')
          if (retryStoreId) {
            console.log('✅ [SyncingPage.fetchSyncStatus] currentStoreId が見つかりました:', retryStoreId)
            setCurrentStoreId(parseInt(retryStoreId, 10))
            break
          }
          retryCount++
        }
        if (retryCount >= maxRetries) {
          console.error('❌ [SyncingPage.fetchSyncStatus] currentStoreId が設定されませんでした')
          setError('ストアIDが見つかりません。開発者モードでログインし直してください。')
          setIsInitializing(false) // 🆕 エラー時は初期化を完了させる
          return
        }
      } else {
        // currentStoreId が見つかった場合、AuthProvider にも設定
        const parsedStoreId = parseInt(currentStoreId, 10)
        if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
          setCurrentStoreId(parsedStoreId)
          console.log('✅ [SyncingPage.fetchSyncStatus] currentStoreId を AuthProvider に設定しました', { storeId: parsedStoreId })
          // 🆕 currentStoreId が取得できた場合、エラーメッセージをクリア
          setError(null)
        }
      }
    }

    try {
      console.log('📡 GET /api/sync/status/' + syncId + ' 送信中...')
      const apiClient = getApiClient()
      
      // タイムアウト処理（30秒）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('リクエストがタイムアウトしました。サーバーが応答していない可能性があります。')), 30000)
      })
      
      const data = await Promise.race([
        apiClient.request<SyncStatus>(`/api/sync/status/${syncId}`, {
          method: 'GET',
        }),
        timeoutPromise
      ])
      
      console.log('📥 ステータス受信:', data)
      setSyncStatus(data)
      setError(null)
      setIsInitializing(false)
      setConsecutiveErrors(0) // エラーカウントをリセット
      setLastSuccessTime(Date.now()) // 成功時刻を記録

      // 完了時の処理
      if (data.status === 'completed') {
        console.log('✅ 同期完了！ダッシュボードへリダイレクト...')
        
        // ★ sessionStorage をクリア
        try {
          sessionStorage.removeItem('ec-ranger-syncId')
          console.log('🗑️ sessionStorage の syncId をクリア')
        } catch (e) {
          console.warn('sessionStorage のクリアに失敗:', e)
        }
        
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else if (data.status === 'failed') {
        setError(data.errorMessage || data.message || '同期中にエラーが発生しました')
        setIsInitializing(false)
      }
    } catch (err: any) {
      console.error('❌ 同期ステータス取得エラー:', err)
      const errorCount = consecutiveErrors + 1
      setConsecutiveErrors(errorCount)
      
      const errorMessage = err?.message || '予期しないエラーが発生しました'
      let displayError = errorMessage
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        displayError = '認証エラー: 再ログインしてください'
      } else if (errorMessage.includes('404')) {
        displayError = '同期ステータスが見つかりません。同期が開始されていない可能性があります。'
      } else if (errorMessage.includes('タイムアウト')) {
        displayError = errorMessage
      }
      
      // 連続で3回以上エラーが発生した場合、またはタイムアウトの場合
      if (errorCount >= 3 || errorMessage.includes('タイムアウト')) {
        setError(`${displayError} (エラー回数: ${errorCount}回)`)
        setIsInitializing(false)
      } else {
        // 1-2回目のエラーは警告として表示し、ポーリングは継続
        setError(`警告: ${displayError} (再試行中...)`)
        // isInitializing は true のまま（ポーリング継続）
      }
    }
  }, [syncId, isApiClientReady, getApiClient, router, setCurrentStoreId])

  // ★ 重要: syncId、isApiClientReady、currentStoreId が全て準備できてから処理を開始
  useEffect(() => {
    // syncId のロードが完了していない場合は待機
    if (!syncIdLoaded) {
      console.log('⏳ syncId のロードを待機中...')
      return
    }

    // syncId がない場合はエラー（既に useEffect で設定済み）
    if (!syncId) {
      console.error('❌ syncId がありません')
      return
    }

    // APIクライアントの準備ができるまで待機
    if (!isApiClientReady) {
      console.log('⏳ APIクライアントの初期化を待機中...')
      return
    }

    // 🆕 currentStoreId が設定されるまで待機
    if (!authCurrentStoreId) {
      console.log('⏳ currentStoreId の設定を待機中...', { authCurrentStoreId })
      // localStorage/sessionStorage からも確認
      const storedStoreId = typeof window !== 'undefined' 
        ? localStorage.getItem('currentStoreId') || sessionStorage.getItem('currentStoreId')
        : null
      if (storedStoreId) {
        const parsedStoreId = parseInt(storedStoreId, 10)
        if (!isNaN(parsedStoreId) && parsedStoreId > 0) {
          setCurrentStoreId(parsedStoreId)
          console.log('✅ localStorage/sessionStorage から currentStoreId を取得し、AuthProvider に設定しました', { storeId: parsedStoreId })
        }
      } else {
        // 最大5秒間待機
        const timeout = setTimeout(() => {
          const retryStoreId = typeof window !== 'undefined' 
            ? localStorage.getItem('currentStoreId') || sessionStorage.getItem('currentStoreId')
            : null
          if (!retryStoreId && !authCurrentStoreId) {
            console.error('❌ 5秒経過しても currentStoreId が設定されませんでした。認証エラーの可能性があります。');
            setError('認証エラー: ストア情報が取得できませんでした。再ログインしてください。');
            setIsInitializing(false);
          }
        }, 5000);
        return () => clearTimeout(timeout);
      }
    }

    console.log('✅ 準備完了（syncId:', syncId, ', isApiClientReady:', isApiClientReady, ', currentStoreId:', authCurrentStoreId, '）')
    console.log('✅ ステータス取得開始')
    
    // 初回取得
    fetchSyncStatus()

    // 5秒ごとにポーリング
    const interval = setInterval(() => {
      // エラーが3回以上連続で発生している場合はポーリングを停止
      if (consecutiveErrors >= 3) {
        console.error('🛑 連続エラーが3回以上発生したため、ポーリングを停止します')
        clearInterval(interval)
        setIsInitializing(false)
        return
      }
      
      // 最後の成功から60秒以上経過している場合もエラーとして扱う
      if (lastSuccessTime && Date.now() - lastSuccessTime > 60000) {
        console.error('🛑 最後の成功から60秒以上経過したため、タイムアウトとして扱います')
        setError('サーバーからの応答がありません。ネットワーク接続を確認してください。')
        setIsInitializing(false)
        clearInterval(interval)
        return
      }
      
      // 同期が完了または失敗している場合はポーリングを停止
      if (syncStatus?.status === 'completed' || syncStatus?.status === 'failed') {
        console.log('✅ 同期が完了または失敗したため、ポーリングを停止します')
        clearInterval(interval)
        return
      }
      
      // 実行中または開始済みの場合のみポーリング継続
      if (syncStatus?.status === 'running' || syncStatus?.status === 'pending' || syncStatus?.status === 'started' || !syncStatus) {
        fetchSyncStatus()
      }
    }, 5000)

    return () => {
      console.log('🛑 ポーリング停止')
      clearInterval(interval)
    }
  }, [syncId, syncIdLoaded, isApiClientReady, authCurrentStoreId, syncStatus?.status, fetchSyncStatus, consecutiveErrors, lastSuccessTime, setCurrentStoreId])

  const handleRetry = async () => {
    if (!syncId) {
      setError('同期IDがありません')
      return
    }
    
    if (!isApiClientReady) {
      setError('APIクライアントが準備中です。しばらくお待ちください。')
      return
    }

    setIsRetrying(true)
    setError(null)

    try {
      console.log('🔄 再試行: POST /api/sync/retry/' + syncId)
      const apiClient = getApiClient()
      await apiClient.request(`/api/sync/retry/${syncId}`, {
        method: 'POST',
      })

      // 状態をリセットして再度ポーリング開始
      setSyncStatus(null)
      setIsInitializing(true)
      fetchSyncStatus()
    } catch (err: any) {
      console.error('❌ 再試行エラー:', err)
      setError(err?.message || '再試行に失敗しました')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleBackgroundContinue = () => {
    router.push('/dashboard')
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds > 0 ? ` ${remainingSeconds}秒` : ''}`
  }

  // syncId ロード中
  if (!syncIdLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <p className="text-gray-600">読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // syncId がない場合のエラー表示
  if (!syncId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Building2 className="h-8 w-8" />
              <span>EC Ranger</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                同期IDが見つかりません。初期設定画面からやり直してください。
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button onClick={() => router.push('/setup/initial')}>
                初期設定画面へ戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // APIクライアント初期化中の表示（エラーがない場合のみ）
  if ((!isApiClientReady || isInitializing) && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Building2 className="h-8 w-8" />
              <span>EC Ranger</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <h2 className="text-xl font-semibold">初期化中...</h2>
              <p className="text-gray-600">同期ステータスを取得しています</p>
              <p className="text-sm text-gray-400">syncId: {syncId}</p>
              {consecutiveErrors > 0 && (
                <p className="text-sm text-yellow-600">警告: {consecutiveErrors}回のエラーが発生しましたが、再試行中...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Building2 className="h-8 w-8" />
            <span>EC Ranger</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {syncStatus?.status === 'completed' ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">データ同期が完了しました！</h2>
              <p className="text-gray-600">ダッシュボードへ移動しています...</p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-2">データ同期中...</h2>
                {syncStatus && (
                  <p className="text-gray-600">
                    {syncStatus.currentTask || syncStatus.message || '処理中です...'}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {syncStatus?.progress && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>進捗</span>
                      <span>{syncStatus.progress.percentage}%</span>
                    </div>
                    <Progress value={syncStatus.progress.percentage} className="h-3" />
                    <p className="text-sm text-gray-600 mt-2">
                      処理中: {syncStatus.currentTask || '...'} ({syncStatus.progress.processed}/{syncStatus.progress.total}件)
                    </p>
                  </div>

                  {syncStatus.estimatedTimeRemaining && syncStatus.estimatedTimeRemaining > 0 && (
                    <p className="text-sm text-gray-600">
                      予想残り時間: 約{formatTime(syncStatus.estimatedTimeRemaining)}
                    </p>
                  )}
                </div>
              )}

              {/* 進捗情報がない場合のシンプル表示 */}
              {!syncStatus?.progress && syncStatus && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
                    <span className="text-gray-600">同期処理を実行中...</span>
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    ステータス: {syncStatus.status}
                    {syncStatus.jobId && ` (Job ID: ${syncStatus.jobId})`}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {syncStatus?.status === 'failed' ? (
                  <Button 
                    onClick={handleRetry} 
                    disabled={isRetrying}
                    className="flex-1"
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        再試行中...
                      </>
                    ) : (
                      '再試行'
                    )}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={handleBackgroundContinue}
                    disabled={!syncStatus}
                  >
                    バックグラウンドで続行
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
