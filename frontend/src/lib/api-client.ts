import { API_CONFIG, buildApiUrl } from './api-config';

// API レスポンス型定義
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  timestamp: string;
}

// エラー型定義
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// HTTP クライアント実装
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    
    const defaultOptions: RequestInit = {
      headers: {
        ...API_CONFIG.HEADERS,
      },
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new ApiError(
          `HTTP Error: ${response.status} ${response.statusText}`,
          response.status,
          response
        );
      }

      const data: ApiResponse<T> = await response.json();
      
      console.log('✅ API Response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // ネットワークエラーやその他のエラー
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown API Error'
      );
    }
  }

  // GET リクエスト
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  // POST リクエスト
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT リクエスト
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE リクエスト
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// 便利なヘルパー関数
export const api = {
  // ヘルスチェック
  health: () => 
    apiClient.get<{ status: string; timestamp: string; message: string; environment: string }>(
      API_CONFIG.ENDPOINTS.HEALTH
    ),
  
  // Customer API テスト
  customerTest: () =>
    apiClient.get<{ 
      message: string; 
      serverTime: string; 
      availableEndpoints: string[] 
    }>(API_CONFIG.ENDPOINTS.CUSTOMER_TEST),
  
  // 顧客セグメント取得
  customerSegments: () =>
    apiClient.get<Array<{ name: string; value: number; color: string }>>(
      API_CONFIG.ENDPOINTS.CUSTOMER_SEGMENTS
    ),
  
  // ダッシュボードデータ取得
  customerDashboard: () =>
    apiClient.get<any>(API_CONFIG.ENDPOINTS.CUSTOMER_DASHBOARD),
  
  // 顧客詳細一覧取得
  customerDetails: () =>
    apiClient.get<any[]>(API_CONFIG.ENDPOINTS.CUSTOMER_DETAILS),
  
  // 特定顧客詳細取得
  customerDetail: (id: string) =>
    apiClient.get<any>(`${API_CONFIG.ENDPOINTS.CUSTOMER_DETAIL}/${id}`),
  
  // トップ顧客取得
  customerTop: () =>
    apiClient.get<any[]>(API_CONFIG.ENDPOINTS.CUSTOMER_TOP),
}; 