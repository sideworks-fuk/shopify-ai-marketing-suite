"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Loader2, AlertCircle, PlayCircle, Download, RefreshCw } from "lucide-react";
import { 
  ApiTester, 
  DataSourceComparator,
  PURCHASE_FREQUENCY_ENDPOINTS,
  SHOPIFY_API_ENDPOINTS,
  type ApiTestResult,
  type ApiEndpointConfig
} from "@/lib/api-test-utils";
import { DataService } from "@/services/dataService";

export default function PurchaseFrequencyApiTestPage() {
  const [testResults, setTestResults] = useState<Map<string, ApiTestResult>>(new Map());
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [apiTester, setApiTester] = useState<ApiTester | null>(null);
  const [dataService, setDataService] = useState<DataService | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // API設定の初期化
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin;
    const tester = new ApiTester({
      baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    setApiTester(tester);
    setDataService(new DataService());
  }, []);

  // 個別APIテスト実行
  const testApi = async (endpointConfig: ApiEndpointConfig) => {
    if (!apiTester) return;

    const key = `${endpointConfig.method}-${endpointConfig.endpoint}`;
    
    // ローディング状態を設定
    setTestResults(prev => new Map(prev.set(key, {
      endpoint: endpointConfig.endpoint,
      method: endpointConfig.method,
      status: 'loading',
    })));

    let url = endpointConfig.endpoint;
    let options: RequestInit = { method: endpointConfig.method };

    // GET リクエストの場合はパラメータをURLに追加
    if (endpointConfig.method === 'GET' && endpointConfig.params) {
      const searchParams = new URLSearchParams();
      Object.entries(endpointConfig.params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    // POST リクエストの場合はボディを設定
    if (endpointConfig.method === 'POST' && endpointConfig.body) {
      options.body = JSON.stringify(endpointConfig.body);
    }

    const result = await apiTester.test(url, options);
    
    setTestResults(prev => new Map(prev.set(key, result)));
    setSelectedEndpoint(key);
  };

  // 全APIテスト実行
  const testAllApis = async () => {
    if (!apiTester) return;

    setIsTestingAll(true);
    const allEndpoints = [...PURCHASE_FREQUENCY_ENDPOINTS, ...SHOPIFY_API_ENDPOINTS];
    
    for (const endpoint of allEndpoints) {
      await testApi(endpoint);
      // 各テスト間に短い遅延を入れる
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsTestingAll(false);
  };

  // ヘルスチェック実行
  const runHealthCheck = async () => {
    if (!apiTester) return;
    
    const health = await apiTester.healthCheck();
    setHealthStatus(health);
  };

  // モックデータとの比較テスト
  const testWithMockComparison = async () => {
    if (!dataService) return;

    try {
      // モックデータを取得
      const mockResponse = await dataService.getPurchaseFrequencyAnalysis();
      const mockData = mockResponse.data;

      // API データを取得してテスト
      const endpoint = PURCHASE_FREQUENCY_ENDPOINTS[0];
      await testApi(endpoint);
      
      const key = `${endpoint.method}-${endpoint.endpoint}`;
      const apiResult = testResults.get(key);
      
      if (apiResult && apiResult.status === 'success') {
        const comparison = DataSourceComparator.compareStructures(apiResult.data, mockData);
        console.log('Data comparison result:', comparison);
        
        // 比較結果を表示
        alert(`データ構造比較結果:\n類似度: ${comparison.score}%\n一致項目: ${comparison.matches.length}\n不一致項目: ${comparison.mismatches.length}`);
      }
    } catch (error) {
      console.error('Mock comparison failed:', error);
    }
  };

  // CSVエクスポート
  const exportResults = () => {
    const data = Array.from(testResults.entries()).map(([key, result]) => [
      result.endpoint,
      result.method,
      result.status,
      result.statusCode || '',
      result.responseTime || '',
      result.error || '',
    ]);

    const csvContent = [
      ['Endpoint', 'Method', 'Status', 'Status Code', 'Response Time (ms)', 'Error'],
      ...data,
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `api-test-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, statusCode?: number) => {
    const getVariant = () => {
      if (status === 'success') return 'default';
      if (status === 'error') return 'destructive';
      if (status === 'loading') return 'secondary';
      return 'outline';
    };

    return (
      <Badge variant={getVariant()}>
        {status === 'loading' ? 'Testing...' : 
         status === 'success' ? `${statusCode || 200} OK` :
         status === 'error' ? `${statusCode || 'ERROR'}` : 'Idle'}
      </Badge>
    );
  };

  const selectedResult = selectedEndpoint ? testResults.get(selectedEndpoint) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">購入回数分析 APIテスト</h1>
          <p className="text-gray-600 mt-2">API連携状況の調査とデバッグツール</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runHealthCheck} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            ヘルスチェック
          </Button>
          <Button onClick={exportResults} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            結果をCSV出力
          </Button>
        </div>
      </div>

      {/* ヘルスステータス */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              システムヘルス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {healthStatus.services.map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{service.name}</div>
                    {service.responseTime && (
                      <div className="text-sm text-gray-500">{service.responseTime}ms</div>
                    )}
                  </div>
                  <Badge variant={service.status === 'healthy' ? 'default' : 'destructive'}>
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* メインアクション */}
      <Card>
        <CardHeader>
          <CardTitle>APIテスト</CardTitle>
          <div className="flex gap-2">
            <Button onClick={testAllApis} disabled={isTestingAll || !apiTester}>
              {isTestingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  テスト中...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  すべてテスト
                </>
              )}
            </Button>
            <Button 
              onClick={testWithMockComparison} 
              variant="outline"
              disabled={!dataService}
            >
              モックデータ比較
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* エンドポイント一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>購入回数分析API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PURCHASE_FREQUENCY_ENDPOINTS.map((endpoint, index) => {
              const key = `${endpoint.method}-${endpoint.endpoint}`;
              const result = testResults.get(key);
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                    selectedEndpoint === key ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedEndpoint(key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result?.status || 'idle')}
                      <div>
                        <div className="font-medium">{endpoint.name}</div>
                        <div className="text-sm text-gray-500">
                          {endpoint.method} {endpoint.endpoint}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result?.responseTime && (
                        <span className="text-sm text-gray-500">{result.responseTime}ms</span>
                      )}
                      {getStatusBadge(result?.status || 'idle', result?.statusCode)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          testApi(endpoint);
                        }}
                        disabled={result?.status === 'loading'}
                      >
                        テスト
                      </Button>
                    </div>
                  </div>
                  {endpoint.description && (
                    <div className="text-sm text-gray-600 mt-1">{endpoint.description}</div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Shopify API */}
        <Card>
          <CardHeader>
            <CardTitle>Shopify API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {SHOPIFY_API_ENDPOINTS.map((endpoint, index) => {
              const key = `${endpoint.method}-${endpoint.endpoint}`;
              const result = testResults.get(key);
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                    selectedEndpoint === key ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedEndpoint(key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result?.status || 'idle')}
                      <div>
                        <div className="font-medium">{endpoint.name}</div>
                        <div className="text-sm text-gray-500">
                          {endpoint.method} {endpoint.endpoint}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result?.responseTime && (
                        <span className="text-sm text-gray-500">{result.responseTime}ms</span>
                      )}
                      {getStatusBadge(result?.status || 'idle', result?.statusCode)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          testApi(endpoint);
                        }}
                        disabled={result?.status === 'loading'}
                      >
                        テスト
                      </Button>
                    </div>
                  </div>
                  {endpoint.description && (
                    <div className="text-sm text-gray-600 mt-1">{endpoint.description}</div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 詳細結果表示 */}
      {selectedResult && (
        <Card>
          <CardHeader>
            <CardTitle>詳細結果: {selectedResult.endpoint}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="response" className="w-full">
              <TabsList>
                <TabsTrigger value="response">レスポンス</TabsTrigger>
                <TabsTrigger value="headers">ヘッダー</TabsTrigger>
                <TabsTrigger value="timing">パフォーマンス</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="response" className="space-y-4">
                {selectedResult.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{selectedResult.error}</AlertDescription>
                  </Alert>
                )}
                
                <div>
                  <h4 className="font-semibold mb-2">レスポンスデータ:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(selectedResult.data, null, 2)}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="headers" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">レスポンスヘッダー:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(selectedResult.headers, null, 2)}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="timing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded">
                    <div className="text-2xl font-bold">{selectedResult.responseTime}ms</div>
                    <div className="text-sm text-gray-600">レスポンス時間</div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-2xl font-bold">{selectedResult.statusCode}</div>
                    <div className="text-sm text-gray-600">ステータスコード</div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-2xl font-bold">
                      {selectedResult.status === 'success' ? '✓' : '✗'}
                    </div>
                    <div className="text-sm text-gray-600">ステータス</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="curl" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">cURL Command:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {selectedResult.curlCommand}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedResult.curlCommand || '');
                    }}
                  >
                    コピー
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* データソース情報 */}
      <Card>
        <CardHeader>
          <CardTitle>データソース情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div><strong>現在のデータソース:</strong> {dataService?.getCurrentDataSource() || 'Unknown'}</div>
            <div><strong>API Base URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin}</div>
            <div><strong>モックデータ使用:</strong> {process.env.NEXT_PUBLIC_USE_MOCK === 'true' ? 'Yes' : 'No'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}