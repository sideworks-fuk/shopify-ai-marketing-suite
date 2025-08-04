-- Multi-Tenant Support Migration
-- Date: 2025-08-01
-- Purpose: Add minimal multi-tenant support for 8/1-8/3 sprint

-- 1. Add TenantId and OAuth fields to Stores table
ALTER TABLE Stores ADD TenantId NVARCHAR(100) NULL;
ALTER TABLE Stores ADD ApiKey NVARCHAR(255) NULL;
ALTER TABLE Stores ADD ApiSecret NVARCHAR(255) NULL;
ALTER TABLE Stores ADD AccessToken NVARCHAR(MAX) NULL;
ALTER TABLE Stores ADD Scopes NVARCHAR(500) NULL;

-- 2. Create Tenants table (minimal version)
CREATE TABLE Tenants (
    Id NVARCHAR(100) NOT NULL PRIMARY KEY,
    CompanyName NVARCHAR(255) NOT NULL,
    ContactEmail NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    Status NVARCHAR(50) DEFAULT 'active'
);

-- 3. Create indexes for performance
CREATE INDEX IX_Stores_TenantId ON Stores(TenantId);
CREATE INDEX IX_Tenants_Id ON Tenants(Id);

-- 4. Insert default tenant for existing stores (migration support)
INSERT INTO Tenants (Id, CompanyName, ContactEmail)
VALUES ('default-tenant', 'Default Tenant', 'admin@example.com');

-- 5. Update existing stores to use default tenant
UPDATE Stores SET TenantId = 'default-tenant' WHERE TenantId IS NULL;