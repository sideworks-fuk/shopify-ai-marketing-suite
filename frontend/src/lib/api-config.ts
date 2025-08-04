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
  console.log('  - NEXT_PUBLIC_ENVIRONMENT (build time):', buildInfo.nextPublicEnvironment);
  console.log('  - NODE_ENV (build time):', buildInfo.nodeEnv);
  console.log('  - Is Build Time Set:', buildInfo.isBuildTimeSet);
  console.log('  - API Base URL:', config.apiBaseUrl);
  console.log('  - Environment Name:', config.name);
  console.log('  - Is Production:', config.isProduction);
  
  // ローカル開発環境の特別処理
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // 環境変数でHTTPS使用を強制する場合
    if (process.env.NEXT_PUBLIC_USE_HTTPS === 'true') {
      const httpsUrl = 'https://localhost:7088';
      console.log('🔒 HTTPS使用モード（環境変数設定）:', httpsUrl);
      console.log('⚠️ HTTPS証明書エラーが発生する場合は、以下を実行してください:');
      console.log('   1. dotnet dev-certs https --trust (バックエンドディレクトリで実行)');
      console.log('   2. ブラウザで https://localhost:7088 にアクセスして証明書を受け入れる');
      return httpsUrl;
    }
    
    // デフォルトはHTTP（証明書問題を回避）
    const httpUrl = 'http://localhost:7088';
    console.log('⚠️ ローカル開発環境検出 - HTTPを使用:', httpUrl);
    console.log('💡 HTTPSを使用する場合は、.env.localに NEXT_PUBLIC_USE_HTTPS=true を設定してください');
    return httpUrl;
  }
  
  // 環境変数で明示的にAPI URLが指定されている場合はそれを優先
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('✅ Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Azure Static Web Appsの検出（本番環境）- 最優先
  if (typeof window !== 'undefined' && window.location.hostname.includes('azurestaticapps.net')) {
    console.log('✅ Detected Azure Static Web Apps - using production environment');
    return ENVIRONMENTS.production.apiBaseUrl;
  }
  
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
export function getCurrentStoreId(): number {
  if (typeof window !== 'undefined') {
    const savedStoreId = localStorage.getItem('selectedStoreId')
    return savedStoreId ? parseInt(savedStoreId) : 1
  }
  return 1
}

// APIパラメータにstoreIdを自動追加する関数
export function addStoreIdToParams(params: URLSearchParams | Record<string, any>): URLSearchParams {
  const searchParams = params instanceof URLSearchParams 
    ? params 
    : new URLSearchParams(params)
  
  // storeIdが既に設定されていない場合のみ追加
  if (!searchParams.has('storeId')) {
    searchParams.set('storeId', getCurrentStoreId().toString())
  }
  
  return searchParams
} 