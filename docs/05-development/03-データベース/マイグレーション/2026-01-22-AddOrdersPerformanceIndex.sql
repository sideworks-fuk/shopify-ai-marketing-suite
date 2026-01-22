-- ============================================================
-- マイグレーション: 注文テーブルのパフォーマンスインデックス追加
-- ファイル名: 2026-01-22-AddOrdersPerformanceIndex.sql
-- 作成日: 2026-01-22
-- 作成者: AI Assistant
-- 目的: 休眠顧客クエリのパフォーマンス改善
-- ============================================================

-- ============================================================
-- Step 1: 既存インデックスの確認
-- ============================================================
SELECT 
    i.name AS IndexName,
    c.name AS ColumnName,
    i.type_desc AS IndexType
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('Orders')
ORDER BY i.name, ic.key_ordinal;

-- ============================================================
-- Step 2: CustomerId + 日付の複合インデックス追加
-- ============================================================

-- 休眠顧客クエリ用インデックス（CustomerId + ShopifyProcessedAt DESC）
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_CustomerId_ShopifyProcessedAt')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_ShopifyProcessedAt
    ON Orders (CustomerId, ShopifyProcessedAt DESC)
    INCLUDE (ShopifyCreatedAt, CreatedAt);
    
    PRINT 'インデックス IX_Orders_CustomerId_ShopifyProcessedAt を作成しました';
END
ELSE
BEGIN
    PRINT 'インデックス IX_Orders_CustomerId_ShopifyProcessedAt は既に存在します';
END

-- StoreId + 日付の複合インデックス（分析クエリ全般用）
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_StoreId_ShopifyProcessedAt')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_StoreId_ShopifyProcessedAt
    ON Orders (StoreId, ShopifyProcessedAt DESC)
    INCLUDE (CustomerId, TotalPrice, ShopifyCreatedAt, CreatedAt);
    
    PRINT 'インデックス IX_Orders_StoreId_ShopifyProcessedAt を作成しました';
END
ELSE
BEGIN
    PRINT 'インデックス IX_Orders_StoreId_ShopifyProcessedAt は既に存在します';
END

-- ============================================================
-- Step 3: Customers テーブルのインデックス追加
-- ============================================================

-- Customers.StoreId + TotalOrders のインデックス（休眠顧客クエリ用）
-- 注: DisplayName はデータベースカラムではなく計算プロパティ (FirstName + LastName)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customers_StoreId_TotalOrders')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Customers_StoreId_TotalOrders
    ON Customers (StoreId, TotalOrders)
    INCLUDE (Id, FirstName, LastName, Email, Phone, Company, TotalSpent, Tags, LastOrderDate);
    
    PRINT 'インデックス IX_Customers_StoreId_TotalOrders を作成しました';
END
ELSE
BEGIN
    PRINT 'インデックス IX_Customers_StoreId_TotalOrders は既に存在します';
END

-- ============================================================
-- Step 4: OrderItems テーブルのインデックス追加
-- ============================================================

-- OrderItems.OrderId のインデックス（JOIN用）
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OrderItems_OrderId')
BEGIN
    CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId
    ON OrderItems (OrderId);
    
    PRINT 'インデックス IX_OrderItems_OrderId を作成しました';
END
ELSE
BEGIN
    PRINT 'インデックス IX_OrderItems_OrderId は既に存在します';
END

-- ============================================================
-- Step 5: 統計情報の更新
-- ============================================================
UPDATE STATISTICS Customers;
UPDATE STATISTICS Orders;
UPDATE STATISTICS OrderItems;
PRINT '統計情報を更新しました';

-- ============================================================
-- Step 6: 確認
-- ============================================================
SELECT 
    i.name AS IndexName,
    c.name AS ColumnName,
    i.type_desc AS IndexType,
    ic.is_included_column AS IsIncluded
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('Orders')
  AND i.name LIKE 'IX_Orders_%'
ORDER BY i.name, ic.key_ordinal;
