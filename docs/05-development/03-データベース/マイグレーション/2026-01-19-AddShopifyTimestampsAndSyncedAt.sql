-- 作成日: 2026-01-19
-- 作成者: 福田＋AI Assistant
-- 目的: Orders/Customers/Productsの日時の意味明確化（Shopify日時と同期日時を追加）
-- 影響: Orders, Customers, Products テーブルにカラム追加
-- EF Migration: 20260119132903_AddShopifyTimestampsAndSyncedAt

BEGIN TRANSACTION;

-- Orders
IF COL_LENGTH('dbo.Orders', 'ShopifyCreatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD ShopifyCreatedAt DATETIME2 NULL;
END;
IF COL_LENGTH('dbo.Orders', 'ShopifyUpdatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD ShopifyUpdatedAt DATETIME2 NULL;
END;
IF COL_LENGTH('dbo.Orders', 'SyncedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD SyncedAt DATETIME2 NULL;
END;

-- Customers
IF COL_LENGTH('dbo.Customers', 'ShopifyCreatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Customers ADD ShopifyCreatedAt DATETIME2 NULL;
END;
IF COL_LENGTH('dbo.Customers', 'ShopifyUpdatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Customers ADD ShopifyUpdatedAt DATETIME2 NULL;
END;
IF COL_LENGTH('dbo.Customers', 'SyncedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Customers ADD SyncedAt DATETIME2 NULL;
END;

-- Products
IF COL_LENGTH('dbo.Products', 'ShopifyCreatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD ShopifyCreatedAt DATETIME2 NULL;
END;
IF COL_LENGTH('dbo.Products', 'ShopifyUpdatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD ShopifyUpdatedAt DATETIME2 NULL;
END;
IF COL_LENGTH('dbo.Products', 'SyncedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD SyncedAt DATETIME2 NULL;
END;

COMMIT TRANSACTION;
-- ROLLBACK TRANSACTION;
