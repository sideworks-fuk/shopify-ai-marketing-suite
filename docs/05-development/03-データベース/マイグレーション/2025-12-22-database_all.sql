
/****** Object:  Schema [HangFire]    Script Date: 2025/12/22 13:23:31 ******/
CREATE SCHEMA [HangFire]
GO
/****** Object:  Table [dbo].[__EFMigrationsHistory]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[__EFMigrationsHistory](
	[MigrationId] [nvarchar](150) NOT NULL,
	[ProductVersion] [nvarchar](32) NOT NULL,
 CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY CLUSTERED 
(
	[MigrationId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AuthenticationLogs]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AuthenticationLogs](
	[Id] [uniqueidentifier] NOT NULL,
	[UserId] [nvarchar](255) NULL,
	[AuthMode] [nvarchar](50) NOT NULL,
	[Success] [bit] NOT NULL,
	[FailureReason] [nvarchar](255) NULL,
	[IpAddress] [nvarchar](45) NULL,
	[UserAgent] [nvarchar](500) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Customers]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Customers](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[FirstName] [nvarchar](100) NOT NULL,
	[LastName] [nvarchar](100) NOT NULL,
	[Email] [nvarchar](255) NOT NULL,
	[Phone] [nvarchar](20) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[CustomerSegment] [nvarchar](50) NOT NULL,
	[TotalSpent] [decimal](18, 2) NOT NULL,
	[OrdersCount] [int] NOT NULL,
	[AcceptsEmailMarketing] [bit] NOT NULL,
	[AcceptsSMSMarketing] [bit] NOT NULL,
	[AddressPhone] [nvarchar](20) NULL,
	[City] [nvarchar](50) NULL,
	[Company] [nvarchar](100) NULL,
	[CompanyStoreName] [nvarchar](100) NULL,
	[CountryCode] [nvarchar](10) NULL,
	[Industry] [nvarchar](100) NULL,
	[ProvinceCode] [nvarchar](10) NULL,
	[Tags] [nvarchar](1000) NULL,
	[TaxExempt] [bit] NOT NULL,
	[TotalOrders] [int] NOT NULL,
	[ShopifyCustomerId] [nvarchar](50) NULL,
	[StoreId] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
 CONSTRAINT [PK_Customers] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DemoSessions]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DemoSessions](
	[Id] [uniqueidentifier] NOT NULL,
	[SessionId] [nvarchar](255) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[ExpiresAt] [datetime2](7) NOT NULL,
	[LastAccessedAt] [datetime2](7) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedBy] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[SessionId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[FeatureLimits]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[FeatureLimits](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[PlanType] [nvarchar](50) NOT NULL,
	[FeatureId] [nvarchar](100) NOT NULL,
	[DailyLimit] [int] NULL,
	[MonthlyLimit] [int] NULL,
	[CreatedAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[FeatureSelectionChangeHistories]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[FeatureSelectionChangeHistories](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[BeforeFeatureId] [nvarchar](100) NULL,
	[AfterFeatureId] [nvarchar](100) NOT NULL,
	[ChangeReason] [nvarchar](100) NOT NULL,
	[ChangedBy] [nvarchar](100) NULL,
	[IdempotencyToken] [nvarchar](100) NULL,
	[CreatedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[FeatureSelectionChangeHistory]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[FeatureSelectionChangeHistory](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[PreviousFeatureId] [nvarchar](100) NULL,
	[NewFeatureId] [nvarchar](100) NULL,
	[ChangeReason] [nvarchar](500) NULL,
	[IdempotencyToken] [nvarchar](100) NULL,
	[ChangedAt] [datetime2](7) NOT NULL,
	[ChangedBy] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[FeatureUsageLogs]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[FeatureUsageLogs](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[FeatureId] [nvarchar](100) NOT NULL,
	[EventType] [nvarchar](50) NOT NULL,
	[BeforeFeatureId] [nvarchar](100) NULL,
	[AfterFeatureId] [nvarchar](100) NULL,
	[Result] [nvarchar](50) NOT NULL,
	[ErrorMessage] [nvarchar](500) NULL,
	[IpAddress] [nvarchar](50) NULL,
	[UserAgent] [nvarchar](500) NULL,
	[IdempotencyToken] [nvarchar](100) NULL,
	[CreatedAt] [datetime2](7) NULL,
	[BeforeFeature] [nvarchar](100) NULL,
	[AfterFeature] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GDPRComplianceLog]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GDPRComplianceLog](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NULL,
	[ShopDomain] [nvarchar](255) NOT NULL,
	[RequestType] [nvarchar](50) NOT NULL,
	[RequestId] [nvarchar](100) NULL,
	[CustomerId] [bigint] NULL,
	[RequestedAt] [datetime2](7) NOT NULL,
	[CompletedAt] [datetime2](7) NULL,
	[DueDate] [datetime2](7) NOT NULL,
	[Status] [nvarchar](50) NULL,
	[Details] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GDPRComplianceLogs]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GDPRComplianceLogs](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NULL,
	[ShopDomain] [nvarchar](255) NOT NULL,
	[RequestType] [nvarchar](50) NOT NULL,
	[RequestId] [nvarchar](100) NULL,
	[CustomerId] [bigint] NULL,
	[RequestedAt] [datetime2](7) NOT NULL,
	[CompletedAt] [datetime2](7) NULL,
	[DueDate] [datetime2](7) NOT NULL,
	[Status] [nvarchar](50) NOT NULL,
	[Details] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_GDPRComplianceLogs] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GDPRDeletionLogs]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GDPRDeletionLogs](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[GDPRRequestId] [int] NOT NULL,
	[EntityType] [nvarchar](100) NOT NULL,
	[EntityId] [nvarchar](max) NULL,
	[AnonymizedData] [nvarchar](max) NULL,
	[DeletedAt] [datetime2](7) NOT NULL,
	[DeletionMethod] [nvarchar](50) NOT NULL,
	[DeletedBy] [nvarchar](100) NULL,
 CONSTRAINT [PK_GDPRDeletionLogs] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GDPRRequests]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GDPRRequests](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NULL,
	[ShopDomain] [nvarchar](255) NOT NULL,
	[RequestType] [nvarchar](50) NOT NULL,
	[ShopifyRequestId] [nvarchar](100) NULL,
	[CustomerId] [bigint] NULL,
	[CustomerEmail] [nvarchar](255) NULL,
	[OrdersToRedact] [nvarchar](max) NULL,
	[Status] [nvarchar](50) NOT NULL,
	[ReceivedAt] [datetime2](7) NOT NULL,
	[DueDate] [datetime2](7) NOT NULL,
	[ScheduledFor] [datetime2](7) NULL,
	[ProcessingStartedAt] [datetime2](7) NULL,
	[CompletedAt] [datetime2](7) NULL,
	[ExportedData] [nvarchar](max) NULL,
	[ExportUrl] [nvarchar](500) NULL,
	[ProcessingDetails] [nvarchar](max) NULL,
	[ErrorMessage] [nvarchar](max) NULL,
	[RetryCount] [int] NOT NULL,
	[MaxRetries] [int] NOT NULL,
	[WebhookPayload] [nvarchar](max) NULL,
	[IdempotencyKey] [nvarchar](255) NULL,
	[AuditLog] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_GDPRRequests] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[GDPRStatistics]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[GDPRStatistics](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Period] [nvarchar](7) NOT NULL,
	[RequestType] [nvarchar](50) NOT NULL,
	[TotalRequests] [int] NOT NULL,
	[CompletedRequests] [int] NOT NULL,
	[CompletedOnTime] [int] NOT NULL,
	[Overdue] [int] NOT NULL,
	[Failed] [int] NOT NULL,
	[AverageProcessingHours] [float] NOT NULL,
	[MinProcessingHours] [float] NOT NULL,
	[MaxProcessingHours] [float] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_GDPRStatistics] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InstallationHistories]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InstallationHistories](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[ShopDomain] [nvarchar](255) NOT NULL,
	[Action] [nvarchar](50) NOT NULL,
	[AccessToken] [nvarchar](max) NULL,
	[Scopes] [nvarchar](500) NULL,
	[InstalledAt] [datetime2](7) NULL,
	[UninstalledAt] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_InstallationHistories] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InstallationHistory]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InstallationHistory](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[ShopDomain] [nvarchar](255) NOT NULL,
	[Action] [nvarchar](50) NOT NULL,
	[AccessToken] [nvarchar](max) NULL,
	[Scopes] [nvarchar](500) NULL,
	[InstalledAt] [datetime2](7) NULL,
	[UninstalledAt] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[OrderItems]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OrderItems](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[OrderId] [int] NOT NULL,
	[Quantity] [int] NOT NULL,
	[Price] [decimal](18, 2) NOT NULL,
	[TotalPrice] [decimal](18, 2) NOT NULL,
	[CompareAtPrice] [decimal](18, 2) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[Option1Name] [nvarchar](100) NULL,
	[Option1Value] [nvarchar](100) NULL,
	[Option2Name] [nvarchar](100) NULL,
	[Option2Value] [nvarchar](100) NULL,
	[Option3Name] [nvarchar](100) NULL,
	[Option3Value] [nvarchar](100) NULL,
	[ProductHandle] [nvarchar](255) NULL,
	[ProductTitle] [nvarchar](255) NOT NULL,
	[ProductType] [nvarchar](100) NULL,
	[ProductVendor] [nvarchar](100) NULL,
	[RequiresShipping] [bit] NOT NULL,
	[Sku] [nvarchar](100) NULL,
	[Taxable] [bit] NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[VariantTitle] [nvarchar](100) NULL,
 CONSTRAINT [PK_OrderItems] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Orders]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Orders](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[OrderNumber] [nvarchar](50) NOT NULL,
	[CustomerId] [int] NOT NULL,
	[TotalPrice] [decimal](18, 2) NOT NULL,
	[SubtotalPrice] [decimal](18, 2) NOT NULL,
	[TaxPrice] [decimal](18, 2) NOT NULL,
	[Currency] [nvarchar](50) NOT NULL,
	[Status] [nvarchar](50) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[StoreId] [int] NOT NULL,
	[FinancialStatus] [nvarchar](50) NOT NULL,
	[ShopifyCustomerId] [nvarchar](50) NULL,
	[TotalTax] [decimal](18, 2) NOT NULL,
	[Email] [nvarchar](255) NULL,
	[ShopifyOrderId] [nvarchar](50) NULL,
	[FulfillmentStatus] [nvarchar](50) NULL,
 CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
-- Orders_Backup_20251218テーブルは本番環境では不要なので削除
/****** Object:  Table [dbo].[Products]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Products](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Title] [nvarchar](255) NOT NULL,
	[Description] [nvarchar](1000) NULL,
	[Category] [nvarchar](100) NULL,
	[InventoryQuantity] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[ProductType] [nvarchar](100) NULL,
	[Vendor] [nvarchar](100) NULL,
	[StoreId] [int] NOT NULL,
	[Handle] [nvarchar](255) NULL,
 CONSTRAINT [PK_Products] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ProductVariants]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ProductVariants](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ProductId] [int] NOT NULL,
	[Sku] [nvarchar](100) NULL,
	[Price] [decimal](18, 2) NOT NULL,
	[CompareAtPrice] [decimal](18, 2) NULL,
	[InventoryQuantity] [int] NOT NULL,
	[Option1Name] [nvarchar](100) NULL,
	[Option1Value] [nvarchar](100) NULL,
	[Option2Name] [nvarchar](100) NULL,
	[Option2Value] [nvarchar](100) NULL,
	[Option3Name] [nvarchar](100) NULL,
	[Option3Value] [nvarchar](100) NULL,
	[Barcode] [nvarchar](100) NULL,
	[Weight] [decimal](18, 2) NULL,
	[WeightUnit] [nvarchar](10) NULL,
	[RequiresShipping] [bit] NOT NULL,
	[Taxable] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_ProductVariants] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Stores]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Stores](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Domain] [nvarchar](255) NULL,
	[ShopifyShopId] [nvarchar](100) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
	[Description] [nvarchar](500) NULL,
	[DataType] [nvarchar](50) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[Settings] [nvarchar](max) NULL,
	[TenantId] [nvarchar](100) NULL,
	[ApiKey] [nvarchar](255) NULL,
	[ApiSecret] [nvarchar](255) NULL,
	[AccessToken] [nvarchar](max) NULL,
	[Scopes] [nvarchar](500) NULL,
	[InitialSetupCompleted] [bit] NOT NULL,
	[LastSyncDate] [datetime2](7) NULL,
	[InstalledAt] [datetime2](7) NULL,
	[UninstalledAt] [datetime2](7) NULL,
	[DataDeletionScheduledAt] [datetime2](7) NULL,
	[DataDeletionCompletedAt] [datetime2](7) NULL,
 CONSTRAINT [PK_Stores] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StoreSubscriptions]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StoreSubscriptions](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[PlanId] [int] NOT NULL,
	[ShopifyChargeId] [bigint] NULL,
	[Status] [nvarchar](50) NOT NULL,
	[TrialEndsAt] [datetime2](7) NULL,
	[CurrentPeriodEnd] [datetime2](7) NULL,
	[ActivatedAt] [datetime2](7) NULL,
	[CancelledAt] [datetime2](7) NULL,
	[ConfirmationUrl] [nvarchar](500) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SubscriptionPlans]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SubscriptionPlans](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Price] [decimal](10, 2) NOT NULL,
	[TrialDays] [int] NOT NULL,
	[Features] [nvarchar](max) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SyncStatuses]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SyncStatuses](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [nvarchar](255) NOT NULL,
	[SyncType] [nvarchar](50) NOT NULL,
	[Status] [nvarchar](50) NOT NULL,
	[StartDate] [datetime2](7) NOT NULL,
	[EndDate] [datetime2](7) NULL,
	[TotalRecords] [int] NULL,
	[ProcessedRecords] [int] NULL,
	[ErrorMessage] [nvarchar](max) NULL,
	[CurrentTask] [nvarchar](50) NULL,
	[SyncPeriod] [nvarchar](50) NULL,
	[Metadata] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Tenants]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Tenants](
	[Id] [nvarchar](100) NOT NULL,
	[CompanyName] [nvarchar](255) NOT NULL,
	[ContactEmail] [nvarchar](255) NOT NULL,
	[CreatedAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[Status] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
-- TestTableは本番環境では不要なので削除
/****** Object:  Table [dbo].[UserFeatureSelections]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UserFeatureSelections](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[SelectedFeatureId] [nvarchar](100) NOT NULL,
	[LastChangeDate] [datetime2](7) NOT NULL,
	[NextChangeAvailableDate] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[WebhookEvents]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WebhookEvents](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[StoreId] [int] NOT NULL,
	[ShopDomain] [nvarchar](255) NOT NULL,
	[Topic] [nvarchar](100) NOT NULL,
	[Payload] [nvarchar](max) NULL,
	[Status] [nvarchar](50) NULL,
	[ProcessedAt] [datetime2](7) NULL,
	[ScheduledDeletionDate] [datetime2](7) NULL,
	[ErrorMessage] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[IdempotencyKey] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[AggregatedCounter]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[AggregatedCounter](
	[Key] [nvarchar](100) NOT NULL,
	[Value] [bigint] NOT NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_CounterAggregated] PRIMARY KEY CLUSTERED 
(
	[Key] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Counter]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Counter](
	[Key] [nvarchar](100) NOT NULL,
	[Value] [int] NOT NULL,
	[ExpireAt] [datetime] NULL,
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
 CONSTRAINT [PK_HangFire_Counter] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Hash]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Hash](
	[Key] [nvarchar](100) NOT NULL,
	[Field] [nvarchar](100) NOT NULL,
	[Value] [nvarchar](max) NULL,
	[ExpireAt] [datetime2](7) NULL,
 CONSTRAINT [PK_HangFire_Hash] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Field] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Job]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Job](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[StateId] [bigint] NULL,
	[StateName] [nvarchar](20) NULL,
	[InvocationData] [nvarchar](max) NOT NULL,
	[Arguments] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_Job] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[JobParameter]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[JobParameter](
	[JobId] [bigint] NOT NULL,
	[Name] [nvarchar](40) NOT NULL,
	[Value] [nvarchar](max) NULL,
 CONSTRAINT [PK_HangFire_JobParameter] PRIMARY KEY CLUSTERED 
(
	[JobId] ASC,
	[Name] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[JobQueue]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[JobQueue](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[JobId] [bigint] NOT NULL,
	[Queue] [nvarchar](50) NOT NULL,
	[FetchedAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_JobQueue] PRIMARY KEY CLUSTERED 
(
	[Queue] ASC,
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[List]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[List](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[Key] [nvarchar](100) NOT NULL,
	[Value] [nvarchar](max) NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_List] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Schema]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Schema](
	[Version] [int] NOT NULL,
 CONSTRAINT [PK_HangFire_Schema] PRIMARY KEY CLUSTERED 
(
	[Version] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Server]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Server](
	[Id] [nvarchar](200) NOT NULL,
	[Data] [nvarchar](max) NULL,
	[LastHeartbeat] [datetime] NOT NULL,
 CONSTRAINT [PK_HangFire_Server] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Set]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Set](
	[Key] [nvarchar](100) NOT NULL,
	[Score] [float] NOT NULL,
	[Value] [nvarchar](256) NOT NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_Set] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Value] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[State]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[State](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[JobId] [bigint] NOT NULL,
	[Name] [nvarchar](20) NOT NULL,
	[Reason] [nvarchar](100) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[Data] [nvarchar](max) NULL,
 CONSTRAINT [PK_HangFire_State] PRIMARY KEY CLUSTERED 
(
	[JobId] ASC,
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_AuthenticationLogs_AuthMode]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_AuthenticationLogs_AuthMode] ON [dbo].[AuthenticationLogs]
(
	[AuthMode] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_AuthenticationLogs_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_AuthenticationLogs_CreatedAt] ON [dbo].[AuthenticationLogs]
(
	[CreatedAt] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Customers_CreatedAt_StoreId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Customers_CreatedAt_StoreId] ON [dbo].[Customers]
(
	[CreatedAt] ASC,
	[StoreId] ASC
)
INCLUDE([Email],[FirstName],[LastName],[TotalSpent],[TotalOrders]) WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Customers_Email]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Customers_Email] ON [dbo].[Customers]
(
	[Email] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Customers_IsActive]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Customers_IsActive] ON [dbo].[Customers]
(
	[IsActive] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Customers_ShopifyCustomerId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Customers_ShopifyCustomerId] ON [dbo].[Customers]
(
	[ShopifyCustomerId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Customers_StoreId_Email]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Customers_StoreId_Email] ON [dbo].[Customers]
(
	[StoreId] ASC,
	[Email] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Customers_StoreId_ShopifyCustomerId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Customers_StoreId_ShopifyCustomerId] ON [dbo].[Customers]
(
	[StoreId] ASC,
	[ShopifyCustomerId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Customers_StoreId_TotalSpent]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Customers_StoreId_TotalSpent] ON [dbo].[Customers]
(
	[StoreId] ASC,
	[TotalSpent] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_DemoSessions_ExpiresAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_DemoSessions_ExpiresAt] ON [dbo].[DemoSessions]
(
	[ExpiresAt] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_DemoSessions_SessionId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_DemoSessions_SessionId] ON [dbo].[DemoSessions]
(
	[SessionId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_FeatureLimits_PlanType_FeatureId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_FeatureLimits_PlanType_FeatureId] ON [dbo].[FeatureLimits]
(
	[PlanType] ASC,
	[FeatureId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FeatureSelectionChangeHistories_StoreId_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_FeatureSelectionChangeHistories_StoreId_CreatedAt] ON [dbo].[FeatureSelectionChangeHistories]
(
	[StoreId] ASC,
	[CreatedAt] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_FeatureSelectionChangeHistory_IdempotencyToken]    Script Date: 2025/12/22 13:23:31 ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_FeatureSelectionChangeHistory_IdempotencyToken] ON [dbo].[FeatureSelectionChangeHistory]
(
	[IdempotencyToken] ASC
)
WHERE ([IdempotencyToken] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_FeatureSelectionChangeHistory_StoreId_ChangedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_FeatureSelectionChangeHistory_StoreId_ChangedAt] ON [dbo].[FeatureSelectionChangeHistory]
(
	[StoreId] ASC,
	[ChangedAt] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_FeatureUsageLogs_EventType_Result]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_FeatureUsageLogs_EventType_Result] ON [dbo].[FeatureUsageLogs]
(
	[EventType] ASC,
	[Result] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_FeatureUsageLogs_IdempotencyToken]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_FeatureUsageLogs_IdempotencyToken] ON [dbo].[FeatureUsageLogs]
(
	[IdempotencyToken] ASC
)
WHERE ([IdempotencyToken] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_FeatureUsageLogs_StoreId_FeatureId_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_FeatureUsageLogs_StoreId_FeatureId_CreatedAt] ON [dbo].[FeatureUsageLogs]
(
	[StoreId] ASC,
	[FeatureId] ASC,
	[CreatedAt] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_GDPRComplianceLog_DueDate]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRComplianceLog_DueDate] ON [dbo].[GDPRComplianceLog]
(
	[DueDate] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_GDPRComplianceLog_RequestType]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRComplianceLog_RequestType] ON [dbo].[GDPRComplianceLog]
(
	[RequestType] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_GDPRComplianceLog_ShopDomain]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRComplianceLog_ShopDomain] ON [dbo].[GDPRComplianceLog]
(
	[ShopDomain] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_GDPRComplianceLog_Status]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRComplianceLog_Status] ON [dbo].[GDPRComplianceLog]
(
	[Status] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_GDPRDeletionLogs_GDPRRequestId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRDeletionLogs_GDPRRequestId] ON [dbo].[GDPRDeletionLogs]
(
	[GDPRRequestId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_GDPRRequests_DueDate]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRRequests_DueDate] ON [dbo].[GDPRRequests]
(
	[DueDate] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_GDPRRequests_IdempotencyKey]    Script Date: 2025/12/22 13:23:31 ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_GDPRRequests_IdempotencyKey] ON [dbo].[GDPRRequests]
(
	[IdempotencyKey] ASC
)
WHERE ([IdempotencyKey] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_GDPRRequests_ShopDomain_RequestType]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRRequests_ShopDomain_RequestType] ON [dbo].[GDPRRequests]
(
	[ShopDomain] ASC,
	[RequestType] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_GDPRRequests_Status]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_GDPRRequests_Status] ON [dbo].[GDPRRequests]
(
	[Status] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_GDPRStatistics_Period_RequestType]    Script Date: 2025/12/22 13:23:31 ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_GDPRStatistics_Period_RequestType] ON [dbo].[GDPRStatistics]
(
	[Period] ASC,
	[RequestType] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_InstallationHistory_Action]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_InstallationHistory_Action] ON [dbo].[InstallationHistory]
(
	[Action] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_InstallationHistory_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_InstallationHistory_CreatedAt] ON [dbo].[InstallationHistory]
(
	[CreatedAt] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_InstallationHistory_ShopDomain]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_InstallationHistory_ShopDomain] ON [dbo].[InstallationHistory]
(
	[ShopDomain] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_OrderItems_OrderId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_OrderItems_OrderId] ON [dbo].[OrderItems]
(
	[OrderId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_OrderItems_OrderId_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_OrderItems_OrderId_CreatedAt] ON [dbo].[OrderItems]
(
	[OrderId] ASC,
	[CreatedAt] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Orders_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Orders_CreatedAt] ON [dbo].[Orders]
(
	[CreatedAt] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Orders_CustomerId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Orders_CustomerId] ON [dbo].[Orders]
(
	[CustomerId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Orders_CustomerId_CreatedAt_DESC]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Orders_CustomerId_CreatedAt_DESC] ON [dbo].[Orders]
(
	[CustomerId] ASC,
	[CreatedAt] DESC
)
INCLUDE([TotalPrice],[FinancialStatus],[Status]) WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Orders_OrderNumber]    Script Date: 2025/12/22 13:23:31 ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Orders_OrderNumber] ON [dbo].[Orders]
(
	[OrderNumber] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Orders_ShopifyCustomerId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Orders_ShopifyCustomerId] ON [dbo].[Orders]
(
	[ShopifyCustomerId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Orders_ShopifyOrderId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Orders_ShopifyOrderId] ON [dbo].[Orders]
(
	[ShopifyOrderId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Orders_StoreId_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Orders_StoreId_CreatedAt] ON [dbo].[Orders]
(
	[StoreId] ASC,
	[CreatedAt] ASC
)
INCLUDE([CustomerId],[TotalPrice]) WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Orders_StoreId_OrderNumber]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Orders_StoreId_OrderNumber] ON [dbo].[Orders]
(
	[StoreId] ASC,
	[OrderNumber] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Products_StoreId_Title]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Products_StoreId_Title] ON [dbo].[Products]
(
	[StoreId] ASC,
	[Title] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Products_Title]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Products_Title] ON [dbo].[Products]
(
	[Title] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ProductVariants_ProductId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_ProductVariants_ProductId] ON [dbo].[ProductVariants]
(
	[ProductId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Stores_TenantId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Stores_TenantId] ON [dbo].[Stores]
(
	[TenantId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_StoreSubscriptions_Status]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_StoreSubscriptions_Status] ON [dbo].[StoreSubscriptions]
(
	[Status] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_StoreSubscriptions_StoreId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_StoreSubscriptions_StoreId] ON [dbo].[StoreSubscriptions]
(
	[StoreId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_SyncStatuses_Status]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_SyncStatuses_Status] ON [dbo].[SyncStatuses]
(
	[Status] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_SyncStatuses_StoreId]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_SyncStatuses_StoreId] ON [dbo].[SyncStatuses]
(
	[StoreId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_SyncStatuses_SyncType]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_SyncStatuses_SyncType] ON [dbo].[SyncStatuses]
(
	[SyncType] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Tenants_Id]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_Tenants_Id] ON [dbo].[Tenants]
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_UserFeatureSelections_NextChangeAvailableDate]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_UserFeatureSelections_NextChangeAvailableDate] ON [dbo].[UserFeatureSelections]
(
	[NextChangeAvailableDate] ASC
)
WHERE ([NextChangeAvailableDate] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_UserFeatureSelections_StoreId_IsActive]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_UserFeatureSelections_StoreId_IsActive] ON [dbo].[UserFeatureSelections]
(
	[StoreId] ASC,
	[IsActive] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_WebhookEvents_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_WebhookEvents_CreatedAt] ON [dbo].[WebhookEvents]
(
	[CreatedAt] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_WebhookEvents_ScheduledDeletionDate]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_WebhookEvents_ScheduledDeletionDate] ON [dbo].[WebhookEvents]
(
	[ScheduledDeletionDate] ASC
)
WHERE ([ScheduledDeletionDate] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_WebhookEvents_ShopDomain]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_WebhookEvents_ShopDomain] ON [dbo].[WebhookEvents]
(
	[ShopDomain] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_WebhookEvents_Status]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_WebhookEvents_Status] ON [dbo].[WebhookEvents]
(
	[Status] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_WebhookEvents_Topic]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_WebhookEvents_Topic] ON [dbo].[WebhookEvents]
(
	[Topic] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UX_WebhookEvents_IdempotencyKey]    Script Date: 2025/12/22 13:23:31 ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_WebhookEvents_IdempotencyKey] ON [dbo].[WebhookEvents]
(
	[IdempotencyKey] ASC
)
WHERE ([IdempotencyKey] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_HangFire_AggregatedCounter_ExpireAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_AggregatedCounter_ExpireAt] ON [HangFire].[AggregatedCounter]
(
	[ExpireAt] ASC
)
WHERE ([ExpireAt] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_HangFire_Hash_ExpireAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_Hash_ExpireAt] ON [HangFire].[Hash]
(
	[ExpireAt] ASC
)
WHERE ([ExpireAt] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_HangFire_Job_ExpireAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_Job_ExpireAt] ON [HangFire].[Job]
(
	[ExpireAt] ASC
)
INCLUDE([StateName]) 
WHERE ([ExpireAt] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_HangFire_Job_StateName]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_Job_StateName] ON [HangFire].[Job]
(
	[StateName] ASC
)
WHERE ([StateName] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_HangFire_List_ExpireAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_List_ExpireAt] ON [HangFire].[List]
(
	[ExpireAt] ASC
)
WHERE ([ExpireAt] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_HangFire_Server_LastHeartbeat]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_Server_LastHeartbeat] ON [HangFire].[Server]
(
	[LastHeartbeat] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_HangFire_Set_ExpireAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_Set_ExpireAt] ON [HangFire].[Set]
(
	[ExpireAt] ASC
)
WHERE ([ExpireAt] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_HangFire_Set_Score]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_Set_Score] ON [HangFire].[Set]
(
	[Key] ASC,
	[Score] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_HangFire_State_CreatedAt]    Script Date: 2025/12/22 13:23:31 ******/
CREATE NONCLUSTERED INDEX [IX_HangFire_State_CreatedAt] ON [HangFire].[State]
(
	[CreatedAt] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[AuthenticationLogs] ADD  DEFAULT (newid()) FOR [Id]
GO
ALTER TABLE [dbo].[AuthenticationLogs] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT (CONVERT([bit],(0))) FOR [AcceptsEmailMarketing]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT (CONVERT([bit],(0))) FOR [AcceptsSMSMarketing]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT (CONVERT([bit],(0))) FOR [TaxExempt]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((0)) FOR [TotalOrders]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((0)) FOR [StoreId]
GO
ALTER TABLE [dbo].[Customers] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[DemoSessions] ADD  DEFAULT (newid()) FOR [Id]
GO
ALTER TABLE [dbo].[DemoSessions] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[DemoSessions] ADD  DEFAULT (getutcdate()) FOR [LastAccessedAt]
GO
ALTER TABLE [dbo].[DemoSessions] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[FeatureLimits] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[FeatureLimits] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[FeatureSelectionChangeHistories] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[FeatureSelectionChangeHistory] ADD  DEFAULT (getutcdate()) FOR [ChangedAt]
GO
ALTER TABLE [dbo].[FeatureUsageLogs] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[GDPRComplianceLog] ADD  DEFAULT ('pending') FOR [Status]
GO
ALTER TABLE [dbo].[GDPRComplianceLog] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[GDPRComplianceLog] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[GDPRComplianceLogs] ADD  DEFAULT ('pending') FOR [Status]
GO
ALTER TABLE [dbo].[GDPRComplianceLogs] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[GDPRComplianceLogs] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[GDPRDeletionLogs] ADD  DEFAULT (getutcdate()) FOR [DeletedAt]
GO
ALTER TABLE [dbo].[GDPRDeletionLogs] ADD  DEFAULT ('delete') FOR [DeletionMethod]
GO
ALTER TABLE [dbo].[GDPRRequests] ADD  DEFAULT ('pending') FOR [Status]
GO
ALTER TABLE [dbo].[GDPRRequests] ADD  DEFAULT (getutcdate()) FOR [ReceivedAt]
GO
ALTER TABLE [dbo].[GDPRRequests] ADD  DEFAULT ((0)) FOR [RetryCount]
GO
ALTER TABLE [dbo].[GDPRRequests] ADD  DEFAULT ((3)) FOR [MaxRetries]
GO
ALTER TABLE [dbo].[GDPRRequests] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[GDPRRequests] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [TotalRequests]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [CompletedRequests]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [CompletedOnTime]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [Overdue]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [Failed]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [AverageProcessingHours]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [MinProcessingHours]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT ((0)) FOR [MaxProcessingHours]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[GDPRStatistics] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[InstallationHistories] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[InstallationHistory] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[OrderItems] ADD  DEFAULT ('0001-01-01T00:00:00.0000000') FOR [CreatedAt]
GO
ALTER TABLE [dbo].[OrderItems] ADD  DEFAULT (N'') FOR [ProductTitle]
GO
ALTER TABLE [dbo].[OrderItems] ADD  DEFAULT (CONVERT([bit],(0))) FOR [RequiresShipping]
GO
ALTER TABLE [dbo].[OrderItems] ADD  DEFAULT (CONVERT([bit],(0))) FOR [Taxable]
GO
ALTER TABLE [dbo].[OrderItems] ADD  DEFAULT ('0001-01-01T00:00:00.0000000') FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT ((0)) FOR [StoreId]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT ('pending') FOR [FinancialStatus]
GO
ALTER TABLE [dbo].[Orders] ADD  DEFAULT ((0)) FOR [TotalTax]
GO
ALTER TABLE [dbo].[Products] ADD  DEFAULT ((0)) FOR [StoreId]
GO
ALTER TABLE [dbo].[Stores] ADD  DEFAULT ('production') FOR [DataType]
GO
ALTER TABLE [dbo].[Stores] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Stores] ADD  DEFAULT ((0)) FOR [InitialSetupCompleted]
GO
ALTER TABLE [dbo].[StoreSubscriptions] ADD  DEFAULT ('pending') FOR [Status]
GO
ALTER TABLE [dbo].[StoreSubscriptions] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[StoreSubscriptions] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[SubscriptionPlans] ADD  DEFAULT ((7)) FOR [TrialDays]
GO
ALTER TABLE [dbo].[SubscriptionPlans] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[SubscriptionPlans] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[SubscriptionPlans] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[SyncStatuses] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[SyncStatuses] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[Tenants] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Tenants] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[Tenants] ADD  DEFAULT ('active') FOR [Status]
GO
-- TestTableのデフォルト制約も削除
ALTER TABLE [dbo].[UserFeatureSelections] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[UserFeatureSelections] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[UserFeatureSelections] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[WebhookEvents] ADD  DEFAULT ('pending') FOR [Status]
GO
ALTER TABLE [dbo].[WebhookEvents] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[WebhookEvents] ADD  DEFAULT (getutcdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[Customers]  WITH CHECK ADD  CONSTRAINT [FK_Customers_Stores_StoreId] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[Customers] CHECK CONSTRAINT [FK_Customers_Stores_StoreId]
GO
ALTER TABLE [dbo].[FeatureSelectionChangeHistories]  WITH CHECK ADD FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[FeatureSelectionChangeHistory]  WITH CHECK ADD  CONSTRAINT [FK_FeatureSelectionChangeHistory_Stores] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[FeatureSelectionChangeHistory] CHECK CONSTRAINT [FK_FeatureSelectionChangeHistory_Stores]
GO
ALTER TABLE [dbo].[FeatureUsageLogs]  WITH CHECK ADD FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[GDPRComplianceLogs]  WITH CHECK ADD  CONSTRAINT [FK_GDPRComplianceLogs_Stores] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[GDPRComplianceLogs] CHECK CONSTRAINT [FK_GDPRComplianceLogs_Stores]
GO
ALTER TABLE [dbo].[GDPRDeletionLogs]  WITH CHECK ADD  CONSTRAINT [FK_GDPRDeletionLogs_GDPRRequests] FOREIGN KEY([GDPRRequestId])
REFERENCES [dbo].[GDPRRequests] ([Id])
GO
ALTER TABLE [dbo].[GDPRDeletionLogs] CHECK CONSTRAINT [FK_GDPRDeletionLogs_GDPRRequests]
GO
ALTER TABLE [dbo].[GDPRRequests]  WITH CHECK ADD  CONSTRAINT [FK_GDPRRequests_Stores] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[GDPRRequests] CHECK CONSTRAINT [FK_GDPRRequests_Stores]
GO
ALTER TABLE [dbo].[InstallationHistories]  WITH CHECK ADD  CONSTRAINT [FK_InstallationHistories_Stores] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[InstallationHistories] CHECK CONSTRAINT [FK_InstallationHistories_Stores]
GO
ALTER TABLE [dbo].[InstallationHistory]  WITH CHECK ADD  CONSTRAINT [FK_InstallationHistory_Store] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[InstallationHistory] CHECK CONSTRAINT [FK_InstallationHistory_Store]
GO
ALTER TABLE [dbo].[OrderItems]  WITH CHECK ADD  CONSTRAINT [FK_OrderItems_Orders_OrderId] FOREIGN KEY([OrderId])
REFERENCES [dbo].[Orders] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[OrderItems] CHECK CONSTRAINT [FK_OrderItems_Orders_OrderId]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_Customers_CustomerId] FOREIGN KEY([CustomerId])
REFERENCES [dbo].[Customers] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_Customers_CustomerId]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_Stores_StoreId] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_Stores_StoreId]
GO
ALTER TABLE [dbo].[Products]  WITH CHECK ADD  CONSTRAINT [FK_Products_Stores_StoreId] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[Products] CHECK CONSTRAINT [FK_Products_Stores_StoreId]
GO
ALTER TABLE [dbo].[ProductVariants]  WITH CHECK ADD  CONSTRAINT [FK_ProductVariants_Products_ProductId] FOREIGN KEY([ProductId])
REFERENCES [dbo].[Products] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ProductVariants] CHECK CONSTRAINT [FK_ProductVariants_Products_ProductId]
GO
ALTER TABLE [dbo].[Stores]  WITH CHECK ADD  CONSTRAINT [FK_Stores_Tenants_TenantId] FOREIGN KEY([TenantId])
REFERENCES [dbo].[Tenants] ([Id])
GO
ALTER TABLE [dbo].[Stores] CHECK CONSTRAINT [FK_Stores_Tenants_TenantId]
GO
ALTER TABLE [dbo].[StoreSubscriptions]  WITH CHECK ADD  CONSTRAINT [FK_StoreSubscriptions_Plan] FOREIGN KEY([PlanId])
REFERENCES [dbo].[SubscriptionPlans] ([Id])
GO
ALTER TABLE [dbo].[StoreSubscriptions] CHECK CONSTRAINT [FK_StoreSubscriptions_Plan]
GO
ALTER TABLE [dbo].[StoreSubscriptions]  WITH CHECK ADD  CONSTRAINT [FK_StoreSubscriptions_Store] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StoreSubscriptions] CHECK CONSTRAINT [FK_StoreSubscriptions_Store]
GO
ALTER TABLE [dbo].[UserFeatureSelections]  WITH CHECK ADD FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
GO
ALTER TABLE [dbo].[WebhookEvents]  WITH CHECK ADD  CONSTRAINT [FK_WebhookEvents_Store] FOREIGN KEY([StoreId])
REFERENCES [dbo].[Stores] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[WebhookEvents] CHECK CONSTRAINT [FK_WebhookEvents_Store]
GO
ALTER TABLE [HangFire].[JobParameter]  WITH CHECK ADD  CONSTRAINT [FK_HangFire_JobParameter_Job] FOREIGN KEY([JobId])
REFERENCES [HangFire].[Job] ([Id])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [HangFire].[JobParameter] CHECK CONSTRAINT [FK_HangFire_JobParameter_Job]
GO
ALTER TABLE [HangFire].[State]  WITH CHECK ADD  CONSTRAINT [FK_HangFire_State_Job] FOREIGN KEY([JobId])
REFERENCES [HangFire].[Job] ([Id])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [HangFire].[State] CHECK CONSTRAINT [FK_HangFire_State_Job]
GO
/****** Object:  StoredProcedure [dbo].[sp_GetCurrentFeatureSelection]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_GetCurrentFeatureSelection]
    @StoreId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        ufs.Id,
        ufs.StoreId,
        ufs.SelectedFeatureId,
        ufs.LastChangeDate,
        ufs.NextChangeAvailableDate,
        CASE 
            WHEN ufs.NextChangeAvailableDate IS NULL OR ufs.NextChangeAvailableDate <= GETUTCDATE() 
            THEN 1 
            ELSE 0 
        END AS CanChangeToday
    FROM UserFeatureSelections ufs
    WHERE ufs.StoreId = @StoreId AND ufs.IsActive = 1
    ORDER BY ufs.CreatedAt DESC;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_GetFeatureSelectionStatus]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_GetFeatureSelectionStatus]
    @StoreId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP 1
        ufs.Id,
        ufs.StoreId,
        ufs.SelectedFeatureId,
        ufs.LastChangeDate,
        ufs.NextChangeAvailableDate,
        ufs.IsActive,
        CASE 
            WHEN ufs.NextChangeAvailableDate IS NULL THEN 1
            WHEN GETUTCDATE() >= ufs.NextChangeAvailableDate THEN 1
            ELSE 0
        END AS CanChangeToday
    FROM UserFeatureSelections ufs
    WHERE ufs.StoreId = @StoreId
        AND ufs.IsActive = 1
    ORDER BY ufs.CreatedAt DESC;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_UpdateFeatureSelection]    Script Date: 2025/12/22 13:23:31 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_UpdateFeatureSelection]
    @StoreId INT,
    @NewFeatureId NVARCHAR(100),
    @IdempotencyToken NVARCHAR(100),
    @ChangedBy NVARCHAR(100) = NULL,
    @Result INT OUTPUT,
    @ErrorMessage NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @Result = 0;
    SET @ErrorMessage = NULL;
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- 冪等性チェック
        IF EXISTS (
            SELECT 1 FROM FeatureSelectionChangeHistory 
            WHERE IdempotencyToken = @IdempotencyToken
        )
        BEGIN
            SET @Result = 1; -- 既に処理済み
            COMMIT TRANSACTION;
            RETURN;
        END
        
        -- 現在の選択を取得
        DECLARE @CurrentFeatureId NVARCHAR(100);
        DECLARE @LastChangeDate DATETIME2;
        DECLARE @NextChangeAvailableDate DATETIME2;
        
        SELECT TOP 1
            @CurrentFeatureId = SelectedFeatureId,
            @LastChangeDate = LastChangeDate,
            @NextChangeAvailableDate = NextChangeAvailableDate
        FROM UserFeatureSelections
        WHERE StoreId = @StoreId AND IsActive = 1
        ORDER BY CreatedAt DESC;
        
        -- 変更可能かチェック（30日制限）
        IF @NextChangeAvailableDate IS NOT NULL AND GETUTCDATE() < @NextChangeAvailableDate
        BEGIN
            SET @Result = -1;
            SET @ErrorMessage = 'change_not_allowed';
            
            -- ログ記録（BeforeFeature, AfterFeatureカラムを使用）
            INSERT INTO FeatureUsageLogs (
                StoreId, 
                FeatureId, 
                EventType, 
                BeforeFeature, 
                AfterFeature, 
                Result
            )
            VALUES (
                @StoreId,
                @NewFeatureId,
                'change',
                @CurrentFeatureId,
                @NewFeatureId,
                'limited'
            );
            
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        -- 機能選択を更新
        IF EXISTS (SELECT 1 FROM UserFeatureSelections WHERE StoreId = @StoreId AND IsActive = 1)
        BEGIN
            -- 既存の選択を無効化
            UPDATE UserFeatureSelections 
            SET IsActive = 0, UpdatedAt = GETUTCDATE()
            WHERE StoreId = @StoreId AND IsActive = 1;
        END
        
        -- 新しい選択を追加
        INSERT INTO UserFeatureSelections (
            StoreId, 
            SelectedFeatureId, 
            LastChangeDate, 
            NextChangeAvailableDate,
            IsActive
        )
        VALUES (
            @StoreId,
            @NewFeatureId,
            GETUTCDATE(),
            DATEADD(DAY, 30, GETUTCDATE()),
            1
        );
        
        -- 変更履歴を記録
        INSERT INTO FeatureSelectionChangeHistory (
            StoreId,
            PreviousFeatureId,
            NewFeatureId,
            IdempotencyToken,
            ChangedBy,
            ChangeReason
        )
        VALUES (
            @StoreId,
            @CurrentFeatureId,
            @NewFeatureId,
            @IdempotencyToken,
            @ChangedBy,
            'user_requested'
        );
        
        -- 使用ログを記録（BeforeFeature, AfterFeatureカラムを使用）
        INSERT INTO FeatureUsageLogs (
            StoreId,
            FeatureId,
            EventType,
            BeforeFeature,
            AfterFeature,
            Result
        )
        VALUES (
            @StoreId,
            @NewFeatureId,
            'change',
            @CurrentFeatureId,
            @NewFeatureId,
            'success'
        );
        
        SET @Result = 1; -- 成功
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SET @Result = -999;
        SET @ErrorMessage = ERROR_MESSAGE();
    END CATCH
END
GO
ALTER DATABASE [ec-ranger-db-prod] SET  READ_WRITE 
GO
