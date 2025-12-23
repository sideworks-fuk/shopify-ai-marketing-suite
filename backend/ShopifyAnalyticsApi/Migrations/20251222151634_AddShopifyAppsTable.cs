using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopifyAnalyticsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddShopifyAppsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccessToken",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApiKey",
                table: "Stores",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApiSecret",
                table: "Stores",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DataType",
                table: "Stores",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Stores",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "InitialSetupCompleted",
                table: "Stores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Stores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSyncDate",
                table: "Stores",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Scopes",
                table: "Stores",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Settings",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ShopifyAppId",
                table: "Stores",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "Stores",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopifyVariantId",
                table: "ProductVariants",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "ProductVariants",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopifyProductId",
                table: "Products",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Orders",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FinancialStatus",
                table: "Orders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FulfillmentStatus",
                table: "Orders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopifyCustomerId",
                table: "Orders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopifyOrderId",
                table: "Orders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalTax",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ProductId",
                table: "OrderItems",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopifyLineItemId",
                table: "OrderItems",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopifyProductId",
                table: "OrderItems",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopifyVariantId",
                table: "OrderItems",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "OrderItems",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Customers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AuthenticationLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    AuthMode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Success = table.Column<bool>(type: "bit", nullable: false),
                    FailureReason = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthenticationLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DemoSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastAccessedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DemoSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FeatureLimits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FeatureId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DailyLimit = table.Column<int>(type: "int", nullable: true),
                    MonthlyLimit = table.Column<int>(type: "int", nullable: true),
                    ChangeCooldownDays = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureLimits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FeatureSelectionChangeHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    BeforeFeatureId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AfterFeatureId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ChangeReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ChangedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    IdempotencyToken = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureSelectionChangeHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureSelectionChangeHistories_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FeatureUsageLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    FeatureId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BeforeFeatureId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AfterFeatureId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Result = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IdempotencyToken = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureUsageLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureUsageLogs_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GDPRComplianceLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: true),
                    ShopDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    RequestType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RequestId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CustomerId = table.Column<long>(type: "bigint", nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GDPRComplianceLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GDPRComplianceLogs_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GDPRRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: true),
                    ShopDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    RequestType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ShopifyRequestId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CustomerId = table.Column<long>(type: "bigint", nullable: true),
                    CustomerEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OrdersToRedact = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledFor = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProcessingStartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExportedData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExportUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ProcessingDetails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    MaxRetries = table.Column<int>(type: "int", nullable: false),
                    WebhookPayload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    AuditLog = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GDPRRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GDPRRequests_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GDPRStatistics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Period = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: false),
                    RequestType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TotalRequests = table.Column<int>(type: "int", nullable: false),
                    CompletedRequests = table.Column<int>(type: "int", nullable: false),
                    CompletedOnTime = table.Column<int>(type: "int", nullable: false),
                    Overdue = table.Column<int>(type: "int", nullable: false),
                    Failed = table.Column<int>(type: "int", nullable: false),
                    AverageProcessingHours = table.Column<double>(type: "float", nullable: false),
                    MinProcessingHours = table.Column<double>(type: "float", nullable: false),
                    MaxProcessingHours = table.Column<double>(type: "float", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GDPRStatistics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InstallationHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    ShopDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AccessToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Scopes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    InstalledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UninstalledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InstallationHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InstallationHistories_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShopifyApps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AppType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ApiKey = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ApiSecret = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    AppUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RedirectUri = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Scopes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopifyApps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TrialDays = table.Column<int>(type: "int", nullable: false),
                    Features = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SyncCheckpoints",
                columns: table => new
                {
                    CheckpointId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    DataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    LastSuccessfulCursor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastProcessedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecordsProcessedSoFar = table.Column<int>(type: "int", nullable: false),
                    SyncStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SyncEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CanResume = table.Column<bool>(type: "bit", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncCheckpoints", x => x.CheckpointId);
                    table.ForeignKey(
                        name: "FK_SyncCheckpoints_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SyncHistories",
                columns: table => new
                {
                    HistoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    SyncType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecordsProcessed = table.Column<int>(type: "int", nullable: false),
                    RecordsFailed = table.Column<int>(type: "int", nullable: false),
                    Duration = table.Column<TimeSpan>(type: "time", nullable: true),
                    ErrorDetails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TriggeredBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalRecords = table.Column<int>(type: "int", nullable: false),
                    ProcessedRecords = table.Column<int>(type: "int", nullable: false),
                    FailedRecords = table.Column<int>(type: "int", nullable: false),
                    Success = table.Column<bool>(type: "bit", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateRangeStart = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateRangeEnd = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncHistories", x => x.HistoryId);
                    table.ForeignKey(
                        name: "FK_SyncHistories_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SyncRangeSettings",
                columns: table => new
                {
                    SettingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    DataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    YearsBack = table.Column<int>(type: "int", nullable: false),
                    IncludeArchived = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncRangeSettings", x => x.SettingId);
                    table.ForeignKey(
                        name: "FK_SyncRangeSettings_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SyncStates",
                columns: table => new
                {
                    SyncStateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    SyncType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalRecordsProcessed = table.Column<int>(type: "int", nullable: false),
                    TotalRecordsFailed = table.Column<int>(type: "int", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProductCursor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerCursor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrderCursor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalRecords = table.Column<int>(type: "int", nullable: false),
                    ProcessedRecords = table.Column<int>(type: "int", nullable: false),
                    FailedRecords = table.Column<int>(type: "int", nullable: false),
                    ProgressPercentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LastActivityAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateRangeStart = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateRangeEnd = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncStates", x => x.SyncStateId);
                    table.ForeignKey(
                        name: "FK_SyncStates_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SyncStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    SyncType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalRecords = table.Column<int>(type: "int", nullable: true),
                    ProcessedRecords = table.Column<int>(type: "int", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CurrentTask = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SyncPeriod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EntityType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncStatuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ContactEmail = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserFeatureSelections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    SelectedFeatureId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    LastChangeDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextChangeAvailableDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFeatureSelections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserFeatureSelections_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WebhookEvents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    ShopDomain = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ScheduledDeletionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WebhookEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WebhookEvents_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GDPRDeletionLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GDPRRequestId = table.Column<int>(type: "int", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AnonymizedData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeletionMethod = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DeletedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GDPRDeletionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GDPRDeletionLogs_GDPRRequests_GDPRRequestId",
                        column: x => x.GDPRRequestId,
                        principalTable: "GDPRRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StoreSubscriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<int>(type: "int", nullable: false),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    ShopifyChargeId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PlanName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TrialEndsAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CurrentPeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ActivatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConfirmationUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreSubscriptions_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StoreSubscriptions_SubscriptionPlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "SubscriptionPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SyncProgressDetails",
                columns: table => new
                {
                    ProgressId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SyncStateId = table.Column<int>(type: "int", nullable: false),
                    DataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CurrentPage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentBatch = table.Column<int>(type: "int", nullable: false),
                    TotalBatches = table.Column<int>(type: "int", nullable: true),
                    BatchStartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastUpdateAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EstimatedCompletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecordsPerSecond = table.Column<float>(type: "real", nullable: true),
                    AverageResponseTime = table.Column<int>(type: "int", nullable: true),
                    RecordsInDateRange = table.Column<int>(type: "int", nullable: true),
                    RecordsSkipped = table.Column<int>(type: "int", nullable: false),
                    RecordsWithErrors = table.Column<int>(type: "int", nullable: false),
                    BatchIdentifier = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordsInBatch = table.Column<int>(type: "int", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncProgressDetails", x => x.ProgressId);
                    table.ForeignKey(
                        name: "FK_SyncProgressDetails_SyncStates_SyncStateId",
                        column: x => x.SyncStateId,
                        principalTable: "SyncStates",
                        principalColumn: "SyncStateId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(457), true, new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(460) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(463), true, new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(463) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "IsActive", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 25, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(466), true, new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(467) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ProductId", "ShopifyLineItemId", "ShopifyProductId", "ShopifyVariantId", "Title", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(552), null, null, null, null, null, new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(553) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ProductId", "ShopifyLineItemId", "ShopifyProductId", "ShopifyVariantId", "Title", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(557), null, null, null, null, null, new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(557) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ProductId", "ShopifyLineItemId", "ShopifyProductId", "ShopifyVariantId", "Title", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(561), null, null, null, null, null, new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(562) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "Email", "FinancialStatus", "FulfillmentStatus", "ShopifyCustomerId", "ShopifyOrderId", "TotalTax", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(516), null, "pending", null, null, null, 0m, new DateTime(2025, 12, 8, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(516) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "Email", "FinancialStatus", "FulfillmentStatus", "ShopifyCustomerId", "ShopifyOrderId", "TotalTax", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(520), null, "pending", null, null, null, 0m, new DateTime(2025, 12, 15, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(520) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "ShopifyProductId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 10, 23, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(490), null, new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(490) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "ShopifyProductId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 7, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(492), null, new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(493) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "ShopifyProductId", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 11, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(495), null, new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(495) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AccessToken", "ApiKey", "ApiSecret", "CreatedAt", "DataType", "Description", "InitialSetupCompleted", "IsActive", "LastSyncDate", "Scopes", "Settings", "ShopifyAppId", "TenantId", "UpdatedAt" },
                values: new object[] { null, null, null, new DateTime(2024, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(276), "production", null, false, true, null, null, null, null, null, new DateTime(2025, 12, 22, 15, 16, 33, 522, DateTimeKind.Utc).AddTicks(282) });

            migrationBuilder.CreateIndex(
                name: "IX_Stores_ShopifyAppId",
                table: "Stores",
                column: "ShopifyAppId");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_TenantId",
                table: "Stores",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AuthenticationLogs_AuthMode",
                table: "AuthenticationLogs",
                column: "AuthMode");

            migrationBuilder.CreateIndex(
                name: "IX_AuthenticationLogs_CreatedAt",
                table: "AuthenticationLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DemoSessions_ExpiresAt",
                table: "DemoSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_DemoSessions_SessionId",
                table: "DemoSessions",
                column: "SessionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeatureSelectionChangeHistories_StoreId",
                table: "FeatureSelectionChangeHistories",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_FeatureUsageLogs_StoreId",
                table: "FeatureUsageLogs",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_GDPRComplianceLogs_StoreId",
                table: "GDPRComplianceLogs",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_GDPRDeletionLogs_GDPRRequestId",
                table: "GDPRDeletionLogs",
                column: "GDPRRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_GDPRRequests_DueDate",
                table: "GDPRRequests",
                column: "DueDate");

            migrationBuilder.CreateIndex(
                name: "IX_GDPRRequests_IdempotencyKey",
                table: "GDPRRequests",
                column: "IdempotencyKey",
                unique: true,
                filter: "[IdempotencyKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GDPRRequests_ShopDomain_RequestType",
                table: "GDPRRequests",
                columns: new[] { "ShopDomain", "RequestType" });

            migrationBuilder.CreateIndex(
                name: "IX_GDPRRequests_Status",
                table: "GDPRRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_GDPRRequests_StoreId",
                table: "GDPRRequests",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_GDPRStatistics_Period_RequestType",
                table: "GDPRStatistics",
                columns: new[] { "Period", "RequestType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InstallationHistories_StoreId",
                table: "InstallationHistories",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyApps_ApiKey",
                table: "ShopifyApps",
                column: "ApiKey");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyApps_AppType",
                table: "ShopifyApps",
                column: "AppType");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyApps_IsActive",
                table: "ShopifyApps",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_StoreSubscriptions_PlanId",
                table: "StoreSubscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreSubscriptions_StoreId",
                table: "StoreSubscriptions",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_SyncCheckpoints_StoreId_DataType",
                table: "SyncCheckpoints",
                columns: new[] { "StoreId", "DataType" });

            migrationBuilder.CreateIndex(
                name: "IX_SyncHistories_StoreId_StartedAt",
                table: "SyncHistories",
                columns: new[] { "StoreId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_SyncProgressDetails_SyncStateId",
                table: "SyncProgressDetails",
                column: "SyncStateId");

            migrationBuilder.CreateIndex(
                name: "IX_SyncRangeSettings_StoreId_DataType",
                table: "SyncRangeSettings",
                columns: new[] { "StoreId", "DataType" });

            migrationBuilder.CreateIndex(
                name: "IX_SyncStates_StoreId_SyncType",
                table: "SyncStates",
                columns: new[] { "StoreId", "SyncType" });

            migrationBuilder.CreateIndex(
                name: "IX_UserFeatureSelections_StoreId",
                table: "UserFeatureSelections",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvents_IdempotencyKey",
                table: "WebhookEvents",
                column: "IdempotencyKey",
                unique: true,
                filter: "[IdempotencyKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvents_ShopDomain_Topic",
                table: "WebhookEvents",
                columns: new[] { "ShopDomain", "Topic" });

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvents_Status",
                table: "WebhookEvents",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WebhookEvents_StoreId",
                table: "WebhookEvents",
                column: "StoreId");

            migrationBuilder.AddForeignKey(
                name: "FK_Stores_ShopifyApps_ShopifyAppId",
                table: "Stores",
                column: "ShopifyAppId",
                principalTable: "ShopifyApps",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Stores_Tenants_TenantId",
                table: "Stores",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Stores_ShopifyApps_ShopifyAppId",
                table: "Stores");

            migrationBuilder.DropForeignKey(
                name: "FK_Stores_Tenants_TenantId",
                table: "Stores");

            migrationBuilder.DropTable(
                name: "AuthenticationLogs");

            migrationBuilder.DropTable(
                name: "DemoSessions");

            migrationBuilder.DropTable(
                name: "FeatureLimits");

            migrationBuilder.DropTable(
                name: "FeatureSelectionChangeHistories");

            migrationBuilder.DropTable(
                name: "FeatureUsageLogs");

            migrationBuilder.DropTable(
                name: "GDPRComplianceLogs");

            migrationBuilder.DropTable(
                name: "GDPRDeletionLogs");

            migrationBuilder.DropTable(
                name: "GDPRStatistics");

            migrationBuilder.DropTable(
                name: "InstallationHistories");

            migrationBuilder.DropTable(
                name: "ShopifyApps");

            migrationBuilder.DropTable(
                name: "StoreSubscriptions");

            migrationBuilder.DropTable(
                name: "SyncCheckpoints");

            migrationBuilder.DropTable(
                name: "SyncHistories");

            migrationBuilder.DropTable(
                name: "SyncProgressDetails");

            migrationBuilder.DropTable(
                name: "SyncRangeSettings");

            migrationBuilder.DropTable(
                name: "SyncStatuses");

            migrationBuilder.DropTable(
                name: "Tenants");

            migrationBuilder.DropTable(
                name: "UserFeatureSelections");

            migrationBuilder.DropTable(
                name: "WebhookEvents");

            migrationBuilder.DropTable(
                name: "GDPRRequests");

            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropTable(
                name: "SyncStates");

            migrationBuilder.DropIndex(
                name: "IX_Stores_ShopifyAppId",
                table: "Stores");

            migrationBuilder.DropIndex(
                name: "IX_Stores_TenantId",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "AccessToken",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ApiKey",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ApiSecret",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "DataType",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "InitialSetupCompleted",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "LastSyncDate",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "Scopes",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "Settings",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ShopifyAppId",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ShopifyVariantId",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "ShopifyProductId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FinancialStatus",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FulfillmentStatus",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShopifyCustomerId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShopifyOrderId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TotalTax",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ShopifyLineItemId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ShopifyProductId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "ShopifyVariantId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Customers");

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5957), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5961) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5963), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5964) });

            migrationBuilder.UpdateData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 1, 22, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5966), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5967) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6166), new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6167) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6177), new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6177) });

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6181), new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6181) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6086), new DateTime(2025, 7, 7, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6086) });

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6094), new DateTime(2025, 7, 14, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6095) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 5, 22, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6052), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6053) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 6, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6056), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6056) });

            migrationBuilder.UpdateData(
                table: "Products",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2025, 6, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6058), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(6059) });

            migrationBuilder.UpdateData(
                table: "Stores",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "CreatedAt", "UpdatedAt" },
                values: new object[] { new DateTime(2024, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5698), new DateTime(2025, 7, 21, 11, 36, 21, 476, DateTimeKind.Utc).AddTicks(5728) });
        }
    }
}
