-- ============================================================
-- OrderNumberユニーク制約の修正（マルチテナント対応）
-- ============================================================
-- 作成日: 2026-01-19
-- 作成者: AI Assistant
-- 目的: OrderNumberのユニーク制約をStoreId複合に変更
-- 影響: Ordersテーブルのインデックス変更
-- EF Migration: 20260119144014_FixOrderNumberUniqueConstraint
-- ============================================================

-- ⚠️ 注意: このスクリプトは既存のOrderNumber単独ユニーク制約を削除し、
-- ⚠️ StoreId + OrderNumber の複合ユニーク制約に変更します。
-- ⚠️ 本番環境では必ずバックアップを取得してから実行してください。

BEGIN TRANSACTION;

-- ============================================================
-- 1. 既存インデックスの確認
-- ============================================================
PRINT '========================================';
PRINT '既存インデックスの確認';
PRINT '========================================';

-- OrderNumber単独のユニークインデックス
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_OrderNumber' AND object_id = OBJECT_ID('Orders'))
BEGIN
    PRINT '✅ IX_Orders_OrderNumber インデックスが存在します（削除対象）';
END
ELSE
BEGIN
    PRINT '⚠️ IX_Orders_OrderNumber インデックスが存在しません';
END

-- StoreId + OrderNumber の複合インデックス（非ユニーク）
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_StoreId_OrderNumber' AND object_id = OBJECT_ID('Orders'))
BEGIN
    PRINT '✅ IX_Orders_StoreId_OrderNumber インデックスが存在します（削除対象）';
    
    -- インデックスがユニークかどうかを確認
    DECLARE @IsUnique BIT;
    SELECT @IsUnique = is_unique 
    FROM sys.indexes 
    WHERE name = 'IX_Orders_StoreId_OrderNumber' AND object_id = OBJECT_ID('Orders');
    
    IF @IsUnique = 1
    BEGIN
        PRINT '⚠️ 既にユニーク制約が付いています（処理不要の可能性）';
    END
    ELSE
    BEGIN
        PRINT '   現在は非ユニークインデックスです（削除して再作成）';
    END
END
ELSE
BEGIN
    PRINT '⚠️ IX_Orders_StoreId_OrderNumber インデックスが存在しません';
END

PRINT '';

-- ============================================================
-- 2. 重複データの確認（ユニーク制約追加前に確認）
-- ============================================================
PRINT '========================================';
PRINT '重複データの確認（StoreId + OrderNumber）';
PRINT '========================================';

DECLARE @DuplicateCount INT;
SELECT @DuplicateCount = COUNT(*) 
FROM (
    SELECT StoreId, OrderNumber, COUNT(*) AS cnt
    FROM Orders
    WHERE OrderNumber IS NOT NULL
    GROUP BY StoreId, OrderNumber
    HAVING COUNT(*) > 1
) AS duplicates;

IF @DuplicateCount > 0
BEGIN
    PRINT '⚠️ 重複データが ' + CAST(@DuplicateCount AS NVARCHAR(10)) + ' 件見つかりました';
    PRINT '   ユニーク制約を追加する前に重複を解消してください';
    PRINT '';
    PRINT '重複データの詳細:';
    SELECT StoreId, OrderNumber, COUNT(*) AS Count
    FROM Orders
    WHERE OrderNumber IS NOT NULL
    GROUP BY StoreId, OrderNumber
    HAVING COUNT(*) > 1
    ORDER BY StoreId, OrderNumber;
    PRINT '';
    PRINT '❌ トランザクションをロールバックします';
    ROLLBACK TRANSACTION;
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ 重複データは見つかりませんでした';
END

PRINT '';

-- ============================================================
-- 3. 既存インデックスの削除
-- ============================================================
PRINT '========================================';
PRINT '既存インデックスの削除';
PRINT '========================================';

-- OrderNumber単独のユニークインデックスを削除
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_OrderNumber' AND object_id = OBJECT_ID('Orders'))
BEGIN
    PRINT 'IX_Orders_OrderNumber インデックスを削除中...';
    DROP INDEX IX_Orders_OrderNumber ON Orders;
    PRINT '✅ IX_Orders_OrderNumber インデックスを削除しました';
END
ELSE
BEGIN
    PRINT '⚠️ IX_Orders_OrderNumber インデックスは存在しません（スキップ）';
END

-- StoreId + OrderNumber の複合インデックスを削除（再作成のため）
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_StoreId_OrderNumber' AND object_id = OBJECT_ID('Orders'))
BEGIN
    PRINT 'IX_Orders_StoreId_OrderNumber インデックスを削除中...';
    DROP INDEX IX_Orders_StoreId_OrderNumber ON Orders;
    PRINT '✅ IX_Orders_StoreId_OrderNumber インデックスを削除しました';
END
ELSE
BEGIN
    PRINT '⚠️ IX_Orders_StoreId_OrderNumber インデックスは存在しません（スキップ）';
END

PRINT '';

-- ============================================================
-- 4. 新しい複合ユニークインデックスの作成
-- ============================================================
PRINT '========================================';
PRINT '新しい複合ユニークインデックスの作成';
PRINT '========================================';

PRINT 'IX_Orders_StoreId_OrderNumber ユニークインデックスを作成中...';
CREATE UNIQUE NONCLUSTERED INDEX IX_Orders_StoreId_OrderNumber
ON Orders (StoreId, OrderNumber)
WHERE OrderNumber IS NOT NULL; -- NULL値は除外（フィルター付きインデックス）

PRINT '✅ IX_Orders_StoreId_OrderNumber ユニークインデックスを作成しました';
PRINT '';

-- ============================================================
-- 5. インデックス作成後の確認
-- ============================================================
PRINT '========================================';
PRINT 'インデックス作成後の確認';
PRINT '========================================';

IF EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'IX_Orders_StoreId_OrderNumber' 
      AND object_id = OBJECT_ID('Orders')
      AND is_unique = 1
)
BEGIN
    PRINT '✅ IX_Orders_StoreId_OrderNumber ユニークインデックスが正常に作成されました';
END
ELSE
BEGIN
    PRINT '❌ IX_Orders_StoreId_OrderNumber ユニークインデックスの作成に失敗しました';
    ROLLBACK TRANSACTION;
    RETURN;
END

-- OrderNumber単独のインデックスが削除されたことを確認
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Orders_OrderNumber' AND object_id = OBJECT_ID('Orders'))
BEGIN
    PRINT '✅ IX_Orders_OrderNumber インデックスが正常に削除されました';
END
ELSE
BEGIN
    PRINT '⚠️ IX_Orders_OrderNumber インデックスがまだ存在します';
END

PRINT '';

-- ============================================================
-- 6. 完了メッセージ
-- ============================================================
PRINT '========================================';
PRINT '✅ マイグレーション完了';
PRINT '========================================';
PRINT '';
PRINT '変更内容:';
PRINT '  - OrderNumber単独のユニーク制約を削除';
PRINT '  - StoreId + OrderNumber の複合ユニーク制約を追加';
PRINT '';
PRINT '⚠️ 問題がなければ、以下のコマンドでコミットしてください:';
PRINT 'COMMIT TRANSACTION;';
PRINT '';
PRINT '⚠️ 問題がある場合は、以下のコマンドでロールバックしてください:';
PRINT 'ROLLBACK TRANSACTION;';
PRINT '';

-- ============================================================
-- 注意事項
-- ============================================================
-- 1. この変更により、異なるStoreIdで同じOrderNumberを持つ注文を登録できるようになります
-- 2. 同じStoreId内では、OrderNumberは依然としてユニークです
-- 3. NULL値のOrderNumberは複数存在可能です（フィルター付きインデックスのため）
COMMIT TRANSACTION