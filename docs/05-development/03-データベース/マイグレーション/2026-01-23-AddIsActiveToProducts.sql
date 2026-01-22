-- ==================================================
-- マイグレーション: Products テーブルに IsActive カラムを追加
-- 作成日: 2026-01-23
-- 作成者: 福田
-- 目的: 商品の論理削除をサポート（Shopify側で削除された商品を非アクティブ化）
-- ==================================================

-- Step 1: Products テーブルに IsActive カラムを追加
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Products' AND COLUMN_NAME = 'IsActive'
)
BEGIN
    ALTER TABLE Products 
    ADD IsActive bit NOT NULL DEFAULT 1;
    
    PRINT 'カラム IsActive を Products テーブルに追加しました';
END
ELSE
BEGIN
    PRINT 'カラム IsActive は既に存在します';
END
GO

-- Step 2: 既存データは全てアクティブに設定（デフォルト値で自動設定済み）
-- 明示的に更新する場合はコメントを解除
-- UPDATE Products SET IsActive = 1 WHERE IsActive IS NULL;
-- PRINT '既存データの IsActive を 1 に設定しました';
-- GO

-- Step 3: インデックスを追加（StoreId + IsActive で高速なクエリを実現）
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Products_StoreId_IsActive')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_StoreId_IsActive
    ON Products (StoreId, IsActive)
    INCLUDE (Id, ShopifyProductId, Title, ProductType, Vendor, SyncedAt);
    
    PRINT 'インデックス IX_Products_StoreId_IsActive を作成しました';
END
ELSE
BEGIN
    PRINT 'インデックス IX_Products_StoreId_IsActive は既に存在します';
END
GO

-- Step 4: 統計情報の更新
UPDATE STATISTICS Products;
PRINT '統計情報を更新しました';
GO

-- Step 5: 確認
SELECT 
    COUNT(*) AS TotalProducts,
    SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS ActiveProducts,
    SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END) AS InactiveProducts
FROM Products;
