import { getCurrentEnvironmentConfig, getCurrentEnvironment, ENVIRONMENTS, getBuildTimeEnvironmentInfo } from './config/environments';

// API設定ファイル
export const API_CONFIG = {
  // エンドポイント
  ENDPOINTS: {
    // ヘルスチェック
    HEALTH: '/api/health',
    HEALTH_DETAILED: '/api/health/detailed',
    
    // Authentication API
    AUTH_TOKEN: '/api/auth/token',
    AUTH_REFRESH: '/api/auth/refresh',
    AUTH_VALIDATE: '/api/auth/validate',
    
    // Customer API
    CUSTOMER_TEST: '/api/customer/test',
    CUSTOMER_DASHBOARD: '/api/customer/dashboard',
    CUSTOMER_SEGMENTS: '/api/customer/segments',
    CUSTOMER_DETAILS: '/api/customer/details',
    CUSTOMER_DETAIL: '/api/customer/details', // + /{id}
    CUSTOMER_TOP: '/api/customer/top',
    
    // Dormant Customer API (休眠顧客分析API)
    CUSTOMER_DORMANT: '/api/customer/dormant',
    CUSTOMER_DORMANT_SUMMARY: '/api/customer/dormant/summary',
    CUSTOMER_DORMANT_DETAILED_SEGMENTS: '/api/customer/dormant/detailed-segments',
    CUSTOMER_CHURN_PROBABILITY: '/api/customer', // + /{id}/churn-probability
    
    // Analytics API (分析API)
    ANALYTICS_MONTHLY_SALES: '/api/analytics/monthly-sales',
    ANALYTICS_MONTHLY_SALES_SUMMARY: '/api/analytics/monthly-sales/summary',
    ANALYTICS_MONTHLY_SALES_CATEGORIES: '/api/analytics/monthly-sales/categories',
    ANALYTICS_MONTHLY_SALES_TRENDS: '/api/analytics/monthly-sales/trends',
  },
  
  // リクエスト設定
  TIMEOUT: 120000, // 120秒（大量データ処理を考慮して延長）
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

// 環境別設定を取得
export const getApiUrl = () => {
  const currentEnv = getCurrentEnvironment();
  const config = getCurrentEnvironmentConfig();
  const buildInfo = getBuildTimeEnvironmentInfo();
  
  // デバッグ情報の出力
  console.log('🔍 Environment Check:');
  console.log('  - Current Environment:', currentEnv);
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - NEXT_PUBLIC_ENVIRONMENT:', process.env.NEXT_PUBLIC_ENVIRONMENT);
  console.log('  - NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('  - NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('  - NEXT_PUBLIC_USE_HTTPS:', process.env.NEXT_PUBLIC_USE_HTTPS);
  console.log('  - NEXT_PUBLIC_ENVIRONMENT (build time):', buildInfo.nextPublicEnvironment);
  console.log('  - NODE_ENV (build time):', buildInfo.nodeEnv);
  console.log('  - Is Build Time Set:', buildInfo.isBuildTimeSet);
  console.log('  - API Base URL:', config.apiBaseUrl);
  console.log('  - Environment Name:', config.name);
  console.log('  - Is Production:', config.isProduction);
  
  // 優先順位: NEXT_PUBLIC_BACKEND_URL（ngrok URLを含む、統一された環境変数）
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.log('✅ Using NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // フォールバック: NEXT_PUBLIC_API_URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('✅ Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // ローカル開発環境の特別処理は削除
  // バックエンドはAzure開発環境にデプロイされているため、常にAzure URLを使用
  
  // ローカル開発環境でのデバッグモード
  if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
    console.log('✅ Using direct Azure App Service URL (debug mode)');
    return ENVIRONMENTS.production.apiBaseUrl;
  }
  
  // 環境設定から取得（修正）
  console.log(`✅ Using ${config.name} API URL:`, config.apiBaseUrl);
  
  // production環境の場合は確実にproductionのAPI URLを使用
  if (currentEnv === 'production' || config.isProduction) {
    console.log('✅ Force using production API URL for production environment');
    return ENVIRONMENTS.production.apiBaseUrl;
  }
  
  return config.apiBaseUrl;
};

// フルURL生成ヘルパー
export const buildApiUrl = (endpoint: string) => {
  const baseUrl = getApiUrl();
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('🌐 Building API URL:', { baseUrl, endpoint, fullUrl });
  return fullUrl;
};

// 環境情報を取得するヘルパー関数
export const getEnvironmentInfo = () => {
  const currentEnv = getCurrentEnvironment();
  const config = getCurrentEnvironmentConfig();
  const buildInfo = getBuildTimeEnvironmentInfo();
  
  return {
    currentEnvironment: currentEnv,
    environmentName: config.name,
    apiBaseUrl: config.apiBaseUrl,
    isProduction: config.isProduction,
    description: config.description,
    buildTimeInfo: buildInfo,
  };
};

// ストアIDを取得する関数を追加
// 🔧 デフォルト値1を返さないように修正（誤ったStoreIdでのAPI呼び出しを防ぐ）
export function getCurrentStoreId(): number | null {
  if (typeof window !== 'undefined') {
    // 🆕 localStorage から取得を試みる
    let currentStoreId = localStorage.getItem('currentStoreId')
    
    // localStorage になければ sessionStorage から取得を試みる
    if (!currentStoreId) {
      currentStoreId = sessionStorage.getItem('currentStoreId')
      // sessionStorage にあった場合は localStorage にも保存（次回以降のため）
      if (currentStoreId) {
        try {
          localStorage.setItem('currentStoreId', currentStoreId)
          console.log('✅ [getCurrentStoreId] sessionStorage から取得し、localStorage にも保存しました', { storeId: currentStoreId })
        } catch (error) {
          console.warn('⚠️ [getCurrentStoreId] localStorage への保存に失敗しました', error)
        }
      }
    }
    
    if (!currentStoreId) {
      console.warn('⚠️ [getCurrentStoreId] currentStoreId が localStorage にも sessionStorage にも見つかりません。')
      return null  // 🔧 デフォルト値1ではなくnullを返す
    }
    
    const parsed = parseInt(currentStoreId, 10)
    if (isNaN(parsed) || parsed <= 0) {
      console.warn('⚠️ [getCurrentStoreId] currentStoreId が無効な値です:', currentStoreId)
      return null  // 🔧 デフォルト値1ではなくnullを返す
    }
    
    return parsed
  }
  return null  // 🔧 SSR時もnullを返す
}

// APIパラメータにstoreIdを自動追加する関数
// 🔧 getCurrentStoreId()がnullを返す可能性を考慮
export function addStoreIdToParams(params: URLSearchParams | Record<string, any>): URLSearchParams {
  const searchParams = params instanceof URLSearchParams 
    ? params 
    : new URLSearchParams(params)
  
  // storeIdが既に設定されていない場合のみ追加
  if (!searchParams.has('storeId')) {
    const storeId = getCurrentStoreId()
    if (storeId !== null) {
      searchParams.set('storeId', storeId.toString())
    } else {
      console.warn('⚠️ [addStoreIdToParams] storeId が取得できなかったため、パラメータに追加しませんでした')
    }
  }
  
  return searchParams
} 