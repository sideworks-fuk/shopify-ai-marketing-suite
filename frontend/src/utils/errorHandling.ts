// エラーハンドリング統一システム - 技術的負債解消 Phase 1

// =============================================================================
// エラーコード定義
// =============================================================================

export enum ErrorCode {
  // ネットワークエラー
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // API エラー
  API_ERROR = 'API_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  
  // 認証・認可エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // データエラー
  NOT_FOUND = 'NOT_FOUND',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  
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
// 統一エラークラス
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
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: 'ネットワークに接続できません。インターネット接続を確認してください。',
      [ErrorCode.TIMEOUT_ERROR]: 'リクエストがタイムアウトしました。時間をおいて再度お試しください。',
      [ErrorCode.API_ERROR]: 'サーバーとの通信でエラーが発生しました。',
      [ErrorCode.SERVER_ERROR]: 'サーバー内部でエラーが発生しました。管理者にお問い合わせください。',
      [ErrorCode.UNAUTHORIZED]: 'ログインが必要です。',
      [ErrorCode.FORBIDDEN]: 'この操作を実行する権限がありません。',
      [ErrorCode.NOT_FOUND]: '要求されたデータが見つかりません。',
      [ErrorCode.DATA_VALIDATION_ERROR]: '入力データが正しくありません。',
      [ErrorCode.UNKNOWN_ERROR]: '予期しないエラーが発生しました。'
    };
    
    return messages[code] || 'エラーが発生しました。';
  }
  
  public toApiError(): any {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export class ValidationError extends AppError {
  public readonly field: string;
  public readonly value: any;
  
  constructor(
    field: string,
    value: any,
    message: string,
    userMessage?: string
  ) {
    super(
      ErrorCode.DATA_VALIDATION_ERROR,
      message,
      userMessage || `${field}の値が不正です。`,
      ErrorSeverity.MEDIUM,
      { field, value }
    );
    this.field = field;
    this.value = value;
  }
}

// =============================================================================
// エラーハンドリングユーティリティ
// =============================================================================

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: AppError[] = [];
  
  private constructor() {}
  
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  /**
   * エラーを処理し、ログに記録する
   */
  public handleError(error: Error | AppError): AppError {
    const appError = this.normalizeError(error);
    
    // ログに記録
    this.logError(appError);
    
    // 開発環境ではコンソールにも出力
    if (process.env.NODE_ENV === 'development') {
      console.error('AppError:', appError);
    }
    
    // 重要度の高いエラーは特別な処理
    if (appError.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(appError);
    }
    
    return appError;
  }
  
  /**
   * エラーを AppError に正規化
   */
  private normalizeError(error: Error | AppError): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    // ネットワークエラーの検出
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new AppError(
        ErrorCode.NETWORK_ERROR,
        error.message,
        undefined,
        ErrorSeverity.HIGH
      );
    }
    
    // タイムアウトエラーの検出
    if (error.message.includes('timeout')) {
      return new AppError(
        ErrorCode.TIMEOUT_ERROR,
        error.message,
        undefined,
        ErrorSeverity.MEDIUM
      );
    }
    
    // その他は不明なエラーとして処理
    return new AppError(
      ErrorCode.UNKNOWN_ERROR,
      error.message,
      undefined,
      ErrorSeverity.MEDIUM,
      { originalError: error }
    );
  }
  
  /**
   * エラーをログに記録
   */
  private logError(error: AppError): void {
    this.errorLogs.push(error);
    
    // ログの上限を設定（メモリリーク防止）
    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(-50);
    }
  }
  
  /**
   * 重要度の高いエラーの特別処理
   */
  private handleCriticalError(error: AppError): void {
    console.error('CRITICAL ERROR:', error);
  }
  
  /**
   * エラーログの取得
   */
  public getErrorLogs(): AppError[] {
    return [...this.errorLogs];
  }
  
  /**
   * エラーログのクリア
   */
  public clearErrorLogs(): void {
    this.errorLogs = [];
  }
}

// =============================================================================
// API エラー処理ユーティリティ
// =============================================================================

export class ApiErrorHandler {
  /**
   * HTTP レスポンスステータスからエラーコードを判定
   */
  public static getErrorCodeFromStatus(status: number): ErrorCode {
    switch (true) {
      case status === 401:
        return ErrorCode.UNAUTHORIZED;
      case status === 403:
        return ErrorCode.FORBIDDEN;
      case status === 404:
        return ErrorCode.NOT_FOUND;
      case status >= 500:
        return ErrorCode.SERVER_ERROR;
      case status >= 400:
        return ErrorCode.API_ERROR;
      default:
        return ErrorCode.UNKNOWN_ERROR;
    }
  }
  
  /**
   * Fetch API のレスポンスを処理
   */
  public static async handleApiResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorCode = this.getErrorCodeFromStatus(response.status);
      const errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      let details: any = {};
      try {
        details = await response.json();
      } catch {
        try {
          details = { message: await response.text() };
        } catch {
          details = { message: 'Unknown error' };
        }
      }
      
      throw new AppError(
        errorCode,
        errorMessage,
        undefined,
        response.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
        details
      );
    }
    
    return response.json();
  }
}

// =============================================================================
// エクスポート済み便利関数
// =============================================================================

/**
 * エラーを処理してユーザーメッセージを取得
 */
export function getErrorMessage(error: Error | AppError): string {
  const appError = ErrorHandler.getInstance().handleError(error);
  return appError.userMessage;
}

/**
 * エラーが重要度の高いものかチェック
 */
export function isCriticalError(error: Error | AppError): boolean {
  if (error instanceof AppError) {
    return error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH;
  }
  return false;
}

/**
 * バリデーションエラーを作成
 */
export function createValidationError(
  field: string,
  value: any,
  message: string,
  userMessage?: string
): ValidationError {
  return new ValidationError(field, value, message, userMessage);
}

/**
 * シングルトン エラーハンドラーのインスタンスを取得
 */
export const errorHandler = ErrorHandler.getInstance();