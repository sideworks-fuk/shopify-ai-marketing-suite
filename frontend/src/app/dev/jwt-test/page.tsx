'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { getTenantId, getStoreId, getTokenInfo } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';

/**
 * JWT デコード機能テストページ
 * 
 * @author YUKI
 * @date 2025-08-02
 * @description JWT デコード機能の動作確認用開発ページ
 */
export default function JWTTestPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [directDecode, setDirectDecode] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refreshStatus = () => {
    setLoading(true);
    
    // AuthClientの状態を取得
    const status = authClient.getAuthStatus();
    setAuthStatus(status);

    // 直接デコード関数をテスト
    const directInfo = getTokenInfo();
    setTokenInfo(directInfo);

    // 個別関数のテスト
    const tenantId = getTenantId();
    const storeId = getStoreId();
    const tenantIdFromClient = authClient.getTenantId();
    const storeIdFromClient = authClient.getStoreId();

    setDirectDecode({
      tenantId,
      storeId,
      tenantIdFromClient,
      storeIdFromClient,
      match: tenantId === tenantIdFromClient && storeId === storeIdFromClient
    });

    setLoading(false);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const authenticate = async () => {
    setLoading(true);
    try {
      await authClient.authenticate(1); // Store ID 1でテスト
      refreshStatus();
    } catch (error) {
      console.error('Authentication failed:', error);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">JWT デコード機能テスト</h1>

      <div className="space-y-6">
        {/* 認証状態 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              認証状態
              {authStatus?.isAuthenticated ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>AuthClientの現在の状態</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">認証済み:</span>
                <Badge variant={authStatus?.isAuthenticated ? 'default' : 'secondary'}>
                  {authStatus?.isAuthenticated ? 'はい' : 'いいえ'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">アクセストークン:</span>
                <Badge variant={authStatus?.hasAccessToken ? 'default' : 'secondary'}>
                  {authStatus?.hasAccessToken ? '存在' : 'なし'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">リフレッシュトークン:</span>
                <Badge variant={authStatus?.hasRefreshToken ? 'default' : 'secondary'}>
                  {authStatus?.hasRefreshToken ? '存在' : 'なし'}
                </Badge>
              </div>
            </div>

            {!authStatus?.isAuthenticated && (
              <Button onClick={authenticate} className="mt-4" disabled={loading}>
                認証する
              </Button>
            )}
          </CardContent>
        </Card>

        {/* JWTトークン情報 */}
        {authStatus?.tokenInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                JWTトークン情報
                <Info className="w-5 h-5 text-blue-500" />
              </CardTitle>
              <CardDescription>デコードされたJWTペイロード</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 mb-1">Tenant ID</div>
                  <div className="font-mono text-lg">{authStatus.tokenInfo.tenant_id || 'N/A'}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 mb-1">Store ID</div>
                  <div className="font-mono text-lg">{authStatus.tokenInfo.store_id || 'N/A'}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 mb-1">有効期限</div>
                  <div className="font-mono">
                    {authStatus.tokenInfo.expiresAt 
                      ? new Date(authStatus.tokenInfo.expiresAt).toLocaleString('ja-JP')
                      : 'N/A'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">トークン有効性:</span>
                  <Badge variant={authStatus.tokenInfo.isValid ? 'default' : 'destructive'}>
                    {authStatus.tokenInfo.isValid ? '有効' : '無効'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* デコード関数の比較テスト */}
        <Card>
          <CardHeader>
            <CardTitle>デコード関数テスト結果</CardTitle>
            <CardDescription>各デコード関数の動作確認</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>getTokenInfo()関数の結果:</strong>
                  <pre className="mt-2 text-xs">{JSON.stringify(tokenInfo, null, 2)}</pre>
                </AlertDescription>
              </Alert>

              {directDecode && (
                <Alert variant={directDecode.match ? 'default' : 'destructive'}>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>関数比較テスト:</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      <div>getTenantId(): <code>{directDecode.tenantId || 'null'}</code></div>
                      <div>getStoreId(): <code>{directDecode.storeId || 'null'}</code></div>
                      <div>authClient.getTenantId(): <code>{directDecode.tenantIdFromClient || 'null'}</code></div>
                      <div>authClient.getStoreId(): <code>{directDecode.storeIdFromClient || 'null'}</code></div>
                      <div className="mt-2 font-medium">
                        結果: {directDecode.match ? '✅ 一致' : '❌ 不一致'}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 更新ボタン */}
        <div className="flex justify-end">
          <Button onClick={refreshStatus} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            状態を更新
          </Button>
        </div>
      </div>
    </div>
  );
}