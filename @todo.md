# 今日のタスク（Kenji/福田サポート）

- [~] 本日の優先タスクを提案し確認（Kenji/福田）
  - 優先度: 🟡 重要
  - 依存関係: なし
  - 見積時間: 15分

- [ ] 環境変数SHOPIFY_FRONTEND_BASEURLの確認・設定（リダイレクト不具合対策）
  - 詳細: Azure App Service の Application Settings に `SHOPIFY_FRONTEND_BASEURL` を設定・確認
  - 依存関係: なし
  - 見積時間: 20分

- [ ] リダイレクト確認テスト（インストール→コールバックまで）
  - 詳細: `ShopifyAuthController.cs` の `GetRedirectUri()` が期待どおりのURLを出すか E2E確認
  - 依存関係: 環境変数設定
  - 見積時間: 30分

- [ ] DBマイグレーション適用状況の更新（tracking.md）
  - 詳細: `2025-08-13-AddWebhookEventsTable.sql` の Development/Staging/Production の適用状況更新
  - 依存関係: 実行可否の確認（権限/接続）
  - 見積時間: 30分

- [ ] HangFireダッシュボード稼働確認（/hangfire）
  - 詳細: プロセス起動・ダッシュボード到達性・ジョブの成功実行を確認
  - 依存関係: バックエンド起動
  - 見積時間: 20分

- [ ] 申請素材・文言のステータス確認と不足洗い出し
  - 詳細: アイコン/カバー/スクショ/説明文/規約の最新状況確認し、担当へフォロー
  - 依存関係: 作業引継ぎガイドの指示
  - 見積時間: 30分

- [ ] フロントエンドの型エラー確認（0を維持）
  - 詳細: `frontend` で型チェック実行、差分がないか確認
  - 依存関係: なし
  - 見積時間: 10分

---

## メモ
- ドキュメント上のディレクトリ表記と実体が一部異なるため注意：
  - 表記: `docs/04-development/database-migrations/`
  - 実体: `docs/04-development/03-データベース/マイグレーション/`
- マイグレーション適用後は必ず `database-migration-tracking.md` を更新すること。
