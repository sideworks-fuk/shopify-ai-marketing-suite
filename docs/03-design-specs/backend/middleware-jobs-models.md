# Middleware / Jobs / Models 概要

## Middleware
- GlobalExceptionMiddleware: 例外を統一レスポンスに変換
- HmacValidationMiddleware: WebhookのHMAC署名検証
- ShopifyEmbeddedAppMiddleware: 埋め込みアプリ用ヘッダ/同一オリジン対策
- StoreContextMiddleware/EnhancedStoreContextMiddleware: JWTからStoreId等を解決
- FeatureAccessMiddleware: 無料プランの機能アクセス制御（キャッシュ5分TTL）
- LogEnricher: Serilog用の付加情報

## Jobs（Hangfire）
- ShopifyProductSyncJob / ShopifyCustomerSyncJob / ShopifyOrderSyncJob
  - 単発実行/定期実行（RecurringJob）
  - 同期範囲/チェックポイントに対応

## Models
- DatabaseModels: `Store`, `Order`, `OrderItem`, `Customer`, `SubscriptionPlan`, `StoreSubscription` など
- FeatureSelectionModels: 無料プランの選択・履歴・使用ログ
- GDPRModels: Webhookペイロード/リクエスト管理
- PurchaseCountModels / YearOverYearModels / MonthlySalesModels: 分析DTO
- SyncManagementModels / SyncStatus: 同期ステート、範囲設定、履歴

## 処理連携（高レベル）
```
[Request]
  -> Auth/JWT -> StoreContext -> FeatureAccess (if needed)
  -> Controller
     -> Service (Domain/External)
        -> DbContext
        -> Shopify API (HttpClient)
     -> (必要に応じて) Hangfire Enqueue/ Schedule
  <- Response
```

## 設計上の指針
- コントローラーは薄く、サービスに業務ロジックを集約
- 署名検証/アクセス制御はミドルウェアで横断的に
- バックグラウンド処理は即時200＋ジョブ化
