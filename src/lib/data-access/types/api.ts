/**
 * データアクセス層の統一型定義
 * API/モックデータの並行使用を可能にする型システム
 */

// 基本的なAPIレスポンス型
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

// エラーレスポンス型
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// データソース種別
export type DataSource = 'api' | 'mock';

// データプロバイダーの基本インターフェース
export interface DataProvider<T> {
  source: DataSource;
  get(): Promise<ApiResponse<T[]>>;
  getById(id: string): Promise<ApiResponse<T>>;
  create?(data: Partial<T>): Promise<ApiResponse<T>>;
  update?(id: string, data: Partial<T>): Promise<ApiResponse<T>>;
  delete?(id: string): Promise<ApiResponse<void>>;
}

// ページネーション型
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  success: boolean;
  timestamp: string;
}

// フィルタリング型（ジェネリクス活用）
export type FilterParams<T> = {
  [K in keyof T]?: T[K] | T[K][];
};

// データアクセス設定型
export interface DataAccessConfig {
  useApi: boolean;
  apiBaseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableFallback: boolean;
}

// キャッシュ管理型
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time To Live (seconds)
  maxSize: number;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// リアルタイム更新型
export interface DataSubscription<T> {
  subscribe(callback: (data: T) => void): () => void;
  unsubscribe(): void;
}

// 顧客データ固有の型（既存から拡張）
export interface CustomerApiData {
  id: string;
  name: string;
  email: string;
  purchaseHistory: PurchaseRecord[];
  segment: CustomerSegment;
  metrics: CustomerMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export interface CustomerMetrics {
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
  lastOrderDate: string;
  lifetimeValue: number;
  riskScore: number;
}

export interface CustomerSegment {
  id: string;
  name: string;
  criteria: SegmentCriteria;
  customerCount: number;
}

export interface SegmentCriteria {
  minTotalSpent?: number;
  maxTotalSpent?: number;
  minOrderCount?: number;
  daysSinceLastOrder?: number;
  tags?: string[];
}

// Shopify API 互換型（将来のAPI統合用）
export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
  updated_at: string;
  tags: string;
}

// 型ガード関数の型定義
export type TypeGuard<T> = (value: unknown) => value is T;

// データ変換関数の型定義
export type DataTransformer<TInput, TOutput> = (input: TInput) => TOutput;

// 環境設定型
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_USE_API: boolean;
  NEXT_PUBLIC_API_BASE_URL: string;
  NEXT_PUBLIC_ENABLE_CACHE: boolean;
  NEXT_PUBLIC_CACHE_TTL: number;
}

// ログレベル型
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ロギング設定型
export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

// メトリクス収集型
export interface DataAccessMetrics {
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  averageResponseTime: number;
}

// データアクセス結果型
export type DataResult<T> = 
  | { success: true; data: T; source: DataSource; cached: boolean }
  | { success: false; error: ApiError; source: DataSource };

// ヘルパー型: オプショナルフィールドを持つオブジェクト作成
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

// ヘルパー型: 更新用の部分的オブジェクト
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt'>> & {
  updatedAt?: string;
};

// 検索クエリ型
export interface SearchQuery {
  q: string;
  fields?: string[];
  fuzzy?: boolean;
  limit?: number;
}

// 並べ替え設定型
export interface SortConfig<T> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

export default {}; 