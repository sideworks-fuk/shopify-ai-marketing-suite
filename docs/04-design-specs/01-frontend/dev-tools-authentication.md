# 開発者ツールページ 簡易認証仕様書

**作成日**: 2025-10-23  
**作成者**: 福田 + AI Assistant  
**対象**: `/dev-bookmarks` ページ

## 1. 概要

### 1.1 目的
開発・デモ用の開発者ツールページに簡易認証を追加し、Shopify認証なしでも既存データの閲覧を可能にする。

### 1.2 ユースケース
- **デモ実施時**: Shopify認証をスキップして、取得済みデータを閲覧
- **開発時**: ストア切り替えや各種テストツールへのクイックアクセス
- **トラブルシューティング**: 認証問題を切り分けて調査

### 1.3 制約
- **データ同期には Shopify 認証が必要**（変更なし）
- **本番環境では完全に非表示**
- **開発・ステージング環境のみ有効**

## 2. 要件

### 2.1 機能要件

#### FR-1: 簡易パスワード認証
- 固定パスワードによる認証
- セッション管理（ブラウザを閉じるまで有効）
- 認証状態の永続化（localStorage）

#### FR-2: 開発者モード
- 認証後は「開発者モード」として動作
- Shopify OAuth をスキップ
- 既存データの閲覧のみ可能
- データ同期機能は無効化（明示的に表示）

#### FR-3: ストア切り替え
- 複数のテストストアを簡単に切り替え
- 現在のストア情報を表示
- ストアごとのデータを閲覧

#### FR-4: 環境制限
- 本番環境では `/dev-bookmarks` ページ自体を404
- 開発・ステージング環境のみアクセス可能

### 2.2 非機能要件

#### NFR-1: セキュリティ
- パスワードは環境変数で管理
- 本番環境では完全に無効化
- セッションタイムアウト（8時間）

#### NFR-2: ユーザビリティ
- シンプルな認証UI
- 認証後は通常通り操作可能
- 開発者モードであることを明示

## 3. 設計

### 3.1 アーキテクチャ

```
/dev-bookmarks にアクセス
  ↓
環境チェック（本番？）
  ├─ 本番 → 404 Not Found
  └─ 開発/ステージング → 認証チェック
      ├─ 認証済み → 開発者ツールページ表示
      └─ 未認証 → 簡易認証画面表示
          ↓
      パスワード入力
          ↓
      認証成功 → 開発者モード有効化
          ├─ localStorage に保存
          ├─ AuthGuard をバイパス
          └─ 開発者ツールページ表示
```

### 3.2 開発者モードコンテキスト

```typescript
// frontend/src/contexts/DeveloperModeContext.tsx

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function useDeveloperMode() {
  const context = useContext(DeveloperModeContext);
  if (context === undefined) {
    throw new Error('useDeveloperMode must be used within a DeveloperModeProvider');
  }
  return context;
}

interface DeveloperModeProviderProps {
  children: React.ReactNode;
}

const DEV_MODE_STORAGE_KEY = 'dev_mode_auth';
const DEV_MODE_TIMESTAMP_KEY = 'dev_mode_timestamp';
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8時間

export function DeveloperModeProvider({ children }: DeveloperModeProviderProps) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初期化時にセッションをチェック
  useEffect(() => {
    const checkSession = () => {
      const auth = localStorage.getItem(DEV_MODE_STORAGE_KEY);
      const timestamp = localStorage.getItem(DEV_MODE_TIMESTAMP_KEY);

      if (auth === 'true' && timestamp) {
        const elapsed = Date.now() - parseInt(timestamp, 10);
        if (elapsed < SESSION_TIMEOUT) {
          setIsDeveloperMode(true);
          setIsAuthenticated(true);
          console.log('✅ 開発者モード: セッション復元');
        } else {
          // セッションタイムアウト
          logout();
          console.log('⏱️ 開発者モード: セッションタイムアウト');
        }
      }
    };

    checkSession();
  }, []);

  const login = async (password: string): Promise<boolean> => {
    // 環境変数からパスワードを取得
    const correctPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD || 'dev2025';

    if (password === correctPassword) {
      setIsDeveloperMode(true);
      setIsAuthenticated(true);
      localStorage.setItem(DEV_MODE_STORAGE_KEY, 'true');
      localStorage.setItem(DEV_MODE_TIMESTAMP_KEY, Date.now().toString());
      console.log('✅ 開発者モード: ログイン成功');
      return true;
    } else {
      console.error('❌ 開発者モード: パスワードが正しくありません');
      return false;
    }
  };

  const logout = () => {
    setIsDeveloperMode(false);
    setIsAuthenticated(false);
    localStorage.removeItem(DEV_MODE_STORAGE_KEY);
    localStorage.removeItem(DEV_MODE_TIMESTAMP_KEY);
    console.log('🚪 開発者モード: ログアウト');
  };

  const value: DeveloperModeContextType = {
    isDeveloperMode,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <DeveloperModeContext.Provider value={value}>
      {children}
    </DeveloperModeContext.Provider>
  );
}
```

### 3.3 簡易認証画面

```tsx
// frontend/src/components/dev/DevPasswordPrompt.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useDeveloperMode } from '@/contexts/DeveloperModeContext';

export function DevPasswordPrompt() {
  const { login } = useDeveloperMode();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(password);
      if (!success) {
        setError('パスワードが正しくありません');
        setPassword('');
      }
    } catch (err) {
      setError('認証エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">開発者ツール</CardTitle>
              <CardDescription className="mt-1">
                開発者用パスワードを入力してください
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              このページは開発・テスト用です。<br />
              Shopify認証をスキップして、既存データを閲覧できます。
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                パスワード
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="開発者用パスワード"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !password}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          {process.env.NODE_ENV === 'development' && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                開発環境: デフォルトパスワードは <code className="bg-muted px-1 py-0.5 rounded">dev2025</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.4 開発者ツールページの更新

```tsx
// frontend/src/app/dev-bookmarks/page.tsx (更新版)

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DevPasswordPrompt } from '@/components/dev/DevPasswordPrompt'
import { useDeveloperMode } from '@/contexts/DeveloperModeContext'
import { Shield, AlertTriangle, LogOut } from 'lucide-react'
// ... 既存のインポート

export default function DevBookmarksPage() {
  const { isDeveloperMode, isAuthenticated, logout } = useDeveloperMode()
  const { currentStore, availableStores } = useStore()
  // ... 既存のstate

  // 本番環境では404
  if (process.env.NODE_ENV === 'production' && 
      !process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>404 - ページが見つかりません</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              お探しのページは存在しません。
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 未認証の場合はパスワードプロンプトを表示
  if (!isAuthenticated) {
    return <DevPasswordPrompt />
  }

  return (
    <div className="space-y-6">
      {/* 開発者モード警告バナー */}
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">開発者モード</AlertTitle>
        <AlertDescription className="text-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p>Shopify認証をスキップして、既存データを閲覧しています。</p>
              <p className="text-sm mt-1">
                ⚠️ データ同期機能は無効化されています。
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="ml-4"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔖 開発用ブックマーク
        </h1>
        <p className="text-gray-600">
          各機能への直接アクセス用ページ
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Badge variant="outline">開発効率向上</Badge>
          <Badge variant="outline">クイックアクセス</Badge>
          <Badge variant="outline">機能確認</Badge>
          <Badge variant="default" className="bg-blue-600">開発者モード</Badge>
        </div>
      </div>

      {/* 既存のコンテンツ */}
      {/* ... */}
    </div>
  )
}
```

### 3.5 AuthGuard の更新（開発者モード対応）

```typescript
// frontend/src/components/auth/AuthGuard.tsx (更新)

import { useDeveloperMode } from '@/contexts/DeveloperModeContext';

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isInitializing, authError, clearError } = useAuth();
  const { isDeveloperMode } = useDeveloperMode(); // 🆕 追加
  const pathname = usePathname();

  // ... 既存のコード

  // 🆕 開発者モードの場合は認証をスキップ
  if (isDeveloperMode) {
    console.log('🔓 開発者モード: 認証をスキップ');
    return <>{children}</>;
  }

  // 認証が必要な場合は認証画面を表示
  if (showAuthRequired && !isPublicPath) {
    return <AuthenticationRequired ... />;
  }

  return <>{children}</>;
}
```

### 3.6 RootLayout の更新

```tsx
// frontend/src/app/layout.tsx (更新)

import { DeveloperModeProvider } from "@/contexts/DeveloperModeContext" // 🆕

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <DeveloperModeProvider> {/* 🆕 追加 */}
          <AuthProvider>
            <AuthGuard>
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
        </DeveloperModeProvider>
      </body>
    </html>
  )
}
```

## 4. 環境変数

### 4.1 フロントエンド

```env
# .env.local (開発環境)
NEXT_PUBLIC_DEV_PASSWORD=dev2025
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true

# .env.production (本番環境)
# NEXT_PUBLIC_ENABLE_DEV_TOOLS は設定しない（デフォルトで無効）
```

### 4.2 GitHub Actions（デプロイ時）

```yaml
# .github/workflows/develop_frontend.yml

env:
  NEXT_PUBLIC_DEV_PASSWORD: ${{ secrets.DEV_PASSWORD }}
  NEXT_PUBLIC_ENABLE_DEV_TOOLS: 'true'
```

## 5. セキュリティ考慮事項

### 5.1 本番環境での無効化
- `NEXT_PUBLIC_ENABLE_DEV_TOOLS` が設定されていない場合は404
- ビルド時に開発者ツール関連コードを除外（オプション）

### 5.2 パスワード管理
- パスワードは環境変数で管理
- ハードコードしない
- 定期的に変更

### 5.3 セッション管理
- 8時間でタイムアウト
- ブラウザを閉じると無効化（sessionStorage オプション）
- ログアウト機能を提供

### 5.4 データ保護
- 開発者モードでは閲覧のみ
- データ同期・更新機能は無効化
- 機密情報の表示に注意

## 6. 実装手順

### Phase 1: 基盤実装
1. ✅ `DeveloperModeContext` の作成
2. ✅ `DevPasswordPrompt` コンポーネントの作成
3. ✅ `RootLayout` への統合

### Phase 2: 既存ページの更新
1. ✅ `dev-bookmarks/page.tsx` の更新
2. ✅ `AuthGuard` の更新（開発者モード対応）

### Phase 3: テスト
1. 開発環境でのパスワード認証テスト
2. セッション管理のテスト
3. 本番環境での無効化テスト

## 7. 使用方法

### 7.1 開発者向け

#### ログイン
1. `/dev-bookmarks` にアクセス
2. パスワードを入力（デフォルト: `dev2025`）
3. 開発者モードで各機能にアクセス

#### ログアウト
- 画面上部の「ログアウト」ボタンをクリック
- または、8時間経過で自動ログアウト

### 7.2 デモ実施時

```
1. デモ開始前に `/dev-bookmarks` にログイン
   ↓
2. 開発者モードが有効化される
   ↓
3. Shopify認証なしで各画面にアクセス可能
   ├── 既存データの閲覧: ✅ 可能
   ├── データ同期: ❌ 無効（明示的に表示）
   └── ストア切り替え: ✅ 可能
   ↓
4. デモ終了後、ログアウト
```

## 8. メリット

### 8.1 デモ対応
- ✅ Shopify認証をスキップできる
- ✅ 既存データをすぐに表示できる
- ✅ 認証エラーを気にせずデモ実施

### 8.2 開発効率
- ✅ ストア切り替えが簡単
- ✅ 各機能へのクイックアクセス
- ✅ 認証問題の切り分けが容易

### 8.3 セキュリティ
- ✅ 本番環境では完全に無効化
- ✅ パスワード保護
- ✅ セッションタイムアウト

## 9. 制限事項

### 9.1 機能制限
- データ同期機能は使用不可
- Shopify API への直接アクセスは不可
- 既存データの閲覧のみ

### 9.2 セキュリティ制限
- 簡易認証のため、本格的なセキュリティは保証されない
- 開発・テスト環境のみでの使用を推奨
- 機密情報の取り扱いに注意

## 10. 今後の改善

- 複数ユーザーのサポート（ユーザー名 + パスワード）
- より強固な認証方式（JWT、OAuth等）
- 監査ログの記録
- アクセス権限の細分化

## 11. 関連ドキュメント

- `docs/03-design-specs/01-frontend/global-authentication-guard.md` - グローバル認証ガード
- `docs/03-design-specs/01-frontend/authentication-error-handling.md` - エラーハンドリング

## 12. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025-10-23 | 福田 + AI | 初版作成 |

