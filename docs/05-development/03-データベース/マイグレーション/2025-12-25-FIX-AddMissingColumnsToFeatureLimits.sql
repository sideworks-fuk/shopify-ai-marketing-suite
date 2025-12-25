-- =============================================
-- 作成日: 2025-12-25
-- 作成者: 福田 + AI Assistant
-- 目的: FeatureLimitsテーブルに不足しているカラム（ChangeCooldownDays, IsActive）を追加
-- 影響: FeatureLimitsテーブルのスキーマ更新
-- EF Migration: AddShopifyAppsTable (20251222151634)
-- =============================================
-- 
-- 問題: 本番環境で以下のエラーが発生
-- Invalid column name 'ChangeCooldownDays'.
-- Invalid column name 'IsActive'.
-- 
-- 原因: 本番環境のデータベースに最新のマイグレーションが適用されていない
-- 解決: 不足しているカラムを追加する
-- =============================================

-- FeatureLimitsテーブルにChangeCooldownDaysカラムを追加
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FeatureLimits') AND name = 'ChangeCooldownDays')
BEGIN
    ALTER TABLE FeatureLimits
    ADD ChangeCooldownDays INT NOT NULL DEFAULT 30;
    PRINT 'ChangeCooldownDays column added to FeatureLimits';
END
ELSE
BEGIN
    PRINT 'ChangeCooldownDays column already exists in FeatureLimits';
END
GO

-- FeatureLimitsテーブルにIsActiveカラムを追加
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FeatureLimits') AND name = 'IsActive')
BEGIN
    ALTER TABLE FeatureLimits
    ADD IsActive BIT NOT NULL DEFAULT 1;
    PRINT 'IsActive column added to FeatureLimits';
END
ELSE
BEGIN
    PRINT 'IsActive column already exists in FeatureLimits';
END
GO

-- 既存データの更新（NULL値がある場合の対策）
-- 注: 通常はNOT NULL制約があるため実行されないが、念のため
UPDATE FeatureLimits
SET ChangeCooldownDays = 30
WHERE ChangeCooldownDays IS NULL;
GO

UPDATE FeatureLimits
SET IsActive = 1
WHERE IsActive IS NULL;
GO

-- 確認クエリ（実行結果の確認用）
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'FeatureLimits'
    AND COLUMN_NAME IN ('ChangeCooldownDays', 'IsActive')
ORDER BY COLUMN_NAME;
GO

PRINT 'FeatureLimits table migration completed successfully';
GO
