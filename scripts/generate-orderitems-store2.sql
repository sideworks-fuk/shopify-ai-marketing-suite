-- Store 2のOrderItemsテーブルへのデータ生成SQL
-- anonymized-orders_store2_comprehensive.csv のデータ構造に基づいて作成

-- 既存のOrderItemsを確認
SELECT COUNT(*) as ExistingOrderItems FROM OrderItems WHERE OrderId IN (SELECT Id FROM Orders WHERE StoreId = 2);

-- OrderItemsを削除（再生成のため）
DELETE FROM OrderItems WHERE OrderId IN (SELECT Id FROM Orders WHERE StoreId = 2);

-- OrderItemsを生成
-- CSVのデータ構造に基づいて、各注文の商品明細を作成

-- 2020年の注文データ
INSERT INTO OrderItems (OrderId, ProductTitle, ProductVendor, Sku, Price, Quantity, TotalPrice, RequiresShipping, Taxable, CreatedAt, UpdatedAt)
SELECT o.Id, 'プレミアムギフトボックスセット S', 'ギフト工房', 'PRD-2001-S', 8000, 1, 8000, 1, 1, o.CreatedAt, o.UpdatedAt
FROM Orders o WHERE o.OrderNumber = 'ORD-2021' AND o.StoreId = 2;

INSERT INTO OrderItems (OrderId, ProductTitle, ProductVendor, Sku, Price, Quantity, TotalPrice, RequiresShipping, Taxable, CreatedAt, UpdatedAt)
SELECT o.Id, 'ラグジュアリーアイテム プラチナ', '高級工房', 'PRD-2004-PL', 35000, 1, 35000, 1, 1, o.CreatedAt, o.UpdatedAt
FROM Orders o WHERE o.OrderNumber = 'ORD-2022' AND o.StoreId = 2;

INSERT INTO OrderItems (OrderId, ProductTitle, ProductVendor, Sku, Price, Quantity, TotalPrice, RequiresShipping, Taxable, CreatedAt, UpdatedAt)
SELECT o.Id, 'プレミアムギフトボックスセット L', 'ギフト工房', 'PRD-2001-L', 15000, 3, 45000, 1, 1, o.CreatedAt, o.UpdatedAt
FROM Orders o WHERE o.OrderNumber = 'ORD-2023' AND o.StoreId = 2;

INSERT INTO OrderItems (OrderId, ProductTitle, ProductVendor, Sku, Price, Quantity, TotalPrice, RequiresShipping, Taxable, CreatedAt, UpdatedAt)
SELECT o.Id, 'プレミアムギフトボックスセット S', 'ギフト工房', 'PRD-2001-S', 8000, 3, 24000, 1, 1, o.CreatedAt, o.UpdatedAt
FROM Orders o WHERE o.OrderNumber = 'ORD-2024' AND o.StoreId = 2;

INSERT INTO OrderItems (OrderId, ProductTitle, ProductVendor, Sku, Price, Quantity, TotalPrice, RequiresShipping, Taxable, CreatedAt, UpdatedAt)
SELECT o.Id, 'ラグジュアリーアイテム ゴールド', '高級工房', 'PRD-2004-GO', 25000, 3, 75000, 1, 1, o.CreatedAt, o.UpdatedAt
FROM Orders o WHERE o.OrderNumber = 'ORD-2025' AND o.StoreId = 2;

-- 一般的なパターンで残りの注文を処理
-- 主要商品リスト（CSVから抜粋）
DECLARE @ProductList TABLE (
    ProductTitle NVARCHAR(255),
    ProductVendor NVARCHAR(100),
    Sku NVARCHAR(100),
    Price DECIMAL(18,2)
);

INSERT INTO @ProductList VALUES
('プレミアムギフトボックスセット S', 'ギフト工房', 'PRD-2001-S', 8000),
('プレミアムギフトボックスセット M', 'ギフト工房', 'PRD-2001-M', 12000),
('プレミアムギフトボックスセット L', 'ギフト工房', 'PRD-2001-L', 15000),
('アクセサリーコレクション ベーシック', 'アクセサリー店', 'PRD-2002-B', 5000),
('アクセサリーコレクション シルバー', 'アクセサリー店', 'PRD-2002-S', 8000),
('アクセサリーコレクション ゴールド', 'アクセサリー店', 'PRD-2002-G', 12000),
('オーガニック食品セット S', 'オーガニックショップ', 'PRD-2003-S', 3000),
('オーガニック食品セット M', 'オーガニックショップ', 'PRD-2003-M', 5000),
('オーガニック食品セット L', 'オーガニックショップ', 'PRD-2003-L', 8000),
('ラグジュアリーアイテム シルバー', '高級工房', 'PRD-2004-SI', 20000),
('ラグジュアリーアイテム ゴールド', '高級工房', 'PRD-2004-GO', 25000),
('ラグジュアリーアイテム プラチナ', '高級工房', 'PRD-2004-PL', 35000),
('エコ雑貨セット A', 'エコショップ', 'PRD-2005-A', 2000),
('エコ雑貨セット B', 'エコショップ', 'PRD-2005-B', 3500),
('エコ雑貨セット C', 'エコショップ', 'PRD-2005-C', 5000);

-- 各注文に対して商品明細を生成（金額が合うように調整）
-- 注: 実際のCSVデータに基づいて手動で調整が必要
-- 以下は簡易的な例

-- OrderItemsが存在しない注文に対してデフォルト商品を割り当て
INSERT INTO OrderItems (OrderId, ProductTitle, ProductVendor, Sku, Price, Quantity, TotalPrice, RequiresShipping, Taxable, CreatedAt, UpdatedAt)
SELECT 
    o.Id,
    CASE 
        WHEN o.SubtotalPrice >= 30000 THEN 'ラグジュアリーアイテム プラチナ'
        WHEN o.SubtotalPrice >= 20000 THEN 'ラグジュアリーアイテム ゴールド'
        WHEN o.SubtotalPrice >= 15000 THEN 'プレミアムギフトボックスセット L'
        WHEN o.SubtotalPrice >= 10000 THEN 'プレミアムギフトボックスセット M'
        WHEN o.SubtotalPrice >= 5000 THEN 'プレミアムギフトボックスセット S'
        ELSE 'エコ雑貨セット A'
    END as ProductTitle,
    CASE 
        WHEN o.SubtotalPrice >= 20000 THEN '高級工房'
        WHEN o.SubtotalPrice >= 5000 THEN 'ギフト工房'
        ELSE 'エコショップ'
    END as ProductVendor,
    CASE 
        WHEN o.SubtotalPrice >= 30000 THEN 'PRD-2004-PL'
        WHEN o.SubtotalPrice >= 20000 THEN 'PRD-2004-GO'
        WHEN o.SubtotalPrice >= 15000 THEN 'PRD-2001-L'
        WHEN o.SubtotalPrice >= 10000 THEN 'PRD-2001-M'
        WHEN o.SubtotalPrice >= 5000 THEN 'PRD-2001-S'
        ELSE 'PRD-2005-A'
    END as Sku,
    o.SubtotalPrice as Price,
    1 as Quantity,
    o.SubtotalPrice as TotalPrice,
    1 as RequiresShipping,
    1 as Taxable,
    o.CreatedAt,
    o.UpdatedAt
FROM Orders o
WHERE o.StoreId = 2
  AND NOT EXISTS (SELECT 1 FROM OrderItems oi WHERE oi.OrderId = o.Id);

-- 結果確認
SELECT COUNT(*) as TotalOrderItems FROM OrderItems WHERE OrderId IN (SELECT Id FROM Orders WHERE StoreId = 2);

-- 前年同月比分析が動作するか確認
SELECT 
    YEAR(o.CreatedAt) as Year,
    MONTH(o.CreatedAt) as Month,
    oi.ProductTitle,
    SUM(oi.TotalPrice) as TotalSales,
    COUNT(DISTINCT o.Id) as OrderCount,
    SUM(oi.Quantity) as TotalQuantity
FROM Orders o
INNER JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.StoreId = 2
  AND YEAR(o.CreatedAt) IN (2024, 2025)
GROUP BY 
    YEAR(o.CreatedAt),
    MONTH(o.CreatedAt),
    oi.ProductTitle
ORDER BY Year, Month, ProductTitle;