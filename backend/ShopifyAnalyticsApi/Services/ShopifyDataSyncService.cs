using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Jobs;
using System.Text.Json;
using Hangfire;

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
        private readonly ShopifyProductSyncJob _productSyncJob;
        private readonly ShopifyCustomerSyncJob _customerSyncJob;
        private readonly ShopifyOrderSyncJob _orderSyncJob;
        private readonly CustomerDataMaintenanceService _customerMaintenanceService;
        private readonly IServiceProvider _serviceProvider;

        public ShopifyDataSyncService(
            ShopifyDbContext context,
            ILogger<ShopifyDataSyncService> logger,
            IConfiguration configuration,
            ShopifyApiService shopifyApiService,
            ShopifyProductSyncJob productSyncJob,
            ShopifyCustomerSyncJob customerSyncJob,
            ShopifyOrderSyncJob orderSyncJob,
            CustomerDataMaintenanceService customerMaintenanceService,
            IServiceProvider serviceProvider)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _shopifyApiService = shopifyApiService;
            _productSyncJob = productSyncJob;
            _customerSyncJob = customerSyncJob;
            _orderSyncJob = orderSyncJob;
            _customerMaintenanceService = customerMaintenanceService;
            _serviceProvider = serviceProvider;
        }

        /// <summary>
        /// 初期同期を開始（HangFireバックグラウンドジョブとして実行）
        /// </summary>
        [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 60, 300 })] // 1分後と5分後にリトライ
        public async Task StartInitialSync(int storeId, int syncStatusId, string syncPeriod)
        {
            _logger.LogInformation("🟡 [ShopifyDataSyncService] ========================================");
            _logger.LogInformation("🟡 [ShopifyDataSyncService] StartInitialSync開始: StoreId={StoreId}, SyncStatusId={SyncStatusId}, SyncPeriod={SyncPeriod}", 
                storeId, syncStatusId, syncPeriod);
            _logger.LogInformation("🟡 [ShopifyDataSyncService] Timestamp: {Timestamp}", DateTime.UtcNow);
            
            var syncStatus = await _context.SyncStatuses.FindAsync(syncStatusId);
            if (syncStatus == null)
            {
                _logger.LogError("🟡 [ShopifyDataSyncService] ❌ SyncStatusが見つかりません: SyncStatusId={SyncStatusId}", syncStatusId);
                _logger.LogInformation("🟡 [ShopifyDataSyncService] ========================================");
                return;
            }

            try
            {
                // ステータスを実行中に更新
                syncStatus.Status = "running";
                syncStatus.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("🟡 [ShopifyDataSyncService] SyncStatusをrunningに更新完了");

                var store = await _context.Stores.FindAsync(storeId);
                if (store == null)
                {
                    _logger.LogError("🟡 [ShopifyDataSyncService] ❌ ストアが見つかりません: StoreId={StoreId}", storeId);
                    throw new Exception($"Store not found: {storeId}");
                }
                
                _logger.LogInformation("🟡 [ShopifyDataSyncService] ストア情報取得完了: StoreId={StoreId}, StoreName={StoreName}, Domain={Domain}, HasAccessToken={HasAccessToken}", 
                    store.Id, store.Name, store.Domain, !string.IsNullOrEmpty(store.AccessToken));

                // 同期期間の計算
                var startDate = GetStartDateFromPeriod(syncPeriod);
                
                _logger.LogInformation("🟡 [ShopifyDataSyncService] 同期期間計算完了: StartDate={StartDate}, SyncPeriod={SyncPeriod}", 
                    startDate, syncPeriod);
                
                // 初期同期オプションを作成
                var syncOptions = new InitialSyncOptions
                {
                    StartDate = startDate,
                    EndDate = null,
                    MaxYearsBack = 3,
                    IncludeArchived = false,
                    IsFullScan = syncPeriod == "all"  // 「全期間」の場合はフルスキャンモード
                };
                
                _logger.LogInformation("🟡 [ShopifyDataSyncService] SyncOptions作成完了: StartDate={StartDate}, MaxYearsBack={MaxYearsBack}, IsFullScan={IsFullScan}", 
                    syncOptions.StartDate, syncOptions.MaxYearsBack, syncOptions.IsFullScan);
                
                // 新しいジョブクラスを使用して同期を実行
                await RunInitialSyncWithJobs(store, syncStatus, syncOptions);

                // 同期完了
                syncStatus.Status = "completed";
                syncStatus.EndDate = DateTime.UtcNow;
                syncStatus.UpdatedAt = DateTime.UtcNow;
                
                // ストアの初期設定完了フラグを更新
                store.InitialSetupCompleted = true;
                store.LastSyncDate = DateTime.UtcNow;
                store.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("🟡 [ShopifyDataSyncService] 初期設定完了フラグを更新: InitialSetupCompleted=true");

                // ✅ 初期設定完了後、定期ジョブを登録
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var recurringJobManager = scope.ServiceProvider.GetRequiredService<Hangfire.IRecurringJobManager>();
                        
                        // 商品同期ジョブ（1時間ごと）
                        recurringJobManager.AddOrUpdate<ShopifyProductSyncJob>(
                            $"sync-products-store-{store.Id}",
                            job => job.SyncProducts(store.Id, null),
                            Hangfire.Cron.Hourly);

                        // 顧客同期ジョブ（2時間ごと。read_customersスコープ復元済みのため全顧客を定期同期）
                        recurringJobManager.AddOrUpdate<ShopifyCustomerSyncJob>(
                            $"sync-customers-store-{store.Id}",
                            job => job.SyncCustomers(store.Id, null),
                            "0 */2 * * *");

                        // 注文同期ジョブ（3時間ごと）
                        recurringJobManager.AddOrUpdate<ShopifyOrderSyncJob>(
                            $"sync-orders-store-{store.Id}",
                            job => job.SyncOrders(store.Id, null),
                            "0 */3 * * *");
                        
                        _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 定期ジョブ登録完了: StoreId={StoreId}", store.Id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "🟡 [ShopifyDataSyncService] ⚠️ 定期ジョブ登録に失敗（アプリ再起動時に自動登録されます）: StoreId={StoreId}", store.Id);
                    // エラーが発生しても初期同期は完了として扱う（アプリ再起動時に自動登録される）
                }

                _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 初期同期完了: StoreId={StoreId}, SyncStatusId={SyncStatusId}", 
                    storeId, syncStatusId);
                _logger.LogInformation("🟡 [ShopifyDataSyncService] ========================================");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🟡 [ShopifyDataSyncService] ❌ エラー発生: StoreId={StoreId}, SyncStatusId={SyncStatusId}, Message={Message}", 
                    storeId, syncStatusId, ex.Message);
                _logger.LogInformation("🟡 [ShopifyDataSyncService] ========================================");
                
                syncStatus.Status = "failed";
                syncStatus.EndDate = DateTime.UtcNow;
                syncStatus.ErrorMessage = ex.Message;
                syncStatus.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// 新しいジョブクラスを使用して初期同期を実行
        /// </summary>
        private async Task RunInitialSyncWithJobs(Store store, SyncStatus syncStatus, InitialSyncOptions syncOptions)
        {
            _logger.LogInformation("🟡 [ShopifyDataSyncService] RunInitialSyncWithJobs開始: StoreId={StoreId}, SyncStatusId={SyncStatusId}", 
                store.Id, syncStatus.Id);
            
            try
            {
                // シミュレーションモードのチェック
                // デフォルト値を false に変更（本番環境では実際のデータ同期を実行するため）
                var useSimulation = _configuration.GetValue<bool>("Shopify:UseSimulation", false);
                
                _logger.LogInformation("🟡 [ShopifyDataSyncService] シミュレーションモードチェック: UseSimulation={UseSimulation}, HasAccessToken={HasAccessToken}", 
                    useSimulation, !string.IsNullOrEmpty(store.AccessToken));
                
                if (useSimulation || string.IsNullOrEmpty(store.AccessToken))
                {
                    // シミュレーションモード
                    _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ シミュレーションモードで実行: UseSimulation={UseSimulation}, HasAccessToken={HasAccessToken}", 
                        useSimulation, !string.IsNullOrEmpty(store.AccessToken));
                    await RunSimulatedSync(store, syncStatus, syncOptions.StartDate);
                }
                else
                {
                    // 実際のジョブクラスを使用して同期を実行
                    _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 実際の同期モードで実行開始");
                    
                    // 1. 顧客データ同期（read_customersスコープ復元済み。全顧客を取得して初期同期・手動同期で一致させる）
                    _logger.LogInformation("🟡 [ShopifyDataSyncService] 顧客データ同期開始");
                    syncStatus.CurrentTask = "顧客データ取得中";
                    await _context.SaveChangesAsync();

                    await _customerSyncJob.SyncCustomers(store.Id, syncOptions);

                    int customerCount = await _context.Customers.CountAsync(c => c.StoreId == store.Id);
                    syncStatus.ProcessedRecords = customerCount;
                    syncStatus.CurrentTask = "顧客データ同期完了";
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 顧客データ同期完了: Count={CustomerCount}, StoreId={StoreId}",
                        customerCount, store.Id);

                    // 2. 商品データ同期
                    _logger.LogInformation("🟡 [ShopifyDataSyncService] 商品データ同期開始");
                    syncStatus.CurrentTask = "商品データ取得中";
                    await _context.SaveChangesAsync();
                    
                    await _productSyncJob.SyncProducts(store.Id, syncOptions);
                    
                    var productCount = await _context.Products.CountAsync(p => p.StoreId == store.Id && p.IsActive);
                    syncStatus.ProcessedRecords = customerCount + productCount;
                    syncStatus.CurrentTask = "商品データ同期完了";
                    await _context.SaveChangesAsync();
                    
                    _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 商品データ同期完了: Count={ProductCount}, StoreId={StoreId}", 
                        productCount, store.Id);

                    // 3. 注文データ同期
                    _logger.LogInformation("🟡 [ShopifyDataSyncService] 注文データ同期開始");
                    syncStatus.CurrentTask = "注文データ取得中";
                    await _context.SaveChangesAsync();
                    
                    try
                    {
                        await _orderSyncJob.SyncOrders(store.Id, syncOptions);
                        var orderCount = await _context.Orders.CountAsync(o => o.StoreId == store.Id);
                        syncStatus.ProcessedRecords = customerCount + productCount + orderCount;
                        syncStatus.TotalRecords = customerCount + productCount + orderCount;
                        syncStatus.CurrentTask = "全データ同期完了";
                        await _context.SaveChangesAsync();
                        
                        _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 注文データ同期完了: Count={OrderCount}, StoreId={StoreId}", 
                            orderCount, store.Id);
                        _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 全データ同期完了: Total={TotalRecords} (Customers={CustomerCount}, Products={ProductCount}, Orders={OrderCount}), StoreId={StoreId}", 
                            customerCount + productCount + orderCount, customerCount, productCount, orderCount, store.Id);

                        try
                        {
                            _logger.LogInformation("📊 [ShopifyDataSyncService] 顧客統計更新を開始: StoreId={StoreId}", store.Id);
                            var updatedCount = await _customerMaintenanceService.UpdateCustomerTotalOrdersAsync(store.Id);
                            _logger.LogInformation("📊 [ShopifyDataSyncService] 顧客統計更新完了: StoreId={StoreId}, 更新件数={UpdatedCount}", store.Id, updatedCount);
                        }
                        catch (Exception maintenanceEx)
                        {
                            _logger.LogWarning(maintenanceEx, "⚠️ [ShopifyDataSyncService] 顧客統計更新に失敗（同期自体は成功）: StoreId={StoreId}", store.Id);
                        }
                    }
                    catch (Exception orderEx)
                    {
                        // Protected Customer Dataエラーの場合、警告を出して続行
                        var errorMessage = orderEx.Message + (orderEx.InnerException != null ? " " + orderEx.InnerException.Message : "");
                        var isProtectedCustomerDataError = 
                            errorMessage.Contains("Protected customer data", StringComparison.OrdinalIgnoreCase) ||
                            errorMessage.Contains("not approved to access REST endpoints", StringComparison.OrdinalIgnoreCase) ||
                            errorMessage.Contains("protected-customer-data", StringComparison.OrdinalIgnoreCase) ||
                            (orderEx is HttpRequestException && (
                                errorMessage.Contains("Forbidden", StringComparison.OrdinalIgnoreCase) ||
                                errorMessage.Contains("BadRequest", StringComparison.OrdinalIgnoreCase)));
                        
                        // BadRequestエラーの場合、エラーレスポンスの内容を詳細にログ出力
                        if (orderEx is HttpRequestException && errorMessage.Contains("BadRequest", StringComparison.OrdinalIgnoreCase))
                        {
                            _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ BadRequestエラーが発生しました。エラーレスポンスの内容を確認してください: {ErrorMessage}", errorMessage);
                            _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ 注文データ同期のURLやパラメータに問題がある可能性があります");
                        }
                        
                        if (isProtectedCustomerDataError)
                        {
                            _logger.LogWarning(orderEx, "🟡 [ShopifyDataSyncService] ⚠️ 注文データ同期が失敗しました（Protected Customer Data未承認）");
                            _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ エラー詳細: {ErrorMessage}", errorMessage);
                            _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ 商品データの同期は完了しています");
                            _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ Shopify Partners管理画面でProtected Customer Dataへのアクセスを申請してください:");
                            _logger.LogWarning("🟡 [ShopifyDataSyncService] ⚠️ https://partners.shopify.com → Apps → EC Ranger → App setup → Protected customer data");
                            var orderCount = await _context.Orders.CountAsync(o => o.StoreId == store.Id);
                            syncStatus.ProcessedRecords = customerCount + productCount + orderCount;
                            syncStatus.TotalRecords = customerCount + productCount + orderCount;
                            syncStatus.CurrentTask = "注文データ同期スキップ（Protected Customer Data未承認）";
                            var existingErrorMessage = syncStatus.ErrorMessage ?? "";
                            syncStatus.ErrorMessage = string.IsNullOrEmpty(existingErrorMessage) 
                                ? $"注文データ同期がスキップされました: Protected Customer Data未承認。詳細: {errorMessage}"
                                : $"{existingErrorMessage} | 注文データ同期がスキップされました: Protected Customer Data未承認。詳細: {errorMessage}";
                            await _context.SaveChangesAsync();
                            
                            _logger.LogInformation("🟡 [ShopifyDataSyncService] ✅ 部分的な同期完了: Total={TotalRecords} (Customers={CustomerCount}, Products={ProductCount}, Orders={OrderCount}), StoreId={StoreId}", 
                                customerCount + productCount + orderCount, customerCount, productCount, orderCount, store.Id);
                        }
                        else
                        {
                            // その他のエラーは再スロー
                            _logger.LogError(orderEx, "🟡 [ShopifyDataSyncService] ❌ 注文データ同期で予期しないエラーが発生しました");
                            throw;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🟡 [ShopifyDataSyncService] ❌ データ同期中にエラー発生: StoreId={StoreId}, Message={Message}, StackTrace={StackTrace}", 
                    store.Id, ex.Message, ex.StackTrace);
                throw;
            }
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
                "6months" => DateTime.UtcNow.AddMonths(-6),
                "1year" => DateTime.UtcNow.AddYears(-1),
                "all" => null,
                _ => DateTime.UtcNow.AddMonths(-6)
            };
        }
    }
}