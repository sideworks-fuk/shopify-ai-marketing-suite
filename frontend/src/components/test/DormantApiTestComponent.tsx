'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api-client';

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
  timestamp?: string;
  duration?: number;
}

interface DormantTestParams {
  storeId: number;
  segment: string;
  riskLevel: string;
  minTotalSpent: string;
  maxTotalSpent: string;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  descending: boolean;
}

export default function DormantApiTestComponent() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // テスト用パラメーター
  const [params, setParams] = useState<DormantTestParams>({
    storeId: 1,
    segment: 'all',
    riskLevel: '',
    minTotalSpent: '',
    maxTotalSpent: '',
    pageNumber: 1,
    pageSize: 10,
    sortBy: 'DaysSinceLastPurchase',
    descending: true,
  });

  const [customerId, setCustomerId] = useState<number>(1);

  const updateResult = (endpoint: string, result: Partial<TestResult>) => {
    setTestResults(prev => {
      const existingIndex = prev.findIndex(r => r.endpoint === endpoint);
      const newResult = { endpoint, ...result };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newResult };
        return updated;
      } else {
        return [...prev, newResult as TestResult];
      }
    });
  };

  const runTest = async (
    name: string, 
    testFn: () => Promise<any>
  ) => {
    const startTime = Date.now();
    updateResult(name, { 
      status: 'pending', 
      timestamp: new Date().toLocaleTimeString() 
    });
    
    try {
      const response = await testFn();
      const duration = Date.now() - startTime;
      updateResult(name, { 
        status: 'success', 
        data: response.data,
        timestamp: new Date().toLocaleTimeString(),
        duration
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateResult(name, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toLocaleTimeString(),
        duration
      });
    }
  };

  // 個別テスト関数
  const testDormantCustomers = () => {
    const testParams: any = {
      storeId: params.storeId,
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      descending: params.descending,
    };

    // 空でない値のみ追加
    if (params.segment && params.segment !== 'all') testParams.segment = params.segment;
    if (params.riskLevel) testParams.riskLevel = params.riskLevel;
    if (params.minTotalSpent) testParams.minTotalSpent = parseFloat(params.minTotalSpent);
    if (params.maxTotalSpent) testParams.maxTotalSpent = parseFloat(params.maxTotalSpent);

    return runTest('休眠顧客リスト取得', () => api.dormantCustomers(testParams));
  };

  const testDormantSummary = () => {
    return runTest('休眠顧客サマリー取得', () => api.dormantSummary(params.storeId));
  };

  const testChurnProbability = () => {
    return runTest(`離脱確率計算 (ID: ${customerId})`, () => api.customerChurnProbability(customerId));
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      await testDormantSummary();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testDormantCustomers();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testChurnProbability();
    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const handleParamChange = (key: keyof DormantTestParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            🔍 休眠顧客分析API テスト画面
          </h2>
          <p className="text-gray-600 mt-2">
            休眠顧客分析APIの動作確認とレスポンスデータの検証を行います
          </p>
        </div>
        
        <div className="p-6">
          {/* テストパラメーター設定 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">📋 テストパラメーター設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 基本設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ストアID
                </label>
                <input
                  type="number"
                  value={params.storeId}
                  onChange={(e) => handleParamChange('storeId', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="ストアID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  セグメント
                </label>
                <select
                  value={params.segment}
                  onChange={(e) => handleParamChange('segment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="セグメント"
                >
                  <option value="all">すべて</option>
                  <option value="90-180日">90-180日</option>
                  <option value="180-365日">180-365日</option>
                  <option value="365日以上">365日以上</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  リスクレベル
                </label>
                <select
                  value={params.riskLevel}
                  onChange={(e) => handleParamChange('riskLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="リスクレベル"
                >
                  <option value="">すべて</option>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="critical">危険</option>
                </select>
              </div>

              {/* ページング設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ページ番号
                </label>
                <input
                  type="number"
                  min="1"
                  value={params.pageNumber}
                  onChange={(e) => handleParamChange('pageNumber', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="ページ番号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ページサイズ
                </label>
                <select
                  value={params.pageSize}
                  onChange={(e) => handleParamChange('pageSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="ページサイズ"
                >
                  <option value={5}>5件</option>
                  <option value={10}>10件</option>
                  <option value={25}>25件</option>
                  <option value={50}>50件</option>
                </select>
              </div>

              {/* 金額フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最小購入金額
                </label>
                <input
                  type="number"
                  value={params.minTotalSpent}
                  onChange={(e) => handleParamChange('minTotalSpent', e.target.value)}
                  placeholder="例: 10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最大購入金額
                </label>
                <input
                  type="number"
                  value={params.maxTotalSpent}
                  onChange={(e) => handleParamChange('maxTotalSpent', e.target.value)}
                  placeholder="例: 100000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 離脱確率テスト用 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  離脱確率テスト用顧客ID
                </label>
                <input
                  type="number"
                  min="1"
                  value={customerId}
                  onChange={(e) => setCustomerId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="離脱確率テスト用顧客ID"
                />
              </div>
            </div>
          </div>

          {/* テスト実行ボタン */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? '🔄 全テスト実行中...' : '🚀 全テスト実行'}
            </button>
            
            <button
              onClick={testDormantSummary}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              📊 サマリーのみ
            </button>
            
            <button
              onClick={testDormantCustomers}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              👥 顧客リストのみ
            </button>
            
            <button
              onClick={testChurnProbability}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              📈 離脱確率のみ
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              🗑️ 結果クリア
            </button>
          </div>

          {/* テスト結果表示 */}
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div
                key={`${result.endpoint}-${index}`}
                className={`p-4 rounded-lg border-l-4 ${
                  result.status === 'success' 
                    ? 'bg-green-50 border-green-500' 
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {result.status === 'success' && '✅'}
                      {result.status === 'error' && '❌'}
                      {result.status === 'pending' && '⏳'}
                    </span>
                    <h3 className="font-semibold">{result.endpoint}</h3>
                    {result.duration && (
                      <span className="text-sm text-gray-500">
                        ({result.duration}ms)
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {result.timestamp}
                  </span>
                </div>
                
                {result.status === 'success' && result.data && (
                  <div className="mt-3">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-green-700 font-medium">
                        レスポンスデータを表示 ({typeof result.data === 'object' ? 
                          `${Object.keys(result.data).length} fields` : 
                          typeof result.data})
                      </summary>
                      <pre className="mt-2 p-3 bg-green-100 rounded text-xs overflow-auto max-h-96">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
                
                {result.status === 'error' && result.error && (
                  <div className="mt-2">
                    <p className="text-red-700 text-sm font-medium">
                      エラー: {result.error}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {testResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              「全テスト実行」ボタンを押して休眠顧客APIをテストしてください
            </div>
          )}
        </div>
      </div>
      
      {/* API情報 */}
      <div className="mt-6 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-3">🔗 API情報</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <div><span className="font-medium">ベースURL:</span> https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net</div>
          <div><span className="font-medium">休眠顧客リスト:</span> GET /api/customer/dormant</div>
          <div><span className="font-medium">サマリー統計:</span> GET /api/customer/dormant/summary</div>
          <div><span className="font-medium">離脱確率:</span> GET /api/customer/{'{id}'}/churn-probability</div>
          <div><span className="font-medium">実装:</span> Phase 1 - 基本機能実装済み</div>
        </div>
      </div>
    </div>
  );
} 