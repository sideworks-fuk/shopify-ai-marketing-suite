-- 修正版2: 無料プラン機能制限のためのテーブル作成（エラー対応版）
-- 作成日: 2025-08-25
-- 作成者: Kenji
-- 修正理由: Storeテーブル参照エラー、BeforeFeature/AfterFeatureカラムエラーの修正

-- ========================================
-- 1. FeatureSelectionChangeHistoryテーブル（Store -> Stores）
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
        -- Storesテーブルへの外部キー（正しいテーブル名）
        CONSTRAINT FK_FeatureSelectionChangeHistory_Stores FOREIGN KEY (StoreId) REFERENCES Stores(Id)
    );
    
    -- インデックス作成
    CREATE INDEX IX_FeatureSelectionChangeHistory_StoreId_ChangedAt 
    ON FeatureSelectionChangeHistory(StoreId, ChangedAt DESC);
    
    CREATE UNIQUE INDEX IX_FeatureSelectionChangeHistory_IdempotencyToken 
    ON FeatureSelectionChangeHistory(IdempotencyToken) 
    WHERE IdempotencyToken IS NOT NULL;
    
    PRINT 'FeatureSelectionChangeHistory table created with Stores reference'
END
ELSE
BEGIN
    PRINT 'FeatureSelectionChangeHistory table already exists'
END
GO

-- ========================================
-- 2. FeatureUsageLogsテーブルのカラム確認と追加
-- ========================================
-- BeforeFeatureカラムが存在しない場合は追加
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('FeatureUsageLogs') AND name = 'BeforeFeature'
)
BEGIN
    ALTER TABLE FeatureUsageLogs ADD BeforeFeature NVARCHAR(100) NULL;
    PRINT 'BeforeFeature column added to FeatureUsageLogs'
END

-- AfterFeatureカラムが存在しない場合は追加
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('FeatureUsageLogs') AND name = 'AfterFeature'
)
BEGIN
    ALTER TABLE FeatureUsageLogs ADD AfterFeature NVARCHAR(100) NULL;
    PRINT 'AfterFeature column added to FeatureUsageLogs'
END
GO

-- ========================================
-- 3. ストアドプロシージャの再作成（修正版）
-- ========================================
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
            
            -- ログ記録（BeforeFeature, AfterFeatureカラムを使用）
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
        
        -- 使用ログを記録（BeforeFeature, AfterFeatureカラムを使用）
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

PRINT 'sp_UpdateFeatureSelection procedure updated with correct column names'
PRINT 'Migration FIX2 completed successfully'