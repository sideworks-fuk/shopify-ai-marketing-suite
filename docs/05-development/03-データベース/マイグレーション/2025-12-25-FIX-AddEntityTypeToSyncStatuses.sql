-- =============================================
-- 作成日: 2025-12-25
-- 作成者: 福田 + AI Assistant
-- 目的: SyncStatusesテーブルに不足しているカラム（EntityType）を追加
-- 影響: SyncStatusesテーブルのスキーマ更新
-- EF Migration: AddShopifyAppsTable (20251222151634)
-- =============================================
-- 
-- 問題: 本番環境で以下のエラーが発生
-- Invalid column name 'EntityType'.
-- 
-- 原因: 本番環境のデータベースに最新のマイグレーションが適用されていない
-- 解決: 不足しているカラムを追加する
-- =============================================

-- SyncStatusesテーブルにEntityTypeカラムを追加
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SyncStatuses') AND name = 'EntityType')
BEGIN
    ALTER TABLE SyncStatuses
    ADD EntityType NVARCHAR(50) NULL;
    PRINT 'EntityType column added to SyncStatuses';
END
ELSE
BEGIN
    PRINT 'EntityType column already exists in SyncStatuses';
END
GO

-- 既存データの更新（NULL値のままでも問題なし）
-- EntityTypeはオプショナルなカラムのため、既存データはNULLのまま

-- 確認クエリ（実行結果の確認用）
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SyncStatuses'
    AND COLUMN_NAME = 'EntityType';
GO

PRINT 'SyncStatuses table migration completed successfully';
GO
