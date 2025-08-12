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
                    var batchSize = 250;
                    var page = 1;
                    
                    while (hasMorePages)
                    {
                        // 顧客データを取得（実際の実装ではShopifyApiServiceを拡張）
                        var customers = await FetchCustomersFromShopify(
                            store, dateRange, page, batchSize);
                        
                        if (customers == null || !customers.Any())
                        {
                            hasMorePages = false;
                            break;
                        }
                        
                        // データベースに保存
                        foreach (var customer in customers)
                        {
                            await SaveOrUpdateCustomer(storeId, customer);
                            syncedCount++;
                        }
                        
                        totalProcessed += customers.Count();
                        
                        // 進捗を更新
                        await _progressTracker.UpdateProgressAsync(
                            syncStateId, totalProcessed, null, $"Page-{page}");
                        
                        // チェックポイントを保存（100件ごと）
                        if (totalProcessed % 100 == 0)
                        {
                            await _checkpointManager.SaveCheckpointAsync(
                                storeId, "Customers", $"page-{page}", totalProcessed, dateRange);
                        }
                        
                        _logger.LogInformation(
                            $"Processed page {page} with {customers.Count()} customers. Total: {totalProcessed}");
                        
                        page++;
                        
                        // Rate Limit対策
                        await Task.Delay(TimeSpan.FromMilliseconds(500));
                        
                        // ページネーション終了判定（仮実装）
                        if (customers.Count() < batchSize)
                        {
                            hasMorePages = false;
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
        /// Shopifyから顧客データを取得（仮実装）
        /// </summary>
        private async Task<Customer[]> FetchCustomersFromShopify(
            Store store, DateRange dateRange, int page, int limit)
        {
            // TODO: 実際のShopify API呼び出しを実装
            // ここでは仮のデータを返す
            await Task.Delay(100); // API呼び出しのシミュレーション
            
            if (page > 3) // 仮に3ページまでとする
                return Array.Empty<Customer>();
            
            var customers = new Customer[Math.Min(limit, 50)]; // テスト用に少なめ
            for (int i = 0; i < customers.Length; i++)
            {
                customers[i] = new Customer
                {
                    ShopifyCustomerId = $"shop_{store.Id}_cust_{page}_{i}",
                    FirstName = $"Customer{page}_{i}",
                    LastName = $"Test",
                    Email = $"customer{page}_{i}@example.com",
                    Phone = $"090-{page:0000}-{i:0000}",
                    TotalSpent = (decimal)(1000 * page + 100 * i),
                    TotalOrders = page + i,
                    CustomerSegment = i % 3 == 0 ? "VIP" : i % 2 == 0 ? "リピーター" : "新規",
                    CreatedAt = DateTime.UtcNow.AddDays(-30 + i),
                    UpdatedAt = DateTime.UtcNow
                };
            }
            
            return customers;
        }

        /// <summary>
        /// 顧客データを保存または更新
        /// </summary>
        private async Task SaveOrUpdateCustomer(int storeId, Customer customer)
        {
            var existingCustomer = await _context.Customers
                .FirstOrDefaultAsync(c => 
                    c.StoreId == storeId && 
                    c.ShopifyCustomerId == customer.ShopifyCustomerId);
            
            if (existingCustomer != null)
            {
                // 既存データを更新
                existingCustomer.FirstName = customer.FirstName;
                existingCustomer.LastName = customer.LastName;
                existingCustomer.Email = customer.Email;
                existingCustomer.Phone = customer.Phone;
                existingCustomer.TotalSpent = customer.TotalSpent;
                existingCustomer.TotalOrders = customer.TotalOrders;
                existingCustomer.CustomerSegment = customer.CustomerSegment;
                existingCustomer.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // 新規データを追加
                customer.StoreId = storeId;
                _context.Customers.Add(customer);
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
                    var activeStores = context.Stores
                        .Where(s => s.IsActive)
                        .ToList();
                    
                    foreach (var store in activeStores)
                    {
                        // 各ストアごとに2時間ごとの同期ジョブを登録
                        RecurringJob.AddOrUpdate<ShopifyCustomerSyncJob>(
                            $"sync-customers-store-{store.Id}",
                            job => job.SyncCustomers(store.Id, null),
                            "0 */2 * * *"); // 2時間ごと
                        
                        logger.LogInformation($"Registered recurring customer sync job for store: {store.Name}");
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