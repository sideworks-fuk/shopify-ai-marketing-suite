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
    /// Shopify注文データ同期ジョブ
    /// </summary>
    public class ShopifyOrderSyncJob
    {
        private readonly ShopifyApiService _shopifyApi;
        private readonly ShopifyDbContext _context;
        private readonly ILogger<ShopifyOrderSyncJob> _logger;
        private readonly IConfiguration _configuration;
        private readonly ICheckpointManager _checkpointManager;
        private readonly ISyncRangeManager _syncRangeManager;
        private readonly ISyncProgressTracker _progressTracker;

        public ShopifyOrderSyncJob(
            ShopifyApiService shopifyApi,
            ShopifyDbContext context,
            ILogger<ShopifyOrderSyncJob> logger,
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
        /// 指定されたストアの注文データを同期する（範囲指定とチェックポイント対応）
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task SyncOrders(int storeId, InitialSyncOptions? options = null)
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

                _logger.LogInformation($"Starting order sync for store: {store.Name} (ID: {storeId})");
                
                // 同期範囲を決定
                var dateRange = await _syncRangeManager.DetermineSyncRangeAsync(
                    storeId, "Orders", options);
                
                // 同期進捗を開始
                var syncStateId = await _progressTracker.StartSyncAsync(
                    storeId, "Orders", dateRange);
                
                try
                {
                    // チェックポイントから再開情報を取得
                    var resumeInfo = await _checkpointManager.GetResumeInfoAsync(
                        storeId, "Orders");
                    
                    var syncedCount = 0;
                    var lastCursor = resumeInfo?.LastCursor;
                    var totalProcessed = resumeInfo?.RecordsAlreadyProcessed ?? 0;
                    
                    if (resumeInfo != null)
                    {
                        _logger.LogInformation(
                            $"Resuming sync from checkpoint: {totalProcessed} orders already processed");
                    }
                    
                    // 同期実行（ページネーション処理）
                    var hasMorePages = true;
                    var batchSize = 250;
                    var page = 1;
                    
                    while (hasMorePages)
                    {
                        // 注文データを取得（実際の実装ではShopifyApiServiceを拡張）
                        var orders = await FetchOrdersFromShopify(
                            store, dateRange, page, batchSize);
                        
                        if (orders == null || !orders.Any())
                        {
                            hasMorePages = false;
                            break;
                        }
                        
                        // データベースに保存
                        foreach (var order in orders)
                        {
                            await SaveOrUpdateOrder(storeId, order);
                            
                            // 注文明細も保存
                            if (order.OrderItems != null && order.OrderItems.Any())
                            {
                                foreach (var item in order.OrderItems)
                                {
                                    await SaveOrUpdateOrderItem(order.Id, item);
                                }
                            }
                            
                            syncedCount++;
                        }
                        
                        totalProcessed += orders.Count();
                        
                        // 進捗を更新
                        await _progressTracker.UpdateProgressAsync(
                            syncStateId, totalProcessed, null, $"Page-{page}");
                        
                        // チェックポイントを保存（50件ごと）
                        if (totalProcessed % 50 == 0)
                        {
                            await _checkpointManager.SaveCheckpointAsync(
                                storeId, "Orders", $"page-{page}", totalProcessed, dateRange);
                        }
                        
                        _logger.LogInformation(
                            $"Processed page {page} with {orders.Count()} orders. Total: {totalProcessed}");
                        
                        page++;
                        
                        // Rate Limit対策
                        await Task.Delay(TimeSpan.FromMilliseconds(500));
                        
                        // ページネーション終了判定（仮実装）
                        if (orders.Count() < batchSize)
                        {
                            hasMorePages = false;
                        }
                    }
                    
                    // 同期完了
                    await _progressTracker.CompleteSyncAsync(syncStateId, true);
                    
                    // チェックポイントをクリア
                    await _checkpointManager.ClearCheckpointAsync(storeId, "Orders");
                    
                    _logger.LogInformation(
                        $"Order sync completed for store: {store.Name}. Synced {syncedCount} orders");
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
                _logger.LogError(ex, $"Error syncing orders for store ID: {storeId}");
                throw; // HangFireの自動リトライを有効にするため再スロー
            }
        }

        /// <summary>
        /// Shopifyから注文データを取得（仮実装）
        /// </summary>
        private async Task<Order[]> FetchOrdersFromShopify(
            Store store, DateRange dateRange, int page, int limit)
        {
            // TODO: 実際のShopify API呼び出しを実装
            // ここでは仮のデータを返す
            await Task.Delay(100); // API呼び出しのシミュレーション
            
            if (page > 2) // 仮に2ページまでとする
                return Array.Empty<Order>();
            
            var orders = new Order[Math.Min(limit, 30)]; // テスト用に少なめ
            for (int i = 0; i < orders.Length; i++)
            {
                var orderId = Guid.NewGuid().ToString();
                orders[i] = new Order
                {
                    ShopifyOrderId = $"shop_{store.Id}_order_{page}_{i}",
                    OrderNumber = $"#100{page}{i:00}",
                    TotalPrice = (decimal)(1000 * page + 100 * i),
                    SubtotalPrice = (decimal)(900 * page + 90 * i),
                    TotalTax = (decimal)(100 * page + 10 * i),
                    Currency = "JPY",
                    FinancialStatus = i % 3 == 0 ? "paid" : i % 2 == 0 ? "pending" : "refunded",
                    FulfillmentStatus = i % 3 == 0 ? "fulfilled" : i % 2 == 0 ? "partial" : null,
                    Email = $"customer{page}_{i}@example.com",
                    CreatedAt = DateTime.UtcNow.AddDays(-30 + i),
                    UpdatedAt = DateTime.UtcNow,
                    OrderItems = GenerateOrderItems(orderId, page, i)
                };
            }
            
            return orders;
        }

        /// <summary>
        /// 注文明細データを生成（テスト用）
        /// </summary>
        private OrderItem[] GenerateOrderItems(string orderId, int page, int orderIndex)
        {
            var itemCount = (orderIndex % 3) + 1; // 1-3個の商品
            var items = new OrderItem[itemCount];
            
            for (int i = 0; i < itemCount; i++)
            {
                items[i] = new OrderItem
                {
                    ShopifyLineItemId = $"line_{orderId}_{i}",
                    ProductId = $"product_{(i + 1) * 100}",
                    ShopifyVariantId = $"variant_{(i + 1) * 1000}",
                    Title = $"商品{page}-{orderIndex}-{i}",
                    VariantTitle = $"サイズ{i + 1}",
                    Sku = $"SKU-{page}{orderIndex:00}{i:00}",
                    ProductVendor = $"ベンダー{i % 3 + 1}",
                    Quantity = (i % 3) + 1,
                    Price = (decimal)(1000 + 100 * i),
                    TotalPrice = (decimal)(1000 + 100 * i),
                    RequiresShipping = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-30 + orderIndex),
                    UpdatedAt = DateTime.UtcNow
                };
            }
            
            return items;
        }

        /// <summary>
        /// 注文データを保存または更新
        /// </summary>
        private async Task SaveOrUpdateOrder(int storeId, Order order)
        {
            var existingOrder = await _context.Orders
                .FirstOrDefaultAsync(o => 
                    o.StoreId == storeId && 
                    o.ShopifyOrderId == order.ShopifyOrderId);
            
            if (existingOrder != null)
            {
                // 既存データを更新
                existingOrder.OrderNumber = order.OrderNumber;
                existingOrder.TotalPrice = order.TotalPrice;
                existingOrder.SubtotalPrice = order.SubtotalPrice;
                existingOrder.TotalTax = order.TotalTax;
                existingOrder.Currency = order.Currency;
                existingOrder.FinancialStatus = order.FinancialStatus;
                existingOrder.FulfillmentStatus = order.FulfillmentStatus;
                existingOrder.Email = order.Email;
                existingOrder.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // 新規データを追加
                order.StoreId = storeId;
                order.Id = 0; // EFに新規エンティティとして認識させる
                _context.Orders.Add(order);
            }
            
            await _context.SaveChangesAsync();
            
            // 保存後、OrderIdを取得
            if (existingOrder != null)
            {
                order.Id = existingOrder.Id;
            }
        }

        /// <summary>
        /// 注文明細データを保存または更新
        /// </summary>
        private async Task SaveOrUpdateOrderItem(int orderId, OrderItem item)
        {
            var existingItem = await _context.OrderItems
                .FirstOrDefaultAsync(i => 
                    i.OrderId == orderId && 
                    i.ShopifyLineItemId == item.ShopifyLineItemId);
            
            if (existingItem != null)
            {
                // 既存データを更新
                existingItem.ProductId = item.ProductId;
                existingItem.ShopifyVariantId = item.ShopifyVariantId;
                existingItem.Title = item.Title;
                existingItem.VariantTitle = item.VariantTitle;
                existingItem.Sku = item.Sku;
                existingItem.ProductVendor = item.ProductVendor;
                existingItem.Quantity = item.Quantity;
                existingItem.Price = item.Price;
                existingItem.TotalPrice = item.TotalPrice;
                existingItem.RequiresShipping = item.RequiresShipping;
                existingItem.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // 新規データを追加
                item.OrderId = orderId;
                item.Id = 0; // EFに新規エンティティとして認識させる
                _context.OrderItems.Add(item);
            }
            
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// 全てのアクティブなストアの注文を同期する
        /// </summary>
        [AutomaticRetry(Attempts = 2)]
        public async Task SyncAllStoresOrders()
        {
            try
            {
                _logger.LogInformation("Starting order sync for all active stores");
                
                var activeStores = await _context.Stores
                    .Where(s => s.IsActive)
                    .ToListAsync();
                
                if (!activeStores.Any())
                {
                    _logger.LogWarning("No active stores found for order sync");
                    return;
                }
                
                _logger.LogInformation($"Found {activeStores.Count} active stores to sync");
                
                foreach (var store in activeStores)
                {
                    try
                    {
                        // 各ストアを個別のジョブとしてキューに追加
                        BackgroundJob.Enqueue<ShopifyOrderSyncJob>(
                            job => job.SyncOrders(store.Id, null));
                        
                        _logger.LogInformation($"Queued order sync job for store: {store.Name}");
                        
                        // Rate Limit対策: ジョブ登録間隔を設ける
                        await Task.Delay(TimeSpan.FromSeconds(1));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to queue sync job for store: {store.Name}");
                    }
                }
                
                _logger.LogInformation("All order sync jobs queued successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during batch order sync");
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
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<ShopifyOrderSyncJob>>();
                
                try
                {
                    var activeStores = context.Stores
                        .Where(s => s.IsActive)
                        .ToList();
                    
                    foreach (var store in activeStores)
                    {
                        // 各ストアごとに3時間ごとの同期ジョブを登録
                        RecurringJob.AddOrUpdate<ShopifyOrderSyncJob>(
                            $"sync-orders-store-{store.Id}",
                            job => job.SyncOrders(store.Id, null),
                            "0 */3 * * *"); // 3時間ごと
                        
                        logger.LogInformation($"Registered recurring order sync job for store: {store.Name}");
                    }
                    
                    // 全ストア一括同期ジョブ（1日1回）
                    RecurringJob.AddOrUpdate<ShopifyOrderSyncJob>(
                        "sync-all-stores-orders-daily",
                        job => job.SyncAllStoresOrders(),
                        Cron.Daily);
                    
                    logger.LogInformation("All recurring order sync jobs registered successfully");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to register recurring order sync jobs");
                }
            }
        }
    }
}