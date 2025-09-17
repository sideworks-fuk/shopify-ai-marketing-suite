# サブスクリプション（課金）ドキュメント

対象:
- `frontend/src/contexts/SubscriptionContext.tsx`
- `frontend/src/hooks/useSubscription.ts`

## 概要
- 購読状態・プラン・試用期間・機能アクセス可否の管理と、課金操作（作成/アップグレード/キャンセル/再有効化）を提供。
- 認証トークンは `localStorage.authToken` を想定、APIベースURLは環境変数から解決。

## SubscriptionContext
エクスポート:
- `SubscriptionProvider`
- `useSubscriptionContext`

状態/派生値:
- `currentPlan: BillingPlan | null`
- `subscription: Subscription | null`
- `plans: BillingPlan[]`（初期はMOCK、API取得で上書き）
- `isTrialing: boolean`
- `trialDaysLeft: number`
- `loading: boolean`, `error: string | null`
- `selectedFeature?: { featureId: string; selectedAt: string; canChangeAt?: string } | null`

アクション:
- `canAccessFeature(feature: string): boolean`
- `upgradePlan(planId: string): Promise<void>`
- `cancelSubscription(): Promise<void>`
- `refreshSubscription(): Promise<void>`
- `getFeatureLimit(feature: 'max_products' | 'max_orders'): number | null`
- `isFeatureLimited(feature: string): boolean`

APIコール（例）:
- `GET /api/subscription/current`
- `GET /api/subscription/plans`
- `POST /api/subscription/upgrade`
- `POST /api/subscription/cancel`
- `GET /api/subscription/selected-feature`

挙動メモ:
- `NEXT_PUBLIC_BACKEND_URL` が未設定時は `https://localhost:7140` をフォールバック。
- `upgradePlan` は `confirmationUrl` 受領時にリダイレクト、無ければ再取得して `/billing/success` へ遷移。
- 開発時例外はモック購読データにフォールバック。

## useSubscription フック
引数:
- `options?: { autoRefresh?: boolean; refreshInterval?: number }`（既定: `false`, `60000ms`）

返却:
- データ: `subscription`, `plans`, `currentPlan`, `billingInfo`
- 状態: `loading`, `error`, `isProcessing`
- 計算: `isTrialing`, `trialDaysRemaining`, `canUpgrade`, `canDowngrade`, `hasActiveSubscription`
- アクション: `createSubscription(planId)`, `updateSubscription(planId)`, `cancelSubscription()`, `reactivateSubscription()`, `fetchSubscriptionData()`, `fetchBillingHistory()`, `validatePlanChange(from,to)`

APIエンドポイント:
- `POST /api/subscription/create`
- `POST /api/subscription/upgrade`
- `POST /api/subscription/cancel`
- `POST /api/subscription/reactivate`
- `GET /api/subscription/history`

実装ポイント:
- ベースURL: `NEXT_PUBLIC_BACKEND_URL || 'https://localhost:7140'`
- ヘッダ: `Authorization: Bearer ${localStorage.authToken}`（存在時）
- 401時: `/auth/error?error=unauthorized` にリダイレクト
- 成功時: `confirmationUrl` があればリダイレクト、なければ再取得+遷移
- `autoRefresh` 有効時は指定間隔で自動再取得

### 使用例
```tsx
import { SubscriptionProvider, useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useSubscription } from '@/hooks/useSubscription';

export default function BillingPage() {
  const { currentPlan, upgradePlan, loading } = useSubscriptionContext();
  const { plans, updateSubscription, isProcessing } = useSubscription();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Current: {currentPlan?.name ?? 'None'}</h2>
      {plans.map(p => (
        <button key={p.id} disabled={isProcessing} onClick={() => updateSubscription(p.id)}>
          Change to {p.name}
        </button>
      ))}
    </div>
  );
}

export function AppRoot({ children }: { children: React.ReactNode }) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
```

### FAQ
- Q: どの環境変数を優先しますか？
  - A: 現状 `NEXT_PUBLIC_BACKEND_URL` を優先。将来的には `NEXT_PUBLIC_API_URL` へ統一を推奨。
- Q: 認証トークンが無い場合の挙動は？
  - A: 認証必須APIは401となり、`useSubscription` はエラーハンドリングでリダイレクト（/auth/error）。
- Q: モックを無効化するには？
  - A: 例外時の開発フォールバックブロックを削除/条件変更し、API正常化で上書きさせる。
