-- =============================================
-- マイグレーション: AddPlanNameToStoreSubscriptions
-- 環境: Development / Staging / Production（共通）
-- 作成日: 2025-12-23
-- 作成者: 福田 + AI Assistant
-- 目的: StoreSubscriptions テーブルに PlanName カラムを追加（Invalid column name 'PlanName' の解消）
-- 影響: StoreSubscriptions に NVARCHAR(100) NULL カラム追加（既存データはNULLのまま）
-- EF Migration: 20251222151634_AddShopifyAppsTable（モデル上はPlanNameが存在するが、DB未適用環境があるため差分適用）
-- =============================================

SET NOCOUNT ON;

-- 対象テーブルの存在確認
IF OBJECT_ID(N'[dbo].[StoreSubscriptions]', N'U') IS NULL
BEGIN
    PRINT 'StoreSubscriptions テーブルが存在しません。先に課金テーブル作成スクリプト（CreateBillingTables等）を適用してください。';
END
ELSE
BEGIN
    -- PlanName カラムを追加（未存在時のみ）
    IF COL_LENGTH('dbo.StoreSubscriptions', 'PlanName') IS NULL
    BEGIN
        ALTER TABLE [dbo].[StoreSubscriptions]
        ADD [PlanName] NVARCHAR(100) NULL;

        PRINT 'StoreSubscriptions.PlanName を追加しました。';
    END
    ELSE
    BEGIN
        PRINT 'StoreSubscriptions.PlanName は既に存在します。';
    END
END
GO

-- 既存データの補完（PlanId から SubscriptionPlans.Name をコピー）
-- 注意: 同一バッチ内でALTER直後の新規カラム参照をするとコンパイル時に失敗するため、GOで分割して実行する
IF OBJECT_ID(N'[dbo].[StoreSubscriptions]', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.StoreSubscriptions', 'PlanName') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'[dbo].[SubscriptionPlans]', N'U') IS NOT NULL
    BEGIN
        DECLARE @sql NVARCHAR(MAX) = N'
UPDATE ss
SET ss.PlanName = p.[Name]
FROM [dbo].[StoreSubscriptions] ss
INNER JOIN [dbo].[SubscriptionPlans] p
    ON p.[Id] = ss.[PlanId]
WHERE ss.[PlanName] IS NULL;';

        EXEC sp_executesql @sql;

        PRINT 'StoreSubscriptions.PlanName の補完（NULLのみ）を実行しました。';
    END
    ELSE
    BEGIN
        PRINT 'SubscriptionPlans テーブルが存在しないため、PlanName 補完はスキップしました。';
    END
END
ELSE
BEGIN
    PRINT 'StoreSubscriptions.PlanName が存在しないため、補完はスキップしました。';
END
GO


