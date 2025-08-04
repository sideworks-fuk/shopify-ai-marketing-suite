-- Investigation: Why only 6 products are showing in year-over-year analysis

-- 1. Count total distinct products in the database
SELECT COUNT(DISTINCT Id) as TotalProducts, 
       COUNT(DISTINCT ProductType) as TotalProductTypes,
       COUNT(DISTINCT Vendor) as TotalVendors
FROM Products
WHERE StoreId = 1;

-- 2. Count distinct products in OrderItems
SELECT COUNT(DISTINCT ProductTitle) as DistinctProductTitles,
       COUNT(DISTINCT ProductType) as DistinctProductTypes,
       COUNT(DISTINCT ProductVendor) as DistinctVendors
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 1;

-- 3. Check products with orders in 2024 and 2025
SELECT COUNT(DISTINCT oi.ProductTitle) as ProductsWithOrders
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 1
  AND o.CreatedAt >= '2024-01-01'
  AND o.CreatedAt < '2026-01-01';

-- 4. List the actual products with order counts
SELECT TOP 20
    oi.ProductTitle,
    oi.ProductType,
    oi.ProductVendor,
    COUNT(DISTINCT CASE WHEN YEAR(o.CreatedAt) = 2024 THEN o.Id END) as Orders2024,
    COUNT(DISTINCT CASE WHEN YEAR(o.CreatedAt) = 2025 THEN o.Id END) as Orders2025,
    SUM(CASE WHEN YEAR(o.CreatedAt) = 2024 THEN oi.TotalPrice ELSE 0 END) as Sales2024,
    SUM(CASE WHEN YEAR(o.CreatedAt) = 2025 THEN oi.TotalPrice ELSE 0 END) as Sales2025
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 1
  AND o.CreatedAt >= '2024-01-01'
  AND o.CreatedAt < '2026-01-01'
GROUP BY oi.ProductTitle, oi.ProductType, oi.ProductVendor
ORDER BY SUM(oi.TotalPrice) DESC;

-- 5. Check if service items are being excluded
SELECT COUNT(DISTINCT oi.ProductTitle) as ServiceItemCount
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 1
  AND (
    oi.ProductTitle LIKE '%代引き手数料%'
    OR oi.ProductTitle LIKE '%送料%'
    OR oi.ProductTitle LIKE '%手数料%'
    OR oi.ProductTitle LIKE '%サービス料%'
    OR oi.ProductTitle LIKE '%配送料%'
    OR oi.ProductTitle LIKE '%決済手数料%'
    OR oi.ProductTitle LIKE '%包装料%'
  );

-- 6. Debug: Show the exact query that would be used by the API
SELECT 
    oi.ProductTitle,
    oi.ProductType,
    oi.ProductVendor,
    o.CreatedAt,
    YEAR(o.CreatedAt) as Year,
    MONTH(o.CreatedAt) as Month,
    oi.TotalPrice,
    oi.Quantity
FROM OrderItems oi
INNER JOIN Orders o ON oi.OrderId = o.Id
WHERE o.StoreId = 1
  AND (YEAR(o.CreatedAt) = 2025 OR YEAR(o.CreatedAt) = 2024)
  AND MONTH(o.CreatedAt) >= 1
  AND MONTH(o.CreatedAt) <= 12
ORDER BY oi.ProductTitle, o.CreatedAt;