-- ============================================================
-- データ同期テスト後の確認クエリ（StoreId=46用）
-- ============================================================
-- 用途: マイグレーション適用後の同期データの整合性を確認
-- 対象: StoreId = 46
-- ============================================================

DECLARE @StoreId INT = 46;

PRINT '========================================';
PRINT 'データ同期テスト - 確認クエリ';
PRINT 'StoreId: ' + CAST(@StoreId AS NVARCHAR(10));
PRINT '========================================';
PRINT '';

-- ============================================================
-- 1. 基本データ件数確認
-- ============================================================
PRINT '--- 1. 基本データ件数 ---';
SELECT 
    (SELECT COUNT(*) FROM Customers WHERE StoreId = @StoreId) AS CustomerCount,
    (SELECT COUNT(*) FROM Products WHERE StoreId = @StoreId) AS ProductCount,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = @StoreId) AS OrderCount,
    (SELECT COUNT(*) FROM OrderItems oi 
     JOIN Orders o ON oi.OrderId = o.Id 
     WHERE o.StoreId = @StoreId) AS OrderItemCount;
PRINT '';

-- ============================================================
-- 2. ShopifyCreatedAtの設定状況確認
-- ============================================================
PRINT '--- 2. ShopifyCreatedAtの設定状況 ---';

-- Orders
PRINT 'Orders:';
SELECT 
    COUNT(*) AS TotalCount,
    SUM(CASE WHEN ShopifyCreatedAt IS NOT NULL THEN 1 ELSE 0 END) AS WithShopifyCreatedAt,
    SUM(CASE WHEN ShopifyCreatedAt IS NULL THEN 1 ELSE 0 END) AS WithoutShopifyCreatedAt,
    MIN(ShopifyCreatedAt) AS MinShopifyCreatedAt,
    MAX(ShopifyCreatedAt) AS MaxShopifyCreatedAt
FROM Orders
WHERE StoreId = @StoreId;
PRINT '';

-- Customers
PRINT 'Customers:';
SELECT 
    COUNT(*) AS TotalCount,
    SUM(CASE WHEN ShopifyCreatedAt IS NOT NULL THEN 1 ELSE 0 END) AS WithShopifyCreatedAt,
    SUM(CASE WHEN ShopifyCreatedAt IS NULL THEN 1 ELSE 0 END) AS WithoutShopifyCreatedAt,
    MIN(ShopifyCreatedAt) AS MinShopifyCreatedAt,
    MAX(ShopifyCreatedAt) AS MaxShopifyCreatedAt
FROM Customers
WHERE StoreId = @StoreId;
PRINT '';

-- Products
PRINT 'Products:';
SELECT 
    COUNT(*) AS TotalCount,
    SUM(CASE WHEN ShopifyCreatedAt IS NOT NULL THEN 1 ELSE 0 END) AS WithShopifyCreatedAt,
    SUM(CASE WHEN ShopifyCreatedAt IS NULL THEN 1 ELSE 0 END) AS WithoutShopifyCreatedAt,
    MIN(ShopifyCreatedAt) AS MinShopifyCreatedAt,
    MAX(ShopifyCreatedAt) AS MaxShopifyCreatedAt
FROM Products
WHERE StoreId = @StoreId;
PRINT '';

-- ============================================================
-- 3. SyncedAtの設定状況確認
-- ============================================================
PRINT '--- 3. SyncedAtの設定状況 ---';
SELECT 
    'Orders' AS TableName,
    COUNT(*) AS TotalCount,
    SUM(CASE WHEN SyncedAt IS NOT NULL THEN 1 ELSE 0 END) AS WithSyncedAt,
    MIN(SyncedAt) AS MinSyncedAt,
    MAX(SyncedAt) AS MaxSyncedAt
FROM Orders
WHERE StoreId = @StoreId
UNION ALL
SELECT 
    'Customers' AS TableName,
    COUNT(*) AS TotalCount,
    SUM(CASE WHEN SyncedAt IS NOT NULL THEN 1 ELSE 0 END) AS WithSyncedAt,
    MIN(SyncedAt) AS MinSyncedAt,
    MAX(SyncedAt) AS MaxSyncedAt
FROM Customers
WHERE StoreId = @StoreId
UNION ALL
SELECT 
    'Products' AS TableName,
    COUNT(*) AS TotalCount,
    SUM(CASE WHEN SyncedAt IS NOT NULL THEN 1 ELSE 0 END) AS WithSyncedAt,
    MIN(SyncedAt) AS MinSyncedAt,
    MAX(SyncedAt) AS MaxSyncedAt
FROM Products
WHERE StoreId = @StoreId;
PRINT '';

-- ============================================================
-- 4. OrderNumberユニーク制約の確認
-- ============================================================
PRINT '--- 4. OrderNumberユニーク制約の確認 ---';

-- 同一StoreId内でのOrderNumber重複チェック（あってはいけない）
SELECT 
    StoreId, 
    OrderNumber, 
    COUNT(*) AS Count
FROM Orders
WHERE StoreId = @StoreId AND OrderNumber IS NOT NULL
GROUP BY StoreId, OrderNumber
HAVING COUNT(*) > 1;

IF @@ROWCOUNT = 0
BEGIN
    PRINT '✅ 同一StoreId内でのOrderNumber重複はありません';
END
ELSE
BEGIN
    PRINT '❌ 同一StoreId内でOrderNumberの重複が見つかりました（問題あり）';
END
PRINT '';

-- 異なるStoreIdで同じOrderNumberが存在するか確認（存在してOK）
SELECT 
    OrderNumber, 
    COUNT(DISTINCT StoreId) AS StoreCount,
    STRING_AGG(CAST(StoreId AS NVARCHAR(10)), ', ') AS StoreIds
FROM Orders
WHERE OrderNumber IS NOT NULL
GROUP BY OrderNumber
HAVING COUNT(DISTINCT StoreId) > 1;

IF @@ROWCOUNT > 0
BEGIN
    PRINT '✅ 異なるStoreIdで同じOrderNumberが存在します（正常：マルチテナント対応）';
END
ELSE
BEGIN
    PRINT 'ℹ️ 異なるStoreIdで同じOrderNumberは見つかりませんでした（問題なし）';
END
PRINT '';

-- ============================================================
-- 5. 日時データのサンプル確認（最新10件）
-- ============================================================
PRINT '--- 5. Orders日時データのサンプル（最新10件） ---';
SELECT TOP 10
    Id,
    OrderNumber,
    ShopifyCreatedAt,
    CreatedAt AS DbCreatedAt,
    ShopifyUpdatedAt,
    UpdatedAt AS DbUpdatedAt,
    SyncedAt,
    CASE 
        WHEN ShopifyCreatedAt IS NOT NULL THEN 'Shopify日時使用'
        ELSE 'DB日時フォールバック'
    END AS DateSource
FROM Orders
WHERE StoreId = @StoreId
ORDER BY Id DESC;
PRINT '';

-- ============================================================
-- 6. 同期ステータスの確認
-- ============================================================
PRINT '--- 6. 同期ステータスの確認 ---';
SELECT 
    Id,
    StoreId,
    DataType,
    Status,
    CurrentTask,
    ProcessedRecords,
    TotalRecords,
    ProgressPercentage,
    ErrorMessage,
    StartedAt,
    CompletedAt,
    UpdatedAt
FROM SyncStatuses
WHERE StoreId = @StoreId
ORDER BY UpdatedAt DESC;
PRINT '';

-- ============================================================
-- 7. データ整合性チェック（CreatedAt vs ShopifyCreatedAt）
-- ============================================================
PRINT '--- 7. データ整合性チェック ---';

-- ShopifyCreatedAtがCreatedAtより古い場合（異常パターン）
SELECT 
    COUNT(*) AS AnomalyCount
FROM Orders
WHERE StoreId = @StoreId
  AND ShopifyCreatedAt IS NOT NULL
  AND CreatedAt IS NOT NULL
  AND ShopifyCreatedAt > CreatedAt;

IF @@ROWCOUNT = 0 OR (SELECT COUNT(*) FROM Orders WHERE StoreId = @StoreId AND ShopifyCreatedAt IS NOT NULL AND CreatedAt IS NOT NULL AND ShopifyCreatedAt > CreatedAt) = 0
BEGIN
    PRINT '✅ ShopifyCreatedAtとCreatedAtの整合性は問題ありません';
END
ELSE
BEGIN
    PRINT '⚠️ ShopifyCreatedAtがCreatedAtより新しいレコードがあります（要確認）';
END
PRINT '';

-- ============================================================
-- 8. 完了メッセージ
-- ============================================================
PRINT '========================================';
PRINT '確認クエリ完了';
PRINT '========================================';
PRINT '';
PRINT '確認ポイント:';
PRINT '  1. ShopifyCreatedAtが正しく設定されているか';
PRINT '  2. SyncedAtが設定されているか';
PRINT '  3. OrderNumberのユニーク制約が機能しているか';
PRINT '  4. 同期ステータスが正常か';
PRINT '';
