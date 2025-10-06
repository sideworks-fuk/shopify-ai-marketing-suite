"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { getApiUrl } from '@/lib/api-config'

export default function JWTProductionTestPage() {
  const [testResults, setTestResults] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)

  const runTests = async () => {
    setIsLoading(true)
    const results: any = {}

    // 1. 環境変数チェック
    results.environment = {
      apiUrl: getApiUrl(),
      backendUrl: process.env.NEXT_PUBLIC_API_URL,
      hasToken: !!localStorage.getItem('accessToken'),
      hasRefreshToken: !!localStorage.getItem('refreshToken')
    }

    // 2. トークン状態チェック
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        results.tokenInfo = {
          exp: new Date(payload.exp * 1000).toLocaleString(),
          isExpired: payload.exp * 1000 < Date.now(),
          tenant_id: payload.tenant_id,
          store_id: payload.store_id
        }
      } catch (e) {
        results.tokenInfo = { error: 'トークンのデコードに失敗' }
      }
    }

    // 3. バックエンド接続テスト
    try {
      const healthResponse = await fetch(`${getApiUrl()}/health`)
      results.healthCheck = {
        status: healthResponse.status,
        ok: healthResponse.ok,
        statusText: healthResponse.statusText
      }
    } catch (e) {
      results.healthCheck = { error: e instanceof Error ? e.message : String(e) }
    }

    // 4. 認証付きAPIテスト
    if (token) {
      try {
        const authResponse = await fetch(`${getApiUrl()}/customer/dormant/summary?storeId=2`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        results.authTest = {
          status: authResponse.status,
          ok: authResponse.ok,
          statusText: authResponse.statusText
        }

        if (!authResponse.ok) {
          const errorText = await authResponse.text()
          results.authTest.error = errorText
        }
      } catch (e) {
        results.authTest = { error: e instanceof Error ? e.message : String(e) }
      }
    }

    // 5. リフレッシュトークンテスト
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${getApiUrl()}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        })
        
        results.refreshTest = {
          status: refreshResponse.status,
          ok: refreshResponse.ok,
          statusText: refreshResponse.statusText
        }

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text()
          results.refreshTest.error = errorText
        }
      } catch (e) {
        results.refreshTest = { error: e instanceof Error ? e.message : String(e) }
      }
    }

    setTestResults(results)
    setIsLoading(false)
  }

  const clearTokens = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setTestResults({})
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🔐 JWT認証 本番環境テスト
            <Badge variant="destructive">Production Test</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              本番環境でのJWT認証の問題を診断します。
              このツールは、環境変数、トークン状態、API接続を確認します。
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isLoading}>
              {isLoading ? 'テスト実行中...' : 'テスト実行'}
            </Button>
            <Button variant="outline" onClick={clearTokens}>
              トークンクリア
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <div className="space-y-4 mt-6">
              {/* 環境変数 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">1. 環境変数</h3>
                <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(testResults.environment, null, 2)}
                </pre>
              </div>

              {/* トークン情報 */}
              {testResults.tokenInfo && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">2. トークン情報</h3>
                  <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults.tokenInfo, null, 2)}
                  </pre>
                </div>
              )}

              {/* ヘルスチェック */}
              {testResults.healthCheck && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">3. ヘルスチェック（認証なし）</h3>
                  <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults.healthCheck, null, 2)}
                  </pre>
                </div>
              )}

              {/* 認証付きAPI */}
              {testResults.authTest && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">4. 認証付きAPIテスト</h3>
                  <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults.authTest, null, 2)}
                  </pre>
                </div>
              )}

              {/* リフレッシュトークン */}
              {testResults.refreshTest && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">5. リフレッシュトークンテスト</h3>
                  <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults.refreshTest, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <Alert className="mt-6">
            <AlertDescription>
              <strong>401エラーの対処法：</strong>
              <ol className="list-decimal list-inside mt-2">
                <li>Azure App ServiceでJWT_SECRET環境変数が設定されているか確認</li>
                <li>CORS設定でフロントエンドのURLが許可されているか確認</li>
                <li>トークンの有効期限が切れていないか確認</li>
                <li>バックエンドの再起動が必要な場合があります</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}