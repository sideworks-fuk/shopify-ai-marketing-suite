import { getAuthModeConfig, getCurrentEnvironmentConfig } from './config/environments';

interface ApiClientOptions {
  getShopifyToken?: () => Promise<string>;
  getDemoToken?: () => string | null;
  getCurrentStoreId?: () => number | null; // 🆕 AuthProvider から currentStoreId を取得する関数
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
    const headers: Record<string, string> = {};

    // OAuth認証成功後（埋め込みアプリでない場合）は、Cookieベースの認証を使用
    // バックエンドがCookieから認証情報を読み取るため、Authorizationヘッダーは不要
    const oauthAuthenticated = typeof window !== 'undefined' 
      ? localStorage.getItem('oauth_authenticated') === 'true'
      : false;
    
    // 開発者モードまたはデモモードの場合、X-Store-Id ヘッダーを先に取得（OAuth認証チェックの前）
    let currentStoreId: string | null = null;
    
    // 🆕 まず AuthProvider から currentStoreId を取得を試みる
    if (this.options.getCurrentStoreId) {
      const storeIdFromProvider = this.options.getCurrentStoreId();
      console.log('🔍 [ApiClient.getAuthHeaders] getCurrentStoreId 呼び出し結果', { 
        storeIdFromProvider,
        hasGetCurrentStoreId: !!this.options.getCurrentStoreId,
        timestamp: new Date().toISOString()
      });
      if (storeIdFromProvider !== null && storeIdFromProvider > 0) {
        currentStoreId = storeIdFromProvider.toString();
        headers['X-Store-Id'] = currentStoreId;
        console.log('🔧 [ApiClient.getAuthHeaders] X-Store-Id ヘッダーを設定（AuthProvider から）', { storeId: currentStoreId });
      } else {
        console.warn('⚠️ [ApiClient.getAuthHeaders] AuthProvider から currentStoreId を取得できませんでした', { 
          storeIdFromProvider,
          isNull: storeIdFromProvider === null,
          isZero: storeIdFromProvider === 0
        });
      }
    } else {
      console.warn('⚠️ [ApiClient.getAuthHeaders] getCurrentStoreId オプションが設定されていません');
    }
    
    // AuthProvider から取得できなかった場合、localStorage から取得を試みる
    if (!currentStoreId && typeof window !== 'undefined') {
      // localStorage から取得を試みる
      currentStoreId = localStorage.getItem('currentStoreId');
      if (currentStoreId) {
        headers['X-Store-Id'] = currentStoreId;
        console.log('🔧 [ApiClient.getAuthHeaders] X-Store-Id ヘッダーを設定（localStorage から）', { storeId: currentStoreId });
      } else {
        // localStorage になければ sessionStorage からも取得を試みる
        currentStoreId = sessionStorage.getItem('currentStoreId');
        if (currentStoreId) {
          headers['X-Store-Id'] = currentStoreId;
          console.log('🔧 [ApiClient.getAuthHeaders] X-Store-Id ヘッダーを設定（sessionStorage から）', { storeId: currentStoreId });
          // sessionStorage にあった場合は localStorage にも保存（次回以降のため）
          try {
            localStorage.setItem('currentStoreId', currentStoreId);
            console.log('✅ [ApiClient.getAuthHeaders] currentStoreId を localStorage にも保存しました', { storeId: currentStoreId });
          } catch (error) {
            console.warn('⚠️ [ApiClient.getAuthHeaders] localStorage への保存に失敗しました', error);
          }
        } else {
          // 🆕 OAuthモード（shopify）では、バックエンドがJWTトークンからstore_idを取得できるため、警告を出さない
          const authMode = typeof window !== 'undefined' 
            ? localStorage.getItem('authMode') || sessionStorage.getItem('authMode')
            : null;
          
          if (authMode !== 'shopify') {
            // 開発者モード/デモモードの場合のみ警告を表示
            console.warn('⚠️ [ApiClient.getAuthHeaders] X-Store-Idヘッダーが設定されていません', {
              currentStoreId,
              authMode,
              hasAuthHeaders: Object.keys(headers).length > 0,
              endpoint: 'request中'
            });
            console.warn('⚠️ [ApiClient.getAuthHeaders] localStorage の内容:', {
              currentStoreId: localStorage.getItem('currentStoreId'),
              developerToken: !!localStorage.getItem('developerToken'),
              demoToken: !!localStorage.getItem('demoToken'),
              authMode: localStorage.getItem('authMode'),
              oauthAuthenticated: localStorage.getItem('oauth_authenticated'),
              allLocalStorageKeys: Object.keys(localStorage)
            });
            console.warn('⚠️ [ApiClient.getAuthHeaders] sessionStorage の内容:', {
              currentStoreId: sessionStorage.getItem('currentStoreId'),
              developerToken: !!sessionStorage.getItem('developerToken'),
              demoToken: !!sessionStorage.getItem('demoToken'),
              authMode: sessionStorage.getItem('authMode'),
              allSessionStorageKeys: Object.keys(sessionStorage)
            });
          } else {
            // OAuthモードでは、バックエンドがJWTトークンからstore_idを取得できるため、警告を出さない
            console.log('ℹ️ [ApiClient.getAuthHeaders] OAuthモード: X-Store-Idヘッダーは不要（バックエンドがJWTトークンから取得）', {
              authMode,
              oauthAuthenticated: localStorage.getItem('oauth_authenticated')
            });
          }
        }
      }
    }
    
    // 🔧 デモトークンまたは開発者トークンがある場合は優先的に設定
    // （oauthAuthenticatedチェックより先に処理することで、デモモードとOAuthモードの競合を防ぐ）
    if (this.options.getDemoToken) {
      const token = this.options.getDemoToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        // X-Store-Id は既に設定済み（上記で設定）
        console.log('🔧 [ApiClient.getAuthHeaders] 開発者/デモモード: Authorization ヘッダーを設定', { 
          hasXStoreId: !!headers['X-Store-Id'],
          storeId: headers['X-Store-Id'] || '未設定'
        });
        return headers;
      }
    }

    // Shopify埋め込みアプリの場合、セッショントークンを取得
    if (this.options.getShopifyToken) {
      try {
        const token = await this.options.getShopifyToken();
        headers['Authorization'] = `Bearer ${token}`;
        return headers; // X-Store-Id は既に設定済み
      } catch (error) {
        console.error('Failed to get Shopify token:', error);
      }
    }

    // OAuth認証成功後（埋め込みアプリでない場合）は、Cookieベース認証を使用
    if (oauthAuthenticated && !this.options.getShopifyToken) {
      // OAuth認証成功後、埋め込みアプリでない場合: Cookieベース認証を使用
      console.log('🔐 OAuth認証済み: Cookieベース認証を使用（Authorizationヘッダーは不要）');
      return headers; // X-Store-Id は既に設定済み
    }

    return headers; // X-Store-Id は既に設定済み（該当する場合）
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    __retried: boolean = false
  ): Promise<T> {
    const authHeaders = await this.getAuthHeaders();

    // HeadersInit を Record<string, string> として扱う
    const authHeadersRecord = authHeaders as Record<string, string>;
    const optionsHeadersRecord = (options.headers || {}) as Record<string, string>;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...authHeadersRecord,
      ...optionsHeadersRecord,
    };

    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 [APIClient.request] リクエスト送信', { 
      url, 
      method: options.method || 'GET',
      headers: {
        ...headers,
        // Authorizationヘッダーは機密情報のため、存在するかどうかのみ表示
        'Authorization': headers['Authorization'] ? 'Bearer ***' : undefined,
        // X-Store-Idヘッダーの存在を確認
        'X-Store-Id': headers['X-Store-Id'] || '未設定',
      },
      hasBody: !!options.body,
      bodyLength: options.body ? (typeof options.body === 'string' ? options.body.length : 'unknown') : 0,
      timestamp: new Date().toISOString()
    });
    
    // デバッグ: X-Store-Idヘッダーが設定されているか確認
    if (!headers['X-Store-Id'] && typeof window !== 'undefined') {
      const currentStoreId = localStorage.getItem('currentStoreId');
      console.warn('⚠️ [APIClient.request] X-Store-Idヘッダーが設定されていません', {
        currentStoreId,
        hasAuthHeaders: !!authHeadersRecord['X-Store-Id'],
        endpoint,
        allLocalStorageKeys: Object.keys(localStorage)
      });
    }
    
    // リクエストボディの内容をログ出力（デバッグ用）
    if (options.body && typeof options.body === 'string') {
      try {
        const bodyObj = JSON.parse(options.body);
        console.log('📤 [APIClient.request] リクエストボディ:', bodyObj);
      } catch (e) {
        console.log('📤 [APIClient.request] リクエストボディ（JSONパース失敗）:', options.body.substring(0, 100));
      }
    }

    console.log('⏳ [APIClient.request] fetch呼び出し中...');
    const fetchStartTime = Date.now();

    // Cookieベース認証を使用する場合、credentials: 'include' が必要
    // これにより、クロスオリジンリクエストでもCookieが送信される
    const oauthAuthenticated = typeof window !== 'undefined' 
      ? localStorage.getItem('oauth_authenticated') === 'true'
      : false;
    const needsCredentials = oauthAuthenticated && !this.options.getShopifyToken;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: needsCredentials ? 'include' : (options.credentials || 'same-origin'),
      });
    } catch (fetchError: any) {
      const fetchEndTime = Date.now();
      console.error('❌ [APIClient.request] fetch呼び出しエラー', {
        duration: `${fetchEndTime - fetchStartTime}ms`,
        error: fetchError,
        errorMessage: fetchError?.message,
        errorName: fetchError?.name,
        url,
        timestamp: new Date().toISOString()
      });
      
      // ネットワークエラーの詳細分析
      if (fetchError instanceof TypeError) {
        console.error('🌐 TypeError が発生しました（ネットワークエラーの可能性）');
        console.error('💡 考えられる原因:');
        console.error('  1. CORSエラー: バックエンドのCORS設定を確認');
        console.error('  2. ネットワーク接続エラー: インターネット接続を確認');
        console.error('  3. タイムアウト: バックエンドサーバーが応答していない');
        console.error('  4. SSL証明書エラー: HTTPS設定を確認');
      }
      
      throw fetchError;
    }
    
    const fetchEndTime = Date.now();
    console.log('📥 [APIClient.request] fetch完了', {
      duration: `${fetchEndTime - fetchStartTime}ms`,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [APIClient.request] API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorText: errorText.substring(0, 500), // 最初の500文字のみ表示
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });
      
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
      
      type DormantCustomersResponse = {
        success?: boolean
        data?: { customers?: unknown[] }
        message?: string
      }

      const result = await this.request<DormantCustomersResponse>(url);
      
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