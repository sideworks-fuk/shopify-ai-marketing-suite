-- Shopify OAuth関連のフィールドをStoresテーブルに追加
-- 実行日: 2025-07-29

-- ShopifyAccessToken用のカラムを追加（暗号化されたトークンを保存）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Stores]') AND name = 'ShopifyAccessToken')
BEGIN
    ALTER TABLE [dbo].[Stores] ADD [ShopifyAccessToken] NVARCHAR(MAX) NULL;
END
GO

-- ShopifyScope用のカラムを追加（アプリの権限スコープ）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Stores]') AND name = 'ShopifyScope')
BEGIN
    ALTER TABLE [dbo].[Stores] ADD [ShopifyScope] NVARCHAR(500) NULL;
END
GO

-- InstalledAt用のカラムを追加（アプリインストール日時）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Stores]') AND name = 'InstalledAt')
BEGIN
    ALTER TABLE [dbo].[Stores] ADD [InstalledAt] DATETIME2 NULL;
END
GO

-- UninstalledAt用のカラムを追加（アプリアンインストール日時）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Stores]') AND name = 'UninstalledAt')
BEGIN
    ALTER TABLE [dbo].[Stores] ADD [UninstalledAt] DATETIME2 NULL;
END
GO

-- Webhook履歴テーブルを作成
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WebhookEvents]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WebhookEvents] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [StoreId] INT NOT NULL,
        [Topic] NVARCHAR(100) NOT NULL,
        [Payload] NVARCHAR(MAX) NULL,
        [ProcessedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [Status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
        [ErrorMessage] NVARCHAR(MAX) NULL,
        [RetryCount] INT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_WebhookEvents_Stores] FOREIGN KEY ([StoreId]) REFERENCES [dbo].[Stores]([Id])
    );

    -- インデックスを作成
    CREATE INDEX [IX_WebhookEvents_StoreId] ON [dbo].[WebhookEvents]([StoreId]);
    CREATE INDEX [IX_WebhookEvents_Topic] ON [dbo].[WebhookEvents]([Topic]);
    CREATE INDEX [IX_WebhookEvents_ProcessedAt] ON [dbo].[WebhookEvents]([ProcessedAt]);
    CREATE INDEX [IX_WebhookEvents_Status] ON [dbo].[WebhookEvents]([Status]);
END
GO

-- OAuth State管理テーブルを作成（オプション - Redisを使用しない場合）
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OAuthStates]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[OAuthStates] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [State] NVARCHAR(100) NOT NULL UNIQUE,
        [ShopDomain] NVARCHAR(255) NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [ExpiresAt] DATETIME2 NOT NULL
    );

    -- インデックスを作成
    CREATE INDEX [IX_OAuthStates_State] ON [dbo].[OAuthStates]([State]);
    CREATE INDEX [IX_OAuthStates_ExpiresAt] ON [dbo].[OAuthStates]([ExpiresAt]);
END
GO

-- GDPR削除スケジュールテーブルを作成
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GdprDeletionSchedules]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GdprDeletionSchedules] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [StoreId] INT NOT NULL,
        [DeletionType] NVARCHAR(50) NOT NULL, -- 'app_uninstall', 'customer_redact', 'shop_redact'
        [CustomerId] BIGINT NULL, -- 顧客削除の場合のみ
        [ScheduledDeletionDate] DATETIME2 NOT NULL,
        [IsCompleted] BIT NOT NULL DEFAULT 0,
        [CompletedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_GdprDeletionSchedules_Stores] FOREIGN KEY ([StoreId]) REFERENCES [dbo].[Stores]([Id])
    );

    -- インデックスを作成
    CREATE INDEX [IX_GdprDeletionSchedules_StoreId] ON [dbo].[GdprDeletionSchedules]([StoreId]);
    CREATE INDEX [IX_GdprDeletionSchedules_ScheduledDeletionDate] ON [dbo].[GdprDeletionSchedules]([ScheduledDeletionDate]);
    CREATE INDEX [IX_GdprDeletionSchedules_IsCompleted] ON [dbo].[GdprDeletionSchedules]([IsCompleted]);
END
GO

PRINT 'Shopify OAuth関連のテーブルとカラムの追加が完了しました。';