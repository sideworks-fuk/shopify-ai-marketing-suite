# 作業ログ: Shopify API JSONデシリアライズ問題の修正とデータベーススキーマ更新

## 作業情報
- 開始日時: 2026-01-06 22:00:00
- 完了日時: 2026-01-07 00:38:00
- 所要時間: 約2時間38分
- 担当: 福田＋AI Assistant

## 作業概要
Shopify APIからのデータ取得時に発生していたJSONデシリアライズエラーとデータベーススキーマ不一致エラーを修正。データ同期処理が正常に動作するように改善。

## 実施内容

### 1. JSONデシリアライズ問題の修正
**問題**: Shopify APIは`snake_case`でJSONを返すが、C#モデルは`PascalCase`のため、デシリアライズ時にプロパティがマッピングされず0件になっていた。

**対応**:
- `ShopifyApiService.cs`に`JsonSerializerOptions { PropertyNameCaseInsensitive = true }`を追加
- すべての`JsonSerializer.Deserialize`呼び出しにこのオプションを適用

**変更ファイル**:
- `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs`

### 2. 価格フィールドの型不一致問題の修正
**問題**: Shopify APIは価格を文字列として返すが、C#モデルは`decimal`型を期待していたため、`JsonException`が発生していた。

**対応**:
- `ShopifyVariant.Price`, `ShopifyLineItem.Price`, `ShopifyOrder.TotalPrice/SubtotalPrice/TotalTax`を`string?`型に変更
- `PriceDecimal`, `TotalPriceDecimal`等の変換プロパティを追加
- すべての使用箇所で`*Decimal`プロパティを使用するように変更

**変更ファイル**:
- `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs`
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs`
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs`

### 3. データベーススキーマ不一致問題の修正
**問題**: エンティティモデルに定義されているカラムがデータベースに存在せず、`Invalid column name`エラーが発生していた。

**対応**:
- `ProductVariants`テーブルに`ShopifyVariantId`, `Title`カラムを追加するマイグレーション作成
- `Products`テーブルに`ShopifyProductId`カラムを追加するSQLスクリプト作成
- `ProductVariants`テーブルに`ShopifyProductId`カラムを追加するSQLスクリプト作成
- `OrderItems`テーブルに`ProductId`, `ShopifyLineItemId`, `ShopifyProductId`, `ShopifyVariantId`, `Title`カラムを追加するSQLスクリプト作成

**変更ファイル**:
- `backend/ShopifyAnalyticsApi/Migrations/20260106234458_AddShopifyVariantIdAndTitleToProductVariants.cs`
- `backend/ShopifyAnalyticsApi/Migrations/20260106234458_AddShopifyVariantIdAndTitleToProductVariants.sql`
- `docs/05-development/03-データベース/マイグレーション/20260107-AddShopifyProductIdToProducts.sql`
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md`

### 4. ログ設定の改善
**対応**:
- Shopify API通信ログを`logs/shopify-api-.log`に分離
- データ同期ログを`logs/sync-.log`に分離（既存）
- アプリケーション全体のログを`logs/app-.log`に出力

**変更ファイル**:
- `backend/ShopifyAnalyticsApi/appsettings.LocalDevelopment.json`

### 5. フロントエンド同期ページの改善
**問題**: `/setup/syncing`ページで`currentStoreId`が見つからないエラーが表示されていた。

**対応**:
- `currentStoreId`の取得ロジックを改善（AuthProvider → localStorage → sessionStorageの順で取得）
- `currentStoreId`が取得できた場合にエラーメッセージをクリア
- タイムアウト処理（30秒）と連続エラー検知（3回以上）を追加
- 最後の成功から60秒以上経過した場合のタイムアウト処理を追加

**変更ファイル**:
- `frontend/src/app/setup/syncing/page.tsx`

### 6. SubscriptionContextの改善
**問題**: `/setup/syncing`ページでも`SubscriptionProvider`がAPIを呼び出し、`currentStoreId`が設定される前にエラーが発生していた。

**対応**:
- `/setup/syncing`ページでのAPI呼び出しをスキップ
- `currentStoreId`が設定されている場合のみAPIを呼び出すように変更

**変更ファイル**:
- `frontend/src/contexts/SubscriptionContext.tsx`

## 成果物

### バックエンド
- `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs` - JSONデシリアライズと価格フィールドの型修正
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs` - PriceDecimalプロパティの使用
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs` - *Decimalプロパティの使用
- `backend/ShopifyAnalyticsApi/Migrations/20260106234458_AddShopifyVariantIdAndTitleToProductVariants.cs` - EF Coreマイグレーション
- `backend/ShopifyAnalyticsApi/Migrations/20260106234458_AddShopifyVariantIdAndTitleToProductVariants.sql` - SQLスクリプト
- `backend/ShopifyAnalyticsApi/appsettings.LocalDevelopment.json` - ログ設定の改善

### フロントエンド
- `frontend/src/app/setup/syncing/page.tsx` - currentStoreId取得ロジックの改善
- `frontend/src/contexts/SubscriptionContext.tsx` - 同期ページでのAPI呼び出しスキップ

### ドキュメント
- `docs/05-development/03-データベース/マイグレーション/20260107-AddShopifyProductIdToProducts.sql` - SQLスクリプト
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md` - マイグレーション管理ドキュメント更新

## 課題・注意点

### 解決した問題
1. ✅ JSONデシリアライズエラー（snake_case/PascalCase不一致）
2. ✅ 価格フィールドの型不一致エラー（string/decimal変換）
3. ✅ データベーススキーマ不一致エラー（Invalid column name）
4. ✅ 同期ページでのcurrentStoreId取得エラー

### 今後の注意点
- マイグレーション適用後、データ同期が正常に動作することを確認する必要がある
- Shopify APIのレスポンス形式が変更された場合、DTOモデルの更新が必要
- 価格フィールドは文字列として受け取り、必要に応じてdecimal型に変換するパターンを維持

## 関連ファイル
- `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs`
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs`
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs`
- `backend/ShopifyAnalyticsApi/Migrations/20260106234458_AddShopifyVariantIdAndTitleToProductVariants.cs`
- `docs/05-development/03-データベース/マイグレーション/20260107-AddShopifyProductIdToProducts.sql`
- `frontend/src/app/setup/syncing/page.tsx`
- `frontend/src/contexts/SubscriptionContext.tsx`
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md`
