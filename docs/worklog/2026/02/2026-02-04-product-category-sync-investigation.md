# 作業ログ: 商品カテゴリーが「未分類」になる原因調査

## 作業情報
- 開始日時: 2026-02-04
- 担当: 福田＋AI Assistant

## 作業概要
商品情報のカテゴリーがすべて「未分類」になる事象について、データ同期機能で Category を取得できているか調査した。

## 調査結果

### 1. 現状の事実
- `dbo.Products` の `Category` カラムが同期後も **すべて NULL** である（スクリーンショットで確認）。
- `ProductType` は "Demo" など値が入っている（REST API から取得済み）。
- アプリでは `Category` が NULL のとき「未分類」と表示している。

### 2. 原因（データ同期で Category を取得していない）

#### 2.1 Shopify REST Admin API の仕様
- 商品取得に使用している **REST API** (`/admin/api/2024-01/products.json`) の Product リソースには **`product_type`** と **`vendor`** はあるが、**「Product category」（標準化タクソノミー）に相当するフィールドは存在しない**。
- Shopify 管理画面の「商品カテゴリー」（標準化された分類）は **GraphQL Admin API の `productCategory`** でしか取得・設定できない。
- 参考: [Shopify Product REST](https://shopify.dev/docs/api/admin-rest/2024-01/resources/product), [Product category (GraphQL)](https://shopify.dev/docs/api/admin-graphql/latest/objects/productcategory)

#### 2.2 実装側の不足
- **ShopifyApiService.cs**
  - `ShopifyProduct` DTO に `Category` や `product_category` に相当するプロパティがない。
  - `UpsertProductAsync` で新規・更新ともに **Category を一度も設定していない**。
- **ShopifyProductSyncJob.cs**
  - `ConvertToProductEntity` で **Category を設定していない**（Title, ProductType, Vendor のみマッピング）。
  - `SaveOrUpdateProductsBatch` の既存商品更新時も **Category を更新していない**。

そのため、同期後も DB の `Category` は常に NULL のままとなる。

### 3. 対応方針

- **REST のまま対応する場合**: Shopify の **商品タイプ（product_type）** は REST で取得済みのため、**Category カラムに ProductType をマッピング**する。  
  - ストアで「商品タイプ」をカテゴリ的に運用している場合は、これで「未分類」ではなく商品タイプが表示される。  
  - ProductType が空の商品は従来どおり Category は NULL → 「未分類」。
- **標準の「商品カテゴリー」を使う場合**: GraphQL Admin API に移行し、`productCategory` を取得して `Category` に格納する必要がある（別タスク）。

本対応では、上記「REST のまま ProductType → Category マッピング」を実装する。

## 実施内容
1. 上記調査結果の文書化（本ファイル）。
2. 商品同期処理で **Category = ProductType** を設定するよう修正。
   - `ShopifyProductSyncJob.ConvertToProductEntity`: 新規エンティティに `Category = ProductType` を設定。
   - `ShopifyProductSyncJob.SaveOrUpdateProductsBatch`: 既存商品更新時に `Category` を更新。
   - `ShopifyApiService.UpsertProductAsync`: 新規・更新ともに `Category = ProductType` を設定。

## 既存データへの反映
- 既に同期済みの商品は **Category が NULL のまま**。次回の商品同期（手動トリガーまたは定期ジョブ）を実行すると、同期時に **Category に ProductType が入る**。
- すぐ反映させたい場合は、管理画面や API から「商品同期」を再実行すること。

## 成果物
- 本調査ログ: `docs/worklog/2026/02/2026-02-04-product-category-sync-investigation.md`
- コード修正: `ShopifyApiService.cs`, `ShopifyProductSyncJob.cs`

## 関連ファイル
- `backend/ShopifyAnalyticsApi/Services/ShopifyApiService.cs`（UpsertProductAsync, ShopifyProduct）
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs`（ConvertToProductEntity, SaveOrUpdateProductsBatch）
- `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs`（Product.Category）
