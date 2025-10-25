# 認証エラーハンドリング改善仕様書

**作成日**: 2025-10-23  
**作成者**: 福田 + AI Assistant  
**対象**: フロントエンド全画面

## 1. 概要

### 1.1 目的
認証エラー（401 Unauthorized）発生時に、ユーザーが次のアクションを明確に理解できるUI/UXを提供する。

### 1.2 現状の問題
- 認証エラー時に「データ取得中...」のまま画面が止まる
- エラーメッセージが表示されない
- ユーザーが何をすべきか分からない
- 開発環境でShopify OAuth認証が必要なことが分かりにくい

## 2. 要件

### 2.1 機能要件

#### FR-1: 認証エラーの明確な表示
- 401エラー発生時に専用のエラー画面を表示
- エラーの原因を分かりやすく説明
- 次のアクションを明示（Shopify認証ボタン）

#### FR-2: エラー状態の区別
以下のエラーを区別して表示：
- **認証エラー (401)**: Shopify認証が必要
- **権限エラー (403)**: アクセス権限がない
- **サーバーエラー (500)**: サーバー側の問題
- **ネットワークエラー**: 接続の問題

#### FR-3: 開発環境での対応
- 開発環境では認証バイパスオプションを表示
- デバッグ情報の表示（エラー詳細、API URL等）

### 2.2 非機能要件

#### NFR-1: ユーザビリティ
- エラー発生から表示まで1秒以内
- 明確で分かりやすいメッセージ
- アクションボタンは目立つデザイン

#### NFR-2: 保守性
- 共通コンポーネント化
- エラーハンドリングロジックの統一

## 3. 設計

### 3.1 エラー型定義

```typescript
// frontend/src/lib/types/errors.ts

export enum ErrorType {
  AUTH = 'auth',           // 401 Unauthorized
  FORBIDDEN = 'forbidden', // 403 Forbidden
  SERVER = 'server',       // 500 Internal Server Error
  NETWORK = 'network',     // Network Error
  TIMEOUT = 'timeout',     // Request Timeout
  UNKNOWN = 'unknown'      // Unknown Error
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  details?: unknown;
  retryable: boolean;
  actionRequired?: 'auth' | 'retry' | 'contact_support';
}

export class AuthenticationError extends Error implements AppError {
  type = ErrorType.AUTH;
  statusCode = 401;
  retryable = false;
  actionRequired = 'auth' as const;

  constructor(message: string = 'Shopify認証が必要です') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ServerError extends Error implements AppError {
  type = ErrorType.SERVER;
  retryable = true;
  actionRequired = 'retry' as const;

  constructor(
    message: string = 'サーバーエラーが発生しました',
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServerError';
  }
}
```

### 3.2 エラーハンドリングユーティリティ

```typescript
// frontend/src/lib/utils/error-handler.ts

import { AppError, ErrorType, AuthenticationError, ServerError } from '@/lib/types/errors';

/**
 * APIエラーを適切なAppErrorに変換
 */
export function handleApiError(error: unknown): AppError {
  console.error('🔴 API Error:', error);

  // ApiError型の場合
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const apiError = error as { statusCode?: number; message?: string; response?: unknown };
    
    switch (apiError.statusCode) {
      case 401:
        return new AuthenticationError(
          'Shopify認証が必要です。Shopifyアカウントでログインしてください。'
        );
      
      case 403:
        return {
          type: ErrorType.FORBIDDEN,
          message: 'この機能へのアクセス権限がありません。',
          statusCode: 403,
          retryable: false,
          actionRequired: 'contact_support'
        };
      
      case 500:
      case 502:
      case 503:
        return new ServerError(
          'サーバーで問題が発生しました。しばらく待ってから再度お試しください。',
          apiError.statusCode,
          apiError.response
        );
      
      case 408:
      case 504:
        return {
          type: ErrorType.TIMEOUT,
          message: 'リクエストがタイムアウトしました。もう一度お試しください。',
          statusCode: apiError.statusCode,
          retryable: true,
          actionRequired: 'retry'
        };
      
      default:
        return {
          type: ErrorType.UNKNOWN,
          message: apiError.message || '予期しないエラーが発生しました。',
          statusCode: apiError.statusCode,
          retryable: false,
          actionRequired: 'contact_support'
        };
    }
  }

  // ネットワークエラー
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      type: ErrorType.NETWORK,
      message: 'ネットワーク接続を確認してください。',
      retryable: true,
      actionRequired: 'retry'
    };
  }

  // その他のエラー
  return {
    type: ErrorType.UNKNOWN,
    message: error instanceof Error ? error.message : '予期しないエラーが発生しました。',
    retryable: false,
    actionRequired: 'contact_support'
  };
}

/**
 * エラーメッセージをユーザーフレンドリーに変換
 */
export function getUserFriendlyErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.AUTH:
      return 'Shopify認証が必要です';
    case ErrorType.FORBIDDEN:
      return 'アクセス権限がありません';
    case ErrorType.SERVER:
      return 'サーバーエラーが発生しました';
    case ErrorType.NETWORK:
      return 'ネットワーク接続エラー';
    case ErrorType.TIMEOUT:
      return 'リクエストがタイムアウトしました';
    default:
      return '予期しないエラーが発生しました';
  }
}
```

### 3.3 認証エラー表示コンポーネント

```tsx
// frontend/src/components/errors/AuthenticationRequired.tsx

'use client';

import React from 'react';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AuthenticationRequiredProps {
  /** エラーメッセージ */
  message?: string;
  /** 詳細情報（開発環境のみ表示） */
  details?: unknown;
  /** 再試行コールバック */
  onRetry?: () => void;
  /** カスタムアクション */
  customAction?: React.ReactNode;
}

export function AuthenticationRequired({
  message = 'この機能を使用するには、Shopify認証が必要です。',
  details,
  onRetry,
  customAction
}: AuthenticationRequiredProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shopifyAuthUrl = process.env.NEXT_PUBLIC_SHOPIFY_AUTH_URL || '/api/auth/shopify/install';

  const handleShopifyAuth = () => {
    // Shopify認証ページへリダイレクト
    window.location.href = shopifyAuthUrl;
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Shopify認証が必要です</CardTitle>
              <CardDescription className="mt-1">
                {message}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 説明 */}
          <Alert>
            <AlertTitle>認証について</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                このアプリはShopifyストアのデータにアクセスするため、
                Shopifyアカウントでの認証が必要です。
              </p>
              <p className="text-sm text-muted-foreground">
                認証後、ストアの顧客データや売上データを分析できるようになります。
              </p>
            </AlertDescription>
          </Alert>

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleShopifyAuth}
              className="flex-1"
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Shopifyで認証する
            </Button>

            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                再試行
              </Button>
            )}
          </div>

          {customAction && (
            <div className="pt-2">
              {customAction}
            </div>
          )}

          {/* 開発環境用デバッグ情報 */}
          {isDevelopment && details && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                デバッグ情報を表示
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto max-h-60">
                {JSON.stringify(details, null, 2)}
              </pre>
            </details>
          )}

          {/* 開発環境用バイパスオプション */}
          {isDevelopment && (
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <AlertTitle className="text-blue-900">開発環境</AlertTitle>
              <AlertDescription className="text-blue-800 text-sm">
                <p className="mb-2">
                  開発環境では、バックエンドの認証を一時的に無効化することができます。
                </p>
                <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                  backend/ShopifyAnalyticsApi/Program.cs で UseAuthentication() をコメントアウト
                </code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.4 汎用エラー表示コンポーネント

```tsx
// frontend/src/components/errors/ErrorDisplay.tsx

'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, WifiOff, ServerCrash, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppError, ErrorType } from '@/lib/types/errors';
import { AuthenticationRequired } from './AuthenticationRequired';

interface ErrorDisplayProps {
  /** エラーオブジェクト */
  error: AppError | Error | unknown;
  /** 再試行コールバック */
  onRetry?: () => void;
  /** ホームに戻るコールバック */
  onGoHome?: () => void;
  /** カスタムアクション */
  customAction?: React.ReactNode;
}

export function ErrorDisplay({
  error,
  onRetry,
  onGoHome,
  customAction
}: ErrorDisplayProps) {
  // エラーの型を判定
  const appError = error as AppError;
  
  // 認証エラーの場合は専用コンポーネントを表示
  if (appError.type === ErrorType.AUTH || appError.statusCode === 401) {
    return (
      <AuthenticationRequired
        message={appError.message}
        details={appError.details}
        onRetry={onRetry}
        customAction={customAction}
      />
    );
  }

  // エラータイプに応じたアイコンと色を決定
  const getErrorIcon = () => {
    switch (appError.type) {
      case ErrorType.NETWORK:
        return <WifiOff className="w-6 h-6 text-red-600" />;
      case ErrorType.SERVER:
        return <ServerCrash className="w-6 h-6 text-red-600" />;
      case ErrorType.TIMEOUT:
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const getErrorTitle = () => {
    switch (appError.type) {
      case ErrorType.NETWORK:
        return 'ネットワークエラー';
      case ErrorType.SERVER:
        return 'サーバーエラー';
      case ErrorType.TIMEOUT:
        return 'タイムアウト';
      case ErrorType.FORBIDDEN:
        return 'アクセス権限エラー';
      default:
        return 'エラーが発生しました';
    }
  };

  const getErrorDescription = () => {
    if (appError.message) return appError.message;
    
    switch (appError.type) {
      case ErrorType.NETWORK:
        return 'ネットワーク接続を確認してください。';
      case ErrorType.SERVER:
        return 'サーバーで問題が発生しました。しばらく待ってから再度お試しください。';
      case ErrorType.TIMEOUT:
        return 'リクエストがタイムアウトしました。もう一度お試しください。';
      case ErrorType.FORBIDDEN:
        return 'この機能へのアクセス権限がありません。';
      default:
        return '予期しないエラーが発生しました。';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              {getErrorIcon()}
            </div>
            <div>
              <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
              <CardDescription className="mt-1">
                {getErrorDescription()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3">
            {appError.retryable && onRetry && (
              <Button
                onClick={onRetry}
                className="flex-1"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                再試行
              </Button>
            )}

            {onGoHome && (
              <Button
                onClick={onGoHome}
                variant="outline"
                size="lg"
              >
                <Home className="mr-2 h-4 w-4" />
                ホームに戻る
              </Button>
            )}
          </div>

          {customAction && (
            <div className="pt-2">
              {customAction}
            </div>
          )}

          {/* 開発環境用デバッグ情報 */}
          {process.env.NODE_ENV === 'development' && appError.details && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                デバッグ情報を表示
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto max-h-60">
                {JSON.stringify(appError, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.5 休眠顧客分析画面への適用

```typescript
// frontend/src/app/customers/dormant/page.tsx (修正版)

"use client"

import React, { useState, useEffect } from "react"
import { ErrorDisplay } from "@/components/errors/ErrorDisplay"
import { handleApiError } from "@/lib/utils/error-handler"
import type { AppError } from "@/lib/types/errors"

export default function DormantCustomersPage() {
  const [summaryData, setSummaryData] = useState<any>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [error, setError] = useState<AppError | null>(null)

  // サマリーデータ取得
  const fetchSummaryData = async () => {
    try {
      setIsLoadingSummary(true)
      setError(null)
      
      console.log('🔄 休眠顧客サマリーデータの取得を開始...')
      
      const response = await api.dormantSummary(getCurrentStoreId())
      console.log('✅ サマリーデータ取得成功:', response)
      
      setSummaryData(response.data)
      
    } catch (err) {
      console.error('❌ サマリーデータの取得に失敗:', err)
      
      // エラーを適切な型に変換
      const appError = handleApiError(err)
      setError(appError)
      
    } finally {
      setIsLoadingSummary(false)
    }
  }

  useEffect(() => {
    fetchSummaryData()
  }, [])

  // エラー表示
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={fetchSummaryData}
        onGoHome={() => window.location.href = '/'}
      />
    )
  }

  // ローディング表示
  if (isLoadingSummary) {
    return <LoadingSpinner message="データを取得中..." />
  }

  // 通常の画面表示
  return (
    <div>
      {/* 既存のコンポーネント */}
    </div>
  )
}
```

## 4. 実装手順

### Phase 1: 基盤実装（優先度: 高）
1. ✅ エラー型定義の作成（`frontend/src/lib/types/errors.ts`）
2. ✅ エラーハンドリングユーティリティの作成（`frontend/src/lib/utils/error-handler.ts`）
3. ✅ 認証エラーコンポーネントの作成（`frontend/src/components/errors/AuthenticationRequired.tsx`）
4. ✅ 汎用エラーコンポーネントの作成（`frontend/src/components/errors/ErrorDisplay.tsx`）

### Phase 2: 既存画面への適用（優先度: 高）
1. 休眠顧客分析画面（`frontend/src/app/customers/dormant/page.tsx`）
2. ダッシュボード画面（`frontend/src/app/dashboard/page.tsx`）
3. その他の分析画面

### Phase 3: API クライアントの改善（優先度: 中）
1. `api-client.ts` でのエラーハンドリング統一
2. 401エラー時の自動リダイレクト（オプション）

## 5. テストケース

### 5.1 認証エラー（401）
- **条件**: バックエンドが401を返す
- **期待結果**: 
  - 「Shopify認証が必要です」画面が表示される
  - 「Shopifyで認証する」ボタンが表示される
  - 開発環境ではデバッグ情報が表示される

### 5.2 サーバーエラー（500）
- **条件**: バックエンドが500を返す
- **期待結果**:
  - 「サーバーエラー」画面が表示される
  - 「再試行」ボタンが表示される

### 5.3 ネットワークエラー
- **条件**: バックエンドに接続できない
- **期待結果**:
  - 「ネットワークエラー」画面が表示される
  - 「再試行」ボタンが表示される

## 6. デモ対応の一時的な対策

デモまでに完全実装が間に合わない場合の一時的な対策：

### オプション1: バックエンドの認証を一時的に無効化
```csharp
// backend/ShopifyAnalyticsApi/Program.cs
// デモ用: 認証を一時的にコメントアウト
// app.UseAuthentication();
```

### オプション2: フロントエンドで401エラーを無視
```typescript
// frontend/src/app/customers/dormant/page.tsx
catch (err) {
  if (err.statusCode === 401) {
    console.warn('⚠️ 認証エラーを無視してモックデータを使用します（デモ用）')
    // モックデータで継続
  } else {
    setError(handleApiError(err))
  }
}
```

## 7. 今後の改善

- エラーログの収集と分析（Application Insights連携）
- エラー発生時の自動リトライ機能
- エラーメッセージの多言語対応
- エラー発生時のユーザーフィードバック収集

## 8. 関連ドキュメント

- `docs/03-design-specs/05-integration/oauth-multitenancy.md` - OAuth認証設計
- `docs/03-design-specs/08-security/jwt-authentication-guide.md` - JWT認証ガイド
- `docs/04-development/01-環境構築/開発環境セットアップガイド.md` - 開発環境設定

## 9. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025-10-23 | 福田 + AI | 初版作成 |

