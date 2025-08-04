# Azure Functions バッチ処理実装ガイド
**作成日**: 2025年7月28日  
**作成者**: ケンジ

## 1. 概要
Shopifyデータの定期同期を行うAzure Functionsの実装ガイド。

## 2. プロジェクト構造
```
ShopifySync.Functions/
├── Functions/
│   ├── DailyOrderSync.cs
│   ├── CustomerSync.cs
│   └── ProductSync.cs
├── Services/
│   ├── ShopifyService.cs
│   ├── DatabaseService.cs
│   └── NotificationService.cs
├── Models/
│   └── SyncModels.cs
├── host.json
├── local.settings.json
└── ShopifySync.Functions.csproj
```

## 3. 実装手順

### 3.1 プロジェクトセットアップ

#### 必要なツール
```bash
# Azure Functions Core Tools インストール
npm install -g azure-functions-core-tools@4

# プロジェクト作成
func init ShopifySync.Functions --dotnet
cd ShopifySync.Functions
```

#### NuGetパッケージ
```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.20.0" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Timer" Version="4.2.0" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.1.0" />
<PackageReference Include="ShopifySharp" Version="6.14.0" />
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="8.0.0" />
<PackageReference Include="Microsoft.ApplicationInsights.WorkerService" Version="2.21.0" />
```

### 3.2 日次注文同期Function

```csharp
// Functions/DailyOrderSync.cs
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class DailyOrderSync
{
    private readonly ILogger<DailyOrderSync> _logger;
    private readonly IShopifyService _shopifyService;
    private readonly IDatabaseService _databaseService;
    private readonly INotificationService _notificationService;

    public DailyOrderSync(
        ILogger<DailyOrderSync> logger,
        IShopifyService shopifyService,
        IDatabaseService databaseService,
        INotificationService notificationService)
    {
        _logger = logger;
        _shopifyService = shopifyService;
        _databaseService = databaseService;
        _notificationService = notificationService;
    }

    [Function("DailyOrderSync")]
    public async Task Run([TimerTrigger("0 0 2 * * *")] TimerInfo timerInfo)
    {
        _logger.LogInformation($"注文同期開始: {DateTime.UtcNow}");
        
        var syncReport = new SyncReport
        {
            StartTime = DateTime.UtcNow,
            Type = "Orders"
        };

        try
        {
            // アクティブなストアを取得
            var stores = await _databaseService.GetActiveStoresAsync();
            
            foreach (var store in stores)
            {
                try
                {
                    await SyncStoreOrders(store, syncReport);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"ストア {store.Name} の同期エラー");
                    syncReport.Errors.Add(new SyncError
                    {
                        StoreId = store.Id,
                        ErrorMessage = ex.Message,
                        Timestamp = DateTime.UtcNow
                    });
                }
            }

            syncReport.EndTime = DateTime.UtcNow;
            syncReport.Success = syncReport.Errors.Count == 0;
            
            // 同期レポートを保存
            await _databaseService.SaveSyncReportAsync(syncReport);
            
            // 通知送信
            if (!syncReport.Success)
            {
                await _notificationService.SendErrorNotificationAsync(syncReport);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "注文同期で致命的エラー");
            throw;
        }
    }

    private async Task SyncStoreOrders(Store store, SyncReport report)
    {
        var lastSync = await _databaseService.GetLastSyncTimeAsync(store.Id, "Orders");
        var orders = await _shopifyService.GetOrdersAsync(store, lastSync);
        
        _logger.LogInformation($"ストア {store.Name}: {orders.Count} 件の注文を取得");
        
        var processedCount = 0;
        var batch = new List<Order>();
        
        foreach (var shopifyOrder in orders)
        {
            var order = MapShopifyOrder(shopifyOrder, store.Id);
            batch.Add(order);
            
            if (batch.Count >= 100)
            {
                await _databaseService.UpsertOrdersAsync(batch);
                processedCount += batch.Count;
                batch.Clear();
            }
        }
        
        if (batch.Any())
        {
            await _databaseService.UpsertOrdersAsync(batch);
            processedCount += batch.Count;
        }
        
        report.ProcessedCounts[store.Id] = processedCount;
        _logger.LogInformation($"ストア {store.Name}: {processedCount} 件の注文を処理");
    }
}
```

### 3.3 Shopifyサービス実装

```csharp
// Services/ShopifyService.cs
public interface IShopifyService
{
    Task<List<ShopifySharp.Order>> GetOrdersAsync(Store store, DateTime? since);
    Task<List<ShopifySharp.Customer>> GetCustomersAsync(Store store, DateTime? since);
    Task<List<ShopifySharp.Product>> GetProductsAsync(Store store, DateTime? since);
}

public class ShopifyService : IShopifyService
{
    private readonly ILogger<ShopifyService> _logger;
    private readonly Dictionary<int, ShopifySharp.OrderService> _orderServices;

    public ShopifyService(ILogger<ShopifyService> logger)
    {
        _logger = logger;
        _orderServices = new Dictionary<int, ShopifySharp.OrderService>();
    }

    public async Task<List<ShopifySharp.Order>> GetOrdersAsync(Store store, DateTime? since)
    {
        var service = GetOrderService(store);
        var allOrders = new List<ShopifySharp.Order>();
        var page = await service.ListAsync(new OrderListFilter
        {
            UpdatedAtMin = since,
            Limit = 250,
            Status = "any"
        });

        while (true)
        {
            allOrders.AddRange(page.Items);
            
            if (!page.HasNextPage)
                break;
                
            page = await service.ListAsync(page.GetNextPageFilter());
            
            // レート制限対応
            await HandleRateLimit(page);
        }

        return allOrders;
    }

    private ShopifySharp.OrderService GetOrderService(Store store)
    {
        if (!_orderServices.ContainsKey(store.Id))
        {
            var settings = JsonSerializer.Deserialize<StoreSettings>(store.Settings);
            _orderServices[store.Id] = new ShopifySharp.OrderService(
                store.Domain, 
                settings.AccessToken);
        }
        
        return _orderServices[store.Id];
    }

    private async Task HandleRateLimit<T>(ListResult<T> result)
    {
        if (result.Response.Headers.TryGetValues("X-Shopify-Shop-Api-Call-Limit", out var values))
        {
            var parts = values.First().Split('/');
            var current = int.Parse(parts[0]);
            var max = int.Parse(parts[1]);
            
            if (current >= max * 0.8)
            {
                _logger.LogWarning($"API制限に近づいています: {current}/{max}");
                await Task.Delay(2000);
            }
        }
    }
}
```

### 3.4 データベースサービス実装

```csharp
// Services/DatabaseService.cs
public class DatabaseService : IDatabaseService
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<DatabaseService> _logger;

    public async Task UpsertOrdersAsync(List<Order> orders)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            foreach (var order in orders)
            {
                var existing = await _context.Orders
                    .FirstOrDefaultAsync(o => o.OrderNumber == order.OrderNumber 
                        && o.StoreId == order.StoreId);
                        
                if (existing != null)
                {
                    // 更新
                    _context.Entry(existing).CurrentValues.SetValues(order);
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // 新規追加
                    await _context.Orders.AddAsync(order);
                }
            }
            
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<DateTime?> GetLastSyncTimeAsync(int storeId, string syncType)
    {
        var lastSync = await _context.SyncLogs
            .Where(s => s.StoreId == storeId && s.SyncType == syncType)
            .OrderByDescending(s => s.SyncTime)
            .FirstOrDefaultAsync();
            
        return lastSync?.SyncTime;
    }
}
```

### 3.5 監視とログ

```json
// host.json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      },
      "enableLiveMetricsFilters": true
    },
    "logLevel": {
      "default": "Information",
      "Function": "Information",
      "Host.Aggregator": "Information"
    }
  },
  "extensions": {
    "http": {
      "routePrefix": "api",
      "maxConcurrentRequests": 100
    }
  }
}
```

### 3.6 エラーハンドリングとリトライ

```csharp
// Services/RetryPolicy.cs
public static class RetryPolicy
{
    public static async Task<T> ExecuteAsync<T>(
        Func<Task<T>> operation,
        int maxRetries = 3,
        int baseDelayMs = 1000)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                return await operation();
            }
            catch (ShopifyRateLimitException)
            {
                if (i == maxRetries - 1) throw;
                
                var delay = baseDelayMs * Math.Pow(2, i);
                await Task.Delay(TimeSpan.FromMilliseconds(delay));
            }
            catch (HttpRequestException ex) when (i < maxRetries - 1)
            {
                var delay = baseDelayMs * Math.Pow(2, i);
                await Task.Delay(TimeSpan.FromMilliseconds(delay));
            }
        }
        
        throw new InvalidOperationException("最大リトライ回数を超過");
    }
}
```

## 4. デプロイメント

### 4.1 ローカルテスト
```bash
# ローカル設定
cp local.settings.json.sample local.settings.json

# 実行
func start
```

### 4.2 Azureへのデプロイ
```bash
# リソースグループ作成
az group create --name shopify-sync-rg --location japaneast

# ストレージアカウント作成
az storage account create \
  --name shopifysyncstore \
  --resource-group shopify-sync-rg \
  --location japaneast \
  --sku Standard_LRS

# Function App作成
az functionapp create \
  --resource-group shopify-sync-rg \
  --consumption-plan-location japaneast \
  --runtime dotnet \
  --functions-version 4 \
  --name shopify-sync-functions \
  --storage-account shopifysyncstore

# デプロイ
func azure functionapp publish shopify-sync-functions
```

### 4.3 Application Insights設定
```csharp
// Program.cs
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        
        // カスタムメトリクス
        services.AddSingleton<ITelemetryInitializer, CustomTelemetryInitializer>();
    })
    .Build();
```

## 5. 監視とアラート

### 5.1 カスタムメトリクス
```csharp
public class SyncMetrics
{
    private readonly TelemetryClient _telemetryClient;
    
    public void RecordSyncDuration(string storeId, string syncType, double duration)
    {
        _telemetryClient.TrackMetric("SyncDuration", duration, 
            new Dictionary<string, string>
            {
                { "StoreId", storeId },
                { "SyncType", syncType }
            });
    }
    
    public void RecordSyncItemCount(string storeId, string syncType, int count)
    {
        _telemetryClient.TrackMetric("SyncItemCount", count,
            new Dictionary<string, string>
            {
                { "StoreId", storeId },
                { "SyncType", syncType }
            });
    }
}
```

### 5.2 アラート設定
```bash
# 同期エラーアラート
az monitor metrics alert create \
  --name "sync-error-alert" \
  --resource-group shopify-sync-rg \
  --scopes "/subscriptions/{subscription-id}/resourceGroups/shopify-sync-rg/providers/Microsoft.Web/sites/shopify-sync-functions" \
  --condition "count(exceptions) > 5" \
  --window-size 5m \
  --evaluation-frequency 1m
```

## 6. パフォーマンス最適化

### 6.1 並列処理
```csharp
public async Task SyncAllStoresAsync()
{
    var stores = await GetActiveStoresAsync();
    var semaphore = new SemaphoreSlim(5); // 最大5並列
    
    var tasks = stores.Select(async store =>
    {
        await semaphore.WaitAsync();
        try
        {
            await SyncStoreAsync(store);
        }
        finally
        {
            semaphore.Release();
        }
    });
    
    await Task.WhenAll(tasks);
}
```

### 6.2 バッチ処理
```csharp
public async Task BulkInsertOrdersAsync(List<Order> orders)
{
    using var bulkCopy = new SqlBulkCopy(_connectionString)
    {
        DestinationTableName = "Orders",
        BatchSize = 1000
    };
    
    // カラムマッピング
    bulkCopy.ColumnMappings.Add("StoreId", "StoreId");
    bulkCopy.ColumnMappings.Add("OrderNumber", "OrderNumber");
    // ... 他のカラム
    
    using var dataTable = CreateOrderDataTable(orders);
    await bulkCopy.WriteToServerAsync(dataTable);
}
```