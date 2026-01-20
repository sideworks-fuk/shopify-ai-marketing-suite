-- ============================================================
-- 同期ステータスリセットスクリプト
-- ============================================================
-- 用途: 「同期が既に実行中です」エラーが発生した場合に使用
-- 対象: 指定したStoreIdの実行中ステータスをリセット
-- ============================================================

-- ⚠️ 注意: 実行中の同期がある場合は、先にHangfireでジョブを確認・停止してください
-- ⚠️ Hangfireダッシュボード: https://ec-ranger-api.access-net.co.jp/hangfire

-- ============================================================
-- 1. パラメータ設定
-- ============================================================
DECLARE @StoreId INT = 46; -- リセット対象のStoreIdを指定
DECLARE @Action NVARCHAR(20) = 'CHECK'; -- 'CHECK' | 'RESET' | 'RESET_FAILED'
DECLARE @MinutesAgo INT = 60; -- @Action='RESET_FAILED'の場合、この分数以上前に開始された同期をリセット

-- ============================================================
-- 2. 現在の状態確認
-- ============================================================
PRINT '========================================';
PRINT '同期ステータスの確認';
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
    CurrentTask,
    ErrorMessage,
    UpdatedAt,
    DATEDIFF(MINUTE, StartDate, GETUTCDATE()) AS MinutesSinceStart,
    CASE 
        WHEN Status = 'running' AND DATEDIFF(MINUTE, StartDate, GETUTCDATE()) > @MinutesAgo 
        THEN '⚠️ 長時間実行中（停止の可能性あり）'
        WHEN Status = 'running' 
        THEN '✅ 実行中'
        WHEN Status = 'completed' 
        THEN '✅ 完了'
        WHEN Status = 'failed' 
        THEN '❌ 失敗'
        ELSE '❓ その他'
    END AS StatusNote
FROM SyncStatuses
WHERE StoreId = @StoreId
ORDER BY StartDate DESC;

DECLARE @RunningCount INT;
SELECT @RunningCount = COUNT(*)
FROM SyncStatuses
WHERE StoreId = @StoreId AND Status = 'running';

IF @RunningCount > 0
BEGIN
    PRINT '';
    PRINT '⚠️ 実行中の同期が ' + CAST(@RunningCount AS NVARCHAR(10)) + ' 件見つかりました';
    
    -- 長時間実行中の同期をチェック
    DECLARE @LongRunningCount INT;
    SELECT @LongRunningCount = COUNT(*)
    FROM SyncStatuses
    WHERE StoreId = @StoreId 
      AND Status = 'running'
      AND DATEDIFF(MINUTE, StartDate, GETUTCDATE()) > @MinutesAgo;
    
    IF @LongRunningCount > 0
    BEGIN
        PRINT '⚠️ そのうち ' + CAST(@LongRunningCount AS NVARCHAR(10)) + ' 件は ' + CAST(@MinutesAgo AS NVARCHAR(10)) + ' 分以上実行中です（停止の可能性あり）';
    END
END
ELSE
BEGIN
    PRINT '';
    PRINT '✅ 実行中の同期はありません';
END

PRINT '';

-- ============================================================
-- 3. アクション実行
-- ============================================================
IF @Action = 'CHECK'
BEGIN
    PRINT '========================================';
    PRINT 'CHECK モード: 状態確認のみ（変更なし）';
    PRINT '========================================';
    PRINT '';
    PRINT '⚠️ 実行中の同期をリセットする場合は、@Action を ''RESET'' または ''RESET_FAILED'' に設定してください';
    PRINT '';
    PRINT 'RESET: すべての実行中ステータスを ''failed'' に変更';
    PRINT 'RESET_FAILED: ' + CAST(@MinutesAgo AS NVARCHAR(10)) + ' 分以上前に開始された実行中ステータスのみ ''failed'' に変更（推奨）';
END
ELSE IF @Action = 'RESET'
BEGIN
    BEGIN TRANSACTION;
    
    PRINT '========================================';
    PRINT 'RESET モード: すべての実行中ステータスをリセット';
    PRINT '========================================';
    
    -- すべての実行中ステータスを failed に変更
    UPDATE SyncStatuses
    SET 
        Status = 'failed',
        EndDate = GETUTCDATE(),
        UpdatedAt = GETUTCDATE(),
        ErrorMessage = ISNULL(ErrorMessage, '') + 
            CASE 
                WHEN ErrorMessage IS NULL OR ErrorMessage = '' 
                THEN '手動でリセット（長時間実行中のため）'
                ELSE ' | 手動でリセット（長時間実行中のため）'
            END
    WHERE StoreId = @StoreId 
      AND Status = 'running';
    
    DECLARE @UpdatedCount INT = @@ROWCOUNT;
    
    IF @UpdatedCount > 0
    BEGIN
        PRINT '✅ ' + CAST(@UpdatedCount AS NVARCHAR(10)) + ' 件の実行中ステータスを ''failed'' に変更しました';
        PRINT '';
        PRINT '⚠️ 問題がなければ、以下のコマンドでコミットしてください:';
        PRINT 'COMMIT TRANSACTION;';
        PRINT '';
        PRINT '⚠️ 問題がある場合は、以下のコマンドでロールバックしてください:';
        PRINT 'ROLLBACK TRANSACTION;';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 変更されたレコードがありません';
        ROLLBACK TRANSACTION;
    END
END
ELSE IF @Action = 'RESET_FAILED'
BEGIN
    BEGIN TRANSACTION;
    
    PRINT '========================================';
    PRINT 'RESET_FAILED モード: 長時間実行中の同期のみリセット';
    PRINT '========================================';
    PRINT '対象: ' + CAST(@MinutesAgo AS NVARCHAR(10)) + ' 分以上前に開始された実行中同期';
    
    -- 長時間実行中の同期のみ failed に変更
    UPDATE SyncStatuses
    SET 
        Status = 'failed',
        EndDate = GETUTCDATE(),
        UpdatedAt = GETUTCDATE(),
        ErrorMessage = ISNULL(ErrorMessage, '') + 
            CASE 
                WHEN ErrorMessage IS NULL OR ErrorMessage = '' 
                THEN '手動でリセット（' + CAST(@MinutesAgo AS NVARCHAR(10)) + ' 分以上実行中のため）'
                ELSE ' | 手動でリセット（' + CAST(@MinutesAgo AS NVARCHAR(10)) + ' 分以上実行中のため）'
            END
    WHERE StoreId = @StoreId 
      AND Status = 'running'
      AND DATEDIFF(MINUTE, StartDate, GETUTCDATE()) > @MinutesAgo;
    
    DECLARE @UpdatedCount2 INT = @@ROWCOUNT;
    
    IF @UpdatedCount2 > 0
    BEGIN
        PRINT '✅ ' + CAST(@UpdatedCount2 AS NVARCHAR(10)) + ' 件の長時間実行中ステータスを ''failed'' に変更しました';
        PRINT '';
        PRINT '⚠️ 問題がなければ、以下のコマンドでコミットしてください:';
        PRINT 'COMMIT TRANSACTION;';
        PRINT '';
        PRINT '⚠️ 問題がある場合は、以下のコマンドでロールバックしてください:';
        PRINT 'ROLLBACK TRANSACTION;';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 変更されたレコードがありません（指定した時間以上の実行中同期がない可能性があります）';
        ROLLBACK TRANSACTION;
    END
END
ELSE
BEGIN
    PRINT '========================================';
    PRINT '❌ エラー: 無効な @Action 値';
    PRINT '========================================';
    PRINT '有効な値: ''CHECK'' | ''RESET'' | ''RESET_FAILED''';
END

PRINT '';

-- ============================================================
-- 4. 最終確認
-- ============================================================
IF @Action IN ('RESET', 'RESET_FAILED')
BEGIN
    PRINT '========================================';
    PRINT 'リセット後の状態確認';
    PRINT '========================================';
    
    SELECT 
        Id,
        StoreId,
        Status,
        StartDate,
        EndDate,
        ErrorMessage,
        UpdatedAt
    FROM SyncStatuses
    WHERE StoreId = @StoreId
      AND Status = 'running'
    ORDER BY StartDate DESC;
    
    DECLARE @RemainingRunningCount INT;
    SELECT @RemainingRunningCount = COUNT(*)
    FROM SyncStatuses
    WHERE StoreId = @StoreId AND Status = 'running';
    
    IF @RemainingRunningCount = 0
    BEGIN
        PRINT '';
        PRINT '✅ 実行中の同期がなくなりました。新しい同期を開始できます。';
    END
    ELSE
    BEGIN
        PRINT '';
        PRINT '⚠️ まだ ' + CAST(@RemainingRunningCount AS NVARCHAR(10)) + ' 件の実行中同期が残っています';
    END
END

PRINT '';
PRINT '========================================';
PRINT '完了';
PRINT '========================================';

-- ============================================================
-- 使用方法
-- ============================================================
-- 1. @StoreId をリセット対象のStoreIdに設定
-- 2. @Action を設定:
--    - 'CHECK': 状態確認のみ（推奨：最初に実行）
--    - 'RESET_FAILED': 長時間実行中の同期のみリセット（推奨）
--    - 'RESET': すべての実行中同期をリセット（注意）
-- 3. @MinutesAgo を設定（RESET_FAILEDの場合、この分数以上前に開始された同期をリセット）
-- 4. スクリプトを実行
-- 5. 問題がなければ COMMIT TRANSACTION; を実行

-- ============================================================
-- 作成日: 2026-01-20
-- 作成者: AI Assistant
-- ============================================================
