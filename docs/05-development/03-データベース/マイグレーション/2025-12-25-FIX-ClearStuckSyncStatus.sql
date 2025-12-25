-- =============================================
-- 作成日: 2025-12-25
-- 作成者: 福田 + AI Assistant
-- 目的: 古いrunningステータスの同期レコードをクリア
-- 影響: SyncStatusesテーブルのステータス更新
-- =============================================
-- 
-- 問題: SyncStatusesテーブルに古いrunningステータスが残っている
-- 解決: 古いrunningステータスをfailedに変更する
-- =============================================

-- 注意: 実行前にHangfireダッシュボードで実際に実行中のジョブがないことを確認してください

-- 方法1: 特定のsyncIdをクリア（推奨）
-- Id=2のレコードをfailedに変更
UPDATE SyncStatuses
SET 
    Status = 'failed',
    EndDate = GETUTCDATE(),
    ErrorMessage = 'Manually cleared: Sync was stuck in running state. Hangfire job may have been lost.',
    UpdatedAt = GETUTCDATE()
WHERE Id = 2
    AND Status = 'running';
GO

-- 確認クエリ
SELECT 
    Id,
    StoreId,
    SyncType,
    Status,
    StartDate,
    EndDate,
    ErrorMessage,
    UpdatedAt
FROM SyncStatuses
WHERE Id = 2;
GO

-- 方法2: 24時間以上前のrunningステータスをすべてクリア（必要に応じて使用）
/*
UPDATE SyncStatuses
SET 
    Status = 'failed',
    EndDate = GETUTCDATE(),
    ErrorMessage = 'Manually cleared: Sync was stuck in running state for more than 24 hours.',
    UpdatedAt = GETUTCDATE()
WHERE Status = 'running'
    AND StartDate < DATEADD(HOUR, -24, GETUTCDATE());
GO
*/

-- 方法3: すべてのrunningステータスをクリア（緊急時のみ使用）
/*
UPDATE SyncStatuses
SET 
    Status = 'failed',
    EndDate = GETUTCDATE(),
    ErrorMessage = 'Manually reset: All running syncs were reset.',
    UpdatedAt = GETUTCDATE()
WHERE Status = 'running';
GO
*/

PRINT 'Stuck sync status cleared successfully';
GO
