import { API_CONFIG, buildApiUrl, getApiUrl, getCurrentStoreId } from './api-config';

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

// URLにstoreIdを追加するヘルパー関数
function ensureStoreIdInUrl(url: string): string {
  const urlObj = new URL(url);
  if (!urlObj.searchParams.has('storeId')) {
    const storeId = getCurrentStoreId();
    urlObj.searchParams.set('storeId', storeId.toString());
    console.log(`🏪 Auto-added storeId=${storeId} to URL: ${urlObj.toString()}`);
  }
  return urlObj.toString();
}

// HTTP クライアント実装
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const baseUrl = buildApiUrl(endpoint);
    const url = ensureStoreIdInUrl(baseUrl);
    
    // タイムアウト制御
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    const defaultOptions: RequestInit = {
      headers: {
        ...API_CONFIG.HEADERS,
      },
      signal: controller.signal,
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      console.log('📋 Request Options:', defaultOptions);
      console.log('🔍 Full Request URL:', url);
      console.log('🔍 Base URL from config:', getApiUrl());
      console.log('🔍 Endpoint:', endpoint);
      
      const response = await fetch(url, defaultOptions);
      
      // タイムアウトをクリア
      clearTimeout(timeoutId);
      
      console.log('📡 Response Status:', response.status, response.statusText);
      console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
      
      // レスポンスの内容を確認
      const responseText = await response.text();
      console.log('📡 Response Text (first 500 chars):', responseText.substring(0, 500));
      console.log('📡 Full Response URL:', response.url);
      console.log('📡 Response Type:', response.type);
      console.log('📡 Request URL:', url);
      
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        console.error('❌ Response Text:', responseText);
        throw new ApiError(
          `HTTP Error: ${response.status} ${response.statusText}`,
          response.status,
          response
        );
      }

      // JSONとして解析を試行
      let data: ApiResponse<T>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        console.error('❌ Response Text:', responseText);
        throw new ApiError(
          `Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
          response.status,
          responseText
        );
      }
      
      console.log('✅ API Response:', data);
      
      return data;
    } catch (error) {
      // タイムアウトをクリア
      clearTimeout(timeoutId);
      
      console.error('❌ API Error:', error);
      console.error('❌ Error Details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // AbortErrorの処理（タイムアウト）
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          `Request timeout after ${API_CONFIG.TIMEOUT}ms`,
          408,
          error
        );
      }
      
      // ネットワークエラーやその他のエラー
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Failed to fetch: ネットワーク接続エラーまたはCORS問題が発生しました。\n' +
          'Azure Static Web Appsのプロキシ設定を確認してください。',
          0,
          error
        );
      }
      
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
  
  // 休眠顧客分析API
  dormantCustomers: (params?: {
    storeId?: number;
    segment?: string;
    riskLevel?: string;
    minTotalSpent?: number;
    maxTotalSpent?: number;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    descending?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${API_CONFIG.ENDPOINTS.CUSTOMER_DORMANT}?${queryString}` : API_CONFIG.ENDPOINTS.CUSTOMER_DORMANT;
    return apiClient.get<any>(url);
  },
  
  // 休眠顧客サマリー統計取得
  dormantSummary: (storeId: number = 1) =>
    apiClient.get<any>(`${API_CONFIG.ENDPOINTS.CUSTOMER_DORMANT_SUMMARY}?storeId=${storeId}`),
  
  // 詳細な期間別セグメント分布取得
  dormantDetailedSegments: (storeId: number = 1) =>
    apiClient.get<any>(`${API_CONFIG.ENDPOINTS.CUSTOMER_DORMANT_DETAILED_SEGMENTS}?storeId=${storeId}`),
  
  // 顧客離脱確率取得
  customerChurnProbability: (customerId: number) =>
    apiClient.get<{ data: number }>(`${API_CONFIG.ENDPOINTS.CUSTOMER_CHURN_PROBABILITY}/${customerId}/churn-probability`),
  
  // 月別売上統計API
  monthlySales: (params?: {
    storeId?: number;
    startYear?: number;
    startMonth?: number;
    endYear?: number;
    endMonth?: number;
    productIds?: string[];
    displayMode?: string;
    maxProducts?: number;
    categoryFilter?: string;
    minAmount?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => searchParams.append(key, item.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${API_CONFIG.ENDPOINTS.ANALYTICS_MONTHLY_SALES}?${queryString}` : API_CONFIG.ENDPOINTS.ANALYTICS_MONTHLY_SALES;
    return apiClient.get<any>(url);
  },
  
  // 月別売上サマリー取得
  monthlySalesSummary: (params?: {
    storeId?: number;
    startYear?: number;
    startMonth?: number;
    endYear?: number;
    endMonth?: number;
    productIds?: string[];
    displayMode?: string;
    maxProducts?: number;
    categoryFilter?: string;
    minAmount?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => searchParams.append(key, item.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${API_CONFIG.ENDPOINTS.ANALYTICS_MONTHLY_SALES_SUMMARY}?${queryString}` : API_CONFIG.ENDPOINTS.ANALYTICS_MONTHLY_SALES_SUMMARY;
    return apiClient.get<any>(url);
  },
  
  // カテゴリ別売上統計取得
  monthlySalesCategories: (params?: {
    storeId?: number;
    startYear?: number;
    startMonth?: number;
    endYear?: number;
    endMonth?: number;
    productIds?: string[];
    displayMode?: string;
    maxProducts?: number;
    categoryFilter?: string;
    minAmount?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => searchParams.append(key, item.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${API_CONFIG.ENDPOINTS.ANALYTICS_MONTHLY_SALES_CATEGORIES}?${queryString}` : API_CONFIG.ENDPOINTS.ANALYTICS_MONTHLY_SALES_CATEGORIES;
    return apiClient.get<any>(url);
  },
  
  // 月別売上トレンド取得
  monthlySalesTrends: (storeId: number = 1, year: number = new Date().getFullYear()) => {
    const searchParams = new URLSearchParams();
    searchParams.append('storeId', storeId.toString());
    searchParams.append('year', year.toString());
    const url = `${API_CONFIG.ENDPOINTS.ANALYTICS_MONTHLY_SALES_TRENDS}?${searchParams.toString()}`;
    return apiClient.get<any>(url);
  },
}; 