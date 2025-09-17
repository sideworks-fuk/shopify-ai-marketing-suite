# 本番リリース準備作業ログ - 2025年9月 第2週（統合）

## 概要
- 対象期間: 〜 2025-09-15
- 目的: 開発再開に伴う残作業の整理・指示出しと、フロント/バック両面の実装再加速

## サマリー
- 指示運用を`to_*`/`report_*`に統一し、本日分のみ維持の運用を確立
- 可視化を強化（RELEASE-TASK-DASHBOARD、CSV、Excel手順）
- フロント: 認証保護の本番有効化、API URL統一、モック排除開始、課金UI接続、ダッシュボード実API化
- バック: GDPR 4種、app/uninstalled課金キャンセル、IdempotencyKey、HMAC固定時間比較、Hangfire登録（実装完了、Staging検証待ち）
- 課金MVP仕様を確定し、対応状況/注意事項を明文化

## 実施内容（統合）
### 1) 体制/運用
- `to_yuki.md`/`to_takashi.md`/`to_all.md`を日付単位で整理し当日指示のみ残す
- 進捗/ブロッカーの記録先を明確化（report_* / to_kenji.md）

### 2) フロントエンド（9/17-22:28以降）
- 認証チェックを本番時のみ有効化（`app/(authenticated)/layout.tsx`）
- `NEXT_PUBLIC_API_URL`へ統一（`useSubscription`/`SubscriptionContext`/billing/dashboard 他）
- 本番のみ`/dev` `/design-system` `/playground`を遮断（`frontend/middleware.ts`）
- ダッシュボード実API化（`lib/api/dashboard.ts` → `buildApiUrl`統一、`page.tsx`有効化）
- 課金UIを`useSubscription`へ接続（updateSubscription/処理中制御）
- Free Plan UIのUpgrade導線追加（403/409時に`/billing`）

### 3) バックエンド
- Webhook: HMAC固定時間比較/403、IdempotencyKey付与・重複抑止、必須ヘッダ検証、Topic許可、サイズ上限
- Billing: `app/uninstalled`連動の確実なキャンセル（Shopify/DB冪等）
- GDPR: Hangfire定期実行登録（*/5分）
- 監視: App Insights用KQL/アラート素案、リプレイ手順ドラフト

### 4) 可視化/資料
- `RELEASE-TASK-DASHBOARD.md` 作成/更新
- `excel_release_tasks.csv` / `excel_issue_tracker.csv` 作成
- `EXCEL-EXPORT-README.md` にExcel作成手順を明記
- `billing-system/mvp-billing-spec-2025-09-17.md`（要件対応状況/注意事項 追記）

## 課題・注意点
- GDPR/課金は実装完了済。Staging検証（冪等/403/通し/非同期）がクリティカル
- DBマイグレーションは福田担当（Stg適用→tracking更新→本番手順）
- Freeプラン受け入れ基準（403/409理由・次回可日・Upgrade導線・残日数表示）を満たすこと

## 次アクション
- Staging検証の実施と記録（Webhook正常/重複/順不同/403、Billing通し、GDPR pending）
- Excelブック`EC-Ranger-Progress-Board.xlsx`の作成
- 申請素材（スクショ等）仕上げと提出チェック

## 参考リンク
- `docs/00-production-release/RELEASE-TASK-DASHBOARD.md`
- `docs/00-production-release/EXCEL-EXPORT-README.md`
- `docs/00-production-release/billing-system/mvp-billing-spec-2025-09-17.md`
- `ai-team/conversations/to_yuki.md` / `to_takashi.md` / `to_all.md`
