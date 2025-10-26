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
    options: RequestInit = {}
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
      
      // 401エラーの場合はグローバルイベントを発火
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
}