using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// Shopifyデータ同期サービス（初期同期・バッチ同期用）
    /// </summary>
    public class ShopifyDataSyncService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<ShopifyDataSyncService> _logger;
        private readonly IConfiguration _configuration;
        private readonly ShopifyApiService _shopifyApiService;

        public ShopifyDataSyncService(
            ShopifyDbContext context,
            ILogger<ShopifyDataSyncService> logger,
            IConfiguration configuration,
            ShopifyApiService shopifyApiService)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _shopifyApiService = shopifyApiService;
        }

        /// <summary>
        /// 初期同期を開始
        /// </summary>
        public async Task StartInitialSync(int storeId, int syncStatusId, string syncPeriod)
        {
            var syncStatus = await _context.SyncStatuses.FindAsync(syncStatusId);
            if (syncStatus == null) return;

            try
            {
                // ステータスを実行中に更新
                syncStatus.Status = "running";
                syncStatus.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var store = await _context.Stores.FindAsync(storeId);
                if (store == null)
                {
                    throw new Exception($"Store not found: {storeId}");
                }

                // 同期期間の計算
                var startDate = GetStartDateFromPeriod(syncPeriod);
                
                // シミュレーションモードで同期を実行
                await SimulateDataSync(store, syncStatus, startDate);

                // 同期完了
                syncStatus.Status = "completed";
                syncStatus.EndDate = DateTime.UtcNow;
                syncStatus.UpdatedAt = DateTime.UtcNow;
                
                // ストアの初期設定完了フラグを更新
                store.InitialSetupCompleted = true;
                store.LastSyncDate = DateTime.UtcNow;
                store.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Initial sync completed for store {storeId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in initial sync for store {storeId}");
                
                syncStatus.Status = "failed";
                syncStatus.EndDate = DateTime.UtcNow;
                syncStatus.ErrorMessage = ex.Message;
                syncStatus.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// データ同期の実行（実際のShopify API呼び出し版）
        /// </summary>
        private async Task SimulateDataSync(Store store, SyncStatus syncStatus, DateTime? startDate)
        {
            try
            {
                // シミュレーションモードのチェック
                var useSimulation = _configuration.GetValue<bool>("Shopify:UseSimulation", true);
                
                if (useSimulation || string.IsNullOrEmpty(store.AccessToken))
                {
                    // シミュレーションモード
                    await RunSimulatedSync(store, syncStatus, startDate);
                }
                else
                {
                    // 実際のAPI呼び出しモード
                    await RunActualSync(store, syncStatus, startDate);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error during data sync for store {store.Id}");
                throw;
            }
        }

        /// <summary>
        /// 実際のShopify API呼び出しによる同期
        /// </summary>
        private async Task RunActualSync(Store store, SyncStatus syncStatus, DateTime? startDate)
        {
            var totalSynced = 0;

            // 1. 顧客データ同期
            syncStatus.CurrentTask = "顧客データ取得中";
            await _context.SaveChangesAsync();
            
            var customerCount = await _shopifyApiService.SyncCustomersAsync(store.Id, startDate);
            totalSynced += customerCount;
            
            syncStatus.ProcessedRecords = customerCount;
            syncStatus.CurrentTask = "顧客データ同期完了";
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Synced {customerCount} customers for store {store.Id}");

            // 2. 商品データ同期
            syncStatus.CurrentTask = "商品データ取得中";
            await _context.SaveChangesAsync();
            
            var productCount = await _shopifyApiService.SyncProductsAsync(store.Id, startDate);
            totalSynced += productCount;
            
            syncStatus.ProcessedRecords = totalSynced;
            syncStatus.CurrentTask = "商品データ同期完了";
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Synced {productCount} products for store {store.Id}");

            // 3. 注文データ同期
            syncStatus.CurrentTask = "注文データ取得中";
            await _context.SaveChangesAsync();
            
            var orderCount = await _shopifyApiService.SyncOrdersAsync(store.Id, startDate);
            totalSynced += orderCount;
            
            syncStatus.ProcessedRecords = totalSynced;
            syncStatus.TotalRecords = totalSynced;
            syncStatus.CurrentTask = "全データ同期完了";
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Synced {orderCount} orders for store {store.Id}");
            _logger.LogInformation($"Total synced records: {totalSynced} for store {store.Id}");
        }

        /// <summary>
        /// シミュレーションによる同期（デモ用）
        /// </summary>
        private async Task RunSimulatedSync(Store store, SyncStatus syncStatus, DateTime? startDate)
        {
            var random = new Random();
            
            // 顧客データ同期のシミュレーション
            syncStatus.CurrentTask = "顧客データ取得中（シミュレーション）";
            syncStatus.TotalRecords = random.Next(100, 500);
            await _context.SaveChangesAsync();

            for (int i = 0; i < syncStatus.TotalRecords; i += 10)
            {
                await Task.Delay(100); // API呼び出しのシミュレーション
                syncStatus.ProcessedRecords = Math.Min(i + 10, syncStatus.TotalRecords.Value);
                
                if (i % 50 == 0)
                {
                    await _context.SaveChangesAsync();
                }
            }

            // 注文データ同期のシミュレーション
            syncStatus.CurrentTask = "注文データ取得中";
            var orderCount = random.Next(200, 1000);
            syncStatus.TotalRecords = (syncStatus.TotalRecords ?? 0) + orderCount;
            await _context.SaveChangesAsync();

            var processedBefore = syncStatus.ProcessedRecords ?? 0;
            for (int i = 0; i < orderCount; i += 10)
            {
                await Task.Delay(100); // API呼び出しのシミュレーション
                syncStatus.ProcessedRecords = processedBefore + Math.Min(i + 10, orderCount);
                
                if (i % 50 == 0)
                {
                    await _context.SaveChangesAsync();
                }
            }

            // 商品データ同期のシミュレーション
            syncStatus.CurrentTask = "商品データ取得中";
            var productCount = random.Next(50, 200);
            syncStatus.TotalRecords = (syncStatus.TotalRecords ?? 0) + productCount;
            await _context.SaveChangesAsync();

            processedBefore = syncStatus.ProcessedRecords ?? 0;
            for (int i = 0; i < productCount; i += 10)
            {
                await Task.Delay(100); // API呼び出しのシミュレーション
                syncStatus.ProcessedRecords = processedBefore + Math.Min(i + 10, productCount);
                
                if (i % 30 == 0)
                {
                    await _context.SaveChangesAsync();
                }
            }

            syncStatus.CurrentTask = "同期完了";
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Simulated sync completed for store {store.Id}: {syncStatus.ProcessedRecords} records processed");
        }

        /// <summary>
        /// 同期期間から開始日を計算
        /// </summary>
        private DateTime? GetStartDateFromPeriod(string syncPeriod)
        {
            return syncPeriod switch
            {
                "3months" => DateTime.UtcNow.AddMonths(-3),
                "6months" => DateTime.UtcNow.AddMonths(-6),
                "1year" => DateTime.UtcNow.AddYears(-1),
                "all" => null,
                _ => DateTime.UtcNow.AddMonths(-3)
            };
        }
    }
}