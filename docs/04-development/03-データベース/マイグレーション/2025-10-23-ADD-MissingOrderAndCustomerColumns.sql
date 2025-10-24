-- =============================================
-- 作成日: 2025-10-23
-- 作成者: 福田 + AI
-- 目的: OrdersテーブルとCustomersテーブルに不足しているカラムを追加
-- 影響: Orders, Customersテーブルにカラム追加
-- =============================================

PRINT 'Starting migration: Add missing columns to Orders and Customers tables...'
GO

-- =============================================
-- SECTION 1: Ordersテーブルへのカラム追加
-- =============================================

-- 1.1 ShopifyCustomerId カラム追加
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'ShopifyCustomerId'
)
BEGIN
    ALTER TABLE Orders
    ADD ShopifyCustomerId NVARCHAR(50) NULL;
    
    PRINT '✅ Added ShopifyCustomerId column to Orders table';
END
ELSE
    PRINT 'ℹ️ ShopifyCustomerId column already exists in Orders table';
GO

-- 1.2 Email カラム追加（CustomerEmailとは別に）
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'Email'
)
BEGIN
    ALTER TABLE Orders
    ADD Email NVARCHAR(255) NULL;
    
    -- CustomerEmailからEmailにデータをコピー
    UPDATE Orders
    SET Email = CustomerEmail
    WHERE CustomerEmail IS NOT NULL;
    
    PRINT '✅ Added Email column to Orders table and copied data from CustomerEmail';
END
ELSE
    PRINT 'ℹ️ Email column already exists in Orders table';
GO

-- 1.3 TotalTax カラム追加
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'TotalTax'
)
BEGIN
    ALTER TABLE Orders
    ADD TotalTax DECIMAL(18,2) NOT NULL DEFAULT 0;
    
    PRINT '✅ Added TotalTax column to Orders table';
END
ELSE
    PRINT 'ℹ️ TotalTax column already exists in Orders table';
GO

-- 1.4 FinancialStatus カラム追加（念のため確認）
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'FinancialStatus'
)
BEGIN
    ALTER TABLE Orders
    ADD FinancialStatus NVARCHAR(50) NULL;
    
    PRINT '✅ Added FinancialStatus column to Orders table';
END
ELSE
    PRINT 'ℹ️ FinancialStatus column already exists in Orders table';
GO

-- =============================================
-- SECTION 2: Customersテーブルへのカラム追加
-- =============================================

-- 2.1 IsActive カラム追加
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Customers') 
    AND name = 'IsActive'
)
BEGIN
    ALTER TABLE Customers
    ADD IsActive BIT NOT NULL DEFAULT 1;
    
    PRINT '✅ Added IsActive column to Customers table';
END
ELSE
    PRINT 'ℹ️ IsActive column already exists in Customers table';
GO

-- 2.2 TotalOrders カラム追加（念のため確認）
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Customers') 
    AND name = 'TotalOrders'
)
BEGIN
    ALTER TABLE Customers
    ADD TotalOrders INT NOT NULL DEFAULT 0;
    
    -- OrdersCountからTotalOrdersにデータをコピー
    UPDATE Customers
    SET TotalOrders = OrdersCount;
    
    PRINT '✅ Added TotalOrders column to Customers table and copied data from OrdersCount';
END
ELSE
    PRINT 'ℹ️ TotalOrders column already exists in Customers table';
GO

-- =============================================
-- SECTION 3: インデックス追加（パフォーマンス最適化）
-- =============================================

-- 3.1 Orders.ShopifyCustomerId にインデックス追加
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'IX_Orders_ShopifyCustomerId'
)
BEGIN
    CREATE INDEX IX_Orders_ShopifyCustomerId ON Orders(ShopifyCustomerId);
    PRINT '✅ Created index IX_Orders_ShopifyCustomerId';
END
ELSE
    PRINT 'ℹ️ Index IX_Orders_ShopifyCustomerId already exists';
GO

-- 3.2 Orders.Email にインデックス追加
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'IX_Orders_Email'
)
BEGIN
    CREATE INDEX IX_Orders_Email ON Orders(Email);
    PRINT '✅ Created index IX_Orders_Email';
END
ELSE
    PRINT 'ℹ️ Index IX_Orders_Email already exists';
GO

-- 3.3 Customers.IsActive にインデックス追加
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('Customers') 
    AND name = 'IX_Customers_IsActive'
)
BEGIN
    CREATE INDEX IX_Customers_IsActive ON Customers(IsActive);
    PRINT '✅ Created index IX_Customers_IsActive';
END
ELSE
    PRINT 'ℹ️ Index IX_Customers_IsActive already exists';
GO

-- =============================================
-- 最終確認
-- =============================================

PRINT ''
PRINT '========================================='
PRINT 'Migration completed successfully!'
PRINT '========================================='
PRINT ''
PRINT 'Added columns:'
PRINT '  - Orders.ShopifyCustomerId (NVARCHAR(50))'
PRINT '  - Orders.Email (NVARCHAR(255))'
PRINT '  - Orders.TotalTax (DECIMAL(18,2))'
PRINT '  - Orders.FinancialStatus (NVARCHAR(50))'
PRINT '  - Customers.IsActive (BIT)'
PRINT '  - Customers.TotalOrders (INT)'
PRINT ''
PRINT 'Created indexes:'
PRINT '  - IX_Orders_ShopifyCustomerId'
PRINT '  - IX_Orders_Email'
PRINT '  - IX_Customers_IsActive'
PRINT ''
GO

-- 検証クエリ（オプション）
SELECT 
    'Orders' AS TableName,
    COUNT(*) AS TotalRows,
    COUNT(ShopifyCustomerId) AS ShopifyCustomerId_Count,
    COUNT(Email) AS Email_Count,
    SUM(TotalTax) AS TotalTax_Sum
FROM Orders;

SELECT 
    'Customers' AS TableName,
    COUNT(*) AS TotalRows,
    SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS Active_Count,
    SUM(TotalOrders) AS TotalOrders_Sum
FROM Customers;
GO

