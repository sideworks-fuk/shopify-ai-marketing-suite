# [Archived] ドキュメントインベントリ（初版） - 2025-10-18

このファイルは整理のためアーカイブされました。最新版は `docs/01-project-management/04-organization/doc-cleanup/inventory.md` を参照してください。

---

# ドキュメントインベントリ（初版） - 2025-10-18

## 目的
- docs配下の現況を俯瞰し、重複・誤情報・アーカイブ候補を特定するベースとする。

## 主要ディレクトリ
- 00-production-release
- 01-project-management
- 01-project-report
- 02-architecture
- 03-design-specs
- 04-development
- 05-operations
- 06-shopify
- 07-operations-manual
- 99-archive
- customer
- frontend
- performance
- prompts
- technical-review
- test-procedures
- worklog

## 代表ファイル/サブツリー（抜粋）
- 00-production-release
  - RELEASE-CHECKLIST.md
  - shopify-submission/
  - billing-system/
  - gdpr-compliance/
- 01-project-management
  - PM-001..004, sprint-planning/, wbs/, gap-triage/
- 03-design-specs
  - frontend/, backend/, database/, integration/, security/, testing/
  - archive/（過去の設計レビュー・調査）
- 06-shopify
  - 02-課金システム/（ビジネス・技術・運用・テスト）

## 重複・誤情報の疑い（暫定リスト）
- project-report配下のPM-001..004 と project-management配下のPM-001..004（重複保有）
- 03-design-specs/archive/ と 99-archive/ の役割重複
- 06-shopify/03-GDPR と 06-shopify/04-GDPR対応 と 00-production-release/gdpr-compliance/（重複懸念）

## 次アクション（監査対象候補）
- PM文書の重複統合方針の決定
- GDPR関連文書の正本位置の決定
- archive系の生き/死に判定ルール適用

（詳細は監査チェックリスト/監査計画を参照）
