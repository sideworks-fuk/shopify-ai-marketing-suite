// 統一エラーハンドリングシステム - 技術的負債解消 Phase 1-4
// API エラー、検証エラー、ネットワークエラーの分類、ログ機能、ユーザーフレンドリーなメッセージ変換

import type { ApiError, ValidationError } from '../types/models/customer';

// =============================================================================
// エラー分類とコード定義
// =============================================================================

export enum ErrorCode {
  // ネットワーク関連
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // API関連
  API_ERROR = 'API_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  
  // データ関連
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  
  // ビジネスロジック関連
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  
  // クライアント関連
  CLIENT_ERROR = 'CLIENT_ERROR',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  
  // 不明なエラー
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// =============================================================================
// エラークラス定義
// =============================================================================

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: number;
  public readonly details?: any;
  public readonly userMessage: string;
  
  constructor(
    code: ErrorCode,
    message: string,
    userMessage?: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.timestamp = Date.now();
    this.details = details;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
    
    // スタックトレースの保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
  
  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      [ErrorCode.TIMEOUT_ERROR]: 'リクエストがタイムアウトしました。しばらくしてから再試行してください。',
      [ErrorCode.CONNECTION_ERROR]: 'サーバーに接続できませんでした。',
      [ErrorCode.API_ERROR]: 'APIエラーが発生しました。',
      [ErrorCode.UNAUTHORIZED]: 'ログインが必要です。',
      [ErrorCode.FORBIDDEN]: 'この操作を実行する権限がありません。',
      [ErrorCode.NOT_FOUND]: '要求されたデータが見つかりませんでした。',
      [ErrorCode.SERVER_ERROR]: 'サーバーエラーが発生しました。管理者にお問い合わせください。',
      [ErrorCode.DATA_VALIDATION_ERROR]: '入力データに不正な値が含まれています。',
      [ErrorCode.DATA_NOT_FOUND]: 'データが見つかりませんでした。',
      [ErrorCode.DATA_CORRUPTION]: 'データに問題があります。',
      [ErrorCode.BUSINESS_RULE_VIOLATION]: 'ビジネスルール違反です。',
      [ErrorCode.PERMISSION_DENIED]: 'アクセス権限がありません。',
      [ErrorCode.RESOURCE_LIMIT_EXCEEDED]: 'リソースの制限を超えています。',
      [ErrorCode.CLIENT_ERROR]: 'クライアントエラーが発生しました。',
      [ErrorCode.BROWSER_NOT_SUPPORTED]: 'このブラウザはサポートされていません。',
      [ErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました。',
    };
    
    return messages[code] || 'エラーが発生しました。';
  }
  
  public toApiError(): ApiError {
    return {\n      code: this.code,\n      message: this.message,\n      details: this.details,\n      timestamp: this.timestamp\n    };\n  }\n}\n\nexport class ValidationError extends AppError {\n  public readonly field: string;\n  public readonly value: any;\n  \n  constructor(\n    field: string,\n    value: any,\n    message: string,\n    userMessage?: string\n  ) {\n    super(\n      ErrorCode.DATA_VALIDATION_ERROR,\n      message,\n      userMessage || `${field}の値が不正です。`,\n      ErrorSeverity.MEDIUM,\n      { field, value }\n    );\n    this.field = field;\n    this.value = value;\n  }\n}\n\n// =============================================================================\n// エラーハンドリングユーティリティ\n// =============================================================================\n\nexport class ErrorHandler {\n  private static instance: ErrorHandler;\n  private errorLogs: AppError[] = [];\n  \n  private constructor() {}\n  \n  public static getInstance(): ErrorHandler {\n    if (!ErrorHandler.instance) {\n      ErrorHandler.instance = new ErrorHandler();\n    }\n    return ErrorHandler.instance;\n  }\n  \n  /**\n   * エラーを処理し、ログに記録する\n   */\n  public handleError(error: Error | AppError): AppError {\n    const appError = this.normalizeError(error);\n    \n    // ログに記録\n    this.logError(appError);\n    \n    // 開発環境ではコンソールにも出力\n    if (process.env.NODE_ENV === 'development') {\n      console.error('AppError:', appError);\n    }\n    \n    // 重要度の高いエラーは特別な処理\n    if (appError.severity === ErrorSeverity.CRITICAL) {\n      this.handleCriticalError(appError);\n    }\n    \n    return appError;\n  }\n  \n  /**\n   * エラーを AppError に正規化\n   */\n  private normalizeError(error: Error | AppError): AppError {\n    if (error instanceof AppError) {\n      return error;\n    }\n    \n    // ネットワークエラーの検出\n    if (error.message.includes('fetch') || error.message.includes('network')) {\n      return new AppError(\n        ErrorCode.NETWORK_ERROR,\n        error.message,\n        undefined,\n        ErrorSeverity.HIGH\n      );\n    }\n    \n    // タイムアウトエラーの検出\n    if (error.message.includes('timeout')) {\n      return new AppError(\n        ErrorCode.TIMEOUT_ERROR,\n        error.message,\n        undefined,\n        ErrorSeverity.MEDIUM\n      );\n    }\n    \n    // その他は不明なエラーとして処理\n    return new AppError(\n      ErrorCode.UNKNOWN_ERROR,\n      error.message,\n      undefined,\n      ErrorSeverity.MEDIUM,\n      { originalError: error }\n    );\n  }\n  \n  /**\n   * エラーをログに記録\n   */\n  private logError(error: AppError): void {\n    this.errorLogs.push(error);\n    \n    // ログの上限を設定（メモリリーク防止）\n    if (this.errorLogs.length > 100) {\n      this.errorLogs = this.errorLogs.slice(-50);\n    }\n    \n    // TODO: 外部ログサービスへの送信実装\n    // this.sendToExternalLogger(error);\n  }\n  \n  /**\n   * 重要度の高いエラーの特別処理\n   */\n  private handleCriticalError(error: AppError): void {\n    // TODO: 管理者への通知実装\n    console.error('CRITICAL ERROR:', error);\n  }\n  \n  /**\n   * エラーログの取得\n   */\n  public getErrorLogs(): AppError[] {\n    return [...this.errorLogs];\n  }\n  \n  /**\n   * エラーログのクリア\n   */\n  public clearErrorLogs(): void {\n    this.errorLogs = [];\n  }\n}\n\n// =============================================================================\n// API エラー処理ユーティリティ\n// =============================================================================\n\nexport class ApiErrorHandler {\n  /**\n   * HTTP レスポンスステータスからエラーコードを判定\n   */\n  public static getErrorCodeFromStatus(status: number): ErrorCode {\n    switch (true) {\n      case status === 401:\n        return ErrorCode.UNAUTHORIZED;\n      case status === 403:\n        return ErrorCode.FORBIDDEN;\n      case status === 404:\n        return ErrorCode.NOT_FOUND;\n      case status >= 500:\n        return ErrorCode.SERVER_ERROR;\n      case status >= 400:\n        return ErrorCode.API_ERROR;\n      default:\n        return ErrorCode.UNKNOWN_ERROR;\n    }\n  }\n  \n  /**\n   * Fetch API のレスポンスを処理\n   */\n  public static async handleApiResponse<T>(response: Response): Promise<T> {\n    if (!response.ok) {\n      const errorCode = this.getErrorCodeFromStatus(response.status);\n      const errorMessage = `API Error: ${response.status} ${response.statusText}`;\n      \n      let details: any = {};\n      try {\n        details = await response.json();\n      } catch {\n        // JSON でない場合はテキストを取得\n        try {\n          details = { message: await response.text() };\n        } catch {\n          details = { message: 'Unknown error' };\n        }\n      }\n      \n      throw new AppError(\n        errorCode,\n        errorMessage,\n        undefined,\n        response.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,\n        details\n      );\n    }\n    \n    return response.json();\n  }\n}\n\n// =============================================================================\n// React コンポーネント用ヘルパー\n// =============================================================================\n\nexport interface ErrorState {\n  error: AppError | null;\n  isError: boolean;\n  clearError: () => void;\n}\n\n/**\n * React コンポーネントでエラー状態を管理するためのヘルパー\n */\nexport function createErrorState(): {\n  errorState: ErrorState;\n  setError: (error: Error | AppError) => void;\n} {\n  let errorState: ErrorState = {\n    error: null,\n    isError: false,\n    clearError: () => {\n      errorState = {\n        error: null,\n        isError: false,\n        clearError: errorState.clearError\n      };\n    }\n  };\n  \n  const setError = (error: Error | AppError) => {\n    const appError = ErrorHandler.getInstance().handleError(error);\n    errorState = {\n      error: appError,\n      isError: true,\n      clearError: errorState.clearError\n    };\n  };\n  \n  return { errorState, setError };\n}\n\n// =============================================================================\n// エクスポート済み便利関数\n// =============================================================================\n\n/**\n * エラーを処理してユーザーメッセージを取得\n */\nexport function getErrorMessage(error: Error | AppError): string {\n  const appError = ErrorHandler.getInstance().handleError(error);\n  return appError.userMessage;\n}\n\n/**\n * エラーが重要度の高いものかチェック\n */\nexport function isCriticalError(error: Error | AppError): boolean {\n  if (error instanceof AppError) {\n    return error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH;\n  }\n  return false;\n}\n\n/**\n * バリデーションエラーを作成\n */\nexport function createValidationError(\n  field: string,\n  value: any,\n  message: string,\n  userMessage?: string\n): ValidationError {\n  return new ValidationError(field, value, message, userMessage);\n}\n\n/**\n * シングルトン エラーハンドラーのインスタンスを取得\n */\nexport const errorHandler = ErrorHandler.getInstance();\n\n// =============================================================================\n// 型エクスポート\n// =============================================================================\n\nexport type { ApiError, ValidationError } from '../types/models/customer'; 