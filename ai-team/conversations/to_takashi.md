# To: Takashi（Backend） - 2025-10-18 指示（文書整理）

## ゴール（本日）
- backend/DB/GDPR関連ドキュメントの整合チェックと重複指摘、統合案の提示（移動/削除は実施しない）

## ソース照合の前提（一次情報）
- バックエンド実装: ASP.NET Core API/EF Core プロジェクト配下（ソリューション内のAPI/Services/Models）
- DBトラッキング: `docs/04-development/03-データベース/` とマイグレーション実績（`database-migration-tracking.md`）
- GDPR正本: `docs/00-production-release/gdpr-compliance/*`

## タスク（優先順）
1. `docs/03-design-specs/02-backend/*` と `docs/02-architecture/02-データベース設計/*`、`docs/04-development/03-データベース/*` の棚卸し
   - 出力: 重複/旧版/誤情報の指摘を `doc-cleanup/audit-checklist.md` に記入
   - 期限: 本日 13:00（P0/P1中心）
2. GDPR関連正本統合案の作成
   - 参照: 正本は `00-production-release/gdpr-compliance/*`
   - 出力: 統合方針を `doc-cleanup/reorg-action-plan.md` に追記（旧パスは参照化提案）
   - 期限: 本日 17:00
3. DB変更のトレーサビリティ確認
   - 出力: 実装/文書/`database-migration-tracking.md` の突合結果を `audit-checklist.md` に反映
   - 期限: 本日 17:00

## 成果物の置き場
- 監査結果: `docs/01-project-management/04-organization/doc-cleanup/audit-checklist.md`
- マッピング案: `docs/01-project-management/04-organization/doc-cleanup/reorg-action-plan.md`
- メモ/結果: `ai-team/conversations/report_takashi.md` に要約

## 連絡
- ブロッカーがあれば即時で `ai-team/conversations/to_kenji.md` へ記載

## 追加指示（午後・文書整理専念／移動・削除は不可）

1) controllers.md 表記統一案の本文追記
- 対象: `docs/03-design-specs/02-backend/controllers.md`
- 出力: 本文中に「提案」章を追加し、GDPRエンドポイントの表記を `/api/webhook/...` に統一、過去表記 `/api/webhooks/...` は注記で明記
- 期限: 本日 16:00

2) データベースモデル一覧の差分反映案
- 対象: `docs/02-architecture/02-データベース設計/データベースモデル一覧.md`
- 出力: GDPR/監査テーブルの差分（項目/インデックス）を本文に反映する「提案」章を追記
- 期限: 本日 16:30

3) DDL 追補案の明文化
- 対象: `docs/04-development/03-データベース/マイグレーション/`
- 出力: `WebhookEvents.IdempotencyKey` の Filtered Unique 追加DDLの追補案を `doc-cleanup/reorg-action-plan.md` の「追加提案」に追記（コードは不要、DDLファイル名と要旨を文章化）
- 期限: 本日 17:00

4) tracking.md 更新案（文章）
- 対象: `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md`
- 出力: 追記すべき内容（IdempotencyKey Uniqueの明記、課金DDLの環境別適用状況）を箇条書きでまとめ、`doc-cleanup/audit-checklist.md` に根拠として記載
- 期限: 本日 17:00

## 追加指示（第2報・文書修正の確定作業）

1) controllers.md の確定修正（注記含む）
- 対象: `docs/03-design-specs/02-backend/controllers.md`
- 出力: GDPRエンドポイント表記を本文で`/api/webhook/...`に統一、過去表記`/api/webhooks/...`は注記で明記（提案→確定）
- 期限: 本日 18:00

2) DBモデル一覧の本文更新（差分反映）
- 対象: `docs/02-architecture/02-データベース設計/データベースモデル一覧.md`
- 出力: WebhookEvents.IdempotencyKey（Filtered Unique）とGDPR系モデルの項目/インデックスを本文に反映（提案→確定）
- 期限: 本日 18:00

3) tracking.md の更新項目リストアップ（表修正案）
- 対象: `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md`
- 出力: 追記・修正が必要な表の行を具体的なセル値込みで列挙（適用日/環境）
- 期限: 本日 18:00

4) GDPR参照化の対象一覧（差分最終確認）
- 対象: `docs/06-shopify/03-GDPR/*`, `docs/06-shopify/04-GDPR対応/*`
- 出力: 参照化するファイル一覧と、正本上の対応先（章レベルまで）を箇条書きで列挙（`doc-cleanup/gdpr-unification-plan.md`に追記）
- 期限: 本日 18:00

5) 報告（必須）
- `report_takashi.md` に完了内容、残件（あれば）を記載（18:00締切）

## 依頼（tracking日付の提供）
- 対象: `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md`
- 必要情報（Staging/Production の適用日）
  - 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql（Filtered Uniqueの確定適用日）
  - 2025-08-24-CreateBillingTables.sql
  - 2025-08-24-AddGDPRTables.sql
- 締切: 明日 10:00（暫定でTBD可、確定次第更新）
