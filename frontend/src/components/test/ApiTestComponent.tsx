'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api-client';

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
  timestamp?: string;
}

export default function ApiTestComponent() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    updateResult(name, { status: 'pending', timestamp: new Date().toLocaleTimeString() });
    
    try {
      const response = await testFn();
      updateResult(name, { 
        status: 'success', 
        data: response.data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error: any) {
      updateResult(name, { 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // 1. ヘルスチェック
      await runTest('Health Check', api.health);
      
      // 2. Customer API テスト
      await runTest('Customer Test', api.customerTest);
      
      // 3. 顧客セグメント
      await runTest('Customer Segments', api.customerSegments);
      
      // 少し間隔を空けて実行
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            🔗 バックエンドAPI接続テスト
          </h2>
          <p className="text-gray-600 mt-2">
            フロントエンドからバックエンドAPIへの接続を確認します
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={runAllTests}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 テスト実行中...' : '🚀 全テスト実行'}
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              🗑️ 結果クリア
            </button>
          </div>

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
                  </div>
                  <span className="text-sm text-gray-500">
                    {result.timestamp}
                  </span>
                </div>
                
                {result.status === 'success' && result.data && (
                  <div className="mt-3">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-green-700 font-medium">
                        レスポンスデータを表示
                      </summary>
                      <pre className="mt-2 p-3 bg-green-100 rounded text-xs overflow-auto max-h-40">
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
              「全テスト実行」ボタンを押してAPI接続をテストしてください
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 