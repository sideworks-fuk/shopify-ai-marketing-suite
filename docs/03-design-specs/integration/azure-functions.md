# Shopify Azure Functions バッチ処理システム - 詳細設計書

## 1. システム概要

### 1.1 目的
Shopify APIから定期的にデータを取得し、AIマーケティングスイートのデータベースに同期するバッチ処理システムを Azure Functions で実装する。

### 1.2 対象データ
- 顧客データ（Customers）
- 商品データ（Products + Variants）
- 注文データ（Orders + OrderItems）

### 1.3 アーキテクチャ
```
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   Shopify API   │◄───│  Azure Functions    │────► Azure SQL DB   │
│   (REST API)    │    │  Timer Triggered    │    │  (既存DB)       │
└─────────────────┘    └─────────────────────┘    └─────────────────┘
                              │                           ▲
                              ▼                           │
                       ┌─────────────────────┐            │
                       │  Application        │            │
                       │  Insights           │            │
                       │  (監視・ログ)       │            │
                       └─────────────────────┘            │
                                                          │
                       ┌─────────────────────┐            │
                       │  Azure Key Vault    │            │
                       │  (APIキー管理)      │            │
                       └─────────────────────┘            │
                                                          │
                       ┌─────────────────────┐            │
                       │  ShopifyTestApi     │────────────┘
                       │  (Web API)          │
                       └─────────────────────┘
```

## 2. プロジェクト構成

### 2.1 フォルダ構造
```
backend/ShopifyBatchProcessor/
├── Functions/
│   ├── CustomerSyncFunction.cs
│   ├── ProductSyncFunction.cs
│   ├── OrderSyncFunction.cs
│   └── ManualSyncFunction.cs
├── Services/
│   ├── Interfaces/
│   │   ├── IShopifyApiClient.cs
│   │   ├── IDataSyncService.cs
│   │   └── ISyncStateService.cs
│   ├── ShopifyApiClient.cs
│   ├── CustomerSyncService.cs
│   ├── ProductSyncService.cs
│   ├── OrderSyncService.cs
│   └── SyncStateService.cs
├── Models/
│   ├── Shopify/
│   │   ├── ShopifyCustomer.cs
│   │   ├── ShopifyProduct.cs
│   │   └── ShopifyOrder.cs
│   ├── Api/
│   │   ├── ShopifyApiResponse.cs
│   │   └── SyncResult.cs
│   └── Configuration/
│       ├── ShopifySettings.cs
│       └── SyncSettings.cs
├── Extensions/
│   ├── ServiceCollectionExtensions.cs
│   └── HttpClientExtensions.cs
├── Utilities/
│   ├── RetryPolicy.cs
│   ├── RateLimitHandler.cs
│   └── DataMapper.cs
├── Program.cs
├── host.json
├── local.settings.json
└── ShopifyBatchProcessor.csproj
```

### 2.2 プロジェクトファイル
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
    <OutputType>Exe</OutputType>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.21.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.16.4" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Timer" Version="4.3.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.1.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.7" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="8.0.0" />
    <PackageReference Include="Microsoft.ApplicationInsights.WorkerService" Version="2.22.0" />
    <PackageReference Include="Azure.Security.KeyVault.Secrets" Version="4.5.0" />
    <PackageReference Include="Azure.Identity" Version="1.10.4" />
    <PackageReference Include="Serilog.Extensions.Hosting" Version="8.0.0" />
    <PackageReference Include="Serilog.Sinks.ApplicationInsights" Version="4.0.0" />
    <PackageReference Include="Serilog.Sinks.Console" Version="5.0.1" />
    <PackageReference Include="System.Text.Json" Version="8.0.0" />
    <PackageReference Include="Polly" Version="8.2.0" />
  </ItemGroup>
  
  <ItemGroup>
    <ProjectReference Include="../ShopifyTestApi/ShopifyTestApi.csproj" />
  </ItemGroup>
  
  <ItemGroup>
    <None Update="host.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="local.settings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>
</Project>
```

## 3. 設定ファイル

### 3.1 host.json
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    },
    "logLevel": {
      "default": "Information",
      "ShopifyBatchProcessor": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  },
  "functionTimeout": "00:10:00",
  "retry": {
    "strategy": "exponentialBackoff",
    "maxRetryCount": 3,
    "minimumInterval": "00:00:02",
    "maximumInterval": "00:00:30"
  },
  "healthMonitor": {
    "enabled": true,
    "healthCheckInterval": "00:00:30",
    "healthCheckWindow": "00:02:00",
    "healthCheckThreshold": 6,
    "counterThreshold": 0.80
  }
}
```

### 3.2 local.settings.json (開発環境)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "ConnectionStrings:DefaultConnection": "Server=localhost;Database=ShopifyAI;Integrated Security=true;TrustServerCertificate=true;",
    "Shopify:ShopDomain": "your-shop-name.myshopify.com",
    "Shopify:AccessToken": "your-access-token-here",
    "Shopify:ApiVersion": "2023-10",
    "Shopify:RateLimit:RequestsPerSecond": "2",
    "Shopify:RateLimit:BurstSize": "10",
    "ApplicationInsights:ConnectionString": "your-app-insights-connection-string",
    "KeyVault:VaultUrl": "https://your-keyvault.vault.azure.net/",
    "Sync:BatchSize": "250",
    "Sync:MaxConcurrentBatches": "2",
    "Sync:EnableIncrementalSync": "true",
    "Sync:CustomerSyncSchedule": "0 0 */2 * * *",
    "Sync:ProductSyncSchedule": "0 30 */4 * * *",
    "Sync:OrderSyncSchedule": "0 15 */1 * * *"
  }
}
```

## 4. コア実装

### 4.1 Program.cs
```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using ShopifyBatchProcessor.Services;
using ShopifyBatchProcessor.Services.Interfaces;
using ShopifyBatchProcessor.Models.Configuration;
using ShopifyBatchProcessor.Extensions;
using ShopifyTestApi.Data;
using Serilog;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(builder =>
    {
        builder.UseMiddleware<ExceptionHandlingMiddleware>();
    })
    .ConfigureAppConfiguration((context, config) =>
    {
        // Key Vault設定（本番環境）
        if (!context.HostingEnvironment.IsDevelopment())
        {
            var keyVaultUrl = Environment.GetEnvironmentVariable("KeyVault:VaultUrl");
            if (!string.IsNullOrEmpty(keyVaultUrl))
            {
                config.AddAzureKeyVault(
                    new Uri(keyVaultUrl),
                    new DefaultAzureCredential());
            }
        }
    })
    .ConfigureServices((context, services) =>
    {
        var configuration = context.Configuration;
        
        // 設定の登録
        services.Configure<ShopifySettings>(
            configuration.GetSection("Shopify"));
        services.Configure<SyncSettings>(
            configuration.GetSection("Sync"));
        
        // データベース設定
        services.AddDbContext<ShopifyDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.CommandTimeout(300); // 5分
                sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorNumbersToAdd: null);
            });
        });
        
        // HTTP クライアント設定
        services.AddHttpClient<IShopifyApiClient, ShopifyApiClient>()
            .AddPolicyHandler(HttpClientExtensions.GetRetryPolicy())
            .AddPolicyHandler(HttpClientExtensions.GetCircuitBreakerPolicy());
        
        // サービス登録
        services.AddScoped<IDataSyncService, DataSyncService>();
        services.AddScoped<ICustomerSyncService, CustomerSyncService>();
        services.AddScoped<IProductSyncService, ProductSyncService>();
        services.AddScoped<IOrderSyncService, OrderSyncService>();
        services.AddScoped<ISyncStateService, SyncStateService>();
        
        // ユーティリティ
        services.AddSingleton<DataMapper>();
        services.AddSingleton<RateLimitHandler>();
        
        // Application Insights
        services.AddApplicationInsightsTelemetryWorkerService(options =>
        {
            options.ConnectionString = configuration["ApplicationInsights:ConnectionString"];
        });
        
        // Serilog設定
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .Enrich.WithProperty("Service", "ShopifyBatchProcessor")
            .CreateLogger();
        
        services.AddLogging(loggingBuilder =>
            loggingBuilder.AddSerilog(dispose: true));
    })
    .UseSerilog()
    .Build();

await host.RunAsync();
```

### 4.2 Shopify APIクライアント
```csharp
// Services/Interfaces/IShopifyApiClient.cs
public interface IShopifyApiClient
{
    Task<ShopifyApiResponse<List<ShopifyCustomer>>> GetCustomersAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null,
        CancellationToken cancellationToken = default);
    
    Task<ShopifyApiResponse<List<ShopifyProduct>>> GetProductsAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null,
        CancellationToken cancellationToken = default);
    
    Task<ShopifyApiResponse<List<ShopifyOrder>>> GetOrdersAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null,
        CancellationToken cancellationToken = default);
}

// Services/ShopifyApiClient.cs
public class ShopifyApiClient : IShopifyApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ShopifySettings _settings;
    private readonly RateLimitHandler _rateLimitHandler;
    private readonly ILogger<ShopifyApiClient> _logger;
    
    public ShopifyApiClient(
        HttpClient httpClient,
        IOptions<ShopifySettings> settings,
        RateLimitHandler rateLimitHandler,
        ILogger<ShopifyApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _rateLimitHandler = rateLimitHandler;
        _logger = logger;
        
        ConfigureHttpClient();
    }
    
    private void ConfigureHttpClient()
    {
        _httpClient.BaseAddress = new Uri($"https://{_settings.ShopDomain}/admin/api/{_settings.ApiVersion}/");
        _httpClient.DefaultRequestHeaders.Add("X-Shopify-Access-Token", _settings.AccessToken);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ShopifyBatchProcessor/1.0");
        _httpClient.Timeout = TimeSpan.FromMinutes(2);
    }
    
    public async Task<ShopifyApiResponse<List<ShopifyCustomer>>> GetCustomersAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _rateLimitHandler.WaitIfNeededAsync(cancellationToken);
            
            var queryParams = BuildQueryParameters(limit, updatedAtMin, pageInfo);
            var requestUrl = $"customers.json?{queryParams}";
            
            _logger.LogDebug("Requesting customers: {Url}", requestUrl);
            
            var response = await _httpClient.GetAsync(requestUrl, cancellationToken);
            
            _rateLimitHandler.UpdateRateLimit(response.Headers);
            
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(2);
                await Task.Delay(retryAfter, cancellationToken);
                return await GetCustomersAsync(updatedAtMin, limit, pageInfo, cancellationToken);
            }
            
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var apiResponse = JsonSerializer.Deserialize<ShopifyCustomersResponse>(content);
            
            var result = new ShopifyApiResponse<List<ShopifyCustomer>>
            {
                Data = apiResponse?.Customers ?? new List<ShopifyCustomer>(),
                PageInfo = ExtractPageInfo(response.Headers),
                IsSuccess = true,
                RateLimitRemaining = _rateLimitHandler.RemainingCalls
            };
            
            _logger.LogInformation("Retrieved {Count} customers, Page Info: {PageInfo}", 
                result.Data.Count, result.PageInfo);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get customers from Shopify API");
            return new ShopifyApiResponse<List<ShopifyCustomer>>
            {
                Data = new List<ShopifyCustomer>(),
                IsSuccess = false,
                ErrorMessage = ex.Message
            };
        }
    }
    
    private string BuildQueryParameters(int limit, DateTime? updatedAtMin, string? pageInfo)
    {
        var parameters = new List<string> { $"limit={limit}" };
        
        if (updatedAtMin.HasValue)
            parameters.Add($"updated_at_min={updatedAtMin.Value:yyyy-MM-ddTHH:mm:ssZ}");
        
        if (!string.IsNullOrEmpty(pageInfo))
            parameters.Add($"page_info={pageInfo}");
        
        return string.Join("&", parameters);
    }
    
    private string? ExtractPageInfo(HttpResponseHeaders headers)
    {
        if (headers.TryGetValues("Link", out var linkHeaders))
        {
            var linkHeader = linkHeaders.FirstOrDefault();
            if (!string.IsNullOrEmpty(linkHeader))
            {
                var nextMatch = Regex.Match(linkHeader, @"<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel=""next""");
                return nextMatch.Success ? nextMatch.Groups[1].Value : null;
            }
        }
        return null;
    }
}
```

### 4.3 顧客同期サービス
```csharp
// Services/Interfaces/ICustomerSyncService.cs
public interface ICustomerSyncService
{
    Task<SyncResult> SyncAsync(int storeId, CancellationToken cancellationToken = default);
}

// Services/CustomerSyncService.cs
public class CustomerSyncService : ICustomerSyncService
{
    private readonly IShopifyApiClient _apiClient;
    private readonly ShopifyDbContext _dbContext;
    private readonly ISyncStateService _syncStateService;
    private readonly DataMapper _dataMapper;
    private readonly SyncSettings _syncSettings;
    private readonly ILogger<CustomerSyncService> _logger;
    
    public CustomerSyncService(
        IShopifyApiClient apiClient,
        ShopifyDbContext dbContext,
        ISyncStateService syncStateService,
        DataMapper dataMapper,
        IOptions<SyncSettings> syncSettings,
        ILogger<CustomerSyncService> logger)
    {
        _apiClient = apiClient;
        _dbContext = dbContext;
        _syncStateService = syncStateService;
        _dataMapper = dataMapper;
        _syncSettings = syncSettings.Value;
        _logger = logger;
    }
    
    public async Task<SyncResult> SyncAsync(int storeId, CancellationToken cancellationToken = default)
    {
        var syncResult = new SyncResult("Customers", storeId);
        
        try
        {
            var lastSyncTime = await _syncStateService.GetLastSyncTimeAsync(storeId, "customers");
            
            _logger.LogInformation("開始: 顧客データ同期 - Store: {StoreId}, LastSync: {LastSyncTime}", 
                storeId, lastSyncTime);
            
            string? pageInfo = null;
            var batchCount = 0;
            
            do
            {
                var response = await _apiClient.GetCustomersAsync(
                    lastSyncTime, 
                    _syncSettings.BatchSize, 
                    pageInfo, 
                    cancellationToken);
                
                if (!response.IsSuccess)
                {
                    syncResult.AddError($"API呼び出し失敗: {response.ErrorMessage}");
                    break;
                }
                
                if (response.Data.Any())
                {
                    var processedCount = await ProcessCustomerBatch(storeId, response.Data, cancellationToken);
                    syncResult.AddProcessed(processedCount);
                    
                    _logger.LogDebug("バッチ {BatchCount} 処理完了: {ProcessedCount}件", 
                        ++batchCount, processedCount);
                }
                
                pageInfo = response.PageInfo;
                
                // レート制限とメモリ使用量を考慮した待機
                if (!string.IsNullOrEmpty(pageInfo))
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(500), cancellationToken);
                    
                    // メモリ使用量を抑えるためのガベージコレクション
                    if (batchCount % 10 == 0)
                    {
                        GC.Collect();
                        GC.WaitForPendingFinalizers();
                    }
                }
                
            } while (!string.IsNullOrEmpty(pageInfo) && !cancellationToken.IsCancellationRequested);
            
            if (!cancellationToken.IsCancellationRequested)
            {
                await _syncStateService.UpdateLastSyncTimeAsync(storeId, "customers", DateTime.UtcNow);
                syncResult.MarkAsCompleted();
                
                _logger.LogInformation("完了: 顧客データ同期 - 処理件数: {ProcessedCount}, エラー: {ErrorCount}", 
                    syncResult.ProcessedCount, syncResult.ErrorCount);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("顧客データ同期がキャンセルされました - Store: {StoreId}", storeId);
            syncResult.AddError("同期処理がキャンセルされました");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客データ同期エラー - Store: {StoreId}", storeId);
            syncResult.AddError($"予期しないエラー: {ex.Message}");
        }
        
        return syncResult;
    }
    
    private async Task<int> ProcessCustomerBatch(int storeId, List<ShopifyCustomer> customers, CancellationToken cancellationToken)
    {
        var processedCount = 0;
        var customerIds = customers.Select(c => c.Id.ToString()).ToList();
        
        // 既存顧客の一括取得
        var existingCustomers = await _dbContext.Customers
            .Where(c => c.StoreId == storeId && customerIds.Contains(c.ShopifyCustomerId))
            .ToDictionaryAsync(c => c.ShopifyCustomerId!, cancellationToken);
        
        var customersToAdd = new List<Customer>();
        var customersToUpdate = new List<Customer>();
        
        foreach (var shopifyCustomer in customers)
        {
            try
            {
                var shopifyCustomerId = shopifyCustomer.Id.ToString();
                
                if (existingCustomers.TryGetValue(shopifyCustomerId, out var existingCustomer))
                {
                    // 既存顧客の更新
                    _dataMapper.MapShopifyCustomerToEntity(shopifyCustomer, existingCustomer);
                    existingCustomer.UpdatedAt = DateTime.UtcNow;
                    customersToUpdate.Add(existingCustomer);
                }
                else
                {
                    // 新規顧客の作成
                    var newCustomer = new Customer
                    {
                        StoreId = storeId,
                        ShopifyCustomerId = shopifyCustomerId,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    _dataMapper.MapShopifyCustomerToEntity(shopifyCustomer, newCustomer);
                    customersToAdd.Add(newCustomer);
                }
                
                processedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客データ処理エラー - CustomerId: {CustomerId}", shopifyCustomer.Id);
            }
        }
        
        // バルク操作
        if (customersToAdd.Any())
        {
            _dbContext.Customers.AddRange(customersToAdd);
        }
        
        await _dbContext.SaveChangesAsync(cancellationToken);
        
        // メモリ使用量削減のためのDetach処理
        foreach (var customer in customersToAdd.Concat(customersToUpdate))
        {
            _dbContext.Entry(customer).State = EntityState.Detached;
        }
        
        return processedCount;
    }
}
```

### 4.4 Azure Functions
```csharp
// Functions/CustomerSyncFunction.cs
[Function("CustomerSyncTimer")]
public class CustomerSyncFunction
{
    private readonly ICustomerSyncService _customerSyncService;
    private readonly ILogger<CustomerSyncFunction> _logger;
    
    public CustomerSyncFunction(
        ICustomerSyncService customerSyncService,
        ILogger<CustomerSyncFunction> logger)
    {
        _customerSyncService = customerSyncService;
        _logger = logger;
    }
    
    [Function("CustomerSyncTimer")]
    public async Task RunTimer(
        [TimerTrigger("%Sync:CustomerSyncSchedule%")] TimerInfo timer,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("顧客データ同期タイマー開始: {Time}", DateTime.UtcNow);
        
        try
        {
            // 設定からストアID一覧を取得（実装では設定から動的に取得）
            var storeIds = new[] { 1 };
            
            var tasks = storeIds.Select(storeId => 
                ProcessStoreAsync(storeId, cancellationToken)).ToArray();
            
            await Task.WhenAll(tasks);
            
            _logger.LogInformation("顧客データ同期タイマー完了: {Time}", DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客データ同期タイマーでエラーが発生しました");
            throw;
        }
    }
    
    [Function("CustomerSyncManual")]
    public async Task<HttpResponseData> RunManual(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("顧客データ手動同期開始");
        
        try
        {
            var storeIds = new[] { 1 };
            var results = new List<object>();
            
            foreach (var storeId in storeIds)
            {
                var result = await _customerSyncService.SyncAsync(storeId, cancellationToken);
                results.Add(new
                {
                    StoreId = storeId,
                    Success = result.IsSuccess,
                    ProcessedCount = result.ProcessedCount,
                    ErrorCount = result.ErrorCount,
                    Errors = result.Errors,
                    Duration = result.Duration
                });
            }
            
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(results, cancellationToken);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客データ手動同期でエラーが発生しました");
            
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteAsJsonAsync(new { error = ex.Message }, cancellationToken);
            return errorResponse;
        }
    }
    
    private async Task ProcessStoreAsync(int storeId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _customerSyncService.SyncAsync(storeId, cancellationToken);
            
            if (result.IsSuccess)
            {
                _logger.LogInformation("顧客同期成功 - Store: {StoreId}, 処理件数: {ProcessedCount}, 時間: {Duration}", 
                    storeId, result.ProcessedCount, result.Duration);
            }
            else
            {
                _logger.LogError("顧客同期失敗 - Store: {StoreId}, エラー件数: {ErrorCount}, エラー内容: {Errors}", 
                    storeId, result.ErrorCount, string.Join("; ", result.Errors));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ストア {StoreId} の顧客同期処理でエラーが発生しました", storeId);
        }
    }
}
```

## 5. エラーハンドリング・監視

### 5.1 カスタム例外ミドルウェア
```csharp
// Middleware/ExceptionHandlingMiddleware.cs
public class ExceptionHandlingMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    
    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger)
    {
        _logger = logger;
    }
    
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Function {FunctionName} で未処理例外が発生しました", 
                context.FunctionDefinition.Name);
            
            // Application Insights用のカスタムプロパティ
            var telemetryProperties = new Dictionary<string, string>
            {
                ["FunctionName"] = context.FunctionDefinition.Name,
                ["InvocationId"] = context.InvocationId,
                ["ExceptionType"] = ex.GetType().Name
            };
            
            // 必要に応じてアラート送信やSlack通知など
            await NotifyErrorAsync(ex, telemetryProperties);
            
            throw; // 元の例外を再スロー
        }
    }
    
    private async Task NotifyErrorAsync(Exception ex, Dictionary<string, string> properties)
    {
        // 実装例: 重要なエラーの場合はSlackやTeams通知
        // await _notificationService.SendErrorNotificationAsync(ex, properties);
    }
}
```

### 5.2 レート制限ハンドラー
```csharp
// Utilities/RateLimitHandler.cs
public class RateLimitHandler
{
    private readonly SemaphoreSlim _semaphore;
    private readonly int _requestsPerSecond;
    private DateTime _lastRequestTime = DateTime.MinValue;
    private int _remainingCalls = int.MaxValue;
    private readonly ILogger<RateLimitHandler> _logger;
    
    public RateLimitHandler(IOptions<ShopifySettings> settings, ILogger<RateLimitHandler> logger)
    {
        _requestsPerSecond = settings.Value.RateLimit.RequestsPerSecond;
        _semaphore = new SemaphoreSlim(1, 1);
        _logger = logger;
    }
    
    public int RemainingCalls => _remainingCalls;
    
    public async Task WaitIfNeededAsync(CancellationToken cancellationToken = default)
    {
        await _semaphore.WaitAsync(cancellationToken);
        
        try
        {
            var now = DateTime.UtcNow;
            var timeSinceLastRequest = now - _lastRequestTime;
            var minInterval = TimeSpan.FromSeconds(1.0 / _requestsPerSecond);
            
            if (timeSinceLastRequest < minInterval)
            {
                var waitTime = minInterval - timeSinceLastRequest;
                _logger.LogDebug("レート制限のため {WaitMs}ms 待機します", waitTime.TotalMilliseconds);
                await Task.Delay(waitTime, cancellationToken);
            }
            
            _lastRequestTime = DateTime.UtcNow;
        }
        finally
        {
            _semaphore.Release();
        }
    }
    
    public void UpdateRateLimit(HttpResponseHeaders headers)
    {
        if (headers.TryGetValues("X-Shopify-Shop-Api-Call-Limit", out var limitHeaders))
        {
            var limitHeader = limitHeaders.FirstOrDefault();
            if (!string.IsNullOrEmpty(limitHeader))
            {
                var parts = limitHeader.Split('/');
                if (parts.Length == 2 && 
                    int.TryParse(parts[0], out var used) && 
                    int.TryParse(parts[1], out var max))
                {
                    _remainingCalls = max - used;
                    
                    if (_remainingCalls < 10)
                    {
                        _logger.LogWarning("Shopify APIレート制限が近づいています: {Used}/{Max}", used, max);
                    }
                }
            }
        }
    }
}
```

## 6. 監視・ログ設定

### 6.1 Application Insights カスタムメトリクス
```csharp
// Services/TelemetryService.cs
public class TelemetryService
{
    private readonly TelemetryClient _telemetryClient;
    private readonly ILogger<TelemetryService> _logger;
    
    public TelemetryService(TelemetryClient telemetryClient, ILogger<TelemetryService> logger)
    {
        _telemetryClient = telemetryClient;
        _logger = logger;
    }
    
    public void TrackSyncMetrics(SyncResult result)
    {
        var properties = new Dictionary<string, string>
        {
            ["EntityType"] = result.EntityType,
            ["StoreId"] = result.StoreId.ToString(),
            ["Success"] = result.IsSuccess.ToString()
        };
        
        var metrics = new Dictionary<string, double>
        {
            ["ProcessedCount"] = result.ProcessedCount,
            ["ErrorCount"] = result.ErrorCount,
            ["DurationMs"] = result.Duration?.TotalMilliseconds ?? 0
        };
        
        _telemetryClient.TrackEvent("SyncCompleted", properties, metrics);
        
        // カスタムメトリクス
        _telemetryClient.TrackMetric($"Sync.{result.EntityType}.ProcessedCount", result.ProcessedCount);
        _telemetryClient.TrackMetric($"Sync.{result.EntityType}.ErrorCount", result.ErrorCount);
        
        if (result.Duration.HasValue)
        {
            _telemetryClient.TrackMetric($"Sync.{result.EntityType}.Duration", result.Duration.Value.TotalSeconds);
        }
    }
    
    public void TrackApiCall(string endpoint, bool success, TimeSpan duration, int? rateLimitRemaining = null)
    {
        var properties = new Dictionary<string, string>
        {
            ["Endpoint"] = endpoint,
            ["Success"] = success.ToString()
        };
        
        if (rateLimitRemaining.HasValue)
        {
            properties["RateLimitRemaining"] = rateLimitRemaining.Value.ToString();
        }
        
        var metrics = new Dictionary<string, double>
        {
            ["DurationMs"] = duration.TotalMilliseconds
        };
        
        _telemetryClient.TrackEvent("ShopifyApiCall", properties, metrics);
        _telemetryClient.TrackMetric("ShopifyApi.CallDuration", duration.TotalMilliseconds);
        
        if (rateLimitRemaining.HasValue)
        {
            _telemetryClient.TrackMetric("ShopifyApi.RateLimitRemaining", rateLimitRemaining.Value);
        }
    }
}
```

このように、Azure Functionsベースの包括的なバッチ処理システムを設計しました。次に作成手順書とデプロイ手順書を作成します。