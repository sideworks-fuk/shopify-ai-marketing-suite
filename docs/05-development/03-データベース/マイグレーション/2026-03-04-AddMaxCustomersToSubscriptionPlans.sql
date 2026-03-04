-- =============================================
-- マイグレーション: AddMaxCustomersToSubscriptionPlans
-- 環境: Development / Staging / Production（共通）
-- 作成日: 2026-03-04
-- 作成者: 福田 + AI Assistant
-- 目的: SubscriptionPlans に MaxCustomers カラムを追加し、顧客数ベースの料金プラン判定を可能にする
-- 影響: SubscriptionPlans テーブルにカラム追加 + Basic プラン追加 + 既存プラン更新
-- 背景: read_customers スコープ削除に伴い、注文由来の顧客数でプラン判定する仕様に変更（B案）
-- =============================================

SET NOCOUNT ON;

-- 1. MaxCustomers カラム追加（NULL = 無制限）
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'SubscriptionPlans' AND COLUMN_NAME = 'MaxCustomers'
)
BEGIN
    ALTER TABLE dbo.SubscriptionPlans ADD MaxCustomers INT NULL;
    PRINT 'SubscriptionPlans: MaxCustomers カラムを追加しました。';
END
ELSE
BEGIN
    PRINT 'SubscriptionPlans: MaxCustomers カラムは既に存在します。';
END
GO

-- 2. Basic プラン追加（顧客3,000件まで $10/月）
IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE [Name] = N'Basic')
BEGIN
    INSERT INTO dbo.SubscriptionPlans ([Name], [Price], [TrialDays], [MaxCustomers], [Features], [IsActive], [CreatedAt], [UpdatedAt])
    VALUES (N'Basic', 10.00, 30, 3000, NULL, 1, GETUTCDATE(), GETUTCDATE());
    PRINT 'SubscriptionPlans: Basic ($10, 顧客3,000件まで) を追加しました。';
END
ELSE
BEGIN
    PRINT 'SubscriptionPlans: Basic は既に存在します。';
END
GO

-- 3. 既存プランの MaxCustomers を設定
-- Free: 無制限（NULL）- 休眠顧客分析のみ
UPDATE dbo.SubscriptionPlans SET MaxCustomers = NULL, UpdatedAt = GETUTCDATE()
WHERE [Name] = N'Free';
PRINT 'SubscriptionPlans: Free の MaxCustomers を NULL（無制限）に設定しました。';

-- Professional: 顧客10,000件まで
UPDATE dbo.SubscriptionPlans SET MaxCustomers = 10000, Price = 50.00, UpdatedAt = GETUTCDATE()
WHERE [Name] = N'Professional';
PRINT 'SubscriptionPlans: Professional の MaxCustomers を 10,000 に設定しました。';

-- Enterprise: 顧客50,000件まで
UPDATE dbo.SubscriptionPlans SET MaxCustomers = 50000, Price = 100.00, UpdatedAt = GETUTCDATE()
WHERE [Name] = N'Enterprise';
PRINT 'SubscriptionPlans: Enterprise の MaxCustomers を 50,000 に設定しました。';
GO

-- 4. 確認
SELECT Id, [Name], [Price], [TrialDays], [MaxCustomers], [IsActive]
FROM dbo.SubscriptionPlans
ORDER BY CASE [Name]
    WHEN 'Free' THEN 1
    WHEN 'Basic' THEN 2
    WHEN 'Professional' THEN 3
    WHEN 'Enterprise' THEN 4
    ELSE 5
END;
