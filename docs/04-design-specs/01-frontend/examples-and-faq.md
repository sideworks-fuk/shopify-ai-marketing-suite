# 使用例とFAQ

## 使用例（抜粋）

### 1) サブスクリプションの表示と変更
```tsx
import { SubscriptionProvider, useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useSubscription } from '@/hooks/useSubscription';

function BillingPanel() {
  const { currentPlan, loading } = useSubscriptionContext();
  const { plans, updateSubscription, isProcessing } = useSubscription();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div>Current Plan: {currentPlan?.name ?? 'None'}</div>
      {plans.map(p => (
        <button key={p.id} disabled={isProcessing} onClick={() => updateSubscription(p.id)}>
          Change to {p.name}
        </button>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <SubscriptionProvider>
      <BillingPanel />
    </SubscriptionProvider>
  );
}
```

### 2) 無料機能の選択UI
```tsx
import { useFeatureSelection } from '@/hooks/useFeatureSelection';

export default function FeatureGate() {
  const { currentSelection, availableFeatures, selectFeature, isSelecting, error } = useFeatureSelection();

  if (!currentSelection) return <div>Loading...</div>;

  return (
    <div>
      <p>Current: {currentSelection.selectedFeature ?? '未選択'}</p>
      {availableFeatures.map(f => (
        <button key={f.id} disabled={isSelecting} onClick={() => selectFeature(f.id)}>
          {f.label}
        </button>
      ))}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### 3) API URL の一貫した構築
```ts
import { buildApiUrl, API_CONFIG } from '@/lib/api-config';

const url = buildApiUrl(API_CONFIG.ENDPOINTS.CUSTOMER_DASHBOARD);
const res = await fetch(url, { credentials: 'include' });
```

## FAQ
- Q: API ベースURLはどれを使えばよい？
  - A: 実運用では `NEXT_PUBLIC_API_URL` に統一を推奨。暫定で `NEXT_PUBLIC_BACKEND_URL` 優先の呼び出しも存在。詳細は「[API設定/環境解決の注意事項](./api-config.md#注意事項)」。
- Q: 401時の挙動は？
  - A: `useSubscription` は `/auth/error?error=unauthorized` に遷移。`useFeatureSelection` はエラーメッセージ表示。認証の流れは「[認証/保護の実装方針（現行）](./routing-and-auth.md#認証保護の実装方針（現行）)」。
- Q: ローカルで HTTPS を使うには？
  - A: `.env.local` に `NEXT_PUBLIC_USE_HTTPS=true` を設定し、`dotnet dev-certs https --trust` を実行。API URLの選択は「[API設定/環境解決の注意事項](./api-config.md#注意事項)」。
- Q: モックを削るには？
  - A: 例外時の開発フォールバックを削除し、APIの安定化・環境変数設定を行う。Billingの統合は「[統合前提](./page-billing.md#統合前提)」。

## 提案（リンク整備）
- `routing-and-auth.md` への相対リンクを本文に追加
- `page-billing.md` への相対リンクを本文に追加
- `api-config.md` への相対リンクを本文に追加

## 関連リンク
- [API設定/環境解決](./api-config.md#注意事項)
- [ルーティング/認証レイアウト](./routing-and-auth.md#認証保護の実装方針（現行）)
- [Billingページ実装](./page-billing.md#統合前提)