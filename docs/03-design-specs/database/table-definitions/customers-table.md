# Customers テーブル定義

## 概要
顧客情報を管理するマスターテーブル。**匿名化処理済み**のShopify顧客データを保持し、顧客分析・セグメンテーションの基盤となる。

## テーブル定義

### DDL
```sql
CREATE TABLE [dbo].[Customers](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [StoreId] [int] NOT NULL,
    [ShopifyCustomerId] [nvarchar](50) NULL,
    [FirstName] [nvarchar](100) NOT NULL,
    [LastName] [nvarchar](100) NOT NULL,
    [Email] [nvarchar](255) NOT NULL,
    [Phone] [nvarchar](20) NULL,
    [Company] [nvarchar](100) NULL,
    [City] [nvarchar](50) NULL,
    [ProvinceCode] [nvarchar](10) NULL,
    [CountryCode] [nvarchar](10) NULL,
    [AddressPhone] [nvarchar](20) NULL,
    [AcceptsEmailMarketing] [bit] NOT NULL DEFAULT 0,
    [AcceptsSMSMarketing] [bit] NOT NULL DEFAULT 0,
    [TotalSpent] [decimal](18, 2) NOT NULL DEFAULT 0,
    [TotalOrders] [int] NOT NULL DEFAULT 0,
    [TaxExempt] [bit] NOT NULL DEFAULT 0,
    [Tags] [nvarchar](1000) NULL,
    [CompanyStoreName] [nvarchar](100) NULL,
    [Industry] [nvarchar](100) NULL,
    [CustomerSegment] [nvarchar](50) NOT NULL DEFAULT '新規顧客',
    [OrdersCount] [int] NOT NULL DEFAULT 0,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_Customers] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Customers_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]) ON DELETE NO ACTION
);
```

### カラム詳細

| カラム名 | データ型 | NULL | デフォルト | 説明 | 匿名化対象 |
|---------|----------|------|------------|------|-----------|
| **Id** | int | NO | IDENTITY | 主キー | - |
| **StoreId** | int | NO | - | ストアID（マルチストア対応） | ❌ |
| **ShopifyCustomerId** | nvarchar(50) | YES | - | Shopify顧客ID（分析用） | ❌ |
| **FirstName** | nvarchar(100) | NO | - | 名（匿名化済み） | ✅ |
| **LastName** | nvarchar(100) | NO | - | 姓（匿名化済み） | ✅ |
| **Email** | nvarchar(255) | NO | - | メールアドレス（匿名化済み） | ✅ |
| **Phone** | nvarchar(20) | YES | - | 電話番号（匿名化済み） | ✅ |
| **Company** | nvarchar(100) | YES | - | 会社名（匿名化済み） | ✅ |
| **City** | nvarchar(50) | YES | - | 市区町村（地域分析用） | ❌ |
| **ProvinceCode** | nvarchar(10) | YES | - | 都道府県コード（地域分析用） | ❌ |
| **CountryCode** | nvarchar(10) | YES | - | 国コード（国別分析用） | ❌ |
| **AddressPhone** | nvarchar(20) | YES | - | 住所電話番号（匿名化済み） | ✅ |
| **AcceptsEmailMarketing** | bit | NO | 0 | メール配信許可 | ❌ |
| **AcceptsSMSMarketing** | bit | NO | 0 | SMS配信許可 | ❌ |
| **TotalSpent** | decimal(18,2) | NO | 0 | 累計購入額（重要KPI） | ❌ |
| **TotalOrders** | int | NO | 0 | 累計注文数（重要KPI） | ❌ |
| **TaxExempt** | bit | NO | 0 | 税免除対象 | ❌ |
| **Tags** | nvarchar(1000) | YES | - | 顧客タグ（VIP, 新規等） | ❌ |
| **CompanyStoreName** | nvarchar(100) | YES | - | 会社店舗名（匿名化済み） | ✅ |
| **Industry** | nvarchar(100) | YES | - | 業種（分析用） | ❌ |
| **CustomerSegment** | nvarchar(50) | NO | '新規顧客' | 顧客セグメント | ❌ |
| **OrdersCount** | int | NO | 0 | 注文数（TotalOrdersの互換性フィールド） | ❌ |
| **CreatedAt** | datetime2 | NO | GETDATE() | 作成日時 | ❌ |
| **UpdatedAt** | datetime2 | NO | GETDATE() | 更新日時 | ❌ |

### インデックス
```sql
-- クラスタ化インデックス（主キー）
PK_Customers ON [Id]

-- 必須インデックス
CREATE INDEX IX_Customers_Email ON Customers(Email);
CREATE INDEX IX_Customers_ShopifyCustomerId ON Customers(ShopifyCustomerId) WHERE ShopifyCustomerId IS NOT NULL;

-- マルチストア対応インデックス
CREATE INDEX IX_Customers_StoreId_Email ON Customers(StoreId, Email);
CREATE INDEX IX_Customers_StoreId_ShopifyCustomerId ON Customers(StoreId, ShopifyCustomerId) WHERE ShopifyCustomerId IS NOT NULL;

-- 分析用インデックス
CREATE INDEX IX_Customers_CustomerSegment ON Customers(CustomerSegment) INCLUDE (TotalSpent, TotalOrders);
CREATE INDEX IX_Customers_TotalSpent ON Customers(TotalSpent DESC) INCLUDE (CustomerSegment, CreatedAt);
CREATE INDEX IX_Customers_ProvinceCode ON Customers(ProvinceCode) WHERE ProvinceCode IS NOT NULL;
```

## 🔒 匿名化設計

### 匿名化済み項目
1. **個人識別情報**
   - `FirstName`, `LastName`: 仮名に変換
   - `Email`: ランダムメールアドレスに変換
   - `Phone`, `AddressPhone`: 仮番号に変換

2. **企業情報**
   - `Company`, `CompanyStoreName`: 仮名企業名に変換

### 分析保持項目
1. **地域情報**（匿名化対象外）
   - `City`, `ProvinceCode`, `CountryCode`: 地域分析のため保持

2. **購買統計**（匿名化対象外）
   - `TotalSpent`, `TotalOrders`: 顧客価値分析の基盤

3. **属性情報**（匿名化対象外）
   - `Industry`, `CustomerSegment`: セグメンテーション分析

## 💼 顧客セグメンテーション

### CustomerSegment 分類
| セグメント | 条件 | 分析用途 |
|-----------|------|----------|
| **新規顧客** | TotalOrders = 1 | 新規獲得分析 |
| **リピーター** | TotalOrders 2-9 | リテンション分析 |
| **VIP顧客** | TotalOrders ≥ 10 OR TotalSpent ≥ 100,000 | 高価値顧客分析 |
| **休眠顧客** | 最終購入から90日以上 | 復帰施策分析 |

### 自動セグメント更新ロジック
```csharp
public string CalculateCustomerSegment(decimal totalSpent, int totalOrders, DateTime? lastPurchaseDate)
{
    var daysSinceLastPurchase = lastPurchaseDate.HasValue ? 
        (DateTime.UtcNow - lastPurchaseDate.Value).Days : int.MaxValue;
    
    if (daysSinceLastPurchase > 90)
        return "休眠顧客";
    
    if (totalOrders >= 10 || totalSpent >= 100000)
        return "VIP顧客";
    
    if (totalOrders >= 2)
        return "リピーター";
    
    return "新規顧客";
}
```

## Entity Framework モデル定義
```csharp
/// <summary>
/// 顧客エンティティ (Shopify CSV対応拡張版・匿名化済み)
/// </summary>
public class Customer
{
    [Key]
    public int Id { get; set; }
    
    // マルチストア対応
    [Required]
    public int StoreId { get; set; }
    
    // Shopify連携用ID
    [MaxLength(50)]
    public string? ShopifyCustomerId { get; set; }
    
    // 基本個人情報（匿名化済み）
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    [Required, EmailAddress, MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [MaxLength(20)]
    public string? Phone { get; set; }
    
    // 住所情報（一部匿名化）
    [MaxLength(100)]
    public string? Company { get; set; }
    
    [MaxLength(50)]
    public string? City { get; set; }
    
    [MaxLength(10)]
    public string? ProvinceCode { get; set; }
    
    [MaxLength(10)]
    public string? CountryCode { get; set; }
    
    [MaxLength(20)]
    public string? AddressPhone { get; set; }
    
    // マーケティング設定
    public bool AcceptsEmailMarketing { get; set; } = false;
    public bool AcceptsSMSMarketing { get; set; } = false;
    
    // 購買統計（重要KPI）
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalSpent { get; set; } = 0;
    
    public int TotalOrders { get; set; } = 0;
    
    // 顧客属性
    public bool TaxExempt { get; set; } = false;
    
    [MaxLength(1000)]
    public string? Tags { get; set; }
    
    // 追加属性（匿名化考慮）
    [MaxLength(100)]
    public string? CompanyStoreName { get; set; }
    
    [MaxLength(100)]
    public string? Industry { get; set; }
    
    [Required, MaxLength(50)]
    public string CustomerSegment { get; set; } = "新規顧客";
    
    // 互換性フィールド
    [Obsolete("Use TotalOrders instead")]
    public int OrdersCount { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // ナビゲーションプロパティ
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    
    // 📊 計算プロパティ（分析用）
    [NotMapped]
    public decimal AverageOrderValue => TotalOrders > 0 ? TotalSpent / TotalOrders : 0;
    
    [NotMapped]
    public string DisplayName => $"{FirstName} {LastName}";
    
    [NotMapped]
    public bool IsHighValueCustomer => TotalSpent > 100000;
    
    [NotMapped]
    public bool IsFrequentBuyer => TotalOrders > 10;
    
    [NotMapped]
    public string? RegionDisplay => !string.IsNullOrEmpty(ProvinceCode) ? 
        $"{City}, {ProvinceCode}" : City;
    
    [NotMapped]
    public int DaysSinceLastPurchase => Orders.Any() ? 
        (DateTime.UtcNow - Orders.Max(o => o.CreatedAt)).Days : int.MaxValue;
}
```

## 📊 典型的なクエリパターン

### 1. 顧客セグメント分析
```sql
-- セグメント別顧客数と平均購入額
SELECT 
    CustomerSegment,
    COUNT(*) as CustomerCount,
    AVG(TotalSpent) as AvgSpent,
    AVG(TotalOrders) as AvgOrders,
    SUM(TotalSpent) as TotalRevenue
FROM Customers
WHERE StoreId = @storeId
GROUP BY CustomerSegment
ORDER BY TotalRevenue DESC;
```

### 2. 地域別分析
```sql
-- 都道府県別顧客分布
SELECT 
    ProvinceCode,
    COUNT(*) as CustomerCount,
    SUM(TotalSpent) as TotalRevenue,
    AVG(TotalSpent) as AvgSpent
FROM Customers
WHERE StoreId = @storeId AND ProvinceCode IS NOT NULL
GROUP BY ProvinceCode
ORDER BY TotalRevenue DESC;
```

### 3. 休眠顧客抽出
```sql
-- 休眠顧客リスト（最終購入から90日以上）
SELECT 
    c.Id,
    c.Email,
    c.CustomerSegment,
    c.TotalSpent,
    MAX(o.CreatedAt) as LastPurchaseDate,
    DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) as DaysSinceLastPurchase
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
WHERE c.StoreId = @storeId
GROUP BY c.Id, c.Email, c.CustomerSegment, c.TotalSpent
HAVING DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) > 90
ORDER BY DaysSinceLastPurchase DESC;
```

### 4. 高価値顧客分析
```sql
-- VIP顧客の購買パターン分析
SELECT 
    c.Id,
    c.Email,
    c.TotalSpent,
    c.TotalOrders,
    c.AverageOrderValue,
    c.Industry,
    c.ProvinceCode
FROM (
    SELECT 
        Id, Email, TotalSpent, TotalOrders, Industry, ProvinceCode,
        CASE WHEN TotalOrders > 0 THEN TotalSpent / TotalOrders ELSE 0 END as AverageOrderValue
    FROM Customers
    WHERE StoreId = @storeId AND CustomerSegment = 'VIP顧客'
) c
ORDER BY c.TotalSpent DESC;
```

## ⚠️ データ整合性チェック

### 必須チェック項目

#### 1. 購買統計の整合性
```sql
-- Customers.TotalSpentとOrdersの合計金額が一致するかチェック
SELECT 
    c.Id,
    c.Email,
    c.TotalSpent as CustomerTotal,
    ISNULL(SUM(o.TotalPrice), 0) as OrdersTotal,
    ABS(c.TotalSpent - ISNULL(SUM(o.TotalPrice), 0)) as Difference
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId AND o.FinancialStatus IN ('paid', 'partially_paid')
WHERE c.StoreId = @storeId
GROUP BY c.Id, c.Email, c.TotalSpent
HAVING ABS(c.TotalSpent - ISNULL(SUM(o.TotalPrice), 0)) > 0.01
ORDER BY Difference DESC;
```

#### 2. 注文数の整合性
```sql
-- Customers.TotalOrdersとOrdersの件数が一致するかチェック
SELECT 
    c.Id,
    c.Email,
    c.TotalOrders as CustomerOrders,
    COUNT(o.Id) as ActualOrders,
    ABS(c.TotalOrders - COUNT(o.Id)) as Difference
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
WHERE c.StoreId = @storeId
GROUP BY c.Id, c.Email, c.TotalOrders
HAVING c.TotalOrders != COUNT(o.Id)
ORDER BY Difference DESC;
```

#### 3. セグメント分類の妥当性
```sql
-- CustomerSegmentの分類が正しいかチェック
SELECT 
    Id, Email, CustomerSegment, TotalSpent, TotalOrders,
    CASE 
        WHEN TotalOrders >= 10 OR TotalSpent >= 100000 THEN 'VIP顧客'
        WHEN TotalOrders >= 2 THEN 'リピーター'
        WHEN TotalOrders = 1 THEN '新規顧客'
        ELSE '未分類'
    END as CalculatedSegment
FROM Customers
WHERE StoreId = @storeId
  AND CustomerSegment != CASE 
    WHEN TotalOrders >= 10 OR TotalSpent >= 100000 THEN 'VIP顧客'
    WHEN TotalOrders >= 2 THEN 'リピーター'
    WHEN TotalOrders = 1 THEN '新規顧客'
    ELSE '未分類'
  END;
```

## 🚨 重要な運用ルール

### ✅ 推奨事項

1. **顧客データ更新時**
   ```csharp
   // ✅ 購買統計を同時更新
   customer.TotalSpent = orders.Where(o => o.FinancialStatus == "paid").Sum(o => o.TotalPrice);
   customer.TotalOrders = orders.Count();
   customer.CustomerSegment = CalculateCustomerSegment(customer.TotalSpent, customer.TotalOrders, lastPurchaseDate);
   customer.UpdatedAt = DateTime.UtcNow;
   ```

2. **新規顧客作成時**
   ```csharp
   // ✅ 必要な初期値を設定
   var customer = new Customer
   {
       StoreId = storeId,
       FirstName = anonymizedFirstName,
       LastName = anonymizedLastName,
       Email = anonymizedEmail,
       CustomerSegment = "新規顧客",
       TotalSpent = 0,
       TotalOrders = 0
   };
   ```

### 🚫 禁止事項

1. **個人情報の復元**
   ```csharp
   // ❌ 匿名化済みデータから個人情報を推測・復元してはいけない
   ```

2. **購買統計の手動変更**
   ```sql
   -- ❌ TotalSpent, TotalOrdersを直接更新してはいけない
   -- UPDATE Customers SET TotalSpent = 50000 WHERE Id = 1;
   ```

3. **セグメント分類の恣意的変更**
   ```csharp
   // ❌ 計算ロジックに基づかないセグメント変更は禁止
   customer.CustomerSegment = "VIP顧客";  // 条件を満たさない場合
   ```

---

**🎯 Customersテーブルは顧客分析の中核**

- **匿名化対応**: プライバシー保護と分析機能の両立
- **セグメンテーション**: 自動分類による顧客価値管理
- **統計管理**: リアルタイム購買統計による迅速な分析
- **マルチストア**: ストア別顧客データの完全分離

このテーブルを基盤として、精度の高い顧客分析と効果的なマーケティング施策の立案が可能になります。