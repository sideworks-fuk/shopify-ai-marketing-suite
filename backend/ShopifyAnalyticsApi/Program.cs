using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Middleware;
using ShopifyAnalyticsApi.HealthChecks;
using Serilog;
using Serilog.Events;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Serilogの設定
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.With(new LogEnricher())
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container.
builder.Services.AddControllers();

// Add Entity Framework
builder.Services.AddDbContext<ShopifyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Memory Cache
builder.Services.AddMemoryCache();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Mock Data Service
builder.Services.AddScoped<IMockDataService, MockDataService>();

// Register Database Service
builder.Services.AddScoped<IDatabaseService, DatabaseService>();

// Register Dormant Customer Service (休眠顧客分析サービス)
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.IDormantCustomerService, ShopifyAnalyticsApi.Services.DormantCustomerService>();

// Register New Dormant Services (新しい分割されたサービス)
builder.Services.AddScoped<ShopifyAnalyticsApi.Services.Dormant.IDormantCustomerQueryService, ShopifyAnalyticsApi.Services.Dormant.DormantCustomerQueryService>();

// Register Year Over Year Analysis Service (前年同月比分析サービス)
builder.Services.AddScoped<IYearOverYearService, YearOverYearService>();

// Register Purchase Count Analysis Service (購入回数分析サービス)
builder.Services.AddScoped<IPurchaseCountAnalysisService, PurchaseCountAnalysisService>();

// Register Monthly Sales Service (月別売上統計サービス)
builder.Services.AddScoped<IMonthlySalesService, MonthlySalesService>();

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
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Shopify Test API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();

// Use CORS
app.UseCors("AllowAll");

// グローバル例外ハンドラーを最初に配置
app.UseGlobalExceptionHandler();

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
    Log.Information("Starting Shopify Test API");
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
