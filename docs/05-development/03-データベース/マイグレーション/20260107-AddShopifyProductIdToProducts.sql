-- マイグレーション: AddShopifyProductIdToProducts
-- 作成日: 2026-01-07
-- 作成者: 福田＋AI Assistant
-- 目的: Productsテーブル、ProductVariantsテーブル、OrderItemsテーブルに不足カラムを追加（20251222151634_AddShopifyAppsTableマイグレーションが適用されていない場合の対応）
-- 影響: Products、ProductVariants、OrderItemsテーブルのスキーマ変更

-- Products テーブルにShopifyProductIdカラムを追加（存在しない場合のみ）
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Products' 
    AND COLUMN_NAME = 'ShopifyProductId'
)
BEGIN
    ALTER TABLE Products ADD ShopifyProductId NVARCHAR(50) NULL;
    PRINT 'ProductsテーブルにShopifyProductIdカラムを追加しました';
END
ELSE
BEGIN
    PRINT 'ProductsテーブルのShopifyProductIdカラムは既に存在します';
END

-- ProductVariants テーブルに ShopifyProductId カラムを追加（存在しない場合のみ）
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ProductVariants' 
    AND COLUMN_NAME = 'ShopifyProductId'
)
BEGIN
    ALTER TABLE ProductVariants ADD ShopifyProductId NVARCHAR(50) NULL;
    PRINT 'ProductVariantsテーブルにShopifyProductIdカラムを追加しました';
END
ELSE
BEGIN
    PRINT 'ProductVariantsテーブルのShopifyProductIdカラムは既に存在します';
END

-- OrderItems テーブルに不足カラムを追加（存在しない場合のみ）
-- ProductId
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'OrderItems' 
    AND COLUMN_NAME = 'ProductId'
)
BEGIN
    ALTER TABLE OrderItems ADD ProductId NVARCHAR(50) NULL;
    PRINT 'OrderItemsテーブルにProductIdカラムを追加しました';
END
ELSE
BEGIN
    PRINT 'OrderItemsテーブルのProductIdカラムは既に存在します';
END

-- ShopifyLineItemId
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'OrderItems' 
    AND COLUMN_NAME = 'ShopifyLineItemId'
)
BEGIN
    ALTER TABLE OrderItems ADD ShopifyLineItemId NVARCHAR(50) NULL;
    PRINT 'OrderItemsテーブルにShopifyLineItemIdカラムを追加しました';
END
ELSE
BEGIN
    PRINT 'OrderItemsテーブルのShopifyLineItemIdカラムは既に存在します';
END

-- ShopifyProductId
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'OrderItems' 
    AND COLUMN_NAME = 'ShopifyProductId'
)
BEGIN
    ALTER TABLE OrderItems ADD ShopifyProductId NVARCHAR(50) NULL;
    PRINT 'OrderItemsテーブルにShopifyProductIdカラムを追加しました';
END
ELSE
BEGIN
    PRINT 'OrderItemsテーブルのShopifyProductIdカラムは既に存在します';
END

-- ShopifyVariantId
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'OrderItems' 
    AND COLUMN_NAME = 'ShopifyVariantId'
)
BEGIN
    ALTER TABLE OrderItems ADD ShopifyVariantId NVARCHAR(50) NULL;
    PRINT 'OrderItemsテーブルにShopifyVariantIdカラムを追加しました';
END
ELSE
BEGIN
    PRINT 'OrderItemsテーブルのShopifyVariantIdカラムは既に存在します';
END

-- Title
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'OrderItems' 
    AND COLUMN_NAME = 'Title'
)
BEGIN
    ALTER TABLE OrderItems ADD Title NVARCHAR(255) NULL;
    PRINT 'OrderItemsテーブルにTitleカラムを追加しました';
END
ELSE
BEGIN
    PRINT 'OrderItemsテーブルのTitleカラムは既に存在します';
END

-- ロールバック用SQL（Down マイグレーション）
-- ALTER TABLE Products DROP COLUMN ShopifyProductId;
-- ALTER TABLE ProductVariants DROP COLUMN ShopifyProductId;
-- ALTER TABLE OrderItems DROP COLUMN ProductId;
-- ALTER TABLE OrderItems DROP COLUMN ShopifyLineItemId;
-- ALTER TABLE OrderItems DROP COLUMN ShopifyProductId;
-- ALTER TABLE OrderItems DROP COLUMN ShopifyVariantId;
-- ALTER TABLE OrderItems DROP COLUMN Title;
