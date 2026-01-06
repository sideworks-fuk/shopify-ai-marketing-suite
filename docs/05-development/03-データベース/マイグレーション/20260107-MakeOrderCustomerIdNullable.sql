-- マイグレーション: MakeOrderCustomerIdNullable
-- 作成日: 2026-01-07
-- 作成者: 福田＋AI Assistant
-- 目的: OrdersテーブルのCustomerIdカラムをNULL許可に変更（外部キー制約違反エラー解消のため）
-- 影響: Ordersテーブルのスキーマ変更

-- Orders テーブルのCustomerIdカラムをNULL許可に変更
-- 既存の外部キー制約を削除
IF EXISTS (
    SELECT 1 
    FROM sys.foreign_keys 
    WHERE name = 'FK_Orders_Customers_CustomerId'
)
BEGIN
    ALTER TABLE Orders DROP CONSTRAINT FK_Orders_Customers_CustomerId;
    PRINT '外部キー制約 FK_Orders_Customers_CustomerId を削除しました';
END
ELSE
BEGIN
    PRINT '外部キー制約 FK_Orders_Customers_CustomerId は存在しません';
END

-- CustomerIdカラムをNULL許可に変更
ALTER TABLE Orders ALTER COLUMN CustomerId INT NULL;
PRINT 'CustomerIdカラムをNULL許可に変更しました';

-- 外部キー制約を再作成（NULL許可に対応）
ALTER TABLE Orders 
ADD CONSTRAINT FK_Orders_Customers_CustomerId 
FOREIGN KEY (CustomerId) 
REFERENCES Customers(Id);
PRINT '外部キー制約 FK_Orders_Customers_CustomerId を再作成しました';

-- 既存のCustomerId=0のレコードをNULLに更新（無効な外部キー値のため）
UPDATE Orders 
SET CustomerId = NULL 
WHERE CustomerId = 0;
PRINT 'CustomerId=0のレコードをNULLに更新しました';

-- ロールバック用SQL（Down マイグレーション）
-- ALTER TABLE Orders DROP CONSTRAINT FK_Orders_Customers_CustomerId;
-- ALTER TABLE Orders ALTER COLUMN CustomerId INT NOT NULL;
-- ALTER TABLE Orders 
-- ADD CONSTRAINT FK_Orders_Customers_CustomerId 
-- FOREIGN KEY (CustomerId) 
-- REFERENCES Customers(Id);
