using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using System.ComponentModel.DataAnnotations;

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
        private readonly ILogger<SyncController> _logger;

        public SyncController(
            ShopifyDbContext context,
            IStoreService storeService,
            ShopifyDataSyncService syncService,
            ILogger<SyncController> logger)
        {
            _context = context;
            _storeService = storeService;
            _syncService = syncService;
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

                // バックグラウンドで同期を開始
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _syncService.StartInitialSync(currentStore.Id, syncStatus.Id, request.SyncPeriod);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error in background sync for store {StoreId}", currentStore.Id);
                    }
                });

                _logger.LogInformation("Initial sync started for store: {StoreName} (ID: {StoreId}), period: {SyncPeriod}", 
                    currentStore.Name, currentStore.Id, request.SyncPeriod);

                return Ok(new
                {
                    syncId = syncStatus.Id,
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
}