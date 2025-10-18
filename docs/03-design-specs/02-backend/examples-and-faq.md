# 使用例とFAQ

## クイックスタート（ローカル）
1) 環境変数設定（`appsettings.Development.json` または環境変数）
2) DB準備: 接続文字列を設定し起動（必要なら`/db-test`で疎通）
3) 起動: `dotnet run`（Swagger: `/swagger`）

## 認証トークンの取得
```http
POST /api/auth/token
Content-Type: application/json

{ "storeId": 1, "shopDomain": "dev-shop.myshopify.com" }
```
レスポンスの`accessToken`を以降の`Authorization: Bearer`に付与。

## プラン一覧の取得
```http
GET /api/billing/plans
Authorization: Bearer <token>
```

## 無料プラン機能選択
```http
POST /api/feature-selection/select
Authorization: Bearer <token>
X-Idempotency-Token: <uuid>
Content-Type: application/json

{ "feature": "dormant_analysis" }
```

## 初期同期の開始
```http
POST /api/sync/initial
Authorization: Bearer <token>
Content-Type: application/json

{ "dataTypes": ["products","customers","orders"], "range": "last_90d" }
```

---

## FAQ
- Q. WebhookのHMAC検証はどこで行われますか？
  - A. `HmacValidationMiddleware` と `ShopifyHmacVerificationHelper` で検証します。

- Q. 無料プランのアクセス制御はどこで判定しますか？
  - A. `FeatureAccessMiddleware` がサーバー側で判定します。フロントは表示制御のみです。

- Q. Hangfireダッシュボードにアクセスするには？
  - A. `/hangfire` です。`HangfireAuthorizationFilter` で保護されています。

- Q. 課金の確認URL→コールバックの流れは？
  - A. `BillingController`→`ShopifySubscriptionService` がURL生成し、承認後はWebhook `subscriptions-update` または確認エンドポイントで確定します。

- Q. GDPRの顧客データ要求/削除は非同期ですか？
  - A. はい。即時200を返し、ジョブ（Hangfire）で非同期処理を行います。

## 関連リンク（GDPR 正本）
- 仕様: [GDPR_Webhook仕様](../../00-production-release/gdpr-compliance/GDPR_Webhook仕様.md)
- 実装状況: [実装状況確認と対応方針](../../00-production-release/gdpr-compliance/実装状況確認と対応方針.md)
- 計画: [実装計画書](../../00-production-release/gdpr-compliance/実装計画書.md)