'use client';

import React, { useState, useEffect } from 'react';

// シンプルなレイアウトコンポーネント
function PageLayout({ title, description, children }: { 
  title: string; 
  description: string; 
  children: React.ReactNode; 
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-lg text-gray-600">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  segment: string;
  totalSpent: number;
  ordersCount: number;
  createdAt: string;
}

interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message: string;
  timestamp: string;
  error?: string;
}

interface ConnectionTestResponse {
  success: boolean;
  message: string;
  timestamp: string;
  database?: string;
  server?: string;
  error?: string;
}

export default function DatabaseTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResponse | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);

  // API Base URL
  const API_BASE = 'https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/database';

  // 接続テスト
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch(`${API_BASE}/test`);
        const data: ConnectionTestResponse = await response.json();
        setConnectionResult(data);
        setConnectionStatus(data.success ? 'success' : 'error');
      } catch (error) {
        setConnectionStatus('error');
        setConnectionResult({
          success: false,
          message: 'ネットワークエラーが発生しました',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    testConnection();
  }, []);

  // 顧客データ取得
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setCustomersLoading(true);
        const response = await fetch(`${API_BASE}/customers`);
        const data: DatabaseResponse<Customer[]> = await response.json();
        
        if (data.success && data.data) {
          setCustomers(data.data);
          setCustomersError(null);
        } else {
          setCustomersError(data.message || '顧客データの取得に失敗しました');
        }
      } catch (error) {
        setCustomersError(error instanceof Error ? error.message : 'ネットワークエラー');
      } finally {
        setCustomersLoading(false);
      }
    };

    if (connectionStatus === 'success') {
      fetchCustomers();
    }
  }, [connectionStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'VIP顧客': return 'bg-purple-100 text-purple-800';
      case 'リピーター': return 'bg-blue-100 text-blue-800';
      case '新規顧客': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageLayout 
      title="Database API テスト"
      description="Azure SQL Database統合の動作確認画面"
    >
      <div className="space-y-8">
        {/* 接続ステータス */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">🔌</span>
            Azure SQL Database 接続テスト
          </h2>
          
          <div className="flex items-center space-x-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'loading' ? 'bg-yellow-100 text-yellow-800' :
              connectionStatus === 'success' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {connectionStatus === 'loading' && '⏳ 接続中...'}
              {connectionStatus === 'success' && '✅ 接続成功'}
              {connectionStatus === 'error' && '❌ 接続失敗'}
            </div>
          </div>

          {connectionResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">メッセージ:</span> {connectionResult.message}
                </div>
                <div>
                  <span className="font-medium">タイムスタンプ:</span> {formatDate(connectionResult.timestamp)}
                </div>
                {connectionResult.database && (
                  <div>
                    <span className="font-medium">データベース:</span> {connectionResult.database}
                  </div>
                )}
                {connectionResult.server && (
                  <div>
                    <span className="font-medium">サーバー:</span> {connectionResult.server}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 顧客データ表示 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Azure SQL Database 顧客データ
          </h2>

          {customersLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">データを取得中...</span>
            </div>
          )}

          {customersError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
                  <div className="mt-2 text-sm text-red-700">{customersError}</div>
                </div>
              </div>
            </div>
          )}

          {!customersLoading && !customersError && customers.length > 0 && (
            <div>
              <div className="mb-4 text-sm text-gray-600">
                {customers.length}件の顧客データを表示
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        顧客情報
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        会社名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        セグメント
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        購入実績
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        登録日
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.email}
                            </div>
                            {customer.phone && (
                              <div className="text-sm text-gray-500">
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {customer.company || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(customer.segment)}`}>
                            {customer.segment}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(customer.totalSpent)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.ordersCount}回の注文
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(customer.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 集計情報 */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-blue-900">
                    {customers.length}
                  </div>
                  <div className="text-blue-700">総顧客数</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-green-900">
                    {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0))}
                  </div>
                  <div className="text-green-700">総売上</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-semibold text-purple-900">
                    {customers.reduce((sum, c) => sum + c.ordersCount, 0)}
                  </div>
                  <div className="text-purple-700">総注文数</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API情報 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium mb-3">🔗 API接続情報</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div><span className="font-medium">ベースURL:</span> {API_BASE}</div>
            <div><span className="font-medium">接続テスト:</span> GET /test</div>
            <div><span className="font-medium">顧客データ:</span> GET /customers</div>
            <div><span className="font-medium">技術スタック:</span> Next.js 14 + .NET 8 + Azure SQL Database + Entity Framework Core</div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 