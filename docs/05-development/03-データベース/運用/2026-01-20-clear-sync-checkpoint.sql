-- ============================================================
-- 同期チェックポイントクリアスクリプト
-- ============================================================
-- 用途: 無効なチェックポイントが原因で同期エラーが発生している場合に使用
-- 対象: 指定したStoreIdのチェックポイントをクリア
-- ============================================================

-- ⚠️ 注意: チェックポイントをクリアすると、次回の同期は最初から再開されます
-- ⚠️ 既に同期済みのデータは削除されません

-- ============================================================
-- 1. パラメータ設定
-- ============================================================
DECLARE @StoreId INT = 46; -- クリア対象のStoreIdを指定
DECLARE @DataType NVARCHAR(50) = 'Orders'; -- 'Customers' | 'Products' | 'Orders'
DECLARE @ConfirmClear BIT = 0; -- 1に設定するとクリアを実行

-- ============================================================
-- 2. 既存のチェックポイント確認
-- ============================================================
PRINT '========================================';
PRINT '既存のチェックポイント確認';
PRINT '========================================';

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
  AND DataType = @DataType;

DECLARE @CheckpointCount INT;
SELECT @CheckpointCount = COUNT(*)
FROM SyncCheckpoints
WHERE StoreId = @StoreId AND DataType = @DataType;

IF @CheckpointCount = 0
BEGIN
    PRINT '⚠️ チェックポイントが見つかりませんでした';
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ チェックポイントが ' + CAST(@CheckpointCount AS NVARCHAR(10)) + ' 件見つかりました';
END

PRINT '';

-- ============================================================
-- 3. チェックポイントのクリア
-- ============================================================
IF @ConfirmClear = 1
BEGIN
    BEGIN TRANSACTION;
    
    PRINT '========================================';
    PRINT 'チェックポイントをクリア中...';
    PRINT '========================================';
    
    DELETE FROM SyncCheckpoints
    WHERE StoreId = @StoreId AND DataType = @DataType;
    
    DECLARE @DeletedCount INT = @@ROWCOUNT;
    
    IF @DeletedCount > 0
    BEGIN
        PRINT '✅ チェックポイントを ' + CAST(@DeletedCount AS NVARCHAR(10)) + ' 件削除しました';
        PRINT '';
        PRINT '⚠️ 次回の同期は最初から再開されます';
        PRINT '';
        PRINT '⚠️ 問題がなければ、以下のコマンドでコミットしてください:';
        PRINT 'COMMIT TRANSACTION;';
        PRINT '';
        PRINT '⚠️ 問題がある場合は、以下のコマンドでロールバックしてください:';
        PRINT 'ROLLBACK TRANSACTION;';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 削除されたチェックポイントがありません';
        ROLLBACK TRANSACTION;
    END
END
ELSE
BEGIN
    PRINT '========================================';
    PRINT '⚠️ クリアは実行されませんでした';
    PRINT '========================================';
    PRINT '';
    PRINT 'クリアを実行するには、@ConfirmClear を 1 に設定してください';
    PRINT '';
    PRINT '例:';
    PRINT 'DECLARE @ConfirmClear BIT = 1;';
    PRINT '';
END

-- ============================================================
-- 4. 関連する同期ステータスの確認（オプション）
-- ============================================================
PRINT '';
PRINT '========================================';
PRINT '関連する同期ステータスの確認';
PRINT '========================================';

SELECT 
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
    UpdatedAt
FROM SyncStatuses
WHERE StoreId = @StoreId 
  AND EntityType LIKE '%' + @DataType + '%'
ORDER BY UpdatedAt DESC;

-- ============================================================
-- 使用方法
-- ============================================================
-- 1. @StoreId をクリア対象のStoreIdに設定
-- 2. @DataType をクリア対象のデータタイプに設定（'Customers' | 'Products' | 'Orders'）
-- 3. @ConfirmClear を 1 に設定
-- 4. スクリプトを実行
-- 5. 問題がなければ COMMIT TRANSACTION; を実行

-- ============================================================
-- 作成日: 2026-01-20
-- 作成者: AI Assistant
-- ============================================================
