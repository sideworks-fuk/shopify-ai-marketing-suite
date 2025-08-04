# Hangfire実装ガイド - Shopifyデータ同期

## 概要
既存のASP.NET Core App ServiceにHangfireを統合し、Shopifyデータの定期同期を実現する実装ガイド。

## 実装手順

### 1. NuGetパッケージのインストール

```xml
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.5" />
<PackageReference Include="Hangfire.SqlServer" Version="1.8.5" />
```

### 2. Startup.cs の設定

```csharp
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        // Hangfireの設定
        services.AddHangfire(configuration => configuration
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(Configuration.GetConnectionString("DefaultConnection"), new SqlServerStorageOptions
            {
                CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                QueuePollInterval = TimeSpan.Zero,
                UseRecommendedIsolationLevel = true,
                DisableGlobalLocks = true
            }));

        // Hangfireサーバーの追加
        services.AddHangfireServer();

        // 既存のサービス登録
        services.AddScoped<IShopifyDataSyncService, ShopifyDataSyncService>();
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Hangfireダッシュボード（開発環境のみ）
        if (env.IsDevelopment())
        {
            app.UseHangfireDashboard("/hangfire", new DashboardOptions
            {
                Authorization = new[] { new HangfireAuthorizationFilter() }
            });
        }

        // 定期ジョブの登録
        RecurringJob.AddOrUpdate<IShopifyDataSyncService>(
            "shopify-data-sync",
            service => service.SyncAllStoresAsync(),
            Cron.Hourly);
    }
}
```

### 3. 認証フィルター

```csharp
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        
        // 本番環境では管理者のみアクセス可能にする
        return httpContext.User.Identity?.IsAuthenticated ?? false;
    }
}
```

### 4. データ同期サービスの実装

```csharp
public interface IShopifyDataSyncService
{
    Task SyncAllStoresAsync();
    Task SyncStoreAsync(int storeId);
}

public class ShopifyDataSyncService : IShopifyDataSyncService
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<ShopifyDataSyncService> _logger;
    private readonly IShopifyApiClient _shopifyClient;
    private readonly IMemoryCache _cache;

    public ShopifyDataSyncService(
        ShopifyDbContext context,
        ILogger<ShopifyDataSyncService> logger,
        IShopifyApiClient shopifyClient,
        IMemoryCache cache)
    {
        _context = context;
        _logger = logger;
        _shopifyClient = shopifyClient;
        _cache = cache;
    }

    public async Task SyncAllStoresAsync()
    {
        _logger.LogInformation("Starting Shopify data sync for all stores");

        var activeStores = await _context.Stores
            .Where(s => s.IsActive && !string.IsNullOrEmpty(s.AccessToken))
            .ToListAsync();

        _logger.LogInformation($"Found {activeStores.Count} active stores to sync");

        foreach (var store in activeStores)
        {
            try
            {
                await SyncStoreAsync(store.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to sync store {store.Id} ({store.Name})");
                // エラーがあっても他のストアの同期は続行
            }
        }

        _logger.LogInformation("Completed Shopify data sync for all stores");
    }

    public async Task SyncStoreAsync(int storeId)
    {
        var store = await _context.Stores.FindAsync(storeId);
        if (store == null)
        {
            _logger.LogWarning($"Store {storeId} not found");
            return;
        }

        _logger.LogInformation($"Syncing store {store.Name} (ID: {storeId})");

        // 同期の実行
        await SyncOrdersAsync(store);
        await SyncCustomersAsync(store);
        await SyncProductsAsync(store);

        // 最終同期時刻を更新
        store.LastSyncAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private async Task SyncOrdersAsync(Store store)
    {
        try
        {
            var lastOrderSync = store.LastOrderSync ?? DateTime.UtcNow.AddMonths(-3);
            
            _logger.LogInformation($"Syncing orders for store {store.Name} from {lastOrderSync}");

            var orders = await _shopifyClient.GetOrdersAsync(
                store.Domain, 
                store.AccessToken, 
                lastOrderSync);

            foreach (var shopifyOrder in orders)
            {
                var existingOrder = await _context.Orders
                    .FirstOrDefaultAsync(o => 
                        o.StoreId == store.Id && 
                        o.OrderNumber == shopifyOrder.OrderNumber);

                if (existingOrder == null)
                {
                    // 新規注文
                    var order = new Order
                    {
                        StoreId = store.Id,
                        OrderNumber = shopifyOrder.OrderNumber,
                        CustomerId = await GetOrCreateCustomerIdAsync(store.Id, shopifyOrder.Customer),
                        TotalPrice = shopifyOrder.TotalPrice,
                        SubtotalPrice = shopifyOrder.SubtotalPrice,
                        TaxPrice = shopifyOrder.TotalTax,
                        Currency = shopifyOrder.Currency,
                        Status = shopifyOrder.FulfillmentStatus ?? "unfulfilled",
                        FinancialStatus = shopifyOrder.FinancialStatus ?? "pending",
                        CreatedAt = shopifyOrder.CreatedAt,
                        UpdatedAt = shopifyOrder.UpdatedAt
                    };

                    _context.Orders.Add(order);
                    
                    // 注文明細の追加
                    foreach (var lineItem in shopifyOrder.LineItems)
                    {
                        var orderItem = new OrderItem
                        {
                            Order = order,
                            ProductId = lineItem.ProductId?.ToString(),
                            ProductTitle = lineItem.Title,
                            ProductVendor = lineItem.Vendor,
                            Sku = lineItem.Sku,
                            Quantity = lineItem.Quantity,
                            Price = lineItem.Price,
                            TotalPrice = lineItem.Price * lineItem.Quantity
                        };

                        _context.OrderItems.Add(orderItem);
                    }
                }
                else
                {
                    // 既存注文の更新
                    existingOrder.Status = shopifyOrder.FulfillmentStatus ?? "unfulfilled";
                    existingOrder.FinancialStatus = shopifyOrder.FinancialStatus ?? "pending";
                    existingOrder.UpdatedAt = shopifyOrder.UpdatedAt;
                }
            }

            await _context.SaveChangesAsync();
            
            store.LastOrderSync = DateTime.UtcNow;
            
            _logger.LogInformation($"Synced {orders.Count} orders for store {store.Name}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error syncing orders for store {store.Name}");
            throw;
        }
    }

    private async Task<int> GetOrCreateCustomerIdAsync(int storeId, ShopifyCustomer shopifyCustomer)
    {
        if (shopifyCustomer == null)
        {
            // ゲスト注文の場合はデフォルト顧客を返す
            return await GetGuestCustomerIdAsync(storeId);
        }

        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => 
                c.StoreId == storeId && 
                c.ShopifyCustomerId == shopifyCustomer.Id.ToString());

        if (customer == null)
        {
            customer = new Customer
            {
                StoreId = storeId,
                ShopifyCustomerId = shopifyCustomer.Id.ToString(),
                Email = shopifyCustomer.Email,
                FirstName = shopifyCustomer.FirstName ?? "Unknown",
                LastName = shopifyCustomer.LastName ?? "Customer",
                Phone = shopifyCustomer.Phone,
                AcceptsEmailMarketing = shopifyCustomer.AcceptsMarketing,
                TotalSpent = shopifyCustomer.TotalSpent,
                TotalOrders = shopifyCustomer.OrdersCount,
                Tags = shopifyCustomer.Tags,
                CreatedAt = shopifyCustomer.CreatedAt,
                UpdatedAt = shopifyCustomer.UpdatedAt
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();
        }

        return customer.Id;
    }

    private async Task<int> GetGuestCustomerIdAsync(int storeId)
    {
        var guestCustomer = await _context.Customers
            .FirstOrDefaultAsync(c => 
                c.StoreId == storeId && 
                c.Email == "guest@example.com");

        if (guestCustomer == null)
        {
            guestCustomer = new Customer
            {
                StoreId = storeId,
                Email = "guest@example.com",
                FirstName = "Guest",
                LastName = "Customer",
                CustomerSegment = "ゲスト"
            };

            _context.Customers.Add(guestCustomer);
            await _context.SaveChangesAsync();
        }

        return guestCustomer.Id;
    }

    private async Task SyncCustomersAsync(Store store)
    {
        // 実装省略（SyncOrdersAsyncと同様のパターン）
    }

    private async Task SyncProductsAsync(Store store)
    {
        // 実装省略（SyncOrdersAsyncと同様のパターン）
    }
}
```

### 5. Shopify APIクライアント

```csharp
public interface IShopifyApiClient
{
    Task<List<ShopifyOrder>> GetOrdersAsync(string domain, string accessToken, DateTime updatedAtMin);
    Task<List<ShopifyCustomer>> GetCustomersAsync(string domain, string accessToken, DateTime updatedAtMin);
    Task<List<ShopifyProduct>> GetProductsAsync(string domain, string accessToken, DateTime updatedAtMin);
}

public class ShopifyApiClient : IShopifyApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ShopifyApiClient> _logger;

    public ShopifyApiClient(HttpClient httpClient, ILogger<ShopifyApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<List<ShopifyOrder>> GetOrdersAsync(string domain, string accessToken, DateTime updatedAtMin)
    {
        var orders = new List<ShopifyOrder>();
        var url = $"https://{domain}/admin/api/2024-01/orders.json?updated_at_min={updatedAtMin:yyyy-MM-ddTHH:mm:ssZ}&limit=250";

        while (!string.IsNullOrEmpty(url))
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("X-Shopify-Access-Token", accessToken);

            var response = await _httpClient.SendAsync(request);
            
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // レート制限対応
                await Task.Delay(2000);
                continue;
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ShopifyOrdersResponse>(content);
            
            orders.AddRange(result.Orders);

            // ページネーション処理
            url = GetNextPageUrl(response.Headers);
        }

        return orders;
    }

    private string GetNextPageUrl(HttpResponseHeaders headers)
    {
        if (headers.TryGetValues("Link", out var linkHeaders))
        {
            var linkHeader = linkHeaders.FirstOrDefault();
            if (!string.IsNullOrEmpty(linkHeader))
            {
                var links = linkHeader.Split(',');
                foreach (var link in links)
                {
                    if (link.Contains("rel=\"next\""))
                    {
                        var match = Regex.Match(link, "<(.+?)>");
                        if (match.Success)
                        {
                            return match.Groups[1].Value;
                        }
                    }
                }
            }
        }

        return null;
    }
}
```

### 6. エラーハンドリングとリトライ

```csharp
public class RetryableJob
{
    public static async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        int maxRetries = 3,
        ILogger logger = null)
    {
        for (int i = 0; i <= maxRetries; i++)
        {
            try
            {
                return await operation();
            }
            catch (HttpRequestException ex) when (i < maxRetries)
            {
                logger?.LogWarning($"Attempt {i + 1} failed, retrying... {ex.Message}");
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, i)));
            }
        }

        throw new Exception($"Operation failed after {maxRetries} retries");
    }
}
```

### 7. 監視とアラート

```csharp
// Application Insights統合
public class TelemetryJobFilter : JobFilterAttribute, IClientFilter, IServerFilter
{
    private readonly TelemetryClient _telemetryClient;

    public TelemetryJobFilter(TelemetryClient telemetryClient)
    {
        _telemetryClient = telemetryClient;
    }

    public void OnPerforming(PerformingContext filterContext)
    {
        _telemetryClient.TrackEvent("HangfireJobStarted", new Dictionary<string, string>
        {
            ["JobId"] = filterContext.BackgroundJob.Id,
            ["JobType"] = filterContext.BackgroundJob.Job.Type.Name,
            ["JobMethod"] = filterContext.BackgroundJob.Job.Method.Name
        });
    }

    public void OnPerformed(PerformedContext filterContext)
    {
        _telemetryClient.TrackEvent("HangfireJobCompleted", new Dictionary<string, string>
        {
            ["JobId"] = filterContext.BackgroundJob.Id,
            ["Succeeded"] = (!filterContext.Canceled && filterContext.Exception == null).ToString()
        });

        if (filterContext.Exception != null)
        {
            _telemetryClient.TrackException(filterContext.Exception);
        }
    }
}
```

## 実装チェックリスト

### 今日（8/2）
- [ ] NuGetパッケージのインストール
- [ ] Startup.csの設定
- [ ] 基本的なジョブクラスの作成
- [ ] ローカルでの動作確認

### 明日（8/3）
- [ ] Shopify APIクライアントの実装
- [ ] データ同期ロジックの完成
- [ ] エラーハンドリングの実装
- [ ] 本番環境へのデプロイ

---

作成: 2025-08-02 10:00
作成者: KENJI