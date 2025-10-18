# スプリントプランニング: 2025-10-18 / 2025-10-19

## 1. ゴール
- 10/18: Submission Ready 100%
- 10/19: Docs Single Source of Truth（実装と文書の差分ゼロ）

## 2. スコープ / 非スコープ
- スコープ
  - Shopify申請一式の最終化（文面・スクショ・チェックリスト・証跡）
  - 課金/グローバルGDPR webhookの検証と証跡化
  - ドキュメント棚卸し・アーカイブ・更新・ADR作成
  - 実装差分トリアージ（P0/P1/P2）とP0/P1の即日是正
- 非スコープ
  - 新機能の追加開発（クリティカル修正を除く）
  - パフォーマンス大規模最適化（計測のみ可）

## 3. タイムライン
- 2025-10-18（土）: 申請準備の完了（提出可能状態）＋ P0/P1の即日是正
- 2025-10-19（日）: 文書整備・整合性回復の完了、残P1の収束または次スプリント移管

## 4. 体制・担当
- Kenji（PM/Docs）: 申請文書、チェックリスト統合、台帳運用、文書体系整理、ADR
- Yuki（FE）: スクショ、画面E2E確認、OAuth/スコープ検証、FEギャップ対応
- Takashi（BE）: 課金0円テスト、GDPR webhook、監視/ログ、DBトラッキング、BEギャップ対応

## 5. 完了の定義（DoD）
- 10/18: docs/00-production-release/RELEASE-CHECKLIST.md の必須項目100%達成、提出物・証跡が揃う、P0/P1ギャップは是正済みまたは対処方針とETAが台帳に記載
- 10/19: docs と実装の矛盾ゼロ、古い文書は docs/_archive/2025-10-19/ に移動、PMトラッカー/リスク更新、残P1はIssue化と担当・ETA確定

## 6. トリアージ方針（基準）
- P0: 提出可否・致命的動作（課金/GDPR/認証/主要画面）を阻害するもの（即日修正）
- P1: 提出品質/検証の信頼性を下げるもの（当日または翌日で収束）
- P2: 将来改善（次スプリントへ移管）
- 運用: 台帳に起票（担当/優先度/期限/根拠/証跡リンク）、変更のたび更新

## 7. KPI
- 10/18: チェックリスト必須項目達成率100%、P0/P1未解消件数=0（またはETA確定）
- 10/19: 文書矛盾0件、アーカイブ/更新完了、PMトラッカー最新、残P1はすべてIssue化済

## 8. 作業分解（WBS 参照）
- 詳細は docs/01-project-management/wbs/2025-10-18-19-wbs.md

## 9. コミュニケーション計画
- 日次（朝/夕）で進捗共有: ai-team/conversations/report_kenji.md に要約
- 重要決定はADR化: docs/02-architecture/05-ADR/
- 即時連絡: ai-team/conversations/to_kenji.md / to_all.md

## 10. 依存/参照ドキュメント
- docs/01-project-management/gap-triage/2025-10-18-gap-triage-ledger.md
- docs/00-production-release/RELEASE-CHECKLIST.md
- docs/00-production-release/shopify-submission/screenshot-guide.md
- docs/06-shopify/02-課金システム/04-理解と運用/課金0円テスト完全手順書.md
- docs/00-production-release/09-test-procedures/画面別機能テストチェックリスト.md
- docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md

## 11. イテレーション内チェックポイント
- 10/18 11:00: 初回トリアージ完了（台帳初版）
- 10/18 15:00: P0/P1の進捗確認（未解消はETA再設定）
- 10/18 18:00: 提出物・証跡・ギャップ状況の最終確認（All）
- 10/19 13:00: 差分棚卸し収束、残P1の処置方針確定
- 10/19 18:00: 矛盾ゼロ判定と次スプリント残課題の確定（All）

## 12. 出力一覧
- 申請文書/スクショ/チェックリスト最新版、ギャップ台帳（10/18）
- 差分棚卸し結果、アーカイブツリー、PM-003/PM-004更新、必要なADR、残P1のIssueリンク（10/19）
