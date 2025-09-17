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

## 2025-09-17 21:45 依頼（スクリーンショット/環境前提確認/E2E準備）

### 1) スクリーンショット取得（申請用）
- 保存先: `docs/00-production-release/shopify-submission/assets/`
- 対象（例）
  - ダッシュボード
  - 分析3画面（前年同月比/購入回数/休眠顧客）
  - 課金画面（プラン表示/アップグレード導線）
  - 設定画面
- 参考: `docs/00-production-release/shopify-submission/screenshot-guide.md`

### 2) Shopifyパートナー側設定の最終確認
- OAuthリダイレクトURL/スコープ、アプリURLの整合
- Webhook登録（URLはバックエンド公開URLで）
  - `customers/data_request` → `/api/webhooks/customers/data_request`
  - `customers/redact` → `/api/webhooks/customers/redact`
  - `shop/redact` → `/api/webhooks/shop/redact`
  - `app/uninstalled` → `/api/webhooks/app/uninstalled`

### 3) 環境変数・前提条件の棚卸し（Staging）
- `Shopify:WebhookSecret`, `AppUrl`, 課金関連の設定確認
- APIベースURLをフロント/バックで統一（`NEXT_PUBLIC_API_URL`）

### 4) E2E実施準備（明日AM）
- テストストアの用意
- 通しシナリオ確認（インストール→課金確認→Webhook反映→解放、GDPR再送/順不同の冪等確認）

### 報告
- 進捗と成果物のパスを `ai-team/conversations/to_kenji.md` に記載お願いします。

## 2025-09-17 22:42 依頼追加（DBマイグレーション適用 担当: 福田）

### 対象
- `docs/04-development/03-データベース/マイグレーション/` 配下の最新スクリプト
  - 例: `2025-08-13-AddWebhookEventsTable.sql`, `2025-08-24-AddGDPRTables.sql`, `2025-08-26-free-plan-feature-selection.sql`

### 実施内容
1. Staging DBへ順序通り適用（外部キー・依存関係に注意）
2. 適用後に基本動作確認（WebhookEvents書き込み、FeatureSelection既存データ整合）
3. `docs/04-development/03-データベース/マイグレーション/database-migration-tracking.md` を更新（✅ 適用済 (YYYY-MM-DD HH:mm)）
4. 本番適用手順の確認（リハーサル項目洗い出し）

### 連携
- Takashi: 手順レビュー/適用後検証/不具合切り分け支援
- Kenji: tracking.mdレビュー・承認

### 報告
- 実施結果と更新箇所を `ai-team/conversations/to_kenji.md` へ記載