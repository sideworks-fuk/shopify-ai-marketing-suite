-- 目的: 課金テーブル（SubscriptionPlans / StoreSubscriptions）の新規作成
-- 作成日: 2025-08-24
-- 作成者: ERIS

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SubscriptionPlans')
BEGIN
  CREATE TABLE SubscriptionPlans (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    TrialDays INT NOT NULL DEFAULT 7,
    Features NVARCHAR(MAX) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
  );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StoreSubscriptions')
BEGIN
  CREATE TABLE StoreSubscriptions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    PlanId INT NOT NULL,
    ShopifyChargeId BIGINT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'pending',
    TrialEndsAt DATETIME2 NULL,
    CurrentPeriodEnd DATETIME2 NULL,
    ActivatedAt DATETIME2 NULL,
    CancelledAt DATETIME2 NULL,
    ConfirmationUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_StoreSubscriptions_Store FOREIGN KEY (StoreId) REFERENCES Stores(Id) ON DELETE CASCADE,
    CONSTRAINT FK_StoreSubscriptions_Plan FOREIGN KEY (PlanId) REFERENCES SubscriptionPlans(Id) ON DELETE NO ACTION
  );

  CREATE INDEX IX_StoreSubscriptions_StoreId ON StoreSubscriptions(StoreId);
  CREATE INDEX IX_StoreSubscriptions_Status ON StoreSubscriptions(Status);
END
