-- 1. 最終注文日の高速検索用インデックス
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice);

-- 2. 休眠顧客の効率的なフィルタリング用
CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt 
ON Orders(CreatedAt);

-- 3. 顧客の店舗別検索最適化
CREATE NONCLUSTERED INDEX IX_Customers_StoreId_TotalSpent 
ON Customers(StoreId, TotalSpent DESC);