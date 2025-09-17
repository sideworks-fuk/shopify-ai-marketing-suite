# Excel移行用CSVの使い方

- 目的: `RELEASE-TASK-DASHBOARD.md` の内容をExcel共有用に移行するためのCSV雛形。
- 置き場所: 本ディレクトリ直下（`docs/00-production-release/`）

## ファイル
- `excel_release_tasks.csv`: リリースタスク管理表
- `excel_issue_tracker.csv`: 課題・ブロッカー管理表

## 列定義（共通）
- No: 通し番号
- Category: カテゴリ（Critical/High/Medium/Low）
- Task: タスク名（短め）
- Detail: 詳細（必要に応じて）
- Owner: 担当（Yuki/Takashi/Kenji/Fukuda）
- Due: 期限（YYYY-MM-DD）
- Status: 状態（Not Started/In Progress/Blocked/Done）
- Source: 出典ドキュメントへの相対パス
- Evidence: PR/スクショ/ログなどのリンク

## 運用
1. CSVで管理し、必要に応じてExcelへインポート。
2. Excel提出が必要な場合、列構成はそのままExport。
3. 出典は`RELEASE-TASK-DASHBOARD.md`の該当行を参照して記載。

## Excel作成手順（実務）
1. 新規ブックを作成 → シート名を `ReleaseTasks` / `Issues` に変更
2. データ取り込み
   - Data > From Text/CSV で `excel_release_tasks.csv` を `ReleaseTasks` に、`excel_issue_tracker.csv` を `Issues` に読み込み
   - 文字コード: UTF-8、区切り: カンマ、列型: 自動（日付列は日付型）
3. 表示整形
   - フィルターON、ヘッダー行を太字
   - Freeze Panes: 1行目（ヘッダー）
4. 条件付き書式（`ReleaseTasks`/`Issues` 共通）
   - Status が `Blocked`/`Not Started` → 赤、`In Progress` → 黄、`Done`/`Dev Done (Verify Pending)` → 緑
5. 列幅・印刷
   - 列幅を内容に合わせて自動調整、横向き印刷/余白狭め
6. 保存
   - `docs/00-production-release/EC-Ranger-Progress-Board.xlsx` に保存（上書き運用）

備考
- 顧客共有版は読み取り専用にし、編集はCSV→再取り込みで追従
- 備考列に Stg/Prod の `NEXT_PUBLIC_API_URL` を記載可
