-- =============================================
-- マイグレーション: SeedSubscriptionPlans
-- 環境: Development / Staging / Production（共通）
-- 作成日: 2025-12-23
-- 作成者: 福田 + AI Assistant
-- 目的: SubscriptionPlans テーブルに初期マスタ（Free / Professional / Enterprise）を投入
-- 影響: SubscriptionPlans にレコード追加（冪等: 既存Nameがあれば追加しない）
-- 前提: 2025-08-24-CreateBillingTables.sql 等で SubscriptionPlans が作成済み
-- =============================================

SET NOCOUNT ON;

IF OBJECT_ID(N'[dbo].[SubscriptionPlans]', N'U') IS NULL
BEGIN
    PRINT 'SubscriptionPlans テーブルが存在しません。先に CreateBillingTables 等でテーブル作成を実施してください。';
    RETURN;
END
GO

-- Free
IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE [Name] = N'Free')
BEGIN
    INSERT INTO dbo.SubscriptionPlans ([Name], [Price], [TrialDays], [Features], [IsActive], [CreatedAt], [UpdatedAt])
    VALUES (N'Free', 0.00, 0, NULL, 1, GETUTCDATE(), GETUTCDATE());

    PRINT 'SubscriptionPlans: Free を追加しました。';
END
ELSE
BEGIN
    PRINT 'SubscriptionPlans: Free は既に存在します。';
END
GO

-- Professional（案1のインストール直後トライアルで利用）
IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE [Name] = N'Professional')
BEGIN
    INSERT INTO dbo.SubscriptionPlans ([Name], [Price], [TrialDays], [Features], [IsActive], [CreatedAt], [UpdatedAt])
    VALUES (N'Professional', 80.00, 14, NULL, 1, GETUTCDATE(), GETUTCDATE());

    PRINT 'SubscriptionPlans: Professional を追加しました。';
END
ELSE
BEGIN
    PRINT 'SubscriptionPlans: Professional は既に存在します。';
END
GO

-- Enterprise
IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE [Name] = N'Enterprise')
BEGIN
    INSERT INTO dbo.SubscriptionPlans ([Name], [Price], [TrialDays], [Features], [IsActive], [CreatedAt], [UpdatedAt])
    VALUES (N'Enterprise', 100.00, 30, NULL, 1, GETUTCDATE(), GETUTCDATE());

    PRINT 'SubscriptionPlans: Enterprise を追加しました。';
END
ELSE
BEGIN
    PRINT 'SubscriptionPlans: Enterprise は既に存在します。';
END
GO

-- 確認
SELECT Id, [Name], [Price], [TrialDays], [IsActive]
FROM dbo.SubscriptionPlans
ORDER BY Id;


