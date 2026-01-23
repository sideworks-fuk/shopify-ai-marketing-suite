-- ========================================
-- StoreId=19 の同期時刻不一致調査SQL
-- ========================================
-- 調査目的:
-- 1. 最終同期時刻（Stores.LastSyncDate）と同期履歴の最新時刻の不一致原因
-- 2. 16225分（約270時間）という所要時間の計算が正しいか確認
-- ========================================

-- ========================================
-- 1. Storesテーブルの最終同期日時を確認
-- ========================================
SELECT 
    Id AS StoreId,
    Name AS StoreName,
    Domain,
    LastSyncDate AS Stores_LastSyncDate,
    InitialSetupCompleted,
    CreatedAt AS StoreCreatedAt,
    UpdatedAt AS StoreUpdatedAt,
    -- 最終同期からの経過時間（分）
    DATEDIFF(MINUTE, LastSyncDate, GETUTCDATE()) AS MinutesSinceLastSync
FROM Stores
WHERE Id = 19;

-- ========================================
-- 2. SyncStatusesテーブルの最新同期状態を確認
-- ========================================
SELECT TOP 10
    Id AS SyncStatusId,
    StoreId,
    SyncType,
    Status,
    StartDate,
    EndDate,
    TotalRecords,
    ProcessedRecords,
    ErrorMessage,
    CurrentTask,
    SyncPeriod,
    EntityType,
    CreatedAt,
    UpdatedAt,
    -- 所要時間の計算（分単位）
    CASE 
        WHEN EndDate IS NOT NULL THEN DATEDIFF(MINUTE, StartDate, EndDate)
        ELSE NULL
    END AS DurationMinutes,
    -- 所要時間の計算（時間単位）
    CASE 
        WHEN EndDate IS NOT NULL THEN DATEDIFF(HOUR, StartDate, EndDate)
        ELSE NULL
    END AS DurationHours,
    -- 所要時間の計算（日単位）
    CASE 
        WHEN EndDate IS NOT NULL THEN DATEDIFF(DAY, StartDate, EndDate)
        ELSE NULL
    END AS DurationDays,
    -- 現在時刻との差分（pending/running状態の場合）
    CASE 
        WHEN Status IN ('pending', 'running') AND EndDate IS NULL THEN DATEDIFF(MINUTE, StartDate, GETUTCDATE())
        ELSE NULL
    END AS ElapsedMinutesSinceStart
FROM SyncStatuses
WHERE StoreId = 19
ORDER BY StartDate DESC;

-- ========================================
-- 3. SyncHistoriesテーブルの最新同期履歴を確認（もし存在する場合）
-- ========================================
SELECT TOP 10
    HistoryId,
    StoreId,
    SyncType,
    Status,
    StartedAt,
    CompletedAt,
    TotalRecords,
    ProcessedRecords,
    FailedRecords,
    Success,
    ErrorMessage,
    CreatedAt,
    -- 所要時間の計算（分単位）
    DATEDIFF(MINUTE, StartedAt, CompletedAt) AS DurationMinutes,
    -- 所要時間の計算（時間単位）
    DATEDIFF(HOUR, StartedAt, CompletedAt) AS DurationHours,
    -- 所要時間の計算（日単位）
    DATEDIFF(DAY, StartedAt, CompletedAt) AS DurationDays
FROM SyncHistories
WHERE StoreId = 19
ORDER BY StartedAt DESC;

-- ========================================
-- 4. 最終同期時刻の比較（Stores vs SyncStatuses）
-- ========================================
SELECT 
    s.Id AS StoreId,
    s.Name AS StoreName,
    s.LastSyncDate AS Stores_LastSyncDate,
    MAX(ss.StartDate) AS SyncStatuses_LatestStartDate,
    MAX(ss.EndDate) AS SyncStatuses_LatestEndDate,
    -- 不一致チェック
    CASE 
        WHEN s.LastSyncDate IS NULL AND MAX(ss.EndDate) IS NULL THEN '両方NULL'
        WHEN s.LastSyncDate IS NULL THEN 'Stores.LastSyncDateがNULL'
        WHEN MAX(ss.EndDate) IS NULL THEN 'SyncStatuses.EndDateがNULL'
        WHEN ABS(DATEDIFF(SECOND, s.LastSyncDate, MAX(ss.EndDate))) <= 60 THEN '一致（1分以内の差）'
        WHEN s.LastSyncDate < MAX(ss.EndDate) THEN 'Stores.LastSyncDateが古い'
        WHEN s.LastSyncDate > MAX(ss.EndDate) THEN 'Stores.LastSyncDateが新しい'
        ELSE 'その他'
    END AS ComparisonResult,
    -- 時刻差（秒）
    CASE 
        WHEN s.LastSyncDate IS NOT NULL AND MAX(ss.EndDate) IS NOT NULL 
        THEN ABS(DATEDIFF(SECOND, s.LastSyncDate, MAX(ss.EndDate)))
        ELSE NULL
    END AS TimeDifferenceSeconds
FROM Stores s
LEFT JOIN SyncStatuses ss ON s.Id = ss.StoreId
WHERE s.Id = 19
GROUP BY s.Id, s.Name, s.LastSyncDate;

-- ========================================
-- 5. 異常に長い所要時間の同期を特定
-- ========================================
SELECT 
    Id AS SyncStatusId,
    StoreId,
    SyncType,
    Status,
    StartDate,
    EndDate,
    DATEDIFF(MINUTE, StartDate, EndDate) AS DurationMinutes,
    DATEDIFF(HOUR, StartDate, EndDate) AS DurationHours,
    DATEDIFF(DAY, StartDate, EndDate) AS DurationDays,
    -- 異常値チェック（10時間以上を異常とみなす）
    CASE 
        WHEN DATEDIFF(HOUR, StartDate, EndDate) > 10 THEN '⚠️ 異常: 10時間以上'
        WHEN DATEDIFF(HOUR, StartDate, EndDate) > 1 THEN '⚠️ 警告: 1時間以上'
        ELSE '正常'
    END AS DurationStatus,
    ProcessedRecords,
    TotalRecords,
    ErrorMessage
FROM SyncStatuses
WHERE StoreId = 19
  AND EndDate IS NOT NULL
  AND DATEDIFF(MINUTE, StartDate, EndDate) > 0  -- 負の値や0を除外
ORDER BY DurationMinutes DESC;

-- ========================================
-- 6. 特定の同期（16225分の同期）の詳細確認
-- ========================================
-- 16225分 = 約270時間 = 約11.25日
-- このような異常に長い同期の原因を調査
SELECT 
    Id AS SyncStatusId,
    StoreId,
    SyncType,
    Status,
    StartDate,
    EndDate,
    -- 詳細な時間計算
    DATEDIFF(MINUTE, StartDate, EndDate) AS DurationMinutes,
    DATEDIFF(HOUR, StartDate, EndDate) AS DurationHours,
    DATEDIFF(DAY, StartDate, EndDate) AS DurationDays,
    -- 開始日時と終了日時の詳細
    FORMAT(StartDate, 'yyyy-MM-dd HH:mm:ss') AS StartDateFormatted,
    FORMAT(EndDate, 'yyyy-MM-dd HH:mm:ss') AS EndDateFormatted,
    -- 日付の妥当性チェック
    CASE 
        WHEN StartDate > EndDate THEN '⚠️ 開始日時が終了日時より後'
        WHEN StartDate > GETUTCDATE() THEN '⚠️ 開始日時が未来'
        WHEN EndDate > GETUTCDATE() THEN '⚠️ 終了日時が未来'
        ELSE '正常'
    END AS DateValidityCheck,
    TotalRecords,
    ProcessedRecords,
    ErrorMessage,
    CurrentTask,
    SyncPeriod,
    EntityType,
    CreatedAt,
    UpdatedAt
FROM SyncStatuses
WHERE StoreId = 19
  AND EndDate IS NOT NULL
  AND DATEDIFF(MINUTE, StartDate, EndDate) BETWEEN 16200 AND 16300  -- 16225分前後
ORDER BY StartDate DESC;

-- ========================================
-- 7. 同期状態の統計情報
-- ========================================
SELECT 
    Status,
    COUNT(*) AS Count,
    MIN(StartDate) AS EarliestStartDate,
    MAX(StartDate) AS LatestStartDate,
    AVG(CASE WHEN EndDate IS NOT NULL THEN DATEDIFF(MINUTE, StartDate, EndDate) ELSE NULL END) AS AvgDurationMinutes,
    MAX(CASE WHEN EndDate IS NOT NULL THEN DATEDIFF(MINUTE, StartDate, EndDate) ELSE NULL END) AS MaxDurationMinutes,
    MIN(CASE WHEN EndDate IS NOT NULL THEN DATEDIFF(MINUTE, StartDate, EndDate) ELSE NULL END) AS MinDurationMinutes
FROM SyncStatuses
WHERE StoreId = 19
GROUP BY Status
ORDER BY Status;

-- ========================================
-- 8. 同期の時系列確認（最新20件）
-- ========================================
SELECT 
    Id AS SyncStatusId,
    SyncType,
    Status,
    StartDate,
    EndDate,
    DATEDIFF(MINUTE, StartDate, ISNULL(EndDate, GETUTCDATE())) AS DurationMinutes,
    ProcessedRecords,
    TotalRecords,
    ErrorMessage,
    -- 前回同期からの間隔（分）
    LAG(StartDate) OVER (ORDER BY StartDate) AS PreviousStartDate,
    DATEDIFF(MINUTE, LAG(StartDate) OVER (ORDER BY StartDate), StartDate) AS MinutesSincePreviousSync
FROM SyncStatuses
WHERE StoreId = 19
ORDER BY StartDate DESC
OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY;

-- ========================================
-- 9. データ整合性チェック
-- ========================================
-- 9-1. EndDateがNULLなのにStatusがcompleted/failedのレコード
SELECT 
    Id,
    Status,
    StartDate,
    EndDate,
    ErrorMessage,
    'EndDateがNULLなのにStatusがcompleted/failed' AS Issue
FROM SyncStatuses
WHERE StoreId = 19
  AND Status IN ('completed', 'failed')
  AND EndDate IS NULL;

-- 9-2. EndDateがStartDateより前のレコード
SELECT 
    Id,
    Status,
    StartDate,
    EndDate,
    ErrorMessage,
    'EndDateがStartDateより前' AS Issue
FROM SyncStatuses
WHERE StoreId = 19
  AND EndDate IS NOT NULL
  AND EndDate < StartDate;

-- 9-3. pending/running状態で長時間経過しているレコード（24時間以上）
SELECT 
    Id,
    Status,
    StartDate,
    EndDate,
    DATEDIFF(HOUR, StartDate, GETUTCDATE()) AS HoursSinceStart,
    ErrorMessage,
    'pending/running状態で24時間以上経過' AS Issue
FROM SyncStatuses
WHERE StoreId = 19
  AND Status IN ('pending', 'running')
  AND DATEDIFF(HOUR, StartDate, GETUTCDATE()) > 24;

-- ========================================
-- 10. フロントエンド表示用のデータ確認
-- ========================================
-- フロントエンドで表示される同期履歴のデータを再現
SELECT 
    Id AS id,
    CASE 
        WHEN EntityType IS NULL OR EntityType = 'All' THEN 'all'
        ELSE LOWER(EntityType) + 's'
    END AS type,
    CASE 
        WHEN Status = 'completed' THEN 'success'
        WHEN Status = 'failed' THEN 'error'
        WHEN Status = 'running' THEN 'syncing'
        ELSE 'warning'
    END AS status,
    FORMAT(StartDate, 'yyyy-MM-ddTHH:mm:ss.fffZ') AS startedAt,
    CASE 
        WHEN EndDate IS NOT NULL THEN FORMAT(EndDate, 'yyyy-MM-ddTHH:mm:ss.fffZ')
        ELSE NULL
    END AS completedAt,
    -- フロントエンドで使用されるduration（ミリ秒）
    CASE 
        WHEN EndDate IS NOT NULL THEN DATEDIFF(MILLISECOND, StartDate, EndDate)
        ELSE 0
    END AS duration,
    -- フロントエンドで表示される所要時間（分）の計算
    CASE 
        WHEN EndDate IS NOT NULL THEN DATEDIFF(MINUTE, StartDate, EndDate)
        ELSE NULL
    END AS durationMinutes,
    ISNULL(ProcessedRecords, 0) AS recordsProcessed,
    CASE 
        WHEN Status = 'completed' THEN ISNULL(EntityType, '全データ') + 'の同期が完了しました'
        WHEN Status = 'failed' THEN ErrorMessage
        ELSE NULL
    END AS message,
    CASE 
        WHEN Status = 'failed' THEN ErrorMessage
        ELSE NULL
    END AS error
FROM SyncStatuses
WHERE StoreId = 19
ORDER BY StartDate DESC;
