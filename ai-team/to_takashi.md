# Takashiへの作業指示
**日付:** 2025年8月12日（月）20:00  
**差出人:** Kenji

## 🚀 前倒し実装開始！

OAuth問題が解決したので、予定を前倒しして今から準備を始めましょう。

## 明日（8/13）の作業詳細

### 午前: HangFire基本設定（9:00-12:00）

#### 1. 必要なNuGetパッケージ
```xml
<PackageReference Include="Hangfire.Core" Version="1.8.6" />
<PackageReference Include="Hangfire.SqlServer" Version="1.8.6" />
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.6" />
```

#### 2. Program.cs設定例
```csharp
// HangFire設定
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
        QueuePollInterval = TimeSpan.Zero,
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks = true
    }));

// HangFireサーバー
builder.Services.AddHangfireServer(options =>
{
    options.ServerName = "EC-Ranger-Server";
    options.WorkerCount = Environment.ProcessorCount * 2;
});

// ダッシュボード
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthorizationFilter() },
    DashboardTitle = "EC Ranger - Job Dashboard"
});
```

#### 3. Azure App Service対策
```csharp
public class KeepAliveService : BackgroundService
{
    private readonly ILogger<KeepAliveService> _logger;
    private readonly IServiceProvider _serviceProvider;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
                    await context.Database.ExecuteSqlRawAsync("SELECT 1");
                }
                
                _logger.LogDebug("Keep alive ping executed");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Keep alive ping failed");
            }
        }
    }
}
```

### 午後: 商品データ同期（13:00-18:00）

#### 1. ShopifyProductSyncJob.cs
```csharp
public class ShopifyProductSyncJob
{
    private readonly ShopifyApiService _shopifyApi;
    private readonly ShopifyDbContext _context;
    private readonly ILogger<ShopifyProductSyncJob> _logger;
    
    public async Task SyncProducts(int storeId)
    {
        try
        {
            var store = await _context.Stores
                .FirstOrDefaultAsync(s => s.StoreId == storeId);
                
            if (store == null)
            {
                _logger.LogWarning($"Store not found: {storeId}");
                return;
            }
            
            _logger.LogInformation($"商品同期開始: {store.Name}");
            
            // ページネーション対応
            string? pageInfo = null;
            int totalProducts = 0;
            
            do
            {
                var result = await _shopifyApi.GetProductsPagedAsync(
                    store.Domain, 
                    store.AccessToken, 
                    pageInfo);
                
                foreach (var product in result.Products)
                {
                    await SaveOrUpdateProduct(product, storeId);
                    totalProducts++;
                }
                
                pageInfo = result.NextPageInfo;
                
                // Rate Limit対策
                await Task.Delay(500);
                
            } while (!string.IsNullOrEmpty(pageInfo));
            
            _logger.LogInformation($"商品同期完了: {totalProducts}件");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"商品同期エラー: StoreId={storeId}");
            throw;
        }
    }
    
    private async Task SaveOrUpdateProduct(ShopifyProduct shopifyProduct, int storeId)
    {
        var existing = await _context.Products
            .FirstOrDefaultAsync(p => p.ShopifyProductId == shopifyProduct.Id && p.StoreId == storeId);
            
        if (existing != null)
        {
            // 更新
            existing.Title = shopifyProduct.Title;
            existing.Description = shopifyProduct.BodyHtml;
            existing.UpdatedAt = DateTime.UtcNow;
            _context.Products.Update(existing);
        }
        else
        {
            // 新規作成
            var product = new Product
            {
                StoreId = storeId,
                ShopifyProductId = shopifyProduct.Id.ToString(),
                Title = shopifyProduct.Title,
                Description = shopifyProduct.BodyHtml,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Products.Add(product);
        }
        
        await _context.SaveChangesAsync();
    }
}
```

#### 2. ジョブ登録
```csharp
// 各ストアに対してジョブを登録
var stores = await _context.Stores.Where(s => s.IsActive).ToListAsync();
foreach (var store in stores)
{
    RecurringJob.AddOrUpdate<ShopifyProductSyncJob>(
        $"sync-products-store-{store.StoreId}",
        job => job.SyncProducts(store.StoreId),
        Cron.Hourly);
}
```

## チェックリスト

### 午前完了時
- [ ] HangFireパッケージインストール
- [ ] Program.cs設定完了
- [ ] データベーステーブル作成確認
- [ ] /hangfireダッシュボード表示
- [ ] KeepAliveService実装

### 午後完了時
- [ ] ShopifyProductSyncJob実装
- [ ] ページネーション対応
- [ ] Rate Limit対策
- [ ] エラーハンドリング
- [ ] 最低1店舗でテスト成功

## 技術的な相談事項

1. **データベース設計**
   - Productテーブルに追加カラムが必要か？
   - バリアント（SKU）の扱いは？

2. **同期戦略**
   - 差分同期 vs 全件同期？
   - 削除された商品の扱いは？

3. **パフォーマンス**
   - バッチサイズの最適値は？
   - 並列処理は必要か？

## サポート

何か問題があれば即座に連絡してください。
- 技術的な問題: temp.mdに記載
- 設計の相談: このファイルに返信

ShopifyApiServiceは既に実装済みなので、それを活用してください。

頑張りましょう！🚀

Kenji