# Products テーブル定義

## 概要
商品マスター情報を管理するテーブル。Shopifyから同期される商品データを保持し、ProductVariantsとの1:N関係で商品バリアント管理を実現。

**重要**: OrderItemsとは意図的に直接関係を持たない（スナップショット設計）。

## テーブル定義

### DDL
```sql
CREATE TABLE [dbo].[Products](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [StoreId] [int] NOT NULL,
    [Title] [nvarchar](255) NOT NULL,
    [Handle] [nvarchar](255) NULL,
    [Description] [nvarchar](1000) NULL,
    [Category] [nvarchar](100) NULL,
    [Vendor] [nvarchar](100) NULL,
    [ProductType] [nvarchar](100) NULL,
    [InventoryQuantity] [int] NOT NULL DEFAULT 0,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_Products] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Products_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]) ON DELETE NO ACTION
);
```

### カラム詳細

| カラム名 | データ型 | NULL | デフォルト | 説明 | 用途 |
|---------|----------|------|------------|------|------|
| **Id** | int | NO | IDENTITY | 主キー | システム識別 |
| **StoreId** | int | NO | - | ストアID（マルチストア対応） | データ分離 |
| **Title** | nvarchar(255) | NO | - | 商品名 | 商品検索・表示 |
| **Handle** | nvarchar(255) | YES | - | 商品ハンドル（Shopify用） | URL生成・連携 |
| **Description** | nvarchar(1000) | YES | - | 商品説明 | 商品詳細表示 |
| **Category** | nvarchar(100) | YES | - | 商品カテゴリ | 分類・検索 |
| **Vendor** | nvarchar(100) | YES | - | ベンダー・メーカー | ベンダー分析 |
| **ProductType** | nvarchar(100) | YES | - | 商品タイプ | 分類・分析 |
| **InventoryQuantity** | int | NO | 0 | 総在庫数 | 在庫管理 |
| **CreatedAt** | datetime2 | NO | GETDATE() | 作成日時 | 商品登録分析 |
| **UpdatedAt** | datetime2 | NO | GETDATE() | 更新日時 | 変更履歴 |

### インデックス
```sql
-- クラスタ化インデックス（主キー）
PK_Products ON [Id]

-- 必須インデックス
CREATE INDEX IX_Products_Title ON Products(Title);

-- マルチストア対応インデックス
CREATE INDEX IX_Products_StoreId_Title ON Products(StoreId, Title);
CREATE INDEX IX_Products_StoreId_Handle ON Products(StoreId, Handle) WHERE Handle IS NOT NULL;

-- 分析用インデックス
CREATE INDEX IX_Products_Category ON Products(Category) WHERE Category IS NOT NULL;
CREATE INDEX IX_Products_Vendor ON Products(Vendor) WHERE Vendor IS NOT NULL;
CREATE INDEX IX_Products_ProductType ON Products(ProductType) WHERE ProductType IS NOT NULL;

-- 複合インデックス
CREATE INDEX IX_Products_Category_Vendor ON Products(Category, Vendor) 
WHERE Category IS NOT NULL AND Vendor IS NOT NULL;
```

## 🔗 リレーションシップ

### 1. Products ← Stores (N:1)
```sql
CONSTRAINT [FK_Products_Stores] 
FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]) 
ON DELETE NO ACTION;
```
- **削除ポリシー**: NoAction（ストア削除は手動対応）
- **設計意図**: マルチストア対応、データ保護

### 2. Products → ProductVariants (1:N)
```sql
-- ProductVariantsテーブル側で定義
CONSTRAINT [FK_ProductVariants_Products] 
FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products] ([Id]) 
ON DELETE CASCADE;
```
- **削除ポリシー**: Cascade（商品削除時にバリアントも削除）
- **設計意図**: 商品とバリアントの完全性保証

### 3. Products ⟷ OrderItems（参照のみ、外部キーなし）
- **重要**: 直接的な外部キー関係なし
- **関係**: OrderItems.ProductIdでの任意参照
- **設計意図**: スナップショット設計による履歴保護

## Entity Framework モデル定義
```csharp
/// <summary>
/// 商品エンティティ
/// </summary>
public class Product
{
    [Key]
    public int Id { get; set; }
    
    // マルチストア対応
    [Required]
    public int StoreId { get; set; }
    
    // 基本商品情報
    [Required, MaxLength(255)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string? Handle { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    // 分類情報
    [MaxLength(100)]
    public string? Category { get; set; }
    
    [MaxLength(100)]
    public string? Vendor { get; set; }
    
    [MaxLength(100)]
    public string? ProductType { get; set; }
    
    // 在庫情報
    public int InventoryQuantity { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // ナビゲーションプロパティ
    public virtual ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    
    // 🚨 重要: OrderItemsへのナビゲーションプロパティは意図的に削除
    // → スナップショット設計のため、直接関係を持たない
    // public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    
    // 📊 計算プロパティ
    [NotMapped]
    public bool HasVariants => Variants.Any();
    
    [NotMapped]
    public decimal? MinPrice => Variants.Any() ? Variants.Min(v => v.Price) : null;
    
    [NotMapped]
    public decimal? MaxPrice => Variants.Any() ? Variants.Max(v => v.Price) : null;
    
    [NotMapped]
    public int TotalInventory => Variants.Sum(v => v.InventoryQuantity);
    
    [NotMapped]
    public bool IsInStock => TotalInventory > 0;
}
```

## 📊 典型的なクエリパターン

### 1. 商品カタログ表示
```sql
-- 商品一覧（在庫あり）
SELECT 
    p.Id,
    p.Title,
    p.Category,
    p.Vendor,
    p.InventoryQuantity,
    COUNT(pv.Id) as VariantCount,
    MIN(pv.Price) as MinPrice,
    MAX(pv.Price) as MaxPrice
FROM Products p
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = @storeId 
  AND p.InventoryQuantity > 0
GROUP BY p.Id, p.Title, p.Category, p.Vendor, p.InventoryQuantity
ORDER BY p.Title;
```

### 2. カテゴリ別商品分析
```sql
-- カテゴリ別商品数と平均価格
SELECT 
    p.Category,
    COUNT(DISTINCT p.Id) as ProductCount,
    COUNT(pv.Id) as VariantCount,
    AVG(pv.Price) as AvgPrice,
    SUM(p.InventoryQuantity) as TotalInventory
FROM Products p
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = @storeId AND p.Category IS NOT NULL
GROUP BY p.Category
ORDER BY ProductCount DESC;
```

### 3. ベンダー別商品分析
```sql
-- ベンダー別商品ポートフォリオ
SELECT 
    p.Vendor,
    COUNT(DISTINCT p.Id) as ProductCount,
    COUNT(DISTINCT p.Category) as CategoryCount,
    MIN(pv.Price) as MinPrice,
    MAX(pv.Price) as MaxPrice,
    AVG(pv.Price) as AvgPrice
FROM Products p
INNER JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = @storeId AND p.Vendor IS NOT NULL
GROUP BY p.Vendor
ORDER BY ProductCount DESC;
```

### 4. 売上データとの結合分析（スナップショット活用）
```sql
-- 商品別売上実績（OrderItemsのスナップショットデータと結合）
SELECT 
    p.Id as ProductId,
    p.Title as CurrentTitle,
    p.Category as CurrentCategory,
    p.Vendor as CurrentVendor,
    
    -- OrderItemsからの売上データ（スナップショット）
    COUNT(DISTINCT oi.ProductTitle) as HistoricalTitleVariations,
    SUM(oi.TotalPrice) as TotalRevenue,
    COUNT(oi.Id) as TotalOrderItems,
    AVG(oi.Price) as AvgHistoricalPrice,
    
    -- 現在価格との比較
    AVG(pv.Price) as CurrentAvgPrice
FROM Products p
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId
LEFT JOIN OrderItems oi ON CAST(p.Id AS NVARCHAR(50)) = oi.ProductId
WHERE p.StoreId = @storeId
GROUP BY p.Id, p.Title, p.Category, p.Vendor
HAVING SUM(oi.TotalPrice) IS NOT NULL  -- 売上実績がある商品のみ
ORDER BY TotalRevenue DESC;
```

### 5. 在庫アラート
```sql
-- 低在庫商品の抽出
SELECT 
    p.Id,
    p.Title,
    p.Category,
    p.Vendor,
    p.InventoryQuantity,
    SUM(pv.InventoryQuantity) as TotalVariantInventory,
    
    -- 過去30日の売上から回転率を計算
    COUNT(oi.Id) as RecentOrders,
    CASE 
        WHEN COUNT(oi.Id) > 0 AND p.InventoryQuantity > 0 
        THEN p.InventoryQuantity * 30.0 / COUNT(oi.Id)  -- 在庫日数
        ELSE NULL 
    END as EstimatedDaysOfInventory
FROM Products p
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId
LEFT JOIN OrderItems oi ON CAST(p.Id AS NVARCHAR(50)) = oi.ProductId 
    AND oi.CreatedAt >= DATEADD(day, -30, GETDATE())
WHERE p.StoreId = @storeId
GROUP BY p.Id, p.Title, p.Category, p.Vendor, p.InventoryQuantity
HAVING p.InventoryQuantity < 10  -- 在庫10個未満
ORDER BY EstimatedDaysOfInventory ASC;
```

## ⚠️ データ整合性チェック

### 必須チェック項目

#### 1. 在庫整合性チェック
```sql
-- Products.InventoryQuantityとProductVariantsの合計が一致するかチェック
SELECT 
    p.Id,
    p.Title,
    p.InventoryQuantity as ProductInventory,
    ISNULL(SUM(pv.InventoryQuantity), 0) as VariantInventorySum,
    ABS(p.InventoryQuantity - ISNULL(SUM(pv.InventoryQuantity), 0)) as Difference
FROM Products p
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = @storeId
GROUP BY p.Id, p.Title, p.InventoryQuantity
HAVING ABS(p.InventoryQuantity - ISNULL(SUM(pv.InventoryQuantity), 0)) > 0
ORDER BY Difference DESC;
```

#### 2. バリアント存在チェック
```sql
-- バリアントが存在しない商品の確認
SELECT 
    p.Id,
    p.Title,
    p.CreatedAt
FROM Products p
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = @storeId
  AND pv.Id IS NULL  -- バリアントが存在しない
ORDER BY p.CreatedAt DESC;
```

#### 3. 重複商品チェック
```sql
-- 同一ストア内での商品名重複チェック
SELECT 
    StoreId,
    Title,
    COUNT(*) as DuplicateCount
FROM Products
WHERE StoreId = @storeId
GROUP BY StoreId, Title
HAVING COUNT(*) > 1
ORDER BY DuplicateCount DESC;
```

## 🚨 重要な運用ルール

### ✅ 推奨事項

1. **新規商品作成時**
   ```csharp
   // ✅ 商品作成時は必ずバリアントも同時作成
   var product = new Product
   {
       StoreId = storeId,
       Title = productData.Title,
       Category = productData.Category,
       Vendor = productData.Vendor,
       InventoryQuantity = 0  // バリアントから計算で更新
   };
   
   var variant = new ProductVariant
   {
       ProductId = product.Id,
       Sku = productData.Sku,
       Price = productData.Price,
       InventoryQuantity = productData.Inventory
   };
   
   // 在庫数を合計で更新
   product.InventoryQuantity = product.Variants.Sum(v => v.InventoryQuantity);
   ```

2. **在庫更新時**
   ```csharp
   // ✅ バリアント在庫更新後に商品在庫も更新
   variant.InventoryQuantity = newInventory;
   product.InventoryQuantity = product.Variants.Sum(v => v.InventoryQuantity);
   product.UpdatedAt = DateTime.UtcNow;
   ```

3. **商品検索実装時**
   ```csharp
   // ✅ マルチストア環境では必ずStoreIdでフィルタ
   var products = dbContext.Products
       .Where(p => p.StoreId == storeId)
       .Where(p => p.Title.Contains(searchTerm))
       .Include(p => p.Variants)
       .ToList();
   ```

### 🚫 禁止事項

1. **OrderItemsとの直接結合を前提とした設計**
   ```csharp
   // ❌ スナップショット設計に反する実装
   var productSales = product.OrderItems.Sum(oi => oi.TotalPrice);
   
   // ✅ 正しい実装（ProductIdでの任意結合）
   var productSales = dbContext.OrderItems
       .Where(oi => oi.ProductId == product.Id.ToString())
       .Sum(oi => oi.TotalPrice);
   ```

2. **バリアントなしの商品販売**
   ```csharp
   // ❌ バリアントが存在しない商品の注文作成
   if (!product.Variants.Any())
   {
       throw new InvalidOperationException("商品にバリアントが存在しません");
   }
   ```

3. **ストア間商品の混在**
   ```csharp
   // ❌ 異なるストアの商品を同一注文に含める
   var invalidOrder = new Order
   {
       StoreId = 1,
       OrderItems = new List<OrderItem>
       {
           new() { ProductId = productFromStore2.Id }  // Store2の商品
       }
   };
   ```

---

**🎯 Productsテーブルは商品管理の基盤**

- **マスター管理**: 商品情報の一元管理と柔軟な更新
- **バリアント対応**: ProductVariantsとの連携でShopify構造を完全再現
- **分析基盤**: CategoryやVendorによる多角的な商品分析
- **スナップショット分離**: OrderItemsとの適切な分離による履歴保護

このテーブルにより、商品マスターの柔軟な管理と正確な取引履歴の両立が実現されます。