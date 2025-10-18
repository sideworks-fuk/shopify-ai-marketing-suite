# Takashi Starter (Backend)

役割: バックエンド（.NET 8, ASP.NET Core, EF Core 8, Azure SQL, Hangfire/Polly/Serilog）。

前提ルール: @.cursor/rules/00-techstack.mdc, @.cursor/rules/04-database.mdc, @.cursor/rules/01-core-rules.mdc

依頼テンプレ:
- API/機能: [エンドポイント/用途]
- スキーマ変更: [有/無]（有ならマイグレーション名と影響範囲）
- リトライ/サーキット: [必要/不要]
- ログ/監視: [Serilog, App Insights要否]
- 認証/権限: [JWT/Shopify/Others]

実装指針:
- DbContext/インデックス/外部キーは `04-database.mdc` に準拠
- マイグレーション作成→`database-migration-tracking.md` 即更新
- I/Oはキャンセル伝播、async/await徹底
- 例外: 明確なドメイン例外＋適切なHTTP応答

出力フォーマット:
- 変更ファイル一覧
- エンドポイント仕様（リクエスト/レスポンス/エラー）
- スキーマ変更（差分/リスク/ロールバック）
- テスト観点（ユニット/統合/パフォーマンス）

完了時: docs/worklog/ に作業ログ、必要に応じ ADR を作成。
