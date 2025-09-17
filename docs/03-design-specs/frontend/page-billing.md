# Billing ページ実装

対象: `frontend/src/app/billing/page.tsx`

## 概要
- 料金プランの一覧表示、現在プランの表示、アップグレード操作の入口を提供。
- 現状は開発用モック（`mockPlans`, `mockSubscription`）とクリックハンドラのみ。

## 主な構成
- ローディングUI
- トライアルバナー（残日数の算出）
- プライシングカード（人気/現在のプランバッジ・機能一覧・上限表示）
- FAQ セクション

## 今後の統合
- `SubscriptionProvider`/`useSubscription` と接続し、
  - プラン取得: `plans`
  - 現在プラン: `subscription.planId`
  - 更新: `updateSubscription(planId)` を呼び出す

### 擬似コード
```tsx
const { plans, currentPlan } = useSubscription();
<Button onClick={() => updateSubscription(plan.id)}>アップグレード</Button>
```

## 注意
- 認証が必要な操作のため、(authenticated) レイアウト保護が前提。
- API URLは環境変数で制御し、`localhost` のハードコードを残さない。
