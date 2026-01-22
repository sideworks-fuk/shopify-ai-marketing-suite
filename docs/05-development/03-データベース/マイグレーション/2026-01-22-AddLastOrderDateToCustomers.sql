-- ============================================================
-- マイグレーション: Customers テーブルに LastOrderDate を追加（非正規化）
-- ファイル名: 2026-01-22-AddLastOrderDateToCustomers.sql
-- 作成日: 2026-01-22
-- 作成者: AI Assistant
-- 目的: 休眠顧客クエリのパフォーマンス改善（サブクエリ排除）
-- ============================================================

-- ============================================================
-- Step 1: LastOrderDate カラムを追加
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Customers' AND COLUMN_NAME = 'LastOrderDate'
)
BEGIN
    ALTER TABLE Customers 
    ADD LastOrderDate datetime2(7) NULL;
    
    PRINT 'カラム LastOrderDate を Customers テーブルに追加しました';
END
ELSE
BEGIN
    PRINT 'カラム LastOrderDate は既に存在します';
END
GO

-- ============================================================
-- Step 2: 既存データの LastOrderDate を更新
-- ============================================================
PRINT '既存データの LastOrderDate を更新中...';

UPDATE c
SET c.LastOrderDate = (
    SELECT MAX(COALESCE(o.ShopifyProcessedAt, o.ShopifyCreatedAt, o.CreatedAt))
    FROM Orders o
    WHERE o.CustomerId = c.Id
)
FROM Customers c
WHERE c.TotalOrders > 0;

PRINT '既存データの LastOrderDate を更新しました';
GO

-- ============================================================
-- Step 3: インデックスを追加
-- ============================================================
-- 注: DisplayName はデータベースカラムではなく計算プロパティ (FirstName + LastName)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customers_StoreId_LastOrderDate')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Customers_StoreId_LastOrderDate
    ON Customers (StoreId, LastOrderDate DESC)
    INCLUDE (Id, FirstName, LastName, Email, Phone, Company, TotalSpent, TotalOrders, Tags);
    
    PRINT 'インデックス IX_Customers_StoreId_LastOrderDate を作成しました';
END
ELSE
BEGIN
    PRINT 'インデックス IX_Customers_StoreId_LastOrderDate は既に存在します';
END
GO

-- ============================================================
-- Step 4: 統計情報の更新
-- ============================================================
UPDATE STATISTICS Customers;
PRINT '統計情報を更新しました';
GO

-- ============================================================
-- Step 5: 確認
-- ============================================================
SELECT 
    c.Id,
    CONCAT(c.FirstName, ' ', c.LastName) AS DisplayName,
    c.TotalOrders,
    c.LastOrderDate,
    DATEDIFF(DAY, c.LastOrderDate, GETUTCDATE()) AS DaysSinceLastOrder
FROM Customers c
WHERE c.StoreId = 1 AND c.TotalOrders > 0
ORDER BY c.LastOrderDate DESC
OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;
