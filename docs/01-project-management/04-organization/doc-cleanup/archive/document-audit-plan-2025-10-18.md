# [Archived] ドキュメント監査計画 - 2025-10-18

このファイルは整理のためアーカイブされました。最新版は `docs/01-project-management/04-organization/doc-cleanup/audit-plan.md` を参照してください。

---

# ドキュメント監査計画 - 2025-10-18

## 目的
- docs配下の重複・誤情報を排除し、単一の正本構造へ再編する。

## 範囲/優先順位
1) 00-production-release（提出物直結）
2) 06-shopify（課金/GDPR正本統合）
3) 03-design-specs（現行実装との整合確認）
4) 01-project-management と 01-project-report の重複解消

## 手順
1. インベントリ確認（完了）
2. 監査チェック（スコアリング）
3. ギャップ台帳へ起票（P0/P1/P2）
4. 統合/更新/アーカイブの具体アクション
5. リンク張替えと索引更新

## 成果物
- 監査チェックリスト更新：docs/01-project-management/04-organization/document-audit-checklist-2025-10-18.md
- ギャップ台帳更新：docs/01-project-management/gap-triage/2025-10-18-gap-triage-ledger.md
- 統合/アーカイブのPR（複数）

## スケジュール
- 10/18 午前: 00-production-release の監査と統合案作成
- 10/18 午後: P0/P1修正と提出物更新
- 10/19 午前: 06-shopify/03-design-specs の監査
- 10/19 午後: 重複解消、リンク張替え、索引更新

## 判定/承認
- 判定: Kenji（基準/整合性）、実装確認: Yuki/Takashi
- 変更承認: Kenji（PM）

## リスクと緩和
- 大量のリンク切れ: 一括検索→張替え手順化
- 実装との差分大: アーカイブ先行で整合回復→後続で加筆
- 時間超過: 提出物関連（P0/P1）を優先
