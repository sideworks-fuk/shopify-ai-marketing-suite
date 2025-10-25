# グローバル認証ガード仕様書

**作成日**: 2025-10-23  
**作成者**: 福田 + AI Assistant  
**対象**: フロントエンドアプリケーション全体

## 1. 概要

### 1.1 目的
認証エラー時に、個別画面ではなくアプリケーション全体で適切に制御し、ユーザーに明確なアクションを促す。

### 1.2 現状の問題
- 認証エラーが発生しても、メニューやナビゲーションは表示される
- 各画面で個別にエラーハンドリングが必要
- ユーザーが「どの画面も使えない」状況で混乱する
- 認証が必要なことが分かりにくい

### 1.3 改善後の動作
- 認証エラー時は、アプリケーション全体で認証画面を表示
- メニューやナビゲーションを非表示
- 明確な「Shopify認証」アクションを提示
- 認証成功後、元の画面に自動復帰

## 2. アーキテクチャ設計

### 2.1 現在の構造

```
RootLayout (app/layout.tsx)
  └── AuthProvider ← 認証状態を管理
      └── StoreProvider
          └── SubscriptionProvider
              └── ZustandProvider
                  └── FilterProvider
                      └── ConditionalLayout ← レイアウト分岐
                          ├── MainLayout (通常モード)
                          │   ├── Sidebar
                          │   ├── Header
                          │   └── {children}
                          ├── EmbeddedAppLayout (Shopify埋め込み)
                          └── {children} (レイアウトなし)
```

### 2.2 改善後の構造

```
RootLayout (app/layout.tsx)
  └── AuthProvider ← 認証状態を管理
      └── AuthGuard ← 🆕 認証ガード（グローバル）
          └── StoreProvider
              └── SubscriptionProvider
                  └── ZustandProvider
                      └── FilterProvider
                          └── ConditionalLayout
                              ├── MainLayout (認証済み)
                              ├── EmbeddedAppLayout (認証済み)
                              └── {children}
```

## 3. 詳細設計

### 3.1 AuthGuard コンポーネント

```tsx
// frontend/src/components/auth/AuthGuard.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { AuthenticationRequired } from '@/components/errors/AuthenticationRequired';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * グローバル認証ガード
 * 
 * 認証が必要なページで、未認証の場合は認証画面を表示
 * 認証エラー時は、アプリケーション全体で認証を要求
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isInitializing, authError, clearError } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showAuthRequired, setShowAuthRequired] = useState(false);

  // 認証不要なパス（公開ページ）
  const publicPaths = [
    '/',                    // ランディングページ
    '/install',             // インストールページ
    '/auth/login',          // ログインページ
    '/auth/callback',       // OAuth コールバック
    '/auth/success',        // 認証成功ページ
    '/auth/error',          // 認証エラーページ
    '/terms',               // 利用規約
    '/privacy',             // プライバシーポリシー
  ];

  // 現在のパスが公開ページかチェック
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

  useEffect(() => {
    // 公開ページの場合は認証チェックをスキップ
    if (isPublicPath) {
      setShowAuthRequired(false);
      return;
    }

    // 初期化中は何もしない
    if (isInitializing) {
      return;
    }

    // 認証エラーまたは未認証の場合
    if (authError || !isAuthenticated) {
      console.warn('⚠️ 認証が必要です:', { authError, isAuthenticated, pathname });
      setShowAuthRequired(true);
    } else {
      setShowAuthRequired(false);
    }
  }, [isAuthenticated, isInitializing, authError, pathname, isPublicPath]);

  // 初期化中はローディング表示
  if (isInitializing && !isPublicPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner message="アプリケーションを初期化中..." />
      </div>
    );
  }

  // 認証が必要な場合は認証画面を表示
  if (showAuthRequired && !isPublicPath) {
    return (
      <AuthenticationRequired
        message={authError || 'この機能を使用するには、Shopify認証が必要です。'}
        onRetry={() => {
          clearError();
          setShowAuthRequired(false);
          // ページをリロードして再認証を試みる
          window.location.reload();
        }}
        customAction={
          process.env.NODE_ENV === 'development' ? (
            <div className="text-center text-sm text-muted-foreground">
              <p>開発環境: 認証をバイパスする場合は、</p>
              <p>バックエンドの <code>UseAuthentication()</code> をコメントアウトしてください</p>
            </div>
          ) : undefined
        }
      />
    );
  }

  // 認証済みまたは公開ページの場合は通常表示
  return <>{children}</>;
}
```

### 3.2 AuthProvider の拡張

```typescript
// frontend/src/components/providers/AuthProvider.tsx (拡張版)

"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { migrateLocalStorageVariables } from '@/lib/localstorage-migration'

interface AuthContextType {
  isAuthenticated: boolean
  isInitializing: boolean
  currentStoreId: number | null
  authError: string | null
  login: (storeId: number) => Promise<void>
  logout: () => void
  clearError: () => void
  // 🆕 認証状態を強制的に更新
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentStoreId, setCurrentStoreId] = useState<number | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // 認証初期化ロジック
  const initializeAuth = async () => {
    console.log('🚀 認証の初期化を開始...')
    
    try {
      setIsInitializing(true)
      setAuthError(null)

      // LocalStorage変数のマイグレーションを実行
      migrateLocalStorageVariables()

      // Phase 2: currentStoreIdのみを使用
      const savedStoreId = localStorage.getItem('currentStoreId')
      const storeId = savedStoreId ? parseInt(savedStoreId, 10) : 1

      console.log('🏪 Store ID:', storeId)
      setCurrentStoreId(storeId)

      // 既存のトークンの確認
      if (authClient.isAuthenticated()) {
        console.log('✅ 既存のトークンが見つかりました')
        setIsAuthenticated(true)
        return
      }

      // 自動認証を実行
      console.log('🔐 自動認証を実行中...')
      await authClient.authenticate(storeId)
      
      setIsAuthenticated(true)
      console.log('✅ 自動認証が成功しました')

    } catch (error: any) {
      console.error('❌ 認証の初期化に失敗:', error)
      
      // エラーメッセージを設定
      if (error.statusCode === 401) {
        setAuthError('Shopify認証が必要です')
      } else if (error.message?.includes('Network')) {
        setAuthError('ネットワーク接続を確認してください')
      } else {
        setAuthError(error.message || '認証に失敗しました')
      }
      
      setIsAuthenticated(false)
      
    } finally {
      setIsInitializing(false)
    }
  }

  // アプリ起動時の自動認証
  useEffect(() => {
    initializeAuth()
  }, [])

  const login = async (storeId: number) => {
    try {
      setAuthError(null)
      console.log('🔐 ログイン開始:', storeId)
      
      await authClient.authenticate(storeId)
      
      setIsAuthenticated(true)
      setCurrentStoreId(storeId)
      
      // LocalStorageにstoreIdを保存
      localStorage.setItem('currentStoreId', storeId.toString())
      
      console.log('✅ ログイン成功')
      
    } catch (error: any) {
      console.error('❌ ログインエラー:', error)
      setAuthError(error.message || 'ログインに失敗しました')
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 ログアウト実行')
    
    authClient.clearTokens()
    setIsAuthenticated(false)
    setCurrentStoreId(null)
    setAuthError(null)
    
    console.log('✅ ログアウト完了')
  }

  const clearError = () => {
    setAuthError(null)
  }

  // 🆕 認証状態を強制的に更新
  const refreshAuth = async () => {
    await initializeAuth()
  }

  const value: AuthContextType = {
    isAuthenticated,
    isInitializing,
    currentStoreId,
    authError,
    login,
    logout,
    clearError,
    refreshAuth, // 🆕
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

### 3.3 RootLayout の更新

```tsx
// frontend/src/app/layout.tsx (更新版)

import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { AuthGuard } from "@/components/auth/AuthGuard" // 🆕
import { StoreProvider } from "@/contexts/StoreContext"
import { SubscriptionProvider } from "@/contexts/SubscriptionContext"
import { ZustandProvider } from "@/components/providers/ZustandProvider"
import { FilterProvider } from "@/contexts/FilterContext"
import ConditionalLayout from "@/components/layout/ConditionalLayout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Shopify AI Marketing Suite",
  description: "Shopifyストアの売上分析・顧客分析を支援するAIマーケティングツール",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <AuthGuard> {/* 🆕 認証ガードを追加 */}
            <StoreProvider>
              <SubscriptionProvider>
                <ZustandProvider>
                  <FilterProvider>
                    <ConditionalLayout>
                      {children}
                    </ConditionalLayout>
                  </FilterProvider>
                </ZustandProvider>
              </SubscriptionProvider>
            </StoreProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 3.4 API エラーハンドリングの統一

```typescript
// frontend/src/lib/api-client.ts (改善版)

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // ... 既存のコード ...

    try {
      const response = await authClient.request(url, defaultOptions);
      
      // 401エラーの場合は認証エラーをスロー
      if (response.status === 401) {
        console.error('❌ 認証エラー: 401 Unauthorized');
        
        // AuthProviderに認証エラーを通知
        window.dispatchEvent(new CustomEvent('auth:error', {
          detail: {
            statusCode: 401,
            message: 'Shopify認証が必要です'
          }
        }));
        
        throw new ApiError(
          'Shopify認証が必要です。認証ページにリダイレクトします。',
          401,
          response
        );
      }

      // ... 既存のコード ...
      
    } catch (error) {
      // ... 既存のエラーハンドリング ...
    }
  }
}
```

### 3.5 AuthProvider でのグローバルエラー監視

```typescript
// frontend/src/components/providers/AuthProvider.tsx (追加)

export function AuthProvider({ children }: AuthProviderProps) {
  // ... 既存のコード ...

  // 🆕 グローバルな認証エラーを監視
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      console.error('🔴 グローバル認証エラー:', event.detail);
      setAuthError(event.detail.message || 'Shopify認証が必要です');
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:error', handleAuthError as EventListener);

    return () => {
      window.removeEventListener('auth:error', handleAuthError as EventListener);
    };
  }, []);

  // ... 既存のコード ...
}
```

## 4. 画面別の動作

### 4.1 認証不要ページ（公開ページ）
以下のページは認証なしでアクセス可能：
- `/` - ランディングページ
- `/install` - インストールページ
- `/auth/*` - 認証関連ページ
- `/terms` - 利用規約
- `/privacy` - プライバシーポリシー

**動作**:
- AuthGuard はスキップ
- 通常通り表示

### 4.2 認証必要ページ（保護されたページ）
上記以外のすべてのページ：
- `/dashboard` - ダッシュボード
- `/customers/*` - 顧客分析
- `/sales/*` - 売上分析
- `/products/*` - 商品分析
- etc.

**動作**:
- 認証済み → 通常表示（メニュー、ヘッダー含む）
- 未認証 → 認証画面を全画面表示（メニュー、ヘッダーなし）

## 5. ユーザー体験フロー

### 5.1 初回アクセス（未認証）

```
1. ユーザーがアプリにアクセス
   ↓
2. AuthProvider が認証状態を確認
   ↓
3. 未認証を検出
   ↓
4. AuthGuard が認証画面を表示
   ├── メニュー: 非表示
   ├── ヘッダー: 非表示
   └── 認証画面: 全画面表示
       ├── エラーメッセージ
       ├── 「Shopifyで認証する」ボタン
       └── 開発環境用のヒント
   ↓
5. ユーザーが「Shopifyで認証する」をクリック
   ↓
6. Shopify OAuth フローへ
   ↓
7. 認証成功後、元のページに戻る
   ↓
8. 通常のアプリ画面を表示
   ├── メニュー: 表示
   ├── ヘッダー: 表示
   └── コンテンツ: 表示
```

### 5.2 認証済みユーザーのアクセス

```
1. ユーザーがアプリにアクセス
   ↓
2. AuthProvider が認証状態を確認
   ↓
3. 既存のトークンを検出
   ↓
4. AuthGuard が認証OKと判定
   ↓
5. 通常のアプリ画面を表示
   ├── メニュー: 表示
   ├── ヘッダー: 表示
   └── コンテンツ: 表示
```

### 5.3 セッション中に認証エラーが発生

```
1. ユーザーが画面を操作中
   ↓
2. API呼び出しで 401 エラー
   ↓
3. api-client が 'auth:error' イベントを発火
   ↓
4. AuthProvider がイベントをキャッチ
   ↓
5. authError を設定、isAuthenticated を false に
   ↓
6. AuthGuard が再レンダリング
   ↓
7. 認証画面を全画面表示
   ├── メニュー: 非表示に切り替え
   ├── ヘッダー: 非表示に切り替え
   └── 認証画面: 表示
   ↓
8. ユーザーが再認証
   ↓
9. 元の画面に復帰
```

## 6. 実装手順

### Phase 1: 基盤実装（優先度: 最高）
1. ✅ `AuthGuard` コンポーネントの作成
2. ✅ `AuthProvider` の拡張（`refreshAuth`, グローバルエラー監視）
3. ✅ `api-client.ts` の更新（401エラー時のイベント発火）
4. ✅ `RootLayout` への `AuthGuard` 統合

### Phase 2: テスト・調整（優先度: 高）
1. 未認証状態でのアクセステスト
2. 認証済み状態でのアクセステスト
3. セッション中の認証エラーテスト
4. 公開ページのアクセステスト

### Phase 3: 個別画面の簡素化（優先度: 中）
1. 各画面から個別のエラーハンドリングを削除
2. グローバルな認証ガードに統一

## 7. デモ対応

### 7.1 本番実装（推奨）
上記の実装を完了させる（約2-3時間）

### 7.2 一時的な対策（デモまで時間がない場合）

#### オプション1: バックエンドの認証を無効化
```csharp
// backend/ShopifyAnalyticsApi/Program.cs
// デモ用: 認証を一時的にコメントアウト
// app.UseAuthentication();
```

#### オプション2: フロントエンドで認証エラーを無視
```typescript
// frontend/src/components/auth/AuthGuard.tsx
// デモ用: 認証ガードを一時的に無効化
export function AuthGuard({ children }: AuthGuardProps) {
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH_GUARD === 'true') {
    return <>{children}</>;
  }
  // ... 通常のロジック
}
```

環境変数:
```env
# .env.local (デモ用)
NEXT_PUBLIC_DISABLE_AUTH_GUARD=true
```

## 8. メリット

### 8.1 ユーザー体験
- ✅ 認証が必要なことが明確
- ✅ 使えない画面を見せない
- ✅ 次のアクションが明確
- ✅ 混乱を防ぐ

### 8.2 開発効率
- ✅ 各画面で個別のエラーハンドリング不要
- ✅ 認証ロジックの一元管理
- ✅ コードの重複削減
- ✅ 保守性の向上

### 8.3 セキュリティ
- ✅ 認証なしでの画面アクセスを防ぐ
- ✅ 一貫した認証チェック
- ✅ セキュリティホールの削減

## 9. 注意事項

### 9.1 パフォーマンス
- AuthGuard は全ページで実行されるため、軽量に保つ
- 不要な再レンダリングを避ける
- useEffect の依存配列を適切に管理

### 9.2 開発体験
- 開発環境では認証バイパスオプションを提供
- デバッグ情報を表示
- エラーメッセージを分かりやすく

### 9.3 Shopify 埋め込みモード
- 埋め込みモードでは異なる認証フローを使用
- `isEmbedded` フラグで分岐
- Shopify App Bridge の認証を優先

## 10. 関連ドキュメント

- `docs/03-design-specs/01-frontend/authentication-error-handling.md` - 個別画面のエラーハンドリング
- `docs/03-design-specs/05-integration/oauth-multitenancy.md` - OAuth認証設計
- `docs/03-design-specs/08-security/jwt-authentication-guide.md` - JWT認証ガイド

## 11. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025-10-23 | 福田 + AI | 初版作成 |

