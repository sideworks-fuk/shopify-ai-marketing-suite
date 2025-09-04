-- =============================================
-- 作成日: 2025-08-24
-- 作成者: Takashi
-- 目的: 無料プラン機能選択システムのテーブル追加
-- 影響: 新規テーブル作成のみ、既存データへの影響なし
-- =============================================

-- 1. 機能制限テーブル
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
END

-- 2. ユーザー機能選択テーブル
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
END

-- 3. 機能使用ログテーブル
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureUsageLogs')
BEGIN
    CREATE TABLE FeatureUsageLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        FeatureId NVARCHAR(100) NOT NULL,
        EventType NVARCHAR(50) NOT NULL, -- 'access', 'change', 'limit_reached'
        BeforeFeatureId NVARCHAR(100) NULL,
        AfterFeatureId NVARCHAR(100) NULL,
        Result NVARCHAR(50) NOT NULL, -- 'success', 'limited', 'error'
        ErrorMessage NVARCHAR(500) NULL,
        IpAddress NVARCHAR(50) NULL,
        UserAgent NVARCHAR(500) NULL,
        IdempotencyToken NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        INDEX IX_FeatureUsageLogs_StoreId_FeatureId_CreatedAt (StoreId, FeatureId, CreatedAt),
        INDEX IX_FeatureUsageLogs_IdempotencyToken (IdempotencyToken) WHERE IdempotencyToken IS NOT NULL
    );
END

-- 4. 機能選択変更履歴テーブル
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureSelectionChangeHistories')
BEGIN
    CREATE TABLE FeatureSelectionChangeHistories (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        BeforeFeatureId NVARCHAR(100) NULL,
        AfterFeatureId NVARCHAR(100) NOT NULL,
        ChangeReason NVARCHAR(100) NOT NULL, -- 'user_requested', 'plan_downgraded', 'plan_upgraded'
        ChangedBy NVARCHAR(100) NULL,
        IdempotencyToken NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (StoreId) REFERENCES Stores(Id),
        INDEX IX_FeatureSelectionChangeHistories_StoreId_CreatedAt (StoreId, CreatedAt DESC)
    );
END

-- 5. 初期データ投入：無料プランの機能制限
IF NOT EXISTS (SELECT * FROM FeatureLimits WHERE PlanType = 'free')
BEGIN
    INSERT INTO FeatureLimits (PlanType, FeatureId, DailyLimit, MonthlyLimit)
    VALUES 
        ('free', 'dormant_analysis', 100, 3000),
        ('free', 'year_over_year', 100, 3000),
        ('free', 'monthly_sales', 100, 3000),
        ('free', 'purchase_count', 100, 3000),
        ('free', 'analytics', 100, 3000);
END

-- 6. インデックス追加（パフォーマンス最適化）
CREATE INDEX IX_UserFeatureSelections_NextChangeAvailableDate 
ON UserFeatureSelections(NextChangeAvailableDate) 
WHERE NextChangeAvailableDate IS NOT NULL;

CREATE INDEX IX_FeatureUsageLogs_EventType_Result 
ON FeatureUsageLogs(EventType, Result);

-- =============================================
-- 実行確認
-- =============================================
SELECT 'Feature Selection Tables Migration Completed' AS Status;