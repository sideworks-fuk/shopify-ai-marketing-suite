using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Sync;
using Hangfire;
using System;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
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
        private readonly CustomerDataMaintenanceService _customerMaintenanceService;

        public ShopifyOrderSyncJob(
            ShopifyApiService shopifyApi,
            ShopifyDbContext context,
            ILogger<ShopifyOrderSyncJob> logger,
            IConfiguration configuration,
            ICheckpointManager checkpointManager,
            ISyncRangeManager syncRangeManager,
            ISyncProgressTracker progressTracker,
            CustomerDataMaintenanceService customerMaintenanceService)
        {
            _shopifyApi = shopifyApi;
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _checkpointManager = checkpointManager;
            _syncRangeManager = syncRangeManager;
            _progressTracker = progressTracker;
            _customerMaintenanceService = customerMaintenanceService;
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
                    var currentPageInfo = lastCursor;
                    var batchSize = 50; // バッチ処理のサイズ（注文は明細も含むため小さめ）
                    var page = 1;
                    
                    while (hasMorePages)
                    {
                        try
                        {
                            // 注文データを取得（実際のShopify API呼び出し）
                            var (orders, nextPageInfo) = await FetchOrdersFromShopify(
                                store, dateRange, currentPageInfo);
                            
                            if (orders == null || !orders.Any())
                            {
                                hasMorePages = false;
                                break;
                            }
                        
                        // バッチ処理でデータベースに保存
                        var batch = new List<Order>();
                        foreach (var order in orders)
                        {
                            order.StoreId = storeId;
                            batch.Add(order);
                            
                            // バッチサイズに達したら保存
                            if (batch.Count >= batchSize)
                            {
                                await SaveOrUpdateOrdersBatch(storeId, batch);
                                syncedCount += batch.Count;
                                totalProcessed += batch.Count;
                                batch.Clear();
                                
                                // 進捗を更新
                                await _progressTracker.UpdateProgressAsync(
                                    syncStateId, totalProcessed, null, $"Page-{page}");
                                
                                // チェックポイントを保存
                                await _checkpointManager.SaveCheckpointAsync(
                                    storeId, "Orders", currentPageInfo ?? $"page-{page}", totalProcessed, dateRange);
                            }
                        }
                        
                        // 残りのバッチを保存
                        if (batch.Any())
                        {
                            await SaveOrUpdateOrdersBatch(storeId, batch);
                            syncedCount += batch.Count;
                            totalProcessed += batch.Count;
                            
                            // 進捗を更新
                            await _progressTracker.UpdateProgressAsync(
                                syncStateId, totalProcessed, null, $"Page-{page}");
                            
                            // チェックポイントを保存
                            await _checkpointManager.SaveCheckpointAsync(
                                storeId, "Orders", currentPageInfo ?? $"page-{page}", totalProcessed, dateRange);
                        }
                        
                        _logger.LogInformation(
                            $"Processed page {page} with {orders.Count} orders. Total: {totalProcessed}");
                        
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
                        catch (HttpRequestException httpEx) when (
                            httpEx.Message.Contains("BadRequest") && 
                            (httpEx.Message.Contains("page_info") || httpEx.Message.Contains("Invalid value")) &&
                            !string.IsNullOrEmpty(currentPageInfo))
                        {
                            // 無効なpage_infoエラーの場合、チェックポイントをクリアして最初から再開
                            _logger.LogWarning(
                                "🟡 [OrderSyncJob] Invalid page_info error detected. Clearing checkpoint and restarting from beginning. PageInfo: {PageInfo}, StoreId: {StoreId}",
                                currentPageInfo, storeId);
                            
                            await _checkpointManager.ClearCheckpointAsync(storeId, "Orders");
                            
                            // チェックポイントをクリアしたので、最初から再開
                            currentPageInfo = null;
                            totalProcessed = 0;
                            page = 1;  // ページ番号もリセット
                            _logger.LogInformation(
                                "🟡 [OrderSyncJob] Checkpoint cleared. Restarting sync from beginning. StoreId: {StoreId}",
                                storeId);
                            
                            // 最初から再試行（continueでwhileループの最初に戻る）
                            continue;
                        }
                        catch (JsonException jsonEx)
                        {
                            // JSONデシリアライゼーションエラー（order_number等の型エラー）
                            _logger.LogError(jsonEx, 
                                "🔴 [OrderSyncJob] JSON deserialization error. Clearing checkpoint and restarting from beginning. StoreId: {StoreId}, Error: {ErrorMessage}",
                                storeId, jsonEx.Message);
                            
                            // チェックポイントをクリアして最初から再開を試みる（1回のみ）
                            if (page == 1 && string.IsNullOrEmpty(currentPageInfo))
                            {
                                // 既に最初から再開済みの場合、エラーとして処理
                                throw;
                            }
                            
                            await _checkpointManager.ClearCheckpointAsync(storeId, "Orders");
                            currentPageInfo = null;
                            totalProcessed = 0;
                            page = 1;
                            _logger.LogInformation(
                                "🟡 [OrderSyncJob] Checkpoint cleared due to JSON error. Restarting sync from beginning. StoreId: {StoreId}",
                                storeId);
                            
                            // 最初から再試行（1回のみ）
                            continue;
                        }
                    }
                    
                    // 同期完了
                    await _progressTracker.CompleteSyncAsync(syncStateId, true);
                    
                    // チェックポイントをクリア
                    await _checkpointManager.ClearCheckpointAsync(storeId, "Orders");
                    
                    // SyncStatusesテーブルも更新（TriggerSyncで作成されたレコード）
                    await UpdateSyncStatusesAsync(storeId, "Orders", true, syncedCount, null);
                    
                    _logger.LogInformation(
                        $"Order sync completed for store: {store.Name}. Synced {syncedCount} orders");
                }
                catch (Exception ex)
                {
                    // エラー時は進捗を更新（ステータスも自動的に更新される）
                    _logger.LogError(ex, 
                        "🔴 [OrderSyncJob] Error syncing orders for store ID: {StoreId}. Error: {ErrorMessage}",
                        storeId, ex.Message);
                    
                    try
                    {
                        await _progressTracker.CompleteSyncAsync(
                            syncStateId, false, ex.Message);
                        
                        // SyncStatusesテーブルも更新（TriggerSyncで作成されたレコード）
                        await UpdateSyncStatusesAsync(storeId, "Orders", false, 0, ex.Message);
                    }
                    catch (Exception progressEx)
                    {
                        // 進捗更新に失敗してもメインエラーは再スロー
                        _logger.LogError(progressEx, 
                            "🔴 [OrderSyncJob] Failed to update progress tracker. StoreId: {StoreId}",
                            storeId);
                    }
                    
                    throw; // HangFireの自動リトライを有効にするため再スロー
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
        /// Shopifyから注文データを取得（実際のAPI呼び出し）
        /// </summary>
        private async Task<(List<Order> Orders, string? NextPageInfo)> FetchOrdersFromShopify(
            Store store, DateRange dateRange, string? pageInfo)
        {
            _logger.LogInformation("🔵 [OrderSyncJob] FetchOrdersFromShopify開始: StoreId={StoreId}, StoreName={StoreName}, DateRange.Start={Start}, PageInfo={PageInfo}",
                store.Id, store.Name, dateRange.Start, pageInfo ?? "null");
            
            try
            {
                var sinceDate = dateRange.Start;
                
                _logger.LogInformation("🔵 [OrderSyncJob] ShopifyApiService.FetchOrdersPageAsync呼び出し開始: StoreId={StoreId}, SinceDate={SinceDate}",
                    store.Id, sinceDate);
                
                var (shopifyOrders, nextPageInfo) = await _shopifyApi.FetchOrdersPageAsync(
                    store.Id, sinceDate, pageInfo);

                _logger.LogInformation("🔵 [OrderSyncJob] ShopifyApiService.FetchOrdersPageAsync完了: StoreId={StoreId}, OrderCount={Count}, NextPageInfo={NextPageInfo}",
                    store.Id, shopifyOrders != null ? shopifyOrders.Count : 0, nextPageInfo ?? "null");

                var orders = new List<Order>();
                if (shopifyOrders != null)
                {
                    foreach (var shopifyOrder in shopifyOrders)
                    {
                        var order = await ConvertToOrderEntity(store.Id, shopifyOrder);
                        orders.Add(order);
                    }
                }

                _logger.LogInformation("🔵 [OrderSyncJob] FetchOrdersFromShopify完了: StoreId={StoreId}, ConvertedCount={Count}",
                    store.Id, orders.Count);

                return (orders, nextPageInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🔴 [OrderSyncJob] Failed to fetch orders from Shopify for store {StoreId}. Error: {ErrorMessage}",
                    store.Id, ex.Message);
                throw;
            }
        }

        /// <summary>
        /// ShopifyOrderをOrderエンティティに変換（CustomerIdも設定）
        /// </summary>
        private async Task<Order> ConvertToOrderEntity(int storeId, ShopifyApiService.ShopifyOrder shopifyOrder)
        {
            // CustomerIdを取得（ShopifyCustomerIdから）
            int? customerId = null; // nullable: 顧客が見つからない場合はnull
            if (shopifyOrder.Customer != null && !string.IsNullOrEmpty(shopifyOrder.Customer.Id.ToString()))
            {
                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => 
                        c.StoreId == storeId && 
                        c.ShopifyCustomerId == shopifyOrder.Customer.Id.ToString());
                
                if (customer != null)
                {
                    customerId = customer.Id;
                }
                else
                {
                    _logger.LogWarning(
                        "Customer not found for order {OrderId}, ShopifyCustomerId: {ShopifyCustomerId}. Order will be saved without CustomerId.",
                        shopifyOrder.Id, shopifyOrder.Customer.Id);
                }
            }

            var order = new Order
            {
                ShopifyOrderId = shopifyOrder.Id.ToString(),
                ShopifyCustomerId = shopifyOrder.Customer?.Id.ToString(),
                OrderNumber = shopifyOrder.OrderNumber ?? $"#{shopifyOrder.Id}",
                Email = shopifyOrder.Email,
                CustomerId = customerId, // 関連付け
                TotalPrice = shopifyOrder.TotalPriceDecimal,
                SubtotalPrice = shopifyOrder.SubtotalPriceDecimal,
                TotalTax = shopifyOrder.TotalTaxDecimal,
                TaxPrice = shopifyOrder.TotalTaxDecimal, // 互換性のため
                Currency = shopifyOrder.Currency ?? "JPY",
                Status = shopifyOrder.Status ?? "pending",
                FinancialStatus = shopifyOrder.FinancialStatus ?? "pending",
                FulfillmentStatus = shopifyOrder.FulfillmentStatus,
                ShopifyCreatedAt = shopifyOrder.CreatedAt,
                ShopifyUpdatedAt = shopifyOrder.UpdatedAt,
                ShopifyProcessedAt = shopifyOrder.ProcessedAt, // 決済完了日時
                IsTest = shopifyOrder.Test,
                SyncedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                OrderItems = new List<OrderItem>()
            };

            // 注文明細を変換
            if (shopifyOrder.LineItems != null)
            {
                foreach (var lineItem in shopifyOrder.LineItems)
                {
                    order.OrderItems.Add(new OrderItem
                    {
                        ShopifyLineItemId = lineItem.Id.ToString(),
                        ShopifyProductId = lineItem.ProductId?.ToString(),
                        ShopifyVariantId = lineItem.VariantId?.ToString(),
                        ProductTitle = lineItem.Title,
                        Title = lineItem.Title,
                        VariantTitle = lineItem.VariantTitle,
                        Sku = lineItem.Sku,
                        ProductVendor = lineItem.Vendor,
                        Quantity = lineItem.Quantity,
                        Price = lineItem.PriceDecimal,
                        TotalPrice = lineItem.PriceDecimal * lineItem.Quantity,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            return order;
        }


        /// <summary>
        /// 注文データをバッチ処理で保存または更新（注文明細も含む）
        /// </summary>
        private async Task SaveOrUpdateOrdersBatch(int storeId, List<Order> orders)
        {
            if (!orders.Any()) return;

            var shopifyOrderIds = orders
                .Where(o => !string.IsNullOrEmpty(o.ShopifyOrderId))
                .Select(o => o.ShopifyOrderId!)
                .ToList();

            // 既存の注文を一括取得（注文明細も含む）
            var existingOrders = await _context.Orders
                .Include(o => o.OrderItems)
                .Where(o => o.StoreId == storeId && shopifyOrderIds.Contains(o.ShopifyOrderId!))
                .ToDictionaryAsync(o => o.ShopifyOrderId!);

            foreach (var order in orders)
            {
                if (string.IsNullOrEmpty(order.ShopifyOrderId))
                {
                    _logger.LogWarning("ShopifyOrderId is null, skipping order: {OrderNumber}", order.OrderNumber);
                    continue;
                }

                if (existingOrders.TryGetValue(order.ShopifyOrderId, out var existingOrder))
                {
                    // 既存データを更新
                    existingOrder.OrderNumber = order.OrderNumber;
                    existingOrder.TotalPrice = order.TotalPrice;
                    existingOrder.SubtotalPrice = order.SubtotalPrice;
                    existingOrder.TotalTax = order.TotalTax;
                    existingOrder.TaxPrice = order.TaxPrice;
                    existingOrder.Currency = order.Currency;
                    existingOrder.Status = order.Status;
                    existingOrder.FinancialStatus = order.FinancialStatus;
                    existingOrder.FulfillmentStatus = order.FulfillmentStatus;
                    existingOrder.Email = order.Email;
                    existingOrder.CustomerId = order.CustomerId; // CustomerIdも更新
                    existingOrder.ShopifyCreatedAt ??= order.ShopifyCreatedAt;
                    existingOrder.ShopifyUpdatedAt = order.ShopifyUpdatedAt;
                    existingOrder.ShopifyProcessedAt = order.ShopifyProcessedAt; // 決済完了日時
                    existingOrder.IsTest = order.IsTest;
                    existingOrder.SyncedAt = DateTime.UtcNow;
                    existingOrder.UpdatedAt = DateTime.UtcNow;

                    // 注文明細を更新
                    if (order.OrderItems != null && order.OrderItems.Any())
                    {
                        var existingItemDict = existingOrder.OrderItems
                            .Where(i => !string.IsNullOrEmpty(i.ShopifyLineItemId))
                            .ToDictionary(i => i.ShopifyLineItemId!);

                        foreach (var item in order.OrderItems)
                        {
                            if (string.IsNullOrEmpty(item.ShopifyLineItemId))
                            {
                                _logger.LogWarning("ShopifyLineItemId is null, skipping order item");
                                continue;
                            }

                            if (existingItemDict.TryGetValue(item.ShopifyLineItemId, out var existingItem))
                            {
                                // 既存の明細を更新
                                existingItem.ProductId = item.ProductId;
                                existingItem.ShopifyProductId = item.ShopifyProductId;
                                existingItem.ShopifyVariantId = item.ShopifyVariantId;
                                existingItem.Title = item.Title;
                                existingItem.ProductTitle = item.ProductTitle;
                                existingItem.VariantTitle = item.VariantTitle;
                                existingItem.Sku = item.Sku;
                                existingItem.ProductVendor = item.ProductVendor;
                                existingItem.Quantity = item.Quantity;
                                existingItem.Price = item.Price;
                                existingItem.TotalPrice = item.TotalPrice;
                                existingItem.UpdatedAt = DateTime.UtcNow;
                            }
                            else
                            {
                                // 新規の明細を追加
                                item.OrderId = existingOrder.Id;
                                item.Id = 0;
                                existingOrder.OrderItems.Add(item);
                            }
                        }
                    }
                }
                else
                {
                    // 新規データを追加
                    order.StoreId = storeId;
                    order.Id = 0;
                    order.CreatedAt = DateTime.UtcNow;
                    order.UpdatedAt = DateTime.UtcNow;
                    order.SyncedAt = DateTime.UtcNow;
                    
                    // 注文明細のOrderIdを設定
                    if (order.OrderItems != null)
                    {
                        foreach (var item in order.OrderItems)
                        {
                            item.Id = 0; // 新規エンティティとして認識させる
                        }
                    }
                    
                    _context.Orders.Add(order);
                }
            }
            
            // 注文を保存
            await _context.SaveChangesAsync();
            
            // 顧客のLastOrderDateを更新（非正規化フィールド）
            await UpdateCustomerLastOrderDatesAsync(storeId, orders);
        }

        /// <summary>
        /// 注文同期時に顧客のLastOrderDateを更新
        /// </summary>
        private async Task UpdateCustomerLastOrderDatesAsync(int storeId, List<Order> orders)
        {
            // 注文に関連する顧客IDを収集
            var customerIds = orders
                .Where(o => o.CustomerId.HasValue && o.CustomerId.Value > 0)
                .Select(o => o.CustomerId!.Value)
                .Distinct()
                .ToList();

            if (!customerIds.Any())
            {
                return;
            }

            _logger.LogDebug("顧客のLastOrderDate更新開始: StoreId={StoreId}, CustomerCount={Count}", 
                storeId, customerIds.Count);

            // 各顧客のLastOrderDateを更新
            foreach (var customerId in customerIds)
            {
                try
                {
                    var customer = await _context.Customers
                        .FirstOrDefaultAsync(c => c.Id == customerId && c.StoreId == storeId);
                    
                    if (customer == null)
                    {
                        _logger.LogWarning("顧客が見つかりません: CustomerId={CustomerId}, StoreId={StoreId}", 
                            customerId, storeId);
                        continue;
                    }

                    // 顧客の最新の注文日を取得（テスト注文は除外）
                    var lastOrderDate = await _context.Orders
                        .Where(o => o.CustomerId == customerId 
                                 && o.ShopifyProcessedAt != null
                                 && !o.IsTest)
                        .OrderByDescending(o => o.ShopifyProcessedAt)
                        .Select(o => (DateTime?)o.ShopifyProcessedAt!.Value)
                        .FirstOrDefaultAsync();

                    if (lastOrderDate.HasValue)
                    {
                        // LastOrderDateが更新される場合のみ更新
                        if (!customer.LastOrderDate.HasValue || lastOrderDate > customer.LastOrderDate)
                        {
                            customer.LastOrderDate = lastOrderDate;
                            customer.UpdatedAt = DateTime.UtcNow;
                            
                            _logger.LogDebug("顧客のLastOrderDateを更新: CustomerId={CustomerId}, LastOrderDate={LastOrderDate}", 
                                customerId, lastOrderDate);
                        }
                    }
                    else
                    {
                        // 注文がない場合はnullに設定
                        if (customer.LastOrderDate.HasValue)
                        {
                            customer.LastOrderDate = null;
                            customer.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "顧客のLastOrderDate更新でエラー: CustomerId={CustomerId}, StoreId={StoreId}", 
                        customerId, storeId);
                    // エラーが発生しても処理を継続
                }
            }

            // 変更を保存
            try
            {
                await _context.SaveChangesAsync();
                _logger.LogDebug("顧客のLastOrderDate更新完了: StoreId={StoreId}, UpdatedCount={Count}", 
                    storeId, customerIds.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客のLastOrderDate保存でエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// SyncStatusesテーブルを更新（TriggerSyncで作成されたレコード）
        /// </summary>
        private async Task UpdateSyncStatusesAsync(int storeId, string entityType, bool success, int processedRecords, string? errorMessage)
        {
            try
            {
                // TriggerSyncで作成されたrunning状態のSyncStatusesレコードを検索
                var syncStatuses = await _context.SyncStatuses
                    .Where(s => s.StoreId == storeId 
                             && s.Status == "running"
                             && (s.EntityType == entityType || s.EntityType == "All")
                             && s.SyncType == "manual")
                    .ToListAsync();

                if (syncStatuses.Any())
                {
                    foreach (var syncStatus in syncStatuses)
                    {
                        syncStatus.Status = success ? "completed" : "failed";
                        syncStatus.EndDate = DateTime.UtcNow;
                        syncStatus.UpdatedAt = DateTime.UtcNow;
                        
                        if (success)
                        {
                            syncStatus.ProcessedRecords = processedRecords;
                            syncStatus.CurrentTask = "同期完了";
                        }
                        else
                        {
                            syncStatus.ErrorMessage = errorMessage;
                            syncStatus.CurrentTask = "同期失敗";
                        }
                    }
                    
                    await _context.SaveChangesAsync();
                    _logger.LogInformation(
                        "✅ [OrderSyncJob] Updated {Count} SyncStatuses records for StoreId: {StoreId}, EntityType: {EntityType}, Success: {Success}",
                        syncStatuses.Count, storeId, entityType, success);
                    
                    // 同期成功時は顧客統計（TotalOrders, TotalSpent, LastOrderDate）を更新
                    if (success && entityType == "Orders")
                    {
                        try
                        {
                            _logger.LogInformation("📊 [OrderSyncJob] 顧客統計更新を開始: StoreId={StoreId}", storeId);
                            var updatedCount = await _customerMaintenanceService.UpdateCustomerTotalOrdersAsync(storeId);
                            _logger.LogInformation("📊 [OrderSyncJob] 顧客統計更新完了: StoreId={StoreId}, 更新件数={UpdatedCount}", storeId, updatedCount);
                        }
                        catch (Exception maintenanceEx)
                        {
                            _logger.LogWarning(maintenanceEx, "⚠️ [OrderSyncJob] 顧客統計更新に失敗（同期自体は成功）: StoreId={StoreId}", storeId);
                        }
                    }
                }
                else
                {
                    _logger.LogDebug(
                        "ℹ️ [OrderSyncJob] No running SyncStatuses records found for StoreId: {StoreId}, EntityType: {EntityType}",
                        storeId, entityType);
                }
            }
            catch (Exception ex)
            {
                // SyncStatuses更新に失敗してもメイン処理には影響しない
                _logger.LogWarning(ex,
                    "⚠️ [OrderSyncJob] Failed to update SyncStatuses for StoreId: {StoreId}, EntityType: {EntityType}",
                    storeId, entityType);
            }
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
                    // ✅ 初期設定完了済みのストアのみを対象
                    var activeStores = context.Stores
                        .Where(s => s.IsActive == true 
                                 && s.InitialSetupCompleted == true 
                                 && !string.IsNullOrEmpty(s.AccessToken))
                        .ToList();
                    
                    logger.LogInformation($"Registering recurring order sync jobs for {activeStores.Count} stores (InitialSetupCompleted=true)");
                    
                    foreach (var store in activeStores)
                    {
                        // 各ストアごとに3時間ごとの同期ジョブを登録
                        RecurringJob.AddOrUpdate<ShopifyOrderSyncJob>(
                            $"sync-orders-store-{store.Id}",
                            job => job.SyncOrders(store.Id, null),
                            "0 */3 * * *"); // 3時間ごと
                        
                        logger.LogInformation($"Registered recurring order sync job for store: {store.Name} (ID: {store.Id})");
                    }
                    
                    // 初期設定が完了していないストアのジョブを削除（念のため）
                    var storesWithoutSetup = context.Stores
                        .Where(s => s.IsActive == true 
                                 && (s.InitialSetupCompleted != true))
                        .Select(s => s.Id)
                        .ToList();
                    
                    foreach (var storeId in storesWithoutSetup)
                    {
                        var jobId = $"sync-orders-store-{storeId}";
                        RecurringJob.RemoveIfExists(jobId);
                        logger.LogInformation($"Removed recurring order sync job for store (InitialSetupCompleted=false): {jobId}");
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