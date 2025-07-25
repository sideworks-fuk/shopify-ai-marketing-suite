-- Orderインポート結果確認用SQL
-- 実行方法: Azure SQL Databaseで実行

-- 1. 基本統計
SELECT 
    'Orders' as TableName,
    COUNT(*) as TotalRecords,
    COUNT(DISTINCT OrderNumber) as UniqueOrders,
    MIN(CreatedAt) as EarliestOrder,
    MAX(CreatedAt) as LatestOrder
FROM Orders 
WHERE StoreId = 1

UNION ALL

SELECT 
    'OrderItems' as TableName,
    COUNT(*) as TotalRecords,
    COUNT(DISTINCT OrderId) as OrdersWithItems,
    MIN(CreatedAt) as EarliestItem,
    MAX(CreatedAt) as LatestItem
FROM OrderItems 
WHERE OrderId IN (SELECT Id FROM Orders WHERE StoreId = 1);

-- 2. 注文サマリー（最新10件）
SELECT TOP 10
    o.Id,
    o.OrderNumber,
    o.TotalPrice,
    o.Status,
    o.CreatedAt,
    COUNT(oi.Id) as ItemCount,
    SUM(oi.TotalPrice) as ItemsTotal
FROM Orders o
LEFT JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.StoreId = 1
GROUP BY o.Id, o.OrderNumber, o.TotalPrice, o.Status, o.CreatedAt
ORDER BY o.CreatedAt DESC;

-- 3. 商品別売上サマリー
SELECT TOP 10
    oi.ProductTitle,
    oi.Sku,
    COUNT(*) as OrderCount,
    SUM(oi.Quantity) as TotalQuantity,
    SUM(oi.TotalPrice) as TotalRevenue,
    AVG(oi.Price) as AvgPrice
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 1
GROUP BY oi.ProductTitle, oi.Sku
ORDER BY TotalRevenue DESC;

-- 4. 注文ステータス別集計
SELECT 
    Status,
    COUNT(*) as OrderCount,
    SUM(TotalPrice) as TotalRevenue,
    AVG(TotalPrice) as AvgOrderValue
FROM Orders 
WHERE StoreId = 1
GROUP BY Status
ORDER BY OrderCount DESC;

-- 5. 日別売上サマリー
SELECT 
    CAST(CreatedAt AS DATE) as OrderDate,
    COUNT(*) as OrderCount,
    SUM(TotalPrice) as DailyRevenue,
    AVG(TotalPrice) as AvgOrderValue
FROM Orders 
WHERE StoreId = 1
GROUP BY CAST(CreatedAt AS DATE)
ORDER BY OrderDate DESC;

-- 6. 注文明細の詳細確認（最新5件）
SELECT TOP 5
    o.OrderNumber,
    oi.ProductTitle,
    oi.Sku,
    oi.Quantity,
    oi.Price,
    oi.TotalPrice,
    oi.VariantTitle,
    oi.CreatedAt
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 1
ORDER BY oi.CreatedAt DESC;

-- 7. 顧客別注文数
SELECT TOP 10
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.Email,
    COUNT(o.Id) as OrderCount,
    SUM(o.TotalPrice) as TotalSpent
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id
WHERE o.StoreId = 1
GROUP BY c.FirstName, c.LastName, c.Email
ORDER BY TotalSpent DESC; 