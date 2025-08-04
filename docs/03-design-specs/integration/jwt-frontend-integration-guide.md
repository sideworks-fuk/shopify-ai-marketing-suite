# JWT Frontend Integration Guide

## 概要
このガイドは、フロントエンドでJWT認証を実装するための手順を説明します。

## 1. API Client更新

### `/frontend/src/lib/api-client.ts`の更新

```typescript
import { getApiBaseUrl } from './api-config';

class ApiClient {
  private static instance: ApiClient;
  private token: string | null = null;
  private refreshToken: string | null = null;
  
  private constructor() {
    // トークンをlocalStorageから読み込み
    this.token = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }
  
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  
  // トークンを保存
  setTokens(accessToken: string, refreshToken: string) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }
  
  // トークンをクリア
  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
  
  // APIリクエスト共通処理
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${getApiBaseUrl()}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // トークンがある場合は追加
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      // 401エラーの場合はトークンをリフレッシュ
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // リトライ
          headers['Authorization'] = `Bearer ${this.token}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        } else {
          // リフレッシュ失敗 - ログイン画面へ
          this.handleAuthError();
        }
      }
      
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }
  
  // レスポンス処理
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
  
  // トークンリフレッシュ
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: this.token,
          refreshToken: this.refreshToken,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    
    return false;
  }
  
  // 認証エラー処理
  private handleAuthError() {
    this.clearTokens();
    // TODO: ログイン画面へリダイレクト
    window.location.href = '/login';
  }
  
  // 便利メソッド
  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export default ApiClient.getInstance();
```

## 2. 認証フック作成

### `/frontend/src/hooks/useAuth.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useStore } from '@/lib/store-context';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  
  const { currentStore } = useStore();
  
  // トークン検証
  const validateToken = useCallback(async () => {
    try {
      const response = await apiClient.post('/api/auth/validate');
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication failed',
      });
    }
  }, []);
  
  // ログイン
  const login = useCallback(async (storeId: number, shopDomain: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/token', {
        storeId,
        shopDomain,
      });
      
      apiClient.setTokens(response.accessToken, response.refreshToken);
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      return true;
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  }, []);
  
  // ログアウト
  const logout = useCallback(() => {
    apiClient.clearTokens();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);
  
  useEffect(() => {
    // 初回マウント時にトークンを検証
    validateToken();
  }, [validateToken]);
  
  return {
    ...authState,
    login,
    logout,
    validateToken,
  };
}
```

## 3. API呼び出しの更新例

### 既存のAPI呼び出しを更新

```typescript
// Before
const response = await fetch(`${API_BASE_URL}/api/customer/dormant?storeId=${storeId}`);

// After
import apiClient from '@/lib/api-client';

const response = await apiClient.get<DormantCustomerResponse>(
  `/api/customer/dormant?storeId=${storeId}`
);
```

## 4. 認証が必要なページの保護

### `/frontend/src/components/auth/ProtectedRoute.tsx`

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}
```

## 5. 開発環境での一時的な対応

開発環境では、認証を一時的に無効化することができます：

```typescript
// /frontend/src/lib/api-client.ts に追加
const isDevelopment = process.env.NODE_ENV === 'development';
const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

if (isDevelopment && bypassAuth) {
  console.warn('⚠️ Authentication is bypassed in development mode');
}
```

## 6. エラーハンドリング

```typescript
// API呼び出し時のエラーハンドリング
try {
  const data = await apiClient.get('/api/customer/dormant');
  // 成功処理
} catch (error) {
  if (error.message.includes('401')) {
    // 認証エラー - 自動的にログイン画面へリダイレクトされる
  } else if (error.message.includes('403')) {
    // 権限エラー
    console.error('Access denied');
  } else {
    // その他のエラー
    console.error('API Error:', error);
  }
}
```

## 7. テスト用トークン取得

開発環境でのテスト用：

```bash
# トークン取得
curl -X POST http://localhost:7088/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"storeId": 1, "shopDomain": "fuk-dev1.myshopify.com"}'

# APIアクセステスト
curl -X GET http://localhost:7088/api/customer/dormant?storeId=1 \
  -H "Authorization: Bearer {access_token}"
```

## 注意事項

1. **トークンの保存場所**: localStorageは簡便ですが、XSS攻撃に脆弱です。本番環境ではhttpOnlyクッキーの使用を検討してください。

2. **トークンの有効期限**: 現在は1時間に設定されています。必要に応じて調整してください。

3. **リフレッシュトークン**: 7日間有効です。定期的な更新が必要です。

4. **HTTPS必須**: 本番環境では必ずHTTPSを使用してください。

## 次のステップ

1. ログイン画面の実装
2. Shopify OAuth統合
3. セッション管理の強化
4. エラー画面の改善