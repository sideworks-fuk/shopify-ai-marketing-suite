/**
 * 統一エラーハンドリングシステム - メインハンドラー
 * プロジェクト全体で使用する統一されたエラーハンドリング機能
 */

import { 
  AppError, 
  ErrorOptions, 
  ErrorType, 
  ErrorSeverity, 
  NotificationType,
  ErrorContext,
  ErrorReport,
  ErrorHandlerConfig,
  getErrorTypeFromStatus 
} from '../types/error'

// デフォルト設定
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableLogging: true,
  enableUserNotification: true,
  enableErrorTracking: false, // 将来的なSentry連携時にtrue
  defaultNotificationType: 'toast',
  maxRetryAttempts: 3,
  enableMockDataFallback: true,
  developmentMode: process.env.NODE_ENV === 'development'
}

class ErrorHandler {
  private config: ErrorHandlerConfig
  private toastHandler?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
  private retryAttempts: Map<string, number> = new Map()

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * トースト通知ハンドラーを設定
   * AppStore の showToast 関数を渡す
   */
  setToastHandler(handler: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void) {
    this.toastHandler = handler
  }

  /**
   * メインのエラーハンドリング関数
   */
  async handle(
    error: Error | AppError | unknown, 
    options: ErrorOptions = {},
    context?: Partial<ErrorContext>
  ): Promise<void> {
    // AppError でない場合は変換
    const appError = this.normalizeError(error, options)
    
    // エラーコンテキストの構築
    const fullContext = this.buildContext(context)
    
    // エラーレポートの作成
    const errorReport: ErrorReport = {
      error: appError,
      context: fullContext,
      handled: false,
      retryCount: this.getRetryCount(appError.context || 'unknown')
    }

    try {
      // 1. ログ出力
      if (this.config.enableLogging && !options.silent) {
        this.logError(errorReport)
      }

      // 2. ユーザー通知
      if (this.config.enableUserNotification && (options.showToUser !== false)) {
        await this.notifyUser(appError, options.notifyType || this.config.defaultNotificationType)
      }

      // 3. リトライ処理
      if (options.retry?.enabled && this.shouldRetry(errorReport)) {
        await this.handleRetry(errorReport, options.retry.onRetry)
        return
      }

      // 4. フォールバック処理
      if (options.fallback?.enabled) {
        this.handleFallback(options.fallback)
      }

      // 5. エラー追跡（将来的なSentry連携）
      if (this.config.enableErrorTracking && options.trackError !== false) {
        await this.trackError(errorReport)
      }

      errorReport.handled = true

    } catch (handlingError) {
      // エラーハンドリング自体でエラーが発生した場合
      this.logError({
        error: new AppError('Error handler failed', { 
          severity: 'critical',
          type: 'unknown',
          context: 'error-handler'
        }),
        context: fullContext,
        handled: false
      })
      
      // 最終的なフォールバック
      console.error('❌ Critical Error Handler Failure:', handlingError)
    }
  }

  /**
   * 便利メソッド: API エラー専用
   */
  async handleApiError(
    error: unknown,
    endpoint: string,
    method: string = 'GET',
    options: Partial<ErrorOptions> = {}
  ): Promise<void> {
    const apiContext: Partial<ErrorContext> = {
      api: { endpoint, method },
      component: options.context
    }

    // APIエラーの場合のデフォルト設定
    const apiOptions: ErrorOptions = {
      type: 'server',
      severity: 'error',
      showToUser: true,
      notifyType: 'toast',
      fallback: { 
        enabled: this.config.enableMockDataFallback,
        useMockData: true 
      },
      ...options
    }

    await this.handle(error, apiOptions, apiContext)
  }

  /**
   * 便利メソッド: ネットワークエラー専用
   */
  async handleNetworkError(
    error: unknown,
    options: Partial<ErrorOptions> = {}
  ): Promise<void> {
    const networkOptions: ErrorOptions = {
      type: 'network',
      severity: 'error',
      showToUser: true,
      notifyType: 'toast',
      retry: { enabled: true, maxAttempts: 2 },
      ...options
    }

    await this.handle(error, networkOptions)
  }

  /**
   * エラーを AppError に正規化
   */
  private normalizeError(error: unknown, options: ErrorOptions): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      // 既存の ApiError クラスとの互換性
      if (error.name === 'ApiError' && 'statusCode' in error) {
        const statusCode = error.statusCode as number
        const errorType = getErrorTypeFromStatus(statusCode)
        
        return new AppError(error.message, {
          type: errorType,
          severity: statusCode >= 500 ? 'error' : 'warning',
          context: options.context,
          ...options
        }, error)
      }

      // タイムアウトエラーの検出
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return new AppError(error.message, {
          type: 'timeout',
          severity: 'warning',
          context: options.context,
          ...options
        }, error)
      }

      // ネットワークエラーの検出
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return new AppError(error.message, {
          type: 'network',
          severity: 'error',
          context: options.context,
          ...options
        }, error)
      }

      // 一般的なエラー
      return new AppError(error.message, {
        type: 'unknown',
        severity: 'error',
        context: options.context,
        ...options
      }, error)
    }

    // 文字列またはその他の型
    const message = typeof error === 'string' ? error : '予期しないエラーが発生しました'
    return new AppError(message, {
      type: 'unknown',
      severity: 'error',
      context: options.context,
      ...options
    })
  }

  /**
   * エラーコンテキストの構築
   */
  private buildContext(context?: Partial<ErrorContext>): ErrorContext {
    return {
      browser: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        timestamp: new Date().toISOString()
      },
      ...context
    }
  }

  /**
   * エラーログ出力
   */
  private logError(errorReport: ErrorReport): void {
    const { error, context } = errorReport
    
    // 開発環境では詳細ログ
    if (this.config.developmentMode) {
      console.group(`🚨 ${error.severity.toUpperCase()} [${error.type}]`)
      console.error('Message:', error.message)
      console.error('User Message:', error.userMessage)
      console.error('Context:', error.context)
      console.error('Full Context:', context)
      if (error.originalError) {
        console.error('Original Error:', error.originalError)
      }
      console.error('Stack:', error.stack)
      console.groupEnd()
    } else {
      // 本番環境では簡潔なログ
      const logLevel = error.severity === 'critical' || error.severity === 'error' ? 'error' : 'warn'
      console[logLevel](`[${error.type}] ${error.message}`, {
        context: error.context,
        timestamp: error.timestamp.toISOString()
      })
    }
  }

  /**
   * ユーザー通知
   */
  private async notifyUser(error: AppError, notifyType: NotificationType): Promise<void> {
    switch (notifyType) {
      case 'toast':
        if (this.toastHandler) {
          const toastType = this.mapSeverityToToastType(error.severity)
          this.toastHandler(error.userMessage, toastType)
        } else {
          console.warn('Toast handler not set, falling back to console')
          console.error(error.userMessage)
        }
        break
        
      case 'console':
        console.error(error.userMessage)
        break
        
      case 'modal':
        // 将来的にモーダル表示を実装
        if (typeof window !== 'undefined') {
          alert(error.userMessage) // 暫定実装
        }
        break
        
      case 'inline':
        // インライン表示は呼び出し元で処理
        console.info('Inline error display should be handled by component')
        break
    }
  }

  /**
   * リトライ処理
   */
  private async handleRetry(errorReport: ErrorReport, onRetry?: () => Promise<void>): Promise<void> {
    const key = errorReport.context.component || 'unknown'
    const currentAttempts = this.getRetryCount(key)
    
    this.retryAttempts.set(key, currentAttempts + 1)
    
    if (onRetry) {
      try {
        await onRetry()
      } catch (retryError) {
        console.error('Retry failed:', retryError)
      }
    }
  }

  /**
   * フォールバック処理
   */
  private handleFallback(fallback: NonNullable<ErrorOptions['fallback']>): void {
    if (fallback.useMockData) {
      console.info('🔄 Falling back to mock data')
    }
    
    if (fallback.customHandler) {
      try {
        fallback.customHandler()
      } catch (fallbackError) {
        console.error('Fallback handler failed:', fallbackError)
      }
    }
  }

  /**
   * エラー追跡（将来的なSentry連携）
   */
  private async trackError(errorReport: ErrorReport): Promise<void> {
    // 将来的にSentryやその他のエラー追跡サービスと連携
    console.info('📊 Error tracking placeholder:', {
      error: errorReport.error.toJSON(),
      context: errorReport.context
    })
  }

  /**
   * ヘルパーメソッド
   */
  private mapSeverityToToastType(severity: ErrorSeverity): 'success' | 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'error'
    }
  }

  private shouldRetry(errorReport: ErrorReport): boolean {
    const key = errorReport.context.component || 'unknown'
    const attempts = this.getRetryCount(key)
    return attempts < this.config.maxRetryAttempts
  }

  private getRetryCount(key: string): number {
    return this.retryAttempts.get(key) || 0
  }

  /**
   * 設定の更新
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * リトライカウンターのリセット
   */
  resetRetryCount(key?: string): void {
    if (key) {
      this.retryAttempts.delete(key)
    } else {
      this.retryAttempts.clear()
    }
  }
}

// シングルトンインスタンス
const errorHandler = new ErrorHandler()

// 便利な関数をエクスポート
export { ErrorHandler, errorHandler }

/**
 * メインのエラーハンドリング関数（便利関数）
 */
export const handleError = (
  error: unknown,
  options?: ErrorOptions,
  context?: Partial<ErrorContext>
) => errorHandler.handle(error, options, context)

/**
 * API エラー専用ハンドラー（便利関数）
 */
export const handleApiError = (
  error: unknown,
  endpoint: string,
  method?: string,
  options?: Partial<ErrorOptions>
) => errorHandler.handleApiError(error, endpoint, method, options)

/**
 * ネットワークエラー専用ハンドラー（便利関数）
 */
export const handleNetworkError = (
  error: unknown,
  options?: Partial<ErrorOptions>
) => errorHandler.handleNetworkError(error, options)

export default errorHandler