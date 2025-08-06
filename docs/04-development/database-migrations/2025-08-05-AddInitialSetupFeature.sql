-- 初期設定機能のためのデータベース更新
-- 作成日: 2025-08-05
-- 作成者: Takashi (AI開発チーム)

-- 1. SyncStatusテーブルの作成
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SyncStatuses' AND xtype='U')
BEGIN
    CREATE TABLE SyncStatuses (
        Id INT PRIMARY KEY IDENTITY(1,1),
        StoreId NVARCHAR(255) NOT NULL,
        SyncType NVARCHAR(50) NOT NULL, -- 'initial', 'manual', 'scheduled'
        Status NVARCHAR(50) NOT NULL, -- 'pending', 'running', 'completed', 'failed'
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        TotalRecords INT NULL,
        ProcessedRecords INT NULL,
        ErrorMessage NVARCHAR(MAX) NULL,
        CurrentTask NVARCHAR(50) NULL,
        SyncPeriod NVARCHAR(50) NULL, -- '3months', '6months', '1year', 'all'
        Metadata NVARCHAR(MAX) NULL, -- JSON形式の追加情報
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );

    -- インデックスの作成
    CREATE INDEX IX_SyncStatuses_StoreId ON SyncStatuses(StoreId);
    CREATE INDEX IX_SyncStatuses_Status ON SyncStatuses(Status);
    CREATE INDEX IX_SyncStatuses_SyncType ON SyncStatuses(SyncType);
END

-- 2. Storesテーブルへのカラム追加
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Stores') AND name = 'InitialSetupCompleted')
BEGIN
    ALTER TABLE Stores ADD InitialSetupCompleted BIT NOT NULL DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Stores') AND name = 'LastSyncDate')
BEGIN
    ALTER TABLE Stores ADD LastSyncDate DATETIME2 NULL;
END

-- 3. 既存ストアの初期設定完了フラグを更新（既にデータがある場合は設定済みとみなす）
UPDATE Stores 
SET InitialSetupCompleted = 1,
    LastSyncDate = GETUTCDATE()
WHERE Id IN (
    SELECT DISTINCT s.Id 
    FROM Stores s
    INNER JOIN Orders o ON s.Id = o.StoreId
    WHERE s.InitialSetupCompleted = 0
);

PRINT 'Initial setup feature database migration completed successfully.';