-- デモストアデータ検証SQL
-- インポート後のデータ整合性を確認

-- ========================================
-- 1. ストアマスタの確認
-- ========================================
PRINT '=== ストアマスタ情報 ===';
SELECT 
    Id,
    Name,
    Domain,
    DataType,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM Stores
WHERE DataType = 'demo'
ORDER BY Id;

-- ========================================
-- 2. 各ストアのデータ件数サマリ
-- ========================================
PRINT '';
PRINT '=== データ件数サマリ ===';
SELECT 
    s.Id as StoreId,
    s.Name as StoreName,
    (SELECT COUNT(*) FROM Customers WHERE StoreId = s.Id) as Customers,
    (SELECT COUNT(*) FROM Products WHERE StoreId = s.Id) as Products,
    (SELECT COUNT(*) FROM ProductVariants pv INNER JOIN Products p ON pv.ProductId = p.Id WHERE p.StoreId = s.Id) as Variants,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = s.Id) as Orders,
    (SELECT COUNT(*) FROM OrderItems oi INNER JOIN Orders o ON oi.OrderId = o.Id WHERE o.StoreId = s.Id) as OrderItems
FROM Stores s
WHERE s.DataType = 'demo'
ORDER BY s.Id;

-- ========================================
-- 3. Store 2: 汎用テストストア検証
-- ========================================
PRINT '';
PRINT '=== Store 2: 汎用テストストア ===';

-- 期間別注文数
SELECT 
    YEAR(CreatedAt) as Year,
    COUNT(*) as OrderCount,
    SUM(TotalPrice) as TotalSales
FROM Orders
WHERE StoreId = 2
GROUP BY YEAR(CreatedAt)
ORDER BY Year;

-- ========================================
-- 4. Store 3: 北海道物産品ショップ検証
-- ========================================
PRINT '';
PRINT '=== Store 3: 北海道物産品ショップ ===';

-- 商品カテゴリ別集計
SELECT 
    ProductType,
    COUNT(DISTINCT p.Id) as ProductCount,
    COUNT(DISTINCT pv.Id) as VariantCount
FROM Products p
LEFT JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = 3
GROUP BY ProductType
ORDER BY ProductCount DESC;

-- 顧客セグメント分析
SELECT 
    CASE 
        WHEN TotalOrders >= 15 THEN 'VIP顧客'
        WHEN TotalOrders >= 5 THEN 'リピーター'
        ELSE '一般顧客'
    END as CustomerSegment,
    COUNT(*) as CustomerCount,
    AVG(TotalSpent) as AvgSpent
FROM Customers
WHERE StoreId = 3
GROUP BY 
    CASE 
        WHEN TotalOrders >= 15 THEN 'VIP顧客'
        WHEN TotalOrders >= 5 THEN 'リピーター'
        ELSE '一般顧客'
    END
ORDER BY 
    CASE CustomerSegment
        WHEN 'VIP顧客' THEN 1
        WHEN 'リピーター' THEN 2
        ELSE 3
    END;

-- ========================================
-- 5. Store 4: 早稲田メーヤウ検証
-- ========================================
PRINT '';
PRINT '=== Store 4: 早稲田メーヤウ ===';

-- 閉店前後の売上比較
SELECT 
    CASE 
        WHEN YEAR(CreatedAt) < 2018 THEN '閉店前 (2016-2017)'
        ELSE '復活後 (2018-2025)'
    END as Period,
    COUNT(*) as OrderCount,
    SUM(TotalPrice) as TotalSales,
    AVG(TotalPrice) as AvgOrderValue
FROM Orders
WHERE StoreId = 4
GROUP BY 
    CASE 
        WHEN YEAR(CreatedAt) < 2018 THEN '閉店前 (2016-2017)'
        ELSE '復活後 (2018-2025)'
    END;

-- 顧客タグ分析
SELECT 
    Tags,
    COUNT(*) as CustomerCount,
    AVG(TotalSpent) as AvgSpent,
    AVG(TotalOrders) as AvgOrders
FROM Customers
WHERE StoreId = 4
GROUP BY Tags
ORDER BY CustomerCount DESC;

-- ========================================
-- 6. データ整合性チェック
-- ========================================
PRINT '';
PRINT '=== データ整合性チェック ===';

-- OrderItemsに対応するOrderが存在するか
SELECT 
    s.Name as StoreName,
    COUNT(DISTINCT oi.Id) as OrphanOrderItems
FROM OrderItems oi
LEFT JOIN Orders o ON oi.OrderId = o.Id
INNER JOIN Stores s ON s.Id = 4  -- Store 4の例
WHERE o.Id IS NULL
GROUP BY s.Name;

-- CustomerのTotalOrdersが実際の注文数と一致するか
SELECT TOP 5
    c.Id,
    c.Email,
    c.TotalOrders as RecordedOrders,
    COUNT(DISTINCT o.Id) as ActualOrders,
    c.TotalOrders - COUNT(DISTINCT o.Id) as Difference
FROM Customers c
LEFT JOIN Orders o ON c.Id = o.CustomerId
WHERE c.StoreId = 4
GROUP BY c.Id, c.Email, c.TotalOrders
HAVING c.TotalOrders != COUNT(DISTINCT o.Id)
ORDER BY ABS(c.TotalOrders - COUNT(DISTINCT o.Id)) DESC;

-- ========================================
-- 7. 推奨アクション
-- ========================================
PRINT '';
PRINT '=== 推奨アクション ===';
PRINT '1. Customer.TotalOrdersの更新が必要な場合:';
PRINT '   EXEC UpdateCustomerTotals;';
PRINT '';
PRINT '2. 休眠顧客の分析:';
PRINT '   最終購入日から90日以上経過した顧客を特定';
PRINT '';
PRINT '3. 商品別売上分析:';
PRINT '   前年同月比画面で詳細確認';