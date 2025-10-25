-- 修正版: 無料プラン機能制限のためのテーブル作成
-- 作成日: 2025-08-25
-- 作成者: Kenji
-- 修正理由: 2025-08-26-free-plan-feature-selection.sqlの実行エラーを修正
-- 変更内容:
--   1. FeatureLimitsテーブルから不要なカラム(ChangeCooldownDays, IsActive)を削除
--   2. UserFeatureSelectionsテーブルからRowVersionカラムを削除
--   3. ストアドプロシージャの修正

-- ========================================
-- 1. 機能制限マスタテーブル（既に存在する場合はスキップ）
-- ========================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureLimits')
BEGIN
    CREATE TABLE FeatureLimits (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PlanType NVARCHAR(50) NOT NULL, -- 'free' or 'paid'
        FeatureId NVARCHAR(100) NOT NULL, -- 'dormant_analysis', 'yoy_comparison', 'purchase_frequency'
        DailyLimit INT NULL, -- NULLは無制限
        MonthlyLimit INT NULL, -- NULLは無制限
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_FeatureLimits_Plan_Feature UNIQUE(PlanType, FeatureId)
    );
    PRINT 'FeatureLimits table created'

    -- 初期データ投入
    INSERT INTO FeatureLimits (PlanType, FeatureId, DailyLimit, MonthlyLimit)
    VALUES 
        -- 無料プラン（3機能から1つのみ選択可能）
        ('free', 'dormant_analysis', NULL, NULL),
        ('free', 'yoy_comparison', NULL, NULL),
        ('free', 'purchase_frequency', NULL, NULL),
        -- 有料プラン（全機能利用可能）
        ('paid', 'dormant_analysis', NULL, NULL),
        ('paid', 'yoy_comparison', NULL, NULL),
        ('paid', 'purchase_frequency', NULL, NULL);
    PRINT 'Initial data inserted into FeatureLimits'
END
ELSE
BEGIN
    PRINT 'FeatureLimits table already exists'
END
GO

-- ========================================
-- 2. ユーザー機能選択テーブル（既に存在する場合はスキップ）
-- ========================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserFeatureSelections')
BEGIN
    CREATE TABLE UserFeatureSelections (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        SelectedFeatureId NVARCHAR(100) NULL,
        LastChangeDate DATETIME2 NULL,
        NextChangeAvailableDate DATETIME2 NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_UserFeatureSelections_Store FOREIGN KEY (StoreId) REFERENCES Store(Id)
    );
    
    -- インデックス作成
    CREATE INDEX IX_UserFeatureSelections_StoreId_IsActive 
    ON UserFeatureSelections(StoreId, IsActive) 
    INCLUDE (SelectedFeatureId, LastChangeDate, NextChangeAvailableDate);
    
    PRINT 'UserFeatureSelections table created'
END
ELSE
BEGIN
    PRINT 'UserFeatureSelections table already exists'
END
GO

-- ========================================
-- 3. 機能使用ログテーブル（既に存在する場合はスキップ）
-- ========================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FeatureUsageLogs')
BEGIN
    CREATE TABLE FeatureUsageLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        StoreId INT NOT NULL,
        FeatureId NVARCHAR(100) NOT NULL,
        EventType NVARCHAR(50) NOT NULL, -- 'access', 'change', 'limit_reached'
        EventData NVARCHAR(MAX) NULL,
        BeforeFeature NVARCHAR(100) NULL,
        AfterFeature NVARCHAR(100) NULL,
        Result NVARCHAR(50) NULL, -- 'success', 'limited', 'error'
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_FeatureUsageLogs_Store FOREIGN KEY (StoreId) REFERENCES Store(Id)
    );
    
    -- インデックス作成
    CREATE INDEX IX_FeatureUsageLogs_StoreId_CreatedAt 
    ON FeatureUsageLogs(StoreId, CreatedAt DESC) 
    INCLUDE (FeatureId, EventType);
    
    CREATE INDEX IX_FeatureUsageLogs_FeatureId_CreatedAt 
    ON FeatureUsageLogs(FeatureId, CreatedAt DESC) 
    INCLUDE (StoreId, EventType);
    
    PRINT 'FeatureUsageLogs table created'
END
ELSE
BEGIN
    PRINT 'FeatureUsageLogs table already exists'
END
GO

-- ========================================
-- 4. 機能選択変更履歴テーブル（既に存在する場合はスキップ）
-- ========================================
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
        CONSTRAINT FK_FeatureSelectionChangeHistory_Store FOREIGN KEY (StoreId) REFERENCES Store(Id)
    );
    
    -- インデックス作成
    CREATE INDEX IX_FeatureSelectionChangeHistory_StoreId_ChangedAt 
    ON FeatureSelectionChangeHistory(StoreId, ChangedAt DESC);
    
    CREATE UNIQUE INDEX IX_FeatureSelectionChangeHistory_IdempotencyToken 
    ON FeatureSelectionChangeHistory(IdempotencyToken) 
    WHERE IdempotencyToken IS NOT NULL;
    
    PRINT 'FeatureSelectionChangeHistory table created'
END
ELSE
BEGIN
    PRINT 'FeatureSelectionChangeHistory table already exists'
END
GO

-- ========================================
-- 5. ストアドプロシージャ（既に存在する場合は削除して再作成）
-- ========================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetFeatureSelectionStatus')
    DROP PROCEDURE sp_GetFeatureSelectionStatus
GO

CREATE PROCEDURE sp_GetFeatureSelectionStatus
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
        ufs.IsActive,
        CASE 
            WHEN ufs.NextChangeAvailableDate IS NULL THEN 1
            WHEN GETUTCDATE() >= ufs.NextChangeAvailableDate THEN 1
            ELSE 0
        END AS CanChangeToday
    FROM UserFeatureSelections ufs
    WHERE ufs.StoreId = @StoreId
        AND ufs.IsActive = 1
    ORDER BY ufs.CreatedAt DESC;
END
GO

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

PRINT 'Migration completed successfully: Free plan feature selection tables and procedures created'