# Backlogチケット: 分析画面でテスト注文を除外する対応

## タイトル
分析画面（前年同月比・購入回数・休眠顧客）でテスト注文を除外する仕様への統一

## 種別
改善

## 優先度
中

## 説明

### 背景

前年同月比・購入回数・休眠顧客の3分析画面について、「テスト注文」の取り扱いを調査した結果、以下が判明した。

- 3画面ともテスト注文を**除外していない**（取り扱いは「すべて含める」で一致）
- Order に `Test` カラムがなく、同期でも Shopify の `test` を取得・保存していない
- テスト注文を識別・除外する仕様がどこにも存在しない

### 方針

**「テスト注文を除外する」仕様で統一する**ことを決定。全分析で一貫して本注文のみを対象とする。

### 実施内容

1. **Order に IsTest 追加・マイグレーション**
   - `Order` に `IsTest`（bool）を追加
   - EF マイグレーション `20260128092303_AddIsTestToOrders` を作成（既存行は `defaultValue: false`）

2. **同期で test 取得・保存**
   - ShopifyOrder DTO に `test` を追加し、Order へマッピング
   - 注文同期時はテスト注文でも DB に保存するが、Customer の `LastOrderDate` 更新はテスト注文のときは行わない
   - 同期ジョブの `UpdateCustomerLastOrderDatesAsync` で最新注文日取得時に `!o.IsTest` を適用

3. **分析クエリで統一除外**
   - 前年同月比・購入回数・休眠顧客の**すべて**の Order / OrderItems 参照で `!o.IsTest`（等）を適用
   - 前年同月比・休眠顧客のキャッシュキーを更新し、旧キャッシュを無効化

4. **Customer 集計でテスト注文除外**
   - `TotalOrders` / `LastOrderDate` の集計元となる Orders 参照で `!o.IsTest` を適用
   - CustomerDataMaintenanceService・DatabaseController・同期時 LastOrderDate 更新を対象

## 完了条件

- [x] Order に `IsTest` カラムを追加（DatabaseModels.cs）
- [x] EF マイグレーション `20260128092303_AddIsTestToOrders` を作成
- [x] database-migration-tracking に上記マイグレーションを追記
- [x] ShopifyOrder DTO に `test` を追加し、Upsert / ConvertToOrderEntity / SaveOrUpdate で `IsTest` を反映
- [x] 同期時の LastOrderDate 更新でテスト注文を除外（Upsert では更新しない、SyncJob の集計では `!o.IsTest`）
- [x] 前年同月比分析の全 Order 参照で `!order.IsTest` を適用
- [x] 購入回数分析の全 Order 参照で `!o.IsTest` を適用
- [x] 休眠顧客分析の Order / OrderItems 参照で `!o.IsTest` / `!oi.Order.IsTest` を適用
- [x] Customer 集計（Maintenance・DatabaseController・デバッグ）で `!o.IsTest` を適用
- [x] 前年同月比・休眠顧客のキャッシュキーを更新（旧キャッシュ無効化）
- [ ] マイグレーションを各環境に適用（Development / Staging / Production）
- [ ] 適用後、`POST /api/database/update-customer-totals` で Customer 再集計を実行

## 技術詳細

### 対象ファイル

| 種別 | パス |
|------|------|
| モデル | `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs` |
| マイグレーション | `backend/ShopifyAnalyticsApi/Migrations/20260128092303_AddIsTestToOrders.cs` |
| 同期 | `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs` |
| 同期ジョブ | `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs` |
| 前年同月比 | `backend/ShopifyAnalyticsApi/Services/YearOverYearService.cs` |
| 購入回数 | `backend/ShopifyAnalyticsApi/Services/PurchaseCount/PurchaseCountDataService.cs` |
| 休眠顧客 | `backend/ShopifyAnalyticsApi/Services/Dormant/DormantCustomerQueryService.cs` |
| Customer 集計 | `backend/ShopifyAnalyticsApi/Services/CustomerDataMaintenanceService.cs` |
| DB 更新 API | `backend/ShopifyAnalyticsApi/Controllers/DatabaseController.cs` |
| 顧客デバッグ | `backend/ShopifyAnalyticsApi/Controllers/CustomerController.cs` |
| マイグレーション管理 | `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md` |

### 実装ポイント

- **Order.IsTest**: Shopify の `order.test` に相当。分析では `IsTest == false` の注文のみ対象。
- **既存 Order**: マイグレーション時は `IsTest = false` のまま。過去のテスト注文を正しく付与するには Shopify 再同期が必要。
- **キャッシュ**: 前年同月比は `YearOverYear_ExcludeTest`、休眠は `dormant_query_v4` に変更済み。

### デプロイ後対応

1. **マイグレーション適用**
   ```powershell
   cd backend/ShopifyAnalyticsApi
   dotnet ef database update --context ShopifyDbContext
   ```
2. **Customer 再集計**
   - `POST /api/database/update-customer-totals` を実行し、`TotalOrders` / `LastOrderDate` をテスト注文除外ベースで再計算する。

## 関連資料

- 調査報告: `docs/03-feature-development/分析機能/分析画面-テスト注文取り扱い調査報告.md`
- 作業ログ: `docs/worklog/2026/01/2026-01-28-分析画面テスト注文取り扱い調査.md`
- マイグレーション tracking: `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md`

## 対応者
福田＋AI Assistant

## 関連チケット
- 調査・実装のきっかけ: 分析画面「テスト注文」取り扱い調査（同上作業ログ）
- データ同期画面改善: `260128-Backlogチケット-データ同期画面改善.md`（別チケット・データ同期まわり）

## 状況
実装済み（2026-01-28）。マイグレーション適用・Customer 再集計はデプロイ後対応。

## 備考
- テスト注文の除外は**全分析で統一**している。一部だけ除外しないよう今後の変更でも維持すること。
- Shopify 再同期を行えば、既存 Order の `IsTest` が `order.test` に基づいて更新される。
