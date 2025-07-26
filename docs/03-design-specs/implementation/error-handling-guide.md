# 統一エラーハンドリングシステム 実装ガイド

## 概要

このドキュメントは、Shopify AI Marketing Suite フロントエンドで使用する統一エラーハンドリングシステムの実装ガイドです。プロジェクト全体で一貫したエラー処理とユーザー体験を提供するために、統一されたアプローチを採用しています。

## アーキテクチャ概要

### 主要コンポーネント

```
src/
├── types/error.ts              # エラー型定義
├── lib/error-handler.ts        # メインエラーハンドラー
├── services/dataService.ts     # 統一エラー処理を使用
└── components/dashboards/      # 各コンポーネントでの実装例
    ├── DormantCustomerAnalysis.tsx
    ├── PurchaseFrequencyDetailAnalysis.tsx
    └── YearOverYearProductAnalysis.tsx
```

### エラー処理の流れ

1. **エラー発生** → 2. **エラー正規化** → 3. **ログ出力** → 4. **ユーザー通知** → 5. **フォールバック処理**

## 使用方法

### 基本的な使用方法

```typescript
import { handleError, handleApiError } from '@/lib/error-handler'

// 一般的なエラー処理
try {
  // 何らかの処理
} catch (error) {
  await handleError(error, {
    context: 'ComponentName',
    severity: 'error',
    userMessage: 'ユーザー向けのメッセージ'
  })
}

// API エラー専用
try {
  const response = await fetch('/api/data')
} catch (error) {
  await handleApiError(error, '/api/data', 'GET', {
    context: 'ComponentName',
    userMessage: 'データの取得に失敗しました'
  })
}
```

### React コンポーネントでの実装

```typescript
import { handleApiError, handleError } from '@/lib/error-handler'
import { useAppStore } from '@/stores/appStore'

export function MyComponent() {
  const showToast = useAppStore((state) => state.showToast)

  // エラーハンドラーの初期化
  useEffect(() => {
    const { errorHandler } = require('@/lib/error-handler')
    errorHandler.setToastHandler(showToast)
  }, [showToast])

  const fetchData = async () => {
    try {
      const response = await api.getData()
      setData(response.data)
    } catch (error) {
      // APIエラーをフォールバック付きで処理
      await handleApiError(error, '/api/data', 'GET', {
        context: 'MyComponent',
        severity: 'error',
        userMessage: 'APIエラーのためモックデータで表示しています',
        fallback: { 
          enabled: true, 
          useMockData: true,
          customHandler: () => {
            setData(getMockData())
            setError("APIデータの取得に失敗したため、サンプルデータを表示中です。")
          }
        }
      })
    }
  }
}
```

## エラー分類ガイド

### エラータイプ (ErrorType)

| タイプ | 説明 | 使用例 |
|--------|------|--------|
| `network` | ネットワーク関連のエラー | 接続失敗、タイムアウト |
| `auth` | 認証・認可エラー | ログイン失敗、権限不足 |
| `validation` | バリデーションエラー | 入力値不正、フォーマット違反 |
| `server` | サーバーエラー | 500系エラー、API エラー |
| `timeout` | タイムアウトエラー | リクエストタイムアウト |
| `parse` | パースエラー | JSON パースエラー |
| `unknown` | 不明なエラー | 予期しないエラー |

### エラー重要度 (ErrorSeverity)

| 重要度 | 説明 | ユーザー通知 | ログレベル |
|--------|------|-------------|-----------|
| `info` | 情報レベル | 青色通知 | info |
| `warning` | 警告レベル | 黄色通知 | warn |
| `error` | エラーレベル | 赤色通知 | error |
| `critical` | 致命的エラー | 赤色通知 + モーダル | error |

### 通知タイプ (NotificationType)

| タイプ | 説明 | 実装方法 |
|--------|------|----------|
| `toast` | トースト通知 | AppStore.showToast |
| `console` | コンソールログ | console.error |
| `modal` | モーダル表示 | alert（暫定） |
| `inline` | インライン表示 | コンポーネント内で処理 |

## 実装例

### 1. データ取得での基本的な使用例

```typescript
// services/dataService.ts
private async fetchShopifyData(endpoint: string, params: Record<string, string> = {}) {
  try {
    const response = await fetch(`/api/shopify${endpoint}?${searchParams}`)
    
    if (!response.ok) {
      throw new AppError(`Failed to fetch data from ${endpoint}`, {
        type: 'server',
        severity: 'error',
        context: `DataService - ${endpoint}`,
        userMessage: `${endpoint}からのデータ取得に失敗しました`
      })
    }
    
    return response.json()
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    
    await handleApiError(error, endpoint, 'GET', {
      context: 'DataService - fetchShopifyData',
      severity: 'error',
      userMessage: 'Shopifyからのデータ取得中にエラーが発生しました'
    })
    
    throw error
  }
}
```

### 2. React コンポーネントでのフォールバック付きエラー処理

```typescript
// components/dashboards/DormantCustomerAnalysis.tsx
try {
  const [customersResponse, summaryResponse] = await Promise.all([
    api.dormantCustomers({ storeId: 1, pageSize: 100 }),
    api.dormantSummary(1)
  ])
  
  setDormantData(customersResponse.data?.customers || [])
  setSummaryData(summaryResponse.data)
} catch (apiError) {
  // 統一エラーハンドラーで処理 - モックデータフォールバック付き
  await handleApiError(apiError, '/api/dormant', 'GET', {
    context: 'DormantCustomerAnalysis',
    severity: 'error',
    userMessage: 'APIエラーのためモックデータで表示しています',
    fallback: { 
      enabled: true, 
      useMockData: true,
      customHandler: () => {
        // モックデータの設定
        setDormantData(mockCustomersData)
        setSummaryData(mockSummaryData)
      }
    }
  })
}
```

### 3. リトライ機能付きの実装

```typescript
try {
  const data = await fetchCriticalData()
} catch (error) {
  await handleApiError(error, '/api/critical', 'GET', {
    context: 'CriticalComponent',
    severity: 'error',
    userMessage: 'データ取得中にエラーが発生しました。再試行しています...',
    retry: {
      enabled: true,
      maxAttempts: 3,
      onRetry: async () => {
        console.log('Retrying critical data fetch...')
        const retryData = await fetchCriticalData()
        setData(retryData)
      }
    }
  })
}
```

## ベストプラクティス

### 1. エラーハンドラーの初期化

各React コンポーネントで、`useEffect` を使用してエラーハンドラーにトースト機能を設定する：

```typescript
const showToast = useAppStore((state) => state.showToast)

useEffect(() => {
  const { errorHandler } = require('@/lib/error-handler')
  errorHandler.setToastHandler(showToast)
}, [showToast])
```

### 2. 適切なエラー分類

- **ネットワークエラー**: `type: 'network'`, `severity: 'error'`
- **APIエラー**: `type: 'server'`, `severity: 'error'`
- **バリデーションエラー**: `type: 'validation'`, `severity: 'warning'`
- **タイムアウト**: `type: 'timeout'`, `severity: 'warning'`

### 3. ユーザーメッセージのガイドライン

- **具体的で分かりやすい**: "データの取得に失敗しました" ✓
- **技術的すぎない**: "JSON parse error" ✗
- **次のアクションを示す**: "再試行してください" ✓

### 4. フォールバック戦略

```typescript
// 良い例: モックデータフォールバック
fallback: { 
  enabled: true, 
  useMockData: true,
  customHandler: () => {
    setData(getMockData())
    setError("APIデータの取得に失敗したため、サンプルデータを表示中です。")
  }
}

// 良い例: 段階的劣化
fallback: {
  enabled: true,
  customHandler: () => {
    // 重要な機能のみ表示
    setLimitedMode(true)
  }
}
```

### 5. ログ出力の効果的な活用

```typescript
// 開発環境では詳細ログが自動出力される
if (process.env.NODE_ENV === 'development') {
  console.group(`🚨 ${error.severity.toUpperCase()} [${error.type}]`)
  console.error('Message:', error.message)
  console.error('Context:', error.context)
  console.groupEnd()
}
```

## 設定オプション

### ErrorHandlerConfig

```typescript
interface ErrorHandlerConfig {
  enableLogging: boolean              // ログ出力を有効にする
  enableUserNotification: boolean     // ユーザー通知を有効にする  
  enableErrorTracking: boolean        // エラー追跡を有効にする
  defaultNotificationType: NotificationType // デフォルト通知方法
  maxRetryAttempts: number           // 最大リトライ回数
  enableMockDataFallback: boolean    // モックデータフォールバックを有効にする
  developmentMode: boolean           // 開発モード
}
```

### デフォルト設定

```typescript
const DEFAULT_CONFIG = {
  enableLogging: true,
  enableUserNotification: true,
  enableErrorTracking: false, // 将来的なSentry連携時にtrue
  defaultNotificationType: 'toast',
  maxRetryAttempts: 3,
  enableMockDataFallback: true,
  developmentMode: process.env.NODE_ENV === 'development'
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. トースト通知が表示されない

**原因**: エラーハンドラーにトースト機能が設定されていない

**解決方法**:
```typescript
useEffect(() => {
  const { errorHandler } = require('@/lib/error-handler')
  errorHandler.setToastHandler(showToast)
}, [showToast])
```

#### 2. エラーが重複して表示される

**原因**: 複数の場所で同じエラーを処理している

**解決方法**: エラーが既に AppError の場合は再処理しない
```typescript
if (error instanceof AppError) {
  throw error // 再処理せずにそのまま投げる
}
```

#### 3. リトライが無限ループする

**原因**: リトライ回数の制限が正しく動作していない

**解決方法**: `maxRetryAttempts` を適切に設定し、リトライカウンターをリセット
```typescript
// 成功時にリトライカウンターをリセット
errorHandler.resetRetryCount('ComponentName')
```

## 将来の拡張予定

### 1. Sentry連携

```typescript
// 将来的な実装例
private async trackError(errorReport: ErrorReport): Promise<void> {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(errorReport.error.originalError || errorReport.error, {
      tags: {
        component: errorReport.context.component,
        errorType: errorReport.error.type
      },
      extra: {
        context: errorReport.context,
        userMessage: errorReport.error.userMessage
      }
    })
  }
}
```

### 2. カスタムエラー画面

```typescript
// エラー境界コンポーネント
export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    handleError(error, {
      context: 'ErrorBoundary',
      severity: 'critical',
      showToUser: true,
      notifyType: 'modal'
    })
  }
}
```

### 3. エラー統計とメトリクス

```typescript
// エラー統計の収集
interface ErrorMetrics {
  errorCount: number
  errorsByType: Record<ErrorType, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  mostCommonErrors: Array<{ message: string; count: number }>
}
```

## まとめ

この統一エラーハンドリングシステムにより、以下が実現されます：

- **一貫したエラー処理**: プロジェクト全体で統一されたアプローチ
- **優れたユーザー体験**: 適切な通知とフォールバック機能
- **効率的なデバッグ**: 詳細なログ出力と分類
- **高い保守性**: 中央集権的な設定と管理
- **将来性**: Sentry連携やカスタム拡張に対応

実装時は、このガイドに従って適切なエラー分類と処理を行い、ユーザーにとって分かりやすいエラーメッセージとフォールバック機能を提供してください。