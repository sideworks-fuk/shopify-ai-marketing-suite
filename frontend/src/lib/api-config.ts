// API設定ファイル
export const API_CONFIG = {
  // バックエンドAPI URL - Azure Static Web Appsの場合は相対パスを使用
  BASE_URL: '',
  
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
  TIMEOUT: 120000, // 120秒（大量データ処理を考慮して延長）
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
  console.log('  - Window location:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  
  // 環境変数で明示的に設定されている場合はそれを優先
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('✅ Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Azure Static Web Appsの検出（本番環境）
  if (typeof window !== 'undefined' && window.location.hostname.includes('azurestaticapps.net')) {
    console.log('✅ Detected Azure Static Web Apps - using relative paths');
    return '';
  }
  
  // ローカル開発環境でのデバッグモード
  if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
    console.log('✅ Using direct Azure App Service URL (debug mode)');
    return 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net';
  }
  
  // ローカル開発環境
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Development mode - using direct Azure App Service URL (proxy bypass)');
    return 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net';
  }
  
  // フォールバック: 相対パス
  console.log('✅ Using relative paths');
  return '';
};

// フルURL生成ヘルパー
export const buildApiUrl = (endpoint: string) => {
  const baseUrl = getApiUrl();
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('🌐 Building API URL:', { baseUrl, endpoint, fullUrl });
  return fullUrl;
}; 