-- ============================================================
-- StoreId 18 - Protected Customer Data エラー調査用SQL
-- ============================================================
-- 用途: 本番環境で発生しているProtected Customer Dataエラーの原因調査
-- 対象: StoreId = 18
-- ============================================================

DECLARE @StoreId INT = 18;

PRINT '========================================';
PRINT 'StoreId ' + CAST(@StoreId AS NVARCHAR(10)) + ' - Protected Customer Data エラー調査';
PRINT '========================================';
PRINT '';

-- ============================================================
-- 1. ストア情報の確認
-- ============================================================
PRINT '--- 1. ストア情報 ---';
SELECT 
    Id,
    Name,
    Domain,
    ShopifyAppId,
    InitialSetupCompleted,
    LastSyncDate,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM Stores
WHERE Id = @StoreId;

IF @@ROWCOUNT = 0
BEGIN
    PRINT '⚠️ StoreId ' + CAST(@StoreId AS NVARCHAR(10)) + ' が見つかりませんでした';
    RETURN;
END

PRINT '';

-- ============================================================
-- 2. ShopifyApps情報の確認
-- ============================================================
PRINT '--- 2. ShopifyApps情報 ---';
SELECT 
    s.Id AS StoreId,
    s.Name AS StoreName,
    s.Domain,
    s.ShopifyAppId,
    sa.Id AS ShopifyAppId_Detail,
    sa.Name AS AppName,
    sa.ApiKey,
    sa.RedirectUri,
    sa.AppUrl,
    sa.CreatedAt AS AppCreatedAt,
    sa.UpdatedAt AS AppUpdatedAt
FROM Stores s
LEFT JOIN ShopifyApps sa ON s.ShopifyAppId = sa.Id
WHERE s.Id = @StoreId;

PRINT '';

-- ============================================================
-- 3. 最新の同期ステータス確認（SyncStatuses）
-- ============================================================
PRINT '--- 3. 最新の同期ステータス（SyncStatuses）---';
SELECT TOP 5
    Id,
    StoreId,
    SyncType,
    EntityType,
    Status,
    StartDate,
    EndDate,
    ProcessedRecords,
    TotalRecords,
    ErrorMessage,
    CurrentTask,
    UpdatedAt,
    DATEDIFF(SECOND, StartDate, EndDate) AS DurationSeconds
FROM SyncStatuses
WHERE StoreId = @StoreId
ORDER BY StartDate DESC;

PRINT '';

-- ============================================================
-- 4. 最新の同期ステータス確認（SyncStates - データタイプ別）
-- ============================================================
PRINT '--- 4. 最新の同期ステータス（SyncStates - データタイプ別）---';
SELECT 
    DataType,
    Status,
    StartDate,
    EndDate,
    ProcessedRecords,
    TotalRecords,
    ErrorMessage,
    ProgressPercentage,
    DATEDIFF(SECOND, StartDate, EndDate) AS DurationSeconds,
    DATEDIFF(MINUTE, StartDate, ISNULL(EndDate, GETUTCDATE())) AS DurationMinutes
FROM (
    SELECT 
        DataType,
        Status,
        StartDate,
        EndDate,
        ProcessedRecords,
        TotalRecords,
        ErrorMessage,
        ProgressPercentage,
        ROW_NUMBER() OVER (PARTITION BY DataType ORDER BY StartDate DESC) AS rn
    FROM SyncStates
    WHERE StoreId = @StoreId
) AS Latest
WHERE rn = 1
ORDER BY 
    CASE DataType 
        WHEN 'Customers' THEN 1 
        WHEN 'Products' THEN 2 
        WHEN 'Orders' THEN 3 
        ELSE 4 
    END;

PRINT '';

-- ============================================================
-- 5. 同期範囲設定の確認
-- ============================================================
PRINT '--- 5. 同期範囲設定 ---';
SELECT 
    Id,
    StoreId,
    DataType,
    StartDate,
    EndDate,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM SyncRangeSettings
WHERE StoreId = @StoreId
ORDER BY DataType;

PRINT '';

-- ============================================================
-- 6. データ件数の確認
-- ============================================================
PRINT '--- 6. データ件数 ---';
SELECT 
    (SELECT COUNT(*) FROM Customers WHERE StoreId = @StoreId) AS CustomerCount,
    (SELECT COUNT(*) FROM Products WHERE StoreId = @StoreId) AS ProductCount,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = @StoreId) AS OrderCount,
    (SELECT COUNT(*) FROM OrderItems oi JOIN Orders o ON oi.OrderId = o.Id WHERE o.StoreId = @StoreId) AS OrderItemCount;

PRINT '';

-- ============================================================
-- 7. Protected Customer Data エラー履歴
-- ============================================================
PRINT '--- 7. Protected Customer Data エラー履歴 ---';
SELECT 
    Id,
    DataType,
    Status,
    StartDate,
    EndDate,
    ErrorMessage,
    DATEDIFF(MINUTE, StartDate, EndDate) AS DurationMinutes
FROM SyncStates
WHERE StoreId = @StoreId
  AND (
      ErrorMessage LIKE '%Protected%customer%data%' 
      OR ErrorMessage LIKE '%Forbidden%'
      OR ErrorMessage LIKE '%Protected Customer Data%'
  )
ORDER BY StartDate DESC;

DECLARE @ErrorCount INT;
SELECT @ErrorCount = COUNT(*)
FROM SyncStates
WHERE StoreId = @StoreId
  AND (
      ErrorMessage LIKE '%Protected%customer%data%' 
      OR ErrorMessage LIKE '%Forbidden%'
      OR ErrorMessage LIKE '%Protected Customer Data%'
  );

IF @ErrorCount > 0
BEGIN
    PRINT '';
    PRINT '⚠️ Protected Customer Data エラーが ' + CAST(@ErrorCount AS NVARCHAR(10)) + ' 件見つかりました';
    PRINT '⚠️ Shopify Partners管理画面でProtected Customer Dataへのアクセスを申請してください:';
    PRINT '⚠️ https://partners.shopify.com → Apps → EC Ranger → App setup → Protected customer data';
END
ELSE
BEGIN
    PRINT '';
    PRINT '✅ Protected Customer Data エラーは見つかりませんでした';
END

PRINT '';

-- ============================================================
-- 8. チェックポイントの確認
-- ============================================================
PRINT '--- 8. チェックポイント ---';
SELECT 
    CheckpointId,
    StoreId,
    DataType,
    LastSuccessfulCursor,
    RecordsProcessedSoFar,
    SyncStartDate,
    SyncEndDate,
    CanResume,
    ExpiresAt,
    CreatedAt,
    UpdatedAt
FROM SyncCheckpoints
WHERE StoreId = @StoreId
ORDER BY DataType;

PRINT '';

-- ============================================================
-- 調査結果サマリー
-- ============================================================
PRINT '========================================';
PRINT '調査結果サマリー';
PRINT '========================================';

-- ストアの状態
DECLARE @StoreName NVARCHAR(255);
DECLARE @Domain NVARCHAR(255);
DECLARE @InitialSetupCompleted BIT;
DECLARE @ShopifyAppId INT;

SELECT 
    @StoreName = Name,
    @Domain = Domain,
    @InitialSetupCompleted = InitialSetupCompleted,
    @ShopifyAppId = ShopifyAppId
FROM Stores
WHERE Id = @StoreId;

PRINT 'ストア名: ' + ISNULL(@StoreName, 'N/A');
PRINT 'ドメイン: ' + ISNULL(@Domain, 'N/A');
PRINT '初期設定完了: ' + CASE WHEN @InitialSetupCompleted = 1 THEN '✅ 完了' ELSE '❌ 未完了' END;
PRINT 'ShopifyAppId: ' + ISNULL(CAST(@ShopifyAppId AS NVARCHAR(10)), 'N/A');
PRINT '';

-- 同期ステータス
DECLARE @CustomersStatus NVARCHAR(50);
DECLARE @ProductsStatus NVARCHAR(50);
DECLARE @OrdersStatus NVARCHAR(50);

SELECT 
    @CustomersStatus = Status
FROM (
    SELECT Status, ROW_NUMBER() OVER (ORDER BY StartDate DESC) AS rn
    FROM SyncStates
    WHERE StoreId = @StoreId AND DataType = 'Customers'
) AS Latest
WHERE rn = 1;

SELECT 
    @ProductsStatus = Status
FROM (
    SELECT Status, ROW_NUMBER() OVER (ORDER BY StartDate DESC) AS rn
    FROM SyncStates
    WHERE StoreId = @StoreId AND DataType = 'Products'
) AS Latest
WHERE rn = 1;

SELECT 
    @OrdersStatus = Status
FROM (
    SELECT Status, ROW_NUMBER() OVER (ORDER BY StartDate DESC) AS rn
    FROM SyncStates
    WHERE StoreId = @StoreId AND DataType = 'Orders'
) AS Latest
WHERE rn = 1;

PRINT '同期ステータス:';
PRINT '  顧客データ: ' + ISNULL(@CustomersStatus, 'N/A');
PRINT '  商品データ: ' + ISNULL(@ProductsStatus, 'N/A');
PRINT '  注文データ: ' + ISNULL(@OrdersStatus, 'N/A');
PRINT '';

-- 推奨アクション
IF @CustomersStatus = 'Failed' OR @OrdersStatus = 'Failed'
BEGIN
    PRINT '⚠️ 推奨アクション:';
    PRINT '1. Shopify Partners管理画面でProtected Customer Dataへのアクセスを申請';
    PRINT '2. 申請URL: https://partners.shopify.com → Apps → EC Ranger → App setup → Protected customer data';
    PRINT '3. 承認後に再同期を実行: /sync/initial または /sync/trigger';
END

PRINT '';
PRINT '========================================';
PRINT '調査完了';
PRINT '========================================';

-- ============================================================
-- 作成日: 2026-01-20
-- 作成者: AI Assistant
-- ============================================================
