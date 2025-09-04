# 福田さんへの依頼事項
From: Kenji (PM)
Date: 2025-08-24
Priority: 最優先

## 🎉 実装完了報告と緊急依頼

福田さん、Takashiがバックエンド実装を完了しました！
以下の緊急作業をお願いします。

## 緊急作業依頼

### 1. 🚨 データベースマイグレーション適用（最優先）

Takashiが作成した新しいマイグレーションファイルを適用してください：

**ファイル**: `docs/04-development/database-migrations/2025-08-24-AddWebhookEventsTable.sql`

**適用コマンド**:
```bash
sqlcmd -S (localdb)\MSSQLLocalDB -d ShopifyAnalytics -i "2025-08-24-AddWebhookEventsTable.sql"
```

**作成されるテーブル**:
- WebhookEvents（Webhook履歴管理）
- SubscriptionPlans（プラン管理、サンプルデータ付き）
- StoreSubscriptions（ストアごとのサブスクリプション）
- BillingHistory（課金履歴）

**適用後の作業**:
- `database-migration-tracking.md`を更新（適用日時記録）

### 2. 環境変数設定

以下の環境変数を設定してください：
```
Shopify:WebhookSecret=YOUR_WEBHOOK_SECRET
Shopify:TestMode=true
AppUrl=https://ec-ranger.azurewebsites.net
```

### 3. Webhook登録（Shopifyアプリ設定）

以下のWebhookを登録してください：
- `app_subscriptions/update` → `/api/webhook/subscriptions-update`
- `app_subscriptions/cancel` → `/api/webhook/subscriptions-cancel`
- `app/uninstalled` → `/api/webhook/uninstalled`

### 4. 統合テスト実施

マイグレーション適用後、以下のテストを実施：

#### 課金フロー検証チェックリスト使用
`docs\04-development\06-Shopify連携\課金フロー検証チェックリスト.md`に従って検証

#### 重点テスト項目
1. プラン選択→Shopify承認画面へのリダイレクト
2. 承認後のコールバック処理
3. 課金状態の同期確認
4. Webhook受信の確認

### 5. ドキュメント更新

#### 更新必要ファイル
- `/docs/06-shopify/02-課金システム/03-実装管理/実装チェックリスト.md`
- `database-migration-tracking.md`

#### 新規作成
- 本日の作業ログ（`/docs/worklog/2025/08/2025-08-24-billing-testing.md`）

## 進捗確認ポイント

- 14:00 - Takashi/Yukiの実装完了確認
- 15:00 - 統合テスト開始
- 16:00 - テスト結果まとめ
- 17:00 - 最終確認・ドキュメント更新

## 連携事項

### チーム間調整
- TakashiとYukiの実装が14:00頃に完了予定
- その後、統合テストを実施
- ブロッカーがあれば即座に調整

### 重要な確認事項
- 課金承認URLが正しく生成されるか
- Webhookが正しく受信できるか
- データベースに正しく保存されるか

## 質問・相談

不明点や問題があれば、即座に連絡してください。
特に環境設定やShopify側の設定で問題があれば、一緒に解決しましょう。

よろしくお願いします！

---
Kenji (AIプロジェクトマネージャー)