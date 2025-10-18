# [Archived] 最終フォルダ構造（提案） - 2025-10-18

このファイルは整理のためアーカイブされました。最新版は `docs/01-project-management/04-organization/doc-cleanup/final-structure.md` を参照してください。

---

# 最終フォルダ構造（提案） - 2025-10-18

目的: 単一の正本構造に統合し、参照性・保守性・提出物整合性を最大化する。

## ルート構成（提案）
- 00-production-release
  - app-description/
  - legal/
  - monitoring/
  - operations/
  - shopify-submission/
  - test-procedures/
  - billing-system/
  - gdpr-compliance/
  - implementation-status/
  - README.md, RELEASE-CHECKLIST.md, RELEASE-TASK-DASHBOARD.md
- 01-project-management
  - 00_meeting/
  - 01-planning/
  - 02-business-analysis/
  - 03-risk-management/
  - 04-organization/
  - gap-triage/
  - PM-001..004, project-schedule.md, README.md
- 02-architecture
  - 01-システム設計/
  - 02-データベース設計/
  - 03-技術スタック/
  - 04-移行計画/
  - 05-ADR/
  - README.md
- 03-design-specs
  - frontend/
  - backend/
  - database/
  - integration/
  - security/
  - testing/
  - performance/
  - screen-designs/
  - implementation/
  - README.md
- 04-development
  - 01-環境構築/
  - 02-インフラストラクチャ/
  - 03-データベース/
  - 04-Azure_DevOps/
  - 05-コスト管理/
  - 06-Shopify連携/
  - 07-パフォーマンス/
  - 08-デバッグ・トラブル/
  - backend/
  - README.md
- 05-operations
  - 01-Azure運用/
  - 02-CI_CD/
  - 03-デプロイメント/
  - 04-環境管理/
  - README.md
- 06-shopify
  - 01-申請関連/
  - 02-課金システム/
  - 03-GDPR/（→正本は00-production-release/gdpr-compliance/参照）
  - 05-技術ガイド/
  - README.md
- 07-operations-manual
  - 01-UI操作ガイド.md
  - 02-トラブルシューティングガイド.md
  - 03-FAQ.md
  - README.md
- 99-archive
  - 2025-10-19/（全アーカイブ移動先）
- worklog/
  - 2025/

## 統合/参照ルール
- PM文書の正本は `01-project-management`。`01-project-report` は `99-archive/2025-10-19/` へ移動
- GDPRの正本は `00-production-release/gdpr-compliance`。`06-shopify/03-GDPR`/`04-GDPR対応`は参照に変更
- `03-design-specs/archive` は `99-archive` に統合
- 既存リンクは相対リンクで張替え、索引は `01-project-management/01-planning/technical-review-checklist.md` 等に集約
