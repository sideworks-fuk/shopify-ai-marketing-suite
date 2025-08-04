# Orders テーブル定義

## 概要
注文情報を管理するテーブル。顧客の購買行動分析の基盤となる重要なトランザクションデータ。

OrderItemsとの1:N関係により、注文全体の情報と個別商品明細を分離管理する。

## テーブル定義

### DDL
```sql
CREATE TABLE [dbo].[Orders](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [StoreId] [int] NOT NULL,
    [OrderNumber] [nvarchar](50) NOT NULL,
    [CustomerId] [int] NOT NULL,
    [TotalPrice] [decimal](18, 2) NOT NULL,
    [SubtotalPrice] [decimal](18, 2) NOT NULL,
    [TaxPrice] [decimal](18, 2) NOT NULL,
    [Currency] [nvarchar](50) NOT NULL DEFAULT 'JPY',
    [Status] [nvarchar](50) NOT NULL DEFAULT 'pending',
    [FinancialStatus] [nvarchar](50) NOT NULL DEFAULT 'pending',
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Orders_Customers] FOREIGN KEY([CustomerId]) REFERENCES [dbo].[Customers] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Orders_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [UQ_Orders_OrderNumber] UNIQUE ([OrderNumber])
);
```

### カラム詳細

| カラム名 | データ型 | NULL | デフォルト | 説明 | 分析用途 |
|---------|----------|------|------------|------|----------|
| **Id** | int | NO | IDENTITY | 主キー | - |
| **StoreId** | int | NO | - | ストアID（マルチストア対応） | ストア別分析 |
| **OrderNumber** | nvarchar(50) | NO | - | 注文番号（ユニーク） | 注文特定 |
| **CustomerId** | int | NO | - | 顧客ID（FK） | 顧客別分析 |
| **TotalPrice** | decimal(18,2) | NO | - | 合計金額（税込） | 売上分析 |
| **SubtotalPrice** | decimal(18,2) | NO | - | 小計金額（税抜） | 売上分析 |
| **TaxPrice** | decimal(18,2) | NO | - | 税額 | 税務分析 |
| **Currency** | nvarchar(50) | NO | 'JPY' | 通貨コード | 多通貨対応 |
| **Status** | nvarchar(50) | NO | 'pending' | 注文ステータス | フルフィルメント分析 |
| **FinancialStatus** | nvarchar(50) | NO | 'pending' | 支払いステータス | 財務分析 |
| **CreatedAt** | datetime2 | NO | GETDATE() | 注文日時 | 期間別分析 |
| **UpdatedAt** | datetime2 | NO | GETDATE() | 更新日時 | 変更履歴 |

### インデックス
```sql
-- クラスタ化インデックス（主キー）
PK_Orders ON [Id]

-- ユニーク制約
UQ_Orders_OrderNumber ON [OrderNumber]

-- 必須インデックス（高頻度クエリ用）
CREATE INDEX IX_Orders_CustomerId ON Orders(CustomerId);
CREATE INDEX IX_Orders_CreatedAt ON Orders(CreatedAt);

-- マルチストア対応インデックス
CREATE INDEX IX_Orders_StoreId_OrderNumber ON Orders(StoreId, OrderNumber);
CREATE INDEX IX_Orders_StoreId_CreatedAt ON Orders(StoreId, CreatedAt) INCLUDE (TotalPrice, Status);

-- 分析用複合インデックス
CREATE INDEX IX_Orders_CreatedAt_Status_TotalPrice 
ON Orders(CreatedAt, Status) INCLUDE (TotalPrice, CustomerId, StoreId);

-- 財務分析用インデックス
CREATE INDEX IX_Orders_FinancialStatus_CreatedAt 
ON Orders(FinancialStatus, CreatedAt) INCLUDE (TotalPrice, StoreId);
```

## 💼 ステータス管理

### Status（注文ステータス）
| 値 | 説明 | 使用場面 |
|----|------|----------|
| `pending` | 処理中 | 注文受付直後 |
| `confirmed` | 確定済み | 支払い確認後 |
| `fulfilled` | 配送完了 | 商品配送完了 |
| `cancelled` | キャンセル | 注文キャンセル |
| `returned` | 返品 | 商品返品処理 |

### FinancialStatus（支払いステータス）
| 値 | 説明 | 財務分析での扱い |
|----|------|------------------|
| `pending` | 支払い待ち | 売上未計上 |
| `paid` | 支払い完了 | 売上計上 |
| `partially_paid` | 一部支払い | 部分売上計上 |
| `refunded` | 返金済み | 売上控除 |
| `partially_refunded` | 一部返金 | 部分売上控除 |
| `cancelled` | 決済キャンセル | 売上未計上 |
| `voided` | 決済無効 | 売上未計上 |
| `authorized` | 承認済み | 売上未計上 |

## 🔗 リレーションシップ

### 1. Orders ← Customers (N:1)
```sql
CONSTRAINT [FK_Orders_Customers] 
FOREIGN KEY([CustomerId]) REFERENCES [dbo].[Customers] ([Id]) 
ON DELETE CASCADE;
```
- **削除ポリシー**: Cascade（顧客削除時に注文も削除）
- **設計意図**: 顧客の注文履歴管理、GDPR対応

### 2. Orders ← Stores (N:1)  
```sql
CONSTRAINT [FK_Orders_Stores] 
FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]) 
ON DELETE NO ACTION;
```
- **削除ポリシー**: NoAction（ストア削除は手動対応）
- **設計意図**: マルチストア対応、データ保護

### 3. Orders → OrderItems (1:N)
```sql
-- OrderItemsテーブル側で定義
CONSTRAINT [FK_OrderItems_Orders] 
FOREIGN KEY([OrderId]) REFERENCES [dbo].[Orders] ([Id]) 
ON DELETE CASCADE;
```
- **削除ポリシー**: Cascade（注文削除時に明細も削除）
- **設計意図**: 注文と明細の完全性保証

## Entity Framework モデル定義
```csharp
/// <summary>
/// 注文エンティティ
/// </summary>
public class Order
{
    [Key]
    public int Id { get; set; }
    
    // マルチストア対応
    [Required]
    public int StoreId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;
    
    [ForeignKey("Customer")]
    public int CustomerId { get; set; }
    
    // 価格情報（必須）
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalPrice { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal SubtotalPrice { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxPrice { get; set; }
    
    [MaxLength(50)]
    public string Currency { get; set; } = "JPY";
    
    // ステータス管理
    [MaxLength(50)]
    public string Status { get; set; } = "pending";
    
    [MaxLength(50)]
    public string FinancialStatus { get; set; } = "pending";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // 📊 計算プロパティ（分析用）
    [NotMapped]
    public int Year => CreatedAt.Year;
    
    [NotMapped]
    public int Month => CreatedAt.Month;
    
    [NotMapped]
    public string YearMonth => CreatedAt.ToString("yyyy-MM");
    
    [NotMapped]
    public decimal TaxRate => SubtotalPrice > 0 ? TaxPrice / SubtotalPrice : 0;
    
    [NotMapped]
    public bool IsCompleted => Status == "fulfilled" && FinancialStatus == "paid";
    
    [NotMapped]
    public bool IsRevenueCounted => FinancialStatus is "paid" or "partially_paid";
    
    // ナビゲーションプロパティ
    public virtual Customer Customer { get; set; } = null!;
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
```

## 📊 典型的なクエリパターン

### 1. 期間別売上分析
```sql
-- 月別売上集計（支払い完了分のみ）
SELECT 
    YEAR(CreatedAt) as SalesYear,
    MONTH(CreatedAt) as SalesMonth,
    COUNT(*) as OrderCount,
    SUM(TotalPrice) as TotalRevenue,
    AVG(TotalPrice) as AverageOrderValue,
    COUNT(DISTINCT CustomerId) as UniqueCustomers
FROM Orders
WHERE StoreId = @storeId 
  AND FinancialStatus IN ('paid', 'partially_paid')
  AND CreatedAt >= @startDate
GROUP BY YEAR(CreatedAt), MONTH(CreatedAt)
ORDER BY SalesYear, SalesMonth;
```

### 2. 顧客別注文履歴
```sql
-- 顧客の注文履歴分析
SELECT 
    o.OrderNumber,
    o.CreatedAt,
    o.TotalPrice,
    o.Status,
    o.FinancialStatus,
    COUNT(oi.Id) as ItemCount,
    c.FirstName + ' ' + c.LastName as CustomerName
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id
LEFT JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.CustomerId = @customerId
  AND o.StoreId = @storeId
GROUP BY o.Id, o.OrderNumber, o.CreatedAt, o.TotalPrice, o.Status, o.FinancialStatus, c.FirstName, c.LastName
ORDER BY o.CreatedAt DESC;
```

### 3. 年度比較分析
```sql
-- 前年同期比較分析
WITH YearlyRevenue AS (
  SELECT 
    YEAR(CreatedAt) as SalesYear,
    MONTH(CreatedAt) as SalesMonth,
    SUM(TotalPrice) as MonthlyRevenue,
    COUNT(*) as MonthlyOrders
  FROM Orders
  WHERE StoreId = @storeId 
    AND FinancialStatus IN ('paid', 'partially_paid')
    AND CreatedAt >= DATEADD(year, -2, GETDATE())
  GROUP BY YEAR(CreatedAt), MONTH(CreatedAt)
)
SELECT 
    current.SalesYear,
    current.SalesMonth,
    current.MonthlyRevenue as CurrentRevenue,
    previous.MonthlyRevenue as PreviousYearRevenue,
    CASE 
        WHEN previous.MonthlyRevenue > 0 
        THEN ((current.MonthlyRevenue - previous.MonthlyRevenue) * 100.0 / previous.MonthlyRevenue)
        ELSE NULL 
    END as GrowthRate
FROM YearlyRevenue current
LEFT JOIN YearlyRevenue previous 
    ON current.SalesMonth = previous.SalesMonth 
    AND current.SalesYear = previous.SalesYear + 1
ORDER BY current.SalesYear, current.SalesMonth;
```

### 4. 財務状態分析
```sql
-- 支払いステータス別集計
SELECT 
    FinancialStatus,
    COUNT(*) as OrderCount,
    SUM(TotalPrice) as TotalAmount,
    AVG(TotalPrice) as AverageAmount,
    MIN(CreatedAt) as EarliestOrder,
    MAX(CreatedAt) as LatestOrder
FROM Orders
WHERE StoreId = @storeId 
  AND CreatedAt >= @startDate
GROUP BY FinancialStatus
ORDER BY TotalAmount DESC;
```

### 5. 高額注文分析
```sql
-- 高額注文の分析（上位10%）
WITH OrderPercentiles AS (
  SELECT 
    TotalPrice,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY TotalPrice) OVER () as P90
  FROM Orders
  WHERE StoreId = @storeId 
    AND FinancialStatus = 'paid'
    AND CreatedAt >= @startDate
)
SELECT 
    o.OrderNumber,
    o.CreatedAt,
    o.TotalPrice,
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.CustomerSegment,
    COUNT(oi.Id) as ItemCount
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id
LEFT JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.TotalPrice >= (SELECT DISTINCT P90 FROM OrderPercentiles)
  AND o.StoreId = @storeId
GROUP BY o.Id, o.OrderNumber, o.CreatedAt, o.TotalPrice, c.FirstName, c.LastName, c.CustomerSegment
ORDER BY o.TotalPrice DESC;
```

## ⚠️ データ整合性チェック

### 必須チェック項目

#### 1. 価格整合性
```sql
-- 価格計算の整合性確認
SELECT 
    OrderNumber,
    SubtotalPrice,
    TaxPrice,
    TotalPrice,
    (SubtotalPrice + TaxPrice) as CalculatedTotal,
    ABS(TotalPrice - (SubtotalPrice + TaxPrice)) as Difference
FROM Orders
WHERE ABS(TotalPrice - (SubtotalPrice + TaxPrice)) > 0.01  -- 丸め誤差を考慮
ORDER BY Difference DESC;
-- 結果: 通常は空であるべき
```

#### 2. 注文明細との整合性
```sql
-- 注文合計とOrderItemsの合計が一致するかチェック
SELECT 
    o.OrderNumber,
    o.TotalPrice as OrderTotal,
    ISNULL(SUM(oi.TotalPrice), 0) as ItemsTotal,
    ABS(o.TotalPrice - ISNULL(SUM(oi.TotalPrice), 0)) as Difference
FROM Orders o
LEFT JOIN OrderItems oi ON o.Id = oi.OrderId
GROUP BY o.Id, o.OrderNumber, o.TotalPrice
HAVING ABS(o.TotalPrice - ISNULL(SUM(oi.TotalPrice), 0)) > 0.01
ORDER BY Difference DESC;
-- 結果: 通常は空であるべき
```

#### 3. ステータス整合性
```sql
-- 不正なステータス組み合わせの確認
SELECT 
    OrderNumber,
    Status,
    FinancialStatus,
    CreatedAt
FROM Orders
WHERE (Status = 'fulfilled' AND FinancialStatus = 'pending')  -- 配送完了なのに未払い
   OR (Status = 'cancelled' AND FinancialStatus = 'paid')     -- キャンセルなのに支払い済み
ORDER BY CreatedAt DESC;
-- 結果: 通常は空であるべき
```

#### 4. マルチストア整合性
```sql
-- ストア間データ混在チェック
SELECT 
    o.StoreId as OrderStoreId,
    c.StoreId as CustomerStoreId,
    COUNT(*) as InconsistentOrders
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id
WHERE o.StoreId != c.StoreId
GROUP BY o.StoreId, c.StoreId;
-- 結果: 常に空であるべき
```

## 🚨 重要な運用ルール

### ✅ 推奨事項

1. **新規注文作成時**
   ```csharp
   // ✅ 正しい実装例
   var order = new Order
   {
       StoreId = customer.StoreId,  // 顧客と同じストア
       OrderNumber = GenerateUniqueOrderNumber(),
       CustomerId = customer.Id,
       TotalPrice = calculateTotal(),
       SubtotalPrice = calculateSubtotal(),
       TaxPrice = calculateTax(),
       Status = "pending",
       FinancialStatus = "pending"
   };
   ```

2. **ステータス更新時**
   ```csharp
   // ステータス変更は段階的に実行
   order.FinancialStatus = "paid";
   order.UpdatedAt = DateTime.UtcNow;
   // 必要に応じてOrder.Statusも更新
   ```

3. **分析クエリ実装時**
   - 売上分析時は`FinancialStatus`を必ず考慮
   - マルチストア環境では`StoreId`で絞り込み
   - 期間分析では`CreatedAt`を使用

### 🚫 禁止事項

1. **OrderNumberの重複**
   ```sql
   -- ❌ 重複するOrderNumberは作成不可
   INSERT INTO Orders (OrderNumber, ...) VALUES ('ORD-001', ...);
   -- 既存の場合エラー
   ```

2. **ストア不整合の作成**
   ```csharp
   // ❌ 顧客と異なるストアの注文は作成不可
   var order = new Order
   {
       StoreId = 2,           // 顧客は StoreId = 1
       CustomerId = customer.Id,  // StoreId = 1の顧客
       // ...
   };
   ```

3. **不正なステータス遷移**
   ```csharp
   // ❌ 論理的に不整合なステータス更新
   order.Status = "cancelled";
   order.FinancialStatus = "paid";  // キャンセルなのに支払い済みは不正
   ```

---

**🎯 Ordersテーブルは売上分析の基盤**

- **財務分析**: FinancialStatusによる正確な売上計上
- **顧客分析**: CustomerIdによる購買行動追跡
- **期間分析**: CreatedAtによる時系列分析
- **マルチストア**: StoreIdによるデータ分離

OrderItemsと組み合わせることで、注文レベルと商品レベルの両方の分析が可能になります。