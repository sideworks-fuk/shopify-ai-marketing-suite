-- マイグレーション: ChangeSyncStatusStoreIdToInt
-- 作成日: 2026-01-07
-- 作成者: 福田＋AI Assistant
-- 目的: SyncStatusesテーブルのStoreIdカラムを文字列型から整数型に変更（データ型の統一）
-- 影響: SyncStatusesテーブルのスキーマ変更、既存データの型変換

-- 削除前にデータ件数を確認
PRINT '=== SyncStatuses テーブルのデータ件数確認 ===';
SELECT COUNT(*) AS RecordCount FROM SyncStatuses;

-- 現在のカラム状態を確認
PRINT '=== 現在のカラム状態を確認 ===';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SyncStatuses'
AND COLUMN_NAME IN ('StoreId', 'StoreIdInt')
ORDER BY COLUMN_NAME;

-- StoreIdが数値に変換可能か確認
PRINT '=== StoreIdが数値に変換可能か確認 ===';
SELECT 
    StoreId,
    CASE 
        WHEN ISNUMERIC(StoreId) = 1 THEN '変換可能'
        ELSE '変換不可'
    END AS ConversionStatus,
    COUNT(*) AS RecordCount
FROM SyncStatuses
GROUP BY StoreId;

-- トランザクション開始前に現在の状態を確認
PRINT '=== マイグレーション開始前の状態確認 ===';
SELECT 
    c.name AS ColumnName,
    ty.name AS DataType,
    c.is_nullable AS IsNullable
FROM sys.columns c
INNER JOIN sys.tables t ON c.object_id = t.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE t.name = 'SyncStatuses'
AND c.name IN ('StoreId', 'StoreIdInt')
ORDER BY c.name;

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. 一時カラムが既に存在するか確認（sys.columnsを使用）
    DECLARE @StoreIdIntExists BIT = 0;
    SELECT @StoreIdIntExists = 1
    FROM sys.columns c
    INNER JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'SyncStatuses' 
    AND c.name = 'StoreIdInt';
    
    IF @StoreIdIntExists = 0
    BEGIN
        PRINT '一時カラム StoreIdInt を追加します...';
        -- 一時カラムを追加（int型）
        BEGIN TRY
            ALTER TABLE SyncStatuses ADD StoreIdInt INT NULL;
            PRINT '一時カラム StoreIdInt を追加しました';
        END TRY
        BEGIN CATCH
            PRINT 'エラー: StoreIdIntカラムの追加中にエラーが発生しました';
            PRINT ERROR_MESSAGE();
            THROW;
        END CATCH
        
        -- カラム追加を確認（sys.columnsを使用）
        -- 少し待機してから確認（SQL Serverがメタデータを更新する時間を確保）
        WAITFOR DELAY '00:00:01';
        
        DECLARE @VerifyExists BIT = 0;
        SELECT @VerifyExists = 1
        FROM sys.columns c
        INNER JOIN sys.tables t ON c.object_id = t.object_id
        WHERE t.name = 'SyncStatuses' 
        AND c.name = 'StoreIdInt';
        
        IF @VerifyExists = 0
        BEGIN
            PRINT 'エラー: StoreIdIntカラムの追加に失敗しました（確認できませんでした）';
            -- デバッグ情報を出力
            SELECT 
                c.name AS ColumnName,
                t.name AS TableName
            FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            WHERE t.name = 'SyncStatuses'
            ORDER BY c.name;
            THROW 50000, 'StoreIdIntカラムの追加に失敗しました', 1;
        END
        ELSE
        BEGIN
            PRINT 'StoreIdIntカラムの追加を確認しました';
        END
    END
    ELSE
    BEGIN
        PRINT '一時カラム StoreIdInt は既に存在します';
    END

    -- 2. 既存データを変換（数値に変換可能なもののみ）
    -- StoreIdIntカラムが存在することを再確認してから実行（sys.columnsを使用）
    DECLARE @StoreIdIntExists2 BIT = 0;
    SELECT @StoreIdIntExists2 = 1
    FROM sys.columns c
    INNER JOIN sys.tables t ON c.object_id = t.object_id
    WHERE t.name = 'SyncStatuses' 
    AND c.name = 'StoreIdInt';
    
    PRINT 'StoreIdIntカラムの存在確認結果: ' + CAST(@StoreIdIntExists2 AS VARCHAR(1));
    
    IF @StoreIdIntExists2 = 1
    BEGIN
        -- データ変換前に件数を確認
        DECLARE @RecordCount INT;
        SELECT @RecordCount = COUNT(*) FROM SyncStatuses;
        PRINT '変換対象レコード数: ' + CAST(@RecordCount AS VARCHAR(10));
        
        -- UPDATE文を実行（動的SQLを使用してカラムを確実に認識させる）
        BEGIN TRY
            -- 動的SQLを使用してUPDATEを実行
            DECLARE @UpdateSQL NVARCHAR(MAX);
            SET @UpdateSQL = N'
                UPDATE SyncStatuses 
                SET StoreIdInt = CASE 
                    WHEN ISNUMERIC(StoreId) = 1 THEN CAST(StoreId AS INT)
                    ELSE NULL
                END;
            ';
            
            PRINT 'UPDATE文を実行します...';
            EXEC sp_executesql @UpdateSQL;
            PRINT 'UPDATE文の実行が完了しました';
            
            -- 変換後の確認
            DECLARE @ConvertedCount INT;
            DECLARE @CheckSQL NVARCHAR(MAX);
            SET @CheckSQL = N'
                SELECT @Count = COUNT(*) 
                FROM SyncStatuses 
                WHERE StoreIdInt IS NOT NULL;
            ';
            EXEC sp_executesql @CheckSQL, N'@Count INT OUTPUT', @Count = @ConvertedCount OUTPUT;
            PRINT '変換成功レコード数: ' + CAST(@ConvertedCount AS VARCHAR(10));
            PRINT '既存データを変換しました';
        END TRY
        BEGIN CATCH
            PRINT 'エラー: UPDATE文の実行中にエラーが発生しました';
            PRINT ERROR_MESSAGE();
            PRINT 'エラー行: ' + CAST(ERROR_LINE() AS VARCHAR(10));
            PRINT 'エラー番号: ' + CAST(ERROR_NUMBER() AS VARCHAR(10));
            -- デバッグ情報を出力
            SELECT 
                c.name AS ColumnName,
                t.name AS TableName,
                ty.name AS DataType
            FROM sys.columns c
            INNER JOIN sys.tables t ON c.object_id = t.object_id
            INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
            WHERE t.name = 'SyncStatuses'
            ORDER BY c.name;
            THROW;
        END CATCH
    END
    ELSE
    BEGIN
        PRINT 'エラー: StoreIdIntカラムが見つかりません';
        -- デバッグ情報を出力
        SELECT 
            c.name AS ColumnName,
            t.name AS TableName
        FROM sys.columns c
        INNER JOIN sys.tables t ON c.object_id = t.object_id
        WHERE t.name = 'SyncStatuses';
        THROW 50000, 'StoreIdIntカラムが見つかりません', 1;
    END

    -- 3. 変換できなかったデータがあるか確認（動的SQLを使用）
    DECLARE @FailedCount INT;
    DECLARE @CheckFailedSQL NVARCHAR(MAX);
    SET @CheckFailedSQL = N'
        SELECT @Count = COUNT(*) 
        FROM SyncStatuses 
        WHERE StoreIdInt IS NULL;
    ';
    EXEC sp_executesql @CheckFailedSQL, N'@Count INT OUTPUT', @Count = @FailedCount OUTPUT;
    
    IF @FailedCount > 0
    BEGIN
        PRINT '警告: ' + CAST(@FailedCount AS VARCHAR(10)) + '件のデータが変換できませんでした';
        -- 変換できなかったデータを表示（動的SQLを使用）
        DECLARE @SelectFailedSQL NVARCHAR(MAX);
        SET @SelectFailedSQL = N'
            SELECT StoreId, Id, SyncType, Status 
            FROM SyncStatuses 
            WHERE StoreIdInt IS NULL;
        ';
        EXEC sp_executesql @SelectFailedSQL;
    END

    -- 4. 元のStoreIdカラムが存在するか確認してから削除
    -- まず、StoreIdカラムに依存するインデックスや制約を削除する必要がある
    IF EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'SyncStatuses' 
        AND COLUMN_NAME = 'StoreId'
        AND DATA_TYPE = 'nvarchar'  -- 文字列型のStoreIdのみ削除
    )
    BEGIN
        -- 4-1. StoreIdカラムに依存するインデックスを削除
        IF EXISTS (
            SELECT 1 
            FROM sys.indexes i
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            WHERE t.name = 'SyncStatuses' 
            AND i.name = 'IX_SyncStatuses_StoreId'
        )
        BEGIN
            DROP INDEX IX_SyncStatuses_StoreId ON SyncStatuses;
            PRINT 'インデックス IX_SyncStatuses_StoreId を削除しました';
        END
        
        -- 4-2. StoreIdカラムに依存する外部キー制約を削除（存在する場合）
        IF EXISTS (
            SELECT 1 
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
            WHERE t.name = 'SyncStatuses'
            AND fk.name LIKE '%StoreId%'
        )
        BEGIN
            DECLARE @FKName NVARCHAR(128);
            SELECT @FKName = fk.name
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
            WHERE t.name = 'SyncStatuses'
            AND fk.name LIKE '%StoreId%';
            
            DECLARE @DropFKSQL NVARCHAR(MAX);
            SET @DropFKSQL = N'ALTER TABLE SyncStatuses DROP CONSTRAINT ' + QUOTENAME(@FKName);
            EXEC sp_executesql @DropFKSQL;
            PRINT '外部キー制約 ' + @FKName + ' を削除しました';
        END
        
        -- 4-3. StoreIdカラムを削除
        ALTER TABLE SyncStatuses DROP COLUMN StoreId;
        PRINT '元のStoreIdカラム（文字列型）を削除しました';
    END
    ELSE
    BEGIN
        PRINT '元のStoreIdカラム（文字列型）は存在しません（既に変換済みの可能性があります）';
    END

    -- 5. StoreIdIntカラムが存在し、StoreIdカラムが存在しない場合のみリネーム
    IF EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'SyncStatuses' 
        AND COLUMN_NAME = 'StoreIdInt'
    )
    AND NOT EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'SyncStatuses' 
        AND COLUMN_NAME = 'StoreId'
    )
    BEGIN
        EXEC sp_rename 'SyncStatuses.StoreIdInt', 'StoreId', 'COLUMN';
        PRINT '一時カラムをStoreIdにリネームしました';
    END
    ELSE IF EXISTS (
        SELECT 1 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'SyncStatuses' 
        AND COLUMN_NAME = 'StoreId'
        AND DATA_TYPE = 'int'  -- 既にint型のStoreIdが存在する場合
    )
    BEGIN
        PRINT 'StoreIdカラムは既にint型です（変換済み）';
        -- StoreIdIntカラムが残っている場合は削除
        IF EXISTS (
            SELECT 1 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'SyncStatuses' 
            AND COLUMN_NAME = 'StoreIdInt'
        )
        BEGIN
            ALTER TABLE SyncStatuses DROP COLUMN StoreIdInt;
            PRINT '不要なStoreIdIntカラムを削除しました';
        END
    END
    ELSE
    BEGIN
        PRINT '警告: StoreIdIntカラムまたはStoreIdカラムの状態が予期しない状態です';
    END

    -- 6. 参照整合性チェック: StoreIdがStoresテーブルに存在するか確認
    PRINT '=== 参照整合性チェック開始 ===';
    DECLARE @InvalidStoreIdCount INT;
    SELECT @InvalidStoreIdCount = COUNT(*)
    FROM SyncStatuses ss
    LEFT JOIN Stores s ON ss.StoreId = s.Id
    WHERE s.Id IS NULL;
    
    IF @InvalidStoreIdCount > 0
    BEGIN
        PRINT '警告: ' + CAST(@InvalidStoreIdCount AS VARCHAR(10)) + '件のレコードで無効なStoreIdが検出されました';
        PRINT '無効なStoreIdのレコードを表示します:';
        
        SELECT 
            ss.Id AS SyncStatusId,
            ss.StoreId AS InvalidStoreId,
            ss.SyncType,
            ss.Status,
            ss.StartDate
        FROM SyncStatuses ss
        LEFT JOIN Stores s ON ss.StoreId = s.Id
        WHERE s.Id IS NULL;
        
        PRINT '無効なStoreIdのレコードを削除します...';
        DELETE ss
        FROM SyncStatuses ss
        LEFT JOIN Stores s ON ss.StoreId = s.Id
        WHERE s.Id IS NULL;
        
        PRINT CAST(@InvalidStoreIdCount AS VARCHAR(10)) + '件のレコードを削除しました';
    END
    ELSE
    BEGIN
        PRINT '参照整合性チェック完了: すべてのStoreIdが有効です';
    END

    -- 7. NOT NULL制約を追加
    ALTER TABLE SyncStatuses ALTER COLUMN StoreId INT NOT NULL;
    PRINT 'StoreIdカラムにNOT NULL制約を追加しました';

    -- 8. 外部キー制約を追加（Storesテーブルへの参照）
    IF NOT EXISTS (
        SELECT 1 
        FROM sys.foreign_keys 
        WHERE name = 'FK_SyncStatuses_Stores_StoreId'
    )
    BEGIN
        -- 再度参照整合性を確認
        DECLARE @FinalCheckCount INT;
        SELECT @FinalCheckCount = COUNT(*)
        FROM SyncStatuses ss
        LEFT JOIN Stores s ON ss.StoreId = s.Id
        WHERE s.Id IS NULL;
        
        IF @FinalCheckCount = 0
        BEGIN
            ALTER TABLE SyncStatuses 
            ADD CONSTRAINT FK_SyncStatuses_Stores_StoreId 
            FOREIGN KEY (StoreId) 
            REFERENCES Stores(Id);
            PRINT '外部キー制約 FK_SyncStatuses_Stores_StoreId を追加しました';
        END
        ELSE
        BEGIN
            PRINT 'エラー: 参照整合性チェックに失敗しました。' + CAST(@FinalCheckCount AS VARCHAR(10)) + '件の無効なStoreIdが残っています';
            THROW 50000, '参照整合性チェックに失敗しました', 1;
        END
    END
    ELSE
    BEGIN
        PRINT '外部キー制約 FK_SyncStatuses_Stores_StoreId は既に存在します';
    END

    -- 9. インデックスを追加（パフォーマンス向上のため）
    IF NOT EXISTS (
        SELECT 1 
        FROM sys.indexes 
        WHERE name = 'IX_SyncStatuses_StoreId'
    )
    BEGIN
        CREATE INDEX IX_SyncStatuses_StoreId ON SyncStatuses(StoreId);
        PRINT 'インデックス IX_SyncStatuses_StoreId を追加しました';
    END
    ELSE
    BEGIN
        PRINT 'インデックス IX_SyncStatuses_StoreId は既に存在します';
    END

    -- 変換後のデータ件数確認
    PRINT '=== 変換後のデータ件数確認 ===';
    SELECT COUNT(*) AS RecordCount FROM SyncStatuses;
    SELECT StoreId, COUNT(*) AS RecordCount 
    FROM SyncStatuses 
    GROUP BY StoreId 
    ORDER BY StoreId;

    COMMIT TRANSACTION;
    PRINT '=== マイグレーション完了 ===';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '=== エラー発生: ロールバックしました ===';
    PRINT ERROR_MESSAGE();
    THROW;
END CATCH;

-- ロールバック用SQL（Down マイグレーション）
-- BEGIN TRANSACTION;
-- ALTER TABLE SyncStatuses DROP CONSTRAINT FK_SyncStatuses_Stores_StoreId;
-- DROP INDEX IF EXISTS IX_SyncStatuses_StoreId ON SyncStatuses;
-- ALTER TABLE SyncStatuses ADD StoreIdString NVARCHAR(255) NULL;
-- UPDATE SyncStatuses SET StoreIdString = CAST(StoreId AS NVARCHAR(255));
-- ALTER TABLE SyncStatuses DROP COLUMN StoreId;
-- EXEC sp_rename 'SyncStatuses.StoreIdString', 'StoreId', 'COLUMN';
-- ALTER TABLE SyncStatuses ALTER COLUMN StoreId NVARCHAR(255) NOT NULL;
-- COMMIT TRANSACTION;
