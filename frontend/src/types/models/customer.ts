// 顧客関連統一型定義 - 技術的負債解消 Phase 1-3
// 重複型定義の削除、厳密な型付け、API レスポンス型の定義

// =============================================================================
// 基本型定義
// =============================================================================

export type CustomerStatus = "VIP" | "リピーター" | "新規" | "休眠";

export type CustomerSegment = "新規顧客" | "リピーター" | "VIP顧客" | "休眠顧客";

export type DormancyReason = 
  | 'price_sensitivity'
  | 'product_dissatisfaction' 
  | 'competitor_switch'
  | 'natural_churn'
  | 'seasonal'
  | 'unknown';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

// =============================================================================
// 商品関連型定義
// =============================================================================

export interface ProductInfo {
  name: string;
  count: number;
  percentage: number;
  category: string;
  isRepeat: boolean;
}

// =============================================================================
// 顧客基本型定義
// =============================================================================

export interface CustomerDetail {
  id: string;
  name: string;
  company?: string;  // 会社名を追加
  purchaseCount: number;
  totalAmount: number;
  frequency: number;
  avgInterval: number;
  topProduct: string;
  status: CustomerStatus;
  lastOrderDate: Date;
  // 商品情報
  topProducts: ProductInfo[];
  productCategories: string[];
  repeatProducts: number;
}

// =============================================================================
// 休眠顧客関連型定義
// =============================================================================

export interface DormantAction {
  id: string;
  name: string;
  description: string;
  priority: number;
  estimatedCost: number;
  expectedReturn: number;
}

export interface DormantCustomerDetail extends CustomerDetail {
  dormancy: {
    lastPurchaseDate: Date;
    daysSincePurchase: number;
    previousFrequency: number; // 休眠前の平均購入頻度（日数）
    estimatedReason: DormancyReason;
    riskLevel: RiskLevel;
  };
  analytics: {
    ltv: number;
    averageOrderValue: number;
    favoriteCategories: string[];
    seasonalPattern?: string;
    purchaseDecline: number; // 購入頻度の減少率（%）
  };
  reactivation: {
    probability: number; // 復帰可能性スコア（0-100）
    recommendedActions: DormantAction[];
    optimalTiming: Date;
    estimatedValue: number; // 復帰時の推定売上
  };
}

export interface DormantSegment {
  id: string;
  label: string;
  range: [number, number]; // [最小日数, 最大日数]
  count: number;
  color: string;
  urgency: UrgencyLevel;
}

export interface DormantKPI {
  totalDormantCustomers: number;
  dormancyRate: number; // 全顧客に対する休眠率（%）
  averageDormancyPeriod: number; // 平均休眠期間（日）
  reactivationRate: number; // 復帰成功率（%）
  estimatedLoss: number; // 休眠による推定損失額
  recoveredRevenue: number; // 復帰による回復売上
}

export interface DormantTrend {
  month: string;
  newDormant: number; // 新規休眠顧客数
  reactivated: number; // 復帰顧客数
  netChange: number; // 純増減
  totalDormant: number; // 累計休眠顧客数
}

// 簡易休眠顧客データ（チャート用）
export interface DormantCustomer {
  period: string;
  count: number;
  action: string;
}

// =============================================================================
// 分析データ型定義
// =============================================================================

export interface CustomerSegmentData {
  name: CustomerSegment;
  value: number;
  color: string;
}

export interface CustomerAcquisition {
  month: string;
  newCustomers: number;
  cost: number;
}

export interface CustomerLifetimeValue {
  segment: string;
  ltv: number;
  orders: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  orders: number;
  lastOrder: string;
  segment: string;
}

export interface PurchaseFrequency {
  frequency: string;
  current: number;
  previous: number;
}

export interface FLayerTrend {
  month: string;
  F1: number;
  F2: number;
  F3: number;
  F4: number;
  F5: number;
}

// =============================================================================
// フィルター・パラメータ型定義
// =============================================================================

export interface CustomerFilters {
  search?: string;
  segment?: CustomerSegment | string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface DormantCustomerFilters {
  minDays?: number;
  maxDays?: number;
  segment?: string;
  hasActions?: boolean;
}

export interface FHierarchyParams {
  period?: 'year' | 'half1' | 'half2' | 'q1' | 'q2' | 'q3' | 'q4';
  includeProjections?: boolean;
}

export interface PurchaseFrequencyParams {
  startDate?: Date;
  endDate?: Date;
  maxFrequency?: number;
  displayMode?: 'count' | 'percentage';
}

// =============================================================================
// API レスポンス統一型
// =============================================================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
  };
  timestamp: number;
  source: 'api' | 'mock';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// エラー型定義
// =============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export interface ValidationError extends ApiError {
  field: string;
  value: any;
}

// =============================================================================
// 状態管理型定義
// =============================================================================

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export interface CustomerState extends LoadingState {
  customers: CustomerDetail[];
  selectedCustomer: CustomerDetail | null;
  filters: CustomerFilters;
}

export interface DormantCustomerState extends LoadingState {
  dormantCustomers: DormantCustomerDetail[];
  kpis: DormantKPI | null;
  trends: DormantTrend[];
  segments: DormantSegment[];
  filters: DormantCustomerFilters;
}

// =============================================================================
// 型ガード関数
// =============================================================================

export function isCustomerDetail(obj: any): obj is CustomerDetail {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.purchaseCount === 'number' &&
    typeof obj.totalAmount === 'number' &&
    typeof obj.status === 'string' &&
    obj.lastOrderDate instanceof Date;
}

export function isDormantCustomerDetail(obj: any): obj is DormantCustomerDetail {
  try {
    return isCustomerDetail(obj) && 
      obj.dormancy !== undefined &&
      obj.analytics !== undefined &&
      obj.reactivation !== undefined;
  } catch {
    return false;
  }
}

export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return obj && 
    obj.data !== undefined &&
    typeof obj.timestamp === 'number' &&
    (obj.source === 'api' || obj.source === 'mock');
} 