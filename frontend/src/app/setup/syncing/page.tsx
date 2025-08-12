'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

interface SyncStatus {
  syncId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: {
    total: number
    processed: number
    percentage: number
  }
  currentTask: string
  estimatedTimeRemaining: number
  errorMessage?: string
}

export default function SyncingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const syncId = searchParams?.get('syncId')
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const fetchSyncStatus = async () => {
    if (!syncId) {
      setError('同期IDが見つかりません')
      return
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/sync/status/${syncId}`)
      
      if (!response.ok) {
        throw new Error('同期状態の取得に失敗しました')
      }

      const data: SyncStatus = await response.json()
      setSyncStatus(data)

      // 完了時の処理
      if (data.status === 'completed') {
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else if (data.status === 'failed') {
        setError(data.errorMessage || '同期中にエラーが発生しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
    }
  }

  useEffect(() => {
    if (!syncId) return

    // 初回取得
    fetchSyncStatus()

    // 5秒ごとにポーリング
    const interval = setInterval(() => {
      if (syncStatus?.status === 'running' || syncStatus?.status === 'pending') {
        fetchSyncStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [syncId, syncStatus?.status])

  const handleRetry = async () => {
    setIsRetrying(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/api/sync/retry/${syncId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('再試行の開始に失敗しました')
      }

      // 状態をリセットして再度ポーリング開始
      setSyncStatus(null)
      fetchSyncStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : '再試行に失敗しました')
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

  if (!syncId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>同期IDが見つかりません</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            🏪 EC Ranger
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
                    {syncStatus.currentTask}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {syncStatus && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>進捗</span>
                      <span>{syncStatus.progress.percentage}%</span>
                    </div>
                    <Progress value={syncStatus.progress.percentage} className="h-3" />
                    <p className="text-sm text-gray-600 mt-2">
                      取得中: {syncStatus.currentTask} ({syncStatus.progress.processed}/{syncStatus.progress.total}件)
                    </p>
                  </div>

                  {syncStatus.estimatedTimeRemaining > 0 && (
                    <p className="text-sm text-gray-600">
                      予想残り時間: 約{formatTime(syncStatus.estimatedTimeRemaining)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {syncStatus?.status === 'failed' ? (
                  <Button 
                    onClick={handleRetry} 
                    disabled={isRetrying}
                    className="flex-1"
                  >
                    {isRetrying ? '再試行中...' : '再試行'}
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={handleBackgroundContinue}
                    disabled={!syncStatus || syncStatus.status === 'pending'}
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