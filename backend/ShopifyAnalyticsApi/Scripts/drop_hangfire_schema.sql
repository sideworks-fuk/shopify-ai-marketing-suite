-- =============================================
-- Hangfireスキーマ削除スクリプト
-- =============================================
-- 作成日: 2025-12-22
-- 作成者: 福田
-- 目的: Hangfireスキーマとその中のすべてのオブジェクトを削除
-- 影響: Hangfire関連のすべてのデータが削除されます
-- =============================================

USE [ec-ranger-db-prod];
GO

-- スキーマが存在するか確認
IF EXISTS (SELECT * FROM sys.schemas WHERE name = 'HangFire')
BEGIN
    PRINT 'HangFireスキーマが見つかりました。削除を開始します...';
    
    -- スキーマ内のすべてのオブジェクトを削除するための動的SQL
    DECLARE @sql NVARCHAR(MAX) = N'';
    
    -- 1. HangFireスキーマ内のテーブル間の外部キー制約を削除（テーブルを削除する前に必要）
    SELECT @sql += N'ALTER TABLE [' + SCHEMA_NAME(fk.schema_id) + '].[' + OBJECT_NAME(fk.parent_object_id) + '] DROP CONSTRAINT [' + fk.name + '];' + CHAR(13)
    FROM sys.foreign_keys fk
    INNER JOIN sys.schemas s ON fk.schema_id = s.schema_id
    WHERE s.name = 'HangFire';
    
    -- 2. すべてのテーブルを削除
    SELECT @sql += N'DROP TABLE [' + s.name + '].[' + t.name + '];' + CHAR(13)
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'HangFire';
    
    -- 3. すべてのビューを削除
    SELECT @sql += N'DROP VIEW [' + s.name + '].[' + v.name + '];' + CHAR(13)
    FROM sys.views v
    INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
    WHERE s.name = 'HangFire';
    
    -- 4. すべてのストアドプロシージャを削除
    SELECT @sql += N'DROP PROCEDURE [' + s.name + '].[' + p.name + '];' + CHAR(13)
    FROM sys.procedures p
    INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
    WHERE s.name = 'HangFire';
    
    -- 5. すべての関数を削除
    SELECT @sql += N'DROP FUNCTION [' + s.name + '].[' + o.name + '];' + CHAR(13)
    FROM sys.objects o
    INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
    WHERE s.name = 'HangFire'
    AND o.type IN ('FN', 'IF', 'TF');
    
    -- 動的SQLを実行
    IF @sql <> N''
    BEGIN
        EXEC sp_executesql @sql;
        PRINT 'HangFireスキーマ内のすべてのオブジェクトを削除しました。';
    END
    ELSE
    BEGIN
        PRINT 'HangFireスキーマ内にオブジェクトが見つかりませんでした。';
    END
    
    -- スキーマ自体を削除
    DROP SCHEMA [HangFire];
    PRINT 'HangFireスキーマを削除しました。';
END
ELSE
BEGIN
    PRINT 'HangFireスキーマが見つかりませんでした。';
END
GO

PRINT 'スクリプトの実行が完了しました。';
GO

