# Services - 責務と主要メソッド

> 代表的な責務、外部依存、注意点（冪等性/例外/パフォーマンス）を記載

## 認証/ストア
- TokenService: JWT生成/検証。クレーム: store_id, shop_domain, tenant_id
- StoreService: Store取得/登録/更新。
- StoreValidationService: ストア状態/設定の検証（起動時/ヘルス用途）
- ShopifyOAuthService: OAuth URL生成・code交換・HMAC検証

## 課金
- ShopifySubscriptionService
  - GetAvailablePlansAsync
  - CreateOrUpdateSubscriptionAsync
  - ChangePlanAsync / CancelSubscriptionAsync
  - StartFreeTrialAsync
  - Webhook連動（subscriptions-update/cancel）と`StoreSubscriptions`更新

## GDPR/データクリーン
- GDPRService
  - CreateRequestAsync(shop, type, payload)
  - ProcessCustomerRedactAsync / ProcessShopRedactAsync
  - ProcessCustomerDataRequestAsync（エクスポート。Azure Blob等の外部連携前提）
- DataCleanupService: 物理/論理削除、スケジュール削除（Hangfire活用）

## 分析（購入回数・前年同月比・月別売上）
- PurchaseCount.*（Data/Calculation/Analysis/Orchestration）
  - GetSimplifiedPurchaseCountAnalysisAsync / GetPurchaseCountAnalysisAsync
- YearOverYear.*
  - データ取得/計算/フィルタ/オーケストレーション
- MonthlySalesService: 月次売上/カテゴリ別/トレンド集計

## 休眠顧客
- Dormant.*（Query/Statistics/Segmentation/Trend/Analytics/Churn/Reactivation）
  - セグメント集計、リスク推定、再活性化候補抽出

## 同期
- ShopifyApiService: Shopify Admin API呼び出し（HttpClientFactory）
- ShopifyDataSyncService: 差分取得、保存、チェックポイント更新
- Sync.CheckpointManager / SyncRangeManager / SyncProgressTracker
  - 中断/再開・範囲指定・詳細進捗

## 補助
- DatabaseService / MockDataService / CustomerDataMaintenanceService
- ShopifyHmacVerificationHelper: コールバック/サイン検証

## パフォーマンス/信頼性の注意
- すべての外部呼び出しはリトライ/タイムアウト設定（Polly）を前提に
- 大規模集計はページング・インデックス確認（設計書参照）
- Webhook処理は即時200＋非同期でジョブ投入（Hangfire/Queue）
