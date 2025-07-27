# Shopify API バッチ処理システム - 詳細設計書

## 1. プロジェクト構成

### 1.1 推奨アーキテクチャ: Azure Functions
```
ShopifyBatchProcessor/
├── Functions/
│   ├── CustomerSyncFunction.cs
│   ├── ProductSyncFunction.cs
│   ├── OrderSyncFunction.cs
│   └── ManualSyncFunction.cs
├── Services/
│   ├── IShopifyApiClient.cs
│   ├── ShopifyApiClient.cs
│   ├── IDataSyncService.cs
│   ├── DataSyncService.cs
│   └── ISyncStateService.cs
├── Models/
│   ├── ShopifyModels.cs
│   └── SyncModels.cs
├── Configuration/
│   ├── ShopifySettings.cs
│   └── SyncSettings.cs
└── SharedLibrary/ (既存プロジェクトから参照)
    ├── Data/ShopifyDbContext.cs
    ├── Models/DatabaseModels.cs
    └── Services/
```

### 1.2 プロジェクト設定
**ShopifyBatchProcessor.csproj**
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
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.19.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.16.4" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.7" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="8.0.0" />
    <PackageReference Include="Microsoft.ApplicationInsights.WorkerService" Version="2.22.0" />
    <PackageReference Include="Serilog.Extensions.Hosting" Version="8.0.0" />
    <PackageReference Include="Serilog.Sinks.ApplicationInsights" Version="4.0.0" />
    <PackageReference Include="Azure.Security.KeyVault.Secrets" Version="4.5.0" />
    <PackageReference Include="Azure.Identity" Version="1.10.4" />
  </ItemGroup>
  
  <ItemGroup>
    <ProjectReference Include="../ShopifyTestApi/ShopifyTestApi.csproj" />
  </ItemGroup>
</Project>
```

## 2. クラス設計

### 2.1 Shopify APIクライアント
```csharp
// IShopifyApiClient.cs
public interface IShopifyApiClient
{
    Task<ShopifyApiResponse<List<ShopifyCustomer>>> GetCustomersAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null);
    
    Task<ShopifyApiResponse<List<ShopifyProduct>>> GetProductsAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null);
    
    Task<ShopifyApiResponse<List<ShopifyOrder>>> GetOrdersAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null);
}

// ShopifyApiClient.cs
public class ShopifyApiClient : IShopifyApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ShopifySettings _settings;
    private readonly ILogger<ShopifyApiClient> _logger;
    
    public ShopifyApiClient(
        HttpClient httpClient, 
        ShopifySettings settings,
        ILogger<ShopifyApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings;
        _logger = logger;
        
        ConfigureHttpClient();
    }
    
    private void ConfigureHttpClient()
    {
        _httpClient.BaseAddress = new Uri($"https://{_settings.ShopDomain}/admin/api/{_settings.ApiVersion}/");
        _httpClient.DefaultRequestHeaders.Add("X-Shopify-Access-Token", _settings.AccessToken);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ShopifyBatchProcessor/1.0");
    }
    
    public async Task<ShopifyApiResponse<List<ShopifyCustomer>>> GetCustomersAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null)
    {
        try
        {
            var queryParams = new List<string> { $"limit={limit}" };
            if (updatedAtMin.HasValue)
                queryParams.Add($"updated_at_min={updatedAtMin.Value:yyyy-MM-ddTHH:mm:ssZ}");
            if (!string.IsNullOrEmpty(pageInfo))
                queryParams.Add($"page_info={pageInfo}");
            
            var query = string.Join("&", queryParams);
            var response = await _httpClient.GetAsync($"customers.json?{query}");
            
            await HandleRateLimit(response);
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ShopifyCustomersResponse>(content);
            
            return new ShopifyApiResponse<List<ShopifyCustomer>>
            {
                Data = result?.Customers ?? new List<ShopifyCustomer>(),
                PageInfo = ExtractPageInfo(response),
                IsSuccess = true
            };
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
    
    private async Task HandleRateLimit(HttpResponseMessage response)
    {
        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(2);
            _logger.LogWarning("Rate limit exceeded. Waiting {RetryAfter} seconds", retryAfter.TotalSeconds);
            await Task.Delay(retryAfter);
        }
    }
}
```

### 2.2 データ同期サービス
```csharp
// IDataSyncService.cs
public interface IDataSyncService
{
    Task<SyncResult> SyncCustomersAsync(int storeId);
    Task<SyncResult> SyncProductsAsync(int storeId);
    Task<SyncResult> SyncOrdersAsync(int storeId);
}

// DataSyncService.cs
public class DataSyncService : IDataSyncService
{
    private readonly IShopifyApiClient _apiClient;
    private readonly ShopifyDbContext _dbContext;
    private readonly ISyncStateService _syncStateService;
    private readonly ILogger<DataSyncService> _logger;
    
    public DataSyncService(
        IShopifyApiClient apiClient,
        ShopifyDbContext dbContext,
        ISyncStateService syncStateService,
        ILogger<DataSyncService> logger)
    {
        _apiClient = apiClient;
        _dbContext = dbContext;
        _syncStateService = syncStateService;
        _logger = logger;
    }
    
    public async Task<SyncResult> SyncCustomersAsync(int storeId)
    {
        var syncResult = new SyncResult("Customers");
        var lastSyncTime = await _syncStateService.GetLastSyncTimeAsync(storeId, "customers");
        
        try
        {
            _logger.LogInformation("Starting customer sync for store {StoreId} from {LastSyncTime}", 
                storeId, lastSyncTime);
            
            string? pageInfo = null;
            var totalProcessed = 0;
            
            do
            {
                var response = await _apiClient.GetCustomersAsync(lastSyncTime, 250, pageInfo);
                
                if (!response.IsSuccess)
                {
                    syncResult.AddError($"API call failed: {response.ErrorMessage}");
                    break;
                }
                
                var processedCount = await ProcessCustomerBatch(storeId, response.Data);
                totalProcessed += processedCount;
                syncResult.AddProcessed(processedCount);
                
                pageInfo = response.PageInfo;
                
                // レート制限対応
                await Task.Delay(500);
                
            } while (!string.IsNullOrEmpty(pageInfo));
            
            await _syncStateService.UpdateLastSyncTimeAsync(storeId, "customers", DateTime.UtcNow);
            
            _logger.LogInformation("Customer sync completed. Processed {TotalProcessed} customers", 
                totalProcessed);
            
            syncResult.MarkAsCompleted();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Customer sync failed for store {StoreId}", storeId);
            syncResult.AddError(ex.Message);
        }
        
        return syncResult;
    }
    
    private async Task<int> ProcessCustomerBatch(int storeId, List<ShopifyCustomer> customers)
    {
        var processedCount = 0;
        
        foreach (var shopifyCustomer in customers)
        {
            try
            {
                var existingCustomer = await _dbContext.Customers
                    .FirstOrDefaultAsync(c => c.StoreId == storeId && 
                                         c.ShopifyCustomerId == shopifyCustomer.Id.ToString());
                
                if (existingCustomer != null)
                {
                    // 既存顧客の更新
                    MapShopifyCustomerToEntity(shopifyCustomer, existingCustomer);
                    existingCustomer.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // 新規顧客の作成
                    var newCustomer = new Customer
                    {
                        StoreId = storeId,
                        ShopifyCustomerId = shopifyCustomer.Id.ToString(),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    MapShopifyCustomerToEntity(shopifyCustomer, newCustomer);
                    _dbContext.Customers.Add(newCustomer);
                }
                
                processedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process customer {CustomerId}", shopifyCustomer.Id);
            }
        }
        
        await _dbContext.SaveChangesAsync();
        return processedCount;
    }
    
    private void MapShopifyCustomerToEntity(ShopifyCustomer source, Customer target)
    {
        target.FirstName = source.FirstName ?? "";
        target.LastName = source.LastName ?? "";
        target.Email = source.Email ?? "";
        target.Phone = source.Phone;
        target.AcceptsEmailMarketing = source.AcceptsEmailMarketing;
        target.AcceptsSMSMarketing = source.AcceptsSmsMarketing;
        target.TotalSpent = source.TotalSpent ?? 0;
        target.TotalOrders = source.OrdersCount ?? 0;
        target.Tags = source.Tags;
        
        // 住所情報のマッピング
        if (source.DefaultAddress != null)
        {
            target.Company = source.DefaultAddress.Company;
            target.City = source.DefaultAddress.City;
            target.ProvinceCode = source.DefaultAddress.ProvinceCode;
            target.CountryCode = source.DefaultAddress.CountryCode;
            target.AddressPhone = source.DefaultAddress.Phone;
        }
    }
}
```

### 2.3 Azure Functions
```csharp
// CustomerSyncFunction.cs
public class CustomerSyncFunction
{
    private readonly IDataSyncService _dataSyncService;
    private readonly ILogger<CustomerSyncFunction> _logger;
    
    public CustomerSyncFunction(
        IDataSyncService dataSyncService,
        ILogger<CustomerSyncFunction> logger)
    {
        _dataSyncService = dataSyncService;
        _logger = logger;
    }
    
    [Function("CustomerSyncTimer")]
    public async Task RunTimer([TimerTrigger("0 0 */1 * * *")] TimerInfo timer)
    {
        _logger.LogInformation("Customer sync timer function started at {Time}", DateTime.UtcNow);
        
        try
        {
            // 全ストアに対してループ処理
            // 実際の実装では設定から取得
            var storeIds = new[] { 1 };
            
            foreach (var storeId in storeIds)
            {
                var result = await _dataSyncService.SyncCustomersAsync(storeId);
                
                if (result.IsSuccess)
                {
                    _logger.LogInformation("Customer sync completed for store {StoreId}. " +
                        "Processed: {ProcessedCount}, Errors: {ErrorCount}", 
                        storeId, result.ProcessedCount, result.ErrorCount);
                }
                else
                {
                    _logger.LogError("Customer sync failed for store {StoreId}. Errors: {Errors}", 
                        storeId, string.Join(", ", result.Errors));
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Customer sync timer function failed");
            throw;
        }
    }
    
    [Function("CustomerSyncManual")]
    public async Task<HttpResponseData> RunManual(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        
        try
        {
            var storeIds = new[] { 1 };
            var results = new List<object>();
            
            foreach (var storeId in storeIds)
            {
                var result = await _dataSyncService.SyncCustomersAsync(storeId);
                results.Add(new
                {
                    StoreId = storeId,
                    Success = result.IsSuccess,
                    ProcessedCount = result.ProcessedCount,
                    ErrorCount = result.ErrorCount,
                    Errors = result.Errors
                });
            }
            
            await response.WriteAsJsonAsync(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Manual customer sync failed");
            response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteStringAsync($"Sync failed: {ex.Message}");
        }
        
        return response;
    }
}
```

## 3. 設定・構成

### 3.1 local.settings.json (開発環境)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "ConnectionStrings__DefaultConnection": "Server=localhost;Database=ShopifyAI;Integrated Security=true;TrustServerCertificate=true;",
    "Shopify__ShopDomain": "your-shop-name.myshopify.com",
    "Shopify__AccessToken": "your-access-token",
    "Shopify__ApiVersion": "2023-10",
    "Shopify__RateLimit__RequestsPerSecond": "2",
    "ApplicationInsights__ConnectionString": "your-app-insights-connection-string"
  }
}
```

### 3.2 設定クラス
```csharp
// ShopifySettings.cs
public class ShopifySettings
{
    public string ShopDomain { get; set; } = "";
    public string AccessToken { get; set; } = "";
    public string ApiVersion { get; set; } = "2023-10";
    public RateLimitSettings RateLimit { get; set; } = new();
}

public class RateLimitSettings
{
    public int RequestsPerSecond { get; set; } = 2;
    public int RetryMaxAttempts { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 2;
}

// SyncSettings.cs
public class SyncSettings
{
    public int BatchSize { get; set; } = 250;
    public int MaxConcurrentBatches { get; set; } = 1;
    public bool EnableIncrementalSync { get; set; } = true;
    public Dictionary<string, string> SyncSchedules { get; set; } = new();
}
```

## 4. データモデル

### 4.1 Shopify APIレスポンスモデル
```csharp
// ShopifyModels.cs
public class ShopifyCustomer
{
    [JsonPropertyName("id")]
    public long Id { get; set; }
    
    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }
    
    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
    
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
    
    [JsonPropertyName("accepts_marketing")]
    public bool AcceptsEmailMarketing { get; set; }
    
    [JsonPropertyName("accepts_marketing_sms")]
    public bool AcceptsSmsMarketing { get; set; }
    
    [JsonPropertyName("total_spent")]
    public decimal? TotalSpent { get; set; }
    
    [JsonPropertyName("orders_count")]
    public int? OrdersCount { get; set; }
    
    [JsonPropertyName("tags")]
    public string? Tags { get; set; }
    
    [JsonPropertyName("default_address")]
    public ShopifyAddress? DefaultAddress { get; set; }
    
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    
    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

public class ShopifyAddress
{
    [JsonPropertyName("company")]
    public string? Company { get; set; }
    
    [JsonPropertyName("city")]
    public string? City { get; set; }
    
    [JsonPropertyName("province_code")]
    public string? ProvinceCode { get; set; }
    
    [JsonPropertyName("country_code")]
    public string? CountryCode { get; set; }
    
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
}
```

### 4.2 同期状態管理
```csharp
// SyncModels.cs
public class SyncResult
{
    public string EntityType { get; set; }
    public bool IsSuccess { get; set; }
    public int ProcessedCount { get; set; }
    public int ErrorCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    
    public SyncResult(string entityType)
    {
        EntityType = entityType;
        StartTime = DateTime.UtcNow;
    }
    
    public void AddProcessed(int count) => ProcessedCount += count;
    public void AddError(string error)
    {
        Errors.Add(error);
        ErrorCount++;
    }
    
    public void MarkAsCompleted()
    {
        EndTime = DateTime.UtcNow;
        IsSuccess = ErrorCount == 0;
    }
}

public class SyncState
{
    public int Id { get; set; }
    public int StoreId { get; set; }
    public string EntityType { get; set; } = "";
    public DateTime LastSyncTime { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

## 5. エラーハンドリング・監視

### 5.1 リトライ戦略
```csharp
public class RetryPolicy
{
    public static async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        int maxAttempts = 3,
        TimeSpan? delay = null)
    {
        var attempts = 0;
        var currentDelay = delay ?? TimeSpan.FromSeconds(1);
        
        while (attempts < maxAttempts)
        {
            try
            {
                return await operation();
            }
            catch (Exception ex) when (ShouldRetry(ex, attempts))
            {
                attempts++;
                if (attempts >= maxAttempts) throw;
                
                await Task.Delay(currentDelay);
                currentDelay = TimeSpan.FromMilliseconds(currentDelay.TotalMilliseconds * 2); // Exponential backoff
            }
        }
        
        throw new InvalidOperationException("Should not reach here");
    }
    
    private static bool ShouldRetry(Exception ex, int attemptCount)
    {
        return ex is HttpRequestException || 
               ex is TaskCanceledException ||
               (ex is HttpRequestException httpEx && 
                httpEx.Message.Contains("timeout"));
    }
}
```

### 5.2 ログ・監視設定
```csharp
// Program.cs
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        // Configuration
        var configuration = context.Configuration;
        services.Configure<ShopifySettings>(
            configuration.GetSection("Shopify"));
        services.Configure<SyncSettings>(
            configuration.GetSection("Sync"));
        
        // Database
        services.AddDbContext<ShopifyDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));
        
        // HTTP Client
        services.AddHttpClient<IShopifyApiClient, ShopifyApiClient>();
        
        // Services
        services.AddScoped<IDataSyncService, DataSyncService>();
        services.AddScoped<ISyncStateService, SyncStateService>();
        
        // Logging
        services.AddLogging(builder =>
        {
            builder.AddApplicationInsights(options =>
            {
                options.ConnectionString = configuration["ApplicationInsights:ConnectionString"];
            });
        });
    })
    .Build();

host.Run();
```

## 6. テスト戦略

### 6.1 単体テスト
```csharp
[TestClass]
public class DataSyncServiceTests
{
    [TestMethod]
    public async Task SyncCustomersAsync_ValidData_ProcessesSuccessfully()
    {
        // Arrange
        var mockApiClient = new Mock<IShopifyApiClient>();
        var mockSyncStateService = new Mock<ISyncStateService>();
        // ... setup mocks
        
        var service = new DataSyncService(
            mockApiClient.Object,
            dbContext,
            mockSyncStateService.Object,
            logger);
        
        // Act
        var result = await service.SyncCustomersAsync(1);
        
        // Assert
        Assert.IsTrue(result.IsSuccess);
        Assert.AreEqual(2, result.ProcessedCount);
    }
}
```

### 6.2 統合テスト
```csharp
[TestClass]
public class ShopifyApiClientIntegrationTests
{
    [TestMethod]
    public async Task GetCustomersAsync_RealApi_ReturnsValidData()
    {
        // テスト環境での実際のAPI呼び出しテスト
        // 注意: テスト用のShopifyストアとAPIキーが必要
    }
}
```

## 7. デプロイ・運用

### 7.1 Azure Functions デプロイ設定
```json
// .azure/config
{
  "subscription": "your-subscription-id",
  "resourceGroup": "shopify-ai-rg",
  "functionApp": "shopify-batch-processor",
  "location": "Japan East"
}
```

### 7.2 CI/CD パイプライン (GitHub Actions)
```yaml
name: Deploy Shopify Batch Processor

on:
  push:
    branches: [main]
    paths: ['backend/ShopifyBatchProcessor/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '8.0.x'
    
    - name: Build
      run: dotnet build backend/ShopifyBatchProcessor
    
    - name: Deploy to Azure Functions
      uses: Azure/functions-action@v1
      with:
        app-name: shopify-batch-processor
        package: backend/ShopifyBatchProcessor
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## 8. パフォーマンス最適化

### 8.1 並列処理
```csharp
public async Task<SyncResult> SyncCustomersAsync(int storeId)
{
    var semaphore = new SemaphoreSlim(Environment.ProcessorCount);
    var tasks = new List<Task<BatchResult>>();
    
    // バッチを並列処理
    foreach (var batch in customerBatches)
    {
        await semaphore.WaitAsync();
        
        var task = ProcessBatchAsync(batch)
            .ContinueWith(t =>
            {
                semaphore.Release();
                return t.Result;
            });
        
        tasks.Add(task);
    }
    
    var results = await Task.WhenAll(tasks);
    return AggregateResults(results);
}
```

### 8.2 データベース最適化
```csharp
// バルクインサート対応
public async Task BulkInsertCustomersAsync(List<Customer> customers)
{
    const int batchSize = 1000;
    
    for (int i = 0; i < customers.Count; i += batchSize)
    {
        var batch = customers.Skip(i).Take(batchSize).ToList();
        _dbContext.Customers.AddRange(batch);
        await _dbContext.SaveChangesAsync();
        
        // メモリ使用量を抑えるためにDetach
        foreach (var customer in batch)
        {
            _dbContext.Entry(customer).State = EntityState.Detached;
        }
    }
}
```

これで基本設計書と詳細設計書が完成しました。Azure Functionsを使用したサーバーレスアーキテクチャを推奨し、段階的な実装アプローチを提案しています。