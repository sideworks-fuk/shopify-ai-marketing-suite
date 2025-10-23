# Billing ページ実装

対象: `frontend/src/app/billing/page.tsx`

## 概要
- 料金プランの一覧、現在プラン表示、アップグレード入口を提供。
- 現状は開発用モック（`mockPlans`, `mockSubscription`）とクリックハンドラ。

## 主な構成
- ローディングUI
- トライアルバナー（残日数の算出）
- プライシングカード（人気/現在のプランバッジ・機能一覧・上限表示）
- FAQ セクション

## 統合前提
- `SubscriptionProvider` と `useSubscription` を前提に統合する。
  - プラン取得: `plans`
  - 現在プラン: `subscription.planId`
  - 更新: `updateSubscription(planId)` を呼び出す
- ルーティングは `/billing` を正とし、`/settings/billing` は参照/リダイレクトで統一する（実装側での移動は別PRで）
- 認証前提は「[認証/保護の実装方針（現行）](./routing-and-auth.md#認証保護の実装方針（現行）)」を参照
- API呼び出しのURLは「[注意事項](./api-config.md#注意事項)」の方針に従う

### 擬似コード
```tsx
const { plans, currentPlan } = useSubscription();
<Button onClick={() => updateSubscription(plan.id)}>アップグレード</Button>
```

## 注意（/settings/billing との整合）
- 参照運用案: `/settings/billing` はドキュメントや既存ブックマークでの参照先として維持し、本文では一貫して `/billing` を正と明記。パンくず/ナビは `/billing` を表示し、旧参照から到達した場合も画面表示上は `/billing` に統一。
- リダイレクト運用案: `/settings/billing` → `/billing` の恒久的または一時的リダイレクトを設定。パンくず/ナビは `/billing` を表示。SEOは内部アプリ配下で影響軽微だが、恒久リダイレクトを選ぶ場合は計測上のURL統一に寄与。
- いずれの案でも、ユーザー向け案内（メニュー、CTA、ヘルプ内リンク）は `/billing` に統一する。

## 関連リンク
- [API設定/環境解決](./api-config.md#注意事項)
- [ルーティング/認証レイアウト](./routing-and-auth.md#認証保護の実装方針（現行）)
- [使用例とFAQ](./examples-and-faq.md)