# Controllers - ルートと主要エンドポイント一覧

> 形式: `BaseRoute` + 各HTTPメソッド毎の相対パス

## AuthController (`api/auth`)
- POST `token` : 開発用アクセストークン発行（Shopify OAuth検証はTODO）
- POST `refresh` : アクセストークン更新（DB検証TODO）
- POST `validate` : トークン検証（要JWT）

## BillingController (`api/billing`)
- GET `plans` : 利用可能プラン一覧
- GET `current` : 現在のサブスクリプション
- GET `info` : プラン+現在の契約状況まとめ
- POST `subscribe` : 作成/更新（確認URL返却）
- POST `cancel` : キャンセル
- POST `change-plan` : プラン変更
- POST `start-trial` : 無料トライアル開始

## SubscriptionController (`api/subscription`)
- GET `status`
- GET `plans`
- POST `create`
- GET `confirm`
- POST `cancel`
- GET `history`
- POST `change-plan`

## WebhookController (`api/webhook`)
- POST `uninstalled` : アンインストール
- POST `customers-redact` : 顧客削除
- POST `shop-redact` : ショップ削除
- POST `customers-data-request` : 顧客データ要求
- POST `subscriptions-update` : サブスク更新
- POST `subscriptions-cancel` : サブスク取消

## FeatureSelectionController (`api/feature-selection`)
- GET `current` : 現在の選択機能
- POST `select` : 機能選択/変更
- GET `available-features` : 利用可能機能一覧
- GET `usage/{feature}` : 使用状況
- GET `check-access/{feature}` : アクセス可否
- GET `debug/limits` : 制限デバッグ

## SyncController (`api/sync`)
- POST `initial` : 初期同期開始
- GET `status/{syncId}` : 同期状態
- GET `latest` : 最新同期
- GET `status` : 状態一覧
- GET `history` : 履歴
- POST `trigger` : 手動トリガー
- GET `progress` : 進捗

## SyncManagementController (`api/SyncManagement`)
- POST `start-sync`
- GET `progress/{storeId}/{dataType}`
- GET `progress-details/{syncStateId}`
- GET `checkpoint/{storeId}/{dataType}`
- DELETE `checkpoint/{storeId}/{dataType}`
- GET `range-setting/{storeId}/{dataType}`
- PUT `range-setting/{storeId}/{dataType}`
- GET `history/{storeId}`
- GET `statistics/{storeId}`

## ManualSyncController (`api/ManualSync`)
- POST `sync-products/{storeId}`
- POST `sync-customers/{storeId}`
- POST `sync-orders/{storeId}`
- POST `sync-all/{storeId}`
- POST `cancel/{syncStateId}`
- POST `reschedule-recurring-jobs` : 定期ジョブ再登録
- PUT  `schedule/{storeId}` : 予約設定

## HangFireJobController (`api/HangFireJob`)
- POST `sync-products/{storeId}`
- POST `sync-all-products`
- POST `register-recurring-jobs`
- DELETE `recurring-job/{jobId}`
- POST `test-job`

## ShopifyAuthController (`api/shopify`)
- GET `install`
- GET `callback`
- POST `process-callback`
- GET `test-config`
- GET `test-hybrid-mode`
- GET `test-oauth-url`
- GET `test-settings`
- POST `test-encryption`

## ShopifyHmacTestController (`api/shopify/hmac-test`)
- POST `verify-all-methods`
- GET `simulate-callback`

## EmbeddedAppController (`api/EmbeddedApp`)
- GET `config`
- GET `status`
- POST `test-notification`

## SetupController (`api/setup`)
- GET `status`
- POST `complete`

## StoreController (`api/Store`)
- GET `{id}`
- GET `test`

## PurchaseController (`api/Purchase`)
- GET `count-analysis`
- GET `count-summary`
- GET `count-trends`
- GET `segment-analysis`
- GET `test`
- GET `quick-stats`

## AnalyticsController (`api/Analytics`)
- GET `year-over-year`
- GET `product-types`
- GET `vendors`
- GET `date-range`
- GET `monthly-sales`
- GET `monthly-sales/summary`
- GET `monthly-sales/categories`
- GET `monthly-sales/trends`
- GET `test`

## CustomerController (`api/Customer`)
- GET `dashboard`
- GET `segments`
- GET `details`
- GET `details/{customerId}`
- GET `top`
- GET `test`
- GET `dormant`
- GET `dormant/summary`
- GET `dormant/detailed-segments`
- GET `{customerId}/churn-probability`
- GET `debug/store-data`

## DatabaseController (`api/Database`)
- GET `test`
- POST `initialize`
- GET `customers`
- GET `customers/stats`
- POST `import/customers`
- GET `stats`
- GET `cors-test`
- GET `connection-info`
- POST `update-customer-totals`

## DashboardController (`api/Dashboard`)
- POST `refresh`
- GET `sync-status/{storeId}`

## DebugController (`api/Debug`)
- GET `investigate-product-count`

## DormantTestController (`api/dormant-test`)
- GET `customers`
- GET `customers/{customerId}`
- GET `count`
- GET `performance-test`

## HealthController (`api/Health`)
- GET `detailed`

---

## 注記: GDPRエンドポイントの表記は `/api/webhook/...` に統一

本文中のGDPR関連エンドポイントは実装（`WebhookController`）に合わせて `/api/webhook/*` に統一済みです。過去ドキュメントに見られる `/api/webhooks/...` 表記は互換注記として残し、参照先（旧版）に明示します。

- 統一済み方針: `/api/webhook/{topic}`（例: `/api/webhook/customers-redact`）
- 互換注記: 旧表記 `/api/webhooks/...` は参照互換として明記
- 対象: `uninstalled` / `customers-redact` / `shop-redact` / `customers-data-request` / `subscriptions-update` / `subscriptions-cancel`

### 参考（正本）
- GDPR仕様（正本）: `docs/00-production-release/03-gdpr-compliance/GDPR_Webhook仕様.md`
- 実装状況/対応方針: `docs/00-production-release/03-gdpr-compliance/実装状況確認と対応方針.md`

## 関連リンク（GDPR 正本）
- 仕様: [GDPR_Webhook仕様](../../00-production-release/gdpr-compliance/GDPR_Webhook仕様.md)
- 実装状況: [実装状況確認と対応方針](../../00-production-release/gdpr-compliance/実装状況確認と対応方針.md)
- 計画: [実装計画書](../../00-production-release/gdpr-compliance/実装計画書.md)

## 変更点（スラッグ安定化）
- 表記統一: GDPRエンドポイントを `/api/webhook/...` に統一（旧 `/api/webhooks/...` は注記で互換案内）
- 参照追加: 正本 `gdpr-compliance/*` の仕様・実装状況・計画への相対リンクを追加
- スラッグ安定化: 既存見出し名を変更せず、将来のアンカー崩れを防止