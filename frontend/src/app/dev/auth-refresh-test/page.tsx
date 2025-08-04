"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { buildApiUrl, API_CONFIG } from '@/lib/api-config'

export default function AuthRefreshTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testRefreshToken = async () => {
    setIsLoading(true)
    setTestResults([])

    try {
      // 1. 現在のトークン状態を確認
      const authStatus = authClient.getAuthStatus()
      addResult(`認証状態: ${JSON.stringify(authStatus, null, 2)}`)

      // 2. ローカルストレージからトークンを取得
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      addResult(`アクセストークン: ${accessToken ? accessToken.substring(0, 30) + '...' : 'なし'}`)
      addResult(`リフレッシュトークン: ${refreshToken ? refreshToken.substring(0, 30) + '...' : 'なし'}`)

      if (!refreshToken) {
        addResult('❌ リフレッシュトークンが存在しません。先に認証してください。')
        return
      }

      // 3. リフレッシュエンドポイントを直接テスト
      addResult('📤 リフレッシュエンドポイントをテスト中...')
      
      const refreshUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH_REFRESH)
      addResult(`URL: ${refreshUrl}`)

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: refreshToken
        })
      })

      addResult(`レスポンスステータス: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        addResult('✅ リフレッシュ成功!')
        addResult(`新しいアクセストークン: ${data.accessToken ? data.accessToken.substring(0, 30) + '...' : 'なし'}`)
        addResult(`新しいリフレッシュトークン: ${data.refreshToken ? data.refreshToken.substring(0, 30) + '...' : 'なし'}`)
      } else {
        const errorText = await response.text()
        addResult(`❌ リフレッシュ失敗: ${errorText}`)
      }

    } catch (error) {
      addResult(`❌ エラー: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testAuthenticateFlow = async () => {
    setIsLoading(true)
    setTestResults([])

    try {
      addResult('🔐 新規認証フローをテスト中...')
      
      // ストアID 1で認証
      const tokens = await authClient.authenticate(1)
      
      addResult('✅ 認証成功!')
      addResult(`アクセストークン: ${tokens.accessToken.substring(0, 30)}...`)
      addResult(`リフレッシュトークン: ${tokens.refreshToken.substring(0, 30)}...`)
      
    } catch (error) {
      addResult(`❌ 認証エラー: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearTokens = () => {
    authClient.clearTokens()
    setTestResults(['✅ トークンをクリアしました'])
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔐 JWT リフレッシュトークン テスト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testAuthenticateFlow} disabled={isLoading}>
              新規認証
            </Button>
            <Button onClick={testRefreshToken} disabled={isLoading} variant="secondary">
              リフレッシュテスト
            </Button>
            <Button onClick={clearTokens} variant="destructive">
              トークンクリア
            </Button>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">テスト結果:</h3>
            <div className="space-y-1 font-mono text-sm">
              {testResults.length === 0 ? (
                <p className="text-gray-500">テストを実行してください</p>
              ) : (
                testResults.map((result, index) => (
                  <p key={index} className="whitespace-pre-wrap">{result}</p>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">📝 デバッグ手順:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>「新規認証」でトークンを取得</li>
              <li>「リフレッシュテスト」でリフレッシュエンドポイントをテスト</li>
              <li>401エラーが出る場合はバックエンドのリフレッシュ実装を確認</li>
              <li>必要に応じて「トークンクリア」で状態をリセット</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}