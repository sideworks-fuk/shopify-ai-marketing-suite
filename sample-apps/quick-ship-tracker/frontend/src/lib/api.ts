import axios, { AxiosError } from 'axios';

// API Base URL - 開発環境では環境変数から取得
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5001/api';

// API エラーレスポンスの型定義
interface ApiError {
  error: string;
  message: string;
  details?: any;
}

// Axiosインスタンスの作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター - トークンの追加
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター - エラーハンドリング
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      // 401 Unauthorized - 認証エラー
      if (status === 401) {
        // トークンをクリアしてログイン画面へリダイレクト
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          window.location.href = '/auth/login';
        }
      }

      // 402 Payment Required - プラン制限超過
      if (status === 402) {
        // 課金画面へのリダイレクトを促す
        console.error('Plan limit exceeded:', errorData);
      }

      // 429 Too Many Requests - レート制限
      if (status === 429) {
        console.error('Rate limit exceeded. Please try again later.');
      }
    }

    return Promise.reject(error);
  }
);

// 認証API
export const authApi = {
  // ログイン開始
  login: async (shop: string) => {
    const response = await apiClient.post('/auth/login', { shop });
    return response.data;
  },

  // OAuth コールバック処理
  callback: async (code: string, shop: string, state: string) => {
    const response = await apiClient.get('/auth/callback', {
      params: { code, shop, state },
    });
    return response.data;
  },

  // ログアウト
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};

// 注文API
export const ordersApi = {
  // 注文一覧取得
  getOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  // 注文詳細取得
  getOrder: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },
};

// トラッキングAPI
export const trackingApi = {
  // トラッキング情報登録
  createTracking: async (data: {
    orderId: string;
    carrier: string;
    trackingNumber: string;
    notifyCustomer?: boolean;
  }) => {
    const response = await apiClient.post('/tracking', data);
    return response.data;
  },

  // トラッキング情報更新
  updateTracking: async (
    trackingId: string,
    data: {
      carrier?: string;
      trackingNumber?: string;
    }
  ) => {
    const response = await apiClient.put(`/tracking/${trackingId}`, data);
    return response.data;
  },

  // トラッキング情報削除
  deleteTracking: async (trackingId: string) => {
    const response = await apiClient.delete(`/tracking/${trackingId}`);
    return response.data;
  },

  // 一括トラッキング登録
  bulkCreateTracking: async (
    trackings: Array<{
      orderId: string;
      carrier: string;
      trackingNumber: string;
    }>
  ) => {
    const response = await apiClient.post('/tracking/bulk', { trackings });
    return response.data;
  },
};

// 課金API
export const billingApi = {
  // 料金プラン一覧取得
  getPlans: async () => {
    const response = await apiClient.get('/billing/plans');
    return response.data;
  },

  // プラン購読
  subscribe: async (planId: string) => {
    const response = await apiClient.post('/billing/subscribe', { planId });
    return response.data;
  },

  // プラン解約
  cancel: async () => {
    const response = await apiClient.post('/billing/cancel');
    return response.data;
  },

  // 使用状況取得
  getUsage: async () => {
    const response = await apiClient.get('/billing/usage');
    return response.data;
  },
};

export default apiClient;