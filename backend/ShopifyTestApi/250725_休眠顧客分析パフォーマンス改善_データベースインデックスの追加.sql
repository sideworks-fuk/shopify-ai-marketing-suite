-- 1. �ŏI�������̍��������p�C���f�b�N�X
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_DESC 
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice);

-- 2. �x���ڋq�̌����I�ȃt�B���^�����O�p
CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt 
ON Orders(CreatedAt);

-- 3. �ڋq�̓X�ܕʌ����œK��
CREATE NONCLUSTERED INDEX IX_Customers_StoreId_TotalSpent 
ON Customers(StoreId, TotalSpent DESC);