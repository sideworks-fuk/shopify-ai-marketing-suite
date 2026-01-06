using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Sync;
using Hangfire;
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace ShopifyAnalyticsApi.Jobs
{
    /// <summary>
    /// Shopify顧客データ同期ジョブ
    /// </summary>
    public class ShopifyCustomerSyncJob
    {
        private readonly ShopifyApiService _shopifyApi;
        private readonly ShopifyDbContext _context;
        private readonly ILogger<ShopifyCustomerSyncJob> _logger;
        private readonly IConfiguration _configuration;
        private readonly ICheckpointManager _checkpointManager;
        private readonly ISyncRangeManager _syncRangeManager;
        private readonly ISyncProgressTracker _progressTracker;

        public ShopifyCustomerSyncJob(
            ShopifyApiService shopifyApi,
            ShopifyDbContext context,
            ILogger<ShopifyCustomerSyncJob> logger,
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
        /// 指定されたストアの顧客データを同期する（範囲指定とチェックポイント対応）
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task SyncCustomers(int storeId, InitialSyncOptions? options = null)
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

                _logger.LogInformation($"Starting customer sync for store: {store.Name} (ID: {storeId})");
                
                // 同期範囲を決定
                var dateRange = await _syncRangeManager.DetermineSyncRangeAsync(
                    storeId, "Customers", options);
                
                // 同期進捗を開始
                var syncStateId = await _progressTracker.StartSyncAsync(
                    storeId, "Customers", dateRange);
                
                try
                {
                    // チェックポイントから再開情報を取得
                    var resumeInfo = await _checkpointManager.GetResumeInfoAsync(
                        storeId, "Customers");
                    
                    var syncedCount = 0;
                    var lastCursor = resumeInfo?.LastCursor;
                    var totalProcessed = resumeInfo?.RecordsAlreadyProcessed ?? 0;
                    
                    if (resumeInfo != null)
                    {
                        _logger.LogInformation(
                            $"Resuming sync from checkpoint: {totalProcessed} customers already processed");
                    }
                    
                    // 同期実行（ページネーション処理）
                    var hasMorePages = true;
                    var currentPageInfo = lastCursor;
                    var batchSize = 100; // バッチ処理のサイズ
                    var page = 1;
                    
                    while (hasMorePages)
                    {
                        // 顧客データを取得（実際のShopify API呼び出し）
                        var (customers, nextPageInfo) = await FetchCustomersFromShopify(
                            store, dateRange, currentPageInfo);
                        
                        if (customers == null || !customers.Any())
                        {
                            hasMorePages = false;
                            break;
                        }
                        
                        // バッチ処理でデータベースに保存
                        var batch = new List<Customer>();
                        foreach (var customer in customers)
                        {
                            customer.StoreId = storeId;
                            batch.Add(customer);
                            
                            // バッチサイズに達したら保存
                            if (batch.Count >= batchSize)
                            {
                                await SaveOrUpdateCustomersBatch(storeId, batch);
                                syncedCount += batch.Count;
                                totalProcessed += batch.Count;
                                batch.Clear();
                                
                                // 進捗を更新
                                await _progressTracker.UpdateProgressAsync(
                                    syncStateId, totalProcessed, null, $"Page-{page}");
                                
                                // チェックポイントを保存
                                await _checkpointManager.SaveCheckpointAsync(
                                    storeId, "Customers", currentPageInfo ?? $"page-{page}", totalProcessed, dateRange);
                            }
                        }
                        
                        // 残りのバッチを保存
                        if (batch.Any())
                        {
                            await SaveOrUpdateCustomersBatch(storeId, batch);
                            syncedCount += batch.Count;
                            totalProcessed += batch.Count;
                            
                            // 進捗を更新
                            await _progressTracker.UpdateProgressAsync(
                                syncStateId, totalProcessed, null, $"Page-{page}");
                            
                            // チェックポイントを保存
                            await _checkpointManager.SaveCheckpointAsync(
                                storeId, "Customers", currentPageInfo ?? $"page-{page}", totalProcessed, dateRange);
                        }
                        
                        _logger.LogInformation(
                            $"Processed page {page} with {customers.Count} customers. Total: {totalProcessed}");
                        
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
                    await _checkpointManager.ClearCheckpointAsync(storeId, "Customers");
                    
                    _logger.LogInformation(
                        $"Customer sync completed for store: {store.Name}. Synced {syncedCount} customers");
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
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error syncing customers for store ID: {storeId}");
                throw; // HangFireの自動リトライを有効にするため再スロー
            }
        }

        /// <summary>
        /// Shopifyから顧客データを取得（実際のAPI呼び出し）
        /// </summary>
        private async Task<(List<Customer> Customers, string? NextPageInfo)> FetchCustomersFromShopify(
            Store store, DateRange dateRange, string? pageInfo)
        {
            try
            {
                var sinceDate = dateRange.Start;
                var (shopifyCustomers, nextPageInfo) = await _shopifyApi.FetchCustomersPageAsync(
                    store.Id, sinceDate, pageInfo);

                var customers = new List<Customer>();
                foreach (var shopifyCustomer in shopifyCustomers)
                {
                    var customer = ConvertToCustomerEntity(shopifyCustomer);
                    customers.Add(customer);
                }

                return (customers, nextPageInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to fetch customers from Shopify for store {store.Id}");
                throw;
            }
        }

        /// <summary>
        /// ShopifyCustomerをCustomerエンティティに変換
        /// </summary>
        private Customer ConvertToCustomerEntity(ShopifyApiService.ShopifyCustomer shopifyCustomer)
        {
            return new Customer
            {
                ShopifyCustomerId = shopifyCustomer.Id.ToString(),
                FirstName = shopifyCustomer.FirstName ?? string.Empty,
                LastName = shopifyCustomer.LastName ?? string.Empty,
                Email = shopifyCustomer.Email ?? string.Empty,
                Phone = shopifyCustomer.Phone,
                TotalSpent = shopifyCustomer.TotalSpent,
                TotalOrders = shopifyCustomer.OrdersCount,
                // 分析に必要なフィールド
                ProvinceCode = shopifyCustomer.ProvinceCode ?? shopifyCustomer.DefaultAddress?.ProvinceCode,
                CountryCode = shopifyCustomer.CountryCode ?? shopifyCustomer.DefaultAddress?.CountryCode,
                City = shopifyCustomer.City ?? shopifyCustomer.DefaultAddress?.City,
                Tags = shopifyCustomer.Tags,
                AcceptsEmailMarketing = shopifyCustomer.AcceptsEmailMarketing,
                AcceptsSMSMarketing = shopifyCustomer.AcceptsSMSMarketing,
                AddressPhone = shopifyCustomer.DefaultAddress?.Phone,
                CreatedAt = shopifyCustomer.CreatedAt ?? DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };
        }

        /// <summary>
        /// 顧客データをバッチ処理で保存または更新
        /// </summary>
        private async Task SaveOrUpdateCustomersBatch(int storeId, List<Customer> customers)
        {
            if (!customers.Any()) return;

            var shopifyCustomerIds = customers
                .Where(c => !string.IsNullOrEmpty(c.ShopifyCustomerId))
                .Select(c => c.ShopifyCustomerId!)
                .ToList();

            // 既存の顧客を一括取得
            var existingCustomers = await _context.Customers
                .Where(c => c.StoreId == storeId && shopifyCustomerIds.Contains(c.ShopifyCustomerId!))
                .ToDictionaryAsync(c => c.ShopifyCustomerId!);

            foreach (var customer in customers)
            {
                if (string.IsNullOrEmpty(customer.ShopifyCustomerId))
                {
                    _logger.LogWarning("ShopifyCustomerId is null, skipping customer: {Email}", customer.Email);
                    continue;
                }

                if (existingCustomers.TryGetValue(customer.ShopifyCustomerId, out var existingCustomer))
                {
                    // 既存データを更新
                    existingCustomer.FirstName = customer.FirstName;
                    existingCustomer.LastName = customer.LastName;
                    existingCustomer.Email = customer.Email;
                    existingCustomer.Phone = customer.Phone;
                    existingCustomer.TotalSpent = customer.TotalSpent;
                    existingCustomer.TotalOrders = customer.TotalOrders;
                    // 分析に必要なフィールド
                    existingCustomer.ProvinceCode = customer.ProvinceCode;
                    existingCustomer.CountryCode = customer.CountryCode;
                    existingCustomer.City = customer.City;
                    existingCustomer.Tags = customer.Tags;
                    existingCustomer.AcceptsEmailMarketing = customer.AcceptsEmailMarketing;
                    existingCustomer.AcceptsSMSMarketing = customer.AcceptsSMSMarketing;
                    existingCustomer.AddressPhone = customer.AddressPhone;
                    existingCustomer.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // 新規データを追加
                    customer.StoreId = storeId;
                    customer.CreatedAt = customer.CreatedAt == default ? DateTime.UtcNow : customer.CreatedAt;
                    _context.Customers.Add(customer);
                }
            }
            
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// 全てのアクティブなストアの顧客を同期する
        /// </summary>
        [AutomaticRetry(Attempts = 2)]
        public async Task SyncAllStoresCustomers()
        {
            try
            {
                _logger.LogInformation("Starting customer sync for all active stores");
                
                var activeStores = await _context.Stores
                    .Where(s => s.IsActive)
                    .ToListAsync();
                
                if (!activeStores.Any())
                {
                    _logger.LogWarning("No active stores found for customer sync");
                    return;
                }
                
                _logger.LogInformation($"Found {activeStores.Count} active stores to sync");
                
                foreach (var store in activeStores)
                {
                    try
                    {
                        // 各ストアを個別のジョブとしてキューに追加
                        BackgroundJob.Enqueue<ShopifyCustomerSyncJob>(
                            job => job.SyncCustomers(store.Id, null));
                        
                        _logger.LogInformation($"Queued customer sync job for store: {store.Name}");
                        
                        // Rate Limit対策: ジョブ登録間隔を設ける
                        await Task.Delay(TimeSpan.FromSeconds(1));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to queue sync job for store: {store.Name}");
                    }
                }
                
                _logger.LogInformation("All customer sync jobs queued successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during batch customer sync");
                throw;
            }
        }

        /// <summary>
        /// 定期同期ジョブを登録
        /// </summary>
        public static void RegisterRecurringJobs(IServiceProvider serviceProvider)
        {
            using (var scope = serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<ShopifyCustomerSyncJob>>();
                
                try
                {
                    // ✅ 初期設定完了済みのストアのみを対象
                    var activeStores = context.Stores
                        .Where(s => s.IsActive == true 
                                 && s.InitialSetupCompleted == true 
                                 && !string.IsNullOrEmpty(s.AccessToken))
                        .ToList();
                    
                    logger.LogInformation($"Registering recurring customer sync jobs for {activeStores.Count} stores (InitialSetupCompleted=true)");
                    
                    foreach (var store in activeStores)
                    {
                        // 各ストアごとに2時間ごとの同期ジョブを登録
                        RecurringJob.AddOrUpdate<ShopifyCustomerSyncJob>(
                            $"sync-customers-store-{store.Id}",
                            job => job.SyncCustomers(store.Id, null),
                            "0 */2 * * *"); // 2時間ごと
                        
                        logger.LogInformation($"Registered recurring customer sync job for store: {store.Name} (ID: {store.Id})");
                    }
                    
                    // 初期設定が完了していないストアのジョブを削除（念のため）
                    var storesWithoutSetup = context.Stores
                        .Where(s => s.IsActive == true 
                                 && (s.InitialSetupCompleted != true))
                        .Select(s => s.Id)
                        .ToList();
                    
                    foreach (var storeId in storesWithoutSetup)
                    {
                        var jobId = $"sync-customers-store-{storeId}";
                        RecurringJob.RemoveIfExists(jobId);
                        logger.LogInformation($"Removed recurring customer sync job for store (InitialSetupCompleted=false): {jobId}");
                    }
                    
                    // 全ストア一括同期ジョブ（1日1回）
                    RecurringJob.AddOrUpdate<ShopifyCustomerSyncJob>(
                        "sync-all-stores-customers-daily",
                        job => job.SyncAllStoresCustomers(),
                        Cron.Daily);
                    
                    logger.LogInformation("All recurring customer sync jobs registered successfully");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to register recurring customer sync jobs");
                }
            }
        }
    }
}