# Azure Functions 実装サンプルコード集

## 1. プロジェクト初期設定

### 1.1 Program.cs - 完全版
```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using ShopifyBatchProcessor.Services.Interfaces;
using ShopifyBatchProcessor.Services;
using ShopifyBatchProcessor.Models.Configuration;
using ShopifyBatchProcessor.Utilities;
using ShopifyBatchProcessor.Middleware;
using ShopifyTestApi.Data;
using Serilog;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Polly;
using Polly.Extensions.Http;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(builder =>
    {
        // カスタムミドルウェアの追加
        builder.UseMiddleware<ExceptionHandlingMiddleware>();
        builder.UseMiddleware<RequestLoggingMiddleware>();
    })
    .ConfigureAppConfiguration((context, config) =>
    {
        var env = context.HostingEnvironment;
        
        // 基本設定ファイル
        config.AddJsonFile("appsettings.json", optional: true)
              .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true);
        
        // Key Vault設定（本番環境）
        if (!env.IsDevelopment())
        {
            var keyVaultUrl = Environment.GetEnvironmentVariable("KeyVault:VaultUrl");
            if (!string.IsNullOrEmpty(keyVaultUrl))
            {
                var keyVaultClient = new SecretClient(
                    new Uri(keyVaultUrl), 
                    new DefaultAzureCredential());
                
                config.AddAzureKeyVault(keyVaultClient, new KeyVaultSecretManager());
            }
        }
        
        // 環境変数
        config.AddEnvironmentVariables();
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
        
        // HTTP クライアント設定（Pollyポリシー付き）
        services.AddHttpClient<IShopifyApiClient, ShopifyApiClient>(client =>
        {
            client.Timeout = TimeSpan.FromMinutes(2);
        })
        .AddPolicyHandler(GetRetryPolicy())
        .AddPolicyHandler(GetCircuitBreakerPolicy());
        
        // サービス登録
        services.AddScoped<IDataSyncService, DataSyncService>();
        services.AddScoped<ICustomerSyncService, CustomerSyncService>();
        services.AddScoped<IProductSyncService, ProductSyncService>();
        services.AddScoped<IOrderSyncService, OrderSyncService>();
        services.AddScoped<ISyncStateService, SyncStateService>();
        services.AddScoped<ITelemetryService, TelemetryService>();
        
        // ユーティリティ
        services.AddSingleton<DataMapper>();
        services.AddSingleton<RateLimitHandler>();
        services.AddSingleton<RetryPolicyFactory>();
        
        // Application Insights
        services.AddApplicationInsightsTelemetryWorkerService(options =>
        {
            options.ConnectionString = configuration["ApplicationInsights:ConnectionString"];
        });
        
        // Serilog設定
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .Enrich.WithProperty("Service", "ShopifyBatchProcessor")
            .Enrich.WithProperty("Version", GetType().Assembly.GetName().Version?.ToString())
            .CreateLogger();
        
        services.AddLogging(loggingBuilder =>
            loggingBuilder.AddSerilog(dispose: true));
    })
    .UseSerilog()
    .Build();

// Pollyポリシーの定義
static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        .WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryCount, context) =>
            {
                Log.Warning("HTTP リトライ {RetryCount}: {Delay}ms 待機", retryCount, timespan.TotalMilliseconds);
            });
}

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(
            handledEventsAllowedBeforeBreaking: 5,
            durationOfBreak: TimeSpan.FromSeconds(30),
            onBreak: (exception, timespan) =>
            {
                Log.Error("サーキットブレーカー開放: {Duration}秒", timespan.TotalSeconds);
            },
            onReset: () =>
            {
                Log.Information("サーキットブレーカー復旧");
            });
}

await host.RunAsync();
```

## 2. Shopify API クライアント実装

### 2.1 IShopifyApiClient インターフェース
```csharp
using ShopifyBatchProcessor.Models.Api;
using ShopifyBatchProcessor.Models.Shopify;

namespace ShopifyBatchProcessor.Services.Interfaces;

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
    
    Task<ShopifyApiResponse<ShopifyCustomer>> GetCustomerAsync(
        long customerId,
        CancellationToken cancellationToken = default);
}
```

### 2.2 ShopifyApiClient 実装
```csharp
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Net;
using ShopifyBatchProcessor.Services.Interfaces;
using ShopifyBatchProcessor.Models.Configuration;
using ShopifyBatchProcessor.Models.Api;
using ShopifyBatchProcessor.Models.Shopify;
using ShopifyBatchProcessor.Utilities;

namespace ShopifyBatchProcessor.Services;

public class ShopifyApiClient : IShopifyApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ShopifySettings _settings;
    private readonly RateLimitHandler _rateLimitHandler;
    private readonly ITelemetryService _telemetryService;
    private readonly ILogger<ShopifyApiClient> _logger;
    
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };
    
    public ShopifyApiClient(
        HttpClient httpClient,
        IOptions<ShopifySettings> settings,
        RateLimitHandler rateLimitHandler,
        ITelemetryService telemetryService,
        ILogger<ShopifyApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _rateLimitHandler = rateLimitHandler;
        _telemetryService = telemetryService;
        _logger = logger;
        
        ConfigureHttpClient();
    }
    
    private void ConfigureHttpClient()
    {
        _httpClient.BaseAddress = new Uri($"https://{_settings.ShopDomain}/admin/api/{_settings.ApiVersion}/");
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("X-Shopify-Access-Token", _settings.AccessToken);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "ShopifyBatchProcessor/1.0");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }
    
    public async Task<ShopifyApiResponse<List<ShopifyCustomer>>> GetCustomersAsync(
        DateTime? updatedAtMin = null, 
        int limit = 250, 
        string? pageInfo = null,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            await _rateLimitHandler.WaitIfNeededAsync(cancellationToken);
            
            var queryParams = BuildQueryParameters(limit, updatedAtMin, pageInfo);
            var requestUrl = $"customers.json?{queryParams}";
            
            _logger.LogDebug("Shopify API 要求: {Url}", requestUrl);
            
            var response = await _httpClient.GetAsync(requestUrl, cancellationToken);
            stopwatch.Stop();
            
            // レート制限情報の更新
            _rateLimitHandler.UpdateRateLimit(response.Headers);
            
            // レート制限処理
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(2);
                _logger.LogWarning("レート制限に達しました。{RetryAfter}秒待機します", retryAfter.TotalSeconds);
                await Task.Delay(retryAfter, cancellationToken);
                return await GetCustomersAsync(updatedAtMin, limit, pageInfo, cancellationToken);
            }
            
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var apiResponse = JsonSerializer.Deserialize<ShopifyCustomersResponse>(content, JsonOptions);
            
            var result = new ShopifyApiResponse<List<ShopifyCustomer>>
            {
                Data = apiResponse?.Customers ?? new List<ShopifyCustomer>(),
                PageInfo = ExtractPageInfo(response.Headers),
                IsSuccess = true,
                RateLimitRemaining = _rateLimitHandler.RemainingCalls,
                RequestTime = DateTime.UtcNow
            };
            
            _logger.LogInformation("顧客データ取得完了: {Count}件, ページ情報: {PageInfo}, レート制限残り: {RateLimit}", 
                result.Data.Count, result.PageInfo, result.RateLimitRemaining);
            
            // テレメトリー送信
            _telemetryService.TrackApiCall("customers", true, stopwatch.Elapsed, result.RateLimitRemaining);
            
            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Shopify API 顧客データ取得エラー");
            
            _telemetryService.TrackApiCall("customers", false, stopwatch.Elapsed);
            
            return new ShopifyApiResponse<List<ShopifyCustomer>>
            {
                Data = new List<ShopifyCustomer>(),
                IsSuccess = false,
                ErrorMessage = ex.Message,
                RequestTime = DateTime.UtcNow
            };
        }
    }
    
    public async Task<ShopifyApiResponse<ShopifyCustomer>> GetCustomerAsync(
        long customerId,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            await _rateLimitHandler.WaitIfNeededAsync(cancellationToken);
            
            var requestUrl = $"customers/{customerId}.json";
            
            _logger.LogDebug("Shopify API 顧客取得: {CustomerId}", customerId);
            
            var response = await _httpClient.GetAsync(requestUrl, cancellationToken);
            stopwatch.Stop();
            
            _rateLimitHandler.UpdateRateLimit(response.Headers);
            
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return new ShopifyApiResponse<ShopifyCustomer>
                {
                    Data = null!,
                    IsSuccess = false,
                    ErrorMessage = $"Customer {customerId} not found"
                };
            }
            
            response.EnsureSuccessStatusCode();
            
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var apiResponse = JsonSerializer.Deserialize<ShopifyCustomerResponse>(content, JsonOptions);
            
            _telemetryService.TrackApiCall("customer", true, stopwatch.Elapsed, _rateLimitHandler.RemainingCalls);
            
            return new ShopifyApiResponse<ShopifyCustomer>
            {
                Data = apiResponse?.Customer!,
                IsSuccess = true,
                RateLimitRemaining = _rateLimitHandler.RemainingCalls
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Shopify API 顧客取得エラー: {CustomerId}", customerId);
            
            _telemetryService.TrackApiCall("customer", false, stopwatch.Elapsed);
            
            return new ShopifyApiResponse<ShopifyCustomer>
            {
                Data = null!,
                IsSuccess = false,
                ErrorMessage = ex.Message
            };
        }
    }
    
    private string BuildQueryParameters(int limit, DateTime? updatedAtMin, string? pageInfo)
    {
        var parameters = new List<string> { $"limit={limit}" };
        
        if (updatedAtMin.HasValue)
        {
            var isoDate = updatedAtMin.Value.ToString("yyyy-MM-ddTHH:mm:ssZ");
            parameters.Add($"updated_at_min={Uri.EscapeDataString(isoDate)}");
        }
        
        if (!string.IsNullOrEmpty(pageInfo))
        {
            parameters.Add($"page_info={Uri.EscapeDataString(pageInfo)}");
        }
        
        return string.Join("&", parameters);
    }
    
    private string? ExtractPageInfo(HttpResponseHeaders headers)
    {
        if (headers.TryGetValues("Link", out var linkHeaders))
        {
            var linkHeader = linkHeaders.FirstOrDefault();
            if (!string.IsNullOrEmpty(linkHeader))
            {
                // Link ヘッダーから next ページの page_info を抽出
                var nextMatch = Regex.Match(linkHeader, @"<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel=""next""");
                return nextMatch.Success ? Uri.UnescapeDataString(nextMatch.Groups[1].Value) : null;
            }
        }
        return null;
    }
}
```

## 3. データ同期サービス実装

### 3.1 CustomerSyncService - 完全版
```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using ShopifyBatchProcessor.Services.Interfaces;
using ShopifyBatchProcessor.Models.Configuration;
using ShopifyBatchProcessor.Models.Api;
using ShopifyBatchProcessor.Models.Shopify;
using ShopifyBatchProcessor.Utilities;
using ShopifyTestApi.Data;
using ShopifyTestApi.Models;

namespace ShopifyBatchProcessor.Services;

public class CustomerSyncService : ICustomerSyncService
{
    private readonly IShopifyApiClient _apiClient;
    private readonly ShopifyDbContext _dbContext;
    private readonly ISyncStateService _syncStateService;
    private readonly DataMapper _dataMapper;
    private readonly ITelemetryService _telemetryService;
    private readonly SyncSettings _syncSettings;
    private readonly ILogger<CustomerSyncService> _logger;
    
    public CustomerSyncService(
        IShopifyApiClient apiClient,
        ShopifyDbContext dbContext,
        ISyncStateService syncStateService,
        DataMapper dataMapper,
        ITelemetryService telemetryService,
        IOptions<SyncSettings> syncSettings,
        ILogger<CustomerSyncService> logger)
    {
        _apiClient = apiClient;
        _dbContext = dbContext;
        _syncStateService = syncStateService;
        _dataMapper = dataMapper;
        _telemetryService = telemetryService;
        _syncSettings = syncSettings.Value;
        _logger = logger;
    }
    
    public async Task<SyncResult> SyncAsync(int storeId, CancellationToken cancellationToken = default)
    {
        var syncResult = new SyncResult("Customers", storeId);
        
        try
        {
            _logger.LogInformation("顧客データ同期開始 - Store: {StoreId}", storeId);
            
            var lastSyncTime = await _syncStateService.GetLastSyncTimeAsync(storeId, "customers");
            
            _logger.LogInformation("最終同期時刻: {LastSyncTime}", lastSyncTime);
            
            // 増分同期の確認
            var useIncrementalSync = _syncSettings.EnableIncrementalSync && lastSyncTime.HasValue;
            var syncStartTime = useIncrementalSync ? lastSyncTime : null;
            
            string? pageInfo = null;
            var batchCount = 0;
            var totalProcessed = 0;
            
            do
            {
                var response = await _apiClient.GetCustomersAsync(
                    syncStartTime, 
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
                    var processedCount = await ProcessCustomerBatch(
                        storeId, 
                        response.Data, 
                        cancellationToken);
                    
                    syncResult.AddProcessed(processedCount);
                    totalProcessed += processedCount;
                    
                    _logger.LogDebug("バッチ {BatchCount} 処理完了: {ProcessedCount}件 (累計: {Total}件)", 
                        ++batchCount, processedCount, totalProcessed);
                }
                
                pageInfo = response.PageInfo;
                
                // レート制限とメモリ効率のための制御
                if (!string.IsNullOrEmpty(pageInfo))
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(500), cancellationToken);
                    
                    // 定期的なガベージコレクション
                    if (batchCount % 10 == 0)
                    {
                        GC.Collect();
                        GC.WaitForPendingFinalizers();
                        _logger.LogDebug("メモリクリーンアップ実行 (バッチ {BatchCount})", batchCount);
                    }
                }
                
                // 最大処理件数制限（無限ループ防止）
                if (totalProcessed >= 10000)
                {
                    _logger.LogWarning("最大処理件数に達しました。処理を一時停止: {TotalProcessed}件", totalProcessed);
                    break;
                }
                
            } while (!string.IsNullOrEmpty(pageInfo) && !cancellationToken.IsCancellationRequested);
            
            if (!cancellationToken.IsCancellationRequested)
            {
                await _syncStateService.UpdateLastSyncTimeAsync(storeId, "customers", DateTime.UtcNow);
                syncResult.MarkAsCompleted();
                
                _logger.LogInformation("顧客データ同期完了 - Store: {StoreId}, 処理件数: {ProcessedCount}, エラー: {ErrorCount}, 時間: {Duration}", 
                    storeId, syncResult.ProcessedCount, syncResult.ErrorCount, syncResult.Duration);
                
                // テレメトリー送信
                _telemetryService.TrackSyncMetrics(syncResult);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("顧客データ同期がキャンセルされました - Store: {StoreId}", storeId);
            syncResult.AddError("同期処理がキャンセルされました");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客データ同期で予期しないエラーが発生しました - Store: {StoreId}", storeId);
            syncResult.AddError($"予期しないエラー: {ex.Message}");
        }
        
        return syncResult;
    }
    
    private async Task<int> ProcessCustomerBatch(
        int storeId, 
        List<ShopifyCustomer> customers, 
        CancellationToken cancellationToken)
    {
        if (!customers.Any())
            return 0;
        
        var processedCount = 0;
        var customerIds = customers.Select(c => c.Id.ToString()).ToList();
        
        try
        {
            // 既存顧客の一括取得（パフォーマンス向上）
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
                        // 更新の必要性チェック
                        if (ShouldUpdateCustomer(existingCustomer, shopifyCustomer))
                        {
                            _dataMapper.MapShopifyCustomerToEntity(shopifyCustomer, existingCustomer);
                            existingCustomer.UpdatedAt = DateTime.UtcNow;
                            customersToUpdate.Add(existingCustomer);
                        }
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
            
            // データベース操作の実行
            using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
            
            try
            {
                if (customersToAdd.Any())
                {
                    await _dbContext.Customers.AddRangeAsync(customersToAdd, cancellationToken);
                    _logger.LogDebug("新規顧客追加: {Count}件", customersToAdd.Count);
                }
                
                if (customersToUpdate.Any())
                {
                    _dbContext.Customers.UpdateRange(customersToUpdate);
                    _logger.LogDebug("既存顧客更新: {Count}件", customersToUpdate.Count);
                }
                
                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                
                _logger.LogDebug("データベース更新完了 - 追加: {AddCount}件, 更新: {UpdateCount}件", 
                    customersToAdd.Count, customersToUpdate.Count);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "データベース更新エラー - ロールバック実行");
                throw;
            }
            
            // メモリ使用量削減のためのエンティティデタッチ
            foreach (var customer in customersToAdd.Concat(customersToUpdate))
            {
                _dbContext.Entry(customer).State = EntityState.Detached;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客バッチ処理エラー - Store: {StoreId}, バッチサイズ: {BatchSize}", 
                storeId, customers.Count);
            throw;
        }
        
        return processedCount;
    }
    
    private bool ShouldUpdateCustomer(Customer existingCustomer, ShopifyCustomer shopifyCustomer)
    {
        // Shopifyの更新日時と既存データの更新日時を比較
        var shopifyUpdatedAt = shopifyCustomer.UpdatedAt;
        var existingUpdatedAt = existingCustomer.UpdatedAt;
        
        // Shopifyのデータが新しい場合のみ更新
        return shopifyUpdatedAt > existingUpdatedAt;
    }
}
```

## 4. Azure Functions 実装

### 4.1 CustomerSyncFunction - 完全版
```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text.Json;
using ShopifyBatchProcessor.Services.Interfaces;
using ShopifyBatchProcessor.Models.Configuration;
using ShopifyBatchProcessor.Models.Api;

namespace ShopifyBatchProcessor.Functions;

public class CustomerSyncFunction
{
    private readonly ICustomerSyncService _customerSyncService;
    private readonly ITelemetryService _telemetryService;
    private readonly SyncSettings _syncSettings;
    private readonly ILogger<CustomerSyncFunction> _logger;
    
    public CustomerSyncFunction(
        ICustomerSyncService customerSyncService,
        ITelemetryService telemetryService,
        IOptions<SyncSettings> syncSettings,
        ILogger<CustomerSyncFunction> logger)
    {
        _customerSyncService = customerSyncService;
        _telemetryService = telemetryService;
        _syncSettings = syncSettings.Value;
        _logger = logger;
    }
    
    [Function("CustomerSyncTimer")]
    public async Task RunTimer(
        [TimerTrigger("%Sync:CustomerSyncSchedule%")] TimerInfo timer,
        CancellationToken cancellationToken)
    {
        var executionId = Guid.NewGuid().ToString();
        
        _logger.LogInformation("顧客データ同期タイマー開始 - ExecutionId: {ExecutionId}, NextRun: {NextRun}", 
            executionId, timer.ScheduleStatus?.Next);
        
        try
        {
            // 設定から対象ストア一覧を取得
            var storeIds = GetTargetStoreIds();
            
            if (_syncSettings.MaxConcurrentBatches <= 1)
            {
                // 順次処理
                foreach (var storeId in storeIds)
                {
                    await ProcessStoreAsync(storeId, executionId, cancellationToken);
                }
            }
            else
            {
                // 並列処理
                var semaphore = new SemaphoreSlim(_syncSettings.MaxConcurrentBatches);
                var tasks = storeIds.Select(async storeId =>
                {
                    await semaphore.WaitAsync(cancellationToken);
                    try
                    {
                        await ProcessStoreAsync(storeId, executionId, cancellationToken);
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                });
                
                await Task.WhenAll(tasks);
            }
            
            _logger.LogInformation("顧客データ同期タイマー完了 - ExecutionId: {ExecutionId}", executionId);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("顧客データ同期タイマーがキャンセルされました - ExecutionId: {ExecutionId}", executionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客データ同期タイマーで予期しないエラーが発生しました - ExecutionId: {ExecutionId}", executionId);
            
            // テレメトリーでエラー追跡
            _telemetryService.TrackException(ex, new Dictionary<string, string>
            {
                ["ExecutionId"] = executionId,
                ["FunctionName"] = "CustomerSyncTimer"
            });
            
            throw; // Function の実行ステータスをFailed にするため再スロー
        }
    }
    
    [Function("CustomerSyncManual")]
    public async Task<HttpResponseData> RunManual(
        [HttpTrigger(AuthorizationLevel.Function, "post", "get")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        var executionId = Guid.NewGuid().ToString();
        
        _logger.LogInformation("顧客データ手動同期開始 - ExecutionId: {ExecutionId}", executionId);
        
        try
        {
            // クエリパラメータから設定を取得
            var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
            var storeIdParam = query["storeId"];
            var forceFullSync = bool.Parse(query["forceFullSync"] ?? "false");
            
            List<int> storeIds;
            if (!string.IsNullOrEmpty(storeIdParam) && int.TryParse(storeIdParam, out var specificStoreId))
            {
                storeIds = new List<int> { specificStoreId };
            }
            else
            {
                storeIds = GetTargetStoreIds();
            }
            
            var results = new List<object>();
            
            foreach (var storeId in storeIds)
            {
                var result = await ProcessStoreWithResultAsync(storeId, executionId, forceFullSync, cancellationToken);
                results.Add(result);
            }
            
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json");
            
            var responseData = new
            {
                ExecutionId = executionId,
                Timestamp = DateTime.UtcNow,
                Results = results,
                Summary = new
                {
                    TotalStores = results.Count,
                    SuccessfulStores = results.Count(r => ((dynamic)r).Success),
                    TotalProcessed = results.Sum(r => ((dynamic)r).ProcessedCount),
                    TotalErrors = results.Sum(r => ((dynamic)r).ErrorCount)
                }
            };
            
            await response.WriteStringAsync(JsonSerializer.Serialize(responseData, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }), cancellationToken);
            
            _logger.LogInformation("顧客データ手動同期完了 - ExecutionId: {ExecutionId}", executionId);
            
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客データ手動同期でエラーが発生しました - ExecutionId: {ExecutionId}", executionId);
            
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new
            {
                ExecutionId = executionId,
                Error = ex.Message,
                Timestamp = DateTime.UtcNow
            }), cancellationToken);
            
            return errorResponse;
        }
    }
    
    [Function("CustomerSyncStatus")]
    public async Task<HttpResponseData> GetSyncStatus(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
        try
        {
            // 同期状態の取得ロジック（ISyncStateService を使用）
            var storeIds = GetTargetStoreIds();
            var statusList = new List<object>();
            
            foreach (var storeId in storeIds)
            {
                // 実装は ISyncStateService に依存
                statusList.Add(new
                {
                    StoreId = storeId,
                    LastSyncTime = DateTime.UtcNow.AddHours(-1), // 仮の値
                    Status = "Healthy",
                    NextScheduledRun = DateTime.UtcNow.AddHours(1) // 仮の値
                });
            }
            
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new
            {
                Service = "CustomerSync",
                Timestamp = DateTime.UtcNow,
                Stores = statusList
            }, cancellationToken);
            
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客同期状態取得エラー");
            
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteAsJsonAsync(new { Error = ex.Message }, cancellationToken);
            return errorResponse;
        }
    }
    
    private async Task ProcessStoreAsync(int storeId, string executionId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _customerSyncService.SyncAsync(storeId, cancellationToken);
            
            if (result.IsSuccess)
            {
                _logger.LogInformation("ストア {StoreId} 顧客同期成功 - ExecutionId: {ExecutionId}, 処理件数: {ProcessedCount}, 時間: {Duration}", 
                    storeId, executionId, result.ProcessedCount, result.Duration);
            }
            else
            {
                _logger.LogError("ストア {StoreId} 顧客同期失敗 - ExecutionId: {ExecutionId}, エラー件数: {ErrorCount}, エラー内容: {Errors}", 
                    storeId, executionId, result.ErrorCount, string.Join("; ", result.Errors));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ストア {StoreId} の顧客同期処理でエラーが発生しました - ExecutionId: {ExecutionId}", 
                storeId, executionId);
        }
    }
    
    private async Task<object> ProcessStoreWithResultAsync(
        int storeId, 
        string executionId, 
        bool forceFullSync, 
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _customerSyncService.SyncAsync(storeId, cancellationToken);
            
            return new
            {
                StoreId = storeId,
                Success = result.IsSuccess,
                ProcessedCount = result.ProcessedCount,
                ErrorCount = result.ErrorCount,
                Errors = result.Errors,
                Duration = result.Duration?.ToString(@"mm\:ss\.fff"),
                StartTime = result.StartTime,
                EndTime = result.EndTime
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ストア {StoreId} の顧客同期処理でエラーが発生しました - ExecutionId: {ExecutionId}", 
                storeId, executionId);
            
            return new
            {
                StoreId = storeId,
                Success = false,
                ProcessedCount = 0,
                ErrorCount = 1,
                Errors = new[] { ex.Message },
                Duration = "00:00.000",
                StartTime = DateTime.UtcNow,
                EndTime = DateTime.UtcNow
            };
        }
    }
    
    private List<int> GetTargetStoreIds()
    {
        // 設定やデータベースから対象ストア一覧を取得
        // 現在は固定値だが、実装では動的に取得
        return new List<int> { 1 };
    }
}
```

## 5. ユーティリティクラス実装

### 5.1 DataMapper
```csharp
using ShopifyBatchProcessor.Models.Shopify;
using ShopifyTestApi.Models;
using Microsoft.Extensions.Logging;

namespace ShopifyBatchProcessor.Utilities;

public class DataMapper
{
    private readonly ILogger<DataMapper> _logger;
    
    public DataMapper(ILogger<DataMapper> logger)
    {
        _logger = logger;
    }
    
    public void MapShopifyCustomerToEntity(ShopifyCustomer source, Customer target)
    {
        try
        {
            // 基本情報
            target.FirstName = TruncateString(source.FirstName ?? "", 100);
            target.LastName = TruncateString(source.LastName ?? "", 100);
            target.Email = TruncateString(source.Email ?? "", 255);
            target.Phone = TruncateString(source.Phone, 20);
            
            // マーケティング設定
            target.AcceptsEmailMarketing = source.AcceptsEmailMarketing;
            target.AcceptsSMSMarketing = source.AcceptsSmsMarketing;
            
            // 購買統計
            target.TotalSpent = source.TotalSpent ?? 0;
            target.TotalOrders = source.OrdersCount ?? 0;
            target.OrdersCount = source.OrdersCount ?? 0; // 互換性のため
            
            // タグ（1000文字以内に制限）
            target.Tags = TruncateString(source.Tags, 1000);
            
            // 住所情報のマッピング
            if (source.DefaultAddress != null)
            {
                target.Company = TruncateString(source.DefaultAddress.Company, 100);
                target.City = TruncateString(source.DefaultAddress.City, 50);
                target.ProvinceCode = TruncateString(source.DefaultAddress.ProvinceCode, 10);
                target.CountryCode = TruncateString(source.DefaultAddress.CountryCode, 10);
                target.AddressPhone = TruncateString(source.DefaultAddress.Phone, 20);
            }
            
            // 顧客セグメントの判定
            target.CustomerSegment = DetermineCustomerSegment(target.TotalOrders, target.TotalSpent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "顧客データマッピングエラー - ShopifyId: {ShopifyId}", source.Id);
            throw;
        }
    }
    
    public void MapShopifyProductToEntity(ShopifyProduct source, Product target)
    {
        try
        {
            target.Title = TruncateString(source.Title ?? "", 255);
            target.Handle = TruncateString(source.Handle, 255);
            target.Description = TruncateString(source.BodyHtml, 1000);
            target.Vendor = TruncateString(source.Vendor, 100);
            target.ProductType = TruncateString(source.ProductType, 100);
            
            // 在庫数は最初のバリアントから取得
            var firstVariant = source.Variants?.FirstOrDefault();
            target.InventoryQuantity = firstVariant?.InventoryQuantity ?? 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "商品データマッピングエラー - ShopifyId: {ShopifyId}", source.Id);
            throw;
        }
    }
    
    private string TruncateString(string? input, int maxLength)
    {
        if (string.IsNullOrEmpty(input))
            return "";
        
        return input.Length <= maxLength ? input : input.Substring(0, maxLength);
    }
    
    private string DetermineCustomerSegment(int totalOrders, decimal totalSpent)
    {
        if (totalOrders == 0)
            return "新規顧客";
        
        if (totalSpent >= 100000) // 10万円以上
            return "VIP顧客";
        
        if (totalOrders >= 5)
            return "リピーター";
        
        return "一般顧客";
    }
}
```

### 5.2 RateLimitHandler
```csharp
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using ShopifyBatchProcessor.Models.Configuration;

namespace ShopifyBatchProcessor.Utilities;

public class RateLimitHandler
{
    private readonly SemaphoreSlim _semaphore;
    private readonly int _requestsPerSecond;
    private readonly int _burstSize;
    private DateTime _lastRequestTime = DateTime.MinValue;
    private int _remainingCalls = int.MaxValue;
    private readonly ILogger<RateLimitHandler> _logger;
    
    // バーストリクエスト管理
    private readonly Queue<DateTime> _requestTimes = new();
    
    public RateLimitHandler(IOptions<ShopifySettings> settings, ILogger<RateLimitHandler> logger)
    {
        var rateLimitSettings = settings.Value.RateLimit;
        _requestsPerSecond = rateLimitSettings.RequestsPerSecond;
        _burstSize = rateLimitSettings.BurstSize;
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
            
            // バーストリクエスト制御
            await ManageBurstLimitAsync(now, cancellationToken);
            
            // 基本的なレート制限制御
            var timeSinceLastRequest = now - _lastRequestTime;
            var minInterval = TimeSpan.FromSeconds(1.0 / _requestsPerSecond);
            
            if (timeSinceLastRequest < minInterval)
            {
                var waitTime = minInterval - timeSinceLastRequest;
                _logger.LogDebug("レート制限のため {WaitMs}ms 待機します", waitTime.TotalMilliseconds);
                await Task.Delay(waitTime, cancellationToken);
            }
            
            // Shopify APIレート制限チェック
            if (_remainingCalls <= 5) // 残り5回以下の場合は追加の待機
            {
                var extraWaitTime = TimeSpan.FromSeconds(2);
                _logger.LogWarning("Shopify APIレート制限残り少数。追加待機: {WaitSeconds}秒", extraWaitTime.TotalSeconds);
                await Task.Delay(extraWaitTime, cancellationToken);
            }
            
            _lastRequestTime = DateTime.UtcNow;
            _requestTimes.Enqueue(_lastRequestTime);
        }
        finally
        {
            _semaphore.Release();
        }
    }
    
    public void UpdateRateLimit(HttpResponseHeaders headers)
    {
        // Shopify API制限情報の更新
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
                    
                    _logger.LogDebug("Shopify APIレート制限更新: {Used}/{Max} (残り: {Remaining})", 
                        used, max, _remainingCalls);
                    
                    if (_remainingCalls < 10)
                    {
                        _logger.LogWarning("Shopify APIレート制限が近づいています: {Used}/{Max}", used, max);
                    }
                }
            }
        }
        
        // GraphQL API制限情報の更新（将来の拡張用）
        if (headers.TryGetValues("X-Shopify-Shop-Api-Call-Limit-GraphQL", out var graphqlLimitHeaders))
        {
            var graphqlLimitHeader = graphqlLimitHeaders.FirstOrDefault();
            _logger.LogDebug("GraphQL APIレート制限: {GraphQLLimit}", graphqlLimitHeader);
        }
    }
    
    private async Task ManageBurstLimitAsync(DateTime now, CancellationToken cancellationToken)
    {
        // 1秒以内のリクエスト履歴をクリーンアップ
        while (_requestTimes.Count > 0 && (now - _requestTimes.Peek()).TotalSeconds > 1)
        {
            _requestTimes.Dequeue();
        }
        
        // バースト制限チェック
        if (_requestTimes.Count >= _burstSize)
        {
            var oldestRequest = _requestTimes.Peek();
            var waitTime = TimeSpan.FromSeconds(1) - (now - oldestRequest);
            
            if (waitTime > TimeSpan.Zero)
            {
                _logger.LogDebug("バースト制限のため {WaitMs}ms 待機します", waitTime.TotalMilliseconds);
                await Task.Delay(waitTime, cancellationToken);
            }
        }
    }
    
    public void Reset()
    {
        _lastRequestTime = DateTime.MinValue;
        _remainingCalls = int.MaxValue;
        _requestTimes.Clear();
        _logger.LogInformation("レート制限ハンドラーをリセットしました");
    }
}
```

### 5.3 TelemetryService
```csharp
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using Microsoft.Extensions.Logging;
using ShopifyBatchProcessor.Services.Interfaces;
using ShopifyBatchProcessor.Models.Api;

namespace ShopifyBatchProcessor.Services;

public class TelemetryService : ITelemetryService
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
        try
        {
            var properties = new Dictionary<string, string>
            {
                ["EntityType"] = result.EntityType,
                ["StoreId"] = result.StoreId.ToString(),
                ["Success"] = result.IsSuccess.ToString(),
                ["StartTime"] = result.StartTime.ToString("O"),
                ["EndTime"] = result.EndTime?.ToString("O") ?? ""
            };
            
            var metrics = new Dictionary<string, double>
            {
                ["ProcessedCount"] = result.ProcessedCount,
                ["ErrorCount"] = result.ErrorCount,
                ["DurationMs"] = result.Duration?.TotalMilliseconds ?? 0
            };
            
            // カスタムイベント
            _telemetryClient.TrackEvent("SyncCompleted", properties, metrics);
            
            // カスタムメトリクス
            _telemetryClient.TrackMetric($"Sync.{result.EntityType}.ProcessedCount", result.ProcessedCount);
            _telemetryClient.TrackMetric($"Sync.{result.EntityType}.ErrorCount", result.ErrorCount);
            
            if (result.Duration.HasValue)
            {
                _telemetryClient.TrackMetric($"Sync.{result.EntityType}.Duration", result.Duration.Value.TotalSeconds);
            }
            
            // 成功率の計算
            var successRate = result.ProcessedCount > 0 ? 
                (double)(result.ProcessedCount - result.ErrorCount) / result.ProcessedCount * 100 : 100;
            _telemetryClient.TrackMetric($"Sync.{result.EntityType}.SuccessRate", successRate);
            
            _logger.LogDebug("同期メトリクス送信完了 - {EntityType}: 処理{ProcessedCount}件, エラー{ErrorCount}件", 
                result.EntityType, result.ProcessedCount, result.ErrorCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "同期メトリクス送信エラー");
        }
    }
    
    public void TrackApiCall(string endpoint, bool success, TimeSpan duration, int? rateLimitRemaining = null)
    {
        try
        {
            var properties = new Dictionary<string, string>
            {
                ["Endpoint"] = endpoint,
                ["Success"] = success.ToString(),
                ["Timestamp"] = DateTime.UtcNow.ToString("O")
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
            
            // 遅い API 呼び出しの追跡
            if (duration.TotalSeconds > 5)
            {
                _telemetryClient.TrackEvent("SlowApiCall", properties, metrics);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "API呼び出しメトリクス送信エラー");
        }
    }
    
    public void TrackException(Exception exception, Dictionary<string, string>? properties = null)
    {
        try
        {
            var exceptionTelemetry = new ExceptionTelemetry(exception)
            {
                SeverityLevel = SeverityLevel.Error
            };
            
            if (properties != null)
            {
                foreach (var prop in properties)
                {
                    exceptionTelemetry.Properties[prop.Key] = prop.Value;
                }
            }
            
            _telemetryClient.TrackException(exceptionTelemetry);
            
            _logger.LogDebug("例外テレメトリー送信完了 - {ExceptionType}: {Message}", 
                exception.GetType().Name, exception.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "例外テレメトリー送信エラー");
        }
    }
    
    public void TrackPerformanceCounters()
    {
        try
        {
            // GC情報
            var gen0Collections = GC.CollectionCount(0);
            var gen1Collections = GC.CollectionCount(1);
            var gen2Collections = GC.CollectionCount(2);
            var totalMemory = GC.GetTotalMemory(false);
            
            _telemetryClient.TrackMetric("Performance.GC.Gen0Collections", gen0Collections);
            _telemetryClient.TrackMetric("Performance.GC.Gen1Collections", gen1Collections);
            _telemetryClient.TrackMetric("Performance.GC.Gen2Collections", gen2Collections);
            _telemetryClient.TrackMetric("Performance.Memory.TotalBytes", totalMemory);
            
            // プロセス情報
            using var process = System.Diagnostics.Process.GetCurrentProcess();
            _telemetryClient.TrackMetric("Performance.Process.WorkingSetMB", 
                process.WorkingSet64 / 1024.0 / 1024.0);
            _telemetryClient.TrackMetric("Performance.Process.ThreadCount", process.Threads.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "パフォーマンスカウンター送信エラー");
        }
    }
    
    public void Flush()
    {
        try
        {
            _telemetryClient.Flush();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "テレメトリーフラッシュエラー");
        }
    }
}
```

## 6. ミドルウェア実装

### 6.1 ExceptionHandlingMiddleware
```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using ShopifyBatchProcessor.Services.Interfaces;

namespace ShopifyBatchProcessor.Middleware;

public class ExceptionHandlingMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    
    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger)
    {
        _logger = logger;
    }
    
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var functionName = context.FunctionDefinition.Name;
        var invocationId = context.InvocationId;
        
        try
        {
            await next(context);
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning("Function {FunctionName} がキャンセルされました - InvocationId: {InvocationId}", 
                functionName, invocationId);
            
            // キャンセルは正常な処理として扱う
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Function {FunctionName} で未処理例外が発生しました - InvocationId: {InvocationId}", 
                functionName, invocationId);
            
            // テレメトリー送信
            try
            {
                var telemetryService = context.InstanceServices.GetService(typeof(ITelemetryService)) as ITelemetryService;
                telemetryService?.TrackException(ex, new Dictionary<string, string>
                {
                    ["FunctionName"] = functionName,
                    ["InvocationId"] = invocationId,
                    ["ExceptionType"] = ex.GetType().Name
                });
            }
            catch (Exception telemetryEx)
            {
                _logger.LogError(telemetryEx, "テレメトリー送信中にエラーが発生しました");
            }
            
            // 元の例外を再スロー
            throw;
        }
    }
}
```

このサンプルコード集により、Azure Functionsベースの包括的なShopifyバッチ処理システムを実装できます。