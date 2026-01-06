# データベース移行管理ドキュメント

## 概要
データベース変更スクリプトの管理と、環境別の適用状況を追跡するためのドキュメント。

## ディレクトリ構造
```
docs/05-development/03-データベース/マイグレーション/
├── database-migration-tracking.md (本ファイル)
├── 2025-08-02-EmergencyIndexes.sql
├── 2025-08-05-AddInitialSetupFeature.sql
├── 2025-08-13-AddWebhookEventsTable.sql
├── 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql
├── 2025-08-24-CreateBillingTables.sql
├── 2025-08-24-AddFeatureSelectionTables.sql
├── 2025-08-24-AddGDPRTables.sql
├── 2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql
├── 2025-08-25-FIX-free-plan-feature-selection.sql
├── 2025-08-25-FIX-sp_GetCurrentFeatureSelection.sql
├── 2025-08-25-FIX2-free-plan-feature-selection.sql
├── 2025-08-26-free-plan-feature-selection.sql
├── 2025-09-04-MASTER-CreateDatabaseFromScratch.sql
├── 2025-10-20-FIX-FeatureLimits-IDs.sql
├── 2025-10-23-ADD-MissingOrderAndCustomerColumns.sql
├── 2025-10-26-AddAuthenticationTables.sql
├── 20251222_AddShopifyAppsTable_Development.sql
├── 20251222_AddShopifyAppsTable_Production.sql
├── 20251222_AddShopifyAppsTable.sql
├── 2025-12-31-AddWebhookEventsIdempotencyKeyUniqueIndex.sql
├── 2025-12-31-UpdateShopifyAppsProductionEnvironments.sql
├── 20260106234458_AddShopifyVariantIdAndTitleToProductVariants.sql
├── 20260107-AddShopifyProductIdToProducts.sql
└── 2025-XX-XX-[変更内容].sql
```

## 移行スクリプト一覧と適用状況

| スクリプト名 | 作成日 | 作成者 | 内容 | Development | Staging | Production |
|------------|--------|--------|------|-------------|---------|------------|
| 2025-08-02-EmergencyIndexes.sql | 2025-08-02 | TAKASHI | OrderItemsインデックス追加 | ✅ 適用済 (2025-08-04) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-05-AddInitialSetupFeature.sql | 2025-08-05 | TAKASHI | 初期設定機能（SyncStatusテーブル、Storesテーブル更新） | ✅ 適用済 (2025-08-05 10:00) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-13-AddWebhookEventsTable.sql | 2025-08-13 | TAKASHI | Webhookイベント履歴・GDPR管理テーブル追加 | ✅ 適用済 (2025-08-13) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql | 2025-08-24 | ERIS | 冪等キー追加＋ユニーク(Filtered) | ❌ エラー発生 | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-CreateBillingTables.sql | 2025-08-24 | ERIS | 課金テーブル新規（Plans/StoreSubscriptions） | ✅ 適用済 (2025-08-25) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-AddFeatureSelectionTables.sql | 2025-08-24 | Kenji | 機能選択テーブル（FeatureLimits等） | ✅ 適用済 (2025-08-25) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-24-AddGDPRTables.sql | 2025-08-24 | Takashi | GDPR管理テーブル（GDPRRequests等） | ✅ 適用済 (2025-08-25) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql | 2025-08-25 | Kenji | IdempotencyKeyエラー修正版 | ✅ 適用済 (2025-08-25 13:10) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX-free-plan-feature-selection.sql | 2025-08-25 | Kenji | 無料プラン機能制限修正版 | ❌ エラー発生 | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX-sp_GetCurrentFeatureSelection.sql | 2025-08-25 | Kenji | ストアドプロシージャ簡易版 | ✅ 適用済 (2025-08-25 13:10) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-25-FIX2-free-plan-feature-selection.sql | 2025-08-25 | Kenji | Store→Stores修正、カラム追加 | ✅ 適用済 (2025-08-25 13:20) | ⏳ 未適用 | ⏳ 未適用 |
| 2025-08-26-free-plan-feature-selection.sql | 2025-08-26 | Takashi | 無料プラン機能制限（元版） | ❌ エラー発生 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-09-04-MASTER-CreateDatabaseFromScratch.sql** | 2025-09-04 | Kenji | **完全なデータベース作成マスタースクリプト** | 🆕 新規作成 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-10-20-FIX-FeatureLimits-IDs.sql** | 2025-10-20 | 福田+AI | **機能ID統一修正（year_over_year→yoy_comparison等）** | ✅ 適用済 (2025-10-20 16:23) | ⏳ 未適用 | ⏳ 未適用 |
| **2025-10-23-ADD-MissingOrderAndCustomerColumns.sql** | 2025-10-23 | 福田+AI | **Orders/Customersテーブルに不足カラム追加（ShopifyCustomerId, Email, TotalTax, IsActive等）** | ✅ 適用済 (2025-10-24 08:31) | ⏳ 未適用 | ⏳ 未適用 |
| **2025-10-26-AddAuthenticationTables.sql** | 2025-10-26 | Takashi (福田+AI) | **認証テーブル追加（DemoSessions, AuthenticationLogs）認証モード制御機能のため** | ✅ 適用済 (2025-10-26 09:58) | ⏳ 未適用 | ⏳ 未適用 |
| **20251222_AddShopifyAppsTable_Development.sql** | 2025-12-22 | 福田+AI | **ShopifyAppsテーブル作成・初期データ投入（開発環境用）マルチアプリ対応** | ✅ 適用済 (2025-12-23 00:36) | ⏳ 未適用 | ⏳ 未適用 |
| **20251222_AddShopifyAppsTable_Production.sql** | 2025-12-22 | 福田+AI | **ShopifyAppsテーブル作成・初期データ投入（本番環境用）マルチアプリ対応** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-12-23-AddPlanNameToStoreSubscriptions.sql** | 2025-12-23 | 福田+AI | **StoreSubscriptionsにPlanNameカラム追加（Invalid column name 'PlanName' 解消）** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-12-23-AddRowVersionToUserFeatureSelections.sql** | 2025-12-23 | 福田+AI | **UserFeatureSelectionsにRowVersion(rowversion)追加（Invalid column name 'RowVersion' 解消）** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-12-23-SeedSubscriptionPlans.sql** | 2025-12-23 | 福田+AI | **SubscriptionPlans 初期マスタ投入（Free/Professional/Enterprise）** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-12-25-FIX-AddMissingColumnsToFeatureLimits.sql** | 2025-12-25 | 福田+AI | **FeatureLimitsテーブルに不足カラム追加（ChangeCooldownDays, IsActive）404エラー解消のため** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-12-25-FIX-AddEntityTypeToSyncStatuses.sql** | 2025-12-25 | 福田+AI | **SyncStatusesテーブルに不足カラム追加（EntityType）初期同期エラー解消のため** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |
| **2025-12-25-FIX-CreateSyncManagementTables.sql** | 2025-12-25 | 福田+AI | **同期管理関連テーブル作成（SyncCheckpoints, SyncRangeSettings, SyncProgressDetails, SyncStates, SyncHistories）初期同期エラー解消のため** | ⏳ 未適用 | ⏳ 未適用 | ✅ 適用済 (2025-12-25) |
| **2025-12-31-AddWebhookEventsIdempotencyKeyUniqueIndex.sql** | 2025-12-31 | 福田+AI | **WebhookEvents.IdempotencyKeyにユニークインデックス追加（GDPR Webhook冪等性保証）** | ✅ 適用済 (2025-12-31) | ⏳ 未適用 | ✅ 適用済 (2025-12-31) |
| **2025-12-31-UpdateShopifyAppsProductionEnvironments.sql** | 2025-12-31 | 福田+AI | **ShopifyAppsテーブルに本番環境3環境のClient IDを登録・更新（Production1/2/3）** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |
| **20260106234458_AddShopifyVariantIdAndTitleToProductVariants.sql** | 2026-01-06 | 福田+AI | **ProductVariantsテーブルにShopifyVariantIdとTitleカラムを追加（JSONデシリアライズ問題解消のため）** | ✅ 適用済 (2026-01-06 23:49) | ⏳ 未適用 | ⏳ 未適用 |
| **20260107-AddShopifyProductIdToProducts.sql** | 2026-01-07 | 福田+AI | **Productsテーブル、ProductVariantsテーブル、OrderItemsテーブルに不足カラムを追加（20251222151634_AddShopifyAppsTableマイグレーションが適用されていない場合の対応）** | ⏳ 未適用 | ⏳ 未適用 | ⏳ 未適用 |

## 適用済みマイグレーションまとめ（Development環境）

### 成功適用済み ✅
1. 2025-08-02-EmergencyIndexes.sql
2. 2025-08-05-AddInitialSetupFeature.sql
3. 2025-08-13-AddWebhookEventsTable.sql
4. 2025-08-24-CreateBillingTables.sql
5. 2025-08-24-AddFeatureSelectionTables.sql
6. 2025-08-24-AddGDPRTables.sql
7. 2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql
8. 2025-08-25-FIX-sp_GetCurrentFeatureSelection.sql
9. 2025-08-25-FIX2-free-plan-feature-selection.sql
10. **2025-10-20-FIX-FeatureLimits-IDs.sql**
11. **2025-10-23-ADD-MissingOrderAndCustomerColumns.sql**
12. **2025-10-26-AddAuthenticationTables.sql**
13. **20251222_AddShopifyAppsTable_Development.sql** (開発環境用) ✅ 適用済 (2025-12-23 00:36)
14. **20251222_AddShopifyAppsTable_Production.sql** (本番環境用)
15. **20260106234458_AddShopifyVariantIdAndTitleToProductVariants.sql** ✅ 適用済 (2026-01-06 23:49)
16. **20260107-AddShopifyProductIdToProducts.sql** ✅ 適用済 (2026-01-07 00:15)

### エラー発生（修正版で解決済み）❌→✅
- 2025-08-24-AddIdempotencyKeyToWebhookEvents.sql → 2025-08-25-FIX版で解決
- 2025-08-26-free-plan-feature-selection.sql → 2025-08-25-FIX2版で解決

### 🆕 マスタースクリプト
- **2025-09-04-MASTER-CreateDatabaseFromScratch.sql** - 新規環境用の完全なDDLスクリプト
  - Entity Frameworkで管理されていた基本テーブルのCREATE文を含む
  - すべての手動マイグレーションを統合
  - 実行順序を考慮した外部キー制約の設定
  - ベーステーブル: Stores, Tenants, Customers, Products, ProductVariants, Orders, OrderItems

### 🔧 機能ID統一修正（2025-10-20）
- **2025-10-20-FIX-FeatureLimits-IDs.sql** - 機能ID統一修正
  - `year_over_year` → `yoy_comparison`
  - `purchase_count` → `purchase_frequency`
  - `monthly_sales`, `analytics` を削除
  - コードとデータベースの整合性を確保

### 🆕 Orders/Customersテーブル拡張（2025-10-23）
- **2025-10-23-ADD-MissingOrderAndCustomerColumns.sql** - 不足カラム追加
  - **Ordersテーブル**:
    - `ShopifyCustomerId` (NVARCHAR(50)) - Shopify顧客ID
    - `Email` (NVARCHAR(255)) - 顧客メールアドレス
    - `TotalTax` (DECIMAL(18,2)) - 税額合計
    - `FinancialStatus` (NVARCHAR(50)) - 支払いステータス
  - **Customersテーブル**:
    - `IsActive` (BIT) - アクティブフラグ
    - `TotalOrders` (INT) - 注文総数
  - **インデックス追加**:
    - `IX_Orders_ShopifyCustomerId`
    - `IX_Orders_Email`
    - `IX_Customers_IsActive`
  - 休眠顧客分析機能の500エラー解消のために実施

## 適用手順

### 1. 開発環境での確認
```bash
# スクリプト実行
sqlcmd -S [server] -d [database] -i [script.sql]

# 実行結果確認
# - エラーがないこと
# - 想定通りの変更が適用されたこと
```

### 2. ステージング環境への適用
- Azure Portal SQL Database クエリエディタを使用
- または sqlcmd コマンドを使用

### 3. 本番環境への適用
- 必ずバックアップを取得してから実行
- メンテナンス時間内に実施
- ロールバック手順を準備

## 記録ルール

### スクリプト作成時
1. `docs/05-development/03-データベース/マイグレーション/` に保存
2. ファイル名: `YYYY-MM-DD-[説明].sql`
3. スクリプト内にコメントで以下を記載：
   ```sql
   -- 作成日: 2025-08-25
   -- 作成者: Kenji
   -- 目的: エラー修正
   -- 影響: 影響範囲の説明
   -- EF Migration: [MigrationName]
   ```

### 適用時
1. 本ファイルの表を更新
2. 適用日時を記録
3. 問題があれば備考欄に記載

## チェックリスト

### 適用前
- [ ] スクリプトのレビュー完了
- [ ] 開発環境でのテスト完了
- [ ] バックアップ取得（本番のみ）
- [ ] ロールバック手順準備

### 適用後
- [ ] エラーがないことを確認
- [ ] アプリケーション動作確認
- [ ] パフォーマンス改善を確認
- [ ] 本ドキュメント更新

## 新規環境構築手順

### マスタースクリプトを使用した新規環境構築
新規環境でデータベースをゼロから構築する場合：

1. SQL Serverで新規データベースを作成
2. `2025-09-04-MASTER-CreateDatabaseFromScratch.sql` を実行
3. エラーがないことを確認
4. アプリケーションの接続テストを実施

### 注意事項
- Entity Frameworkのマイグレーションは不要（マスタースクリプトに含まれている）
- 既存環境には適用しないこと（データ損失の可能性）
- 新規環境専用のスクリプトです

---

## 提案: 更新案（Takashi提案の反映）
- WebhookEvents.IdempotencyKey のユニークインデックス（Filtered Unique）を明記し、該当DDLファイル名と適用状況を表に追記する
  - 対象行: `2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sql`
  - 提案セル値: Development → ✅ 適用済 (2025-08-25 13:10) / Staging → ⏳ 未適用 / Production → ⏳ 未適用
- 課金DDL（CreateBillingTables ほか）の環境別適用状況を最新に更新する
  - 対象行: `2025-08-24-CreateBillingTables.sql`
  - 提案セル値: Development → ✅ 適用済 (2025-08-25) / Staging → ⏳ / Production → ⏳
- GDPR関連DDL（AddGDPRTables）の適用状況を最新化し、コントローラ実装との整合コメントを追加する
  - 対象行: `2025-08-24-AddGDPRTables.sql`
  - 提案セル値: Development → ✅ 適用済 (2025-08-25) / Staging → ⏳ / Production → ⏳

### 🔐 認証テーブル追加（2025-10-26）
- **2025-10-26-AddAuthenticationTables.sql** - 認証モード制御機能のためのテーブル追加
  - **DemoSessions**: デモモード認証セッション管理（7カラム、2インデックス）
  - **AuthenticationLogs**: すべての認証試行を記録（8カラム、2インデックス）
  - 分散環境対応（Redis + Database）
  - セキュリティ監査ログ機能

### 🔧 GDPR Webhook冪等性インデックス追加（2025-12-31）
- **2025-12-31-AddWebhookEventsIdempotencyKeyUniqueIndex.sql** - Webhook冪等性保証のためのユニークインデックス追加
  - **対象**: WebhookEvents.IdempotencyKey
  - **インデックス種別**: フィルター付きユニークインデックス（NULLは許可）
  - **目的**: 同一Webhookの重複処理防止（GDPR対応で必須）
  - **EF Migration**: `20251230174658_AddWebhookEventsIdempotencyKeyIndex`
  - **関連**: GDPR公開アプリ申請対応

### 🔄 ShopifyAppsテーブル 本番環境3環境登録（2025-12-31）
- **2025-12-31-UpdateShopifyAppsProductionEnvironments.sql** - 本番環境フロントエンド3環境のShopify Client IDを登録・更新
  - **対象**: ShopifyAppsテーブル
  - **登録内容**:
    - Production1: EC Ranger-xn-fbkq6e5da0fpb (Custom) - ApiKey: 706a757915dedce54806c0a179bee05d
    - Production2: EC Ranger-demo (Custom) - ApiKey: 23f81e22074df1b71fb0a5a495778f49
    - Production3: EC Ranger (Public) - ApiKey: b95377afd35e5c8f4b28d286d3ff3491
  - **処理**: 既存レコードがあれば更新、なければ新規登録（UPSERT）
  - **注意**: ApiSecretは手動で更新が必要（GitHub Secretsから取得）
  - **関連**: 本番環境フロントエンド環境整理

### 🆕 ShopifyAppsテーブル追加（2025-12-22）
- **20251222_AddShopifyAppsTable_Development.sql** / **20251222_AddShopifyAppsTable_Production.sql** - マルチアプリ対応のためのテーブル追加
  - **ShopifyAppsテーブル**: Shopifyアプリ情報を一元管理（Name, ApiKey, ApiSecret, AppUrl等）
  - **Storesテーブル**: `ShopifyAppId`カラム追加（外部キー）
  - **初期データ投入**: 公開アプリとカスタムアプリの登録
  - **既存ストア移行**: 既存ストアにShopifyAppIdを設定
  - 環境別に分離（開発環境/本番環境）
  - EF Core Migration: `AddShopifyAppsTable`

### 🔧 ProductVariantsテーブル拡張（2026-01-06）
- **20260106234458_AddShopifyVariantIdAndTitleToProductVariants.sql** - ProductVariantsテーブルに不足カラム追加
  - **対象**: ProductVariantsテーブル
  - **追加カラム**:
    - `ShopifyVariantId` (NVARCHAR(50), NULL) - ShopifyバリアントID
    - `Title` (NVARCHAR(255), NULL) - バリアントタイトル
  - **目的**: Shopify APIからのデータ同期時にJSONデシリアライズエラー（Invalid column name）を解消
  - **EF Migration**: `20260106234458_AddShopifyVariantIdAndTitleToProductVariants`
  - **関連**: Shopify APIデータ同期機能の修正

最終更新: 2026-01-06 23:49
管理者: 福田
更新者: 福田 + AI Assistant
