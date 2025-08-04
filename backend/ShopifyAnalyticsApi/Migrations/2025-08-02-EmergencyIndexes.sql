-- 2025-08-02 緊急インデックス追加
-- OrderItemsテーブルのパフォーマンス改善

-- OrderItemsテーブルの基本インデックス
CREATE INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
CREATE INDEX IX_OrderItems_ProductTitle ON OrderItems(ProductTitle);
CREATE INDEX IX_OrderItems_CreatedAt ON OrderItems(CreatedAt);

-- 複合インデックス（パフォーマンス最適化）
CREATE INDEX IX_OrderItems_OrderId_CreatedAt ON OrderItems(OrderId, CreatedAt);

-- 統計情報の更新
UPDATE STATISTICS OrderItems;

-- インデックスの確認
SELECT 
    i.name AS IndexName,
    OBJECT_NAME(i.object_id) AS TableName,
    i.type_desc,
    i.is_unique,
    i.is_primary_key
FROM sys.indexes i
WHERE OBJECT_NAME(i.object_id) = 'OrderItems'
AND i.type > 0
ORDER BY i.name;