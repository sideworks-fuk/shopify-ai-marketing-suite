-- 休眠顧客分析画面パフォーマンス改善用インデックス
-- 作成日: 2025年7月27日
-- 作成者: TAKASHI (AI Assistant)
-- 目的: 365日以上セグメントのフリーズ問題解決

-- 1. 休眠顧客分析専用インデックス
-- 顧客ごとの最新注文を効率的に取得
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice, FinancialStatus, Status)
WITH (ONLINE = ON, MAXDOP = 4);

-- 2. 顧客検索最適化インデックス
-- StoreIdとCreatedAtでの絞り込みを高速化
CREATE NONCLUSTERED INDEX IX_Customers_CreatedAt_StoreId
ON Customers(CreatedAt, StoreId) 
INCLUDE (Email, FirstName, LastName, TotalSpent, TotalOrders)
WITH (ONLINE = ON, MAXDOP = 4);

-- 3. 注文日でのフィルタリング用インデックス
-- 期間指定での注文検索を最適化
CREATE NONCLUSTERED INDEX IX_Orders_StoreId_CreatedAt
ON Orders(StoreId, CreatedAt)
INCLUDE (CustomerId, TotalPrice)
WITH (ONLINE = ON, MAXDOP = 4);

-- 4. 統計情報の更新
-- クエリオプティマイザが最適な実行計画を選択できるように
UPDATE STATISTICS Orders WITH FULLSCAN;
UPDATE STATISTICS Customers WITH FULLSCAN;
UPDATE STATISTICS OrderItems WITH FULLSCAN;

-- パフォーマンステスト用のクエリ
/*
-- 実行前に以下のクエリで現在のパフォーマンスを測定
SET STATISTICS TIME ON;
SET STATISTICS IO ON;

-- 365日以上購入していない顧客の取得（改善前）
SELECT 
    c.Id,
    c.FirstName + ' ' + c.LastName as Name,
    c.Email,
    c.TotalSpent,
    c.TotalOrders,
    MAX(o.CreatedAt) as LastOrderDate,
    DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) as DaysSinceLastOrder
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
WHERE c.StoreId = 1
GROUP BY c.Id, c.FirstName, c.LastName, c.Email, c.TotalSpent, c.TotalOrders
HAVING DATEDIFF(day, MAX(o.CreatedAt), GETDATE()) >= 365
ORDER BY c.TotalSpent DESC;

SET STATISTICS TIME OFF;
SET STATISTICS IO OFF;
*/