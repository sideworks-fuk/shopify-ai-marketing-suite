-- Fix Tenant Id Type Migration
-- Date: 2025-08-01
-- Purpose: Change Tenant.Id from int to string for proper foreign key relationship

-- 1. 外部キー制約を一時的に削除
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Stores_Tenants_TenantId')
BEGIN
    ALTER TABLE Stores DROP CONSTRAINT FK_Stores_Tenants_TenantId;
END

-- 2. Tenantsテーブルの一時バックアップを作成
SELECT * INTO Tenants_Backup FROM Tenants;

-- 3. Tenantsテーブルを削除
DROP TABLE Tenants;

-- 4. 新しいスキーマでTenantsテーブルを再作成
CREATE TABLE Tenants (
    Id NVARCHAR(100) NOT NULL PRIMARY KEY,
    CompanyName NVARCHAR(255) NOT NULL,
    ContactEmail NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    Status NVARCHAR(50) DEFAULT 'active'
);

-- 5. インデックスを再作成
CREATE INDEX IX_Tenants_Id ON Tenants(Id);

-- 6. データを復元（ID型を変換）
INSERT INTO Tenants (Id, CompanyName, ContactEmail, CreatedAt, UpdatedAt, Status)
SELECT 
    CASE 
        WHEN TenantId = 'default-customer' THEN 'default-tenant'
        ELSE 'default-tenant'
    END as Id,
    CompanyName,
    ContactEmail,
    CreatedAt,
    UpdatedAt,
    Status
FROM Tenants_Backup;

-- 7. バックアップテーブルを削除
DROP TABLE Tenants_Backup;

-- 8. Storesテーブルのデータを更新
UPDATE Stores SET TenantId = 'default-tenant' WHERE TenantId = 'default-customer';

-- 9. 外部キー制約を再作成
ALTER TABLE Stores
ADD CONSTRAINT FK_Stores_Tenants_TenantId
FOREIGN KEY (TenantId) REFERENCES Tenants(Id);

-- 10. インデックスの削除と再作成（古いものがあれば）
DROP INDEX IF EXISTS IX_Tenants_TenantId ON Tenants;

-- 確認クエリ
SELECT 'Tenants table' as TableName, COUNT(*) as RecordCount FROM Tenants
UNION ALL
SELECT 'Stores with TenantId' as TableName, COUNT(*) as RecordCount FROM Stores WHERE TenantId IS NOT NULL;