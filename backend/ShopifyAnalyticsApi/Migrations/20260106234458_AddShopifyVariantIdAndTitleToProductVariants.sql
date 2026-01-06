-- マイグレーション: AddShopifyVariantIdAndTitleToProductVariants
-- 作成日: 2026-01-06
-- 作成者: 福田＋AI Assistant
-- 目的: ProductVariantsテーブルにShopifyVariantIdとTitleカラムを追加
-- 影響: ProductVariantsテーブルのスキーマ変更

-- ProductVariants テーブルに不足カラムを追加
ALTER TABLE ProductVariants ADD ShopifyVariantId NVARCHAR(50) NULL;
ALTER TABLE ProductVariants ADD Title NVARCHAR(255) NULL;

-- ロールバック用SQL（Down マイグレーション）
-- ALTER TABLE ProductVariants DROP COLUMN ShopifyVariantId;
-- ALTER TABLE ProductVariants DROP COLUMN Title;
