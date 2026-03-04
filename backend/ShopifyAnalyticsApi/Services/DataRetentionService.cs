using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;

namespace ShopifyAnalyticsApi.Services
{
    public interface IDataRetentionService
    {
        Task<DataRetentionPreviewResult> PreviewAsync(int? storeId = null);
        Task<DataRetentionExecutionResult> ExecuteAsync(int? storeId = null);
    }

    #region DTOs

    public class DataRetentionSettings
    {
        public int TransactionDataRetentionDays { get; set; } = 730;
        public int LogDataRetentionDays { get; set; } = 90;
        public int GDPRDataRetentionDays { get; set; } = 2555;
        public int UninstalledGracePeriodHours { get; set; } = 48;
        public int BatchSize { get; set; } = 1000;
    }

    public class DataRetentionPreviewResult
    {
        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
        public bool IsDryRun { get; set; } = true;
        public DataRetentionSettings Settings { get; set; } = new();
        public List<UninstalledStorePreview> UninstalledStores { get; set; } = new();
        public List<CategoryPreview> Categories { get; set; } = new();
        public int TotalRecordsToDelete { get; set; }
        public int? StoreId { get; set; }
    }

    public class UninstalledStorePreview
    {
        public int StoreId { get; set; }
        public string? Domain { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CategoryPreview
    {
        public string Category { get; set; } = string.Empty;
        public int RetentionDays { get; set; }
        public DateTime CutoffDate { get; set; }
        public List<TablePreview> Tables { get; set; } = new();
    }

    public class TablePreview
    {
        public string TableName { get; set; } = string.Empty;
        public int RecordCount { get; set; }
    }

    public class DataRetentionExecutionResult
    {
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        public bool IsDryRun { get; set; } = false;
        public DataRetentionSettings Settings { get; set; } = new();
        public List<UninstalledStoreCleanupResult> UninstalledStoreResults { get; set; } = new();
        public List<TableDeletionResult> Results { get; set; } = new();
        public int TotalDeleted { get; set; }
        public int? StoreId { get; set; }
        public List<string> Errors { get; set; } = new();
        public bool Success => Errors.Count == 0;
    }

    public class UninstalledStoreCleanupResult
    {
        public int StoreId { get; set; }
        public string? Domain { get; set; }
        public bool Success { get; set; }
        public string? Error { get; set; }
    }

    public class TableDeletionResult
    {
        public string TableName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int DeletedCount { get; set; }
        public int BatchesProcessed { get; set; }
        public TimeSpan Duration { get; set; }
        public string? Error { get; set; }
    }

    #endregion

    public class DataRetentionService : IDataRetentionService
    {
        private readonly ShopifyDbContext _context;
        private readonly IDataCleanupService _dataCleanupService;
        private readonly ILogger<DataRetentionService> _logger;
        private readonly DataRetentionSettings _settings;

        public DataRetentionService(
            ShopifyDbContext context,
            IDataCleanupService dataCleanupService,
            ILogger<DataRetentionService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _dataCleanupService = dataCleanupService;
            _logger = logger;
            _settings = new DataRetentionSettings();
            configuration.GetSection("DataRetention").Bind(_settings);
        }

        public async Task<DataRetentionPreviewResult> PreviewAsync(int? storeId = null)
        {
            _logger.LogInformation("データ保持期間プレビュー開始. StoreId: {StoreId}", storeId);

            var now = DateTime.UtcNow;
            var result = new DataRetentionPreviewResult
            {
                StoreId = storeId,
                Settings = _settings
            };

            // --- シナリオA: アンインストール済みストア ---
            var gracePeriodCutoff = now.AddHours(-_settings.UninstalledGracePeriodHours);
            var uninstalledStores = await _context.Stores
                .Where(s => !s.IsActive && s.UpdatedAt < gracePeriodCutoff)
                .Select(s => new UninstalledStorePreview
                {
                    StoreId = s.Id,
                    Domain = s.Domain,
                    UpdatedAt = s.UpdatedAt
                })
                .ToListAsync();
            result.UninstalledStores = uninstalledStores;

            // --- シナリオB: 保持期間超過データ ---
            // アクティブストアのみ対象
            var activeStoreQuery = _context.Stores.Where(s => s.IsActive).Select(s => s.Id);

            // 1. トランザクションデータ (2年)
            var txCutoff = now.AddDays(-_settings.TransactionDataRetentionDays);
            var txCategory = new CategoryPreview
            {
                Category = "transaction",
                RetentionDays = _settings.TransactionDataRetentionDays,
                CutoffDate = txCutoff,
                Tables = new List<TablePreview>()
            };

            var orderQuery = _context.Orders.Where(o => activeStoreQuery.Contains(o.StoreId));
            if (storeId.HasValue) orderQuery = _context.Orders.Where(o => o.StoreId == storeId.Value);

            var oldOrderIds = orderQuery
                .Where(o => (o.ShopifyCreatedAt ?? o.CreatedAt) < txCutoff)
                .Select(o => o.Id);
            var orderCount = await oldOrderIds.CountAsync();
            var orderItemCount = await _context.OrderItems
                .Where(oi => oldOrderIds.Contains(oi.OrderId))
                .CountAsync();

            var customerQuery = _context.Customers.Where(c => activeStoreQuery.Contains(c.StoreId));
            if (storeId.HasValue) customerQuery = _context.Customers.Where(c => c.StoreId == storeId.Value);
            var customerCount = await customerQuery
                .Where(c =>
                    (c.LastOrderDate != null && c.LastOrderDate < txCutoff) ||
                    (c.LastOrderDate == null && c.CreatedAt < txCutoff))
                .CountAsync();

            txCategory.Tables.Add(new TablePreview { TableName = "OrderItems", RecordCount = orderItemCount });
            txCategory.Tables.Add(new TablePreview { TableName = "Orders", RecordCount = orderCount });
            txCategory.Tables.Add(new TablePreview { TableName = "Customers", RecordCount = customerCount });
            result.Categories.Add(txCategory);

            // 2. ログ系データ (90日)
            var logCutoff = now.AddDays(-_settings.LogDataRetentionDays);
            var logCategory = new CategoryPreview
            {
                Category = "log",
                RetentionDays = _settings.LogDataRetentionDays,
                CutoffDate = logCutoff,
                Tables = new List<TablePreview>()
            };

            logCategory.Tables.Add(new TablePreview
            {
                TableName = "AuthenticationLogs",
                RecordCount = await _context.AuthenticationLogs.CountAsync(a => a.CreatedAt < logCutoff)
            });
            logCategory.Tables.Add(new TablePreview
            {
                TableName = "WebhookEvents",
                RecordCount = await _context.WebhookEvents.CountAsync(w => w.CreatedAt < logCutoff)
            });
            logCategory.Tables.Add(new TablePreview
            {
                TableName = "SyncHistories",
                RecordCount = await _context.SyncHistories.CountAsync(s => s.CreatedAt < logCutoff)
            });

            var oldSyncStateIds = _context.SyncStates.Where(s => s.CreatedAt < logCutoff).Select(s => s.SyncStateId);
            logCategory.Tables.Add(new TablePreview
            {
                TableName = "SyncProgressDetails",
                RecordCount = await _context.SyncProgressDetails.CountAsync(sp => oldSyncStateIds.Contains(sp.SyncStateId))
            });
            logCategory.Tables.Add(new TablePreview
            {
                TableName = "SyncStates",
                RecordCount = await _context.SyncStates.CountAsync(s => s.CreatedAt < logCutoff)
            });
            logCategory.Tables.Add(new TablePreview
            {
                TableName = "SyncCheckpoints",
                RecordCount = await _context.SyncCheckpoints.CountAsync(s => s.CreatedAt < logCutoff)
            });
            result.Categories.Add(logCategory);

            // 3. GDPRデータ (7年)
            var gdprCutoff = now.AddDays(-_settings.GDPRDataRetentionDays);
            var gdprCategory = new CategoryPreview
            {
                Category = "gdpr",
                RetentionDays = _settings.GDPRDataRetentionDays,
                CutoffDate = gdprCutoff,
                Tables = new List<TablePreview>()
            };
            gdprCategory.Tables.Add(new TablePreview
            {
                TableName = "GDPRRequests",
                RecordCount = await _context.GDPRRequests.CountAsync(g => g.CreatedAt < gdprCutoff && g.Status == "completed")
            });
            var oldGdprRequestIds = _context.GDPRRequests
                .Where(g => g.CreatedAt < gdprCutoff && g.Status == "completed")
                .Select(g => g.Id);
            gdprCategory.Tables.Add(new TablePreview
            {
                TableName = "GDPRDeletionLogs",
                RecordCount = await _context.GDPRDeletionLogs.CountAsync(d => oldGdprRequestIds.Contains(d.GDPRRequestId))
            });
            result.Categories.Add(gdprCategory);

            result.TotalRecordsToDelete = result.Categories.Sum(c => c.Tables.Sum(t => t.RecordCount));

            _logger.LogInformation(
                "データ保持期間プレビュー完了. アンインストール済みストア: {UninstalledCount}, 保持期間超過: {ExpiredCount}",
                uninstalledStores.Count, result.TotalRecordsToDelete);

            return result;
        }

        public async Task<DataRetentionExecutionResult> ExecuteAsync(int? storeId = null)
        {
            var result = new DataRetentionExecutionResult
            {
                StartedAt = DateTime.UtcNow,
                StoreId = storeId,
                Settings = _settings
            };

            _logger.LogInformation("データ保持期間削除開始. StoreId: {StoreId}", storeId);

            // --- シナリオA: アンインストール済みストアのデータ削除 ---
            if (!storeId.HasValue)
            {
                await CleanupUninstalledStoresAsync(result);
            }

            // --- シナリオB: 保持期間超過データの削除 ---
            await CleanupExpiredDataAsync(result, storeId);

            result.CompletedAt = DateTime.UtcNow;
            result.TotalDeleted = result.Results.Sum(r => r.DeletedCount);

            _logger.LogInformation(
                "データ保持期間削除完了. 合計削除: {TotalDeleted}, 所要時間: {Duration}",
                result.TotalDeleted, result.CompletedAt - result.StartedAt);

            return result;
        }

        private async Task CleanupUninstalledStoresAsync(DataRetentionExecutionResult result)
        {
            var now = DateTime.UtcNow;
            var gracePeriodCutoff = now.AddHours(-_settings.UninstalledGracePeriodHours);

            var uninstalledStores = await _context.Stores
                .Where(s => !s.IsActive && s.UpdatedAt < gracePeriodCutoff)
                .ToListAsync();

            if (!uninstalledStores.Any())
            {
                _logger.LogInformation("アンインストール済みストアのクリーンアップ対象なし");
                return;
            }

            _logger.LogInformation("アンインストール済みストア {Count} 件のクリーンアップ開始", uninstalledStores.Count);

            foreach (var store in uninstalledStores)
            {
                var storeResult = new UninstalledStoreCleanupResult
                {
                    StoreId = store.Id,
                    Domain = store.Domain
                };

                try
                {
                    if (!string.IsNullOrEmpty(store.Domain))
                    {
                        await _dataCleanupService.DeleteStoreDataAsync(store.Domain);
                        storeResult.Success = true;
                        _logger.LogInformation("ストア {Domain} のデータ削除完了", store.Domain);
                    }
                    else
                    {
                        storeResult.Error = "Domain is null or empty";
                        result.Errors.Add($"Store {store.Id}: Domain is null or empty");
                    }
                }
                catch (Exception ex)
                {
                    storeResult.Error = ex.Message;
                    result.Errors.Add($"Store {store.Domain}: {ex.Message}");
                    _logger.LogError(ex, "ストア {Domain} のデータ削除中にエラー発生", store.Domain);
                }

                result.UninstalledStoreResults.Add(storeResult);
            }
        }

        private async Task CleanupExpiredDataAsync(DataRetentionExecutionResult result, int? storeId)
        {
            var now = DateTime.UtcNow;
            var activeStoreIds = await _context.Stores
                .Where(s => s.IsActive)
                .Select(s => s.Id)
                .ToListAsync();

            // --- ログ系データ削除 (90日) ---
            var logCutoff = now.AddDays(-_settings.LogDataRetentionDays);

            await DeleteInBatchesAsync("AuthenticationLogs", "log", result,
                () => _context.AuthenticationLogs
                    .Where(a => a.CreatedAt < logCutoff)
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            await DeleteInBatchesAsync("WebhookEvents", "log", result,
                () => _context.WebhookEvents
                    .Where(w => w.CreatedAt < logCutoff)
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            await DeleteInBatchesAsync("SyncHistories", "log", result,
                () => _context.SyncHistories
                    .Where(s => s.CreatedAt < logCutoff)
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            // SyncProgressDetails → SyncStates (FK順序)
            var oldSyncStateIds = _context.SyncStates
                .Where(s => s.CreatedAt < logCutoff)
                .Select(s => s.SyncStateId);

            await DeleteInBatchesAsync("SyncProgressDetails", "log", result,
                () => _context.SyncProgressDetails
                    .Where(sp => oldSyncStateIds.Contains(sp.SyncStateId))
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            await DeleteInBatchesAsync("SyncStates", "log", result,
                () => _context.SyncStates
                    .Where(s => s.CreatedAt < logCutoff)
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            await DeleteInBatchesAsync("SyncCheckpoints", "log", result,
                () => _context.SyncCheckpoints
                    .Where(s => s.CreatedAt < logCutoff)
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            // --- トランザクションデータ削除 (2年) ---
            var txCutoff = now.AddDays(-_settings.TransactionDataRetentionDays);

            // OrderItems → Orders → Customers (FK順序)
            IQueryable<Models.Order> orderBaseQuery = _context.Orders
                .Where(o => activeStoreIds.Contains(o.StoreId));
            if (storeId.HasValue)
                orderBaseQuery = _context.Orders.Where(o => o.StoreId == storeId.Value);

            var oldOrderIds = orderBaseQuery
                .Where(o => (o.ShopifyCreatedAt ?? o.CreatedAt) < txCutoff)
                .Select(o => o.Id);

            await DeleteInBatchesAsync("OrderItems", "transaction", result,
                () => _context.OrderItems
                    .Where(oi => oldOrderIds.Contains(oi.OrderId))
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            await DeleteInBatchesAsync("Orders", "transaction", result,
                () => orderBaseQuery
                    .Where(o => (o.ShopifyCreatedAt ?? o.CreatedAt) < txCutoff)
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            IQueryable<Models.Customer> customerBaseQuery = _context.Customers
                .Where(c => activeStoreIds.Contains(c.StoreId));
            if (storeId.HasValue)
                customerBaseQuery = _context.Customers.Where(c => c.StoreId == storeId.Value);

            await DeleteInBatchesAsync("Customers", "transaction", result,
                () => customerBaseQuery
                    .Where(c =>
                        (c.LastOrderDate != null && c.LastOrderDate < txCutoff) ||
                        (c.LastOrderDate == null && c.CreatedAt < txCutoff))
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            // --- GDPRデータ削除 (7年、completedのみ) ---
            var gdprCutoff = now.AddDays(-_settings.GDPRDataRetentionDays);

            // GDPRDeletionLogs → GDPRRequests (FK順序)
            var oldGdprRequestIds = _context.GDPRRequests
                .Where(g => g.CreatedAt < gdprCutoff && g.Status == "completed")
                .Select(g => g.Id);

            await DeleteInBatchesAsync("GDPRDeletionLogs", "gdpr", result,
                () => _context.GDPRDeletionLogs
                    .Where(d => oldGdprRequestIds.Contains(d.GDPRRequestId))
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());

            await DeleteInBatchesAsync("GDPRRequests", "gdpr", result,
                () => _context.GDPRRequests
                    .Where(g => g.CreatedAt < gdprCutoff && g.Status == "completed")
                    .Take(_settings.BatchSize)
                    .ExecuteDeleteAsync());
        }

        private async Task DeleteInBatchesAsync(
            string tableName,
            string category,
            DataRetentionExecutionResult result,
            Func<Task<int>> deleteAction)
        {
            var tableResult = new TableDeletionResult
            {
                TableName = tableName,
                Category = category
            };
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var totalDeleted = 0;
            var batchCount = 0;

            try
            {
                int deleted;
                do
                {
                    deleted = await deleteAction();
                    totalDeleted += deleted;
                    batchCount++;

                    if (deleted > 0)
                    {
                        _logger.LogInformation("{TableName}: バッチ {BatchCount} - {Deleted}件削除",
                            tableName, batchCount, deleted);
                    }
                } while (deleted >= _settings.BatchSize);

                tableResult.DeletedCount = totalDeleted;
                tableResult.BatchesProcessed = batchCount;
            }
            catch (Exception ex)
            {
                tableResult.Error = ex.Message;
                result.Errors.Add($"{tableName}: {ex.Message}");
                _logger.LogError(ex, "{TableName} の削除中にエラー発生", tableName);
            }

            sw.Stop();
            tableResult.Duration = sw.Elapsed;
            result.Results.Add(tableResult);
        }
    }
}
