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
  // 開発環境の場合はローカルバックエンドも選択可能
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || API_CONFIG.BASE_URL;
  }
  return API_CONFIG.BASE_URL;
};

// フルURL生成ヘルパー
export const buildApiUrl = (endpoint: string) => {
  return `${getApiUrl()}${endpoint}`;
}; 