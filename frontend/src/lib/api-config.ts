// API設定ファイル
export const API_CONFIG = {
  // バックエンドAPI URL
  BASE_URL: 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net',
  
  // エンドポイント
  ENDPOINTS: {
    // ヘルスチェック
    HEALTH: '/api/health',
    HEALTH_DETAILED: '/api/health/detailed',
    
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
    CUSTOMER_CHURN_PROBABILITY: '/api/customer', // + /{id}/churn-probability
  },
  
  // リクエスト設定
  TIMEOUT: 30000, // 30秒
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

// 環境別設定
export const getApiUrl = () => {
  // デバッグ情報の出力
  console.log('🔍 Environment Check:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('  - NEXT_PUBLIC_DEBUG_API:', process.env.NEXT_PUBLIC_DEBUG_API);
  
  // 環境変数で明示的に設定されている場合はそれを優先
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('✅ Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // デバッグモードが有効な場合はAzure App Serviceを使用
  if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
    console.log('✅ Using Azure App Service URL (debug mode)');
    return API_CONFIG.BASE_URL;
  }
  
  // 開発環境の場合はAzure App Serviceを使用（ローカルバックエンドは未稼働のため）
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Using Azure App Service URL (development mode)');
    return API_CONFIG.BASE_URL;
  }
  
  // 本番環境
  console.log('✅ Using production backend URL');
  return API_CONFIG.BASE_URL;
};

// フルURL生成ヘルパー
export const buildApiUrl = (endpoint: string) => {
  const baseUrl = getApiUrl();
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('🌐 Building API URL:', { baseUrl, endpoint, fullUrl });
  return fullUrl;
}; 