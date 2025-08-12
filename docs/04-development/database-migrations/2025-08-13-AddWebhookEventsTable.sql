-- 作成日: 2025-08-13
-- 作成者: Takashi
-- 目的: Webhookイベント履歴管理テーブルの追加（GDPR対応・インストール状態追跡）
-- 影響: 新規テーブル追加、既存システムへの影響なし

-- WebhookEventsテーブルの作成
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WebhookEvents')
BEGIN
    CREATE TABLE WebhookEvents (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        ShopDomain NVARCHAR(255) NOT NULL,
        Topic NVARCHAR(100) NOT NULL,  -- app/uninstalled, customers/redact, shop/redact, customers/data_request
        Payload NVARCHAR(MAX),  -- JSON形式のWebhookペイロード
        Status NVARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
        ProcessedAt DATETIME2 NULL,
        ScheduledDeletionDate DATETIME2 NULL,  -- GDPRデータ削除予定日
        ErrorMessage NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_WebhookEvents_Store FOREIGN KEY (StoreId) 
            REFERENCES Stores(Id) ON DELETE CASCADE
    );

    -- インデックスの作成
    CREATE INDEX IX_WebhookEvents_ShopDomain ON WebhookEvents(ShopDomain);
    CREATE INDEX IX_WebhookEvents_Topic ON WebhookEvents(Topic);
    CREATE INDEX IX_WebhookEvents_Status ON WebhookEvents(Status);
    CREATE INDEX IX_WebhookEvents_CreatedAt ON WebhookEvents(CreatedAt DESC);
    CREATE INDEX IX_WebhookEvents_ScheduledDeletionDate ON WebhookEvents(ScheduledDeletionDate) 
        WHERE ScheduledDeletionDate IS NOT NULL;
END;

-- InstallationHistoryテーブルの作成（インストール/アンインストール履歴）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InstallationHistory')
BEGIN
    CREATE TABLE InstallationHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        ShopDomain NVARCHAR(255) NOT NULL,
        Action NVARCHAR(50) NOT NULL,  -- installed, uninstalled, reinstalled
        AccessToken NVARCHAR(MAX) NULL,  -- 暗号化して保存
        Scopes NVARCHAR(500) NULL,
        InstalledAt DATETIME2 NULL,
        UninstalledAt DATETIME2 NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_InstallationHistory_Store FOREIGN KEY (StoreId) 
            REFERENCES Stores(Id) ON DELETE CASCADE
    );

    -- インデックスの作成
    CREATE INDEX IX_InstallationHistory_ShopDomain ON InstallationHistory(ShopDomain);
    CREATE INDEX IX_InstallationHistory_Action ON InstallationHistory(Action);
    CREATE INDEX IX_InstallationHistory_CreatedAt ON InstallationHistory(CreatedAt DESC);
END;

-- StoresテーブルにGDPR関連カラムを追加（存在しない場合）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Stores') AND name = 'InstalledAt')
BEGIN
    ALTER TABLE Stores ADD InstalledAt DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Stores') AND name = 'UninstalledAt')
BEGIN
    ALTER TABLE Stores ADD UninstalledAt DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Stores') AND name = 'DataDeletionScheduledAt')
BEGIN
    ALTER TABLE Stores ADD DataDeletionScheduledAt DATETIME2 NULL;
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Stores') AND name = 'DataDeletionCompletedAt')
BEGIN
    ALTER TABLE Stores ADD DataDeletionCompletedAt DATETIME2 NULL;
END;

-- GDPRコンプライアンステーブル（監査証跡用）
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GDPRComplianceLog')
BEGIN
    CREATE TABLE GDPRComplianceLog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NULL,
        ShopDomain NVARCHAR(255) NOT NULL,
        RequestType NVARCHAR(50) NOT NULL,  -- customer_redact, shop_redact, data_request
        RequestId NVARCHAR(100) NULL,  -- ShopifyからのリクエストID
        CustomerId BIGINT NULL,  -- 顧客ID（顧客データ削除の場合）
        RequestedAt DATETIME2 NOT NULL,
        CompletedAt DATETIME2 NULL,
        DueDate DATETIME2 NOT NULL,  -- 法的期限
        Status NVARCHAR(50) DEFAULT 'pending',
        Details NVARCHAR(MAX) NULL,  -- JSON形式の詳細情報
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
    );

    -- インデックスの作成
    CREATE INDEX IX_GDPRComplianceLog_ShopDomain ON GDPRComplianceLog(ShopDomain);
    CREATE INDEX IX_GDPRComplianceLog_RequestType ON GDPRComplianceLog(RequestType);
    CREATE INDEX IX_GDPRComplianceLog_Status ON GDPRComplianceLog(Status);
    CREATE INDEX IX_GDPRComplianceLog_DueDate ON GDPRComplianceLog(DueDate);
END;

-- 説明コメント
-- WebhookEvents: Shopifyから受信した全てのWebhookイベントを記録
-- InstallationHistory: アプリのインストール/アンインストール履歴を追跡
-- GDPRComplianceLog: GDPR要求の処理状況を監査証跡として記録
-- これらのテーブルによりShopifyの必須要件を満たし、コンプライアンスを確保