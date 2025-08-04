-- 作成日: 2025-08-02
-- 作成者: TAKASHI
-- 目的: OrderItemsテーブルのパフォーマンス改善
-- 影響: 年次分析、購入回数分析のクエリ高速化（最大90%の改善見込み）
-- 
-- 注意事項:
-- 1. 大量データがある場合、インデックス作成に時間がかかる可能性があります
-- 2. 作成中は一時的にテーブルへの書き込みがブロックされる可能性があります

-- OrderItemsテーブルの単一カラムインデックス
CREATE INDEX IX_OrderItems_OrderId 
ON OrderItems(OrderId);

CREATE INDEX IX_OrderItems_ProductTitle 
ON OrderItems(ProductTitle);

CREATE INDEX IX_OrderItems_CreatedAt 
ON OrderItems(CreatedAt);

-- 複合インデックス（パフォーマンス最適化）
CREATE INDEX IX_OrderItems_OrderId_CreatedAt 
ON OrderItems(OrderId, CreatedAt);

-- 実行後の確認クエリ
-- SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('OrderItems');