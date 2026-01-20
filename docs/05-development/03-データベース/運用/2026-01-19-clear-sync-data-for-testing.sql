-- ============================================================
-- データ同期テスト前のデータクリアスクリプト
-- ============================================================
-- 用途: データ同期機能をテストする前に、既存の同期データをクリアする
-- 対象: 指定したStoreIdの同期関連データを削除
-- ============================================================

-- ⚠️ 注意: このスクリプトはテスト用のStoreIdのデータを削除します
-- ⚠️ 本番環境では使用しないでください

-- ============================================================
-- 1. パラメータ設定
-- ============================================================
DECLARE @StoreId INT = 18; -- テスト対象のStoreIdを指定
DECLARE @ConfirmDelete BIT = 0; -- 1に設定すると削除を実行

-- ============================================================
-- 2. 削除対象データの確認
-- ============================================================
PRINT '========================================';
PRINT '削除対象データの確認';
PRINT '========================================';
PRINT '';

-- 顧客データ
DECLARE @CustomerCount INT;
SELECT @CustomerCount = COUNT(*) FROM Customers WHERE StoreId = @StoreId;
PRINT '顧客データ: ' + CAST(@CustomerCount AS NVARCHAR(10)) + ' 件';

-- 商品データ
DECLARE @ProductCount INT;
SELECT @ProductCount = COUNT(*) FROM Products WHERE StoreId = @StoreId;
PRINT '商品データ: ' + CAST(@ProductCount AS NVARCHAR(10)) + ' 件';

-- 注文データ
DECLARE @OrderCount INT;
SELECT @OrderCount = COUNT(*) FROM Orders WHERE StoreId = @StoreId;
PRINT '注文データ: ' + CAST(@OrderCount AS NVARCHAR(10)) + ' 件';

-- 同期ステータス
DECLARE @SyncStatusCount INT;
SELECT @SyncStatusCount = COUNT(*) FROM SyncStatuses WHERE StoreId = @StoreId;
PRINT '同期ステータス: ' + CAST(@SyncStatusCount AS NVARCHAR(10)) + ' 件';

-- 同期履歴（存在する場合）
DECLARE @SyncHistoryCount INT;
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SyncHistory')
BEGIN
    SELECT @SyncHistoryCount = COUNT(*) FROM SyncHistory WHERE StoreId = @StoreId;
    PRINT '同期履歴: ' + CAST(@SyncHistoryCount AS NVARCHAR(10)) + ' 件';
END
ELSE
BEGIN
    PRINT '同期履歴: テーブルが存在しません';
END

PRINT '';
PRINT '========================================';
PRINT '';

-- ============================================================
-- 3. 削除実行（@ConfirmDelete = 1の場合のみ）
-- ============================================================
IF @ConfirmDelete = 1
BEGIN
    BEGIN TRANSACTION;
    
    PRINT '========================================';
    PRINT 'データ削除を開始します...';
    PRINT '========================================';
    PRINT '';
    
    -- 注文データを削除（外部キー制約のため最初に削除）
    PRINT '注文データを削除中...';
    DELETE FROM Orders WHERE StoreId = @StoreId;
    PRINT '注文データ削除完了: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 件';
    
    -- 顧客データを削除
    PRINT '顧客データを削除中...';
    DELETE FROM Customers WHERE StoreId = @StoreId;
    PRINT '顧客データ削除完了: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 件';
    
    -- 商品データを削除
    PRINT '商品データを削除中...';
    DELETE FROM Products WHERE StoreId = @StoreId;
    PRINT '商品データ削除完了: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 件';
    
    -- 同期ステータスを削除
    PRINT '同期ステータスを削除中...';
    DELETE FROM SyncStatuses WHERE StoreId = @StoreId;
    PRINT '同期ステータス削除完了: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 件';
    
    -- 同期履歴を削除（存在する場合）
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SyncHistory')
    BEGIN
        PRINT '同期履歴を削除中...';
        DELETE FROM SyncHistory WHERE StoreId = @StoreId;
        PRINT '同期履歴削除完了: ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 件';
    END
    
    PRINT '';
    PRINT '========================================';
    PRINT 'データ削除が完了しました';
    PRINT '========================================';
    PRINT '';
    PRINT '⚠️ コミットする場合は、以下のコマンドを実行してください:';
    PRINT 'COMMIT TRANSACTION;';
    PRINT '';
    PRINT '⚠️ ロールバックする場合は、以下のコマンドを実行してください:';
    PRINT 'ROLLBACK TRANSACTION;';
    PRINT '';
    
    -- 削除後の確認
    PRINT '========================================';
    PRINT '削除後のデータ確認';
    PRINT '========================================';
    SELECT 
        (SELECT COUNT(*) FROM Customers WHERE StoreId = @StoreId) AS CustomerCount,
        (SELECT COUNT(*) FROM Products WHERE StoreId = @StoreId) AS ProductCount,
        (SELECT COUNT(*) FROM Orders WHERE StoreId = @StoreId) AS OrderCount,
        (SELECT COUNT(*) FROM SyncStatuses WHERE StoreId = @StoreId) AS SyncStatusCount;
END
ELSE
BEGIN
    PRINT '========================================';
    PRINT '⚠️ 削除は実行されませんでした';
    PRINT '========================================';
    PRINT '';
    PRINT '削除を実行するには、@ConfirmDelete を 1 に設定してください';
    PRINT '';
    PRINT '例:';
    PRINT 'DECLARE @ConfirmDelete BIT = 1;';
    PRINT '';
END

-- ============================================================
-- 4. 削除対象外のテーブル（保持すべきデータ）
-- ============================================================
-- 以下のテーブルは削除しません（テストに必要）:
-- - Stores: ストア情報（必須）
-- - StoreSubscriptions: サブスクリプション情報（必須）
-- - SubscriptionPlans: プラン情報（必須）
-- - ShopifyApps: アプリ情報（必須）
-- - AccessTokens: アクセストークン（必須）

-- ============================================================
-- 使用方法
-- ============================================================
-- 1. @StoreId をテスト対象のStoreIdに設定
-- 2. @ConfirmDelete を 1 に設定
-- 3. スクリプトを実行
-- 4. 削除結果を確認
-- 5. 問題がなければ COMMIT TRANSACTION; を実行
-- 6. 問題があれば ROLLBACK TRANSACTION; を実行

-- ============================================================
-- 作成日: 2026-01-19
-- 作成者: AI Assistant
-- ============================================================
