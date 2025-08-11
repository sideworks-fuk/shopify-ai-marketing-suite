"use client"

import React, { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

export function BackendConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [errorDetails, setErrorDetails] = useState<string>('')
  const [isRetrying, setIsRetrying] = useState(false)

  const checkConnection = async () => {
    setConnectionStatus('checking')
    setErrorDetails('')
    
    try {
      const apiUrl = getApiUrl()
      const healthUrl = `${apiUrl}/api/health`
      
      console.log('🏥 Checking backend health:', healthUrl)
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Backend is healthy')
        setConnectionStatus('connected')
      } else {
        throw new Error(`Health check failed: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Backend connection error:', error)
      setConnectionStatus('error')
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setErrorDetails('バックエンドサーバーに接続できません')
      } else {
        setErrorDetails(error instanceof Error ? error.message : '接続エラー')
      }
    }
  }

  useEffect(() => {
    // 開発環境でのみ接続チェックを実行
    if (process.env.NODE_ENV === 'development') {
      checkConnection()
    }
  }, [])

  const handleRetry = async () => {
    setIsRetrying(true)
    await checkConnection()
    setIsRetrying(false)
  }

  // 開発環境以外では表示しない
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // 接続成功時は表示しない
  if (connectionStatus === 'connected') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md z-50">
      {connectionStatus === 'checking' && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>バックエンド接続確認中...</AlertTitle>
        </Alert>
      )}

      {connectionStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>バックエンド接続エラー</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>{errorDetails}</p>
            <div className="text-sm space-y-1">
              <p>対処方法:</p>
              <ul className="list-disc list-inside pl-2">
                <li>バックエンドサーバー（{getApiUrl()}）を起動</li>
                <li>ターミナルで <code className="bg-gray-100 px-1">dotnet run</code> を実行</li>
                <li><a href="/dev/backend-health-check" className="underline">ヘルスチェック</a>で詳細確認</li>
              </ul>
            </div>
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    再試行中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    再試行
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setConnectionStatus('connected')}
              >
                閉じる
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}