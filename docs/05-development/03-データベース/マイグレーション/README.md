# データベースマイグレーション運用ポリシー

最終更新: 2025-08-24
作成: ERIS（サポート: 福田）

## 目的
- DDLの保管場所を一本化し、適用状況を追跡可能にする

## 標準配置
- 正式な運用DDLの格納先: `docs/05-development/03-データベース/マイグレーション/`
- 開発途中・検証用DDL（自動生成含む）: `backend/ShopifyAnalyticsApi/Migrations/`
  - 完了したらdocs配下へ移送し、`database-migration-tracking.md` を更新

## 作業の流れ
1) SQL作成（またはEF Migration作成）
2) Developmentへ適用 → 結果確認
3) SQLをdocs配下へ配置（命名: `YYYY-MM-DD-説明.sql`）
4) `database-migration-tracking.md` に適用状況・日時を記録
5) Staging → Production の順で適用・記録

## 命名規則
- `YYYY-MM-DD-<簡潔な説明>.sql`
- 例: `2025-08-13-AddWebhookEventsTable.sql`

## 追跡ドキュメント
- `database-migration-tracking.md` を単一の真実源(Single Source of Truth)とする

## 注意事項
- 破壊的変更（Drop/型変更）は必ずロールバック手順を併記
- 大規模DDLはメンテ時間を確保し、事前周知
- 性能影響のあるインデックス作成は時間帯を考慮

