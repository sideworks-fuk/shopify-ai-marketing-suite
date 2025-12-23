-- =============================================
-- マイグレーション: AddShopifyAppsTable
-- 環境: Production（本番環境）
-- 作成日: 2025-12-22
-- 説明: ShopifyAppsテーブルの作成と初期データ投入
-- =============================================

-- =============================================
-- 1. ShopifyAppsテーブルの作成
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ShopifyApps]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ShopifyApps] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [DisplayName] NVARCHAR(200) NULL,
        [AppType] NVARCHAR(50) NOT NULL,
        [ApiKey] NVARCHAR(255) NOT NULL,
        [ApiSecret] NVARCHAR(255) NOT NULL,
        [AppUrl] NVARCHAR(500) NULL,
        [RedirectUri] NVARCHAR(500) NULL,
        [Scopes] NVARCHAR(500) NULL,
        [Description] NVARCHAR(1000) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT [PK_ShopifyApps] PRIMARY KEY CLUSTERED ([Id] ASC)
    );

    -- インデックスの作成
    CREATE INDEX [IX_ShopifyApps_ApiKey] ON [dbo].[ShopifyApps]([ApiKey]);
    CREATE INDEX [IX_ShopifyApps_AppType] ON [dbo].[ShopifyApps]([AppType]);
    CREATE INDEX [IX_ShopifyApps_IsActive] ON [dbo].[ShopifyApps]([IsActive]);

    PRINT 'ShopifyAppsテーブルを作成しました。';
END
ELSE
BEGIN
    PRINT 'ShopifyAppsテーブルは既に存在します。';
END
GO

-- =============================================
-- 2. StoresテーブルにShopifyAppIdカラムを追加
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Stores]') AND name = 'ShopifyAppId')
BEGIN
    ALTER TABLE [dbo].[Stores]
    ADD [ShopifyAppId] INT NULL;

    -- 外部キー制約の追加
    ALTER TABLE [dbo].[Stores]
    ADD CONSTRAINT [FK_Stores_ShopifyApps_ShopifyAppId]
        FOREIGN KEY ([ShopifyAppId])
        REFERENCES [dbo].[ShopifyApps]([Id])
        ON DELETE SET NULL;

    -- インデックスの作成
    CREATE INDEX [IX_Stores_ShopifyAppId] ON [dbo].[Stores]([ShopifyAppId]);

    PRINT 'StoresテーブルにShopifyAppIdカラムを追加しました。';
END
ELSE
BEGIN
    PRINT 'StoresテーブルのShopifyAppIdカラムは既に存在します。';
END
GO

-- =============================================
-- 3. 初期データの投入（本番環境）
-- =============================================
-- 注意: Shopify Partners Dashboardでは以下のように表示されます
--   - ApiKey = Client ID（Shopify Partners Dashboardの「Client ID」）
--   - ApiSecret = Secret（Shopify Partners Dashboardの「Secret」）

-- 本番環境用の公開アプリ
IF NOT EXISTS (SELECT * FROM [dbo].[ShopifyApps] WHERE [AppType] = 'Public')
BEGIN
    INSERT INTO [dbo].[ShopifyApps] 
        ([Name], [DisplayName], [AppType], [ApiKey], [ApiSecret], [AppUrl], [RedirectUri], [Scopes], [IsActive], [CreatedAt], [UpdatedAt])
    VALUES 
        ('EC Ranger', 'EC Ranger - 公開アプリ（本番環境）', 'Public', 
         'be1fc09e2135be7cee3b9186ef8bfe80', -- Client ID（Shopify Partners Dashboardの「Client ID」）
         '[YOUR_PRODUCTION_PUBLIC_APP_API_SECRET]', -- Secret（Shopify Partners Dashboardの「Secret」）⚠️ Azure Key Vaultまたは環境変数から取得した実際の値に置き換えてください
         'https://white-island-08e0a6300-2.azurestaticapps.net', -- 本番環境のフロントエンドURL
         'https://white-island-08e0a6300-2.azurestaticapps.net/api/shopify/callback',
         'read_orders,read_products,read_customers',
         1, GETUTCDATE(), GETUTCDATE());

    PRINT '本番環境用の公開アプリを登録しました。';
END
ELSE
BEGIN
    PRINT '公開アプリは既に登録されています。';
END
GO

-- 本番環境用のカスタムアプリ（必要に応じて）
IF NOT EXISTS (SELECT * FROM [dbo].[ShopifyApps] WHERE [AppType] = 'Custom')
BEGIN
    INSERT INTO [dbo].[ShopifyApps] 
        ([Name], [DisplayName], [AppType], [ApiKey], [ApiSecret], [AppUrl], [RedirectUri], [Scopes], [IsActive], [CreatedAt], [UpdatedAt])
    VALUES 
        ('EC Ranger Demo', 'EC Ranger - カスタムアプリ（本番環境）', 'Custom', 
         '[YOUR_PRODUCTION_CUSTOM_APP_API_KEY]', -- Client ID（Shopify Partners Dashboardの「Client ID」）⚠️ 実際の値に置き換えてください
         '[YOUR_PRODUCTION_CUSTOM_APP_API_SECRET]', -- Secret（Shopify Partners Dashboardの「Secret」）⚠️ 実際の値に置き換えてください
         'https://ec-ranger-frontend-custom.azurestaticapps.net', -- 本番環境のカスタムアプリURL（作成後）
         'https://ec-ranger-frontend-custom.azurestaticapps.net/api/shopify/callback',
         'read_orders,read_products,read_customers',
         1, GETUTCDATE(), GETUTCDATE());

    PRINT '本番環境用のカスタムアプリを登録しました。';
END
ELSE
BEGIN
    PRINT 'カスタムアプリは既に登録されています。';
END
GO

-- =============================================
-- 4. 既存ストアの移行（オプション）
-- =============================================

-- 既存のストアにShopifyAppIdを設定（公開アプリを使用している場合）
UPDATE [dbo].[Stores]
SET [ShopifyAppId] = (SELECT TOP 1 [Id] FROM [dbo].[ShopifyApps] WHERE [AppType] = 'Public')
WHERE [ShopifyAppId] IS NULL
  AND [ApiKey] IS NOT NULL
  AND [ApiKey] = (SELECT TOP 1 [ApiKey] FROM [dbo].[ShopifyApps] WHERE [AppType] = 'Public');

PRINT '既存ストアの移行を完了しました。';
GO

-- =============================================
-- 5. 確認クエリ
-- =============================================

SELECT 
    [Id],
    [Name],
    [DisplayName],
    [AppType],
    [ApiKey],
    [AppUrl],
    [IsActive],
    [CreatedAt]
FROM [dbo].[ShopifyApps]
ORDER BY [AppType], [Id];

PRINT 'マイグレーションが完了しました。';
GO

