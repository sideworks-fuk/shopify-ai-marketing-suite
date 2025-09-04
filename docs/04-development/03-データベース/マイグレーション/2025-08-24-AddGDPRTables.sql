-- =============================================
-- 作成日: 2025-08-24
-- 作成者: Takashi
-- 目的: GDPR準拠のためのテーブル追加
-- 影響: GDPRリクエスト管理、削除ログ、統計テーブルの作成
-- =============================================

-- GDPRRequestsテーブル作成
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GDPRRequests]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GDPRRequests] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [StoreId] INT NULL,
        [ShopDomain] NVARCHAR(255) NOT NULL,
        [RequestType] NVARCHAR(50) NOT NULL,
        [ShopifyRequestId] NVARCHAR(100) NULL,
        [CustomerId] BIGINT NULL,
        [CustomerEmail] NVARCHAR(255) NULL,
        [OrdersToRedact] NVARCHAR(MAX) NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
        [ReceivedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [DueDate] DATETIME2 NOT NULL,
        [ScheduledFor] DATETIME2 NULL,
        [ProcessingStartedAt] DATETIME2 NULL,
        [CompletedAt] DATETIME2 NULL,
        [ExportedData] NVARCHAR(MAX) NULL,
        [ExportUrl] NVARCHAR(500) NULL,
        [ProcessingDetails] NVARCHAR(MAX) NULL,
        [ErrorMessage] NVARCHAR(MAX) NULL,
        [RetryCount] INT NOT NULL DEFAULT 0,
        [MaxRetries] INT NOT NULL DEFAULT 3,
        [WebhookPayload] NVARCHAR(MAX) NULL,
        [IdempotencyKey] NVARCHAR(255) NULL,
        [AuditLog] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_GDPRRequests] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_GDPRRequests_Stores] FOREIGN KEY ([StoreId]) REFERENCES [dbo].[Stores]([Id])
    );

    -- インデックス作成
    CREATE INDEX [IX_GDPRRequests_ShopDomain_RequestType] ON [dbo].[GDPRRequests] ([ShopDomain], [RequestType]);
    CREATE INDEX [IX_GDPRRequests_Status] ON [dbo].[GDPRRequests] ([Status]);
    CREATE INDEX [IX_GDPRRequests_DueDate] ON [dbo].[GDPRRequests] ([DueDate]);
    CREATE UNIQUE INDEX [IX_GDPRRequests_IdempotencyKey] ON [dbo].[GDPRRequests] ([IdempotencyKey]) 
        WHERE [IdempotencyKey] IS NOT NULL;
    
    PRINT 'GDPRRequestsテーブルを作成しました';
END
ELSE
BEGIN
    PRINT 'GDPRRequestsテーブルは既に存在します';
END
GO

-- GDPRDeletionLogsテーブル作成
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GDPRDeletionLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GDPRDeletionLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [GDPRRequestId] INT NOT NULL,
        [EntityType] NVARCHAR(100) NOT NULL,
        [EntityId] NVARCHAR(MAX) NULL,
        [AnonymizedData] NVARCHAR(MAX) NULL,
        [DeletedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [DeletionMethod] NVARCHAR(50) NOT NULL DEFAULT 'delete',
        [DeletedBy] NVARCHAR(100) NULL,
        CONSTRAINT [PK_GDPRDeletionLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_GDPRDeletionLogs_GDPRRequests] FOREIGN KEY ([GDPRRequestId]) REFERENCES [dbo].[GDPRRequests]([Id])
    );

    -- インデックス作成
    CREATE INDEX [IX_GDPRDeletionLogs_GDPRRequestId] ON [dbo].[GDPRDeletionLogs] ([GDPRRequestId]);
    
    PRINT 'GDPRDeletionLogsテーブルを作成しました';
END
ELSE
BEGIN
    PRINT 'GDPRDeletionLogsテーブルは既に存在します';
END
GO

-- GDPRStatisticsテーブル作成
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GDPRStatistics]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GDPRStatistics] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Period] NVARCHAR(7) NOT NULL,
        [RequestType] NVARCHAR(50) NOT NULL,
        [TotalRequests] INT NOT NULL DEFAULT 0,
        [CompletedRequests] INT NOT NULL DEFAULT 0,
        [CompletedOnTime] INT NOT NULL DEFAULT 0,
        [Overdue] INT NOT NULL DEFAULT 0,
        [Failed] INT NOT NULL DEFAULT 0,
        [AverageProcessingHours] FLOAT NOT NULL DEFAULT 0,
        [MinProcessingHours] FLOAT NOT NULL DEFAULT 0,
        [MaxProcessingHours] FLOAT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_GDPRStatistics] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    -- インデックス作成
    CREATE UNIQUE INDEX [IX_GDPRStatistics_Period_RequestType] ON [dbo].[GDPRStatistics] ([Period], [RequestType]);
    
    PRINT 'GDPRStatisticsテーブルを作成しました';
END
ELSE
BEGIN
    PRINT 'GDPRStatisticsテーブルは既に存在します';
END
GO

-- InstallationHistoriesテーブル作成（WebhookModelsで定義済み）
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[InstallationHistories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[InstallationHistories] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [StoreId] INT NOT NULL,
        [ShopDomain] NVARCHAR(255) NOT NULL,
        [Action] NVARCHAR(50) NOT NULL,
        [AccessToken] NVARCHAR(MAX) NULL,
        [Scopes] NVARCHAR(500) NULL,
        [InstalledAt] DATETIME2 NULL,
        [UninstalledAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_InstallationHistories] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_InstallationHistories_Stores] FOREIGN KEY ([StoreId]) REFERENCES [dbo].[Stores]([Id])
    );
    
    PRINT 'InstallationHistoriesテーブルを作成しました';
END
ELSE
BEGIN
    PRINT 'InstallationHistoriesテーブルは既に存在します';
END
GO

-- GDPRComplianceLogsテーブル作成（WebhookModelsで定義済み）
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GDPRComplianceLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GDPRComplianceLogs] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [StoreId] INT NULL,
        [ShopDomain] NVARCHAR(255) NOT NULL,
        [RequestType] NVARCHAR(50) NOT NULL,
        [RequestId] NVARCHAR(100) NULL,
        [CustomerId] BIGINT NULL,
        [RequestedAt] DATETIME2 NOT NULL,
        [CompletedAt] DATETIME2 NULL,
        [DueDate] DATETIME2 NOT NULL,
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
        [Details] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_GDPRComplianceLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_GDPRComplianceLogs_Stores] FOREIGN KEY ([StoreId]) REFERENCES [dbo].[Stores]([Id])
    );
    
    PRINT 'GDPRComplianceLogsテーブルを作成しました';
END
ELSE
BEGIN
    PRINT 'GDPRComplianceLogsテーブルは既に存在します';
END
GO

-- サンプルデータ挿入（開発環境用）
IF @@SERVERNAME = 'localhost' OR DB_NAME() LIKE '%dev%'
BEGIN
    -- テスト用GDPRリクエスト
    IF NOT EXISTS (SELECT 1 FROM [dbo].[GDPRRequests] WHERE [ShopDomain] = 'test-shop.myshopify.com')
    BEGIN
        INSERT INTO [dbo].[GDPRRequests] (
            [ShopDomain], 
            [RequestType], 
            [Status], 
            [DueDate],
            [ReceivedAt]
        ) VALUES 
        ('test-shop.myshopify.com', 'customers_data_request', 'pending', DATEADD(day, 10, GETUTCDATE()), GETUTCDATE()),
        ('test-shop.myshopify.com', 'customers_redact', 'pending', DATEADD(day, 30, GETUTCDATE()), GETUTCDATE()),
        ('test-shop.myshopify.com', 'shop_redact', 'pending', DATEADD(day, 90, GETUTCDATE()), GETUTCDATE());
        
        PRINT 'テスト用GDPRリクエストを挿入しました';
    END
END
GO

PRINT 'GDPRテーブルのマイグレーションが完了しました';
GO