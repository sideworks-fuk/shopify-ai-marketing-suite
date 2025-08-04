-- CustomerAccount to Tenant Migration
-- Date: 2025-08-01
-- Purpose: Rename CustomerAccount to Tenant for clarity

-- 1. テーブル名変更
EXEC sp_rename 'CustomerAccounts', 'Tenants';

-- 2. カラム名変更（Stores.CustomerIdのみ）
EXEC sp_rename 'Stores.CustomerId', 'TenantId', 'COLUMN';

-- 3. インデックス削除（一旦削除して再作成）
DROP INDEX IF EXISTS IX_CustomerAccounts_CustomerId ON Tenants;
DROP INDEX IF EXISTS IX_Stores_CustomerId ON Stores;

-- 4. 新しいインデックス作成
CREATE INDEX IX_Tenants_TenantId ON Tenants(TenantId);
CREATE INDEX IX_Stores_TenantId ON Stores(TenantId);

-- 5. 外部キー制約の更新（存在する場合）
-- 注意: 制約名は実際のデータベースで確認が必要
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Stores_CustomerAccounts_CustomerId')
BEGIN
    ALTER TABLE Stores DROP CONSTRAINT FK_Stores_CustomerAccounts_CustomerId;
END

-- 6. 新しい外部キー制約を追加
ALTER TABLE Stores
ADD CONSTRAINT FK_Stores_Tenants_TenantId
FOREIGN KEY (TenantId) REFERENCES Tenants(TenantId);

-- 7. 既存データの更新（default-customerをdefault-tenantに）
UPDATE Tenants SET TenantId = 'default-tenant' WHERE TenantId = 'default-customer';
UPDATE Stores SET TenantId = 'default-tenant' WHERE TenantId = 'default-customer';