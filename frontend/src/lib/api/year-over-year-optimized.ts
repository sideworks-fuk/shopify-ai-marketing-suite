import { ApiResponse } from '../data-access/types/api';
import { YearOverYearRequest, YearOverYearSummary, YearOverYearProductData, ResponseMetadata } from './year-over-year';
import { getCurrentEnvironmentConfig } from '../config/environments';

/**
 * 前年同月比API - パフォーマンス最適化版
 * 
 * @author YUKI
 * @date 2025-07-27
 * @description サマリーと詳細データを分離してパフォーマンスを改善
 */

// サマリーAPIのレスポンス型
export interface YearOverYearSummaryResponse {
  summary: YearOverYearSummary;
  metadata: ResponseMetadata;
}

// 詳細APIのレスポンス型
export interface YearOverYearDetailResponse {
  products: YearOverYearProductData[];
  metadata: ResponseMetadata;
}

// ページネーション情報
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// 詳細APIリクエスト（ページネーション対応）
export interface YearOverYearDetailRequest extends YearOverYearRequest {
  page?: number;
  pageSize?: number;
  includeMonthlyData?: boolean; // 月次データを含むかどうか
}

// 最適化されたAPIクライアント
export class YearOverYearOptimizedApiClient {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

  constructor(baseUrl?: string) {
    // environments.tsの設定を使用
    this.baseUrl = baseUrl || getCurrentEnvironmentConfig().apiBaseUrl;
    console.log('🔗 YearOverYearOptimizedApiClient initialized with baseUrl:', this.baseUrl);
  }

  /**
   * キャッシュキーの生成
   */
  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * キャッシュからデータを取得
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🎯 Cache hit:', key);
      return cached.data as T;
    }
    return null;
  }

  /**
   * キャッシュにデータを保存
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * サマリーデータのみを高速で取得
   */
  async getYearOverYearSummary(request: YearOverYearRequest): Promise<ApiResponse<YearOverYearSummaryResponse>> {
    const cacheKey = this.getCacheKey('summary', request);
    const cached = this.getFromCache<ApiResponse<YearOverYearSummaryResponse>>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      
      // 必須パラメータ
      params.append('storeId', request.storeId.toString());
      params.append('year', request.year.toString());
      
      // オプションパラメータ
      if (request.startMonth) params.append('startMonth', request.startMonth.toString());
      if (request.endMonth) params.append('endMonth', request.endMonth.toString());
      if (request.category) params.append('category', request.category);
      if (request.productTypes?.length) {
        request.productTypes.forEach(type => params.append('productTypes', type));
      }

      const url = `${this.baseUrl}/api/analytics/year-over-year/summary?${params.toString()}`;
      console.log('📊 Fetching summary:', url);
      
      const startTime = performance.now();
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
      const endTime = performance.now();
      
      console.log(`✅ Summary fetched in ${(endTime - startTime).toFixed(0)}ms`);
      
      const result = data as ApiResponse<YearOverYearSummaryResponse>;
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Summary API error:', error);
      throw error;
    }
  }

  /**
   * 詳細商品データを取得（ページネーション対応）
   */
  async getYearOverYearDetail(request: YearOverYearDetailRequest): Promise<ApiResponse<YearOverYearDetailResponse & { pagination: PaginationInfo }>> {
    const cacheKey = this.getCacheKey('detail', request);
    const cached = this.getFromCache<ApiResponse<YearOverYearDetailResponse & { pagination: PaginationInfo }>>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      
      // 必須パラメータ
      params.append('storeId', request.storeId.toString());
      params.append('year', request.year.toString());
      
      // ページネーションパラメータ
      params.append('page', (request.page || 1).toString());
      params.append('pageSize', (request.pageSize || 50).toString());
      params.append('includeMonthlyData', (request.includeMonthlyData !== false).toString());
      
      // フィルタパラメータ
      if (request.startMonth) params.append('startMonth', request.startMonth.toString());
      if (request.endMonth) params.append('endMonth', request.endMonth.toString());
      if (request.viewMode) params.append('viewMode', request.viewMode);
      if (request.sortBy) params.append('sortBy', request.sortBy);
      if (request.sortDescending !== undefined) params.append('sortDescending', request.sortDescending.toString());
      if (request.searchTerm) params.append('searchTerm', request.searchTerm);
      if (request.growthRateFilter) params.append('growthRateFilter', request.growthRateFilter);
      if (request.category) params.append('category', request.category);
      
      // 配列パラメータ
      if (request.productTypes?.length) {
        request.productTypes.forEach(type => params.append('productTypes', type));
      }
      if (request.productVendors?.length) {
        request.productVendors.forEach(vendor => params.append('productVendors', vendor));
      }

      const url = `${this.baseUrl}/api/analytics/year-over-year/detail?${params.toString()}`;
      console.log('📦 Fetching detail page:', request.page);
      
      const startTime = performance.now();
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
      const endTime = performance.now();
      
      console.log(`✅ Detail page ${request.page} fetched in ${(endTime - startTime).toFixed(0)}ms`);
      
      const result = data as ApiResponse<YearOverYearDetailResponse & { pagination: PaginationInfo }>;
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Detail API error:', error);
      throw error;
    }
  }

  /**
   * 商品の基本情報のみを高速で取得（月次データなし）
   */
  async getYearOverYearProductList(request: YearOverYearDetailRequest): Promise<ApiResponse<{
    products: Array<{
      productTitle: string;
      productType: string;
      productVendor?: string;
      currentYearTotal: number;
      previousYearTotal: number;
      overallGrowthRate: number;
    }>;
    pagination: PaginationInfo;
  }>> {
    const cacheKey = this.getCacheKey('product-list', request);
    const cached = this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    try {
      const modifiedRequest = { ...request, includeMonthlyData: false };
      const response = await this.getYearOverYearDetail(modifiedRequest);
      
      // 月次データを除外した簡略版を返す
      const simplifiedProducts = response.data.products.map(p => ({
        productTitle: p.productTitle,
        productType: p.productType,
        productVendor: p.productVendor,
        currentYearTotal: p.currentYearTotal,
        previousYearTotal: p.previousYearTotal,
        overallGrowthRate: p.overallGrowthRate,
      }));

      const result: ApiResponse<{
        products: Array<{
          productTitle: string;
          productType: string;
          productVendor?: string;
          currentYearTotal: number;
          previousYearTotal: number;
          overallGrowthRate: number;
        }>;
        pagination: PaginationInfo;
      }> = {
        success: response.success,
        data: {
          products: simplifiedProducts,
          pagination: response.data.pagination,
        },
        message: response.message,
        timestamp: new Date().toISOString(),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Product list API error:', error);
      throw error;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  /**
   * プリフェッチ - バックグラウンドでデータを先読み
   */
  async prefetchNextPage(currentRequest: YearOverYearDetailRequest): Promise<void> {
    const nextPage = (currentRequest.page || 1) + 1;
    const prefetchRequest = { ...currentRequest, page: nextPage };
    
    // バックグラウンドで次のページを取得
    this.getYearOverYearDetail(prefetchRequest).catch(error => {
      console.warn('Prefetch failed:', error);
    });
  }
}

// 最適化されたAPIクライアントのシングルトンインスタンス
export const yearOverYearOptimizedApi = new YearOverYearOptimizedApiClient();

// 便利なヘルパー関数
export const yearOverYearHelpers = {
  /**
   * 全商品データを段階的に取得
   */
  async *getAllProductsIterator(request: YearOverYearRequest, pageSize = 50) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await yearOverYearOptimizedApi.getYearOverYearDetail({
        ...request,
        page,
        pageSize,
      });

      if (response.success && response.data.products.length > 0) {
        yield response.data.products;
        hasMore = response.data.pagination.hasNextPage;
        page++;
      } else {
        hasMore = false;
      }
    }
  },

  /**
   * バッチで商品データを取得
   */
  async getProductsInBatches(request: YearOverYearRequest, batchSize = 100, maxBatches = 10) {
    const allProducts: YearOverYearProductData[] = [];
    let batchCount = 0;

    for await (const batch of this.getAllProductsIterator(request, batchSize)) {
      allProducts.push(...batch);
      batchCount++;
      
      if (batchCount >= maxBatches) {
        console.log(`⚠️ Reached max batches limit (${maxBatches})`);
        break;
      }
    }

    return allProducts;
  },
};