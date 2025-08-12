using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ShopifyAnalyticsApi.Services.Sync
{
    /// <summary>
    /// 同期チェックポイント管理サービス
    /// </summary>
    public class CheckpointManager : ICheckpointManager
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<CheckpointManager> _logger;
        private readonly TimeSpan _checkpointExpiration = TimeSpan.FromDays(7);

        public CheckpointManager(
            ShopifyDbContext context,
            ILogger<CheckpointManager> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// チェックポイントを保存
        /// </summary>
        public async Task SaveCheckpointAsync(
            int storeId,
            string dataType,
            string cursor,
            int recordsProcessed,
            DateRange dateRange)
        {
            try
            {
                var checkpoint = await _context.SyncCheckpoints
                    .FirstOrDefaultAsync(c => c.StoreId == storeId && c.DataType == dataType);

                if (checkpoint == null)
                {
                    checkpoint = new SyncCheckpoint
                    {
                        StoreId = storeId,
                        DataType = dataType,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.SyncCheckpoints.Add(checkpoint);
                }

                checkpoint.LastSuccessfulCursor = cursor;
                checkpoint.RecordsProcessedSoFar = recordsProcessed;
                checkpoint.LastProcessedDate = DateTime.UtcNow;
                checkpoint.SyncStartDate = dateRange.Start;
                checkpoint.SyncEndDate = dateRange.End;
                checkpoint.CanResume = true;
                checkpoint.ExpiresAt = DateTime.UtcNow.Add(_checkpointExpiration);
                checkpoint.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogDebug(
                    "チェックポイント保存: StoreId={StoreId}, DataType={DataType}, Records={Records}",
                    storeId, dataType, recordsProcessed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "チェックポイント保存エラー: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
                // チェックポイント保存の失敗は同期を停止させない
            }
        }

        /// <summary>
        /// 再開情報を取得
        /// </summary>
        public async Task<ResumeInfo?> GetResumeInfoAsync(int storeId, string dataType)
        {
            try
            {
                var checkpoint = await _context.SyncCheckpoints
                    .FirstOrDefaultAsync(c => 
                        c.StoreId == storeId && 
                        c.DataType == dataType &&
                        c.CanResume &&
                        c.ExpiresAt > DateTime.UtcNow);

                if (checkpoint == null)
                {
                    _logger.LogInformation(
                        "有効なチェックポイントなし: StoreId={StoreId}, DataType={DataType}",
                        storeId, dataType);
                    return null;
                }

                _logger.LogInformation(
                    "チェックポイントから再開: StoreId={StoreId}, DataType={DataType}, Records={Records}",
                    storeId, dataType, checkpoint.RecordsProcessedSoFar);

                return new ResumeInfo
                {
                    LastCursor = checkpoint.LastSuccessfulCursor,
                    RecordsAlreadyProcessed = checkpoint.RecordsProcessedSoFar,
                    LastProcessedDate = checkpoint.LastProcessedDate
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "チェックポイント取得エラー: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
                return null;
            }
        }

        /// <summary>
        /// チェックポイントをクリア
        /// </summary>
        public async Task ClearCheckpointAsync(int storeId, string dataType)
        {
            try
            {
                var checkpoints = await _context.SyncCheckpoints
                    .Where(c => c.StoreId == storeId && c.DataType == dataType)
                    .ToListAsync();

                if (checkpoints.Any())
                {
                    _context.SyncCheckpoints.RemoveRange(checkpoints);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "チェックポイントクリア: StoreId={StoreId}, DataType={DataType}",
                        storeId, dataType);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "チェックポイントクリアエラー: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
            }
        }

        /// <summary>
        /// 期限切れチェックポイントをクリーンアップ
        /// </summary>
        public async Task CleanupExpiredCheckpointsAsync()
        {
            try
            {
                var expiredCheckpoints = await _context.SyncCheckpoints
                    .Where(c => c.ExpiresAt <= DateTime.UtcNow)
                    .ToListAsync();

                if (expiredCheckpoints.Any())
                {
                    _context.SyncCheckpoints.RemoveRange(expiredCheckpoints);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "期限切れチェックポイントを削除: Count={Count}",
                        expiredCheckpoints.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "期限切れチェックポイントのクリーンアップエラー");
            }
        }

        /// <summary>
        /// チェックポイントの存在確認
        /// </summary>
        public async Task<bool> HasValidCheckpointAsync(int storeId, string dataType)
        {
            return await _context.SyncCheckpoints
                .AnyAsync(c => 
                    c.StoreId == storeId && 
                    c.DataType == dataType &&
                    c.CanResume &&
                    c.ExpiresAt > DateTime.UtcNow);
        }

        /// <summary>
        /// チェックポイントを無効化
        /// </summary>
        public async Task InvalidateCheckpointAsync(int storeId, string dataType)
        {
            try
            {
                var checkpoint = await _context.SyncCheckpoints
                    .FirstOrDefaultAsync(c => c.StoreId == storeId && c.DataType == dataType);

                if (checkpoint != null)
                {
                    checkpoint.CanResume = false;
                    checkpoint.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation(
                        "チェックポイント無効化: StoreId={StoreId}, DataType={DataType}",
                        storeId, dataType);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "チェックポイント無効化エラー: StoreId={StoreId}, DataType={DataType}",
                    storeId, dataType);
            }
        }
    }

    /// <summary>
    /// チェックポイント管理インターフェース
    /// </summary>
    public interface ICheckpointManager
    {
        Task SaveCheckpointAsync(int storeId, string dataType, string cursor, int recordsProcessed, DateRange dateRange);
        Task<ResumeInfo?> GetResumeInfoAsync(int storeId, string dataType);
        Task ClearCheckpointAsync(int storeId, string dataType);
        Task CleanupExpiredCheckpointsAsync();
        Task<bool> HasValidCheckpointAsync(int storeId, string dataType);
        Task InvalidateCheckpointAsync(int storeId, string dataType);
    }
}