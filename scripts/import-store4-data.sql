-- Store 4（早稲田メーヤウ）のマスタデータ登録SQL

-- 1. Storesテーブルに登録
INSERT INTO Stores (Name, Domain, ShopifyShopId, Description, DataType, IsActive, Settings, CreatedAt, UpdatedAt)
VALUES (
    '早稲田メーヤウ',
    'maeyao.myshopify.com',
    'maeyao-curry-shop',
    '激辛だけどクセになる！早稲田の老舗カレー店のオンラインショップ。2017年閉店後、2018年に復活',
    'demo',
    1,
    '{"theme": "curry", "shipping_free_threshold": 13000, "points_rate": 0.01, "spice_levels": ["★☆☆☆☆", "★★☆☆☆", "★★★☆☆", "★★★★☆", "★★★★★"]}',
    GETDATE(),
    GETDATE()
);

-- 2. インポート手順
/*
以下のコマンドをShopifyDataAnonymizerディレクトリで実行：

```bash
# 顧客データ
dotnet run -- import --input "../../data/staging/store4_maeyao/customers_store4_maeyao.csv" --store-id 4 --type customers

# 商品データ
dotnet run -- import --input "../../data/staging/store4_maeyao/products_store4_maeyao.csv" --store-id 4 --type products-variants

# 注文データ
dotnet run -- import --input "../../data/staging/store4_maeyao/orders_store4_maeyao.csv" --store-id 4 --type orders
```
*/

-- 3. インポート後の確認クエリ
-- 顧客数確認
SELECT COUNT(*) as CustomerCount FROM Customers WHERE StoreId = 4;

-- 顧客タイプ別集計
SELECT 
    Tags,
    COUNT(*) as Count,
    AVG(TotalSpent) as AvgSpent,
    AVG(TotalOrders) as AvgOrders
FROM Customers 
WHERE StoreId = 4
GROUP BY Tags
ORDER BY Count DESC;

-- 商品カテゴリ別集計
SELECT 
    ProductType,
    COUNT(*) as ProductCount,
    AVG(CAST(pv.Price as DECIMAL(18,2))) as AvgPrice
FROM Products p
INNER JOIN ProductVariants pv ON p.Id = pv.ProductId
WHERE p.StoreId = 4
GROUP BY ProductType
ORDER BY ProductCount DESC;

-- 月別売上推移（閉店前と復活後の比較）
SELECT 
    CASE 
        WHEN YEAR(o.CreatedAt) < 2018 THEN '閉店前'
        ELSE '復活後'
    END as Period,
    YEAR(o.CreatedAt) as Year,
    MONTH(o.CreatedAt) as Month,
    COUNT(DISTINCT o.Id) as OrderCount,
    SUM(o.TotalPrice) as TotalSales
FROM Orders o
WHERE o.StoreId = 4
GROUP BY 
    CASE 
        WHEN YEAR(o.CreatedAt) < 2018 THEN '閉店前'
        ELSE '復活後'
    END,
    YEAR(o.CreatedAt), 
    MONTH(o.CreatedAt)
ORDER BY Year, Month;

-- 辛さレベル別売上分析
SELECT 
    oi.Notes as SpiceLevel,
    COUNT(DISTINCT oi.OrderId) as OrderCount,
    SUM(oi.Quantity) as TotalQuantity,
    SUM(oi.TotalPrice) as TotalSales
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 4
  AND oi.Notes LIKE '辛さレベル%'
GROUP BY oi.Notes
ORDER BY 
    CASE 
        WHEN oi.Notes = '辛さレベル1' THEN 1
        WHEN oi.Notes = '辛さレベル2' THEN 2
        WHEN oi.Notes = '辛さレベル3' THEN 3
        WHEN oi.Notes = '辛さレベル4' THEN 4
        WHEN oi.Notes = '辛さレベル5' THEN 5
        ELSE 6
    END;

-- サブスクリプション商品の売上推移
SELECT 
    YEAR(o.CreatedAt) as Year,
    MONTH(o.CreatedAt) as Month,
    COUNT(DISTINCT o.Id) as SubscriptionOrders,
    SUM(oi.TotalPrice) as SubscriptionSales
FROM Orders o
INNER JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.StoreId = 4
  AND oi.ProductTitle LIKE '%定期便%'
GROUP BY YEAR(o.CreatedAt), MONTH(o.CreatedAt)
ORDER BY Year, Month;

-- 地域別顧客分布（早稲田周辺 vs その他）
SELECT 
    CASE 
        WHEN c.City IN ('高田馬場', '早稲田', '茗荷谷', '池袋') THEN '早稲田周辺'
        ELSE 'その他地域'
    END as Region,
    COUNT(*) as CustomerCount,
    AVG(c.TotalSpent) as AvgSpent,
    SUM(c.TotalOrders) as TotalOrders
FROM Customers c
WHERE c.StoreId = 4
GROUP BY 
    CASE 
        WHEN c.City IN ('高田馬場', '早稲田', '茗荷谷', '池袋') THEN '早稲田周辺'
        ELSE 'その他地域'
    END;