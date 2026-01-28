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
            _logger.LogInformation("🔵 [SyncController] ========================================");
            _logger.LogInformation("🔵 [SyncController] POST /api/sync/initial 呼び出し開始");
            _logger.LogInformation("🔵 [SyncController] StoreId: {StoreId}", StoreId);
            _logger.LogInformation("🔵 [SyncController] Request: SyncPeriod={SyncPeriod}", request != null ? request.SyncPeriod : "null");
            _logger.LogInformation("🔵 [SyncController] Timestamp: {Timestamp}", DateTime.UtcNow);

            try
            {
                if (request == null)
                {
                    _logger.LogWarning("🔵 [SyncController] リクエストがnullです");
                    return BadRequest(new { error = "Request body is required" });
                }

                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    _logger.LogWarning("🔵 [SyncController] ストアが見つかりません: StoreId={StoreId}", StoreId);
                    return NotFound(new { error = "Store not found" });
                }

                _logger.LogInformation("🔵 [SyncController] ストア情報取得完了: StoreId={StoreId}, StoreName={StoreName}, Domain={Domain}",
                    currentStore.Id, currentStore.Name, currentStore.Domain);

                // 既に同期中の場合はエラー
                var runningSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id && s.Status == "running")
                    .FirstOrDefaultAsync();

                if (runningSync != null)
                {
                    _logger.LogWarning("🔵 [SyncController] 既に同期中のためエラー: RunningSyncId={RunningSyncId}", runningSync.Id);
                    return BadRequest(new { error = "Sync already in progress", syncId = runningSync.Id });
                }

                _logger.LogInformation("🔵 [SyncController] 既存の同期チェック完了: 同期中なし");

                // 新しい同期ステータスを作成
                var syncStatus = new SyncStatus
                {
                    StoreId = currentStore.Id,
                    SyncType = "initial",
                    Status = "pending",
                    StartDate = DateTime.UtcNow,
                    SyncPeriod = request.SyncPeriod,
                    CurrentTask = "準備中"
                };

                _context.SyncStatuses.Add(syncStatus);
                await _context.SaveChangesAsync();

                _logger.LogInformation("🔵 [SyncController] SyncStatus作成完了: SyncId={SyncId}, Status={Status}, SyncPeriod={SyncPeriod}",
                    syncStatus.Id, syncStatus.Status, syncStatus.SyncPeriod);

                // HangFireバックグラウンドジョブとして登録
                var jobId = _backgroundJobClient.Enqueue(() =>
                    _syncService.StartInitialSync(currentStore.Id, syncStatus.Id, request.SyncPeriod));

                _logger.LogInformation("🔵 [SyncController] HangFireジョブ登録完了: JobId={JobId}, StoreId={StoreId}, SyncId={SyncId}",
                    jobId, currentStore.Id, syncStatus.Id);
                _logger.LogInformation("🔵 [SyncController] レスポンス返却: SyncId={SyncId}, JobId={JobId}", syncStatus.Id, jobId);
                _logger.LogInformation("🔵 [SyncController] ========================================");

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
                _logger.LogError(ex, "🔵 [SyncController] ❌ エラー発生: StoreId={StoreId}, Message={Message}, StackTrace={StackTrace}",
                    StoreId, ex.Message, ex.StackTrace);
                _logger.LogInformation("🔵 [SyncController] ========================================");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 同期状態を取得
        /// </summary>
        [HttpGet("status/{syncId}")]
        public async Task<IActionResult> GetSyncStatus(int syncId)
        {
            _logger.LogInformation("🟢 [SyncController] ========================================");
            _logger.LogInformation("🟢 [SyncController] GET /api/sync/status/{SyncId} 呼び出し開始", syncId);
            _logger.LogInformation("🟢 [SyncController] StoreId: {StoreId}", StoreId);
            _logger.LogInformation("🟢 [SyncController] Timestamp: {Timestamp}", DateTime.UtcNow);

            // StoreId が取得できているか確認
            if (StoreId <= 0)
            {
                _logger.LogError("🟢 [SyncController] ❌ StoreIdが取得できませんでした: StoreId={StoreId}", StoreId);
                _logger.LogInformation("🟢 [SyncController] ========================================");
                return Unauthorized(new { error = "Store context is not available" });
            }

            try
            {
                var syncStatus = await _context.SyncStatuses.FindAsync(syncId);
                if (syncStatus == null)
                {
                    _logger.LogWarning("🟢 [SyncController] SyncStatusが見つかりません: SyncId={SyncId}", syncId);
                    _logger.LogInformation("🟢 [SyncController] ========================================");
                    return NotFound(new { error = "Sync status not found" });
                }

                _logger.LogInformation("🟢 [SyncController] SyncStatus取得完了: SyncId={SyncId}, StoreId={StoreStatusStoreId}, Status={Status}",
                    syncStatus.Id, syncStatus.StoreId, syncStatus.Status);

                // セキュリティチェック: 現在のストアの同期状態のみアクセス可能
                if (syncStatus.StoreId != StoreId)
                {
                    _logger.LogWarning("🟢 [SyncController] ストアID不一致: RequestStoreId={RequestStoreId}, SyncStatusStoreId={SyncStatusStoreId}",
                        StoreId, syncStatus.StoreId);
                    _logger.LogInformation("🟢 [SyncController] ========================================");
                    return NotFound(new { error = "Sync status not found" });
                }

                _logger.LogInformation("🟢 [SyncController] セキュリティチェック完了: ストアID一致");

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

                _logger.LogInformation("🟢 [SyncController] レスポンス返却: SyncId={SyncId}, Status={Status}, Progress={Processed}/{Total} ({Percentage}%)",
                    syncStatus.Id, syncStatus.Status, syncStatus.ProcessedRecords ?? 0, syncStatus.TotalRecords ?? 0, percentage);
                _logger.LogInformation("🟢 [SyncController] ========================================");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🟢 [SyncController] ❌ エラー発生: SyncId={SyncId}, StoreId={StoreId}, Message={Message}",
                    syncId, StoreId, ex.Message);
                _logger.LogInformation("🟢 [SyncController] ========================================");
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
                    .Where(s => s.StoreId == StoreId)
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
                    .Where(s => s.StoreId == currentStore.Id)
                    .OrderByDescending(s => s.StartDate)
                    .FirstOrDefaultAsync();

                var productCount = await _context.Products.CountAsync(p => p.StoreId == currentStore.Id && p.IsActive);
                var customerCount = await _context.Customers.CountAsync(c => c.StoreId == currentStore.Id);
                var orderCount = await _context.Orders.CountAsync(o => o.StoreId == currentStore.Id);

                var lastProductSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id && s.EntityType == "Product")
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                var lastCustomerSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id && s.EntityType == "Customer")
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                var lastOrderSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id && s.EntityType == "Order")
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                var activeSync = await _context.SyncStatuses
                    .Where(s => s.StoreId == currentStore.Id && s.Status == "running")
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
                    .Where(s => s.StoreId == currentStore.Id)
                    // EndDateでソートして、「最終同期」と「同期履歴の最新」の時刻を一致させる
                    // EndDateがあるレコードを優先し、EndDateでソート
                    // EndDateがないレコード（実行中の同期など）はStartDateでソート
                    .OrderByDescending(s => s.EndDate.HasValue ? 1 : 0) // EndDateがあるレコードを先に
                    .ThenByDescending(s => s.EndDate ?? s.StartDate) // EndDateでソート、なければStartDateでソート
                    .Take(limit)
                    .Select(s => new
                    {
                        id = s.Id.ToString(),
                        type = string.IsNullOrEmpty(s.SyncType) ? "initial" : s.SyncType.ToLower(), // 'initial', 'manual', 'scheduled'
                        entityType = string.IsNullOrEmpty(s.EntityType) || s.EntityType == "All" ? "all" : s.EntityType.ToLower() + "s",
                        status = s.Status == "completed" ? "success" :
                                s.Status == "failed" ? "error" :
                                s.Status == "running" ? "syncing" : "warning",
                        startedAt = s.StartDate.ToString("o"),
                        completedAt = s.EndDate.HasValue ? s.EndDate.Value.ToString("o") : null,
                        duration = s.EndDate.HasValue
                            ? (int)(s.EndDate.Value - s.StartDate).TotalMilliseconds : 0,
                        durationMinutes = s.EndDate.HasValue
                            ? (int)(s.EndDate.Value - s.StartDate).TotalMinutes : 0,
                        recordsProcessed = s.ProcessedRecords ?? 0,
                        message = s.ErrorMessage ?? (s.Status == "completed" ?
                            $"{s.EntityType ?? "全データ"}の同期が完了しました" : null),
                        error = s.Status == "failed" ? s.ErrorMessage : null
                    })
                    .ToListAsync();

                // デバッグログ: 取得した履歴の最新エントリーを確認
                if (history.Count > 0)
                {
                    var latestHistory = history.First();
                    _logger.LogInformation("📊 [GetSyncHistory] 同期履歴取得: StoreId={StoreId}, Count={Count}, LatestCompletedAt={LatestCompletedAt}, LatestStartedAt={LatestStartedAt}",
                        currentStore.Id, history.Count, latestHistory.completedAt, latestHistory.startedAt);
                }

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
                    .Where(s => s.StoreId == currentStore.Id && s.Status == "running")
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
                    StoreId = currentStore.Id,
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
                    syncId = syncStatus.Id,
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
                    .Where(s => s.StoreId == currentStore.Id &&
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