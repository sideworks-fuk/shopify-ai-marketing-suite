-- マイグレーション: DeleteStoreId46Data-v2
-- 作成日: 2026-01-07
-- 作成者: 福田＋AI Assistant
-- 目的: StoreId=46のデータをすべて削除（同期データのクリア・再同期用）
-- 影響: StoreId=46に関連するすべてのデータが削除されます
-- ⚠️ 警告: このスクリプトはデータを完全に削除します。実行前に必ずバックアップを取得してください。
-- 更新: SyncStatuses.StoreIdが整数型に変更されたため、クエリを更新

-- 削除前にデータ件数を確認
PRINT '=== StoreId=46 のデータ件数確認 ===';
SELECT 'OrderItems' AS TableName, COUNT(*) AS RecordCount 
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 46;

SELECT 'Orders' AS TableName, COUNT(*) AS RecordCount 
FROM Orders 
WHERE StoreId = 46;

SELECT 'ProductVariants' AS TableName, COUNT(*) AS RecordCount 
FROM ProductVariants pv
INNER JOIN Products p ON pv.ProductId = p.Id
WHERE p.StoreId = 46;

SELECT 'Products' AS TableName, COUNT(*) AS RecordCount 
FROM Products 
WHERE StoreId = 46;

SELECT 'Customers' AS TableName, COUNT(*) AS RecordCount 
FROM Customers 
WHERE StoreId = 46;

SELECT 'SyncProgressDetails' AS TableName, COUNT(*) AS RecordCount 
FROM SyncProgressDetails spd
INNER JOIN SyncStates ss ON spd.SyncStateId = ss.SyncStateId
WHERE ss.StoreId = 46;

SELECT 'SyncCheckpoints' AS TableName, COUNT(*) AS RecordCount 
FROM SyncCheckpoints 
WHERE StoreId = 46;

SELECT 'SyncRangeSettings' AS TableName, COUNT(*) AS RecordCount 
FROM SyncRangeSettings 
WHERE StoreId = 46;

SELECT 'SyncStates' AS TableName, COUNT(*) AS RecordCount 
FROM SyncStates 
WHERE StoreId = 46;

SELECT 'SyncHistories' AS TableName, COUNT(*) AS RecordCount 
FROM SyncHistories 
WHERE StoreId = 46;

-- 🆕 SyncStatuses.StoreIdは整数型に変更されたため、数値で比較
SELECT 'SyncStatuses' AS TableName, COUNT(*) AS RecordCount 
FROM SyncStatuses 
WHERE StoreId = 46;

PRINT '=== 削除開始 ===';

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. OrderItems (Ordersの子テーブル)
    DELETE oi
    FROM OrderItems oi
    INNER JOIN Orders o ON oi.OrderId = o.Id
    WHERE o.StoreId = 46;
    PRINT 'OrderItems 削除完了';

    -- 2. Orders
    DELETE FROM Orders WHERE StoreId = 46;
    PRINT 'Orders 削除完了';

    -- 3. ProductVariants (Productsの子テーブル)
    DELETE pv
    FROM ProductVariants pv
    INNER JOIN Products p ON pv.ProductId = p.Id
    WHERE p.StoreId = 46;
    PRINT 'ProductVariants 削除完了';

    -- 4. Products
    DELETE FROM Products WHERE StoreId = 46;
    PRINT 'Products 削除完了';

    -- 5. Customers
    DELETE FROM Customers WHERE StoreId = 46;
    PRINT 'Customers 削除完了';

    -- 6. SyncProgressDetails (SyncStatesの子テーブル)
    DELETE spd
    FROM SyncProgressDetails spd
    INNER JOIN SyncStates ss ON spd.SyncStateId = ss.SyncStateId
    WHERE ss.StoreId = 46;
    PRINT 'SyncProgressDetails 削除完了';

    -- 7. SyncCheckpoints
    DELETE FROM SyncCheckpoints WHERE StoreId = 46;
    PRINT 'SyncCheckpoints 削除完了';

    -- 8. SyncRangeSettings
    DELETE FROM SyncRangeSettings WHERE StoreId = 46;
    PRINT 'SyncRangeSettings 削除完了';

    -- 9. SyncStates
    DELETE FROM SyncStates WHERE StoreId = 46;
    PRINT 'SyncStates 削除完了';

    -- 10. SyncHistories
    DELETE FROM SyncHistories WHERE StoreId = 46;
    PRINT 'SyncHistories 削除完了';

    -- 11. SyncStatuses (StoreIdは整数型)
    DELETE FROM SyncStatuses WHERE StoreId = 46;
    PRINT 'SyncStatuses 削除完了';

    -- 削除後のデータ件数確認
    PRINT '=== 削除後のデータ件数確認 ===';
    SELECT 'OrderItems' AS TableName, COUNT(*) AS RecordCount 
    FROM OrderItems oi
    INNER JOIN Orders o ON oi.OrderId = o.Id
    WHERE o.StoreId = 46;

    SELECT 'Orders' AS TableName, COUNT(*) AS RecordCount 
    FROM Orders 
    WHERE StoreId = 46;

    SELECT 'ProductVariants' AS TableName, COUNT(*) AS RecordCount 
    FROM ProductVariants pv
    INNER JOIN Products p ON pv.ProductId = p.Id
    WHERE p.StoreId = 46;

    SELECT 'Products' AS TableName, COUNT(*) AS RecordCount 
    FROM Products 
    WHERE StoreId = 46;

    SELECT 'Customers' AS TableName, COUNT(*) AS RecordCount 
    FROM Customers 
    WHERE StoreId = 46;

    SELECT 'SyncProgressDetails' AS TableName, COUNT(*) AS RecordCount 
    FROM SyncProgressDetails spd
    INNER JOIN SyncStates ss ON spd.SyncStateId = ss.SyncStateId
    WHERE ss.StoreId = 46;

    SELECT 'SyncCheckpoints' AS TableName, COUNT(*) AS RecordCount 
    FROM SyncCheckpoints 
    WHERE StoreId = 46;

    SELECT 'SyncRangeSettings' AS TableName, COUNT(*) AS RecordCount 
    FROM SyncRangeSettings 
    WHERE StoreId = 46;

    SELECT 'SyncStates' AS TableName, COUNT(*) AS RecordCount 
    FROM SyncStates 
    WHERE StoreId = 46;

    SELECT 'SyncHistories' AS TableName, COUNT(*) AS RecordCount 
    FROM SyncHistories 
    WHERE StoreId = 46;

    SELECT 'SyncStatuses' AS TableName, COUNT(*) AS RecordCount 
    FROM SyncStatuses 
    WHERE StoreId = 46;

    COMMIT TRANSACTION;
    PRINT '=== 削除完了 ===';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '=== エラー発生: ロールバックしました ===';
    PRINT ERROR_MESSAGE();
    PRINT 'エラー行: ' + CAST(ERROR_LINE() AS VARCHAR(10));
    PRINT 'エラー番号: ' + CAST(ERROR_NUMBER() AS VARCHAR(10));
    THROW;
END CATCH;
