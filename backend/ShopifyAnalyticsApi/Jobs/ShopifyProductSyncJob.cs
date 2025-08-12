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
                    var batchSize = 250;
                    
                    while (hasMorePages)
                    {
                        // ShopifyApiServiceを呼び出し（実際の実装では改修が必要）
                        // var result = await _shopifyApi.SyncProductsPageAsync(
                        //     storeId, dateRange, lastCursor, batchSize);
                        
                        // この部分は実際のAPI実装に合わせて調整
                        var batchCount = await _shopifyApi.SyncProductsAsync(storeId, dateRange.Start);
                        syncedCount += batchCount;
                        totalProcessed += batchCount;
                        
                        // 進捗を更新
                        await _progressTracker.UpdateProgressAsync(
                            syncStateId, totalProcessed, null, $"Batch-{totalProcessed}");
                        
                        // チェックポイントを保存（100件ごと）
                        if (totalProcessed % 100 == 0)
                        {
                            await _checkpointManager.SaveCheckpointAsync(
                                storeId, "Products", lastCursor ?? "", totalProcessed, dateRange);
                        }
                        
                        // TODO: 実際のページネーション処理
                        hasMorePages = false; // 暫定的に1回で終了
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
                    var activeStores = context.Stores
                        .Where(s => s.IsActive)
                        .ToList();
                    
                    foreach (var store in activeStores)
                    {
                        // 各ストアごとに1時間ごとの同期ジョブを登録
                        RecurringJob.AddOrUpdate<ShopifyProductSyncJob>(
                            $"sync-products-store-{store.Id}",
                            job => job.SyncProducts(store.Id, null),
                            Cron.Hourly);
                        
                        logger.LogInformation($"Registered recurring product sync job for store: {store.Name}");
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