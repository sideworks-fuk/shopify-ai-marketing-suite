# ADR-002: GDPR正本統一とレポート命名規約

## ステータス
承認

## コンテキスト
- GDPR関連文書が複数場所に重複しており、参照先が分散していた
- チーム報告の命名が統一されておらず、混乱を招く場面があった

## 決定
1. GDPR関連の正本は `docs/00-production-release/03-gdpr-compliance/*` に統一する
   - 旧フォルダ（`docs/06-shopify/03-GDPR/*`, `docs/06-shopify/04-GDPR対応/*`）は参照化し、将来アーカイブ
2. レポート命名規約を `ai-team/conversations/report_[名前].md` に統一する
   - 例: `report_yuki.md`, `report_takashi.md`, `report_kenji.md`

## 影響
- 文書の単一参照先が確立され、リンクの整合性・検索性が向上
- 報告ファイルの発見性と履歴管理が改善

## 実施
- 旧GDPR文書に参照化ヘッダーを追記（移動/削除なし）
- 各所に「関連リンク（GDPR 正本）」節を追加
- レポート命名規約を `to_all.md` と `to_kenji.md` に明記

## 代替案
- 既存フォルダに残して索引用READMEを作る案 → 正本が二重化し、更新漏れリスクが高い

## フォローアップ
- `docs/01-project-report/*` は `docs/99-archive/2025-10-19/` へ移動済み
- GDPRリンク張替えは `doc-cleanup/link-update-plan.md` に沿って継続実施

## 参考
- `docs/01-project-management/04-organization/doc-cleanup/decisions.md`
- `docs/01-project-management/04-organization/doc-cleanup/gdpr-unification-plan.md`
