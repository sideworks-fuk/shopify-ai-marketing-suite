# To: Yuki（Frontend） - 2025-10-18 指示（文書整理）

## ゴール（本日）
- frontend関連ドキュメントの整合チェックと重複指摘、リンク修正案の提示（移動/削除は実施しない）

## ソース照合の前提（一次情報）
- フロント実装: `frontend/src/app/*`, `frontend/src/components/*`（実装を基準にドキュメントを評価）
- 差分は台帳に記載（P0/P1/P2）し、提案は各MD末尾の「提案」章に記載

## タスク（優先順）
1. `docs/03-design-specs/01-frontend/*` と `11-screen-designs/*` の棚卸し
   - 出力: 重複/旧版/誤情報の指摘を `doc-cleanup/audit-checklist.md` に記入
   - 期限: 本日 13:00（P0/P1中心）
2. リンク切れ・参照不整合の収集
   - 出力: 各ファイル末尾に「提案」章で相対リンクの修正案を列挙
   - 期限: 本日 17:00
3. 統合マッピング案の作成
   - 出力: `doc-cleanup/reorg-action-plan.md` に統合/アーカイブの「提案」行を追加（実行はPM側）
   - 期限: 本日 17:00
4. 文書の具体的修正（提案ベース、移動なし）
   - `docs/03-design-specs/01-frontend/api-config.md`: 使用例のimportを現行実装に整合する提案を末尾に追記
   - `docs/03-design-specs/01-frontend/routing-and-auth.md`: Clerk記述を「方針メモ」にダウングレードする提案を追記（実装はcookies＋middleware）
   - `docs/03-design-specs/01-frontend/page-billing.md`: Subscription前提とルート統一（/billing）についての提案を追記
   - `docs/03-design-specs/01-frontend/examples-and-faq.md`: 相対リンク整備の提案を追記
   - 期限: 本日 17:00

## 成果物の置き場
- 監査結果: `docs/01-project-management/04-organization/doc-cleanup/audit-checklist.md`
- マッピング案: `docs/01-project-management/04-organization/doc-cleanup/reorg-action-plan.md`
- メモ/結果: `ai-team/conversations/report_yuki.md` に要約

## 連絡
- ブロッカーがあれば即時で `ai-team/conversations/to_kenji.md` へ記載

## 追加指示（午後・文書整理専念／移動・削除は不可）

1) screen-designs の索引リンク整備
- 対象: `docs/03-design-specs/screen-designs/README.md` と配下
- 出力: 各README末尾に「提案」章を追加し、相対リンクの修正案リスト（チェックボックス形式）を追記
- 期限: 本日 16:00

2) /settings/billing → /billing の整合提案の明文化
- 対象: `docs/03-design-specs/01-frontend/page-billing.md`
- 出力: 「提案」章に、Next.jsでの参照/リダイレクト（どちらでも良い）サンプル方針を文章で追記（コードは不要）
- 期限: 本日 16:30

3) リンク更新計画への候補追加
- 対象: `docs/01-project-management/04-organization/doc-cleanup/link-update-plan.md`
- 出力: 「優先リンク更新」の箇所に、frontend関連で張替えが必要な箇所を箇条書きで追加（参照元→参照先）
- 期限: 本日 17:00

4) 監査台帳の追加起票（P1/P2も可）
- 対象: `doc-cleanup/audit-checklist.md`
- 出力: 本日の指摘分を表へ追記（根拠リンクは該当MD or 実装ファイル）
- 期限: 本日 17:00

## 追加指示（第2報・文書修正の確定作業）

1) 相対リンクの本文反映（提案→確定）
- 対象: `docs/03-design-specs/01-frontend/{routing-and-auth.md,page-billing.md,examples-and-faq.md,api-config.md}`
- 出力: 各本文中に相対リンク（関連章・関連ドキュメント）を実際に追記（提案ではなく確定記述）
- 期限: 本日 18:00

2) Frontendリンク張替え候補の具体化（8件以上）
- 対象: `doc-cleanup/link-update-plan.md`
- 出力: 「参照元 → 参照先」を具体パスで追記（例: screen-designs内の各README → 該当設計文書）
- 期限: 本日 18:00

3) `/settings/billing` 整合の文面仕上げ
- 対象: `page-billing.md`
- 出力: 「参照 or リダイレクト」いずれの運用でも成立するよう、注意点（ブックマーク/SEO/ナビ）を1段落で追記
- 期限: 本日 18:00

4) 報告（必須）
- `report_yuki.md` に完了内容、残件（あれば）を記載（18:00締切）
@