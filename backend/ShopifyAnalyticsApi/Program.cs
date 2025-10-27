using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Net;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Middleware;
using ShopifyAnalyticsApi.Filters;
using ShopifyAnalyticsApi.HealthChecks;
using ShopifyAnalyticsApi.Authentication;
using Serilog;
using Serilog.Events;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Hangfire;
using Hangfire.SqlServer;
using ShopifyAnalyticsApi.Jobs;

var builder = WebApplication.CreateBuilder(args);

// Serilogの設定
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.With(new LogEnricher())
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container.
// グローバルフィルターとしてDemoReadOnlyFilterを追加
builder.Services.AddControllers(options =>
{
    options.Filters.Add<DemoReadOnlyFilter>(); // デモモードでの書き込み操作を制限
});

// HTTPクライアントファクトリーを追加（Shopify API呼び出し用）
builder.Services.AddHttpClient();

// 認証設定（カスタムミドルウェアで処理するため、JwtBearerは使用しない）
// ForwardedHeaders設定（リバースプロキシ対応）
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1; // 最初のプロキシのヘッダーのみを信頼
    
    // 本番環境: 設定から信頼するプロキシを読み込む
    var knownProxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>();
    if (knownProxies != null && knownProxies.Length > 0)
    {
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
        
        foreach (var proxy in knownProxies)
        {
            if (IPAddress.TryParse(proxy, out var ip))
            {
                options.KnownProxies.Add(ip);
                Log.Information("Added known proxy: {ProxyIP}", proxy);
            }
        }
    }
    else
    {
        // 開発環境またはAzure App Serviceのデフォルト動作
        // Azure App ServiceはX-Forwarded-Forを自動的に追加するため、全てを信頼
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
        Log.Warning("No known proxies configured - trusting all proxies (Development/Azure default)");
    }
});

// AuthModeMiddlewareがすべての認証を処理する
builder.Services.AddAuthentication("Custom")
    .AddScheme<AuthenticationSchemeOptions, CustomAuthenticationHandler>("Custom", options => { });
// 注: CustomAuthenticationHandlerは何もしない（AuthModeMiddlewareが処理済み）

// Add Entity Framework
builder.Services.AddDbContext<ShopifyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "EC Ranger API",
        Version = "v1",
        Description = "EC Ranger - Analytics API"
    });

    // JWT認証の設定
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Register Mock Data Service
builder.Services.AddScoped<IMockDataService, MockDataService>();

// Register Database Service
builder.Services.AddScoped<IDatabaseService, DatabaseService>();

// Register Shopify OAuth Service (ShopifySharpライブラリ使用)
builder.Services.AddScoped<ShopifyOAuthService>();

// Register Dormant Customer Service (休眠顧客分析サービス) - 新しいモジュラー版を使用
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantCustomerService, ShopifyAnalyticsApi.Services.Dormant.DormantCustomerService>();

// Register New Dormant Services (新しい分割されたサービス)
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantCustomerQueryService, ShopifyAnalyticsApi.Services.Dormant.DormantCustomerQueryService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IChurnAnalysisService, ShopifyAnalyticsApi.Services.Dormant.ChurnAnalysisService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantStatisticsService, ShopifyAnalyticsApi.Services.Dormant.DormantStatisticsService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantSegmentationService, ShopifyAnalyticsApi.Services.Dormant.DormantSegmentationService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantTrendAnalysisService, ShopifyAnalyticsApi.Services.Dormant.DormantTrendAnalysisService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantReactivationService, ShopifyAnalyticsApi.Services.Dormant.DormantReactivationService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantAnalyticsService, ShopifyAnalyticsApi.Services.Dormant.DormantAnalyticsService>();

// Register Year Over Year Analysis Service (前年同月比分析サービス)
builder.Services.AddScoped<IYearOverYearService, YearOverYearService>();

// Register New Year Over Year Services (新しい分割されたサービス)
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.YearOverYear.IYearOverYearDataService, ShopifyAnalyticsApi.Services.YearOverYear.YearOverYearDataService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.YearOverYear.IYearOverYearCalculationService, ShopifyAnalyticsApi.Services.YearOverYear.YearOverYearCalculationService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.YearOverYear.IYearOverYearFilterService, ShopifyAnalyticsApi.Services.YearOverYear.YearOverYearFilterService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.YearOverYear.IYearOverYearOrchestrationService, ShopifyAnalyticsApi.Services.YearOverYear.YearOverYearOrchestrationService>();

// Register Purchase Count Analysis Services (購入回数分析サービス)
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.PurchaseCount.IPurchaseCountDataService, ShopifyAnalyticsApi.Services.PurchaseCount.PurchaseCountDataService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.PurchaseCount.IPurchaseCountCalculationService, ShopifyAnalyticsApi.Services.PurchaseCount.PurchaseCountCalculationService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.PurchaseCount.IPurchaseCountAnalysisService, ShopifyAnalyticsApi.Services.PurchaseCount.PurchaseCountAnalysisService>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.PurchaseCount.IPurchaseCountOrchestrationService, ShopifyAnalyticsApi.Services.PurchaseCount.PurchaseCountOrchestrationService>();

// Register legacy Purchase Count Analysis Service for backward compatibility
builder.Services.AddScoped<IPurchaseCountAnalysisService, PurchaseCountAnalysisService>();

// Register Monthly Sales Service (月別売上統計サービス)
builder.Services.AddScoped<IMonthlySalesService, MonthlySalesService>();

// Register Store Service (ストア管理サービス)
builder.Services.AddScoped<IStoreService, StoreService>();

// Register Feature Selection Service (無料プラン機能選択サービス)
builder.Services.AddScoped<IFeatureSelectionService, FeatureSelectionService>();

// Register Token Service (トークンサービス)
builder.Services.AddScoped<ITokenService, TokenService>();

// Register Data Cleanup Service (データクリーンアップサービス)
builder.Services.AddScoped<IDataCleanupService, DataCleanupService>();

// Register GDPR Service (GDPR準拠サービス)
builder.Services.AddScoped<IGDPRService, GDPRService>();

// Register Shopify Data Sync Service (Shopifyデータ同期サービス)
builder.Services.AddScoped<ShopifyApiService>();
builder.Services.AddScoped<ShopifyDataSyncService>();

// Register Subscription Service (サブスクリプション管理サービス)
builder.Services.AddScoped<ISubscriptionService, ShopifySubscriptionService>();

// Register Sync Management Services (同期管理サービス)
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Sync.ICheckpointManager, ShopifyAnalyticsApi.Services.Sync.CheckpointManager>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Sync.ISyncRangeManager, ShopifyAnalyticsApi.Services.Sync.SyncRangeManager>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Sync.ISyncProgressTracker, ShopifyAnalyticsApi.Services.Sync.SyncProgressTracker>();

// Register Shopify Sync Jobs (Shopify同期ジョブ)
builder.Services.AddScoped<ShopifyAnalyticsApi.Jobs.ShopifyProductSyncJob>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Jobs.ShopifyCustomerSyncJob>();
builder.Services.AddScoped<ShopifyAnalyticsApi.Jobs.ShopifyOrderSyncJob>();

// Register Authentication Services (認証サービス)
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.IAuthenticationService, ShopifyAnalyticsApi.Services.AuthenticationService>();
builder.Services.AddScoped<IDemoAuthService, DemoAuthService>();
builder.Services.AddScoped<IRateLimiter, ShopifyAnalyticsApi.Services.RateLimiter>();

// Redis Cache Configuration
var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConnectionString) && !redisConnectionString.Contains("#"))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnectionString;
        options.InstanceName = builder.Configuration["Redis:InstanceName"] ?? "ShopifyAnalyticsApi";
    });
    Log.Information("Redis cache configured with connection string");
}
else
{
    // 本番環境ではRedis必須
    if (builder.Environment.IsProduction())
    {
        throw new InvalidOperationException(
            "CRITICAL: Redis connection string is required in production environment");
    }
    
    builder.Services.AddDistributedMemoryCache();
    builder.Services.AddMemoryCache(); // IMemoryCacheも必要な場合のため
    Log.Warning("Redis connection string not configured - using distributed memory cache (Development only)");
}

// HttpClient Factory登録（Shopify API呼び出し用）
builder.Services.AddHttpClient();

builder.Services.AddHttpContextAccessor();

// HangFire設定
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(Hangfire.CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("DefaultConnection"), new Hangfire.SqlServer.SqlServerStorageOptions
    {
        CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
        QueuePollInterval = TimeSpan.Zero,
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks = true
    }));

// HangFireサーバー設定（安全側: 並列1）
builder.Services.AddHangfireServer(options =>
{
    options.ServerName = "EC-Ranger-Server";
    options.WorkerCount = 1;
});

// KeepAliveサービス登録（Azure App Service対策）
builder.Services.AddHostedService<KeepAliveService>();

// Application Insights接続文字列の環境変数対応
var aiConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
if (string.IsNullOrEmpty(aiConnectionString) || aiConnectionString?.Contains("#") == true)
{
    aiConnectionString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");
}

if (!string.IsNullOrEmpty(aiConnectionString))
{
    try
    {
        builder.Services.AddApplicationInsightsTelemetry(options =>
        {
            options.ConnectionString = aiConnectionString;
        });
        Log.Information("Application Insights configured with connection string");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Failed to configure Application Insights - continuing without telemetry");
    }
}
else
{
    Log.Warning("Application Insights connection string not configured - continuing without telemetry");
}

// Add Azure App Service Logging
builder.Services.AddLogging(loggingBuilder =>
{
    loggingBuilder.AddAzureWebAppDiagnostics();
});

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ShopifyDbContext>("Database")
    .AddCheck<DatabaseHealthCheck>("DatabaseDetailed", tags: new[] { "ready" });

// Add CORS - 環境別の設定
builder.Services.AddCors(options =>
{
    var environment = builder.Environment.EnvironmentName;
    var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new string[0];
    
    if (environment == "Development")
    {
        // 開発環境: 緩い設定
        options.AddPolicy("AllowAll", policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    }
    else
    {
        // 本番環境: 設定ファイルから読み込み
        options.AddPolicy("AllowAll", policy =>
        {
            if (corsOrigins.Length > 0)
            {
                policy.WithOrigins(corsOrigins)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
            else
            {
                // フォールバック: デフォルトの本番URL
                policy.WithOrigins("https://brave-sea-038f17a00.1.azurestaticapps.net")
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
        });
    }
});

// Rate Limiting設定
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests; // 標準的な429ステータスコード
    
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        httpContext => 
        {
            // 認証済みユーザー: 複合キー（ユーザーID + ストアドメイン）でパーティション分け（200回/分）
            if (httpContext.User?.Identity?.IsAuthenticated == true)
            {
                // ユーザーIDを取得（NameIdentifierまたはsub）
                var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                             ?? httpContext.User.FindFirst("sub")?.Value;
                
                // ストアドメインを取得（destまたはiss）
                var storeDomain = httpContext.User.FindFirst("dest")?.Value
                                 ?? httpContext.User.FindFirst("iss")?.Value;
                
                // 複合キーを作成（ユーザーIDとストアドメインの組み合わせ）
                string partitionKey;
                if (!string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(storeDomain))
                {
                    // ドメインを正規化（https://プレフィックスやパスを除去）
                    var normalizedDomain = storeDomain;
                    try
                    {
                        var uri = new Uri(storeDomain);
                        normalizedDomain = uri.Host;
                    }
                    catch
                    {
                        normalizedDomain = storeDomain.Replace("https://", "").Replace("http://", "").Split('/')[0];
                    }
                    
                    partitionKey = $"user-{userId}-{normalizedDomain}";
                }
                else
                {
                    // フォールバック: IPアドレスを使用
                    var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    partitionKey = $"authenticated-ip-{clientIp}";
                }
                
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: partitionKey,
                    factory: partition => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 200, // 認証済みユーザーはより高い制限
                        Window = TimeSpan.FromMinutes(1)
                    });
            }
            
            // 匿名ユーザーはIPアドレスでパーティション分け（DoS攻撃対策）
            var anonymousIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: $"anonymous-{anonymousIp}",
                factory: partition => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = 50, // 匿名ユーザーはより低い制限
                    Window = TimeSpan.FromMinutes(1)
                });
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // 本番環境ではSwaggerを無効化（セキュリティ上の理由）
    Log.Information("Swagger disabled in production environment for security");
}

app.UseHttpsRedirection();

// HangFireダッシュボード設定
app.UseHangfireDashboard("/hangfire", new Hangfire.DashboardOptions
{
    Authorization = new[] { new ShopifyAnalyticsApi.Filters.HangfireAuthorizationFilter() },
    DashboardTitle = "EC Ranger - Job Dashboard"
});

// GDPR: pending処理の定期実行（*/5分）
RecurringJob.AddOrUpdate<GdprProcessingJob>(
    "gdpr-process-pending",
    job => job.ProcessPendingRequests(),
    "*/5 * * * *");

// セキュリティヘッダーを追加
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    // Shopify iframe埋め込み対応: X-Frame-Optionsを削除し、CSPで制御
    // context.Response.Headers.Add("X-Frame-Options", "DENY");
    context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Add("Strict-Transport-Security", "max-age=31536000");
    
    // Shopify iframe埋め込み対応: CSPヘッダー追加
    context.Response.Headers.Add("Content-Security-Policy", 
        "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
    
    await next();
});

// ForwardedHeadersを有効化（リバースプロキシ対応）
app.UseForwardedHeaders();

// Use CORS
app.UseCors("AllowAll");

// グローバル例外ハンドラーを最初に配置
app.UseGlobalExceptionHandler();

// Shopify Webhook用のHMAC検証ミドルウェア
app.UseHmacValidation();

// Shopify埋め込みアプリミドルウェア（認証前に配置）
app.UseShopifyEmbeddedApp();

// デモモードミドルウェア（認証前に配置）
app.UseDemoMode();

// 認証モード制御ミドルウェア（認証処理の統合制御）
app.UseAuthModeMiddleware();

// 認証を有効化
app.UseAuthentication();

// Rate Limitingを有効化（認証後に配置してユーザー別にパーティション分け）
app.UseRateLimiter();

// ストアコンテキストミドルウェア（認証後、承認前）
app.UseStoreContext();

// 機能アクセス制御ミドルウェア（ストアコンテキスト後、承認前）
app.UseFeatureAccess();

app.UseAuthorization();

app.MapControllers();

// ヘルスチェックエンドポイントを追加
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

// 開発環境専用エンドポイント
if (app.Environment.IsDevelopment())
{
    // データベース接続テストエンドポイント
    app.MapGet("/db-test", async (ShopifyDbContext context) =>
    {
        try
        {
            var canConnect = await context.Database.CanConnectAsync();
            return Results.Ok(new { success = canConnect, message = canConnect ? "Connected" : "Failed" });
        }
        catch (Exception ex)
        {
            return Results.Ok(new { success = false, message = ex.Message });
        }
    });

    // 環境情報エンドポイント
    app.MapGet("/env-info", () =>
    {
        return Results.Ok(new
        {
            environment = app.Environment.EnvironmentName,
            isDevelopment = app.Environment.IsDevelopment(),
            applicationName = app.Environment.ApplicationName,
            contentRootPath = app.Environment.ContentRootPath,
            webRootPath = app.Environment.WebRootPath
        });
    });
}

// 起動時の環境設定検証
try
{
    var authMode = app.Configuration["Authentication:Mode"];
    var environment = app.Environment.EnvironmentName;

    Log.Information("Starting application with Environment: {Environment}, AuthMode: {AuthMode}", 
        environment, authMode);

    // 本番環境での必須チェック
    if (environment == "Production")
    {
        // 認証モードチェック
        if (authMode != "OAuthRequired")
        {
            throw new InvalidOperationException(
                $"SECURITY: Production environment must use OAuthRequired mode, but '{authMode}' is configured. " +
                "This is a critical security requirement.");
        }

        // 必須環境変数チェック
        var requiredSettings = new[]
        {
            ("Shopify:ApiKey", app.Configuration["Shopify:ApiKey"]),
            ("Shopify:ApiSecret", app.Configuration["Shopify:ApiSecret"]),
            ("ConnectionStrings:DefaultConnection", app.Configuration.GetConnectionString("DefaultConnection"))
        };

        // JwtSecretはDemoAllowed/AllAllowedモードでのみ必須
        if (authMode == "DemoAllowed" || authMode == "AllAllowed")
        {
            requiredSettings = requiredSettings.Concat(new[]
            {
                ("Authentication:JwtSecret", app.Configuration["Authentication:JwtSecret"])
            }).ToArray();
        }

        // Redis設定チェック（Session:StorageTypeがRedisの場合）
        var sessionStorageType = app.Configuration["Session:StorageType"];
        if (sessionStorageType == "Redis")
        {
            var redisConnString = app.Configuration.GetConnectionString("Redis");
            if (string.IsNullOrEmpty(redisConnString) || redisConnString.Contains("#"))
            {
                throw new InvalidOperationException(
                    "SECURITY: Redis is configured as session storage but connection string is not set. " +
                    "Production environment requires Redis for session management.");
            }
        }

        foreach (var (key, value) in requiredSettings)
        {
            if (string.IsNullOrEmpty(value) || value.Contains("#"))
            {
                throw new InvalidOperationException(
                    $"SECURITY: Required configuration '{key}' is not set or contains placeholder. " +
                    "Production environment requires all secrets to be properly configured.");
            }
        }

        Log.Information("✅ Production environment validation passed");
    }
    else
    {
        Log.Information("ℹ️ Non-production environment: {Environment}", environment);
    }
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application startup validation failed");
    throw;
}

try
{
    Log.Information("Starting EC Ranger API");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// テスト用にProgramクラスをpublicにする
public partial class Program { }
