import { getAuthModeConfig, getCurrentEnvironmentConfig } from './config/environments';

interface ApiClientOptions {
  getShopifyToken?: () => Promise<string>;
  getDemoToken?: () => string | null;
}

export class ApiClient {
  private baseUrl: string;
  private options: ApiClientOptions;

  constructor(baseUrl?: string, options: ApiClientOptions = {}) {
    // baseUrlが指定されていない場合は環境設定から取得
    this.baseUrl = baseUrl || getCurrentEnvironmentConfig().apiBaseUrl;
    this.options = options;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const config = getAuthModeConfig();

    // Shopify埋め込みアプリの場合、セッショントークンを取得
    if (this.options.getShopifyToken) {
      try {
        const token = await this.options.getShopifyToken();
        return {
          'Authorization': `Bearer ${token}`
        };
      } catch (error) {
        console.error('Failed to get Shopify token:', error);
      }
    }

    // デモモードの場合、デモトークンを使用
    if (this.options.getDemoToken) {
      const token = this.options.getDemoToken();
      if (token) {
        return {
          'Authorization': `Bearer ${token}`
        };
      }
    }

    return {};
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    __retried: boolean = false
  ): Promise<T> {
    const authHeaders = await this.getAuthHeaders();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeaders,
      ...options.headers,
    };

    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 API Request:', { url, method: options.method || 'GET' });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      
      // 401エラーの場合は1回だけリトライ
      if (response.status === 401 && !__retried) {
        console.log('🔄 401エラー: トークンを再取得してリトライします');
        
        // トークンを再取得
        const newHeaders = await this.getAuthHeaders();
        
        // リトライフラグを渡して無限ループを防ぐ
        return this.request<T>(endpoint, {
          ...options,
          headers: {
            ...options.headers,
            ...newHeaders,
          }
        }, true);
      }
      
      // リトライ後も失敗した場合のみauth:errorを発火
      if (response.status === 401) {
        console.log('🔴 認証エラー: グローバルイベントを発火');
        window.dispatchEvent(new Event('auth:error'));
      }
      
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }
    
    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Shopifyトークンプロバイダーを設定
  setShopifyTokenProvider(getToken: () => Promise<string>) {
    this.options.getShopifyToken = getToken;
  }

  // デモトークンプロバイダーを設定
  setDemoTokenProvider(getToken: () => string | null) {
    this.options.getDemoToken = getToken;
  }

  // API メソッドを追加
  async dormantSummary(storeId: number): Promise<any> {
    return this.request(`/api/customer/dormant-summary?storeId=${storeId}`);
  }

  async dormantDetailedSegments(storeId: number): Promise<any> {
    return this.request(`/api/customer/dormant-detailed-segments?storeId=${storeId}`);
  }

  async dormantCustomers(params: any): Promise<any> {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/api/customer/dormant?${queryParams}`);
  }

  async monthlySales(params: any): Promise<any> {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/api/sales/monthly?${queryParams}`);
  }

  async health(): Promise<any> {
    return this.request(`/api/health`);
  }

  async customerTest(): Promise<any> {
    return this.request(`/api/customer/test`);
  }

  async customerSegments(): Promise<any> {
    return this.request(`/api/customer/segments`);
  }

  async customerChurnProbability(customerId: number): Promise<any> {
    return this.request(`/api/customer/churn-probability?customerId=${customerId}`);
  }
}