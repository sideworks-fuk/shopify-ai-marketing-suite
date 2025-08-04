-- =============================================
-- 休眠顧客分析パフォーマンス改善 - データベースインデックス追加
-- 作成日: 2025-07-25
-- 目的: 休眠顧客分析のクエリ実行時間を50-70%削減
-- =============================================

-- 1. 最終注文日の高速検索用インデックス
-- 顧客IDと注文日の組み合わせで効率的な検索を可能にする
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice, ShippingPrice, TaxPrice)
WITH (ONLINE = ON);

-- 2. 休眠顧客の効率的なフィルタリング用インデックス
-- 日付範囲検索を高速化
CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt 
ON Orders(CreatedAt)
WHERE CreatedAt IS NOT NULL
WITH (ONLINE = ON);

-- 3. 顧客の店舗別検索最適化
-- 店舗IDと総購入金額での効率的な検索
CREATE NONCLUSTERED INDEX IX_Customers_StoreId_TotalSpent 
ON Customers(StoreId, TotalSpent DESC)
WHERE TotalSpent > 0
WITH (ONLINE = ON);

-- 4. 顧客の最終購入日検索用インデックス
-- 休眠判定の高速化
CREATE NONCLUSTERED INDEX IX_Customers_StoreId_LastPurchaseDate 
ON Customers(StoreId, LastPurchaseDate)
WHERE LastPurchaseDate IS NOT NULL
WITH (ONLINE = ON);

-- 5. 複合検索用インデックス
-- 店舗ID、休眠日数、リスクレベルの組み合わせ検索
CREATE NONCLUSTERED INDEX IX_Customers_StoreId_Dormancy_Risk 
ON Customers(StoreId, TotalOrders, TotalSpent)
INCLUDE (Name, Email, LastPurchaseDate)
WITH (ONLINE = ON);

-- =============================================
-- インデックス作成後の確認クエリ
-- =============================================

-- インデックス作成状況の確認
SELECT 
    i.name AS IndexName,
    t.name AS TableName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name IN ('Orders', 'Customers')
    AND i.name LIKE 'IX_%'
ORDER BY t.name, i.name;

-- インデックス使用状況の確認（実行計画の確認用）
-- 以下のクエリでインデックスが使用されているか確認
/*
SELECT 
    c.Id,
    c.Name,
    c.Email,
    c.TotalSpent,
    c.TotalOrders,
    MAX(o.CreatedAt) as LastPurchaseDate,
    DATEDIFF(DAY, MAX(o.CreatedAt), GETUTCDATE()) as DaysSinceLastPurchase
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
WHERE c.StoreId = 1
    AND (MAX(o.CreatedAt) < DATEADD(DAY, -90, GETUTCDATE()) OR MAX(o.CreatedAt) IS NULL)
GROUP BY c.Id, c.Name, c.Email, c.TotalSpent, c.TotalOrders
ORDER BY DaysSinceLastPurchase DESC;
*/

-- =============================================
-- パフォーマンス改善効果の測定用クエリ
-- =============================================

-- 休眠顧客数の高速カウント
SELECT 
    COUNT(*) as TotalDormantCustomers,
    COUNT(CASE WHEN DATEDIFF(DAY, LastPurchaseDate, GETUTCDATE()) BETWEEN 90 AND 180 THEN 1 END) as Segment_90_180,
    COUNT(CASE WHEN DATEDIFF(DAY, LastPurchaseDate, GETUTCDATE()) BETWEEN 181 AND 365 THEN 1 END) as Segment_180_365,
    COUNT(CASE WHEN DATEDIFF(DAY, LastPurchaseDate, GETUTCDATE()) > 365 THEN 1 END) as Segment_365_Plus
FROM (
    SELECT 
        c.Id,
        MAX(o.CreatedAt) as LastPurchaseDate
    FROM Customers c
    LEFT JOIN Orders o ON c.Id = o.CustomerId
    WHERE c.StoreId = 1
    GROUP BY c.Id
    HAVING MAX(o.CreatedAt) < DATEADD(DAY, -90, GETUTCDATE()) OR MAX(o.CreatedAt) IS NULL
) DormantCustomers;

-- =============================================
-- 注意事項
-- =============================================
-- 1. 本スクリプトはメンテナンス時間に実行することを推奨
-- 2. ONLINE = ON オプションにより、テーブルロックを最小限に抑制
-- 3. 大量データがある場合は、バッチ処理での実行を検討
-- 4. インデックス作成後は、クエリ実行計画の確認を推奨