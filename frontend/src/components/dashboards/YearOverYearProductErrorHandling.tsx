"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Wifi, Server, Clock } from "lucide-react"

/**
 * 前年同月比【商品】画面 - エラーハンドリングコンポーネント
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description 分析実行時のエラーを適切に表示し、再試行オプションを提供
 */

export interface AnalysisError {
  type: 'network' | 'server' | 'timeout' | 'validation' | 'unknown'
  message: string
  details?: string
  retryable: boolean
  statusCode?: number
}

interface ErrorHandlingProps {
  error: AnalysisError
  onRetry: () => void
  onGoBack: () => void
}

// エラータイプに応じたアイコンを取得
const getErrorIcon = (type: AnalysisError['type']) => {
  switch (type) {
    case 'network':
      return <Wifi className="h-5 w-5" />
    case 'server':
      return <Server className="h-5 w-5" />
    case 'timeout':
      return <Clock className="h-5 w-5" />
    default:
      return <AlertCircle className="h-5 w-5" />
  }
}

// エラータイプに応じたタイトルを取得
const getErrorTitle = (type: AnalysisError['type']) => {
  switch (type) {
    case 'network':
      return 'ネットワークエラー'
    case 'server':
      return 'サーバーエラー'
    case 'timeout':
      return 'タイムアウトエラー'
    case 'validation':
      return '入力エラー'
    default:
      return 'エラーが発生しました'
  }
}

// エラータイプに応じた説明を取得
const getErrorDescription = (type: AnalysisError['type']) => {
  switch (type) {
    case 'network':
      return 'インターネット接続を確認してください。'
    case 'server':
      return 'サーバーに問題が発生しています。しばらく待ってから再度お試しください。'
    case 'timeout':
      return 'データの取得に時間がかかりすぎました。条件を絞って再度お試しください。'
    case 'validation':
      return '入力された条件に問題があります。条件を確認してください。'
    default:
      return '予期しないエラーが発生しました。'
  }
}

export const YearOverYearProductErrorHandling: React.FC<ErrorHandlingProps> = ({
  error,
  onRetry,
  onGoBack
}) => {
  const [showDetails, setShowDetails] = React.useState(false)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Alert variant="destructive">
        <div className="flex items-start space-x-3">
          {getErrorIcon(error.type)}
          <div className="flex-1">
            <AlertTitle>{getErrorTitle(error.type)}</AlertTitle>
            <AlertDescription className="mt-2">
              {error.message || getErrorDescription(error.type)}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>次のアクション</CardTitle>
          <CardDescription>
            問題を解決するために、以下のオプションをお試しください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 再試行ボタン（再試行可能な場合のみ） */}
          {error.retryable && (
            <Button
              onClick={onRetry}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              もう一度試す
            </Button>
          )}

          {/* 条件変更ボタン */}
          <Button
            onClick={onGoBack}
            variant="outline"
            className="w-full"
            size="lg"
          >
            条件を変更する
          </Button>

          {/* エラー詳細の表示/非表示 */}
          {error.details && (
            <div className="pt-4 border-t">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-900"
              >
                <span>エラーの詳細</span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {showDetails && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {error.details}
                    {error.statusCode && `\nステータスコード: ${error.statusCode}`}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* トラブルシューティングのヒント */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">トラブルシューティング</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            {error.type === 'network' && (
              <>
                <li>• インターネット接続が安定していることを確認してください</li>
                <li>• VPNを使用している場合は、一時的に無効にしてみてください</li>
                <li>• ファイアウォールの設定を確認してください</li>
              </>
            )}
            {error.type === 'server' && (
              <>
                <li>• しばらく時間をおいてから再度お試しください</li>
                <li>• 問題が続く場合は、システム管理者にお問い合わせください</li>
              </>
            )}
            {error.type === 'timeout' && (
              <>
                <li>• 分析期間を短くしてお試しください</li>
                <li>• カテゴリを絞り込んでお試しください</li>
                <li>• 最小売上閾値を上げて商品数を減らしてください</li>
              </>
            )}
            {error.type === 'validation' && (
              <>
                <li>• 入力した条件が正しいことを確認してください</li>
                <li>• 日付範囲が有効であることを確認してください</li>
                <li>• 必須項目がすべて入力されていることを確認してください</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * エラーを分類するヘルパー関数
 */
export const classifyError = (error: any): AnalysisError => {
  // ネットワークエラー
  if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return {
      type: 'network',
      message: 'ネットワークに接続できません',
      retryable: true
    }
  }

  // タイムアウトエラー
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'リクエストがタイムアウトしました',
      retryable: true
    }
  }

  // サーバーエラー
  if (error.response?.status >= 500) {
    return {
      type: 'server',
      message: error.response?.data?.message || 'サーバーエラーが発生しました',
      statusCode: error.response.status,
      retryable: error.response.status !== 501, // Not Implemented以外は再試行可能
      details: error.response?.data?.details
    }
  }

  // バリデーションエラー
  if (error.response?.status === 400 || error.response?.status === 422) {
    return {
      type: 'validation',
      message: error.response?.data?.message || '入力内容に問題があります',
      statusCode: error.response.status,
      retryable: false,
      details: error.response?.data?.errors ? 
        JSON.stringify(error.response.data.errors, null, 2) : undefined
    }
  }

  // その他のエラー
  return {
    type: 'unknown',
    message: error.message || '予期しないエラーが発生しました',
    retryable: true,
    details: error.stack
  }
}