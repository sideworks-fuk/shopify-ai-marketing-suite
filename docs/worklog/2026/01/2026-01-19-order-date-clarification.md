# 作業ログ: 注文/顧客/商品日時の意味明確化

## 作業情報
- 開始日時: 2026-01-19 22:32:20
- 完了日時: 2026-01-19 22:35:03
- 所要時間: 0時間2分43秒
- 担当: 福田＋AI Assistant

## 作業概要
Orders/Customers/Productsの日時を「Shopify側の日時」と「DB登録日時」に分離し、分析クエリをShopify日時基準へ修正。

## 実施内容
1. モデルに `ShopifyCreatedAt` / `ShopifyUpdatedAt` / `SyncedAt` を追加
2. 同期処理でShopify日時と同期日時を保存するよう修正
3. 分析/表示クエリを `ShopifyCreatedAt` 優先へ変更
4. EF Coreマイグレーション作成・移行管理ドキュメント更新

## 成果物
- backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs（日時カラム追加）
- backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs（JSONマッピング・Upsert更新）
- backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs（同期保存修正）
- backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs（同期保存修正）
- backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs（同期保存修正）
- backend/ShopifyAnalyticsApi/Services/*（分析クエリ更新）
- backend/ShopifyAnalyticsApi/Controllers/*（表示日時の参照更新）
- backend/ShopifyAnalyticsApi/Migrations/20260119132903_AddShopifyTimestampsAndSyncedAt.cs
- docs/05-development/03-データベース/マイグレーション/2026-01-19-AddShopifyTimestampsAndSyncedAt.sql
- docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md
- docs/03-feature-development/データ同期機能/2026-01-19-データ同期機能ソースレビュー.md
- docs/05-development/03-データベース/運用/2026-01-19-clear-sync-data-for-testing-v2.sql

## 課題・注意点
- 既存データはShopify日時が未設定のため、必要に応じてデータ削除→再同期で整合性を確保

## 追加対応（2026-01-19 23:40）
- `OrderNumber` のユニーク制約を `StoreId + OrderNumber` 複合に変更（マルチテナント対応）
  - backend/ShopifyAnalyticsApi/Data/ShopifyDbContext.cs（インデックス定義修正）
  - backend/ShopifyAnalyticsApi/Migrations/20260119144014_FixOrderNumberUniqueConstraint.cs
  - docs/05-development/03-データベース/マイグレーション/2026-01-19-FixOrderNumberUniqueConstraint.sql

## 関連ファイル
- tasks/task-260119-order-date-clarification.md
