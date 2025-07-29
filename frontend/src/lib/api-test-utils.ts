// API Testing Utilities for Development
// 購入回数分析API連携調査とAPIテスト画面実装

export interface ApiTestConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiTestResult {
  endpoint: string;
  method: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  statusCode?: number;
  responseTime?: number;
  data?: any;
  error?: string;
  headers?: Record<string, string>;
  requestPayload?: any;
  curlCommand?: string;
}

export interface ApiEndpointConfig {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
  description?: string;
  expectedStructure?: Record<string, string>;
}

export class ApiTester {
  private config: ApiTestConfig;

  constructor(config: ApiTestConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  async test(endpoint: string, options: RequestInit = {}): Promise<ApiTestResult> {
    const startTime = performance.now();
    const method = options.method || 'GET';
    const fullUrl = `${this.config.baseUrl}${endpoint}`;

    const testResult: ApiTestResult = {
      endpoint,
      method,
      status: 'loading',
      requestPayload: options.body,
      curlCommand: this.generateCurlCommand(fullUrl, options),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        ...testResult,
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseTime: Math.round(responseTime),
        data,
        headers: Object.fromEntries(response.headers.entries()),
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        ...testResult,
        status: 'error',
        responseTime: Math.round(responseTime),
        error: error.name === 'AbortError' 
          ? `Request timeout after ${this.config.timeout}ms`
          : error.message,
      };
    }
  }

  // モックとAPIの比較
  async compareWithMock(endpoint: string, mockData: any, options: RequestInit = {}): Promise<{
    apiResult: ApiTestResult;
    mockData: any;
    differences: string[];
  }> {
    const apiResult = await this.test(endpoint, options);
    
    return {
      apiResult,
      mockData,
      differences: this.findDifferences(apiResult.data, mockData),
    };
  }

  // データ構造の差分検出
  private findDifferences(apiData: any, mockData: any, path = ''): string[] {
    const differences: string[] = [];

    if (typeof apiData !== typeof mockData) {
      differences.push(`${path}: Type mismatch - API: ${typeof apiData}, Mock: ${typeof mockData}`);
      return differences;
    }

    if (Array.isArray(apiData) && Array.isArray(mockData)) {
      if (apiData.length !== mockData.length) {
        differences.push(`${path}: Array length mismatch - API: ${apiData.length}, Mock: ${mockData.length}`);
      }
      
      const maxLength = Math.max(apiData.length, mockData.length);
      for (let i = 0; i < Math.min(maxLength, 3); i++) { // 最初の3要素のみチェック
        if (apiData[i] !== undefined && mockData[i] !== undefined) {
          differences.push(...this.findDifferences(apiData[i], mockData[i], `${path}[${i}]`));
        }
      }
    } else if (typeof apiData === 'object' && apiData !== null && mockData !== null) {
      const apiKeys = Object.keys(apiData);
      const mockKeys = Object.keys(mockData);
      
      const missingInApi = mockKeys.filter(key => !apiKeys.includes(key));
      const missingInMock = apiKeys.filter(key => !mockKeys.includes(key));
      
      missingInApi.forEach(key => {
        differences.push(`${path}.${key}: Missing in API response`);
      });
      
      missingInMock.forEach(key => {
        differences.push(`${path}.${key}: Extra field in API response`);
      });
      
      // 共通キーの比較
      const commonKeys = apiKeys.filter(key => mockKeys.includes(key));
      commonKeys.forEach(key => {
        differences.push(...this.findDifferences(apiData[key], mockData[key], path ? `${path}.${key}` : key));
      });
    } else if (apiData !== mockData) {
      differences.push(`${path}: Value mismatch - API: ${JSON.stringify(apiData)}, Mock: ${JSON.stringify(mockData)}`);
    }

    return differences;
  }

  // cURLコマンド生成
  generateCurlCommand(url: string, options: RequestInit = {}): string {
    const method = options.method || 'GET';
    const headers = { ...this.config.headers, ...options.headers };
    
    let curlCommand = `curl -X ${method}`;
    
    // ヘッダー追加
    Object.entries(headers).forEach(([key, value]) => {
      curlCommand += ` -H "${key}: ${value}"`;
    });
    
    // ボディ追加
    if (options.body) {
      curlCommand += ` -d '${options.body}'`;
    }
    
    curlCommand += ` "${url}"`;
    
    return curlCommand;
  }

  // API健全性チェック
  async healthCheck(): Promise<{
    isHealthy: boolean;
    services: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    }>;
  }> {
    const healthEndpoints = [
      { name: 'Base API', endpoint: '/api/health' },
      { name: 'Shopify Orders', endpoint: '/api/shopify/orders' },
      { name: 'Shopify Customers', endpoint: '/api/shopify/customers' },
      { name: 'Shopify Products', endpoint: '/api/shopify/products' },
    ];

    const results = await Promise.all(
      healthEndpoints.map(async ({ name, endpoint }) => {
        try {
          const result = await this.test(endpoint, { method: 'GET' });
          return {
            name,
            status: result.status === 'success' ? 'healthy' as const : 'unhealthy' as const,
            responseTime: result.responseTime,
            error: result.error,
          };
        } catch (error: any) {
          return {
            name,
            status: 'unhealthy' as const,
            error: error.message,
          };
        }
      })
    );

    const isHealthy = results.every(result => result.status === 'healthy');

    return {
      isHealthy,
      services: results,
    };
  }
}

// データソース比較ユーティリティ
export class DataSourceComparator {
  static compareStructures(apiData: any, mockData: any): {
    score: number; // 0-100の類似度スコア
    matches: string[];
    mismatches: string[];
    recommendations: string[];
  } {
    const matches: string[] = [];
    const mismatches: string[] = [];
    const recommendations: string[] = [];

    // 基本構造チェック
    if (Array.isArray(apiData) && Array.isArray(mockData)) {
      matches.push('Both are arrays');
      
      if (apiData.length === 0) {
        recommendations.push('API returned empty array - check data availability');
      } else if (mockData.length === 0) {
        recommendations.push('Mock data is empty - add sample data');
      }
    } else if (typeof apiData === 'object' && typeof mockData === 'object') {
      matches.push('Both are objects');
      
      const apiKeys = Object.keys(apiData || {});
      const mockKeys = Object.keys(mockData || {});
      
      const commonKeys = apiKeys.filter(key => mockKeys.includes(key));
      const missingKeys = mockKeys.filter(key => !apiKeys.includes(key));
      const extraKeys = apiKeys.filter(key => !mockKeys.includes(key));
      
      commonKeys.forEach(key => matches.push(`Common field: ${key}`));
      missingKeys.forEach(key => mismatches.push(`Missing in API: ${key}`));
      extraKeys.forEach(key => mismatches.push(`Extra in API: ${key}`));
      
      if (missingKeys.length > 0) {
        recommendations.push(`Add missing fields to API: ${missingKeys.join(', ')}`);
      }
      
      if (extraKeys.length > 0) {
        recommendations.push(`Consider adding to mock data: ${extraKeys.join(', ')}`);
      }
    } else {
      mismatches.push(`Type mismatch: API is ${typeof apiData}, Mock is ${typeof mockData}`);
    }

    // スコア計算
    const totalChecks = matches.length + mismatches.length;
    const score = totalChecks > 0 ? Math.round((matches.length / totalChecks) * 100) : 0;

    return {
      score,
      matches,
      mismatches,
      recommendations,
    };
  }
}

// 購入回数分析用のAPIエンドポイント定義
export const PURCHASE_FREQUENCY_ENDPOINTS: ApiEndpointConfig[] = [
  {
    name: '購入回数データ取得',
    endpoint: '/api/analytics/purchase-frequency',
    method: 'GET',
    params: { 
      startYear: new Date().getFullYear(),
      startMonth: new Date().getMonth() + 1,
      endYear: new Date().getFullYear(),
      endMonth: new Date().getMonth() + 1,
    },
    description: '購入回数別の顧客分布データを取得',
    expectedStructure: {
      'purchaseCount': 'number',
      'label': 'string',
      'current.orderCount': 'number',
      'current.totalAmount': 'number',
      'previous.orderCount': 'number',
      'previous.totalAmount': 'number',
      'countGrowth': 'number',
      'amountGrowth': 'number',
    },
  },
  {
    name: '顧客セグメント取得',
    endpoint: '/api/analytics/customer-segments',
    method: 'GET',
    params: { period: '30days' },
    description: '顧客セグメント別の分析データを取得',
    expectedStructure: {
      'segment': 'string',
      'customerCount': 'number',
      'percentage': 'number',
    },
  },
  {
    name: '購入パターン分析',
    endpoint: '/api/analytics/purchase-patterns',
    method: 'POST',
    body: { 
      analysisType: 'frequency',
      period: { 
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
    },
    description: '購入パターンの詳細分析を実行',
    expectedStructure: {
      'patterns': 'array',
      'insights': 'array',
      'recommendations': 'array',
    },
  },
  {
    name: 'KPIサマリー取得',
    endpoint: '/api/analytics/purchase-kpi-summary',
    method: 'GET',
    params: { period: 'current_month' },
    description: '購入回数分析のKPIサマリーを取得',
    expectedStructure: {
      'totalCustomers': 'number',
      'averagePurchaseCount': 'number',
      'repeatRate': 'number',
      'loyaltyRate': 'number',
    },
  },
];

// Shopify API エンドポイント定義
export const SHOPIFY_API_ENDPOINTS: ApiEndpointConfig[] = [
  {
    name: 'Shopify Orders',
    endpoint: '/api/shopify/orders',
    method: 'GET',
    params: {
      shop: 'example-shop.myshopify.com',
      access_token: 'test-token',
      limit: '10',
    },
    description: 'Shopify注文データを取得',
    expectedStructure: {
      'orders': 'array',
    },
  },
  {
    name: 'Shopify Customers',
    endpoint: '/api/shopify/customers',
    method: 'GET',
    params: {
      shop: 'example-shop.myshopify.com',
      access_token: 'test-token',
      limit: '10',
    },
    description: 'Shopify顧客データを取得',
    expectedStructure: {
      'customers': 'array',
    },
  },
  {
    name: 'Shopify Products',
    endpoint: '/api/shopify/products',
    method: 'GET',
    params: {
      shop: 'example-shop.myshopify.com',
      access_token: 'test-token',
      limit: '10',
    },
    description: 'Shopify商品データを取得',
    expectedStructure: {
      'products': 'array',
    },
  },
];

export default ApiTester;