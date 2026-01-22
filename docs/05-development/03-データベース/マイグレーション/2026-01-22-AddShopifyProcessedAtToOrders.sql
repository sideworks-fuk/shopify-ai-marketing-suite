-- ============================================================================
-- マイグレーション: ShopifyProcessedAt カラムを Orders テーブルに追加
-- ============================================================================
-- 作成日: 2026-01-22
-- 作成者: AI Assistant
-- 目的: 決済完了日時（processedAt）を保存するカラムを追加
--       分析レポートでは createdAt よりも processedAt を使用すべき
-- 影響: Orders テーブルに nullable な datetime カラムを追加
-- ============================================================================

-- ============================================================================
-- ステップ 1: 現在の状態確認
-- ============================================================================
PRINT '=== Step 1: Orders テーブルの現在のカラム確認 ==='
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Orders'
ORDER BY ORDINAL_POSITION

GO

-- ============================================================================
-- ステップ 2: ShopifyProcessedAt カラムが既に存在するか確認
-- ============================================================================
PRINT '=== Step 2: ShopifyProcessedAt カラム存在確認 ==='

IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'ShopifyProcessedAt'
)
BEGIN
    PRINT '✅ ShopifyProcessedAt カラムは既に存在します。スキップします。'
END
ELSE
BEGIN
    PRINT '⏳ ShopifyProcessedAt カラムが存在しません。追加します。'
END

GO

-- ============================================================================
-- ステップ 3: ShopifyProcessedAt カラム追加（存在しない場合のみ）
-- ============================================================================
PRINT '=== Step 3: ShopifyProcessedAt カラム追加 ==='

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'ShopifyProcessedAt'
)
BEGIN
    ALTER TABLE Orders 
    ADD ShopifyProcessedAt datetime2(7) NULL;
    
    PRINT '✅ ShopifyProcessedAt カラムを追加しました'
END
ELSE
BEGIN
    PRINT '⏸️ ShopifyProcessedAt カラムは既に存在するためスキップ'
END

GO

-- ============================================================================
-- ステップ 4: 既存データの ShopifyProcessedAt を ShopifyCreatedAt からコピー
-- ============================================================================
-- 注意: 既存データは processedAt が取得できていないため、
--       暫定的に ShopifyCreatedAt の値をコピーします。
--       再同期後は Shopify から正しい processed_at が取得されます。
-- ============================================================================
PRINT '=== Step 4: 既存データの ShopifyProcessedAt を暫定設定 ==='

-- 本番実行時はこのブロックのコメントを解除
/*
UPDATE Orders
SET ShopifyProcessedAt = ShopifyCreatedAt
WHERE ShopifyProcessedAt IS NULL 
  AND ShopifyCreatedAt IS NOT NULL;

DECLARE @UpdatedCount INT = @@ROWCOUNT;
PRINT CONCAT('✅ ', @UpdatedCount, ' 件の既存データに暫定値を設定しました');
*/

PRINT '⚠️ 既存データの暫定設定は手動で有効化してください（上記コメントを解除）'
PRINT '⚠️ または、データ再同期を実行して正しい processed_at を取得してください'

GO

-- ============================================================================
-- ステップ 5: 追加後の確認
-- ============================================================================
PRINT '=== Step 5: マイグレーション完了確認 ==='

SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Orders' 
  AND COLUMN_NAME IN ('ShopifyCreatedAt', 'ShopifyUpdatedAt', 'ShopifyProcessedAt')
ORDER BY ORDINAL_POSITION

GO

-- サンプルデータ確認（上位5件）
PRINT '=== サンプルデータ確認 ==='
SELECT TOP 5
    Id,
    OrderNumber,
    ShopifyCreatedAt,
    ShopifyUpdatedAt,
    ShopifyProcessedAt,
    CreatedAt
FROM Orders
ORDER BY Id DESC

GO

PRINT ''
PRINT '============================================================================'
PRINT '✅ マイグレーション完了: ShopifyProcessedAt カラム追加'
PRINT ''
PRINT '次のステップ:'
PRINT '1. 既存データを再同期して正しい processed_at を取得する'
PRINT '   または、Step 4 のコメントを解除して暫定値を設定する'
PRINT '2. database-migration-tracking.md を更新する'
PRINT '============================================================================'

GO
