/**
 * 型安全なAPIクライアント基盤
 * フェッチ処理、エラーハンドリング、リトライ機能を提供
 */

import type { 
  ApiResponse, 
  ApiError, 
  DataAccessConfig,
  LogLevel 
} from '../types/api';
import { getDataAccessConfig, getLoggingConfig } from '../config/environment';

// HTTPメソッド型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// リクエストオプション型
export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// APIレスポンス統計
export interface RequestStats {
  url: string;
  method: HttpMethod;
  duration: number;
  success: boolean;
  retryCount: number;
  cached: boolean;
}

// ログ出力関数
const log = (level: LogLevel, message: string, data?: any) => {
  const config = getLoggingConfig();
  
  if (!config.enableConsole) return;
  
  const logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  if (logLevels[level] >= logLevels[config.level]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data);
        break;
      case 'info':
        console.info(prefix, message, data);
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'error':
        console.error(prefix, message, data);
        break;
    }
  }
};

// カスタムエラークラス
export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public apiError: ApiError,
    public originalError?: Error
  ) {
    super(apiError.message);
    this.name = 'ApiClientError';
  }
}

export class TimeoutError extends Error {
  constructor(timeout: number) {
    super(`リクエストがタイムアウトしました (${timeout}ms)`);
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends Error {
  public cause?: Error;
  
  constructor(originalError: Error) {
    super(`ネットワークエラーが発生しました: ${originalError.message}`);
    this.name = 'NetworkError';
    this.cause = originalError;
  }
}

// APIクライアントクラス
export class ApiClient {
  private config: DataAccessConfig;
  private statsStore: RequestStats[] = [];

  constructor(config?: Partial<DataAccessConfig>) {
    this.config = { ...getDataAccessConfig(), ...config };
    log('debug', 'APIクライアント初期化', { config: this.config });
  }

  /**
   * HTTP GETリクエスト
   */
  async get<T>(
    endpoint: string, 
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * HTTP POSTリクエスト
   */
  async post<T, TBody = any>(
    endpoint: string, 
    body: TBody, 
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, options);
  }

  /**
   * HTTP PUTリクエスト
   */
  async put<T, TBody = any>(
    endpoint: string, 
    body: TBody, 
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  /**
   * HTTP PATCHリクエスト
   */
  async patch<T, TBody = any>(
    endpoint: string, 
    body: TBody, 
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  /**
   * HTTP DELETEリクエスト
   */
  async delete<T>(
    endpoint: string, 
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * 基本的なHTTPリクエスト処理
   */
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const url = this.buildUrl(endpoint);
    const timeout = options.timeout || this.config.timeout;
    const maxRetries = options.retries ?? this.config.retryAttempts;
    const retryDelay = options.retryDelay ?? 1000;

    log('debug', `リクエスト開始: ${method} ${url}`, { body, options });

    let lastError: Error;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeRequest(method, url, body, options, timeout);
        const duration = Date.now() - startTime;

        // 統計記録
        this.recordStats({
          url,
          method,
          duration,
          success: true,
          retryCount,
          cached: false
        });

        log('info', `リクエスト成功: ${method} ${url}`, { duration, retryCount });
        return response;

      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;

        log('warn', `リクエスト失敗 (試行 ${attempt + 1}/${maxRetries + 1}): ${method} ${url}`, {
          error: lastError.message,
          willRetry: attempt < maxRetries
        });

        // 最後の試行でない場合はリトライ
        if (attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数バックオフ
        }
      }
    }

    // 全ての試行が失敗した場合
    const duration = Date.now() - startTime;
    this.recordStats({
      url,
      method,
      duration,
      success: false,
      retryCount,
      cached: false
    });

    log('error', `リクエスト最終失敗: ${method} ${url}`, { 
      error: lastError!.message, 
      retryCount 
    });

    throw lastError!;
  }

  /**
   * 実際のHTTPリクエスト実行
   */
  private async executeRequest<T>(
    method: HttpMethod,
    url: string,
    body: any,
    options: RequestOptions,
    timeout: number
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestInit: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...options
      };

      const response = await fetch(url, requestInit);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new ApiClientError(response.status, errorData);
      }

      const data = await response.json();
      
      // APIレスポンス形式の検証
      if (!this.isValidApiResponse(data)) {
        throw new Error('無効なAPIレスポンス形式です');
      }

      // 型安全性を確保するため、実行時検証後の型アサーションを使用
      return data as ApiResponse<T>;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(timeout);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(error);
      }

      throw error;
    }
  }

  /**
   * エラーレスポンスの解析
   */
  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const errorData = await response.json();
      return {
        error: errorData.error || 'Unknown Error',
        message: errorData.message || response.statusText,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        error: 'Parse Error',
        message: `HTTPエラー ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * APIレスポンス形式の検証
   */
  private isValidApiResponse(data: any): data is ApiResponse<any> {
    return (
      typeof data === 'object' &&
      data !== null &&
      'data' in data &&
      'success' in data &&
      'timestamp' in data &&
      typeof data.success === 'boolean'
    );
  }

  /**
   * URLの構築
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.apiBaseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * 遅延関数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * リクエスト統計の記録
   */
  private recordStats(stats: RequestStats): void {
    this.statsStore.push(stats);
    
    // 最大1000件まで保持
    if (this.statsStore.length > 1000) {
      this.statsStore = this.statsStore.slice(-1000);
    }
  }

  /**
   * 統計情報の取得
   */
  getStats(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    totalRetries: number;
  } {
    if (this.statsStore.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        totalRetries: 0
      };
    }

    const successCount = this.statsStore.filter(s => s.success).length;
    const totalRetries = this.statsStore.reduce((sum, s) => sum + s.retryCount, 0);
    const averageResponseTime = this.statsStore.reduce((sum, s) => sum + s.duration, 0) / this.statsStore.length;

    return {
      totalRequests: this.statsStore.length,
      successRate: (successCount / this.statsStore.length) * 100,
      averageResponseTime: Math.round(averageResponseTime),
      totalRetries
    };
  }

  /**
   * 統計情報のクリア
   */
  clearStats(): void {
    this.statsStore = [];
  }

  /**
   * 健全性チェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health', { timeout: 5000, retries: 0 });
      return response.success;
    } catch {
      return false;
    }
  }
}

// デフォルトAPIクライアントインスタンス
export const defaultApiClient = new ApiClient();

export default ApiClient; 