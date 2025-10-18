'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  ExternalLink,
  Database,
  Store
} from "lucide-react";
import { getCurrentEnvironmentConfig } from '@/lib/config/environments';

interface ConfigItem {
  name: string;
  value: string;
  status: 'valid' | 'invalid' | 'missing' | 'unknown';
  description: string;
  isSecret?: boolean;
}

export default function OAuthConfigTestPage() {
  const [configItems, setConfigItems] = useState<ConfigItem[]>([]);
  const [showSecrets, setShowSecrets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const config = getCurrentEnvironmentConfig();

  useEffect(() => {
    analyzeConfig();
  }, []);

  const analyzeConfig = () => {
    setIsLoading(true);
    
    const items: ConfigItem[] = [
      // フロントエンド設定
      {
        name: 'NEXT_PUBLIC_ENVIRONMENT',
        value: process.env.NEXT_PUBLIC_ENVIRONMENT || '未設定',
        status: process.env.NEXT_PUBLIC_ENVIRONMENT ? 'valid' : 'missing',
        description: 'フロントエンド環境設定'
      },
      {
        name: 'NEXT_PUBLIC_API_URL',
        value: process.env.NEXT_PUBLIC_API_URL || '未設定',
        status: process.env.NEXT_PUBLIC_API_URL ? 'valid' : 'missing',
        description: 'APIベースURL'
      },
      {
        name: 'BACKEND_API_URL',
        value: process.env.BACKEND_API_URL || '未設定',
        status: process.env.BACKEND_API_URL ? 'valid' : 'missing',
        description: 'バックエンドAPI URL'
      },
      
      // Shopify設定（バックエンドから取得）
      {
        name: 'Shopify:ApiKey',
        value: 'バックエンドから取得',
        status: 'unknown',
        description: 'Shopify API Key'
      },
      {
        name: 'Shopify:ApiSecret',
        value: '***',
        status: 'unknown',
        description: 'Shopify API Secret',
        isSecret: true
      },
      {
        name: 'Shopify:Scopes',
        value: 'バックエンドから取得',
        status: 'unknown',
        description: 'Shopify OAuth Scopes'
      },
      {
        name: 'Shopify:EncryptionKey',
        value: '***',
        status: 'unknown',
        description: '暗号化キー',
        isSecret: true
      },
      
      // フロントエンド設定
      {
        name: 'Frontend:BaseUrl',
        value: typeof window !== 'undefined' ? window.location.origin : 'N/A',
        status: 'valid',
        description: 'フロントエンドベースURL'
      },
      {
        name: 'NODE_ENV',
        value: process.env.NODE_ENV || '未設定',
        status: process.env.NODE_ENV ? 'valid' : 'missing',
        description: 'Node.js環境'
      }
    ];

    setConfigItems(items);
    setIsLoading(false);
  };

  const getStatusIcon = (status: ConfigItem['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: ConfigItem['status']) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">✅ 有効</Badge>;
      case 'invalid':
        return <Badge className="bg-red-100 text-red-800">❌ 無効</Badge>;
      case 'missing':
        return <Badge className="bg-yellow-100 text-yellow-800">⚠️ 未設定</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">❓ 不明</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getDisplayValue = (item: ConfigItem) => {
    if (item.isSecret && !showSecrets) {
      return '••••••••••••••••';
    }
    return item.value;
  };

  const validCount = configItems.filter(item => item.status === 'valid').length;
  const missingCount = configItems.filter(item => item.status === 'missing').length;
  const totalCount = configItems.length;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ⚙️ Shopify OAuth設定確認
        </h1>
        <p className="text-gray-600">
          ハイブリッド方式のOAuth認証に必要な設定の確認
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Badge variant="outline">環境変数</Badge>
          <Badge variant="outline">設定検証</Badge>
          <Badge variant="outline">セキュリティ</Badge>
        </div>
      </div>

      {/* 設定統計 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Settings className="h-5 w-5" />
            設定統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{validCount}</div>
              <div className="text-sm text-gray-600">有効な設定</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{missingCount}</div>
              <div className="text-sm text-gray-600">未設定</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
              <div className="text-sm text-gray-600">総設定数</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">設定完了率:</span>
              <span className="text-sm font-bold">
                {Math.round((validCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(validCount / totalCount) * 100}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 環境情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            環境情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">現在の環境:</span>
                <Badge variant="secondary">{config.name}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">API ベースURL:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {config.apiBaseUrl}
                </code>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">フロントエンドURL:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
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

      {/* 設定一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>設定一覧</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSecrets(!showSecrets)}
                className="flex items-center gap-2"
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecrets ? '隠す' : '表示'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeConfig}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </Button>
            </div>
          </div>
          <CardDescription>
            現在の設定状況を確認できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">設定を分析中...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(item.value)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                        {getDisplayValue(item)}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 推奨設定 */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            推奨設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-900 mb-2">フロントエンド環境変数</h4>
              <div className="bg-white p-4 rounded-lg border">
                <pre className="text-sm text-gray-700">
{`# .env.local
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_API_URL=${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}
BACKEND_API_URL=${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`}
                </pre>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-green-900 mb-2">バックエンド設定</h4>
              <div className="bg-white p-4 rounded-lg border">
                <pre className="text-sm text-gray-700">
{`# appsettings.Development.json
{
  "Shopify": {
    "ApiKey": "your-api-key",
    "ApiSecret": "your-api-secret",
    "Scopes": "read_orders,read_products,read_customers",
    "EncryptionKey": "your-32-byte-base64-key"
  },
  "Frontend": {
    "BaseUrl": "${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Alert className="border-orange-200 bg-orange-50">
        <Info className="h-4 w-4 text-orange-700" />
        <AlertDescription className="text-orange-800">
          <strong>注意:</strong> 機密情報（API Secret、暗号化キーなど）は適切に管理してください。
          本番環境では環境変数やAzure Key Vaultを使用して安全に管理することを推奨します。
        </AlertDescription>
      </Alert>

      {/* 関連リンク */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            関連リンク
          </CardTitle>
        </CardHeader>
        <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Button variant="outline" className="flex items-center gap-2">
               <a href="/dev/shopify-backend-test" target="_blank" rel="noopener noreferrer">
                 <Database className="h-4 w-4" />
                 バックエンドAPI テスト
               </a>
             </Button>
             <Button variant="outline" className="flex items-center gap-2">
               <a href="/install" target="_blank" rel="noopener noreferrer">
                 <Store className="h-4 w-4" />
                 インストールページ
               </a>
             </Button>
             <Button variant="outline" className="flex items-center gap-2">
               <a href="/dev-bookmarks" target="_blank" rel="noopener noreferrer">
                 <Settings className="h-4 w-4" />
                 開発ブックマーク
               </a>
             </Button>
             <Button variant="outline" className="flex items-center gap-2">
               <a href="https://shopify.dev/docs/apps/auth/oauth" target="_blank" rel="noopener noreferrer">
                 <ExternalLink className="h-4 w-4" />
                 Shopify OAuth ドキュメント
               </a>
             </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
} 