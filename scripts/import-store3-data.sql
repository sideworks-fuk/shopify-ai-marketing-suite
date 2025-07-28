-- Store 3（北海道物産品ストア）のマスタデータ登録SQL

-- 1. Storesテーブルに登録
INSERT INTO Stores (Id, Name, Domain, ShopifyShopId, Description, DataType, IsActive, Settings, CreatedAt, UpdatedAt)
VALUES (
    3,
    '北海道物産品ショップ',
    'hokkaido-bussan.myshopify.com',
    'hokkaido-bussan-shop',
    '北海道の新鮮な海産物、農産物、乳製品、スイーツなど名産品を全国にお届けする通販サイト',
    'demo',
    1,
    '{"theme": "hokkaido", "shipping_free_threshold": 10000, "points_rate": 0.01}',
    GETDATE(),
    GETDATE()
);

-- 2. インポート手順
/*
以下のコマンドをShopifyDataAnonymizerディレクトリで実行：

1. 顧客データのインポート
dotnet run -- import --input "../data/staging/store3_hokkaido/customers_store3_hokkaido.csv" --store-id 3 --type customers

2. 商品データのインポート（バリアント対応）
dotnet run -- import --input "../data/staging/store3_hokkaido/products_store3_hokkaido.csv" --store-id 3 --type products-variants

3. 注文データのインポート
dotnet run -- import --input "../data/staging/store3_hokkaido/orders_store3_hokkaido.csv" --store-id 3 --type orders
*/

-- 3. インポート後の確認クエリ
-- 顧客数確認
SELECT COUNT(*) as CustomerCount FROM Customers WHERE StoreId = 3;

-- 顧客セグメント別集計
SELECT 
    CustomerSegment,
    COUNT(*) as Count,
    AVG(TotalSpent) as AvgSpent,
    AVG(TotalOrders) as AvgOrders
FROM Customers 
WHERE StoreId = 3
GROUP BY CustomerSegment
ORDER BY Count DESC;

-- 商品カテゴリ別集計
SELECT 
    ProductType,
    COUNT(*) as ProductCount,
    AVG(CAST(pv.Price as DECIMAL(18,2))) as AvgPrice
FROM Products p
INNER JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = 3
GROUP BY ProductType
ORDER BY ProductCount DESC;

-- 月別売上推移（2024年と2025年の比較用）
SELECT 
    YEAR(o.CreatedAt) as Year,
    MONTH(o.CreatedAt) as Month,
    COUNT(DISTINCT o.Id) as OrderCount,
    SUM(o.TotalPrice) as TotalSales
FROM Orders o
WHERE o.StoreId = 3
  AND YEAR(o.CreatedAt) IN (2024, 2025)
GROUP BY YEAR(o.CreatedAt), MONTH(o.CreatedAt)
ORDER BY Year, Month;

-- 人気商品TOP10
SELECT TOP 10
    oi.ProductTitle,
    COUNT(DISTINCT oi.OrderId) as OrderCount,
    SUM(oi.Quantity) as TotalQuantity,
    SUM(oi.TotalPrice) as TotalSales
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 3
  AND o.CreatedAt >= DATEADD(MONTH, -6, GETDATE())
GROUP BY oi.ProductTitle
ORDER BY TotalSales DESC;

-- 地域別顧客分布
SELECT 
    CASE 
        WHEN c.ProvinceCode = 'JP-01' THEN '北海道内'
        ELSE '北海道外'
    END as Region,
    COUNT(*) as CustomerCount,
    AVG(c.TotalSpent) as AvgSpent
FROM Customers c
WHERE c.StoreId = 3
GROUP BY 
    CASE 
        WHEN c.ProvinceCode = 'JP-01' THEN '北海道内'
        ELSE '北海道外'
    END;