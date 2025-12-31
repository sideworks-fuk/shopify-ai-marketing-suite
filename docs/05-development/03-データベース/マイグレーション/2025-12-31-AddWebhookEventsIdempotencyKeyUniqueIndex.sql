-- ============================================================
-- マイグレーション: WebhookEvents.IdempotencyKey ユニークインデックス追加
-- ============================================================
-- 作成日: 2025-12-31
-- 作成者: 福田 + AI Assistant
-- 目的: Webhook冪等性保証のためのユニーク制約追加
-- 影響: WebhookEventsテーブル（既存データに影響なし）
-- EF Migration: 20251230174658_AddWebhookEventsIdempotencyKeyIndex
-- 関連: GDPR Webhook対応
-- ============================================================

-- ============================================================
-- 前提条件の確認
-- ============================================================
-- WebhookEventsテーブルが存在すること
-- IdempotencyKeyカラムが存在すること（2025-08-25-FIX-AddIdempotencyKeyToWebhookEvents.sqlで追加済み）

-- ============================================================
-- 既存の重複データ確認（事前チェック）
-- ============================================================
/*
SELECT IdempotencyKey, COUNT(*) as DuplicateCount
FROM WebhookEvents
WHERE IdempotencyKey IS NOT NULL
GROUP BY IdempotencyKey
HAVING COUNT(*) > 1;

-- 重複がある場合は、手動で解決してからインデックスを作成する必要があります
*/

-- ============================================================
-- ユニークインデックス作成
-- ============================================================
-- フィルター付きユニークインデックス（NULLは重複を許可）
-- 同一のIdempotencyKeyを持つレコードが複数登録されることを防止

IF NOT EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'IX_WebhookEvents_IdempotencyKey' 
    AND object_id = OBJECT_ID('WebhookEvents')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_WebhookEvents_IdempotencyKey]
    ON [dbo].[WebhookEvents] ([IdempotencyKey])
    WHERE [IdempotencyKey] IS NOT NULL;
    
    PRINT 'Created unique index IX_WebhookEvents_IdempotencyKey on WebhookEvents table.';
END
ELSE
BEGIN
    PRINT 'Index IX_WebhookEvents_IdempotencyKey already exists. Skipping creation.';
END
GO

-- ============================================================
-- 確認クエリ
-- ============================================================
/*
-- インデックスの確認
SELECT 
    i.name AS IndexName,
    i.is_unique AS IsUnique,
    i.has_filter AS HasFilter,
    i.filter_definition AS FilterDefinition,
    c.name AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('WebhookEvents')
AND i.name = 'IX_WebhookEvents_IdempotencyKey';

-- 期待される結果:
-- IndexName: IX_WebhookEvents_IdempotencyKey
-- IsUnique: 1
-- HasFilter: 1
-- FilterDefinition: ([IdempotencyKey] IS NOT NULL)
-- ColumnName: IdempotencyKey
*/

-- ============================================================
-- ロールバック手順
-- ============================================================
/*
-- ロールバックが必要な場合:
DROP INDEX IF EXISTS [IX_WebhookEvents_IdempotencyKey] ON [dbo].[WebhookEvents];
*/
