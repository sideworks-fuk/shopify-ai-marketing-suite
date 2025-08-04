-- 全デモストアマスタデータ一括登録SQL
-- 実行前に既存データの確認を推奨

-- 現在のストアデータを確認
SELECT * FROM Stores ORDER BY Id;

-- 既存のデモストアを削除する場合（慎重に実行）
-- DELETE FROM Stores WHERE DataType = 'demo' AND Id IN (2, 3, 4);

-- Store 2: 汎用テストストア
IF NOT EXISTS (SELECT 1 FROM Stores WHERE Id = 2)
BEGIN
    INSERT INTO Stores (
        Id, 
        Name, 
        Domain, 
        ShopifyShopId, 
        Description, 
        DataType, 
        IsActive, 
        Settings, 
        CreatedAt, 
        UpdatedAt
    )
    VALUES (
        2,
        'テストストア２',
        'test-store-2.myshopify.com',
        'test-store-2',
        '2020年から2025年までの長期間データを含む汎用テストストア',
        'demo',
        1,
        '{"theme": "default", "shipping_free_threshold": 5000, "points_rate": 0.01}',
        GETDATE(),
        GETDATE()
    );
    PRINT 'Store 2を登録しました';
END
ELSE
BEGIN
    PRINT 'Store 2は既に存在します';
END

-- Store 3: 北海道物産品ショップ
IF NOT EXISTS (SELECT 1 FROM Stores WHERE Id = 3)
BEGIN
    INSERT INTO Stores (
        Id, 
        Name, 
        Domain, 
        ShopifyShopId, 
        Description, 
        DataType, 
        IsActive, 
        Settings, 
        CreatedAt, 
        UpdatedAt
    )
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
    PRINT 'Store 3を登録しました';
END
ELSE
BEGIN
    PRINT 'Store 3は既に存在します';
END

-- Store 4: 早稲田メーヤウ
IF NOT EXISTS (SELECT 1 FROM Stores WHERE Id = 4)
BEGIN
    INSERT INTO Stores (
        Id, 
        Name, 
        Domain, 
        ShopifyShopId, 
        Description, 
        DataType, 
        IsActive, 
        Settings, 
        CreatedAt, 
        UpdatedAt
    )
    VALUES (
        4,
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
    PRINT 'Store 4を登録しました';
END
ELSE
BEGIN
    PRINT 'Store 4は既に存在します';
END

-- 登録結果の確認
PRINT '';
PRINT '=== デモストア登録状況 ===';
SELECT 
    Id,
    Name,
    Domain,
    DataType,
    IsActive,
    CASE 
        WHEN Description IS NOT NULL THEN LEFT(Description, 50) + '...'
        ELSE ''
    END as Description
FROM Stores
WHERE DataType = 'demo'
ORDER BY Id;

-- データ件数の確認
PRINT '';
PRINT '=== 各ストアのデータ件数 ===';
SELECT 
    s.Id as StoreId,
    s.Name as StoreName,
    (SELECT COUNT(*) FROM Customers WHERE StoreId = s.Id) as Customers,
    (SELECT COUNT(*) FROM Products WHERE StoreId = s.Id) as Products,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = s.Id) as Orders,
    (SELECT COUNT(*) FROM OrderItems oi INNER JOIN Orders o ON oi.OrderId = o.Id WHERE o.StoreId = s.Id) as OrderItems
FROM Stores s
WHERE s.DataType = 'demo'
ORDER BY s.Id;