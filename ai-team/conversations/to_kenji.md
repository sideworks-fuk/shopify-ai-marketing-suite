本日の詳細報告は `ai-team/conversations/report_yuki.md` に記載しています（周知フォーマット準拠）。本ファイルは連絡/ブロッカー共有用です。

# To: Kenji（PM） - フロント文書監査レポート（2025-10-18）

## 概要
- フロント設計ドキュメントの棚卸しと整合チェックを実施。P0/P1中心で指摘と提案を反映しました。

## 実施詳細（完了）
- `docs/01-project-management/04-organization/doc-cleanup/audit-checklist.md` にP0/P1指摘を追記（API設定/認証/課金、screen-designs関連）
- `docs/01-project-management/04-organization/doc-cleanup/reorg-action-plan.md` にBillingルート統合提案を追記（`/billing` 正、`/settings/billing` は参照/リダイレクト）
- フロント設計4文書に「提案」章と本文内「関連リンク」を追記
  - `docs/03-design-specs/01-frontend/api-config.md`
  - `docs/03-design-specs/01-frontend/routing-and-auth.md`
  - `docs/03-design-specs/01-frontend/page-billing.md`
  - `docs/03-design-specs/01-frontend/examples-and-faq.md`
- screen-designs配下の各READMEに「提案（リンク整備）」を追記
- `docs/01-project-management/04-organization/doc-cleanup/link-update-plan.md` にフロント優先リンク更新候補（8件以上）を追加

## 実装照合の一次情報
- `frontend/src/lib/api-config.ts`
- `frontend/middleware.ts`
- `frontend/src/app/(authenticated)/layout.tsx`
- `frontend/src/app/billing/page.tsx`
- `frontend/src/contexts/SubscriptionContext.tsx`, `frontend/src/hooks/useSubscription.ts`

## 次のアクション（期限）
- [2025-10-18 18:00] `examples-and-faq.md` の本文相対リンクの最終整備案を確定
- [2025-10-18 18:00] screen-designs提案の承認後、張替え対象をPR化（計画作成）

## 承認依頼
- ルート統合案の承認可否: `/billing` を正、`/settings/billing` は参照/リダイレクト（実装移行は別PR）

## ブロッカー
- なし

---

追記（命名規約）
- 報告は `ai-team/conversations/report_[名前].md` に統一してください（例: `report_yuki.md`, `report_takashi.md`）。
- `report_to_kenji.md` のような一時ファイルは使用しません。