/**
 * 顧客データプロバイダー
 * API/モックデータの自動切替機能を提供
 */

import type { 
  DataProvider, 
  ApiResponse,
  CustomerApiData,
  PaginationParams,
  PaginatedResponse,
  FilterParams
} from '../types/api';
import { getCurrentDataSource } from '../config/environment';
import { defaultApiClient } from '../clients/api-client';
// 既存のモックデータをインポート
import { 
  customerSegmentData,
  customerDetailData,
  type CustomerDetail,
  type CustomerSegment
} from '../../../data/mock/customerData';

// モックデータからAPIデータ形式への変換関数
const convertMockToApiData = (mockCustomer: CustomerDetail): CustomerApiData => {
  return {
    id: mockCustomer.id,
    name: mockCustomer.name,
    email: `${mockCustomer.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    purchaseHistory: [
      {
        id: `purchase_${mockCustomer.id}_1`,
        productId: `product_${Math.floor(Math.random() * 100)}`,
        amount: mockCustomer.totalAmount,
        currency: 'JPY',
        date: mockCustomer.lastOrderDate.toISOString(),
        status: 'completed' as const
      }
    ],
    segment: {
      id: 'segment_1',
      name: mockCustomer.status,
      criteria: {
        minTotalSpent: mockCustomer.status === 'VIP' ? 100000 : 0,
        minOrderCount: mockCustomer.purchaseCount,
      },
      customerCount: customerDetailData.filter((c: CustomerDetail) => c.status === mockCustomer.status).length
    },
    metrics: {
      totalSpent: mockCustomer.totalAmount,
      orderCount: mockCustomer.purchaseCount,
      averageOrderValue: mockCustomer.totalAmount / Math.max(mockCustomer.purchaseCount, 1),
      lastOrderDate: mockCustomer.lastOrderDate.toISOString(),
      lifetimeValue: mockCustomer.totalAmount * 1.2, // 予測LTV
      riskScore: mockCustomer.status === '休眠' ? 0.8 : 0.2
    },
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// APIデータからモックデータ形式への変換関数
const convertApiToMockData = (apiCustomer: CustomerApiData): CustomerDetail => {
  return {
    id: apiCustomer.id,
    name: apiCustomer.name,
    purchaseCount: apiCustomer.metrics.orderCount,
    totalAmount: apiCustomer.metrics.totalSpent,
    frequency: apiCustomer.metrics.orderCount / 12, // 年間頻度の推定
    avgInterval: 30, // デフォルト値
    topProduct: '商品A', // デフォルト値
    lastOrderDate: new Date(apiCustomer.metrics.lastOrderDate),
    status: apiCustomer.segment.name as CustomerDetail['status'],
    // Phase 2: 商品情報を追加
    topProducts: [], // デフォルト値
    productCategories: [], // デフォルト値
    repeatProducts: 0 // デフォルト値
  };
};

// モックデータプロバイダークラス
class MockCustomerDataProvider implements DataProvider<CustomerApiData> {
  source = 'mock' as const;

  async get(): Promise<ApiResponse<CustomerApiData[]>> {
    // 実際のAPIレスポンス形式をシミュレート
    await this.simulateDelay();
    
    const mockData = customerDetailData.map(convertMockToApiData);
    
    return {
      data: mockData,
      success: true,
      message: 'モックデータから取得',
      timestamp: new Date().toISOString()
    };
  }

  async getById(id: string): Promise<ApiResponse<CustomerApiData>> {
    await this.simulateDelay();
    
    const mockCustomer = customerDetailData.find((c: CustomerDetail) => c.id === id);
    
    if (!mockCustomer) {
      throw new Error(`顧客ID ${id} が見つかりません`);
    }
    
    return {
      data: convertMockToApiData(mockCustomer),
      success: true,
      message: 'モックデータから取得',
      timestamp: new Date().toISOString()
    };
  }

  async create(data: Partial<CustomerApiData>): Promise<ApiResponse<CustomerApiData>> {
    await this.simulateDelay();
    
    const newCustomer: CustomerApiData = {
      id: `customer_${Date.now()}`,
      name: data.name || '新規顧客',
      email: data.email || 'new@example.com',
      purchaseHistory: data.purchaseHistory || [],
      segment: data.segment || {
        id: 'segment_new',
        name: '新規',
        criteria: {},
        customerCount: 1
      },
      metrics: data.metrics || {
        totalSpent: 0,
        orderCount: 0,
        averageOrderValue: 0,
        lastOrderDate: new Date().toISOString(),
        lifetimeValue: 0,
        riskScore: 0.1
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    
    return {
      data: newCustomer,
      success: true,
      message: 'モックデータで作成（実際には保存されません）',
      timestamp: new Date().toISOString()
    };
  }

  // ページネーション対応取得
  async getPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<CustomerApiData>> {
    await this.simulateDelay();
    
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = params;
    
    let data = customerDetailData.map(convertMockToApiData);
    
    // ソート処理
    if (sortBy && sortBy in data[0]) {
      data.sort((a: CustomerApiData, b: CustomerApiData) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(data.length / limit),
        totalItems: data.length,
        itemsPerPage: limit
      },
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  // フィルタリング対応取得
  async getFiltered(filters: FilterParams<CustomerApiData>): Promise<ApiResponse<CustomerApiData[]>> {
    await this.simulateDelay();
    
    let data = customerDetailData.map(convertMockToApiData);
    
    // 簡易フィルタリング実装
    if (filters.name) {
      const nameFilter = Array.isArray(filters.name) ? filters.name : [filters.name];
      data = data.filter((customer: CustomerApiData) => 
        nameFilter.some(name => customer.name.includes(name as string))
      );
    }
    
    return {
      data,
      success: true,
      message: `${Object.keys(filters).length}個のフィルターを適用`,
      timestamp: new Date().toISOString()
    };
  }

  private async simulateDelay(): Promise<void> {
    // モックデータでもAPIコールの遅延をシミュレート
    const delay = 100 + Math.random() * 200; // 100-300ms
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

// 実際のAPIプロバイダークラス
class ApiCustomerDataProvider implements DataProvider<CustomerApiData> {
  source = 'api' as const;

  async get(): Promise<ApiResponse<CustomerApiData[]>> {
    return defaultApiClient.get<CustomerApiData[]>('/customers');
  }

  async getById(id: string): Promise<ApiResponse<CustomerApiData>> {
    return defaultApiClient.get<CustomerApiData>(`/customers/${id}`);
  }

  async create(data: Partial<CustomerApiData>): Promise<ApiResponse<CustomerApiData>> {
    return defaultApiClient.post<CustomerApiData>('/customers', data);
  }

  async update(id: string, data: Partial<CustomerApiData>): Promise<ApiResponse<CustomerApiData>> {
    return defaultApiClient.patch<CustomerApiData>(`/customers/${id}`, data);
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return defaultApiClient.delete<void>(`/customers/${id}`);
  }
}

// ファクトリー関数：環境に応じて適切なプロバイダーを返す
export const createCustomerDataProvider = (): DataProvider<CustomerApiData> => {
  const dataSource = getCurrentDataSource();
  
  if (dataSource === 'api') {
    console.log('🌐 実APIプロバイダーを使用');
    return new ApiCustomerDataProvider();
  } else {
    console.log('🔧 モックデータプロバイダーを使用');
    return new MockCustomerDataProvider();
  }
};

// フォールバック機能付きプロバイダー
export class FallbackCustomerDataProvider implements DataProvider<CustomerApiData> {
  source = 'api' as const;
  private apiProvider: ApiCustomerDataProvider;
  private mockProvider: MockCustomerDataProvider;

  constructor() {
    this.apiProvider = new ApiCustomerDataProvider();
    this.mockProvider = new MockCustomerDataProvider();
  }

  async get(): Promise<ApiResponse<CustomerApiData[]>> {
    try {
      return await this.apiProvider.get();
    } catch (error) {
      console.warn('⚠️ API失敗、モックデータにフォールバック:', error);
      const mockResponse = await this.mockProvider.get();
      return {
        ...mockResponse,
        message: 'API失敗のためモックデータを使用'
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<CustomerApiData>> {
    try {
      return await this.apiProvider.getById(id);
    } catch (error) {
      console.warn(`⚠️ API失敗、モックデータにフォールバック (ID: ${id}):`, error);
      return this.mockProvider.getById(id);
    }
  }

  async create(data: Partial<CustomerApiData>): Promise<ApiResponse<CustomerApiData>> {
    try {
      return await this.apiProvider.create(data);
    } catch (error) {
      console.warn('⚠️ API作成失敗、モックで代替:', error);
      return this.mockProvider.create(data);
    }
  }
}

// デフォルトプロバイダーインスタンス
export const customerDataProvider = createCustomerDataProvider();

// フォールバック機能付きプロバイダーインスタンス
export const fallbackCustomerDataProvider = new FallbackCustomerDataProvider();

// プロバイダー管理機能
export const CustomerDataProviders = {
  // 現在のプロバイダー取得
  getCurrent: () => customerDataProvider,
  
  // フォールバック機能付きプロバイダー取得
  getWithFallback: () => fallbackCustomerDataProvider,
  
  // 手動でモックプロバイダー取得（テスト用）
  getMock: () => new MockCustomerDataProvider(),
  
  // 手動でAPIプロバイダー取得（デバッグ用）
  getApi: () => new ApiCustomerDataProvider(),
  
  // データソース確認
  getCurrentSource: () => getCurrentDataSource(),
  
  // 簡易ヘルスチェック
  async healthCheck(): Promise<{ api: boolean; mock: boolean }> {
    const apiHealthy = await defaultApiClient.healthCheck().catch(() => false);
    const mockHealthy = true; // モックは常に利用可能
    
    return { api: apiHealthy, mock: mockHealthy };
  }
};

export default CustomerDataProviders; 