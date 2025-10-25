# データベース設計書

## 📋 概要
最終更新日: 2025-07-27  
データベース: SQL Server  
ORM: Entity Framework Core 8.0.7  
作成者: AIアシスタントケンジ

## 🏗️ アーキテクチャ概要

### データ保持方針
本システムでは以下の方針でデータを管理します：

1. **マスターデータ（参照型）**
   - **Stores**: 店舗マスター（マルチストア対応）
   - **Products**: 商品マスター（Shopifyから同期）
   - **ProductVariants**: 商品バリアントマスター（Shopifyから同期）
   - **Customers**: 顧客マスター（Shopifyから同期、匿名化済み）

2. **トランザクションデータ（スナップショット型）**
   - **Orders**: 注文情報
   - **OrderItems**: **注文時点の商品情報を完全保持**（ProductTitle, Price, Vendor等をスナップショット）

3. **集計データ（キャッシュ型）**
   - 現在未実装（将来のCustomerSummary等を想定）

### 設計原則

#### データ保持ポリシー
- **不変性の原則**: 注文履歴は変更されない永続データとして扱う
- **参照整合性**: 必要最小限の外部キー制約（分析用参照はオプション）
- **スナップショット戦略**: 取引時点の情報を完全保存し、マスター変更の影響を受けない

#### 技術仕様
- **正規化レベル**: 第3正規形を基本とし、分析パフォーマンスのため一部非正規化
- **命名規則**: PascalCase、単数形のテーブル名（EntityFramework準拠）
- **主キー**: 基本的にId (int IDENTITY)を使用
- **タイムスタンプ**: CreatedAt, UpdatedAtを標準装備
- **マルチストア対応**: 全マスターテーブルにStoreIdを付与

## 📊 テーブル一覧

| テーブル名 | 種類 | 説明 | レコード数（想定） | 更新頻度 | スナップショット |
|-----------|------|------|------------------|----------|----------------|
| **Stores** | マスター | 店舗情報（マルチストア対応） | 10-100 | 低 | - |
| **Products** | マスター | 商品マスター | 1,000-10,000 | 日次同期 | - |
| **ProductVariants** | マスター | 商品バリアントマスター | 5,000-50,000 | 日次同期 | - |
| **Customers** | マスター | 顧客マスター（匿名化済み） | 10,000-100,000 | 日次同期 | - |
| **Orders** | トランザクション | 注文データ | 100,000-1,000,000 | リアルタイム | 一部 |
| **OrderItems** | トランザクション | 注文明細（**完全スナップショット**） | 500,000-5,000,000 | リアルタイム | ✅ 完全 |

## 🔗 主要リレーションシップ

### 1. Stores を中心としたマルチストア構造
```
Stores (1) ⟵──── (N) Customers
Stores (1) ⟵──── (N) Products  
Stores (1) ⟵──── (N) Orders
```
- **削除ポリシー**: `NoAction` (ストア削除時は手動対応)
- **設計意図**: マルチストア対応でデータ分離

### 2. Orders - OrderItems (1:N) **中核設計**
```
Orders (1) ⟵──── (N) OrderItems
```
- **削除ポリシー**: `Cascade` (注文削除時は明細も削除)
- **設計意図**: 注文と明細の完全性保証

### 3. Orders - Customers (N:1)
```
Customers (1) ⟵──── (N) Orders
```
- **削除ポリシー**: `Cascade` (顧客削除時は注文も削除)
- **設計意図**: 顧客の注文履歴管理

### 4. Products - ProductVariants (1:N)
```
Products (1) ⟵──── (N) ProductVariants
```
- **削除ポリシー**: `Cascade` (商品削除時はバリアントも削除)
- **設計意図**: 商品とバリアントの完全性

### 5. OrderItems ⟷ Products/ProductVariants (参照のみ)
```
OrderItems → Products/ProductVariants (参照用、外部キーなし)
```
- **重要**: **OrderItemsは商品情報を完全にスナップショット保存**
- **参照**: ProductIdは分析用の任意参照（NULL許可）
- **設計意図**: 履歴不変性 + 分析時の現行商品情報連携

[詳細は relationships/entity-relationships.md 参照]

## 💾 重要：データ保持ポリシー

### スナップショット型テーブルの設計

#### **OrderItems テーブル（最重要）**
注文明細は商品情報の**完全スナップショット**を保持：

**スナップショット項目（必須）**:
- `ProductTitle`: 注文時点の商品名
- `Price`: 注文時点の価格  
- `ProductVendor`: 注文時点のベンダー情報
- `ProductType`: 注文時点の商品タイプ
- `VariantTitle`: 注文時点のバリアント名
- `Option1Name/Value, Option2Name/Value, Option3Name/Value`: 注文時点のオプション

**参照項目（オプション）**:
- `ProductId`: 商品マスターへの参照（分析用、NULL許可）

**設計理由**:
1. **法的要件**: 取引記録の不変性保証
2. **データ整合性**: 商品情報変更・削除の影響を受けない
3. **分析柔軟性**: 過去の正確な取引情報 + 現在の商品マスター情報の両方活用

### 参照型テーブルの設計

#### **Customers テーブル**
- 顧客マスター情報は参照型として一元管理
- 匿名化処理済みデータを保持
- 顧客分析・セグメンテーション用

[詳細は design-decisions/snapshot-vs-reference.md 参照]

## 🔍 主要インデックス戦略

### パフォーマンス重視のインデックス設計

#### 🔥 高頻度クエリ対応
```sql
-- 顧客別注文履歴（最頻出クエリ）
IX_Orders_CustomerId ON Orders(CustomerId)

-- 期間別売上集計（ダッシュボード用）
IX_Orders_CreatedAt ON Orders(CreatedAt)
IX_OrderItems_CreatedAt ON OrderItems(CreatedAt)

-- マルチストア対応
IX_Orders_StoreId_OrderNumber ON Orders(StoreId, OrderNumber)
IX_Customers_StoreId_Email ON Customers(StoreId, Email)
```

#### 📊 分析クエリ対応
```sql
-- 商品別売上分析（ProductIdがNULLでない場合のみ）
IX_OrderItems_ProductId ON OrderItems(ProductId) WHERE ProductId IS NOT NULL

-- 商品名検索（スナップショットデータ検索）
IX_OrderItems_ProductTitle ON OrderItems(ProductTitle)

-- 顧客検索
IX_Customers_Email ON Customers(Email)
IX_Customers_ShopifyCustomerId ON Customers(ShopifyCustomerId)
```

## 📋 典型的なクエリパターン

### 1. 年度比較売上分析（スナップショットデータ活用）
```sql
-- 商品別の年度比較（OrderItemsのスナップショットデータを利用）
SELECT 
    oi.ProductTitle,
    YEAR(o.CreatedAt) as Year,
    SUM(oi.TotalPrice) as Revenue,
    COUNT(*) as OrderCount
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = @storeId 
  AND o.CreatedAt >= @startDate
GROUP BY oi.ProductTitle, YEAR(o.CreatedAt)
ORDER BY oi.ProductTitle, Year
```

### 2. 現在商品情報との突合分析
```sql
-- 過去注文商品と現在商品情報の比較
SELECT 
    oi.ProductTitle as HistoricalName,
    p.Title as CurrentName,
    oi.Price as HistoricalPrice,
    pv.Price as CurrentPrice,
    (pv.Price - oi.Price) as PriceDifference
FROM OrderItems oi
LEFT JOIN Products p ON oi.ProductId = p.Id  -- NULLの場合もある
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId AND oi.Sku = pv.Sku
WHERE oi.OrderId = @orderId
```

### 3. 休眠顧客分析
```sql
-- 最終購入日による顧客セグメンテーション
SELECT 
    c.Id,
    c.Email,
    c.TotalSpent,
    MAX(o.CreatedAt) as LastPurchaseDate,
    DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) as DaysSinceLastPurchase
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
WHERE c.StoreId = @storeId
GROUP BY c.Id, c.Email, c.TotalSpent
HAVING DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) > 90
ORDER BY DaysSinceLastPurchase DESC
```

## ⚠️ 重要な制約とルール

### データ整合性チェック

#### 1. OrderItems完全性チェック
```sql
-- ProductTitleが空でないことの確認
SELECT COUNT(*) FROM OrderItems WHERE ProductTitle IS NULL OR ProductTitle = ''
-- → 常に0であるべき

-- 価格の整合性確認  
SELECT * FROM OrderItems WHERE Price != TotalPrice / Quantity
-- → 結果が空であるべき
```

#### 2. マルチストア分離チェック
```sql
-- ストア間データ混在の確認
SELECT o.StoreId as OrderStoreId, c.StoreId as CustomerStoreId
FROM Orders o 
INNER JOIN Customers c ON o.CustomerId = c.Id
WHERE o.StoreId != c.StoreId
-- → 結果が空であるべき
```

### 運用ルール

#### 🚫 禁止事項
1. **OrderItemsの商品情報スナップショット項目を更新してはいけない**
2. **ProductIdがNULLのOrderItemsを削除してはいけない**
3. **Ordersを直接削除してはいけない**（カスケード削除によるOrderItems消失防止）

#### ✅ 推奨事項
1. **新商品追加時は必ずProductVariantsも同時作成**
2. **顧客データ更新は匿名化処理を経由**
3. **大量データクエリ時は必ずStoreIdで絞り込み**

## 🔧 Entity Framework設定

### DbContext重要設定
```csharp
// スナップショット設計のためのナビゲーションプロパティ除外
modelBuilder.Entity<Product>()
    .Navigation(p => p.OrderItems)  // 意図的に未設定
    .Metadata.PropertyInfo = null;

// 外部キー制約の削除ポリシー設定
modelBuilder.Entity<OrderItem>()
    .HasOne<Product>()
    .WithMany()
    .HasForeignKey(oi => oi.ProductId)
    .OnDelete(DeleteBehavior.NoAction)  // 商品削除時もOrderItemは保持
    .IsRequired(false);  // ProductId NULL許可
```

[完全なDbContext設定は Data/ShopifyDbContext.cs 参照]

---

## 📚 関連ドキュメント

- [Entity Relationships詳細](./relationships/entity-relationships.md)
- [スナップショット vs 参照の設計判断](./design-decisions/snapshot-vs-reference.md)
- [ER図 - 概要版](./diagrams/er-diagram-overview.mermaid)
- [個別テーブル定義書](./table-definitions/)

---

**⚠️ AIエージェント・開発者向け重要注意**

このシステムでは**OrderItemsテーブルがスナップショット型**で設計されています。コード実装時は以下を厳守してください：

1. OrderItemsの商品情報（ProductTitle, Price等）は**注文時点で確定し、以後変更不可**
2. 商品分析時は**OrderItemsのスナップショットデータ**を基本とし、必要に応じてProductIdで現在の商品マスターと結合
3. 新規注文作成時は**必ずCSV/APIからの商品情報をOrderItemsに完全コピー**

この設計により、商品マスターの変更・削除に関係なく、正確な取引履歴が永続保持されます。