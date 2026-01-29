-- ==================================================
-- マイグレーション: Orders テーブルに IsTest カラムを追加
-- ==================================================
-- 作成日: 2026-01-28
-- 作成者: 福田＋AI Assistant
-- 目的: Shopify のテスト注文フラグを保存。分析では本注文のみ対象のため、
--       IsTest = 1 の注文は前年同月比・購入回数・休眠顧客の各分析から除外する。
-- 影響: Orders テーブルに bit NOT NULL DEFAULT 0 カラムを追加。
-- 備考: EF マイグレーション 20260128092303_AddIsTestToOrders と同等。
-- ==================================================

-- Step 1: IsTest カラムが既に存在するか確認
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'IsTest'
)
BEGIN
    ALTER TABLE Orders
    ADD IsTest bit NOT NULL DEFAULT 0;

    PRINT '✅ カラム IsTest を Orders テーブルに追加しました';
END
ELSE
BEGIN
    PRINT '⏸️ カラム IsTest は既に存在します。スキップします。';
END
GO

-- Step 2: 追加後の確認
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Orders'
  AND COLUMN_NAME = 'IsTest';

GO

PRINT ''
PRINT '============================================================================'
PRINT '✅ マイグレーション完了: Orders.IsTest カラム追加'
PRINT ''
PRINT '次のステップ:'
PRINT '1. 既存データは IsTest = 0 のまま。過去のテスト注文を正しく付与するには'
PRINT '   Shopify 注文の再同期を実行すること。'
PRINT '2. Customer 再集計: POST /api/database/update-customer-totals を実行し、'
PRINT '   TotalOrders / LastOrderDate をテスト注文除外ベースで再計算することを推奨。'
PRINT '3. database-migration-tracking.md に適用状況を記録すること。'
PRINT '============================================================================'
GO
