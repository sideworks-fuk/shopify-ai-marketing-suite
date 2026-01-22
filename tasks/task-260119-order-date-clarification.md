# タスク: 注文/顧客/商品日時の意味明確化

## タスク情報
- タスクID: 260119-order-date-clarification
- 作成日: 2026-01-19
- 優先度: 高
- 状況: 進行中

## 作業内容

### 目標
Orders/Customers/Productsの日時を「Shopify側の日時」と「DB登録日時」に分離し、分析クエリをShopify日時基準に統一する。

### 前提条件・制約
- 既存の `CreatedAt` / `UpdatedAt` はDBレコード作成/更新日時として扱う
- `ShopifyCreatedAt` / `ShopifyUpdatedAt` / `SyncedAt` を追加
- 分析クエリはShopify日時を優先し、旧データは `CreatedAt` をフォールバック
- EF Core Migrationを作成し、`database-migration-tracking.md` を更新

### 作業ステップ
- [x] 影響範囲の調査（同期処理・分析クエリ）
- [x] モデル変更 + マイグレーション作成
- [x] 同期処理・分析クエリの修正
- [x] ドキュメント更新
- [x] OrderNumberユニーク制約のStoreId複合化対応
- [ ] 動作確認（必要に応じてローカル同期テスト）

## 進捗メモ
- [2026-01-19 22:32] 影響範囲調査・モデル変更・マイグレーション作成・クエリ修正・ドキュメント更新まで実施
- [2026-01-19 23:40] OrderNumberユニーク制約をStoreId複合に変更（マルチテナント対応）

## 完了条件
- 追加カラムがDBに反映されている（Migration適用）
- 分析クエリがShopify日時基準になっている
- 作業ログと移行管理ドキュメントが更新されている

## 関連ファイル
- backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs
- backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs
- backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs
- backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs
- backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs
- backend/ShopifyAnalyticsApi/Services/* (分析クエリ)
- backend/ShopifyAnalyticsApi/Controllers/* (注文/顧客/商品表示)
- backend/ShopifyAnalyticsApi/Migrations/20260119132903_AddShopifyTimestampsAndSyncedAt.cs
- backend/ShopifyAnalyticsApi/Migrations/20260119144014_FixOrderNumberUniqueConstraint.cs
- backend/ShopifyAnalyticsApi/Data/ShopifyDbContext.cs（OrderNumberインデックス修正）
- docs/05-development/03-データベース/マイグレーション/2026-01-19-AddShopifyTimestampsAndSyncedAt.sql
- docs/05-development/03-データベース/マイグレーション/2026-01-19-FixOrderNumberUniqueConstraint.sql
- docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md
- docs/03-feature-development/データ同期機能/2026-01-19-データ同期機能ソースレビュー.md
- docs/05-development/03-データベース/運用/2026-01-19-clear-sync-data-for-testing-v2.sql