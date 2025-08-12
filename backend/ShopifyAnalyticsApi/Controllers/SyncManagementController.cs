using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Sync;
using Hangfire;
using ShopifyAnalyticsApi.Jobs;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 同期管理APIコントローラー
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SyncManagementController : ControllerBase
    {
        private readonly ISyncRangeManager _syncRangeManager;
        private readonly ICheckpointManager _checkpointManager;
        private readonly ISyncProgressTracker _progressTracker;
        private readonly ILogger<SyncManagementController> _logger;

        public SyncManagementController(
            ISyncRangeManager syncRangeManager,
            ICheckpointManager checkpointManager,
            ISyncProgressTracker progressTracker,
            ILogger<SyncManagementController> logger)
        {
            _syncRangeManager = syncRangeManager;
            _checkpointManager = checkpointManager;
            _progressTracker = progressTracker;
            _logger = logger;
        }

        /// <summary>
        /// 同期を開始（範囲指定オプション付き）
        /// </summary>
        [HttpPost("start-sync")]
        public async Task<IActionResult> StartSync(
            [FromBody] StartSyncRequest request)
        {
            try
            {
                _logger.LogInformation(
                    "同期開始リクエスト: StoreId={StoreId}, DataType={DataType}",
                    request.StoreId, request.DataType);

                // 同期オプションを設定
                var options = new InitialSyncOptions
                {
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    MaxYearsBack = request.MaxYearsBack ?? 2,
                    IncludeArchived = request.IncludeArchived ?? false
                };

                // ジョブをエンキュー
                string jobId;
                switch (request.DataType.ToLower())
                {
                    case "products":
                        jobId = BackgroundJob.Enqueue<ShopifyProductSyncJob>(
                            job => job.SyncProducts(request.StoreId, options));
                        break;
                    // TODO: 他のデータタイプのジョブを追加
                    default:
                        return BadRequest($"Unsupported data type: {request.DataType}");
                }

                return Ok(new
                {
                    message = "同期ジョブがキューに追加されました",
                    jobId,
                    storeId = request.StoreId,
                    dataType = request.DataType,
                    dateRange = new
                    {
                        start = options.StartDate,
                        end = options.EndDate
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "同期開始エラー");
                return StatusCode(500, new { error = "同期の開始に失敗しました" });
            }
        }

        /// <summary>
        /// 同期進捗を取得
        /// </summary>
        [HttpGet("progress/{storeId}/{dataType}")]
        public async Task<IActionResult> GetSyncProgress(
            int storeId,
            string dataType)
        {
            try
            {
                var currentSync = await _progressTracker.GetCurrentSyncStateAsync(
                    storeId, dataType);

                if (currentSync == null)
                {
                    return Ok(new
                    {
                        storeId,
                        dataType,
                        status = "NoActiveSync",
                        message = "アクティブな同期はありません"
                    });
                }

                // 推定残り時間を計算
                var estimatedTime = _progressTracker.EstimateRemainingTime(
                    currentSync.SyncStateId);

                return Ok(new
                {
                    syncId = currentSync.SyncStateId,
                    storeId,
                    dataType,
                    status = currentSync.Status,
                    startedAt = currentSync.StartedAt,
                    progressPercentage = currentSync.ProgressPercentage,
                    processedRecords = currentSync.ProcessedRecords,
                    totalRecords = currentSync.TotalRecords,
                    failedRecords = currentSync.FailedRecords,
                    estimatedRemainingTime = estimatedTime?.ToString(@"hh\:mm\:ss"),
                    dateRange = new
                    {
                        start = currentSync.DateRangeStart,
                        end = currentSync.DateRangeEnd
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "進捗取得エラー");
                return StatusCode(500, new { error = "進捗の取得に失敗しました" });
            }
        }

        /// <summary>
        /// 詳細な進捗情報を取得
        /// </summary>
        [HttpGet("progress-details/{syncStateId}")]
        public async Task<IActionResult> GetProgressDetails(int syncStateId)
        {
            try
            {
                var details = await _progressTracker.GetProgressDetailsAsync(syncStateId);

                return Ok(new
                {
                    syncStateId,
                    totalBatches = details.Count,
                    details = details.Select(d => new
                    {
                        batchId = d.BatchIdentifier,
                        recordsInBatch = d.RecordsInBatch,
                        processedAt = d.ProcessedAt,
                        status = d.Status,
                        errorMessage = d.ErrorMessage
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "詳細進捗取得エラー");
                return StatusCode(500, new { error = "詳細進捗の取得に失敗しました" });
            }
        }

        /// <summary>
        /// チェックポイント状態を確認
        /// </summary>
        [HttpGet("checkpoint/{storeId}/{dataType}")]
        public async Task<IActionResult> GetCheckpointStatus(
            int storeId,
            string dataType)
        {
            try
            {
                var hasCheckpoint = await _checkpointManager.HasValidCheckpointAsync(
                    storeId, dataType);

                if (!hasCheckpoint)
                {
                    return Ok(new
                    {
                        storeId,
                        dataType,
                        hasCheckpoint = false,
                        message = "有効なチェックポイントはありません"
                    });
                }

                var resumeInfo = await _checkpointManager.GetResumeInfoAsync(
                    storeId, dataType);

                return Ok(new
                {
                    storeId,
                    dataType,
                    hasCheckpoint = true,
                    resumeInfo = new
                    {
                        lastCursor = resumeInfo?.LastCursor,
                        recordsAlreadyProcessed = resumeInfo?.RecordsAlreadyProcessed,
                        lastProcessedDate = resumeInfo?.LastProcessedDate
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "チェックポイント状態取得エラー");
                return StatusCode(500, new { error = "チェックポイント状態の取得に失敗しました" });
            }
        }

        /// <summary>
        /// チェックポイントをクリア
        /// </summary>
        [HttpDelete("checkpoint/{storeId}/{dataType}")]
        public async Task<IActionResult> ClearCheckpoint(
            int storeId,
            string dataType)
        {
            try
            {
                await _checkpointManager.ClearCheckpointAsync(storeId, dataType);

                return Ok(new
                {
                    message = "チェックポイントをクリアしました",
                    storeId,
                    dataType
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "チェックポイントクリアエラー");
                return StatusCode(500, new { error = "チェックポイントのクリアに失敗しました" });
            }
        }

        /// <summary>
        /// 同期範囲設定を取得
        /// </summary>
        [HttpGet("range-setting/{storeId}/{dataType}")]
        public async Task<IActionResult> GetSyncRangeSetting(
            int storeId,
            string dataType)
        {
            try
            {
                var setting = await _syncRangeManager.GetSyncRangeSettingAsync(
                    storeId, dataType);

                if (setting == null)
                {
                    var recommendedRange = _syncRangeManager.GetRecommendedRange(dataType);
                    return Ok(new
                    {
                        storeId,
                        dataType,
                        hasSettings = false,
                        recommendedRange = new
                        {
                            start = recommendedRange.Start,
                            end = recommendedRange.End
                        }
                    });
                }

                return Ok(new
                {
                    storeId,
                    dataType,
                    hasSettings = true,
                    settings = new
                    {
                        startDate = setting.StartDate,
                        endDate = setting.EndDate,
                        yearsBack = setting.YearsBack,
                        includeArchived = setting.IncludeArchived,
                        isActive = setting.IsActive,
                        createdAt = setting.CreatedAt,
                        updatedAt = setting.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "同期範囲設定取得エラー");
                return StatusCode(500, new { error = "同期範囲設定の取得に失敗しました" });
            }
        }

        /// <summary>
        /// 同期範囲を更新
        /// </summary>
        [HttpPut("range-setting/{storeId}/{dataType}")]
        public async Task<IActionResult> UpdateSyncRange(
            int storeId,
            string dataType,
            [FromBody] UpdateSyncRangeRequest request)
        {
            try
            {
                await _syncRangeManager.UpdateSyncRangeAsync(
                    storeId, dataType, request.StartDate, request.EndDate);

                return Ok(new
                {
                    message = "同期範囲を更新しました",
                    storeId,
                    dataType,
                    newRange = new
                    {
                        start = request.StartDate,
                        end = request.EndDate
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "同期範囲更新エラー");
                return StatusCode(500, new { error = "同期範囲の更新に失敗しました" });
            }
        }

        /// <summary>
        /// 同期履歴を取得
        /// </summary>
        [HttpGet("history/{storeId}")]
        public async Task<IActionResult> GetSyncHistory(
            int storeId,
            [FromQuery] string? dataType = null,
            [FromQuery] int limit = 50)
        {
            try
            {
                var history = await _progressTracker.GetSyncHistoryAsync(
                    storeId, dataType, limit);

                return Ok(new
                {
                    storeId,
                    dataType,
                    totalCount = history.Count,
                    history = history.Select(h => new
                    {
                        syncType = h.SyncType,
                        startedAt = h.StartedAt,
                        completedAt = h.CompletedAt,
                        duration = (h.CompletedAt - h.StartedAt).ToString(@"hh\:mm\:ss"),
                        processedRecords = h.ProcessedRecords,
                        failedRecords = h.FailedRecords,
                        success = h.Success,
                        errorMessage = h.ErrorMessage,
                        dateRange = new
                        {
                            start = h.DateRangeStart,
                            end = h.DateRangeEnd
                        }
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "同期履歴取得エラー");
                return StatusCode(500, new { error = "同期履歴の取得に失敗しました" });
            }
        }

        /// <summary>
        /// 同期統計を取得
        /// </summary>
        [HttpGet("statistics/{storeId}")]
        public async Task<IActionResult> GetSyncStatistics(
            int storeId,
            [FromQuery] int? days = 30)
        {
            try
            {
                var since = DateTime.UtcNow.AddDays(-(days ?? 30));
                var stats = await _progressTracker.GetSyncStatisticsAsync(storeId, since);

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "同期統計取得エラー");
                return StatusCode(500, new { error = "同期統計の取得に失敗しました" });
            }
        }
    }

    /// <summary>
    /// 同期開始リクエスト
    /// </summary>
    public class StartSyncRequest
    {
        public int StoreId { get; set; }
        public string DataType { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? MaxYearsBack { get; set; }
        public bool? IncludeArchived { get; set; }
    }

    /// <summary>
    /// 同期範囲更新リクエスト
    /// </summary>
    public class UpdateSyncRangeRequest
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}