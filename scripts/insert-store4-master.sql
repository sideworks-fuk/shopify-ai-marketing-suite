-- Store 4（早稲田メーヤウ）マスタデータ登録SQL
-- 実行前に既存データの確認を推奨

-- 既存データの確認
SELECT * FROM Stores WHERE Id = 4;

-- 既にデータが存在する場合は削除（必要に応じて）
-- DELETE FROM Stores WHERE Id = 4;

-- Storesテーブルに新規登録
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

-- 登録確認
SELECT * FROM Stores WHERE Id = 4;

-- 全ストアの一覧表示
SELECT 
    Id,
    Name,
    Domain,
    DataType,
    IsActive,
    Description
FROM Stores
ORDER BY Id;