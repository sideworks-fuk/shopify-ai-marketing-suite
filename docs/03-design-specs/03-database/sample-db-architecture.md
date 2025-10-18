# サンプルデータDB中心アーキテクチャ設計

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: CSV→DB→Shopifyの3層アーキテクチャ設計

---

## 🎯 アーキテクチャ概要

### データフロー
```
1. 実店舗CSVデータ
    ↓ [匿名化]
2. サンプルデータDB（中央リポジトリ）
    ↓ [選択的投入]
3. Shopify Development Store
```

---

## 💾 サンプルデータDB設計

### 1. マスターテーブル（匿名化済みデータ）

```sql
-- 商品マスター
CREATE TABLE SampleProducts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OriginalId NVARCHAR(100),           -- 元データのID（マッピング用）
    ProductCode NVARCHAR(50),
    ProductName NVARCHAR(255),          -- 匿名化済み
    Category NVARCHAR(100),
    Price DECIMAL(10,2),
    Stock INT,
    Description NVARCHAR(MAX),          -- 匿名化済み
    CreatedAt DATETIME DEFAULT GETDATE(),
    AnonymizedAt DATETIME
);

-- 顧客マスター
CREATE TABLE SampleCustomers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OriginalId NVARCHAR(100),           -- 元データのID
    CustomerCode NVARCHAR(50),
    Name NVARCHAR(255),                 -- 匿名化済み
    Email NVARCHAR(255),                -- 匿名化済み
    Phone NVARCHAR(50),                 -- 匿名化済み
    Prefecture NVARCHAR(50),            -- 都道府県レベル
    City NVARCHAR(50),                  -- 市区町村レベル
    AgeGroup NVARCHAR(20),              -- 年代
    TotalSpent DECIMAL(10,2),
    OrderCount INT,
    MemberRank NVARCHAR(50),
    CreatedAt DATETIME DEFAULT GETDATE(),
    AnonymizedAt DATETIME
);

-- 注文マスター
CREATE TABLE SampleOrders (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OriginalId NVARCHAR(100),
    OrderNumber NVARCHAR(50),
    CustomerId INT FOREIGN KEY REFERENCES SampleCustomers(Id),
    OrderDate DATE,                     -- 実際の注文日
    TotalAmount DECIMAL(10,2),
    PaymentMethod NVARCHAR(50),
    ShippingPrefecture NVARCHAR(50),
    Status NVARCHAR(50),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 注文明細
CREATE TABLE SampleOrderItems (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OrderId INT FOREIGN KEY REFERENCES SampleOrders(Id),
    ProductId INT FOREIGN KEY REFERENCES SampleProducts(Id),
    Quantity INT,
    UnitPrice DECIMAL(10,2),
    Subtotal DECIMAL(10,2)
);
```

### 2. 投入管理テーブル

```sql
-- Shopify投入履歴
CREATE TABLE ShopifyImportHistory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ImportType NVARCHAR(50),            -- 'Product', 'Customer', 'Order'
    ImportedAt DATETIME DEFAULT GETDATE(),
    RecordCount INT,
    SuccessCount INT,
    ErrorCount INT,
    Status NVARCHAR(50),
    ErrorDetails NVARCHAR(MAX)
);

-- ID マッピング（DB→Shopify）
CREATE TABLE ShopifyIdMapping (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EntityType NVARCHAR(50),            -- 'Product', 'Customer', 'Order'
    SampleDbId INT,
    ShopifyId NVARCHAR(100),
    CreatedAt DATETIME DEFAULT GETDATE()
);
```

### 3. 分析用ビュー

```sql
-- 月次売上集計ビュー
CREATE VIEW MonthlySalesView AS
SELECT 
    YEAR(OrderDate) as Year,
    MONTH(OrderDate) as Month,
    COUNT(DISTINCT o.Id) as OrderCount,
    COUNT(DISTINCT o.CustomerId) as CustomerCount,
    SUM(o.TotalAmount) as TotalRevenue
FROM SampleOrders o
GROUP BY YEAR(OrderDate), MONTH(OrderDate);

-- 商品別売上ビュー
CREATE VIEW ProductSalesView AS
SELECT 
    p.Id,
    p.ProductName,
    p.Category,
    YEAR(o.OrderDate) as Year,
    MONTH(o.OrderDate) as Month,
    SUM(oi.Quantity) as TotalQuantity,
    SUM(oi.Subtotal) as TotalRevenue
FROM SampleProducts p
JOIN SampleOrderItems oi ON p.Id = oi.ProductId
JOIN SampleOrders o ON oi.OrderId = o.Id
GROUP BY p.Id, p.ProductName, p.Category, 
         YEAR(o.OrderDate), MONTH(o.OrderDate);
```

---

## 🛠️ 匿名化ツールの拡張

### 1. DB出力機能の追加

```csharp
public class DatabaseExportService
{
    private readonly string _connectionString;
    
    public async Task ExportToSampleDatabase(
        List<Customer> customers,
        List<Product> products,
        List<Order> orders)
    {
        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        
        using var transaction = connection.BeginTransaction();
        try
        {
            // 1. 商品データの投入
            await BulkInsertProducts(connection, transaction, products);
            
            // 2. 顧客データの投入
            await BulkInsertCustomers(connection, transaction, customers);
            
            // 3. 注文データの投入
            await BulkInsertOrders(connection, transaction, orders);
            
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
```

---

## 🚀 Shopify登録ツール設計

### 1. プロジェクト構成

```
shopify-data-importer/
├── src/
│   ├── ShopifyDataImporter/
│   │   ├── Program.cs
│   │   ├── Services/
│   │   │   ├── ShopifyImportService.cs
│   │   │   ├── DatabaseService.cs
│   │   │   └── MappingService.cs
│   │   ├── Strategies/
│   │   │   ├── ProductImportStrategy.cs
│   │   │   ├── CustomerImportStrategy.cs
│   │   │   └── OrderImportStrategy.cs
│   │   └── Configuration/
│   │       └── ImportConfig.cs
└── tests/
```

### 2. 主要機能

```csharp
public class ShopifyImportService
{
    private readonly ShopifyService _shopify;
    private readonly DatabaseService _database;
    private readonly MappingService _mapping;
    
    public async Task ImportProducts(ImportOptions options)
    {
        // 1. DBから商品データ取得
        var products = await _database.GetProductsForImport(options);
        
        // 2. バッチ処理でShopifyに投入
        foreach (var batch in products.Batch(50))
        {
            var shopifyProducts = batch.Select(ConvertToShopifyProduct);
            var results = await _shopify.Product.CreateRangeAsync(shopifyProducts);
            
            // 3. IDマッピングを保存
            await _mapping.SaveProductMappings(batch, results);
            
            // Rate Limit対応
            await Task.Delay(500);
        }
    }
    
    public async Task ImportSelectiveOrders(DateTime fromDate)
    {
        // 指定日付以降の注文のみ投入
        var orders = await _database.GetOrdersAfterDate(fromDate);
        
        foreach (var order in orders)
        {
            // メタフィールドに実際の注文日を設定
            var metafields = new[]
            {
                new MetaField
                {
                    Namespace = "custom_data",
                    Key = "actual_order_date",
                    Value = order.OrderDate.ToString("yyyy-MM-dd"),
                    Type = "date"
                }
            };
            
            await CreateOrderWithMetafields(order, metafields);
        }
    }
}
```

---

## 📋 実装スケジュール

### Phase 1: 匿名化ツール拡張（1日）
- AM: DB出力機能の実装
- PM: テストとバグ修正

### Phase 2: Shopify登録ツール開発（2日）
- Day 1: 基本構造とDB連携
- Day 2: Shopify API連携と投入ロジック

### Phase 3: 統合テスト（1日）
- エンドツーエンドテスト
- パフォーマンステスト

---

## 🎯 この設計のメリット

1. **再実行性**
   - エラー時の部分的な再投入が簡単
   - テスト環境のリセットが容易

2. **データ整合性**
   - 中央DBで一元管理
   - IDマッピングの確実な管理

3. **柔軟性**
   - 必要なデータだけ選択的に投入
   - 投入タイミングの制御

4. **分析対応**
   - DBから直接分析可能
   - Shopifyの制限を回避

5. **拡張性**
   - 新しい投入戦略の追加が容易
   - 異なるプラットフォームへの対応も可能 