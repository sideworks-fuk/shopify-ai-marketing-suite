-- Customer.TotalOrdersとTotalSpentをOrdersテーブルから集計して更新するスクリプト
-- Store 2のデータが正しく分析できるようにするため

-- 1. まず現在の状態を確認
SELECT 
    StoreId,
    COUNT(*) as CustomerCount,
    SUM(CASE WHEN TotalOrders > 0 THEN 1 ELSE 0 END) as CustomersWithOrders,
    AVG(TotalOrders) as AvgOrders,
    AVG(TotalSpent) as AvgSpent
FROM Customers
GROUP BY StoreId;

-- 2. CustomersテーブルのTotalOrdersとTotalSpentを更新
UPDATE c
SET 
    c.TotalOrders = ISNULL(o.OrderCount, 0),
    c.TotalSpent = ISNULL(o.TotalAmount, 0),
    c.UpdatedAt = GETUTCDATE()
FROM Customers c
LEFT JOIN (
    SELECT 
        CustomerId,
        COUNT(*) as OrderCount,
        SUM(TotalPrice) as TotalAmount
    FROM Orders
    GROUP BY CustomerId
) o ON c.Id = o.CustomerId;

-- 3. 更新後の状態を確認
SELECT 
    StoreId,
    COUNT(*) as CustomerCount,
    SUM(CASE WHEN TotalOrders > 0 THEN 1 ELSE 0 END) as CustomersWithOrders,
    AVG(TotalOrders) as AvgOrders,
    AVG(TotalSpent) as AvgSpent
FROM Customers
GROUP BY StoreId;

-- 4. Store 2の顧客で注文のある人の詳細確認
SELECT TOP 10
    c.Id,
    c.FirstName,
    c.LastName,
    c.TotalOrders,
    c.TotalSpent,
    (SELECT MAX(CreatedAt) FROM Orders WHERE CustomerId = c.Id) as LastOrderDate,
    DATEDIFF(day, (SELECT MAX(CreatedAt) FROM Orders WHERE CustomerId = c.Id), GETUTCDATE()) as DaysSinceLastOrder
FROM Customers c
WHERE c.StoreId = 2 AND c.TotalOrders > 0
ORDER BY c.TotalOrders DESC;

-- 5. 休眠顧客の確認（90日以上注文なし）
WITH CustomerLastOrder AS (
    SELECT 
        c.Id,
        c.StoreId,
        c.FirstName + ' ' + c.LastName as CustomerName,
        c.TotalOrders,
        c.TotalSpent,
        MAX(o.CreatedAt) as LastOrderDate
    FROM Customers c
    LEFT JOIN Orders o ON c.Id = o.CustomerId
    WHERE c.TotalOrders > 0
    GROUP BY c.Id, c.StoreId, c.FirstName, c.LastName, c.TotalOrders, c.TotalSpent
)
SELECT 
    StoreId,
    COUNT(*) as DormantCustomerCount
FROM CustomerLastOrder
WHERE DATEDIFF(day, LastOrderDate, GETUTCDATE()) >= 90
GROUP BY StoreId;

-- 6. CustomerSegmentも更新（オプション）
UPDATE Customers
SET CustomerSegment = 
    CASE 
        WHEN TotalOrders >= 10 OR TotalSpent >= 100000 THEN 'VIP顧客'
        WHEN TotalOrders >= 2 THEN 'リピーター'
        ELSE '新規顧客'
    END
WHERE StoreId IN (1, 2);

PRINT '✅ Customer.TotalOrdersとTotalSpentの更新が完了しました';