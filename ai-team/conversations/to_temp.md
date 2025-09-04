00-production-releaseフォルダ以下の資料から「作成者」の記載を削除してください



`ai-team/`　フォルダを整理したい

提案: サブフォルダ化で情報を整理できます。下記「標準プラン」を推奨。OKならそのまま作成・移動・索引追加まで実行します。

## 提案フォルダ構成（標準）
- `ai-team/conversations/`（現状維持）
- `ai-team/knowledge/`（現状維持）
- `ai-team/handover/`（現状維持）
- `ai-team/meetings/`（会議準備・アジェンダ・定例ノート）
- `ai-team/reports/`（日次・週次・完了報告）
- `ai-team/schedules/`（作業計画・スケジュール）
- `ai-team/decisions/`（決定事項・合意ログ）
- `ai-team/templates/`（雛形・フォーマット）
- `ai-team/_archive/`（役目を終えた置き場）
- `ai-team/README.md`（索引・運用ルール）

## 具体的な移動案（例）
- meetings:
  - `work_continuation_guide_20250813.md`
  - `work_continuation_guide_20250812*.md`
- reports:
  - `work-report-20250812.md`
  - `work_summary_20250812_pm.md`
  - `daily-summary-20250812.md`
- schedules:
  - `work_schedule_20250812.md`
  - `progress-tracker-20250812.md`
- decisions:
  - `decision_20250812.md`
- templates:
  - `FILE_STRUCTURE_RULES.md`（または `knowledge/` でも可）
- conversations（現状通り）:
  - `to_*.md`, `report_*.md`, `memo.md`, `temp.md`

## 運用ルール（要旨）
- 新規作成時は上記カテゴリ配下に配置（迷う場合は meetings/reports/schedules のいずれか）
- 1週間以上更新がないドラフトは `_archive/` へ退避
- `ai-team/README.md` に索引と更新履歴を集約