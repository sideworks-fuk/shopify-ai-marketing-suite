using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ShopifyAnalyticsApi.Services.Sync
{
    /// <summary>
    /// 同期進捗追跡サービス
    /// </summary>
    public class SyncProgressTracker : ISyncProgressTracker
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<SyncProgressTracker> _logger;
        private readonly Dictionary<string, SyncState> _activeSyncs = new();
        private readonly object _lockObject = new();

        public SyncProgressTracker(
            ShopifyDbContext context,
            ILogger<SyncProgressTracker> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 同期を開始
        /// </summary>
        public async Task<int> StartSyncAsync(
            int storeId,
            string syncType,
            DateRange dateRange,
            int totalRecords = 0)
        {
            try
            {
                var syncState = new SyncState
                {
                    StoreId = storeId,
                    SyncType = syncType,
                    Status = "InProgress",
                    StartedAt = DateTime.UtcNow,
                    TotalRecords = totalRecords,
                    ProcessedRecords = 0,
                    FailedRecords = 0,
                    LastActivityAt = DateTime.UtcNow,
                    DateRangeStart = dateRange.Start,
                    DateRangeEnd = dateRange.End
                };

                _context.SyncStates.Add(syncState);
                await _context.SaveChangesAsync();

                lock (_lockObject)
                {
                    _activeSyncs[$"{storeId}-{syncType}"] = syncState;
                }

                _logger.LogInformation(
                    "同期開始: StoreId={StoreId}, Type={SyncType}, SyncId={SyncId}",
                    storeId, syncType, syncState.SyncStateId);

                return syncState.SyncStateId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "同期開始エラー: StoreId={StoreId}, Type={SyncType}",
                    storeId, syncType);
                throw;
            }
        }

        /// <summary>
        /// 進捗を更新
        /// </summary>
        public async Task UpdateProgressAsync(
            int syncStateId,
            int processedCount,
            int? failedCount = null,
            string? currentBatch = null)
        {
            try
            {
                var syncState = await _context.SyncStates
                    .FirstOrDefaultAsync(s => s.SyncStateId == syncStateId);

                if (syncState == null)
                {
                    _logger.LogWarning("同期状態が見つかりません: SyncId={SyncId}", syncStateId);
                    return;
                }

                syncState.ProcessedRecords = processedCount;
                if (failedCount.HasValue)
                    syncState.FailedRecords = failedCount.Value;

                syncState.LastActivityAt = DateTime.UtcNow;

                // 進捗率を計算
                if (syncState.TotalRecords > 0)
                {
                    syncState.ProgressPercentage = 
                        (decimal)syncState.ProcessedRecords / syncState.TotalRecords * 100;
                }

                // 詳細な進捗情報を記録
                if (!string.IsNullOrEmpty(currentBatch))
                {
                    var progressDetail = new SyncProgressDetail
                    {
                        SyncStateId = syncStateId,
                        BatchIdentifier = currentBatch,
                        RecordsInBatch = processedCount,
                        ProcessedAt = DateTime.UtcNow,
                        Status = "Processing"
                    };
                    _context.SyncProgressDetails.Add(progressDetail);
                }

                await _context.SaveChangesAsync();

                _logger.LogDebug(
                    "進捗更新: SyncId={SyncId}, Processed={Processed}, Failed={Failed}",
                    syncStateId, processedCount, failedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "進捗更新エラー: SyncId={SyncId}", syncStateId);
            }
        }

        /// <summary>
        /// 同期を完了
        /// </summary>
        public async Task CompleteSyncAsync(
            int syncStateId,
            bool success,
            string? errorMessage = null)
        {
            try
            {
                var syncState = await _context.SyncStates
                    .FirstOrDefaultAsync(s => s.SyncStateId == syncStateId);

                if (syncState == null)
                {
                    _logger.LogWarning("同期状態が見つかりません: SyncId={SyncId}", syncStateId);
                    return;
                }

                syncState.Status = success ? "Completed" : "Failed";
                syncState.CompletedAt = DateTime.UtcNow;
                syncState.ErrorMessage = errorMessage;

                if (success)
                {
                    syncState.ProgressPercentage = 100;
                }

                // 同期履歴に記録
                var history = new SyncHistory
                {
                    StoreId = syncState.StoreId,
                    SyncType = syncState.SyncType,
                    StartedAt = syncState.StartedAt,
                    CompletedAt = syncState.CompletedAt.Value,
                    TotalRecords = syncState.TotalRecords,
                    ProcessedRecords = syncState.ProcessedRecords,
                    FailedRecords = syncState.FailedRecords,
                    Success = success,
                    ErrorMessage = errorMessage,
                    DateRangeStart = syncState.DateRangeStart,
                    DateRangeEnd = syncState.DateRangeEnd
                };
                _context.SyncHistories.Add(history);

                await _context.SaveChangesAsync();

                lock (_lockObject)
                {
                    _activeSyncs.Remove($"{syncState.StoreId}-{syncState.SyncType}");
                }

                _logger.LogInformation(
                    "同期完了: SyncId={SyncId}, Success={Success}, Processed={Processed}",
                    syncStateId, success, syncState.ProcessedRecords);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "同期完了処理エラー: SyncId={SyncId}", syncStateId);
                throw;
            }
        }

        /// <summary>
        /// 現在の同期状態を取得
        /// </summary>
        public async Task<SyncState?> GetCurrentSyncStateAsync(int storeId, string syncType)
        {
            return await _context.SyncStates
                .Where(s => s.StoreId == storeId && 
                           s.SyncType == syncType && 
                           s.Status == "InProgress")
                .OrderByDescending(s => s.StartedAt)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// アクティブな同期をすべて取得
        /// </summary>
        public async Task<List<SyncState>> GetActiveSyncsAsync(int? storeId = null)
        {
            var query = _context.SyncStates
                .Where(s => s.Status == "InProgress");

            if (storeId.HasValue)
            {
                query = query.Where(s => s.StoreId == storeId.Value);
            }

            return await query
                .OrderBy(s => s.StartedAt)
                .ToListAsync();
        }

        /// <summary>
        /// 同期履歴を取得
        /// </summary>
        public async Task<List<SyncHistory>> GetSyncHistoryAsync(
            int storeId,
            string? syncType = null,
            int limit = 100)
        {
            var query = _context.SyncHistories
                .Where(h => h.StoreId == storeId);

            if (!string.IsNullOrEmpty(syncType))
            {
                query = query.Where(h => h.SyncType == syncType);
            }

            return await query
                .OrderByDescending(h => h.StartedAt)
                .Take(limit)
                .ToListAsync();
        }

        /// <summary>
        /// 同期の詳細進捗を取得
        /// </summary>
        public async Task<List<SyncProgressDetail>> GetProgressDetailsAsync(int syncStateId)
        {
            return await _context.SyncProgressDetails
                .Where(p => p.SyncStateId == syncStateId)
                .OrderBy(p => p.ProcessedAt)
                .ToListAsync();
        }

        /// <summary>
        /// タイムアウトした同期をクリーンアップ
        /// </summary>
        public async Task CleanupTimedOutSyncsAsync(TimeSpan timeout)
        {
            try
            {
                var cutoffTime = DateTime.UtcNow.Subtract(timeout);
                
                var timedOutSyncs = await _context.SyncStates
                    .Where(s => s.Status == "InProgress" && 
                               s.LastActivityAt < cutoffTime)
                    .ToListAsync();

                foreach (var sync in timedOutSyncs)
                {
                    sync.Status = "TimedOut";
                    sync.CompletedAt = DateTime.UtcNow;
                    sync.ErrorMessage = $"同期がタイムアウトしました (最終活動: {sync.LastActivityAt:yyyy-MM-dd HH:mm:ss} UTC)";

                    _logger.LogWarning(
                        "同期タイムアウト: SyncId={SyncId}, StoreId={StoreId}, Type={SyncType}",
                        sync.SyncStateId, sync.StoreId, sync.SyncType);
                }

                if (timedOutSyncs.Any())
                {
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "タイムアウト同期のクリーンアップエラー");
            }
        }

        /// <summary>
        /// 推定残り時間を計算
        /// </summary>
        public TimeSpan? EstimateRemainingTime(int syncStateId)
        {
            var syncState = _context.SyncStates
                .FirstOrDefault(s => s.SyncStateId == syncStateId);

            if (syncState == null || syncState.ProcessedRecords == 0)
                return null;

            var elapsedTime = DateTime.UtcNow - syncState.StartedAt;
            var averageTimePerRecord = elapsedTime.TotalSeconds / syncState.ProcessedRecords;
            var remainingRecords = syncState.TotalRecords - syncState.ProcessedRecords;
            
            if (remainingRecords <= 0)
                return TimeSpan.Zero;

            var estimatedSeconds = averageTimePerRecord * remainingRecords;
            return TimeSpan.FromSeconds(estimatedSeconds);
        }

        /// <summary>
        /// 同期統計を取得
        /// </summary>
        public async Task<SyncStatistics> GetSyncStatisticsAsync(int storeId, DateTime? since = null)
        {
            var sinceDate = since ?? DateTime.UtcNow.AddDays(-30);

            var histories = await _context.SyncHistories
                .Where(h => h.StoreId == storeId && h.StartedAt >= sinceDate)
                .ToListAsync();

            var statistics = new SyncStatistics
            {
                StoreId = storeId,
                PeriodStart = sinceDate,
                PeriodEnd = DateTime.UtcNow,
                TotalSyncs = histories.Count,
                SuccessfulSyncs = histories.Count(h => h.Success),
                FailedSyncs = histories.Count(h => !h.Success),
                TotalRecordsProcessed = histories.Sum(h => h.ProcessedRecords),
                TotalFailedRecords = histories.Sum(h => h.FailedRecords)
            };

            if (histories.Any())
            {
                var avgSeconds = histories
                    .Where(h => h.CompletedAt > h.StartedAt)
                    .Select(h => (h.CompletedAt - h.StartedAt).TotalSeconds)
                    .DefaultIfEmpty(0)
                    .Average();
                statistics.AverageProcessingTime = TimeSpan.FromSeconds(avgSeconds);
                statistics.SuccessRate = (decimal)statistics.SuccessfulSyncs / statistics.TotalSyncs * 100;
            }

            return statistics;
        }
    }

    /// <summary>
    /// 同期進捗追跡インターフェース
    /// </summary>
    public interface ISyncProgressTracker
    {
        Task<int> StartSyncAsync(int storeId, string syncType, DateRange dateRange, int totalRecords = 0);
        Task UpdateProgressAsync(int syncStateId, int processedCount, int? failedCount = null, string? currentBatch = null);
        Task CompleteSyncAsync(int syncStateId, bool success, string? errorMessage = null);
        Task<SyncState?> GetCurrentSyncStateAsync(int storeId, string syncType);
        Task<List<SyncState>> GetActiveSyncsAsync(int? storeId = null);
        Task<List<SyncHistory>> GetSyncHistoryAsync(int storeId, string? syncType = null, int limit = 100);
        Task<List<SyncProgressDetail>> GetProgressDetailsAsync(int syncStateId);
        Task CleanupTimedOutSyncsAsync(TimeSpan timeout);
        TimeSpan? EstimateRemainingTime(int syncStateId);
        Task<SyncStatistics> GetSyncStatisticsAsync(int storeId, DateTime? since = null);
    }

    /// <summary>
    /// 同期統計情報
    /// </summary>
    public class SyncStatistics
    {
        public int StoreId { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public int TotalSyncs { get; set; }
        public int SuccessfulSyncs { get; set; }
        public int FailedSyncs { get; set; }
        public int TotalRecordsProcessed { get; set; }
        public int TotalFailedRecords { get; set; }
        public TimeSpan AverageProcessingTime { get; set; }
        public decimal SuccessRate { get; set; }
    }
}