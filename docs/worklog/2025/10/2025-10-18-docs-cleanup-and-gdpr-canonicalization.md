# 作業ログ: ドキュメント整理とGDPR正本統一

## 作業情報
- 開始日時: 2025-10-18 10:00:00
- 完了日時: 2025-10-18 18:00:00
- 所要時間: 8時間
- 担当: 福田＋AI Assistant（Kenji）

## 作業概要
- docs再編の作業ハブ（doc-cleanup）整備、GDPR文書の正本統一方針の確定と反映、レポート命名規約の統一

## 実施内容
1. doc-cleanup配下の整備（inventory/audit-plan/audit-checklist/reorg-action-plan/final-structure/link-update-plan/templates）
2. 旧GDPR文書2件へ参照化ヘッダーを挿入（移動なし）
3. backend/フロント設計文書にGDPR正本への関連リンク節を追加
4. `docs/01-project-report/*` を `docs/99-archive/2025-10-19/` へ移動（参照ヘッダー追記）
5. ADR-002作成（GDPR正本統一とレポート命名規約）

## 成果物
- `docs/01-project-management/04-organization/doc-cleanup/*`
- `docs/06-shopify/03-GDPR/実装計画書.md`（参照化）
- `docs/06-shopify/04-GDPR対応/GDPR_Webhook仕様.md`（参照化）
- `docs/03-design-specs/backend/*`（関連リンク節）
- `docs/06-shopify/README.md`（正本リンク）
- `docs/99-archive/2025-10-19/PM-00*.md`（アーカイブ）
- `docs/02-architecture/05-ADR/ADR-002-gdpr-canonical-and-report-naming.md`

## 課題・注意点
- 一部リンクのアンカー安定化が必要（見出しスラッグの固定）
- tracking.md のTBDセルは明日以降に確定

## 関連ファイル
- `docs/01-project-management/04-organization/doc-cleanup/decisions.md`
- `docs/01-project-management/04-organization/doc-cleanup/gdpr-unification-plan.md`
- `docs/01-project-management/04-organization/doc-cleanup/link-update-plan.md`
