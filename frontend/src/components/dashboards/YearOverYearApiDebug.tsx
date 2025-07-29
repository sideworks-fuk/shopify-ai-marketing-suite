"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Alert, AlertDescription } from "../ui/alert"
import { yearOverYearApi } from "../../lib/api/year-over-year"
import { getCurrentEnvironmentConfig } from "../../lib/config/environments"
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"

/**
 * 前年同月比API接続デバッグコンポーネント
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description API接続のテストとデバッグ情報表示
 */

export default function YearOverYearApiDebug() {
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testApiConnection = async () => {
    setIsLoading(true)
    setTestResult(null)
    setError(null)

    try {
      // 環境設定の確認
      const envConfig = getCurrentEnvironmentConfig()
      console.log('🔍 Environment Config:', envConfig)

      // 基本的なAPI呼び出しテスト
      const currentYear = new Date().getFullYear()
      console.log('📅 Testing with year:', currentYear)
      
      const response = await yearOverYearApi.getYearOverYearAnalysis({
        storeId: 1,
        year: currentYear,
        viewMode: 'sales'
      })

      setTestResult({
        success: true,
        environment: envConfig,
        apiResponse: response,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('API Test Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setTestResult({
        success: false,
        error: err,
        environment: getCurrentEnvironmentConfig(),
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>前年同月比API接続テスト</CardTitle>
          <CardDescription>
            API接続状態の確認とデバッグ情報の表示
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 環境情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">現在の環境設定</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">環境:</span> {getCurrentEnvironmentConfig().name}
              </div>
              <div>
                <span className="font-medium">API URL:</span> {getCurrentEnvironmentConfig().apiBaseUrl}
              </div>
              <div>
                <span className="font-medium">説明:</span> {getCurrentEnvironmentConfig().description}
              </div>
            </div>
          </div>

          {/* テストボタン */}
          <Button 
            onClick={testApiConnection} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                接続テスト中...
              </>
            ) : (
              'API接続テスト実行'
            )}
          </Button>

          {/* エラー表示 */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">接続エラー</div>
                <div className="text-sm">{error}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* テスト結果 */}
          {testResult && (
            <div className="space-y-4">
              {testResult.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="font-medium text-green-800">接続成功</div>
                    <div className="text-sm mt-1">
                      APIへの接続が正常に確立されました
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">接続失敗</div>
                    <div className="text-sm mt-1">
                      APIへの接続に失敗しました
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* 詳細情報 */}
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                <h4 className="font-mono text-sm mb-2">Debug Information:</h4>
                <pre className="text-xs">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>

              {/* トラブルシューティング */}
              {!testResult.success && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">トラブルシューティング</div>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>バックエンドAPIが起動していることを確認してください</li>
                      <li>https://localhost:7088 でAPIにアクセスできるか確認してください</li>
                      <li>CORSの設定が正しいか確認してください</li>
                      <li>証明書エラーの場合は、ブラウザで直接APIにアクセスして証明書を受け入れてください</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}