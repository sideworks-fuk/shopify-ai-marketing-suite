-- =============================================
-- 作成日: 2025-10-24
-- 作成者: 福田 + AI
-- 目的: OrdersテーブルにShopifyOrderIdとFulfillmentStatusカラムを追加
-- 影響: Ordersテーブルにカラム追加
-- =============================================

PRINT 'Starting migration: Add ShopifyOrderId and FulfillmentStatus to Orders table...'
GO

-- =============================================
-- SECTION 1: Ordersテーブルへのカラム追加
-- =============================================

-- 1.1 ShopifyOrderId カラム追加
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'ShopifyOrderId'
)
BEGIN
    ALTER TABLE Orders
    ADD ShopifyOrderId NVARCHAR(50) NULL;
    
    PRINT '✅ Added ShopifyOrderId column to Orders table';
    
    -- インデックス追加
    CREATE INDEX IX_Orders_ShopifyOrderId ON Orders(ShopifyOrderId);
    PRINT '✅ Created index IX_Orders_ShopifyOrderId';
END
ELSE
    PRINT 'ℹ️ ShopifyOrderId column already exists in Orders table';
GO

-- 1.2 FulfillmentStatus カラム追加
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Orders') 
    AND name = 'FulfillmentStatus'
)
BEGIN
    ALTER TABLE Orders
    ADD FulfillmentStatus NVARCHAR(50) NULL;
    
    PRINT '✅ Added FulfillmentStatus column to Orders table';
END
ELSE
    PRINT 'ℹ️ FulfillmentStatus column already exists in Orders table';
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
PRINT '  - Orders.ShopifyOrderId (NVARCHAR(50))'
PRINT '  - Orders.FulfillmentStatus (NVARCHAR(50))'
PRINT ''
PRINT 'Created indexes:'
PRINT '  - IX_Orders_ShopifyOrderId'
PRINT ''
GO

-- 検証クエリ
SELECT 
    'Orders' AS TableName,
    COUNT(*) AS TotalRows,
    COUNT(ShopifyOrderId) AS ShopifyOrderId_Count,
    COUNT(FulfillmentStatus) AS FulfillmentStatus_Count
FROM Orders;
GO

