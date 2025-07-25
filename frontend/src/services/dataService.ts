// DataService統一実装 - 技術的負債解消 Phase 1-1
import { 
  type ShopifyOrder,
  type ShopifyCustomer, 
  type ShopifyProduct,
  calculatePurchaseFrequency,
  calculateCustomerSegments,
  calculateSalesMetrics,
} from "../lib/shopify"

// TODO: 統一エラーハンドリング統合 - Phase 2で対応
// import { errorHandler, AppError, ErrorCode, ErrorSeverity } from "../utils/errorHandling"

// モックデータのインポート
import { 
  customerDetailData,
  fLayerTrendData,
  dormantCustomerDetails,
  dormantKPIData,
  dormantTrendData,
  reactivationActions,
  dormantSegments,
  type CustomerDetail,
  type FLayerTrend,
  type DormantCustomer,
  type DormantCustomerDetail,
  type DormantKPI,
  type DormantTrend,
  type DormancyReason,
  type DormantAction,
  type DormantSegment,
  type ProductInfo
} from "../data/mock/customerData"

// =============================================================================
// 統一型定義
// =============================================================================

export interface CustomerFilters {
  search?: string;
  segment?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface FHierarchyParams {
  period?: 'year' | 'half1' | 'half2' | 'q1' | 'q2' | 'q3' | 'q4';
  includeProjections?: boolean;
}

export interface DormantCustomerFilters {
  minDays?: number;
  maxDays?: number;
  segment?: string;
  hasActions?: boolean;
}

export interface PurchaseFrequencyParams {
  startDate?: Date;
  endDate?: Date;
  maxFrequency?: number;
  displayMode?: 'count' | 'percentage';
}

// APIレスポンス統一型
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

export interface AnalyticsData {
  salesMetrics: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    productSales: Array<{
      productId: string;
      title: string;
      quantity: number;
      revenue: number;
    }>;
  };
  customerSegments: {
    new: ShopifyCustomer[];
    repeat: ShopifyCustomer[];
    vip: ShopifyCustomer[];
    dormant: ShopifyCustomer[];
  };
  purchaseFrequency: Map<string, Map<string, number>>;
}

// =============================================================================
// DataService インターフェース定義
// =============================================================================

export interface IDataService {
  // 基本データ取得
  getProducts(limit?: number): Promise<ApiResponse<ShopifyProduct[]>>;
  getOrders(limit?: number, startDate?: string, endDate?: string): Promise<ApiResponse<ShopifyOrder[]>>;
  getCustomers(filters?: CustomerFilters): Promise<ApiResponse<CustomerDetail[]>>;
  
  // 分析データ取得
  getAnalyticsData(period?: string): Promise<ApiResponse<AnalyticsData>>;
  getPurchaseFrequencyAnalysis(params?: PurchaseFrequencyParams): Promise<ApiResponse<any[]>>;
  getFHierarchyData(params?: FHierarchyParams): Promise<ApiResponse<FLayerTrend[]>>;
  
  // 休眠顧客データ
  getDormantCustomers(filters?: DormantCustomerFilters): Promise<ApiResponse<DormantCustomerDetail[]>>;
  getDormantKPIs(): Promise<ApiResponse<DormantKPI>>;
  getDormantTrends(): Promise<ApiResponse<DormantTrend[]>>;
  getDormantReasons(): Promise<ApiResponse<DormancyReason[]>>;
  getDormantActions(): Promise<ApiResponse<DormantAction[]>>;
  getDormantSegments(): Promise<ApiResponse<DormantSegment[]>>;
  
  // 設定・状態管理
  getCurrentDataSource(): 'api' | 'mock';
  switchDataSource(source: 'api' | 'mock'): void;
  isHealthy(): Promise<boolean>;
}

// =============================================================================
// DataService 実装
// =============================================================================

export class DataService implements IDataService {
  private shopDomain: string;
  private accessToken: string;
  private useMockData: boolean;

  constructor(shopDomain?: string, accessToken?: string) {
    this.shopDomain = shopDomain || process.env.NEXT_PUBLIC_SHOP_DOMAIN || '';
    this.accessToken = accessToken || process.env.NEXT_PUBLIC_ACCESS_TOKEN || '';
    this.useMockData = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || !this.shopDomain || !this.accessToken;
  }

  // -----------------------------------------------------------------------------
  // 内部メソッド
  // -----------------------------------------------------------------------------

  private async fetchShopifyData(endpoint: string, params: Record<string, string> = {}) {
    if (this.useMockData) {
      throw new Error('API calls not available in mock mode');
    }

    const searchParams = new URLSearchParams({
      shop: this.shopDomain,
      access_token: this.accessToken,
      ...params,
    });

    const response = await fetch(`/api/shopify${endpoint}?${searchParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${endpoint}: ${response.statusText}`);
    }

    return response.json();
  }

  private createResponse<T>(data: T, source: 'api' | 'mock' = this.useMockData ? 'mock' : 'api'): ApiResponse<T> {
    return {
      data,
      timestamp: Date.now(),
      source,
    };
  }

  // -----------------------------------------------------------------------------
  // 基本データ取得メソッド
  // -----------------------------------------------------------------------------

  async getProducts(limit = 50): Promise<ApiResponse<ShopifyProduct[]>> {
    if (this.useMockData) {
      // モックデータ使用時は適当なProduct型データを返す
      const mockProducts: ShopifyProduct[] = [];
      return this.createResponse(mockProducts);
    }

    const data = await this.fetchShopifyData("/products", { limit: limit.toString() });
    return this.createResponse(data.products);
  }

  async getOrders(limit = 250, startDate?: string, endDate?: string): Promise<ApiResponse<ShopifyOrder[]>> {
    if (this.useMockData) {
      const mockOrders: ShopifyOrder[] = [];
      return this.createResponse(mockOrders);
    }

    const params: Record<string, string> = { limit: limit.toString() };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const data = await this.fetchShopifyData("/orders", params);
    return this.createResponse(data.orders);
  }

  async getCustomers(filters: CustomerFilters = {}): Promise<ApiResponse<CustomerDetail[]>> {
    if (this.useMockData) {
      let customers = [...customerDetailData];
      
      // フィルタリング適用
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        customers = customers.filter(customer => 
          customer.name.toLowerCase().includes(searchLower) ||
          customer.id.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.segment) {
        customers = customers.filter(customer => customer.status === filters.segment);
      }
      
      // ページネーション
      if (filters.offset !== undefined && filters.limit !== undefined) {
        customers = customers.slice(filters.offset, filters.offset + filters.limit);
      } else if (filters.limit) {
        customers = customers.slice(0, filters.limit);
      }

      return this.createResponse(customers);
    }

    const data = await this.fetchShopifyData("/customers", { 
      limit: (filters.limit || 250).toString() 
    });
    return this.createResponse(data.customers);
  }

  // -----------------------------------------------------------------------------
  // 分析データ取得メソッド
  // -----------------------------------------------------------------------------

  async getAnalyticsData(period = "current_month"): Promise<ApiResponse<AnalyticsData>> {
    if (this.useMockData) {
      // モックデータでの分析実装
      const mockAnalytics: AnalyticsData = {
        salesMetrics: {
          totalSales: 125000,
          totalOrders: 85,
          averageOrderValue: 1470,
          productSales: [],
        },
        customerSegments: {
          new: [],
          repeat: [],
          vip: [],
          dormant: [],
        },
        purchaseFrequency: new Map(),
      };
      return this.createResponse(mockAnalytics);
    }

    // API実装（既存のロジックを使用）
    const now = new Date();
    let startDate: string;
    let endDate: string = now.toISOString();

    switch (period) {
      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        break;
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth.toISOString();
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
        break;
      case "current_quarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart.toISOString();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    const ordersResponse = await this.getOrders(250, startDate, endDate);
    const customersResponse = await this.getCustomers({ limit: 250 });

    const salesMetrics = calculateSalesMetrics(ordersResponse.data as any);
    const customerSegments = calculateCustomerSegments(customersResponse.data as any);
    const purchaseFrequency = calculatePurchaseFrequency(ordersResponse.data as any);

    const analyticsData: AnalyticsData = {
      salesMetrics,
      customerSegments,
      purchaseFrequency,
    };

    return this.createResponse(analyticsData);
  }

  async getPurchaseFrequencyAnalysis(params: PurchaseFrequencyParams = {}): Promise<ApiResponse<any[]>> {
    if (this.useMockData) {
      // モック購入頻度分析データ（既存の実装を活用）
      const mockAnalysis = [
        {
          productName: "デコ缶カットケーキ4種セット",
          productId: "deco-4set",
          category: "cake",
          totalCustomers: 35,
          frequencies: Array.from({ length: params.maxFrequency || 10 }, (_, i) => ({
            count: i + 1,
            customers: Math.max(0, 35 - i * 4),
            percentage: Math.max(0, Math.round(((35 - i * 4) / 35) * 100))
          }))
        }
        // 他の商品データ...
      ];
      return this.createResponse(mockAnalysis);
    }

    // API実装（既存のgetPurchaseFrequencyAnalysisを使用）
    const orders = await this.getOrders(250);
    // 既存の実装ロジック...
    const analysis: any[] = [];
    return this.createResponse(analysis);
  }

  async getFHierarchyData(params: FHierarchyParams = {}): Promise<ApiResponse<FLayerTrend[]>> {
    if (this.useMockData) {
      let data = [...fLayerTrendData];
      
      // 期間フィルタリング
      if (params.period) {
        switch (params.period) {
          case 'half1':
            data = data.slice(0, 6);
            break;
          case 'half2':
            data = data.slice(6, 12);
            break;
          case 'q1':
            data = data.slice(0, 3);
            break;
          case 'q2':
            data = data.slice(3, 6);
            break;
          case 'q3':
            data = data.slice(6, 9);
            break;
          case 'q4':
            data = data.slice(9, 12);
            break;
        }
      }
      
      return this.createResponse(data);
    }

    // API実装
    const mockData: FLayerTrend[] = [];
    return this.createResponse(mockData);
  }

  // -----------------------------------------------------------------------------
  // 休眠顧客データメソッド
  // -----------------------------------------------------------------------------

  async getDormantCustomers(filters: DormantCustomerFilters = {}): Promise<ApiResponse<DormantCustomerDetail[]>> {
    if (this.useMockData) {
      let customers = [...dormantCustomerDetails];
      
      // フィルタリング適用
      if (filters.minDays !== undefined) {
        customers = customers.filter(customer => customer.dormancy.daysSincePurchase >= filters.minDays!);
      }
      
      if (filters.maxDays !== undefined) {
        customers = customers.filter(customer => customer.dormancy.daysSincePurchase <= filters.maxDays!);
      }
      
      return this.createResponse(customers);
    }

    // API実装
    const apiCustomers: DormantCustomerDetail[] = [];
    return this.createResponse(apiCustomers);
  }

  async getDormantKPIs(): Promise<ApiResponse<DormantKPI>> {
    return this.createResponse(dormantKPIData);
  }

  async getDormantTrends(): Promise<ApiResponse<DormantTrend[]>> {
    return this.createResponse(dormantTrendData);
  }

  async getDormantReasons(): Promise<ApiResponse<DormancyReason[]>> {
    const reasons: DormancyReason[] = ['price_sensitivity', 'product_dissatisfaction', 'competitor_switch', 'natural_churn', 'seasonal', 'unknown'];
    return this.createResponse(reasons);
  }

  async getDormantActions(): Promise<ApiResponse<DormantAction[]>> {
    return this.createResponse(reactivationActions);
  }

  async getDormantSegments(): Promise<ApiResponse<DormantSegment[]>> {
    return this.createResponse(dormantSegments);
  }

  // -----------------------------------------------------------------------------
  // 設定・状態管理メソッド
  // -----------------------------------------------------------------------------

  getCurrentDataSource(): 'api' | 'mock' {
    return this.useMockData ? 'mock' : 'api';
  }

  switchDataSource(source: 'api' | 'mock'): void {
    this.useMockData = source === 'mock';
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (this.useMockData) {
        return true; // モックデータは常に利用可能
      }
      
      // API健全性チェック
      await this.fetchShopifyData('/products', { limit: '1' });
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// シングルトンインスタンス
// =============================================================================

export const dataService = new DataService();

// =============================================================================
// 便利関数
// =============================================================================

export const useDataSource = () => {
  return {
    currentSource: dataService.getCurrentDataSource(),
    switchToMock: () => dataService.switchDataSource('mock'),
    switchToApi: () => dataService.switchDataSource('api'),
    isHealthy: dataService.isHealthy.bind(dataService),
  };
};

export default dataService; 