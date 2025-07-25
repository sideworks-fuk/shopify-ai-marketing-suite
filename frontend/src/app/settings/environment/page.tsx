'use client';

import { useEnvironment } from '@/hooks/useEnvironment';
import EnvironmentSelector from '@/components/common/EnvironmentSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Globe, Settings, Database, Wrench } from 'lucide-react';

export default function EnvironmentSettingsPage() {
  const { 
    currentEnvironment, 
    environmentName, 
    apiBaseUrl, 
    isProduction, 
    description,
    availableEnvironments,
    isLoading 
  } = useEnvironment();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center gap-3">
        <Globe className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">環境設定</h1>
          <p className="text-muted-foreground">
            API接続先の環境を管理します
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 現在の環境情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              現在の環境
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">環境名:</span>
                <Badge 
                  variant={isProduction ? "destructive" : "secondary"}
                >
                  {environmentName}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <span className="font-medium">API URL:</span>
                <div className="text-sm text-muted-foreground break-all">
                  {apiBaseUrl}
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="font-medium">説明:</span>
                <div className="text-sm text-muted-foreground">
                  {description}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">本番環境:</span>
                <Badge variant={isProduction ? "destructive" : "outline"}>
                  {isProduction ? "はい" : "いいえ"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 環境切り替え */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              環境切り替え
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnvironmentSelector showDetails={true} />
          </CardContent>
        </Card>
      </div>

      {/* ビルド時環境変数情報 */}
      <Card>
        <CardHeader>
                      <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              ビルド時環境変数
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">NEXT_PUBLIC_BUILD_ENVIRONMENT:</span>
                <div className="text-sm text-muted-foreground">
                  {process.env.NEXT_PUBLIC_BUILD_ENVIRONMENT || '未設定'}
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">NEXT_PUBLIC_DEPLOY_ENVIRONMENT:</span>
                <div className="text-sm text-muted-foreground">
                  {process.env.NEXT_PUBLIC_DEPLOY_ENVIRONMENT || '未設定'}
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">NEXT_PUBLIC_APP_ENVIRONMENT:</span>
                <div className="text-sm text-muted-foreground">
                  {process.env.NEXT_PUBLIC_APP_ENVIRONMENT || '未設定'}
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">NODE_ENV:</span>
                <div className="text-sm text-muted-foreground">
                  {process.env.NODE_ENV || '未設定'}
                </div>
              </div>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                ビルド時の環境変数は、デプロイ時に設定され、アプリケーションの動作環境を決定します。
                これらの値はビルド時に固定され、実行時に変更することはできません。
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* 利用可能な環境一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>利用可能な環境</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableEnvironments.map((env) => (
              <div
                key={env.name}
                className={`p-4 rounded-lg border ${
                  currentEnvironment === env.name 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{env.name}</h3>
                  {currentEnvironment === env.name && (
                    <Badge variant="secondary" className="text-xs">
                      現在
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {env.description}
                </p>
                <div className="text-xs text-muted-foreground break-all">
                  {env.apiBaseUrl}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>環境切り替えについて:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>環境を切り替えると、ページがリロードされます</li>
              <li>本番環境では環境切り替え機能は無効化されます</li>
              <li>各環境のAPIエンドポイントは同じ構造になっています</li>
              <li>開発時は適切な環境を選択してテストしてください</li>
              <li>ビルド時の環境変数は、デプロイ時に設定する必要があります</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
} 