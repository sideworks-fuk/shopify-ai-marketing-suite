'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Database, 
  TestTube, 
  Settings, 
  Store, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Zap,
  RefreshCw
} from "lucide-react";
import { getCurrentEnvironmentConfig } from '@/lib/config/environments';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading' | 'idle';
  message: string;
  data?: any;
  timestamp: string;
}

export default function ShopifyBackendTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shopDomain, setShopDomain] = useState('test-store.myshopify.com');
  const config = getCurrentEnvironmentConfig();

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev]);
  };

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    addTestResult({
      name: testName,
      status: 'loading',
      message: 'テスト実行中...',
      timestamp: new Date().toISOString()
    });

    try {
      const result = await testFunction();
      addTestResult({
        name: testName,
        status: 'success',
        message: 'テスト成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      addTestResult({
        name: testName,
        status: 'error',
        message: error.message || 'テスト失敗',
        data: error,
        timestamp: new Date().toISOString()
      });
    }
  };

  const testConfig = async () => {
    return runTest('設定確認', async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/shopify/test-config`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    });
  };

  const testOAuthUrl = async () => {
    return runTest('OAuth URL生成', async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/shopify/test-oauth-url?shop=${shopDomain}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    });
  };

  const testHybridMode = async () => {
    return runTest('ハイブリッド方式テスト', async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/shopify/test-hybrid-mode?shop=${shopDomain}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    });
  };

  const testEncryption = async () => {
    return runTest('暗号化テスト', async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/shopify/test-encryption`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    });
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    await testConfig();
    await testOAuthUrl();
    await testHybridMode();
    await testEncryption();
    
    setIsLoading(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'loading':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">✅ 成功</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">❌ 失敗</Badge>;
      case 'loading':
        return <Badge className="bg-blue-100 text-blue-800">🔄 実行中</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">⚪ 未実行</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔧 Shopify OAuthバックエンドAPI テスト
        </h1>
        <p className="text-gray-600">
          ハイブリッド方式のOAuth認証バックエンドAPIの動作確認
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Badge variant="outline">バックエンド連携</Badge>
          <Badge variant="outline">API動作確認</Badge>
          <Badge variant="outline">設定検証</Badge>
        </div>
      </div>

      {/* 環境情報 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Settings className="h-5 w-5" />
            環境情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">現在の環境:</span>
                <Badge variant="secondary">{config.environment}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">API ベースURL:</span>
                <code className="text-xs bg-white px-2 py-1 rounded">
                  {config.apiBaseUrl}
                </code>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">フロントエンドURL:</span>
                <code className="text-xs bg-white px-2 py-1 rounded">
                  {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">説明:</span>
                <span className="text-sm">{config.description}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* テスト設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            テスト設定
          </CardTitle>
          <CardDescription>
            テスト用のパラメータを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shopDomain">テスト用ストアドメイン</Label>
              <Input
                id="shopDomain"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="test-store.myshopify.com"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={runAllTests} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                全テスト実行
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setTestResults([])}
                disabled={isLoading}
              >
                結果クリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 個別テスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            個別テスト
          </CardTitle>
          <CardDescription>
            特定の機能を個別にテストできます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={testConfig} 
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              設定確認
            </Button>
            <Button 
              onClick={testOAuthUrl} 
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Store className="h-4 w-4" />
              OAuth URL生成
            </Button>
            <Button 
              onClick={testHybridMode} 
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              ハイブリッド方式
            </Button>
            <Button 
              onClick={testEncryption} 
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              暗号化テスト
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* テスト結果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            テスト結果
          </CardTitle>
          <CardDescription>
            実行したテストの結果を表示します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>テストを実行してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.status)}
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                  {result.data && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        詳細データ
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Alert className="border-orange-200 bg-orange-50">
        <Info className="h-4 w-4 text-orange-700" />
        <AlertDescription className="text-orange-800">
          <strong>注意:</strong> このテストは開発環境用です。本番環境では適切な認証とセキュリティ設定が必要です。
          バックエンドAPIが起動していることを確認してからテストを実行してください。
        </AlertDescription>
      </Alert>
    </div>
  );
} 