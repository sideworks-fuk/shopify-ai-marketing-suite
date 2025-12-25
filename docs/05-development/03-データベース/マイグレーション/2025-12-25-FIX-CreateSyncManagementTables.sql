-- =============================================
-- 作成日: 2025-12-25
-- 作成者: 福田 + AI Assistant
-- 目的: 同期管理関連テーブルを作成（SyncRangeSettings, SyncProgressDetails, SyncStates, SyncHistories）
-- 影響: 新規テーブル作成
-- EF Migration: AddShopifyAppsTable (20251222151634)
-- =============================================
-- 
-- 問題: 本番環境で以下のエラーが発生
-- Invalid object name 'SyncRangeSettings'.
-- 
-- 原因: 本番環境のデータベースに最新のマイグレーションが適用されていない
-- 解決: 同期管理関連テーブルを作成する
-- =============================================

-- =============================================
-- 0. SyncCheckpointsテーブルの作成
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SyncCheckpoints]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SyncCheckpoints] (
        [CheckpointId] INT IDENTITY(1,1) NOT NULL,
        [StoreId] INT NOT NULL,
        [DataType] NVARCHAR(50) NOT NULL,
        [LastSuccessfulCursor] NVARCHAR(MAX) NULL,
        [LastProcessedDate] DATETIME2 NULL,
        [RecordsProcessedSoFar] INT NOT NULL DEFAULT 0,
        [SyncStartDate] DATETIME2 NULL,
        [SyncEndDate] DATETIME2 NULL,
        [CanResume] BIT NOT NULL DEFAULT 1,
        [ExpiresAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT [PK_SyncCheckpoints] PRIMARY KEY CLUSTERED ([CheckpointId] ASC),
        CONSTRAINT [FK_SyncCheckpoints_Stores_StoreId] FOREIGN KEY ([StoreId])
            REFERENCES [dbo].[Stores]([Id])
            ON DELETE CASCADE
    );
    
    -- インデックスの作成
    CREATE INDEX [IX_SyncCheckpoints_StoreId_DataType] 
    ON [dbo].[SyncCheckpoints]([StoreId], [DataType]);
    
    CREATE INDEX [IX_SyncCheckpoints_ExpiresAt] 
    ON [dbo].[SyncCheckpoints]([ExpiresAt]);
    
    PRINT 'SyncCheckpoints table created successfully';
END
ELSE
BEGIN
    PRINT 'SyncCheckpoints table already exists';
END
GO

-- =============================================
-- 1. SyncHistoriesテーブルの作成
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SyncHistories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SyncHistories] (
        [HistoryId] INT IDENTITY(1,1) NOT NULL,
        [StoreId] INT NOT NULL,
        [SyncType] NVARCHAR(50) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL,
        [StartedAt] DATETIME2 NOT NULL,
        [CompletedAt] DATETIME2 NOT NULL,
        [RecordsProcessed] INT NOT NULL DEFAULT 0,
        [RecordsFailed] INT NOT NULL DEFAULT 0,
        [Duration] TIME NULL,
        [ErrorDetails] NVARCHAR(MAX) NULL,
        [TriggeredBy] NVARCHAR(100) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [TotalRecords] INT NOT NULL DEFAULT 0,
        [ProcessedRecords] INT NOT NULL DEFAULT 0,
        [FailedRecords] INT NOT NULL DEFAULT 0,
        [Success] BIT NOT NULL DEFAULT 0,
        [ErrorMessage] NVARCHAR(MAX) NULL,
        [DateRangeStart] DATETIME2 NULL,
        [DateRangeEnd] DATETIME2 NULL,
        
        CONSTRAINT [PK_SyncHistories] PRIMARY KEY CLUSTERED ([HistoryId] ASC),
        CONSTRAINT [FK_SyncHistories_Stores_StoreId] FOREIGN KEY ([StoreId])
            REFERENCES [dbo].[Stores]([Id])
            ON DELETE CASCADE
    );
    
    PRINT 'SyncHistories table created successfully';
END
ELSE
BEGIN
    PRINT 'SyncHistories table already exists';
    
    -- 不足しているカラムを追加
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'RecordsProcessed')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [RecordsProcessed] INT NOT NULL DEFAULT 0;
        PRINT 'RecordsProcessed column added to SyncHistories';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'RecordsFailed')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [RecordsFailed] INT NOT NULL DEFAULT 0;
        PRINT 'RecordsFailed column added to SyncHistories';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'Duration')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [Duration] TIME NULL;
        PRINT 'Duration column added to SyncHistories';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'ErrorDetails')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [ErrorDetails] NVARCHAR(MAX) NULL;
        PRINT 'ErrorDetails column added to SyncHistories';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'TriggeredBy')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [TriggeredBy] NVARCHAR(100) NULL;
        PRINT 'TriggeredBy column added to SyncHistories';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'Success')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [Success] BIT NOT NULL DEFAULT 0;
        PRINT 'Success column added to SyncHistories';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'DateRangeStart')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [DateRangeStart] DATETIME2 NULL;
        PRINT 'DateRangeStart column added to SyncHistories';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'DateRangeEnd')
    BEGIN
        ALTER TABLE [dbo].[SyncHistories]
        ADD [DateRangeEnd] DATETIME2 NULL;
        PRINT 'DateRangeEnd column added to SyncHistories';
    END
    
    -- CompletedAtがNULL許可の場合、NOT NULLに変更
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncHistories') AND name = 'CompletedAt' AND is_nullable = 1)
    BEGIN
        -- 既存のNULL値を現在時刻に更新
        UPDATE [dbo].[SyncHistories]
        SET [CompletedAt] = GETUTCDATE()
        WHERE [CompletedAt] IS NULL;
        
        ALTER TABLE [dbo].[SyncHistories]
        ALTER COLUMN [CompletedAt] DATETIME2 NOT NULL;
        PRINT 'CompletedAt column changed to NOT NULL in SyncHistories';
    END
END
GO

-- =============================================
-- 2. SyncRangeSettingsテーブルの作成
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SyncRangeSettings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SyncRangeSettings] (
        [SettingId] INT IDENTITY(1,1) NOT NULL,
        [StoreId] INT NOT NULL,
        [DataType] NVARCHAR(50) NOT NULL,
        [StartDate] DATETIME2 NOT NULL,
        [EndDate] DATETIME2 NOT NULL,
        [YearsBack] INT NOT NULL DEFAULT 3,
        [IncludeArchived] BIT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [CreatedBy] NVARCHAR(100) NULL,
        
        CONSTRAINT [PK_SyncRangeSettings] PRIMARY KEY CLUSTERED ([SettingId] ASC),
        CONSTRAINT [FK_SyncRangeSettings_Stores_StoreId] FOREIGN KEY ([StoreId])
            REFERENCES [dbo].[Stores]([Id])
            ON DELETE CASCADE
    );
    
    -- インデックスの作成
    CREATE INDEX [IX_SyncRangeSettings_StoreId_DataType] 
    ON [dbo].[SyncRangeSettings]([StoreId], [DataType]);
    
    PRINT 'SyncRangeSettings table created successfully';
END
ELSE
BEGIN
    PRINT 'SyncRangeSettings table already exists';
END
GO

-- =============================================
-- 3. SyncStatesテーブルの作成
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SyncStates]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SyncStates] (
        [SyncStateId] INT IDENTITY(1,1) NOT NULL,
        [StoreId] INT NOT NULL,
        [SyncType] NVARCHAR(50) NOT NULL,
        [Status] NVARCHAR(50) NOT NULL,
        [StartedAt] DATETIME2 NOT NULL,
        [CompletedAt] DATETIME2 NULL,
        [TotalRecordsProcessed] INT NOT NULL DEFAULT 0,
        [TotalRecordsFailed] INT NOT NULL DEFAULT 0,
        [ErrorMessage] NVARCHAR(MAX) NULL,
        [ProductCursor] NVARCHAR(MAX) NULL,
        [CustomerCursor] NVARCHAR(MAX) NULL,
        [OrderCursor] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [TotalRecords] INT NOT NULL DEFAULT 0,
        [ProcessedRecords] INT NOT NULL DEFAULT 0,
        [FailedRecords] INT NOT NULL DEFAULT 0,
        [ProgressPercentage] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [LastActivityAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [DateRangeStart] DATETIME2 NULL,
        [DateRangeEnd] DATETIME2 NULL,
        
        CONSTRAINT [PK_SyncStates] PRIMARY KEY CLUSTERED ([SyncStateId] ASC),
        CONSTRAINT [FK_SyncStates_Stores_StoreId] FOREIGN KEY ([StoreId])
            REFERENCES [dbo].[Stores]([Id])
            ON DELETE CASCADE
    );
    
    -- インデックスの作成
    CREATE INDEX [IX_SyncStates_StoreId_SyncType] 
    ON [dbo].[SyncStates]([StoreId], [SyncType]);
    
    PRINT 'SyncStates table created successfully';
END
ELSE
BEGIN
    PRINT 'SyncStates table already exists';
    
    -- 不足しているカラムを追加
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncStates') AND name = 'ProcessedRecords')
    BEGIN
        ALTER TABLE [dbo].[SyncStates]
        ADD [ProcessedRecords] INT NOT NULL DEFAULT 0;
        PRINT 'ProcessedRecords column added to SyncStates';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncStates') AND name = 'FailedRecords')
    BEGIN
        ALTER TABLE [dbo].[SyncStates]
        ADD [FailedRecords] INT NOT NULL DEFAULT 0;
        PRINT 'FailedRecords column added to SyncStates';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncStates') AND name = 'ProgressPercentage')
    BEGIN
        ALTER TABLE [dbo].[SyncStates]
        ADD [ProgressPercentage] DECIMAL(18,2) NOT NULL DEFAULT 0;
        PRINT 'ProgressPercentage column added to SyncStates';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncStates') AND name = 'LastActivityAt')
    BEGIN
        ALTER TABLE [dbo].[SyncStates]
        ADD [LastActivityAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE();
        PRINT 'LastActivityAt column added to SyncStates';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncStates') AND name = 'DateRangeStart')
    BEGIN
        ALTER TABLE [dbo].[SyncStates]
        ADD [DateRangeStart] DATETIME2 NULL;
        PRINT 'DateRangeStart column added to SyncStates';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncStates') AND name = 'DateRangeEnd')
    BEGIN
        ALTER TABLE [dbo].[SyncStates]
        ADD [DateRangeEnd] DATETIME2 NULL;
        PRINT 'DateRangeEnd column added to SyncStates';
    END
END
GO

-- =============================================
-- 4. SyncProgressDetailsテーブルの作成
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SyncProgressDetails]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SyncProgressDetails] (
        [ProgressId] INT IDENTITY(1,1) NOT NULL,
        [SyncStateId] INT NOT NULL,
        [DataType] NVARCHAR(50) NOT NULL,
        [CurrentPage] NVARCHAR(MAX) NULL,
        [CurrentBatch] INT NOT NULL DEFAULT 0,
        [TotalBatches] INT NULL,
        [BatchStartedAt] DATETIME2 NULL,
        [LastUpdateAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [EstimatedCompletionTime] DATETIME2 NULL,
        [RecordsPerSecond] FLOAT NULL,
        [AverageResponseTime] INT NULL,
        [RecordsInDateRange] INT NULL,
        [RecordsSkipped] INT NOT NULL DEFAULT 0,
        [RecordsWithErrors] INT NOT NULL DEFAULT 0,
        [BatchIdentifier] NVARCHAR(MAX) NULL,
        [RecordsInBatch] INT NOT NULL DEFAULT 0,
        [ProcessedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'Processing',
        [ErrorMessage] NVARCHAR(MAX) NULL,
        
        CONSTRAINT [PK_SyncProgressDetails] PRIMARY KEY CLUSTERED ([ProgressId] ASC),
        CONSTRAINT [FK_SyncProgressDetails_SyncStates_SyncStateId] FOREIGN KEY ([SyncStateId])
            REFERENCES [dbo].[SyncStates]([SyncStateId])
            ON DELETE CASCADE
    );
    
    -- インデックスの作成
    CREATE INDEX [IX_SyncProgressDetails_SyncStateId] 
    ON [dbo].[SyncProgressDetails]([SyncStateId]);
    
    PRINT 'SyncProgressDetails table created successfully';
END
ELSE
BEGIN
    PRINT 'SyncProgressDetails table already exists';
END
GO

-- =============================================
-- 確認クエリ（実行結果の確認用）
-- =============================================
SELECT 
    TABLE_NAME,
    COUNT(*) AS COLUMN_COUNT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('SyncCheckpoints', 'SyncHistories', 'SyncRangeSettings', 'SyncStates', 'SyncProgressDetails')
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;
GO

-- SyncHistoriesテーブルのカラム確認
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SyncHistories'
    AND COLUMN_NAME IN ('DateRangeEnd', 'DateRangeStart', 'Duration', 'ErrorDetails', 'RecordsFailed', 'RecordsProcessed', 'Success', 'TriggeredBy')
ORDER BY COLUMN_NAME;
GO

PRINT 'Sync management tables migration completed successfully';
GO
