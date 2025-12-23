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

    // OAuth認証成功後（埋め込みアプリでない場合）は、Cookieベースの認証を使用
    // バックエンドがCookieから認証情報を読み取るため、Authorizationヘッダーは不要
    const oauthAuthenticated = typeof window !== 'undefined' 
      ? localStorage.getItem('oauth_authenticated') === 'true'
      : false;
    
    if (oauthAuthenticated && !this.options.getShopifyToken) {
      // OAuth認証成功後、埋め込みアプリでない場合: Cookieベース認証を使用
      console.log('🔐 OAuth認証済み: Cookieベース認証を使用（Authorizationヘッダーは不要）');
      return {};
    }

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
    console.log('📤 [APIClient.request] リクエスト送信', { 
      url, 
      method: options.method || 'GET',
      headers,
      timestamp: new Date().toISOString()
    });

    console.log('⏳ [APIClient.request] fetch呼び出し中...');
    const fetchStartTime = Date.now();

    // Cookieベース認証を使用する場合、credentials: 'include' が必要
    // これにより、クロスオリジンリクエストでもCookieが送信される
    const oauthAuthenticated = typeof window !== 'undefined' 
      ? localStorage.getItem('oauth_authenticated') === 'true'
      : false;
    const needsCredentials = oauthAuthenticated && !this.options.getShopifyToken;

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: needsCredentials ? 'include' : (options.credentials || 'same-origin'),
    });
    
    const fetchEndTime = Date.now();
    console.log('📥 [APIClient.request] fetch完了', {
      duration: `${fetchEndTime - fetchStartTime}ms`,
      status: response.status,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      
      // 429エラー（レート制限）の場合はリトライしない
      if (response.status === 429) {
        console.warn('⚠️ レート制限エラー（429）: リトライしません。しばらく待ってから再試行してください。');
        // 429エラー時はグローバルイベントを発火してユーザーに通知
        window.dispatchEvent(new CustomEvent('rate-limit-error', { 
          detail: { endpoint, retryAfter: 60 } // 60秒後に再試行を推奨
        }));
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }
      
      // 401エラーの場合は1回だけリトライ（埋め込みアプリの場合のみ、かつ429エラーを避けるため）
      // OAuth認証済み（Cookieベース）の場合は、Cookieが送信されていない可能性があるためリトライしない
      if (response.status === 401 && !__retried && this.options.getShopifyToken) {
        console.log('🔄 401エラー: トークンを再取得してリトライします');
        
        // リトライ前に少し待機（429エラーを避けるため）
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
      
      // リトライ後も失敗した場合、またはOAuth認証済み（Cookieベース）の場合のみauth:errorを発火
      if (response.status === 401) {
        if (needsCredentials) {
          console.warn('⚠️ Cookieベース認証で401エラー: Cookieが正しく送信されていない可能性があります');
        }
        console.log('🔴 認証エラー: グローバルイベントを発火');
        window.dispatchEvent(new Event('auth:error'));
      }
      
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }
    
    console.log('📦 [APIClient.request] JSONパース中...');
    const jsonData = await response.json();
    console.log('✅ [APIClient.request] レスポンス受信完了', {
      dataKeys: Object.keys(jsonData || {}),
      timestamp: new Date().toISOString()
    });
    
    return jsonData;
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
    return this.request(`/api/customer/dormant/summary?storeId=${storeId}`);
  }

  async dormantDetailedSegments(storeId: number): Promise<any> {
    return this.request(`/api/customer/dormant/detailed-segments?storeId=${storeId}`);
  }

  async dormantCustomers(params: any): Promise<any> {
    console.log('📡 [APIClient.dormantCustomers] 開始', {
      originalParams: params,
      timestamp: new Date().toISOString()
    });
    
    // パラメータを適切にフィルタリング
    const filteredParams: any = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });
    
    console.log('🔍 [APIClient.dormantCustomers] フィルター後パラメータ', {
      filteredParams,
      timestamp: new Date().toISOString()
    });
    
    const queryParams = new URLSearchParams(filteredParams).toString();
    const url = `/api/customer/dormant?${queryParams}`;
    
    console.log('🌐 [APIClient.dormantCustomers] URL構築完了', {
      url,
      queryParams,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('⏳ [APIClient.dormantCustomers] APIリクエスト送信中...');
      const startTime = Date.now();
      
      const result = await this.request(url);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('✅ [APIClient.dormantCustomers] レスポンス受信', {
        duration: `${duration}ms`,
        success: result?.success,
        dataCount: result?.data?.customers?.length || 0,
        hasCustomers: !!result?.data?.customers,
        customersIsArray: Array.isArray(result?.data?.customers),
        result,
        timestamp: new Date().toISOString()
      });
      
      // 0件の場合の特別なログ
      if (result?.data?.customers && result.data.customers.length === 0) {
        console.log('ℹ️ [APIClient.dormantCustomers] 0件のデータを受信', {
          segment: filteredParams.segment,
          url,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ [APIClient.dormantCustomers] エラー発生', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        url,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
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