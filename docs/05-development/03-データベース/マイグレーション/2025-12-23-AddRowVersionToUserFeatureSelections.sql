-- =============================================
-- マイグレーション: AddRowVersionToUserFeatureSelections
-- 環境: Development / Staging / Production（共通）
-- 作成日: 2025-12-23
-- 作成者: 福田 + AI Assistant
-- 目的: UserFeatureSelections テーブルに RowVersion(rowversion) カラムを追加（Invalid column name 'RowVersion' の解消）
-- 影響: UserFeatureSelections に ROWVERSION NOT NULL カラム追加（SQL Serverが自動採番）
-- EF: Models/FeatureSelectionModels.cs の [Timestamp] RowVersion と整合させる
-- =============================================

SET NOCOUNT ON;

IF OBJECT_ID(N'[dbo].[UserFeatureSelections]', N'U') IS NULL
BEGIN
    PRINT 'UserFeatureSelections テーブルが存在しません。先に機能選択テーブル作成スクリプト（AddFeatureSelectionTables等）を適用してください。';
END
ELSE
BEGIN
    IF COL_LENGTH('dbo.UserFeatureSelections', 'RowVersion') IS NULL
    BEGIN
        ALTER TABLE [dbo].[UserFeatureSelections]
        ADD [RowVersion] ROWVERSION NOT NULL;

        PRINT 'UserFeatureSelections.RowVersion を追加しました。';
    END
    ELSE
    BEGIN
        PRINT 'UserFeatureSelections.RowVersion は既に存在します。';
    END
END
GO


