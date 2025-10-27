import { ApiResponse } from '../data-access/types/api';
import { getCurrentEnvironmentConfig } from '../config/environments';

// API用の型定義
export interface YearOverYearRequest {
  storeId: number;
  year: number;
  startMonth?: number;
  endMonth?: number;
  viewMode?: 'sales' | 'quantity' | 'orders';
  sortBy?: 'growth_rate' | 'total_sales' | 'name';
  sortDescending?: boolean;
  productTypes?: string[];
  productVendors?: string[];
  searchTerm?: string;
  growthRateFilter?: 'all' | 'positive' | 'negative' | 'high_growth' | 'high_decline';
  category?: string;
  excludeServiceItems?: boolean;
}

export interface MonthlyComparisonData {
  month: number;
  monthName: string;
  currentValue: number;
  previousValue: number;
  growthRate: number;
  growthCategory: string;
}

export interface YearOverYearProductData {
  productTitle: string;
  productType: string;
  productVendor?: string;
  monthlyData: MonthlyComparisonData[];
  currentYearTotal: number;
  previousYearTotal: number;
  overallGrowthRate: number;
  averageMonthlyGrowthRate: number;
}

export interface TopPerformingProduct {
  productTitle: string;
  productType: string;
  value: number;
  growthRate: number;
}

export interface YearOverYearSummary {
  currentYear: number;
  previousYear: number;
  totalProducts: number;
  growingProducts: number;
  decliningProducts: number;
  newProducts: number;
  overallGrowthRate: number;
  currentYearTotalSales: number;
  previousYearTotalSales: number;
  topGrowthProduct?: TopPerformingProduct;
  topSalesProduct?: TopPerformingProduct;
}

export interface ResponseMetadata {
  generatedAt: string;
  processingTimeMs: number;
  dataSource: string;
  cacheHit: boolean;
  apiVersion: string;
  warnings?: string[];
}

export interface YearOverYearResponse {
  products: YearOverYearProductData[];
  summary: YearOverYearSummary;
  metadata: ResponseMetadata;
}

// API Client クラス
export class YearOverYearApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // environments.tsの設定を使用
    this.baseUrl = baseUrl || getCurrentEnvironmentConfig().apiBaseUrl;
    console.log('🔗 YearOverYearApiClient initialized with baseUrl:', this.baseUrl);
  }

  /**
   * 前年同月比分析データを取得
   */
  async getYearOverYearAnalysis(request: YearOverYearRequest): Promise<ApiResponse<YearOverYearResponse>> {
    try {
      const params = new URLSearchParams();
      
      // 必須パラメータ
      params.append('storeId', request.storeId.toString());
      params.append('year', request.year.toString());
      
      // オプションパラメータ
      if (request.startMonth) params.append('startMonth', request.startMonth.toString());
      if (request.endMonth) params.append('endMonth', request.endMonth.toString());
      if (request.viewMode) params.append('viewMode', request.viewMode);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.growthRateFilter) params.append('growthRateFilter', request.growthRateFilter);
      if (request.category) params.append('category', request.category);
      if (request.excludeServiceItems !== undefined) params.append('excludeServiceItems', request.excludeServiceItems.toString());
      
      // 配列パラメータ
      if (request.productTypes?.length) {
        request.productTypes.forEach(type => params.append('productTypes', type));
      }
      if (request.productVendors?.length) {
        request.productVendors.forEach(vendor => params.append('productVendors', vendor));
      }

      const url = `${this.baseUrl}/api/analytics/year-over-year?${params.toString()}`;
      
      console.log('API Request URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as ApiResponse<YearOverYearResponse>;
    } catch (error) {
      console.error('Year-over-year API error:', error);
      throw error;
    }
  }

  /**
   * 利用可能な商品タイプ一覧を取得
   */
  async getProductTypes(storeId: number = 1): Promise<ApiResponse<string[]>> {
    try {
      const url = `${this.baseUrl}/api/analytics/product-types?storeId=${storeId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as ApiResponse<string[]>;
    } catch (error) {
      console.error('Product types API error:', error);
      throw error;
    }
  }

  /**
   * 利用可能なベンダー一覧を取得
   */
  async getVendors(storeId: number = 1): Promise<ApiResponse<string[]>> {
    try {
      const url = `${this.baseUrl}/api/analytics/vendors?storeId=${storeId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as ApiResponse<string[]>;
    } catch (error) {
      console.error('Vendors API error:', error);
      throw error;
    }
  }

  /**
   * 分析可能期間を取得
   */
  async getAnalysisDateRange(storeId: number = 1): Promise<ApiResponse<{
    earliestYear: number;
    latestYear: number;
    availableYears: number[];
  }>> {
    try {
      const url = `${this.baseUrl}/api/analytics/date-range?storeId=${storeId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as ApiResponse<{
        earliestYear: number;
        latestYear: number;
        availableYears: number[];
      }>;
    } catch (error) {
      console.error('Date range API error:', error);
      throw error;
    }
  }

  /**
   * API接続テスト
   */
  async testConnection(): Promise<ApiResponse<any>> {
    try {
      const url = `${this.baseUrl}/api/analytics/test`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as ApiResponse<any>;
    } catch (error) {
      console.error('API connection test error:', error);
      throw error;
    }
  }
}

// デフォルトのAPIクライアントインスタンス
export const yearOverYearApi = new YearOverYearApiClient();