# OrderItems テーブル定義

## 概要
注文明細情報を管理するテーブル。**商品情報はスナップショットとして保持**し、注文時点の正確な情報を永続化する。

このテーブルは本システムの**中核的な設計思想**を体現しており、トランザクションデータの不変性を保証する。

## テーブル定義

### DDL
```sql
CREATE TABLE [dbo].[OrderItems](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [OrderId] [int] NOT NULL,
    [ProductId] [nvarchar](50) NULL,
    [ProductTitle] [nvarchar](255) NOT NULL,
    [ProductHandle] [nvarchar](255) NULL,
    [ProductVendor] [nvarchar](100) NULL,
    [ProductType] [nvarchar](100) NULL,
    [Sku] [nvarchar](100) NULL,
    [VariantTitle] [nvarchar](100) NULL,
    [Price] [decimal](18, 2) NOT NULL,
    [CompareAtPrice] [decimal](18, 2) NULL,
    [Quantity] [int] NOT NULL,
    [TotalPrice] [decimal](18, 2) NOT NULL,
    [Option1Name] [nvarchar](100) NULL,
    [Option1Value] [nvarchar](100) NULL,
    [Option2Name] [nvarchar](100) NULL,
    [Option2Value] [nvarchar](100) NULL,
    [Option3Name] [nvarchar](100) NULL,
    [Option3Value] [nvarchar](100) NULL,
    [RequiresShipping] [bit] NOT NULL DEFAULT 1,
    [Taxable] [bit] NOT NULL DEFAULT 1,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_OrderItems] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_OrderItems_Orders] FOREIGN KEY([OrderId]) REFERENCES [dbo].[Orders] ([Id]) ON DELETE CASCADE
);
```

### カラム詳細

| カラム名 | データ型 | NULL | デフォルト | 説明 | スナップショット |
|---------|----------|------|------------|------|-----------------|
| **Id** | int | NO | IDENTITY | 主キー | - |
| **OrderId** | int | NO | - | 注文ID（FK） | - |
| **ProductId** | nvarchar(50) | **YES** | - | 商品ID（**分析用参照**） | ❌ |
| **ProductTitle** | nvarchar(255) | **NO** | - | 商品名（**スナップショット**） | ✅ |
| **ProductHandle** | nvarchar(255) | YES | - | 商品ハンドル（**スナップショット**） | ✅ |
| **ProductVendor** | nvarchar(100) | YES | - | ベンダー名（**スナップショット**） | ✅ |
| **ProductType** | nvarchar(100) | YES | - | 商品タイプ（**スナップショット**） | ✅ |
| **Sku** | nvarchar(100) | YES | - | SKU（**スナップショット**） | ✅ |
| **VariantTitle** | nvarchar(100) | YES | - | バリアント名（**スナップショット**） | ✅ |
| **Price** | decimal(18,2) | **NO** | - | 単価（**スナップショット**） | ✅ |
| **CompareAtPrice** | decimal(18,2) | YES | - | 比較価格（**スナップショット**） | ✅ |
| **Quantity** | int | **NO** | - | 数量 | ✅ |
| **TotalPrice** | decimal(18,2) | **NO** | - | 小計（Price × Quantity） | ✅ |
| **Option1Name** | nvarchar(100) | YES | - | オプション1名（**スナップショット**） | ✅ |
| **Option1Value** | nvarchar(100) | YES | - | オプション1値（**スナップショット**） | ✅ |
| **Option2Name** | nvarchar(100) | YES | - | オプション2名（**スナップショット**） | ✅ |
| **Option2Value** | nvarchar(100) | YES | - | オプション2値（**スナップショット**） | ✅ |
| **Option3Name** | nvarchar(100) | YES | - | オプション3名（**スナップショット**） | ✅ |
| **Option3Value** | nvarchar(100) | YES | - | オプション3値（**スナップショット**） | ✅ |
| **RequiresShipping** | bit | NO | 1 | 配送要否（**スナップショット**） | ✅ |
| **Taxable** | bit | NO | 1 | 課税対象（**スナップショット**） | ✅ |
| **CreatedAt** | datetime2 | NO | GETDATE() | 作成日時 | - |
| **UpdatedAt** | datetime2 | NO | GETDATE() | 更新日時 | - |

### インデックス
```sql
-- クラスタ化インデックス（主キー）
PK_OrderItems ON [Id]

-- 必須インデックス
CREATE INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
CREATE INDEX IX_OrderItems_CreatedAt ON OrderItems(CreatedAt);

-- 分析用インデックス
CREATE INDEX IX_OrderItems_ProductId ON OrderItems(ProductId) 
WHERE ProductId IS NOT NULL;  -- NULL値を除外してサイズ最適化

CREATE INDEX IX_OrderItems_ProductTitle ON OrderItems(ProductTitle);
CREATE INDEX IX_OrderItems_Sku ON OrderItems(Sku) 
WHERE Sku IS NOT NULL;

-- 複合インデックス（高頻度クエリ用）
CREATE INDEX IX_OrderItems_CreatedAt_ProductTitle 
ON OrderItems(CreatedAt, ProductTitle) INCLUDE (Price, TotalPrice, Quantity);
```

## 🔍 設計上の重要事項

### ✅ スナップショット vs 参照の使い分け

#### **スナップショット保存項目（不変データ）**:
以下の項目は**注文時点で確定し、以後変更不可**：

1. **商品基本情報**
   - `ProductTitle`: 注文時の商品名を永続保存
   - `ProductVendor`: 注文時のベンダー名を永続保存
   - `ProductType`: 注文時の商品タイプを永続保存
   - `ProductHandle`: 注文時の商品ハンドルを永続保存

2. **価格情報**
   - `Price`: 注文時の価格を永続保存
   - `CompareAtPrice`: 注文時の比較価格を永続保存
   - `TotalPrice`: 計算結果を永続保存

3. **バリアント情報**
   - `VariantTitle`: 注文時のバリアント名を永続保存
   - `Option1Name/Value, Option2Name/Value, Option3Name/Value`: 注文時のオプション情報を永続保存

4. **属性情報**
   - `RequiresShipping`, `Taxable`: 注文時の属性を永続保存

#### **参照保存項目（分析用）**:
- `ProductId`: 現在の商品マスターとの関連付け（**NULL許可**）

### 🎯 設計理由

#### 1. **法的コンプライアンス**
- 取引記録の不変性を法的に保証
- 監査時に注文時点の正確な情報を提供

#### 2. **データ整合性**
- 商品マスターの変更・削除の影響を受けない
- 商品名変更後も正確な取引履歴を保持
- ベンダー情報変更の影響を受けない

#### 3. **分析機能の柔軟性**
- 過去の正確な取引データで売上分析
- 現在の商品マスターと組み合わせた比較分析
- 商品が削除されても履歴は残存

### 📊 実際の運用例

#### ケース1: 商品名変更
```
変更前: ProductTitle = "オーガニックコットンTシャツ"
変更後: 商品マスターで "エコ・コットンTシャツ" に変更

→ OrderItemsは変更前の名称を永続保持
→ 分析時は両方の情報を活用可能
```

#### ケース2: 商品削除
```
商品マスターから商品削除

→ OrderItemsのProductIdはNULLになる
→ ProductTitle等のスナップショットデータは完全保持
→ 取引履歴は影響を受けない
```

#### ケース3: 価格変更
```
変更前: Price = 3500円
変更後: 商品マスターで4000円に変更

→ OrderItemsは注文時の3500円を永続保持
→ 価格推移分析が正確に実行可能
```

## Entity Framework モデル定義
```csharp
/// <summary>
/// 注文明細エンティティ（注文時の商品情報スナップショット）
/// </summary>
public class OrderItem
{
    [Key]
    public int Id { get; set; }
    
    [ForeignKey("Order")]
    public int OrderId { get; set; }
    
    // 🔍 商品情報のスナップショット（注文時の情報を保存）
    [MaxLength(50)]
    public string? ProductId { get; set; }  // Shopify Product ID for reference
    
    [Required]
    [MaxLength(255)]
    public string ProductTitle { get; set; } = string.Empty;  // 🚨 必須スナップショット
    
    [MaxLength(255)]
    public string? ProductHandle { get; set; }
    
    [MaxLength(100)]
    public string? ProductVendor { get; set; }
    
    [MaxLength(100)]
    public string? ProductType { get; set; }
    
    [MaxLength(100)]
    public string? Sku { get; set; }
    
    [MaxLength(100)]
    public string? VariantTitle { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }  // 🚨 必須スナップショット
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? CompareAtPrice { get; set; }
    
    public int Quantity { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalPrice { get; set; }  // 🚨 必須スナップショット
    
    // オプション情報（スナップショット）
    [MaxLength(100)]
    public string? Option1Name { get; set; }
    
    [MaxLength(100)]
    public string? Option1Value { get; set; }
    
    [MaxLength(100)]
    public string? Option2Name { get; set; }
    
    [MaxLength(100)]
    public string? Option2Value { get; set; }
    
    [MaxLength(100)]
    public string? Option3Name { get; set; }
    
    [MaxLength(100)]
    public string? Option3Value { get; set; }
    
    public bool RequiresShipping { get; set; } = true;
    public bool Taxable { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // ナビゲーションプロパティ
    public virtual Order Order { get; set; } = null!;
    
    // 🚨 重要: ProductやProductVariantへのナビゲーションプロパティは意図的に削除
    // → スナップショット設計のため、直接的な関連は持たない
}
```

## 📋 典型的なクエリパターン

### 1. 年度比較売上分析（スナップショットデータ活用）
```sql
-- 商品別の年度比較売上（OrderItemsのスナップショットデータを基準）
SELECT 
    oi.ProductTitle,
    YEAR(o.CreatedAt) as SalesYear,
    SUM(oi.TotalPrice) as TotalRevenue,
    COUNT(*) as OrderCount,
    AVG(oi.Price) as AveragePrice
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = @storeId 
  AND o.CreatedAt >= DATEADD(year, -2, GETDATE())
GROUP BY oi.ProductTitle, YEAR(o.CreatedAt)
ORDER BY oi.ProductTitle, SalesYear;
```

### 2. 注文明細と現在の商品情報を結合
```sql
-- 過去注文の商品情報と現在の商品マスター情報を比較
SELECT 
    oi.ProductTitle as HistoricalProductName,
    p.Title as CurrentProductName,
    oi.Price as HistoricalPrice,
    pv.Price as CurrentPrice,
    (pv.Price - oi.Price) as PriceDifference,
    oi.ProductVendor as HistoricalVendor,
    p.Vendor as CurrentVendor,
    CASE 
        WHEN p.Id IS NULL THEN '商品削除済み'
        WHEN oi.ProductTitle != p.Title THEN '商品名変更'
        WHEN oi.Price != pv.Price THEN '価格変更'
        ELSE '変更なし'
    END as ChangeStatus
FROM OrderItems oi
LEFT JOIN Products p ON oi.ProductId = p.Id
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId AND oi.Sku = pv.Sku
WHERE oi.OrderId = @orderId;
```

### 3. 商品別売上集計（スナップショットデータ使用）
```sql
-- 商品別売上集計（商品マスターに依存しない正確な履歴分析）
SELECT 
    ProductTitle,
    ProductVendor,
    ProductType,
    COUNT(*) as OrderCount,
    SUM(Quantity) as TotalQuantitySold,
    SUM(TotalPrice) as TotalRevenue,
    AVG(Price) as AveragePrice,
    MIN(CreatedAt) as FirstSoldDate,
    MAX(CreatedAt) as LastSoldDate
FROM OrderItems
WHERE CreatedAt >= @startDate AND CreatedAt < @endDate
GROUP BY ProductTitle, ProductVendor, ProductType
ORDER BY TotalRevenue DESC;
```

### 4. 削除済み商品の売上確認
```sql
-- 商品マスターから削除されたが売上履歴は残っている商品
SELECT 
    oi.ProductTitle,
    oi.ProductVendor,
    COUNT(*) as TotalOrders,
    SUM(oi.TotalPrice) as TotalRevenue,
    MAX(oi.CreatedAt) as LastOrderDate
FROM OrderItems oi
WHERE oi.ProductId IS NULL  -- 商品マスターから削除済み
   OR NOT EXISTS (SELECT 1 FROM Products p WHERE p.Id = oi.ProductId)
GROUP BY oi.ProductTitle, oi.ProductVendor
ORDER BY TotalRevenue DESC;
```

## ⚠️ データ整合性チェック

### 必須チェック項目

#### 1. スナップショットデータの完全性
```sql
-- ProductTitleが空でないことの確認（重要）
SELECT COUNT(*) as EmptyProductTitleCount
FROM OrderItems 
WHERE ProductTitle IS NULL OR TRIM(ProductTitle) = '';
-- 結果: 常に0であるべき

-- 価格の整合性確認
SELECT COUNT(*) as PriceInconsistencyCount
FROM OrderItems 
WHERE ABS(Price * Quantity - TotalPrice) > 0.01;  -- 丸め誤差を考慮
-- 結果: 常に0であるべき
```

#### 2. 論理削除の確認
```sql
-- ProductIdがNULLの場合の分析
SELECT 
    COUNT(*) as NullProductIdCount,
    COUNT(DISTINCT ProductTitle) as UniqueProductTitles,
    SUM(TotalPrice) as TotalRevenueWithNullProductId
FROM OrderItems 
WHERE ProductId IS NULL;
```

#### 3. 重複データの確認
```sql
-- 同一注文内での重複商品チェック
SELECT 
    OrderId,
    ProductTitle,
    Sku,
    COUNT(*) as DuplicateCount
FROM OrderItems
GROUP BY OrderId, ProductTitle, Sku
HAVING COUNT(*) > 1;
-- 結果: 通常は空（同一商品は数量で調整されるべき）
```

## 🚨 重要な運用ルール

### ✅ 推奨事項

1. **新規OrderItem作成時**
   ```csharp
   // ✅ 正しい実装例
   var orderItem = new OrderItem
   {
       OrderId = orderId,
       ProductTitle = csvRecord.LineitemName,  // CSVから取得
       Price = csvRecord.LineitemPrice,        // CSVから取得
       ProductVendor = csvRecord.Vendor,       // CSVから取得
       ProductId = foundProduct?.Id,           // 見つかれば設定、なければNull
       // ... その他のスナップショット情報
   };
   ```

2. **商品マスター変更時**
   - OrderItemsのデータは**絶対に更新しない**
   - 新しい注文のみ新情報を使用

3. **分析クエリ実装時**
   - 基本的にOrderItemsのスナップショットデータを使用
   - 必要時のみProductIdで現在情報と結合

### 🚫 禁止事項

1. **OrderItemsの商品情報スナップショット項目を更新**
   ```sql
   -- ❌ 絶対に実行してはいけない
   UPDATE OrderItems SET ProductTitle = 'new name', Price = 1000 WHERE ...;
   ```

2. **ProductIdを基準とした必須データの取得**
   ```csharp
   // ❌ 間違った実装例
   var productName = orderItem.Product.Title;  // ProductIdがNullの場合エラー
   
   // ✅ 正しい実装例
   var productName = orderItem.ProductTitle;   // スナップショットデータを使用
   ```

3. **商品削除時のOrderItems連動削除**
   - 商品マスター削除時もOrderItemsは保持する
   - ProductIdをNullに設定するのみ

---

**🎯 このテーブルはShopify AI Marketing Suiteの中核**

OrderItemsテーブルのスナップショット設計により：
- **正確な取引履歴**の永続保持
- **法的要件**への完全対応  
- **柔軟な分析機能**の実現
- **データ整合性**の保証

すべての開発者・AIエージェントは、この設計思想を理解して実装してください。