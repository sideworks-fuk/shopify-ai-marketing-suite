"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

export default function HttpsConfigTest() {
  const [apiUrl, setApiUrl] = useState<string>('')
  const [isHttps, setIsHttps] = useState<boolean>(false)
  const [envVars, setEnvVars] = useState<{[key: string]: string | undefined}>({})

  const checkConfiguration = () => {
    const url = getApiUrl()
    setApiUrl(url)
    setIsHttps(url.startsWith('https://'))
    
    // 環境変数の確認
    setEnvVars({
      NEXT_PUBLIC_USE_HTTPS: process.env.NEXT_PUBLIC_USE_HTTPS,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
      NODE_ENV: process.env.NODE_ENV,
    })
  }

  useEffect(() => {
    checkConfiguration()
  }, [])

  const getProtocolBadge = () => {
    if (isHttps) {
      return <Badge variant="default" className="bg-green-600">HTTPS</Badge>
    }
    return <Badge variant="secondary">HTTP</Badge>
  }

  const getProtocolIcon = () => {
    if (isHttps) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    return <AlertCircle className="h-5 w-5 text-yellow-600" />
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🔒 HTTPS設定テスト</span>
            <Button size="sm" variant="outline" onClick={checkConfiguration}>
              <RefreshCw className="h-4 w-4 mr-2" />
              再チェック
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 現在の接続設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">現在の接続設定</h3>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              {getProtocolIcon()}
              <div className="flex-1">
                <p className="font-medium">API URL</p>
                <code className="text-sm text-gray-600">{apiUrl}</code>
              </div>
              {getProtocolBadge()}
            </div>
          </div>

          {/* 環境変数 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">環境変数</h3>
            <div className="space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <code className="text-sm font-medium">{key}</code>
                  <code className="text-sm text-gray-600">
                    {value || <span className="text-gray-400">未設定</span>}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* 設定ガイド */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">HTTPSを使用する方法:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li><code>.env.local</code>ファイルを作成: <code>cp .env.local.example .env.local</code></li>
                  <li><code>NEXT_PUBLIC_USE_HTTPS=true</code>を設定</li>
                  <li>バックエンドで証明書を信頼: <code>dotnet dev-certs https --trust</code></li>
                  <li>ブラウザで<a href={process.env.NEXT_PUBLIC_BACKEND_URL?.replace('http://', 'https://').replace(':5000', ':7088') || 'https://localhost:7088'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mx-1">{process.env.NEXT_PUBLIC_BACKEND_URL?.replace('http://', 'https://').replace(':5000', ':7088') || 'https://localhost:7088'}</a>にアクセスして証明書を受け入れる</li>
                  <li>フロントエンドを再起動</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          {/* 現在のモード説明 */}
          {isHttps ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>HTTPS使用中</strong> - セキュアな接続で通信しています。
                証明書エラーが発生する場合は、上記の手順を確認してください。
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>HTTP使用中</strong> - 開発環境では証明書問題を回避するためHTTPを使用しています。
                HTTPSを使用したい場合は、上記の設定ガイドを参照してください。
              </AlertDescription>
            </Alert>
          )}

          {/* テストボタン */}
          <div className="pt-4">
            <Button
              onClick={() => window.open(apiUrl + '/api/health', '_blank')}
              variant="outline"
              className="w-full"
            >
              APIヘルスチェックを新しいタブで開く
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}