"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function BackendHealthCheck() {
  const [results, setResults] = useState<{[key: string]: any}>({})
  const [isLoading, setIsLoading] = useState(false)

  // バックエンドURLの設定
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  const isHttps = backendUrl.startsWith('https://')
  
  // 環境変数に基づいて適切なプロトコルのエンドポイントのみを使用
  const endpoints = isHttps ? [
    { name: 'Health Check (HTTPS)', url: `${backendUrl}/api/health`, method: 'GET' },
    { name: 'Auth Token (HTTPS)', url: `${backendUrl}/api/auth/token`, method: 'POST' },
  ] : [
    { name: 'Health Check (HTTP)', url: `${backendUrl}/api/health`, method: 'GET' },
    { name: 'Auth Token (HTTP)', url: `${backendUrl}/api/auth/token`, method: 'POST' },
  ]
  
  // デバッグ用：両方のプロトコルをテストする追加エンドポイント（オプション）
  const debugEndpoints = [
    { name: 'Debug: HTTP Health', url: `http://localhost:${backendUrl.split(':').pop()?.replace('/', '')}/api/health`, method: 'GET' },
    { name: 'Debug: HTTPS Health', url: `https://localhost:${backendUrl.split(':').pop()?.replace('/', '')}/api/health`, method: 'GET' },
  ]

  const checkEndpoint = async (endpoint: typeof endpoints[0]) => {
    const startTime = Date.now()
    
    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }

      if (endpoint.method === 'POST') {
        options.body = JSON.stringify({
          storeId: 1,
          shopDomain: 'fuk-dev1.myshopify.com'
        })
      }

      const response = await fetch(endpoint.url, options)
      const duration = Date.now() - startTime

      let responseData
      try {
        responseData = await response.text()
        responseData = JSON.parse(responseData)
      } catch {
        // テキストとして保持
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        duration,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        errorType: error instanceof TypeError ? 'Network Error' : 'Other Error'
      }
    }
  }

  const runHealthChecks = async () => {
    setIsLoading(true)
    setResults({})

    for (const endpoint of endpoints) {
      const result = await checkEndpoint(endpoint)
      setResults(prev => ({
        ...prev,
        [endpoint.name]: result
      }))
    }

    setIsLoading(false)
  }

  const getStatusIcon = (result: any) => {
    if (!result) return <AlertCircle className="h-5 w-5 text-gray-400" />
    if (result.success) return <CheckCircle className="h-5 w-5 text-green-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusColor = (result: any) => {
    if (!result) return 'bg-gray-100'
    if (result.success) return 'bg-green-50'
    return 'bg-red-50'
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🏥 バックエンド ヘルスチェック</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>このツールはバックエンドサーバーの接続状態を確認します。</p>
                <p className="font-semibold">現在の設定: {backendUrl}</p>
                <p className="text-xs text-gray-600">プロトコル: {isHttps ? 'HTTPS' : 'HTTP'}</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button onClick={runHealthChecks} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  チェック中...
                </>
              ) : (
                'ヘルスチェック実行'
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {endpoints.map(endpoint => {
              const result = results[endpoint.name]
              return (
                <Card key={endpoint.name} className={getStatusColor(result)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result)}
                        <h3 className="font-semibold">{endpoint.name}</h3>
                      </div>
                      {result && (
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.success ? `${result.status} OK` : 'Failed'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><strong>URL:</strong> {endpoint.url}</p>
                      <p><strong>メソッド:</strong> {endpoint.method}</p>
                      
                      {result && (
                        <>
                          <p><strong>応答時間:</strong> {result.duration}ms</p>
                          
                          {result.success ? (
                            <>
                              <p><strong>ステータス:</strong> {result.status} {result.statusText}</p>
                              {result.headers && (
                                <details>
                                  <summary className="cursor-pointer font-semibold">レスポンスヘッダー</summary>
                                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(result.headers, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {result.data && (
                                <details>
                                  <summary className="cursor-pointer font-semibold">レスポンスデータ</summary>
                                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                    {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-red-600"><strong>エラー:</strong> {result.error}</p>
                              <p><strong>エラータイプ:</strong> {result.errorType}</p>
                              
                              {result.errorType === 'Network Error' && (
                                <Alert className="mt-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    ネットワークエラーの対処法:
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                      <li>バックエンドサーバーが起動しているか確認</li>
                                      <li>ポート7088が正しく開いているか確認</li>
                                      <li>CORS設定を確認（Access-Control-Allow-Origin）</li>
                                      <li>HTTPSの場合、証明書を受け入れる必要があります</li>
                                    </ul>
                                  </AlertDescription>
                                </Alert>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {isHttps && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>💡 ヒント:</strong> HTTPSでエラーが出る場合は、ブラウザで直接 
                <a href={backendUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 underline">
                  {backendUrl}
                </a> 
                にアクセスして証明書を受け入れてください。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}