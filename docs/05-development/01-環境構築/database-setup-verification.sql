-- 本番データベース構築確認用SQL
-- 実行日: 2025-12-22
-- 実行者: 福田

-- ========================================
-- 1. テーブル数の確認
-- ========================================
SELECT 
    s.name AS SchemaName,
    COUNT(*) AS TableCount
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
GROUP BY s.name
ORDER BY s.name;
-- 期待値: dbo: 約23-25テーブル, HangFire: 10テーブル

-- ========================================
-- 2. 主要ビジネステーブルの確認
-- ========================================
SELECT 
    t.name AS TableName,
    p.rows AS RecordCount,
    t.create_date,
    t.modify_date
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0,1)
  AND t.schema_id = SCHEMA_ID('dbo')
  AND t.name IN (
    'Stores', 
    'Customers', 
    'Orders', 
    'Products', 
    'OrderItems',
    'ProductVariants',
    'DemoSessions',
    'AuthenticationLogs',
    'Tenants',
    'WebhookEvents',
    'SyncStatuses'
  )
ORDER BY t.name;

-- ========================================
-- 3. 不要なテーブルが存在しないことの確認
-- ========================================
SELECT name FROM sys.tables 
WHERE name IN ('Orders_Backup_20251218', 'TestTable');
-- 期待値: 0件（存在しないこと）

-- ========================================
-- 4. ストアドプロシージャの確認
-- ========================================
SELECT 
    name AS ProcedureName,
    create_date,
    modify_date
FROM sys.procedures
WHERE schema_id = SCHEMA_ID('dbo')
ORDER BY name;
-- 期待値:
-- sp_GetCurrentFeatureSelection
-- sp_GetFeatureSelectionStatus
-- sp_UpdateFeatureSelection

-- ========================================
-- 5. インデックスの統計
-- ========================================
SELECT 
    s.name AS SchemaName,
    COUNT(DISTINCT t.name) AS TablesWithIndexes,
    COUNT(i.name) AS TotalIndexes
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE i.type > 0  -- 0はヒープなので除外
GROUP BY s.name
ORDER BY s.name;

-- ========================================
-- 6. 外部キー制約の確認
-- ========================================
SELECT 
    fk.name AS ForeignKeyName,
    tp.name AS ParentTable,
    tr.name AS ReferencedTable
FROM sys.foreign_keys fk
JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
WHERE tp.schema_id = SCHEMA_ID('dbo')
ORDER BY tp.name, fk.name;

-- ========================================
-- 7. デフォルトテナントの確認
-- ========================================
SELECT * FROM Tenants WHERE Id = 'default-tenant';
-- 期待値: 1件存在すること

-- ========================================
-- 8. EFマイグレーション履歴テーブルの確認
-- ========================================
SELECT name FROM sys.tables WHERE name = '__EFMigrationsHistory';
-- 期待値: 存在すること

-- ========================================
-- 9. HangFireスキーマの確認
-- ========================================
SELECT * FROM sys.schemas WHERE name = 'HangFire';
-- 期待値: 存在すること

SELECT 
    t.name AS TableName
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'HangFire'
ORDER BY t.name;
-- 期待値: 10テーブル

-- ========================================
-- 10. データベース全体のオブジェクト数サマリー
-- ========================================
SELECT 
    'Tables' AS ObjectType, 
    COUNT(*) AS Count 
FROM sys.tables
WHERE schema_id IN (SCHEMA_ID('dbo'), SCHEMA_ID('HangFire'))
UNION ALL
SELECT 
    'Indexes' AS ObjectType, 
    COUNT(*) AS Count 
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.type > 0
UNION ALL
SELECT 
    'Foreign Keys' AS ObjectType, 
    COUNT(*) AS Count 
FROM sys.foreign_keys
UNION ALL
SELECT 
    'Stored Procedures' AS ObjectType, 
    COUNT(*) AS Count 
FROM sys.procedures
WHERE schema_id = SCHEMA_ID('dbo')
UNION ALL
SELECT 
    'Schemas' AS ObjectType, 
    COUNT(*) AS Count 
FROM sys.schemas
WHERE name IN ('dbo', 'HangFire')
ORDER BY ObjectType;
