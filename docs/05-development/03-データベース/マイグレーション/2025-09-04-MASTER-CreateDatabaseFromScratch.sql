-- =============================================
-- マスターデータベース作成スクリプト
-- 作成日: 2025-09-04
-- 作成者: Kenji
-- 目的: 新規環境でゼロからデータベースを構築するための完全なDDLスクリプト
-- 影響: 全テーブル、インデックス、ストアドプロシージャの新規作成
-- =============================================
-- 
-- 使用方法:
-- 1. 新規SQL Serverデータベースを作成
-- 2. このスクリプトを順番に実行
-- 3. エラーがないことを確認
--
-- 注意事項:
-- - Entity Frameworkのマイグレーションで作成されていたベーステーブルを含む
-- - 実行順序が重要（外部キー制約のため）
-- =============================================

USE [YourDatabaseName] -- データベース名を指定
GO

-- =============================================
-- SECTION 1: ベーステーブルの作成
-- =============================================
PRINT 'SECTION 1: Creating base tables...'
GO

-- 1.1 Stores テーブル（マスターテーブル）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Stores')
BEGIN
    CREATE TABLE Stores (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Domain NVARCHAR(255) NULL,
        ShopifyShopId NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        Description NVARCHAR(500) NULL,
        DataType NVARCHAR(50) NOT NULL DEFAULT 'production',
        IsActive BIT NOT NULL DEFAULT 1,
        Settings NVARCHAR(MAX) NULL,
        TenantId NVARCHAR(100) NULL,
        ApiKey NVARCHAR(255) NULL,
        ApiSecret NVARCHAR(255) NULL,
        AccessToken NVARCHAR(MAX) NULL,
        Scopes NVARCHAR(500) NULL,
        -- 初期設定関連（2025-08-05追加）
        InitialSetupCompleted BIT NOT NULL DEFAULT 0,
        LastSyncDate DATETIME2 NULL,
        -- GDPR関連（2025-08-13追加）
        InstalledAt DATETIME2 NULL,
        UninstalledAt DATETIME2 NULL,
        DataDeletionScheduledAt DATETIME2 NULL,
        DataDeletionCompletedAt DATETIME2 NULL
    );
    
    CREATE INDEX IX_Stores_TenantId ON Stores(TenantId);
    CREATE INDEX IX_Stores_Domain ON Stores(Domain);
    CREATE INDEX IX_Stores_IsActive ON Stores(IsActive);
    
    PRINT 'Stores table created successfully'
END
ELSE
    PRINT 'Stores table already exists'
GO

-- 1.2 Tenants テーブル（2025-08-01追加）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tenants')
BEGIN
    CREATE TABLE Tenants (
        Id NVARCHAR(100) NOT NULL PRIMARY KEY,
        CompanyName NVARCHAR(255) NOT NULL,
        ContactEmail NVARCHAR(255) NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
        Status NVARCHAR(50) DEFAULT 'active'
    );
    
    CREATE INDEX IX_Tenants_Id ON Tenants(Id);
    
    -- デフォルトテナントの挿入
    IF NOT EXISTS (SELECT 1 FROM Tenants WHERE Id = 'default-tenant')
    BEGIN
        INSERT INTO Tenants (Id, CompanyName, ContactEmail)
        VALUES ('default-tenant', 'Default Tenant', 'admin@example.com');
    END
    
    PRINT 'Tenants table created successfully'
END
ELSE
    PRINT 'Tenants table already exists'
GO

-- 1.3 Customers テーブル
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE Customers (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        ShopifyCustomerId NVARCHAR(50) NULL,
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(20) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CustomerSegment NVARCHAR(50) NOT NULL DEFAULT 'Standard',
        TotalSpent DECIMAL(18,2) NOT NULL DEFAULT 0,
        OrdersCount INT NOT NULL DEFAULT 0,
        -- Shopify CSV拡張フィールド
        AcceptsEmailMarketing BIT NOT NULL DEFAULT 0,
        AcceptsSmsMarketing BIT NOT NULL DEFAULT 0,
        AcceptsEmailMarketingUpdatedAt DATETIME2 NULL,
        MarketingOptInLevel NVARCHAR(50) NULL,
        TaxExempt BIT NOT NULL DEFAULT 0,
        EmailMarketingConsentState NVARCHAR(50) NULL,
        EmailMarketingConsentOptInLevel NVARCHAR(50) NULL,
        EmailMarketingConsentConsentUpdatedAt DATETIME2 NULL,
        SmsMarketingConsentState NVARCHAR(50) NULL,
        SmsMarketingConsentOptInLevel NVARCHAR(50) NULL,
        SmsMarketingConsentConsentUpdatedAt DATETIME2 NULL,
        SmsMarketingConsentConsentCollectedFrom NVARCHAR(100) NULL,
        -- 住所情報
        AddressLine1 NVARCHAR(255) NULL,
        AddressLine2 NVARCHAR(255) NULL,
        City NVARCHAR(100) NULL,
        Province NVARCHAR(100) NULL,
        ProvinceCode NVARCHAR(10) NULL,
        Country NVARCHAR(100) NULL,
        CountryCode NVARCHAR(10) NULL,
        Zip NVARCHAR(20) NULL,
        Note NVARCHAR(MAX) NULL,
        Currency NVARCHAR(10) NULL,
        Tags NVARCHAR(1000) NULL,
        CONSTRAINT FK_Customers_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_Customers_StoreId ON Customers(StoreId);
    CREATE INDEX IX_Customers_Email ON Customers(Email);
    CREATE INDEX IX_Customers_ShopifyCustomerId ON Customers(ShopifyCustomerId);
    
    PRINT 'Customers table created successfully'
END
ELSE
    PRINT 'Customers table already exists'
GO

-- 1.4 Products テーブル
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
BEGIN
    CREATE TABLE Products (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        ShopifyProductId NVARCHAR(50) NULL,
        Title NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Currency NVARCHAR(50) NOT NULL DEFAULT 'JPY',
        Category NVARCHAR(100) NULL,
        InventoryQuantity INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        Handle NVARCHAR(255) NULL,
        ProductType NVARCHAR(255) NULL,
        Tags NVARCHAR(1000) NULL,
        Vendor NVARCHAR(255) NULL,
        Status NVARCHAR(50) NULL,
        CONSTRAINT FK_Products_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_Products_StoreId ON Products(StoreId);
    CREATE INDEX IX_Products_Title ON Products(Title);
    CREATE INDEX IX_Products_ShopifyProductId ON Products(ShopifyProductId);
    
    PRINT 'Products table created successfully'
END
ELSE
    PRINT 'Products table already exists'
GO

-- 1.5 ProductVariants テーブル
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductVariants')
BEGIN
    CREATE TABLE ProductVariants (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        ShopifyVariantId NVARCHAR(50) NULL,
        Title NVARCHAR(255) NOT NULL,
        Price DECIMAL(18,2) NOT NULL,
        CompareAtPrice DECIMAL(18,2) NULL,
        SKU NVARCHAR(100) NULL,
        Barcode NVARCHAR(100) NULL,
        InventoryQuantity INT NOT NULL DEFAULT 0,
        Weight DECIMAL(10,3) NULL,
        WeightUnit NVARCHAR(10) NULL,
        Option1 NVARCHAR(255) NULL,
        Option2 NVARCHAR(255) NULL,
        Option3 NVARCHAR(255) NULL,
        RequiresShipping BIT NOT NULL DEFAULT 1,
        Taxable BIT NOT NULL DEFAULT 1,
        Position INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_ProductVariants_Product FOREIGN KEY (ProductId) REFERENCES Products(Id) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_ProductVariants_ProductId ON ProductVariants(ProductId);
    CREATE INDEX IX_ProductVariants_ShopifyVariantId ON ProductVariants(ShopifyVariantId);
    CREATE INDEX IX_ProductVariants_SKU ON ProductVariants(SKU);
    
    PRINT 'ProductVariants table created successfully'
END
ELSE
    PRINT 'ProductVariants table already exists'
GO

-- 1.6 Orders テーブル
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        CustomerId INT NULL,
        ShopifyOrderId NVARCHAR(50) NULL,
        OrderNumber NVARCHAR(50) NOT NULL,
        TotalAmount DECIMAL(18,2) NOT NULL,
        Currency NVARCHAR(50) NOT NULL DEFAULT 'JPY',
        Status NVARCHAR(50) NOT NULL,
        PaymentStatus NVARCHAR(50) NULL,
        FulfillmentStatus NVARCHAR(50) NULL,
        CustomerEmail NVARCHAR(255) NULL,
        CustomerPhone NVARCHAR(20) NULL,
        ShippingAddressLine1 NVARCHAR(255) NULL,
        ShippingAddressLine2 NVARCHAR(255) NULL,
        ShippingCity NVARCHAR(100) NULL,
        ShippingProvince NVARCHAR(100) NULL,
        ShippingCountry NVARCHAR(100) NULL,
        ShippingZip NVARCHAR(20) NULL,
        BillingAddressLine1 NVARCHAR(255) NULL,
        BillingAddressLine2 NVARCHAR(255) NULL,
        BillingCity NVARCHAR(100) NULL,
        BillingProvince NVARCHAR(100) NULL,
        BillingCountry NVARCHAR(100) NULL,
        BillingZip NVARCHAR(20) NULL,
        Note NVARCHAR(MAX) NULL,
        Tags NVARCHAR(1000) NULL,
        CancelReason NVARCHAR(100) NULL,
        CancelledAt DATETIME2 NULL,
        ClosedAt DATETIME2 NULL,
        ProcessedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_Orders_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE,
        CONSTRAINT FK_Orders_Customer FOREIGN KEY (CustomerId) REFERENCES Customers(Id)
    );
    
    CREATE INDEX IX_Orders_StoreId ON Orders(StoreId);
    CREATE INDEX IX_Orders_CustomerId ON Orders(CustomerId);
    CREATE INDEX IX_Orders_OrderNumber ON Orders(OrderNumber);
    CREATE INDEX IX_Orders_ShopifyOrderId ON Orders(ShopifyOrderId);
    CREATE INDEX IX_Orders_CreatedAt ON Orders(CreatedAt);
    
    PRINT 'Orders table created successfully'
END
ELSE
    PRINT 'Orders table already exists'
GO

-- 1.7 OrderItems テーブル
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderItems')
BEGIN
    CREATE TABLE OrderItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL,
        ProductId INT NULL,
        ShopifyLineItemId NVARCHAR(50) NULL,
        ShopifyProductId NVARCHAR(50) NULL,
        ShopifyVariantId NVARCHAR(50) NULL,
        ProductTitle NVARCHAR(255) NOT NULL,
        VariantTitle NVARCHAR(255) NULL,
        SKU NVARCHAR(100) NULL,
        Price DECIMAL(18,2) NOT NULL,
        Quantity INT NOT NULL,
        TotalAmount DECIMAL(18,2) NOT NULL,
        Discount DECIMAL(18,2) NULL,
        Tax DECIMAL(18,2) NULL,
        RequiresShipping BIT NOT NULL DEFAULT 1,
        Taxable BIT NOT NULL DEFAULT 1,
        GiftCard BIT NOT NULL DEFAULT 0,
        FulfillmentStatus NVARCHAR(50) NULL,
        Properties NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_OrderItems_Order FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Product FOREIGN KEY (ProductId) REFERENCES Products(Id)
    );
    
    -- インデックス（2025-08-02緊急パフォーマンス改善を含む）
    CREATE INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
    CREATE INDEX IX_OrderItems_ProductId ON OrderItems(ProductId);
    CREATE INDEX IX_OrderItems_ProductTitle ON OrderItems(ProductTitle);
    CREATE INDEX IX_OrderItems_CreatedAt ON OrderItems(CreatedAt);
    CREATE INDEX IX_OrderItems_OrderId_CreatedAt ON OrderItems(OrderId, CreatedAt);
    
    PRINT 'OrderItems table created successfully'
END
ELSE
    PRINT 'OrderItems table already exists'
GO

-- =============================================
-- SECTION 2: 同期管理テーブル
-- =============================================
PRINT 'SECTION 2: Creating sync management tables...'
GO

-- 2.1 SyncStatuses テーブル（2025-08-05）
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
    
    PRINT 'SyncStatuses table created successfully'
END
ELSE
    PRINT 'SyncStatuses table already exists'
GO

-- =============================================
-- SECTION 3: Webhook & GDPR管理テーブル
-- =============================================
PRINT 'SECTION 3: Creating Webhook and GDPR management tables...'
GO

-- 3.1 WebhookEvents テーブル（2025-08-13）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WebhookEvents')
BEGIN
    CREATE TABLE WebhookEvents (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        ShopDomain NVARCHAR(255) NOT NULL,
        Topic NVARCHAR(100) NOT NULL,
        Payload NVARCHAR(MAX),
        Status NVARCHAR(50) DEFAULT 'pending',
        ProcessedAt DATETIME2 NULL,
        ScheduledDeletionDate DATETIME2 NULL,
        ErrorMessage NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
        -- 冪等性キー（2025-08-25追加）
        IdempotencyKey NVARCHAR(255) NULL,
        CONSTRAINT FK_WebhookEvents_Store FOREIGN KEY (StoreId) 
            REFERENCES Stores(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_WebhookEvents_ShopDomain ON WebhookEvents(ShopDomain);
    CREATE INDEX IX_WebhookEvents_Topic ON WebhookEvents(Topic);
    CREATE INDEX IX_WebhookEvents_Status ON WebhookEvents(Status);
    CREATE INDEX IX_WebhookEvents_CreatedAt ON WebhookEvents(CreatedAt DESC);
    CREATE INDEX IX_WebhookEvents_ScheduledDeletionDate ON WebhookEvents(ScheduledDeletionDate) 
        WHERE ScheduledDeletionDate IS NOT NULL;
    CREATE UNIQUE INDEX UX_WebhookEvents_IdempotencyKey ON WebhookEvents(IdempotencyKey)
        WHERE IdempotencyKey IS NOT NULL;
    
    PRINT 'WebhookEvents table created successfully'
END
ELSE
    PRINT 'WebhookEvents table already exists'
GO

-- 3.2 InstallationHistory テーブル（2025-08-13）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InstallationHistory')
BEGIN
    CREATE TABLE InstallationHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        ShopDomain NVARCHAR(255) NOT NULL,
        Action NVARCHAR(50) NOT NULL,
        AccessToken NVARCHAR(MAX) NULL,
        Scopes NVARCHAR(500) NULL,
        InstalledAt DATETIME2 NULL,
        UninstalledAt DATETIME2 NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT FK_InstallationHistory_Store FOREIGN KEY (StoreId) 
            REFERENCES Stores(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_InstallationHistory_ShopDomain ON InstallationHistory(ShopDomain);
    CREATE INDEX IX_InstallationHistory_Action ON InstallationHistory(Action);
    CREATE INDEX IX_InstallationHistory_CreatedAt ON InstallationHistory(CreatedAt DESC);
    
    PRINT 'InstallationHistory table created successfully'
END
ELSE
    PRINT 'InstallationHistory table already exists'
GO

-- 3.3 GDPRComplianceLog テーブル（2025-08-13）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GDPRComplianceLog')
BEGIN
    CREATE TABLE GDPRComplianceLog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NULL,
        ShopDomain NVARCHAR(255) NOT NULL,
        RequestType NVARCHAR(50) NOT NULL,
        RequestId NVARCHAR(100) NULL,
        CustomerId BIGINT NULL,
        RequestedAt DATETIME2 NOT NULL,
        CompletedAt DATETIME2 NULL,
        DueDate DATETIME2 NOT NULL,
        Status NVARCHAR(50) DEFAULT 'pending',
        Details NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
    );

    CREATE INDEX IX_GDPRComplianceLog_ShopDomain ON GDPRComplianceLog(ShopDomain);
    CREATE INDEX IX_GDPRComplianceLog_RequestType ON GDPRComplianceLog(RequestType);
    CREATE INDEX IX_GDPRComplianceLog_Status ON GDPRComplianceLog(Status);
    CREATE INDEX IX_GDPRComplianceLog_DueDate ON GDPRComplianceLog(DueDate);
    
    PRINT 'GDPRComplianceLog table created successfully'
END
ELSE
    PRINT 'GDPRComplianceLog table already exists'
GO

-- 3.4 GDPRRequests テーブル（2025-08-24）
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

    CREATE INDEX [IX_GDPRRequests_ShopDomain_RequestType] ON [dbo].[GDPRRequests] ([ShopDomain], [RequestType]);
    CREATE INDEX [IX_GDPRRequests_Status] ON [dbo].[GDPRRequests] ([Status]);
    CREATE INDEX [IX_GDPRRequests_DueDate] ON [dbo].[GDPRRequests] ([DueDate]);
    CREATE UNIQUE INDEX [IX_GDPRRequests_IdempotencyKey] ON [dbo].[GDPRRequests] ([IdempotencyKey]) 
        WHERE [IdempotencyKey] IS NOT NULL;
    
    PRINT 'GDPRRequests table created successfully'
END
ELSE
    PRINT 'GDPRRequests table already exists'
GO

-- 3.5 GDPRDeletionLogs テーブル（2025-08-24）
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

    CREATE INDEX [IX_GDPRDeletionLogs_GDPRRequestId] ON [dbo].[GDPRDeletionLogs] ([GDPRRequestId]);
    
    PRINT 'GDPRDeletionLogs table created successfully'
END
ELSE
    PRINT 'GDPRDeletionLogs table already exists'
GO

-- 3.6 GDPRStatistics テーブル（2025-08-24）
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

    CREATE UNIQUE INDEX [IX_GDPRStatistics_Period_RequestType] ON [dbo].[GDPRStatistics] ([Period], [RequestType]);
    
    PRINT 'GDPRStatistics table created successfully'
END
ELSE
    PRINT 'GDPRStatistics table already exists'
GO

-- =============================================
-- SECTION 4: 課金管理テーブル
-- =============================================
PRINT 'SECTION 4: Creating billing management tables...'
GO

-- 4.1 SubscriptionPlans テーブル（2025-08-24）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SubscriptionPlans')
BEGIN
  CREATE TABLE SubscriptionPlans (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    TrialDays INT NOT NULL DEFAULT 7,
    Features NVARCHAR(MAX) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
  );
  
  PRINT 'SubscriptionPlans table created successfully'
END
ELSE
  PRINT 'SubscriptionPlans table already exists'
GO

-- 4.2 StoreSubscriptions テーブル（2025-08-24）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StoreSubscriptions')
BEGIN
  CREATE TABLE StoreSubscriptions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    PlanId INT NOT NULL,
    ShopifyChargeId BIGINT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'pending',
    TrialEndsAt DATETIME2 NULL,
    CurrentPeriodEnd DATETIME2 NULL,
    ActivatedAt DATETIME2 NULL,
    CancelledAt DATETIME2 NULL,
    ConfirmationUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_StoreSubscriptions_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE,
    CONSTRAINT FK_StoreSubscriptions_Plan FOREIGN KEY (PlanId) REFERENCES SubscriptionPlans(Id) ON DELETE NO ACTION
  );

  CREATE INDEX IX_StoreSubscriptions_StoreId ON StoreSubscriptions(StoreId);
  CREATE INDEX IX_StoreSubscriptions_Status ON StoreSubscriptions(Status);
  
  PRINT 'StoreSubscriptions table created successfully'
END
ELSE
  PRINT 'StoreSubscriptions table already exists'
GO

-- =============================================
-- SECTION 5: 機能選択管理テーブル
-- =============================================
PRINT 'SECTION 5: Creating feature selection tables...'
GO

-- 5.1 FeatureLimits テーブル（2025-08-24）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureLimits')
BEGIN
    CREATE TABLE FeatureLimits (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PlanType NVARCHAR(50) NOT NULL,
        FeatureId NVARCHAR(100) NOT NULL,
        DailyLimit INT NULL,
        MonthlyLimit INT NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
        INDEX IX_FeatureLimits_PlanType_FeatureId (PlanType, FeatureId)
    );
    
    PRINT 'FeatureLimits table created successfully'
END
ELSE
    PRINT 'FeatureLimits table already exists'
GO

-- 5.2 UserFeatureSelections テーブル（2025-08-24）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserFeatureSelections')
BEGIN
    CREATE TABLE UserFeatureSelections (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        SelectedFeatureId NVARCHAR(100) NOT NULL,
        LastChangeDate DATETIME2 NOT NULL,
        NextChangeAvailableDate DATETIME2 NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        INDEX IX_UserFeatureSelections_StoreId_IsActive (StoreId, IsActive)
    );
    
    PRINT 'UserFeatureSelections table created successfully'
END
ELSE
    PRINT 'UserFeatureSelections table already exists'
GO

-- 5.3 FeatureUsageLogs テーブル（2025-08-24）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureUsageLogs')
BEGIN
    CREATE TABLE FeatureUsageLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        FeatureId NVARCHAR(100) NOT NULL,
        EventType NVARCHAR(50) NOT NULL,
        BeforeFeatureId NVARCHAR(100) NULL,
        AfterFeatureId NVARCHAR(100) NULL,
        BeforeFeature NVARCHAR(100) NULL,  -- 2025-08-25追加
        AfterFeature NVARCHAR(100) NULL,   -- 2025-08-25追加
        Result NVARCHAR(50) NOT NULL,
        ErrorMessage NVARCHAR(500) NULL,
        IpAddress NVARCHAR(50) NULL,
        UserAgent NVARCHAR(500) NULL,
        IdempotencyToken NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        INDEX IX_FeatureUsageLogs_StoreId_FeatureId_CreatedAt (StoreId, FeatureId, CreatedAt),
        INDEX IX_FeatureUsageLogs_IdempotencyToken (IdempotencyToken) WHERE IdempotencyToken IS NOT NULL
    );
    
    CREATE INDEX IX_FeatureUsageLogs_EventType_Result ON FeatureUsageLogs(EventType, Result);
    
    PRINT 'FeatureUsageLogs table created successfully'
END
ELSE
    PRINT 'FeatureUsageLogs table already exists'
GO

-- 5.4 FeatureSelectionChangeHistories テーブル（2025-08-24）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureSelectionChangeHistories')
BEGIN
    CREATE TABLE FeatureSelectionChangeHistories (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        BeforeFeatureId NVARCHAR(100) NULL,
        AfterFeatureId NVARCHAR(100) NOT NULL,
        ChangeReason NVARCHAR(100) NOT NULL,
        ChangedBy NVARCHAR(100) NULL,
        IdempotencyToken NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        INDEX IX_FeatureSelectionChangeHistories_StoreId_CreatedAt (StoreId, CreatedAt DESC)
    );
    
    PRINT 'FeatureSelectionChangeHistories table created successfully'
END
ELSE
    PRINT 'FeatureSelectionChangeHistories table already exists'
GO

-- 5.5 FeatureSelectionChangeHistory テーブル（2025-08-25）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureSelectionChangeHistory')
BEGIN
    CREATE TABLE FeatureSelectionChangeHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        PreviousFeatureId NVARCHAR(100) NULL,
        NewFeatureId NVARCHAR(100) NULL,
        ChangeReason NVARCHAR(500) NULL,
        IdempotencyToken NVARCHAR(100) NULL,
        ChangedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ChangedBy NVARCHAR(100) NULL,
        CONSTRAINT FK_FeatureSelectionChangeHistory_Stores FOREIGN KEY (StoreId) REFERENCES Stores(Id)
    );
    
    CREATE INDEX IX_FeatureSelectionChangeHistory_StoreId_ChangedAt 
    ON FeatureSelectionChangeHistory(StoreId, ChangedAt DESC);
    
    CREATE UNIQUE INDEX IX_FeatureSelectionChangeHistory_IdempotencyToken 
    ON FeatureSelectionChangeHistory(IdempotencyToken) 
    WHERE IdempotencyToken IS NOT NULL;
    
    PRINT 'FeatureSelectionChangeHistory table created successfully'
END
ELSE
    PRINT 'FeatureSelectionChangeHistory table already exists'
GO

-- =============================================
-- SECTION 6: 初期データ投入
-- =============================================
PRINT 'SECTION 6: Inserting initial data...'
GO

-- 6.1 無料プランの機能制限データ
IF NOT EXISTS (SELECT * FROM FeatureLimits WHERE PlanType = 'free')
BEGIN
    INSERT INTO FeatureLimits (PlanType, FeatureId, DailyLimit, MonthlyLimit)
    VALUES 
        ('free', 'dormant_analysis', 100, 3000),
        ('free', 'year_over_year', 100, 3000),
        ('free', 'monthly_sales', 100, 3000),
        ('free', 'purchase_count', 100, 3000),
        ('free', 'analytics', 100, 3000);
    
    PRINT 'Initial feature limits for free plan inserted'
END
ELSE
    PRINT 'Feature limits for free plan already exist'
GO

-- =============================================
-- SECTION 7: ストアドプロシージャ
-- =============================================
PRINT 'SECTION 7: Creating stored procedures...'
GO

-- 7.1 sp_GetCurrentFeatureSelection（2025-08-25）
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetCurrentFeatureSelection')
    DROP PROCEDURE sp_GetCurrentFeatureSelection;
GO

CREATE PROCEDURE sp_GetCurrentFeatureSelection
    @StoreId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        ufs.Id,
        ufs.StoreId,
        ufs.SelectedFeatureId,
        ufs.LastChangeDate,
        ufs.NextChangeAvailableDate,
        CASE 
            WHEN ufs.NextChangeAvailableDate IS NULL OR ufs.NextChangeAvailableDate <= GETUTCDATE() 
            THEN 1 
            ELSE 0 
        END AS CanChangeToday
    FROM UserFeatureSelections ufs
    WHERE ufs.StoreId = @StoreId AND ufs.IsActive = 1
    ORDER BY ufs.CreatedAt DESC;
END
GO

PRINT 'sp_GetCurrentFeatureSelection procedure created successfully'
GO

-- 7.2 sp_UpdateFeatureSelection（2025-08-25）
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateFeatureSelection')
    DROP PROCEDURE sp_UpdateFeatureSelection
GO

CREATE PROCEDURE sp_UpdateFeatureSelection
    @StoreId INT,
    @NewFeatureId NVARCHAR(100),
    @IdempotencyToken NVARCHAR(100),
    @ChangedBy NVARCHAR(100) = NULL,
    @Result INT OUTPUT,
    @ErrorMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @Result = 0;
    SET @ErrorMessage = NULL;
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- 冪等性チェック
        IF EXISTS (
            SELECT 1 FROM FeatureSelectionChangeHistory 
            WHERE IdempotencyToken = @IdempotencyToken
        )
        BEGIN
            SET @Result = 1; -- 既に処理済み
            COMMIT TRANSACTION;
            RETURN;
        END
        
        -- 現在の選択を取得
        DECLARE @CurrentFeatureId NVARCHAR(100);
        DECLARE @LastChangeDate DATETIME2;
        DECLARE @NextChangeAvailableDate DATETIME2;
        
        SELECT TOP 1
            @CurrentFeatureId = SelectedFeatureId,
            @LastChangeDate = LastChangeDate,
            @NextChangeAvailableDate = NextChangeAvailableDate
        FROM UserFeatureSelections
        WHERE StoreId = @StoreId AND IsActive = 1
        ORDER BY CreatedAt DESC;
        
        -- 変更可能かチェック（30日制限）
        IF @NextChangeAvailableDate IS NOT NULL AND GETUTCDATE() < @NextChangeAvailableDate
        BEGIN
            SET @Result = -1;
            SET @ErrorMessage = 'change_not_allowed';
            
            -- ログ記録
            INSERT INTO FeatureUsageLogs (
                StoreId, 
                FeatureId, 
                EventType, 
                BeforeFeature, 
                AfterFeature, 
                Result
            )
            VALUES (
                @StoreId,
                @NewFeatureId,
                'change',
                @CurrentFeatureId,
                @NewFeatureId,
                'limited'
            );
            
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- 機能選択を更新
        IF EXISTS (SELECT 1 FROM UserFeatureSelections WHERE StoreId = @StoreId AND IsActive = 1)
        BEGIN
            -- 既存の選択を無効化
            UPDATE UserFeatureSelections 
            SET IsActive = 0, UpdatedAt = GETUTCDATE()
            WHERE StoreId = @StoreId AND IsActive = 1;
        END
        
        -- 新しい選択を追加
        INSERT INTO UserFeatureSelections (
            StoreId, 
            SelectedFeatureId, 
            LastChangeDate, 
            NextChangeAvailableDate,
            IsActive
        )
        VALUES (
            @StoreId,
            @NewFeatureId,
            GETUTCDATE(),
            DATEADD(DAY, 30, GETUTCDATE()),
            1
        );
        
        -- 変更履歴を記録
        INSERT INTO FeatureSelectionChangeHistory (
            StoreId,
            PreviousFeatureId,
            NewFeatureId,
            IdempotencyToken,
            ChangedBy,
            ChangeReason
        )
        VALUES (
            @StoreId,
            @CurrentFeatureId,
            @NewFeatureId,
            @IdempotencyToken,
            @ChangedBy,
            'user_requested'
        );
        
        -- 使用ログを記録
        INSERT INTO FeatureUsageLogs (
            StoreId,
            FeatureId,
            EventType,
            BeforeFeature,
            AfterFeature,
            Result
        )
        VALUES (
            @StoreId,
            @NewFeatureId,
            'change',
            @CurrentFeatureId,
            @NewFeatureId,
            'success'
        );
        
        SET @Result = 1; -- 成功
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SET @Result = -999;
        SET @ErrorMessage = ERROR_MESSAGE();
    END CATCH
END
GO

PRINT 'sp_UpdateFeatureSelection procedure created successfully'
GO

-- =============================================
-- SECTION 8: 完了確認
-- =============================================
PRINT '=========================================='
PRINT 'Database creation script completed successfully!'
PRINT '=========================================='
PRINT ''
PRINT 'Created tables:'
PRINT '  Base tables: Stores, Tenants, Customers, Products, ProductVariants, Orders, OrderItems'
PRINT '  Sync tables: SyncStatuses'
PRINT '  Webhook/GDPR: WebhookEvents, InstallationHistory, GDPRComplianceLog, GDPRRequests, GDPRDeletionLogs, GDPRStatistics'
PRINT '  Billing: SubscriptionPlans, StoreSubscriptions'
PRINT '  Features: FeatureLimits, UserFeatureSelections, FeatureUsageLogs, FeatureSelectionChangeHistories, FeatureSelectionChangeHistory'
PRINT ''
PRINT 'Created stored procedures:'
PRINT '  sp_GetCurrentFeatureSelection'
PRINT '  sp_UpdateFeatureSelection'
PRINT ''
PRINT 'Next steps:'
PRINT '1. Review any error messages above'
PRINT '2. Verify all objects were created successfully'
PRINT '3. Run application tests to confirm connectivity'
PRINT ''
PRINT 'Script execution completed at: ' + CONVERT(VARCHAR(30), GETUTCDATE(), 120)
GO