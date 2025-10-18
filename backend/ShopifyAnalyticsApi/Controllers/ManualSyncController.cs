using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Jobs;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Sync;
using Hangfire;
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 手動同期コントローラー - UIから同期を手動でトリガーするためのAPI
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ManualSyncController : ControllerBase
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<ManualSyncController> _logger;
        private readonly ISyncProgressTracker _progressTracker;
        private readonly IBackgroundJobClient _backgroundJobClient;

        public ManualSyncController(
            ShopifyDbContext context,
            ILogger<ManualSyncController> logger,
            ISyncProgressTracker progressTracker,
            IBackgroundJobClient backgroundJobClient)
        {
            _context = context;
            _logger = logger;
            _progressTracker = progressTracker;
            _backgroundJobClient = backgroundJobClient;
        }

        /// <summary>
        /// 商品データの手動同期を開始
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="options">同期オプション</param>
        [HttpPost("sync-products/{storeId}")]
        public async Task<IActionResult> TriggerProductSync(
            int storeId, 
            [FromBody] InitialSyncOptions? options = null)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return NotFound(new { message = "Store not found" });
                }

                if (!store.IsActive)
                {
                    return BadRequest(new { message = "Store is not active" });
                }

                // 既に実行中の同期があるかチェック
                var runningSync = await _context.SyncStates
                    .Where(s => s.StoreId == storeId 
                        && s.SyncType == "Products" 
                        && s.Status == "Running")
                    .FirstOrDefaultAsync();

                if (runningSync != null)
                {
                    return Conflict(new 
                    { 
                        message = "Product sync is already running",
                        syncStateId = runningSync.SyncStateId,
                        startedAt = runningSync.StartedAt
                    });
                }

                // バックグラウンドジョブとして同期を開始
                var jobId = _backgroundJobClient.Enqueue<ShopifyProductSyncJob>(
                    job => job.SyncProducts(storeId, options));

                _logger.LogInformation(
                    $"Product sync triggered for store {store.Name} (ID: {storeId}), Job ID: {jobId}");

                return Ok(new 
                { 
                    message = "Product sync started",
                    jobId = jobId,
                    storeId = storeId,
                    storeName = store.Name
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error triggering product sync for store {storeId}");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// 顧客データの手動同期を開始
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="options">同期オプション</param>
        [HttpPost("sync-customers/{storeId}")]
        public async Task<IActionResult> TriggerCustomerSync(
            int storeId, 
            [FromBody] InitialSyncOptions? options = null)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return NotFound(new { message = "Store not found" });
                }

                if (!store.IsActive)
                {
                    return BadRequest(new { message = "Store is not active" });
                }

                // 既に実行中の同期があるかチェック
                var runningSync = await _context.SyncStates
                    .Where(s => s.StoreId == storeId 
                        && s.SyncType == "Customers" 
                        && s.Status == "Running")
                    .FirstOrDefaultAsync();

                if (runningSync != null)
                {
                    return Conflict(new 
                    { 
                        message = "Customer sync is already running",
                        syncStateId = runningSync.SyncStateId,
                        startedAt = runningSync.StartedAt
                    });
                }

                // バックグラウンドジョブとして同期を開始
                var jobId = _backgroundJobClient.Enqueue<ShopifyCustomerSyncJob>(
                    job => job.SyncCustomers(storeId, options));

                _logger.LogInformation(
                    $"Customer sync triggered for store {store.Name} (ID: {storeId}), Job ID: {jobId}");

                return Ok(new 
                { 
                    message = "Customer sync started",
                    jobId = jobId,
                    storeId = storeId,
                    storeName = store.Name
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error triggering customer sync for store {storeId}");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// 注文データの手動同期を開始
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="options">同期オプション</param>
        [HttpPost("sync-orders/{storeId}")]
        public async Task<IActionResult> TriggerOrderSync(
            int storeId, 
            [FromBody] InitialSyncOptions? options = null)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return NotFound(new { message = "Store not found" });
                }

                if (!store.IsActive)
                {
                    return BadRequest(new { message = "Store is not active" });
                }

                // 既に実行中の同期があるかチェック
                var runningSync = await _context.SyncStates
                    .Where(s => s.StoreId == storeId 
                        && s.SyncType == "Orders" 
                        && s.Status == "Running")
                    .FirstOrDefaultAsync();

                if (runningSync != null)
                {
                    return Conflict(new 
                    { 
                        message = "Order sync is already running",
                        syncStateId = runningSync.SyncStateId,
                        startedAt = runningSync.StartedAt
                    });
                }

                // バックグラウンドジョブとして同期を開始
                var jobId = _backgroundJobClient.Enqueue<ShopifyOrderSyncJob>(
                    job => job.SyncOrders(storeId, options));

                _logger.LogInformation(
                    $"Order sync triggered for store {store.Name} (ID: {storeId}), Job ID: {jobId}");

                return Ok(new 
                { 
                    message = "Order sync started",
                    jobId = jobId,
                    storeId = storeId,
                    storeName = store.Name
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error triggering order sync for store {storeId}");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// 全データタイプの一括同期を開始
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="options">同期オプション</param>
        [HttpPost("sync-all/{storeId}")]
        public async Task<IActionResult> TriggerFullSync(
            int storeId, 
            [FromBody] InitialSyncOptions? options = null)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return NotFound(new { message = "Store not found" });
                }

                if (!store.IsActive)
                {
                    return BadRequest(new { message = "Store is not active" });
                }

                // 各データタイプの同期状態をチェック
                var runningSyncs = await _context.SyncStates
                    .Where(s => s.StoreId == storeId && s.Status == "Running")
                    .Select(s => s.SyncType)
                    .ToListAsync();

                if (runningSyncs.Any())
                {
                    return Conflict(new 
                    { 
                        message = "Some sync processes are already running",
                        runningTypes = runningSyncs
                    });
                }

                // 各データタイプの同期をキューに追加
                var productJobId = _backgroundJobClient.Enqueue<ShopifyProductSyncJob>(
                    job => job.SyncProducts(storeId, options));
                
                var customerJobId = _backgroundJobClient.Enqueue<ShopifyCustomerSyncJob>(
                    job => job.SyncCustomers(storeId, options));
                
                var orderJobId = _backgroundJobClient.Enqueue<ShopifyOrderSyncJob>(
                    job => job.SyncOrders(storeId, options));

                _logger.LogInformation(
                    $"Full sync triggered for store {store.Name} (ID: {storeId})");

                return Ok(new 
                { 
                    message = "Full sync started",
                    jobs = new 
                    {
                        products = productJobId,
                        customers = customerJobId,
                        orders = orderJobId
                    },
                    storeId = storeId,
                    storeName = store.Name
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error triggering full sync for store {storeId}");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// 実行中の同期をキャンセル
        /// </summary>
        /// <param name="syncStateId">同期状態ID</param>
        [HttpPost("cancel/{syncStateId}")]
        public async Task<IActionResult> CancelSync(int syncStateId)
        {
            try
            {
                var syncState = await _context.SyncStates
                    .FirstOrDefaultAsync(s => s.SyncStateId == syncStateId);

                if (syncState == null)
                {
                    return NotFound(new { message = "Sync state not found" });
                }

                if (syncState.Status != "Running")
                {
                    return BadRequest(new { message = "Sync is not running" });
                }

                // 同期をキャンセル済みとして更新
                await _progressTracker.CompleteSyncAsync(
                    syncStateId, false, "Cancelled by user");

                _logger.LogInformation(
                    $"Sync cancelled: Type={syncState.SyncType}, StoreId={syncState.StoreId}");

                return Ok(new 
                { 
                    message = "Sync cancelled",
                    syncStateId = syncStateId,
                    syncType = syncState.SyncType
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error cancelling sync {syncStateId}");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// すべてのアクティブストアの定期同期スケジュールを再登録
        /// </summary>
        [HttpPost("reschedule-recurring-jobs")]
        public async Task<IActionResult> RescheduleRecurringJobs()
        {
            try
            {
                var activeStores = await _context.Stores
                    .Where(s => s.IsActive)
                    .ToListAsync();

                if (!activeStores.Any())
                {
                    return BadRequest(new { message = "No active stores found" });
                }

                var serviceProvider = HttpContext.RequestServices;
                
                // 各ジョブタイプの定期実行を再登録
                ShopifyProductSyncJob.RegisterRecurringJobs(serviceProvider);
                ShopifyCustomerSyncJob.RegisterRecurringJobs(serviceProvider);
                ShopifyOrderSyncJob.RegisterRecurringJobs(serviceProvider);

                _logger.LogInformation(
                    $"Recurring jobs rescheduled for {activeStores.Count} active stores");

                return Ok(new 
                { 
                    message = "Recurring jobs rescheduled",
                    storeCount = activeStores.Count,
                    stores = activeStores.Select(s => new { s.Id, s.Name })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rescheduling recurring jobs");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// ストアの同期スケジュールを有効化/無効化
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="enabled">有効/無効フラグ</param>
        [HttpPut("schedule/{storeId}")]
        public async Task<IActionResult> UpdateSyncSchedule(
            int storeId, 
            [FromBody] bool enabled)
        {
            try
            {
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Id == storeId);

                if (store == null)
                {
                    return NotFound(new { message = "Store not found" });
                }

                if (enabled)
                {
                    // 定期同期ジョブを登録
                    RecurringJob.AddOrUpdate<ShopifyProductSyncJob>(
                        $"sync-products-store-{storeId}",
                        job => job.SyncProducts(storeId, null),
                        "0 */1 * * *"); // 1時間ごと

                    RecurringJob.AddOrUpdate<ShopifyCustomerSyncJob>(
                        $"sync-customers-store-{storeId}",
                        job => job.SyncCustomers(storeId, null),
                        "0 */2 * * *"); // 2時間ごと

                    RecurringJob.AddOrUpdate<ShopifyOrderSyncJob>(
                        $"sync-orders-store-{storeId}",
                        job => job.SyncOrders(storeId, null),
                        "0 */3 * * *"); // 3時間ごと

                    _logger.LogInformation(
                        $"Sync schedule enabled for store {store.Name} (ID: {storeId})");
                }
                else
                {
                    // 定期同期ジョブを削除
                    RecurringJob.RemoveIfExists($"sync-products-store-{storeId}");
                    RecurringJob.RemoveIfExists($"sync-customers-store-{storeId}");
                    RecurringJob.RemoveIfExists($"sync-orders-store-{storeId}");

                    _logger.LogInformation(
                        $"Sync schedule disabled for store {store.Name} (ID: {storeId})");
                }

                return Ok(new 
                { 
                    message = enabled ? "Sync schedule enabled" : "Sync schedule disabled",
                    storeId = storeId,
                    storeName = store.Name,
                    enabled = enabled
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating sync schedule for store {storeId}");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }
    }
}