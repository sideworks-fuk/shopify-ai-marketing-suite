using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Jobs;
using System.ComponentModel.DataAnnotations;
using Hangfire;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// データ同期関連のAPI
    /// </summary>
    [ApiController]
    [Route("api/sync")]
    public class SyncController : StoreAwareControllerBase
    {
        private readonly ShopifyDbContext _context;
        private readonly IStoreService _storeService;
        private readonly ShopifyDataSyncService _syncService;
        private readonly ShopifyApiService _apiService;
        private readonly IBackgroundJobClient _backgroundJobClient;
        private readonly ShopifyProductSyncJob _productSyncJob;
        private readonly ShopifyCustomerSyncJob _customerSyncJob;
        private readonly ShopifyOrderSyncJob _orderSyncJob;
        private readonly ILogger<SyncController> _logger;

        public SyncController(
            ShopifyDbContext context,
            IStoreService storeService,
            ShopifyDataSyncService syncService,
            ShopifyApiService apiService,
            IBackgroundJobClient backgroundJobClient,
            ShopifyProductSyncJob productSyncJob,
            ShopifyCustomerSyncJob customerSyncJob,
            ShopifyOrderSyncJob orderSyncJob,
            ILogger<SyncController> logger) : base(logger)
        {
            _context = context;
            _storeService = storeService;
            _syncService = syncService;
            _apiService = apiService;
            _backgroundJobClient = backgroundJobClient;
            _productSyncJob = productSyncJob;
            _customerSyncJob = customerSyncJob;
            _orderSyncJob = orderSyncJob;
            _logger = logger;
        }

        /// <summary>
        /// 初期データ同期を開始
        /// </summary>
        [HttpPost("initial")]
        public async Task<IActionResult> StartInitialSync([FromBody] InitialSyncRequest request)
        {
            try
            {
                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                // 既に同期中の場合はエラー
                var runningSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id.ToString() && s.Status == "running")
                    .FirstOrDefaultAsync();

                if (runningSync != null)
                {
                    return BadRequest(new { error = "Sync already in progress", syncId = runningSync.Id });
                }

                // 新しい同期ステータスを作成
                var syncStatus = new SyncStatus
                {
                    StoreId = currentStore.Id.ToString(),
                    SyncType = "initial",
                    Status = "pending",
                    StartDate = DateTime.UtcNow,
                    SyncPeriod = request.SyncPeriod,
                    CurrentTask = "準備中"
                };

                _context.SyncStatuses.Add(syncStatus);
                await _context.SaveChangesAsync();

                // HangFireバックグラウンドジョブとして登録
                var jobId = _backgroundJobClient.Enqueue(() => 
                    _syncService.StartInitialSync(currentStore.Id, syncStatus.Id, request.SyncPeriod));

                _logger.LogInformation(
                    "Initial sync job enqueued. JobId: {JobId}, StoreId: {StoreId}, StoreName: {StoreName}, Period: {SyncPeriod}", 
                    jobId, currentStore.Id, currentStore.Name, request.SyncPeriod);

                return Ok(new
                {
                    syncId = syncStatus.Id,
                    jobId = jobId,
                    status = "started",
                    message = "Initial sync has been started"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting initial sync for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 同期状態を取得
        /// </summary>
        [HttpGet("status/{syncId}")]
        public async Task<IActionResult> GetSyncStatus(int syncId)
        {
            try
            {
                var syncStatus = await _context.SyncStatuses.FindAsync(syncId);
                if (syncStatus == null)
                {
                    return NotFound(new { error = "Sync status not found" });
                }

                // セキュリティチェック: 現在のストアの同期状態のみアクセス可能
                if (syncStatus.StoreId != StoreId.ToString())
                {
                    return NotFound(new { error = "Sync status not found" });
                }

                // 進捗率を計算
                int percentage = 0;
                if (syncStatus.TotalRecords > 0)
                {
                    percentage = (int)((syncStatus.ProcessedRecords ?? 0) * 100.0 / syncStatus.TotalRecords);
                }

                // 推定残り時間を計算（簡易版）
                int? estimatedTimeRemaining = null;
                if (syncStatus.Status == "running" && syncStatus.ProcessedRecords > 0)
                {
                    var elapsedTime = (DateTime.UtcNow - syncStatus.StartDate).TotalSeconds;
                    var avgTimePerRecord = elapsedTime / syncStatus.ProcessedRecords.Value;
                    var remainingRecords = (syncStatus.TotalRecords ?? 0) - (syncStatus.ProcessedRecords ?? 0);
                    estimatedTimeRemaining = (int)(avgTimePerRecord * remainingRecords);
                }

                var response = new
                {
                    syncId = syncStatus.Id,
                    status = syncStatus.Status,
                    progress = new
                    {
                        total = syncStatus.TotalRecords ?? 0,
                        processed = syncStatus.ProcessedRecords ?? 0,
                        percentage = percentage
                    },
                    currentTask = syncStatus.CurrentTask ?? "待機中",
                    estimatedTimeRemaining = estimatedTimeRemaining,
                    startDate = syncStatus.StartDate,
                    endDate = syncStatus.EndDate,
                    errorMessage = syncStatus.ErrorMessage
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sync status for syncId: {SyncId}, store: {StoreId}", syncId, StoreId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 現在のストアの最新同期状態を取得
        /// </summary>
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatestSyncStatus()
        {
            try
            {
                var latestSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == StoreId.ToString())
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (latestSync == null)
                {
                    return Ok(new { status = "no_sync", message = "No sync has been performed yet" });
                }

                return await GetSyncStatus(latestSync.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting latest sync status for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 同期ステータスを取得
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetSyncStatus()
        {
            try
            {
                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var latestSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id.ToString())
                    .OrderByDescending(s => s.StartDate)
                    .FirstOrDefaultAsync();

                var productCount = await _context.Products.CountAsync(p => p.StoreId == currentStore.Id);
                var customerCount = await _context.Customers.CountAsync(c => c.StoreId == currentStore.Id);
                var orderCount = await _context.Orders.CountAsync(o => o.StoreId == currentStore.Id);

                var lastProductSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id.ToString() && s.EntityType == "Product")
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                var lastCustomerSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id.ToString() && s.EntityType == "Customer")
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                var lastOrderSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id.ToString() && s.EntityType == "Order")
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                var activeSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id.ToString() && s.Status == "running")
                    .FirstOrDefaultAsync();

                var response = new
                {
                    products = new
                    {
                        status = lastProductSync?.Status == "running" ? "syncing" : 
                                lastProductSync?.Status == "failed" ? "error" : "synced",
                        count = productCount,
                        lastSyncAt = lastProductSync?.EndDate?.ToString("o"),
                        nextSyncAt = lastProductSync?.EndDate?.AddHours(6).ToString("o"),
                        error = lastProductSync?.Status == "failed" ? lastProductSync.ErrorMessage : null
                    },
                    customers = new
                    {
                        status = lastCustomerSync?.Status == "running" ? "syncing" :
                                lastCustomerSync?.Status == "failed" ? "error" : "synced",
                        count = customerCount,
                        lastSyncAt = lastCustomerSync?.EndDate?.ToString("o"),
                        nextSyncAt = lastCustomerSync?.EndDate?.AddHours(6).ToString("o"),
                        error = lastCustomerSync?.Status == "failed" ? lastCustomerSync.ErrorMessage : null
                    },
                    orders = new
                    {
                        status = lastOrderSync?.Status == "running" ? "syncing" :
                                lastOrderSync?.Status == "failed" ? "error" : "synced",
                        count = orderCount,
                        lastSyncAt = lastOrderSync?.EndDate?.ToString("o"),
                        nextSyncAt = lastOrderSync?.EndDate?.AddHours(6).ToString("o"),
                        error = lastOrderSync?.Status == "failed" ? lastOrderSync.ErrorMessage : null
                    },
                    activeSync = activeSync != null ? new
                    {
                        type = activeSync.EntityType?.ToLower() ?? "all",
                        progress = activeSync.ProcessedRecords > 0 && activeSync.TotalRecords > 0 
                            ? (double)activeSync.ProcessedRecords.Value / activeSync.TotalRecords.Value * 100 : 0,
                        total = activeSync.TotalRecords ?? 0,
                        current = activeSync.ProcessedRecords ?? 0,
                        startedAt = activeSync.StartDate.ToString("o")
                    } : null,
                    lastFullSyncAt = latestSync?.EndDate?.ToString("o"),
                    nextScheduledSyncAt = DateTime.UtcNow.AddHours(6).ToString("o")
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sync status for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Failed to get sync status" });
            }
        }

    /// <summary>
    /// 同期履歴を取得
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetSyncHistory([FromQuery] int limit = 10)
    {
        try
        {
                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

            var history = await _context.SyncStatuses
                .Where(s => s.StoreId == currentStore.Id.ToString())
                .OrderByDescending(s => s.StartDate)
                .Take(limit)
                .Select(s => new
                {
                    id = s.Id.ToString(),
                    type = string.IsNullOrEmpty(s.EntityType) || s.EntityType == "All" ? "all" : s.EntityType.ToLower() + "s",
                    status = s.Status == "completed" ? "success" : 
                            s.Status == "failed" ? "error" : 
                            s.Status == "running" ? "syncing" : "warning",
                    startedAt = s.StartDate.ToString("o"),
                    completedAt = s.EndDate.HasValue ? s.EndDate.Value.ToString("o") : null,
                    duration = s.EndDate.HasValue 
                        ? (int)(s.EndDate.Value - s.StartDate).TotalMilliseconds : 0,
                    recordsProcessed = s.ProcessedRecords ?? 0,
                    message = s.ErrorMessage ?? (s.Status == "completed" ? 
                        $"{s.EntityType ?? "全データ"}の同期が完了しました" : null),
                    error = s.Status == "failed" ? s.ErrorMessage : null
                })
                .ToListAsync();

            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sync history for store {StoreId}", StoreId);
            return StatusCode(500, new { error = "Failed to get sync history" });
        }
    }

    /// <summary>
    /// 同期を手動トリガー
    /// </summary>
    [HttpPost("trigger")]
    public async Task<IActionResult> TriggerSync([FromBody] TriggerSyncRequest request)
    {
        try
        {
                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

            // 既に同期中の場合はエラー
            var runningSync = await _context.SyncStatuses
                .Where(s => s.StoreId == currentStore.Id.ToString() && s.Status == "running")
                .AnyAsync();

            if (runningSync)
            {
                return BadRequest(new 
                { 
                    success = false, 
                    message = "同期が既に実行中です。完了するまでお待ちください。" 
                });
            }

            // 同期を開始
            var syncStatus = new SyncStatus
            {
                StoreId = currentStore.Id.ToString(),
                SyncType = "manual",
                EntityType = request.Type == "all" ? "All" : 
                           request.Type == "products" ? "Product" :
                           request.Type == "customers" ? "Customer" :
                           request.Type == "orders" ? "Order" : "All",
                Status = "running",
                StartDate = DateTime.UtcNow,
                ProcessedRecords = 0,
                TotalRecords = 0
            };

            _context.SyncStatuses.Add(syncStatus);
            await _context.SaveChangesAsync();

            // HangFireバックグラウンドジョブとして登録
            var jobIds = new List<string>();

            if (request.Type == "all" || request.Type == "products")
            {
                var productJobId = _backgroundJobClient.Enqueue<ShopifyProductSyncJob>(
                    job => job.SyncProducts(currentStore.Id, null));
                jobIds.Add($"products:{productJobId}");
                _logger.LogInformation("Product sync job enqueued. JobId: {JobId}, StoreId: {StoreId}", 
                    productJobId, currentStore.Id);
            }

            if (request.Type == "all" || request.Type == "customers")
            {
                var customerJobId = _backgroundJobClient.Enqueue<ShopifyCustomerSyncJob>(
                    job => job.SyncCustomers(currentStore.Id, null));
                jobIds.Add($"customers:{customerJobId}");
                _logger.LogInformation("Customer sync job enqueued. JobId: {JobId}, StoreId: {StoreId}", 
                    customerJobId, currentStore.Id);
            }

            if (request.Type == "all" || request.Type == "orders")
            {
                var orderJobId = _backgroundJobClient.Enqueue<ShopifyOrderSyncJob>(
                    job => job.SyncOrders(currentStore.Id, null));
                jobIds.Add($"orders:{orderJobId}");
                _logger.LogInformation("Order sync job enqueued. JobId: {JobId}, StoreId: {StoreId}", 
                    orderJobId, currentStore.Id);
            }

            return Ok(new 
            { 
                success = true, 
                message = $"{request.Type}データの同期を開始しました",
                jobIds = jobIds
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error triggering sync for store {StoreId}", StoreId);
            return StatusCode(500, new { error = "Failed to trigger sync" });
        }
    }

    /// <summary>
    /// 同期進捗を取得
    /// </summary>
    [HttpGet("progress")]
    public async Task<IActionResult> GetSyncProgress([FromQuery] string type = "all")
    {
        try
        {
                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

            var entityType = type == "all" ? "All" :
                           type == "products" ? "Product" :
                           type == "customers" ? "Customer" :
                           type == "orders" ? "Order" : "All";

            var activeSync = await _context.SyncStatuses
                .Where(s => s.StoreId == currentStore.Id.ToString() && 
                           s.Status == "running" &&
                           s.EntityType == entityType)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync();

            if (activeSync == null)
            {
                return Ok(new
                {
                    status = "idle",
                    type = type,
                    progressPercentage = 0,
                    currentCount = 0,
                    totalCount = 0
                });
            }

            var progress = activeSync.ProcessedRecords > 0 && activeSync.TotalRecords > 0
                ? (double)activeSync.ProcessedRecords.Value / activeSync.TotalRecords.Value * 100 : 0;

            return Ok(new
            {
                status = "syncing",
                type = type,
                progressPercentage = Math.Round(progress, 1),
                currentCount = activeSync.ProcessedRecords ?? 0,
                totalCount = activeSync.TotalRecords ?? 0,
                startedAt = activeSync.StartDate.ToString("o"),
                estimatedTimeRemaining = EstimateTimeRemaining(activeSync)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sync progress for store {StoreId}", StoreId);
            return StatusCode(500, new { error = "Failed to get sync progress" });
        }
    }

    private int? EstimateTimeRemaining(SyncStatus syncStatus)
    {
        if (syncStatus.ProcessedRecords == null || syncStatus.ProcessedRecords == 0 || 
            syncStatus.TotalRecords == null || syncStatus.TotalRecords == 0)
            return null;

        var elapsed = (DateTime.UtcNow - syncStatus.StartDate).TotalSeconds;
        var rate = syncStatus.ProcessedRecords.Value / elapsed;
        var remaining = syncStatus.TotalRecords.Value - syncStatus.ProcessedRecords.Value;
        
        if (rate > 0)
        {
            return (int)(remaining / rate);
        }

        return null;
    }
}

    /// <summary>
    /// 初期同期リクエストモデル
    /// </summary>
    public class InitialSyncRequest
    {
        [Required]
        [RegularExpression("^(3months|6months|1year|all)$", ErrorMessage = "Invalid sync period")]
        public string SyncPeriod { get; set; } = "3months";
    }

    /// <summary>
    /// 同期トリガーリクエストモデル
    /// </summary>
    public class TriggerSyncRequest
    {
        public string Type { get; set; } = "all";
    }
}