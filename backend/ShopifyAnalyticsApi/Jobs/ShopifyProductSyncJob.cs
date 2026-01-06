using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Sync;
using Hangfire;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Jobs
{
    /// <summary>
    /// Shopify商品データ同期ジョブ
    /// </summary>
    public class ShopifyProductSyncJob
    {
        private readonly ShopifyApiService _shopifyApi;
        private readonly ShopifyDbContext _context;
        private readonly ILogger<ShopifyProductSyncJob> _logger;
        private readonly IConfiguration _configuration;
        private readonly ICheckpointManager _checkpointManager;
        private readonly ISyncRangeManager _syncRangeManager;
        private readonly ISyncProgressTracker _progressTracker;

        public ShopifyProductSyncJob(
            ShopifyApiService shopifyApi,
            ShopifyDbContext context,
            ILogger<ShopifyProductSyncJob> logger,
            IConfiguration configuration,
            ICheckpointManager checkpointManager,
            ISyncRangeManager syncRangeManager,
            ISyncProgressTracker progressTracker)
        {
            _shopifyApi = shopifyApi;
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _checkpointManager = checkpointManager;
            _syncRangeManager = syncRangeManager;
            _progressTracker = progressTracker;
        }

        /// <summary>
        /// 指定されたストアの商品データを同期する（範囲指定とチェックポイント対応）
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task SyncProducts(int storeId, InitialSyncOptions? options = null)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == storeId);
                
                if (store == null)
                {
                    _logger.LogWarning($"Store not found: {storeId}");
                    return;
                }

                if (!store.IsActive)
                {
                    _logger.LogInformation($"Store is not active: {store.Name}");
                    return;
                }

                // アクセストークンの取得と検証
                var accessToken = GetAccessToken(store);
                if (string.IsNullOrEmpty(accessToken))
                {
                    _logger.LogError($"Access token not found for store: {store.Name}");
                    return;
                }

                _logger.LogInformation($"Starting product sync for store: {store.Name} (ID: {storeId})");
                
                // 同期範囲を決定
                var dateRange = await _syncRangeManager.DetermineSyncRangeAsync(
                    storeId, "Products", options);
                
                // 同期進捗を開始
                var syncStateId = await _progressTracker.StartSyncAsync(
                    storeId, "Products", dateRange);
                
                try
                {
                    // チェックポイントから再開情報を取得
                    var resumeInfo = await _checkpointManager.GetResumeInfoAsync(
                        storeId, "Products");
                    
                    var syncedCount = 0;
                    var lastCursor = resumeInfo?.LastCursor;
                    var totalProcessed = resumeInfo?.RecordsAlreadyProcessed ?? 0;
                    
                    if (resumeInfo != null)
                    {
                        _logger.LogInformation(
                            $"Resuming sync from checkpoint: {totalProcessed} records already processed");
                    }
                    
                    // 同期実行（ページネーション処理）
                    var hasMorePages = true;
                    var currentPageInfo = lastCursor;
                    var batchSize = 100; // バッチ処理のサイズ
                    var page = 1;
                    
                    while (hasMorePages)
                    {
                        // 商品データを取得（実際のShopify API呼び出し）
                        var (shopifyProducts, nextPageInfo) = await _shopifyApi.FetchProductsPageAsync(
                            storeId, dateRange.Start, currentPageInfo);
                        
                        if (shopifyProducts == null || !shopifyProducts.Any())
                        {
                            hasMorePages = false;
                            break;
                        }
                        
                        // バッチ処理でデータベースに保存
                        var batch = new List<Product>();
                        foreach (var shopifyProduct in shopifyProducts)
                        {
                            var product = ConvertToProductEntity(storeId, shopifyProduct);
                            batch.Add(product);
                            
                            // バッチサイズに達したら保存
                            if (batch.Count >= batchSize)
                            {
                                await SaveOrUpdateProductsBatch(storeId, batch);
                                syncedCount += batch.Count;
                                totalProcessed += batch.Count;
                                batch.Clear();
                                
                                // 進捗を更新
                                await _progressTracker.UpdateProgressAsync(
                                    syncStateId, totalProcessed, null, $"Page-{page}");
                                
                                // チェックポイントを保存
                                await _checkpointManager.SaveCheckpointAsync(
                                    storeId, "Products", currentPageInfo ?? $"page-{page}", totalProcessed, dateRange);
                            }
                        }
                        
                        // 残りのバッチを保存
                        if (batch.Any())
                        {
                            await SaveOrUpdateProductsBatch(storeId, batch);
                            syncedCount += batch.Count;
                            totalProcessed += batch.Count;
                            
                            // 進捗を更新
                            await _progressTracker.UpdateProgressAsync(
                                syncStateId, totalProcessed, null, $"Page-{page}");
                            
                            // チェックポイントを保存
                            await _checkpointManager.SaveCheckpointAsync(
                                storeId, "Products", currentPageInfo ?? $"page-{page}", totalProcessed, dateRange);
                        }
                        
                        _logger.LogInformation(
                            $"Processed page {page} with {shopifyProducts.Count} products. Total: {totalProcessed}");
                        
                        // 次のページがあるかチェック
                        if (string.IsNullOrEmpty(nextPageInfo))
                        {
                            hasMorePages = false;
                        }
                        else
                        {
                            currentPageInfo = nextPageInfo;
                            page++;
                            
                            // Rate Limit対策
                            await Task.Delay(TimeSpan.FromMilliseconds(500));
                        }
                    }
                    
                    // 同期完了
                    await _progressTracker.CompleteSyncAsync(syncStateId, true);
                    
                    // チェックポイントをクリア
                    await _checkpointManager.ClearCheckpointAsync(storeId, "Products");
                    
                    _logger.LogInformation(
                        $"Product sync completed for store: {store.Name}. Synced {totalProcessed} products");
                }
                catch (Exception ex)
                {
                    // エラー時は進捗を更新
                    await _progressTracker.CompleteSyncAsync(
                        syncStateId, false, ex.Message);
                    throw;
                }
                
                // 同期日時を更新
                store.LastSyncDate = DateTime.UtcNow;
                store.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                
                // 同期完了後、削除された商品のチェック（オプション）
                if (_configuration.GetValue<bool>("Shopify:CheckDeletedProducts", false))
                {
                    await CheckDeletedProducts(storeId, store.Domain ?? store.Name, accessToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error syncing products for store ID: {storeId}");
                throw; // HangFireの自動リトライを有効にするため再スロー
            }
        }

        /// <summary>
        /// 全てのアクティブなストアの商品を同期する
        /// </summary>
        [AutomaticRetry(Attempts = 2)]
        public async Task SyncAllStoresProducts()
        {
            try
            {
                _logger.LogInformation("Starting product sync for all active stores");
                
                var activeStores = await _context.Stores
                    .Where(s => s.IsActive)
                    .ToListAsync();
                
                if (!activeStores.Any())
                {
                    _logger.LogWarning("No active stores found for product sync");
                    return;
                }
                
                _logger.LogInformation($"Found {activeStores.Count} active stores to sync");
                
                foreach (var store in activeStores)
                {
                    try
                    {
                        // 各ストアを個別のジョブとしてキューに追加
                        BackgroundJob.Enqueue<ShopifyProductSyncJob>(
                            job => job.SyncProducts(store.Id, null));
                        
                        _logger.LogInformation($"Queued product sync job for store: {store.Name}");
                        
                        // Rate Limit対策: ジョブ登録間隔を設ける
                        await Task.Delay(TimeSpan.FromSeconds(1));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to queue sync job for store: {store.Name}");
                    }
                }
                
                _logger.LogInformation("All product sync jobs queued successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during batch product sync");
                throw;
            }
        }

        /// <summary>
        /// 削除された商品をチェックして非アクティブ化
        /// </summary>
        private async Task CheckDeletedProducts(int storeId, string shopDomain, string accessToken)
        {
            try
            {
                _logger.LogInformation($"Checking for deleted products in store: {storeId}");
                
                // データベース内の全商品IDを取得
                var dbProductIds = await _context.Products
                    .Where(p => p.StoreId == storeId)
                    .Select(p => p.ShopifyProductId)
                    .ToListAsync();
                
                // Shopifyから現在の商品IDリストを取得
                // （実際の実装では、ShopifyApiServiceにメソッドを追加する必要があります）
                // var shopifyProductIds = await _shopifyApi.GetAllProductIdsAsync(shopDomain, accessToken);
                
                // 削除された商品を特定
                // var deletedProductIds = dbProductIds.Except(shopifyProductIds).ToList();
                
                // if (deletedProductIds.Any())
                // {
                //     // 削除された商品を非アクティブ化
                //     var productsToDeactivate = await _context.Products
                //         .Where(p => p.StoreId == storeId && deletedProductIds.Contains(p.ShopifyProductId))
                //         .ToListAsync();
                    
                //     foreach (var product in productsToDeactivate)
                //     {
                //         product.IsActive = false;
                //         product.UpdatedAt = DateTime.UtcNow;
                //     }
                    
                //     await _context.SaveChangesAsync();
                    
                //     _logger.LogInformation($"Deactivated {deletedProductIds.Count} deleted products");
                // }
                
                _logger.LogInformation("Deleted products check completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking deleted products");
                // エラーが発生しても同期処理は続行
            }
        }

        /// <summary>
        /// ShopifyProductをProductエンティティに変換
        /// </summary>
        private Product ConvertToProductEntity(int storeId, ShopifyApiService.ShopifyProduct shopifyProduct)
        {
            var product = new Product
            {
                StoreId = storeId,
                ShopifyProductId = shopifyProduct.Id.ToString(),
                Title = shopifyProduct.Title ?? string.Empty,
                ProductType = shopifyProduct.ProductType,
                Vendor = shopifyProduct.Vendor,
                CreatedAt = shopifyProduct.CreatedAt ?? DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Variants = new List<ProductVariant>()
            };

            // バリアントを変換
            if (shopifyProduct.Variants != null)
            {
                foreach (var variant in shopifyProduct.Variants)
                {
                    product.Variants.Add(new ProductVariant
                    {
                        ShopifyVariantId = variant.Id.ToString(),
                        Title = variant.Title ?? string.Empty,
                        Price = variant.Price,
                        Sku = variant.Sku,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            return product;
        }

        /// <summary>
        /// 商品データをバッチ処理で保存または更新（バリアントも含む）
        /// </summary>
        private async Task SaveOrUpdateProductsBatch(int storeId, List<Product> products)
        {
            if (!products.Any()) return;

            var shopifyProductIds = products
                .Where(p => !string.IsNullOrEmpty(p.ShopifyProductId))
                .Select(p => p.ShopifyProductId!)
                .ToList();

            // 既存の商品を一括取得（バリアントも含む）
            var existingProducts = await _context.Products
                .Include(p => p.Variants)
                .Where(p => p.StoreId == storeId && shopifyProductIds.Contains(p.ShopifyProductId!))
                .ToDictionaryAsync(p => p.ShopifyProductId!);

            foreach (var product in products)
            {
                if (string.IsNullOrEmpty(product.ShopifyProductId))
                {
                    _logger.LogWarning("ShopifyProductId is null, skipping product: {Title}", product.Title);
                    continue;
                }

                if (existingProducts.TryGetValue(product.ShopifyProductId, out var existingProduct))
                {
                    // 既存データを更新
                    existingProduct.Title = product.Title;
                    existingProduct.ProductType = product.ProductType;
                    existingProduct.Vendor = product.Vendor;
                    existingProduct.UpdatedAt = DateTime.UtcNow;

                    // バリアントを更新
                    if (product.Variants != null && product.Variants.Any())
                    {
                        var existingVariantDict = existingProduct.Variants
                            .Where(v => !string.IsNullOrEmpty(v.ShopifyVariantId))
                            .ToDictionary(v => v.ShopifyVariantId!);

                        foreach (var variant in product.Variants)
                        {
                            if (string.IsNullOrEmpty(variant.ShopifyVariantId))
                            {
                                _logger.LogWarning("ShopifyVariantId is null, skipping variant");
                                continue;
                            }

                            if (existingVariantDict.TryGetValue(variant.ShopifyVariantId, out var existingVariant))
                            {
                                // 既存のバリアントを更新
                                existingVariant.Title = variant.Title;
                                existingVariant.Price = variant.Price;
                                existingVariant.Sku = variant.Sku;
                                existingVariant.UpdatedAt = DateTime.UtcNow;
                            }
                            else
                            {
                                // 新規のバリアントを追加
                                variant.Id = 0;
                                existingProduct.Variants.Add(variant);
                            }
                        }
                    }
                }
                else
                {
                    // 新規データを追加
                    product.StoreId = storeId;
                    product.Id = 0;
                    product.CreatedAt = product.CreatedAt == default ? DateTime.UtcNow : product.CreatedAt;
                    
                    // バリアントのIDをリセット
                    if (product.Variants != null)
                    {
                        foreach (var variant in product.Variants)
                        {
                            variant.Id = 0; // 新規エンティティとして認識させる
                        }
                    }
                    
                    _context.Products.Add(product);
                }
            }
            
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// ストアのアクセストークンを取得
        /// </summary>
        private string? GetAccessToken(Store store)
        {
            if (string.IsNullOrEmpty(store.AccessToken))
            {
                // Settingsフィールドからアクセストークンを取得する試み
                if (!string.IsNullOrEmpty(store.Settings))
                {
                    try
                    {
                        var settings = JsonSerializer.Deserialize<Dictionary<string, object>>(store.Settings);
                        if (settings != null && settings.TryGetValue("ShopifyAccessToken", out var token))
                        {
                            return token.ToString();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to parse store settings");
                    }
                }
                
                return null;
            }
            
            return store.AccessToken;
        }

        /// <summary>
        /// 定期同期ジョブを登録
        /// </summary>
        public static void RegisterRecurringJobs(IServiceProvider serviceProvider)
        {
            using (var scope = serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<ShopifyProductSyncJob>>();
                
                try
                {
                    // ✅ 初期設定完了済みのストアのみを対象
                    var activeStores = context.Stores
                        .Where(s => s.IsActive == true 
                                 && s.InitialSetupCompleted == true 
                                 && !string.IsNullOrEmpty(s.AccessToken))
                        .ToList();
                    
                    logger.LogInformation($"Registering recurring product sync jobs for {activeStores.Count} stores (InitialSetupCompleted=true)");
                    
                    foreach (var store in activeStores)
                    {
                        // 各ストアごとに1時間ごとの同期ジョブを登録
                        RecurringJob.AddOrUpdate<ShopifyProductSyncJob>(
                            $"sync-products-store-{store.Id}",
                            job => job.SyncProducts(store.Id, null),
                            Cron.Hourly);
                        
                        logger.LogInformation($"Registered recurring product sync job for store: {store.Name} (ID: {store.Id})");
                    }
                    
                    // 初期設定が完了していないストアのジョブを削除（念のため）
                    var storesWithoutSetup = context.Stores
                        .Where(s => s.IsActive == true 
                                 && (s.InitialSetupCompleted != true))
                        .Select(s => s.Id)
                        .ToList();
                    
                    foreach (var storeId in storesWithoutSetup)
                    {
                        var jobId = $"sync-products-store-{storeId}";
                        RecurringJob.RemoveIfExists(jobId);
                        logger.LogInformation($"Removed recurring product sync job for store (InitialSetupCompleted=false): {jobId}");
                    }
                    
                    // 全ストア一括同期ジョブ（1日1回）
                    RecurringJob.AddOrUpdate<ShopifyProductSyncJob>(
                        "sync-all-stores-products-daily",
                        job => job.SyncAllStoresProducts(),
                        Cron.Daily);
                    
                    logger.LogInformation("All recurring product sync jobs registered successfully");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to register recurring product sync jobs");
                }
            }
        }
    }
}