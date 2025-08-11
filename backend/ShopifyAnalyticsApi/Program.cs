using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Middleware;
using ShopifyAnalyticsApi.HealthChecks;
using Serilog;
using Serilog.Events;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Serilogの設定
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.With(new LogEnricher())
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container.
builder.Services.AddControllers();

// HTTPクライアントファクトリーを追加（Shopify API呼び出し用）
builder.Services.AddHttpClient();

// JWT認証の設定
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured")))
        };
    });

// Add Entity Framework
builder.Services.AddDbContext<ShopifyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Memory Cache
builder.Services.AddMemoryCache();

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

// Register Token Service (トークンサービス)
builder.Services.AddScoped<ITokenService, TokenService>();

// Register Data Cleanup Service (データクリーンアップサービス)
builder.Services.AddScoped<IDataCleanupService, DataCleanupService>();

// Register Shopify Data Sync Service (Shopifyデータ同期サービス)
builder.Services.AddScoped<ShopifyApiService>();
builder.Services.AddScoped<ShopifyDataSyncService>();

// HttpClient Factory登録（Shopify API呼び出し用）
builder.Services.AddHttpClient();

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
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        httpContext => RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User?.Identity?.Name ?? "anonymous",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));
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
    // 本番環境でもSwaggerを有効にする（必要に応じて）
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EC Ranger API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();

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

// Use CORS
app.UseCors("AllowAll");

// グローバル例外ハンドラーを最初に配置
app.UseGlobalExceptionHandler();

// Shopify Webhook用のHMAC検証ミドルウェア
app.UseHmacValidation();

// Rate Limitingを有効化
app.UseRateLimiter();

// Shopify埋め込みアプリミドルウェア（認証前に配置）
app.UseShopifyEmbeddedApp();

// 認証を有効化
app.UseAuthentication();

// ストアコンテキストミドルウェア（認証後、承認前）
app.UseStoreContext();

app.UseAuthorization();

app.MapControllers();

// ヘルスチェックエンドポイントを追加
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

// データベース接続テストエンドポイントを追加
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

// 環境情報エンドポイントを追加
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
