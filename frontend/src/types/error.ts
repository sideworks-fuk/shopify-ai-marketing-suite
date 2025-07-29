/**
 * 統一エラーハンドリングシステム - エラー型定義
 * プロジェクト全体で使用する統一されたエラー型とインターフェース
 */

// エラーの重要度レベル
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

// エラーカテゴリ
export type ErrorType = 
  | 'network'      // ネットワーク接続エラー
  | 'authentication' // 認証エラー
  | 'authorization'  // 認可エラー
  | 'validation'     // バリデーションエラー
  | 'server'         // サーバーエラー
  | 'timeout'        // タイムアウトエラー
  | 'parse'          // データ解析エラー
  | 'unknown'        // 予期しないエラー

// ユーザー通知方法
export type NotificationType = 'toast' | 'modal' | 'inline' | 'console'

// エラーハンドリングオプション
export interface ErrorOptions {
  context?: string                    // エラー発生コンテキスト
  severity?: ErrorSeverity           // エラー重要度
  type?: ErrorType                   // エラーカテゴリ
  userMessage?: string               // ユーザー向けメッセージ
  showToUser?: boolean               // ユーザーに表示するか
  silent?: boolean                   // ログ出力を抑制するか
  notifyType?: NotificationType      // 通知方法
  retry?: {                          // リトライ設定
    enabled: boolean
    maxAttempts: number
    onRetry?: () => Promise<void>
  }
  fallback?: {                       // フォールバック設定
    enabled: boolean
    useMockData?: boolean
    customHandler?: () => void
  }
  trackError?: boolean               // エラー追跡（将来的なSentry連携用）
}

// 拡張エラークラス
export class AppError extends Error {
  public readonly severity: ErrorSeverity
  public readonly type: ErrorType
  public readonly context?: string
  public readonly userMessage: string
  public readonly statusCode?: number
  public readonly originalError?: Error
  public readonly timestamp: Date
  public readonly stack?: string

  constructor(
    message: string,
    options: ErrorOptions = {},
    originalError?: Error
  ) {
    super(message)
    
    this.name = 'AppError'
    this.severity = options.severity || 'error'
    this.type = options.type || 'unknown'
    this.context = options.context
    this.userMessage = options.userMessage || this.getDefaultUserMessage()
    this.originalError = originalError
    this.timestamp = new Date()
    
    // HTTP ステータスコードの設定
    if (originalError && 'statusCode' in originalError) {
      this.statusCode = originalError.statusCode as number
    }

    // スタックトレースの保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  private getDefaultUserMessage(): string {
    switch (this.type) {
      case 'network':
        return 'ネットワーク接続に問題があります。インターネット接続を確認してください。'
      case 'authentication':
        return '認証に失敗しました。再度ログインしてください。'
      case 'authorization':
        return 'この操作を実行する権限がありません。'
      case 'validation':
        return '入力内容に問題があります。確認して再度お試しください。'
      case 'server':
        return 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。'
      case 'timeout':
        return 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください。'
      case 'parse':
        return 'データの処理中にエラーが発生しました。'
      default:
        return '予期しないエラーが発生しました。問題が続く場合はサポートにお問い合わせください。'
    }
  }

  // エラー情報をJSONで出力
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      type: this.type,
      context: this.context,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    }
  }
}

// エラーコンテキスト情報
export interface ErrorContext {
  component?: string                 // React コンポーネント名
  action?: string                   // 実行していたアクション
  api?: {                          // API関連情報
    endpoint: string
    method: string
    params?: Record<string, any>
  }
  user?: {                         // ユーザー情報
    id?: string
    role?: string
  }
  browser?: {                      // ブラウザ情報
    userAgent: string
    url: string
    timestamp: string
  }
}

// エラーレポート用の型
export interface ErrorReport {
  error: AppError
  context: ErrorContext
  handled: boolean
  retryCount?: number
}

// エラーハンドラーの設定
export interface ErrorHandlerConfig {
  enableLogging: boolean
  enableUserNotification: boolean
  enableErrorTracking: boolean
  defaultNotificationType: NotificationType
  maxRetryAttempts: number
  enableMockDataFallback: boolean
  developmentMode: boolean
}

// HTTPステータスコードからエラータイプを推測
export function getErrorTypeFromStatus(statusCode: number): ErrorType {
  if (statusCode >= 400 && statusCode < 500) {
    switch (statusCode) {
      case 401:
        return 'authentication'
      case 403:
        return 'authorization'
      case 408:
        return 'timeout'
      case 422:
        return 'validation'
      default:
        return 'validation'
    }
  } else if (statusCode >= 500) {
    return 'server'
  } else if (statusCode === 0) {
    return 'network'
  }
  return 'unknown'
}

// エラー重要度の比較
export function compareSeverity(a: ErrorSeverity, b: ErrorSeverity): number {
  const levels = { info: 0, warning: 1, error: 2, critical: 3 }
  return levels[a] - levels[b]
}