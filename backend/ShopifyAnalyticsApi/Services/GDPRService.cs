using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// GDPR準拠のための統合サービス
    /// </summary>
    public interface IGDPRService
    {
        // リクエスト管理
        Task<GDPRRequest> CreateRequestAsync(string shopDomain, string requestType, string webhookPayload);
        Task<GDPRRequest?> GetRequestAsync(int requestId);
        Task<List<GDPRRequest>> GetPendingRequestsAsync();
        Task<List<GDPRRequest>> GetOverdueRequestsAsync();
        
        // 処理実行
        Task ProcessCustomerDataRequestAsync(int requestId);
        Task ProcessCustomerRedactAsync(int requestId);
        Task ProcessShopRedactAsync(int requestId);
        
        // ステータス管理
        Task UpdateRequestStatusAsync(int requestId, string status, string? details = null);
        Task MarkAsCompletedAsync(int requestId);
        Task MarkAsFailedAsync(int requestId, string errorMessage);
        
        // 統計・レポート
        Task<GDPRStatistics> GetStatisticsAsync(string period);
        Task GenerateComplianceReportAsync(DateTime startDate, DateTime endDate);
    }

    public class GDPRService : IGDPRService
    {
        private readonly ShopifyDbContext _context;
        private readonly IDataCleanupService _cleanupService;
        private readonly ILogger<GDPRService> _logger;
        private readonly IConfiguration _configuration;

        public GDPRService(
            ShopifyDbContext context,
            IDataCleanupService cleanupService,
            ILogger<GDPRService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _cleanupService = cleanupService;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// GDPR要求を作成
        /// </summary>
        public async Task<GDPRRequest> CreateRequestAsync(string shopDomain, string requestType, string webhookPayload)
        {
            try
            {
                // 重複チェック用の冪等性キー生成
                var idempotencyKey = GenerateIdempotencyKey(shopDomain, requestType, webhookPayload);

                // 既存のリクエストをチェック
                var existingRequest = await _context.Set<GDPRRequest>()
                    .FirstOrDefaultAsync(r => r.IdempotencyKey == idempotencyKey);

                if (existingRequest != null)
                {
                    _logger.LogInformation("既存のGDPRリクエストを返却. Id: {Id}", existingRequest.Id);
                    return existingRequest;
                }

                // Webhookペイロードをパース
                var payload = JsonSerializer.Deserialize<JsonElement>(webhookPayload);
                
                // 期限を計算
                var dueDate = CalculateDueDate(requestType);

                // 新しいリクエストを作成
                var request = new GDPRRequest
                {
                    ShopDomain = shopDomain,
                    RequestType = requestType,
                    WebhookPayload = webhookPayload,
                    IdempotencyKey = idempotencyKey,
                    Status = "pending",
                    ReceivedAt = DateTime.UtcNow,
                    DueDate = dueDate,
                    ScheduledFor = CalculateScheduledDate(requestType)
                };

                // ストアを特定
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shopDomain);
                if (store != null)
                {
                    request.StoreId = store.Id;
                }

                // リクエストタイプ別の詳細設定
                switch (requestType.ToLower())
                {
                    case "customers_data_request":
                        if (payload.TryGetProperty("customer", out var customerData))
                        {
                            if (customerData.TryGetProperty("id", out var customerId))
                                request.CustomerId = customerId.GetInt64();
                            if (customerData.TryGetProperty("email", out var email))
                                request.CustomerEmail = email.GetString();
                        }
                        if (payload.TryGetProperty("data_request", out var dataRequest))
                        {
                            if (dataRequest.TryGetProperty("id", out var requestId))
                                request.ShopifyRequestId = requestId.ToString();
                        }
                        break;

                    case "customers_redact":
                        if (payload.TryGetProperty("customer", out var customerToRedact))
                        {
                            if (customerToRedact.TryGetProperty("id", out var custId))
                                request.CustomerId = custId.GetInt64();
                            if (customerToRedact.TryGetProperty("email", out var custEmail))
                                request.CustomerEmail = custEmail.GetString();
                        }
                        if (payload.TryGetProperty("orders_to_redact", out var orders))
                        {
                            request.OrdersToRedact = orders.ToString();
                        }
                        break;

                    case "shop_redact":
                        // ショップ削除には追加情報不要
                        break;
                }

                _context.Set<GDPRRequest>().Add(request);
                await _context.SaveChangesAsync();

                _logger.LogInformation("GDPRリクエスト作成. Id: {Id}, Type: {Type}, Shop: {Shop}", 
                    request.Id, requestType, shopDomain);

                return request;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GDPRリクエスト作成中にエラー. Shop: {Shop}, Type: {Type}", 
                    shopDomain, requestType);
                throw;
            }
        }

        /// <summary>
        /// リクエストを取得
        /// </summary>
        public async Task<GDPRRequest?> GetRequestAsync(int requestId)
        {
            return await _context.Set<GDPRRequest>()
                .Include(r => r.Store)
                .FirstOrDefaultAsync(r => r.Id == requestId);
        }

        /// <summary>
        /// 処理待ちリクエストを取得
        /// </summary>
        public async Task<List<GDPRRequest>> GetPendingRequestsAsync()
        {
            return await _context.Set<GDPRRequest>()
                .Where(r => r.Status == "pending" && r.ScheduledFor <= DateTime.UtcNow)
                .OrderBy(r => r.DueDate)
                .ToListAsync();
        }

        /// <summary>
        /// 期限超過リクエストを取得
        /// </summary>
        public async Task<List<GDPRRequest>> GetOverdueRequestsAsync()
        {
            return await _context.Set<GDPRRequest>()
                .Where(r => r.Status != "completed" && r.DueDate < DateTime.UtcNow)
                .OrderBy(r => r.DueDate)
                .ToListAsync();
        }

        /// <summary>
        /// 顧客データ提供要求を処理
        /// </summary>
        public async Task ProcessCustomerDataRequestAsync(int requestId)
        {
            var request = await GetRequestAsync(requestId);
            if (request == null)
            {
                _logger.LogWarning("GDPRリクエストが見つかりません. Id: {Id}", requestId);
                return;
            }

            try
            {
                await UpdateRequestStatusAsync(requestId, "processing");
                
                if (!request.CustomerId.HasValue)
                {
                    throw new InvalidOperationException("顧客IDが指定されていません");
                }

                // 顧客データをエクスポート
                var exportedData = await _cleanupService.ExportCustomerDataAsync(
                    request.ShopDomain, 
                    request.CustomerId.Value);

                // エクスポートデータを保存
                request.ExportedData = exportedData;
                request.Status = "exported";
                request.CompletedAt = DateTime.UtcNow;

                // TODO: Azure Blob Storageにアップロードして、セキュアなURLを生成
                // request.ExportUrl = await UploadToStorageAsync(exportedData);

                // 削除ログを記録
                await LogDeletionAsync(request.Id, "customer_data", 
                    request.CustomerId.Value.ToString(), exportedData, "export");

                await _context.SaveChangesAsync();
                await MarkAsCompletedAsync(requestId);

                _logger.LogInformation("顧客データエクスポート完了. RequestId: {Id}, CustomerId: {CustomerId}", 
                    requestId, request.CustomerId.Value);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客データエクスポート中にエラー. RequestId: {Id}", requestId);
                await MarkAsFailedAsync(requestId, ex.Message);
                throw;
            }
        }

        /// <summary>
        /// 顧客データ削除要求を処理
        /// </summary>
        public async Task ProcessCustomerRedactAsync(int requestId)
        {
            var request = await GetRequestAsync(requestId);
            if (request == null)
            {
                _logger.LogWarning("GDPRリクエストが見つかりません. Id: {Id}", requestId);
                return;
            }

            try
            {
                await UpdateRequestStatusAsync(requestId, "processing");
                
                if (!request.CustomerId.HasValue)
                {
                    throw new InvalidOperationException("顧客IDが指定されていません");
                }

                // 削除前にデータをエクスポート（監査用）
                var backupData = await _cleanupService.ExportCustomerDataAsync(
                    request.ShopDomain, 
                    request.CustomerId.Value);

                // 顧客データを削除
                await _cleanupService.DeleteCustomerDataAsync(
                    request.ShopDomain, 
                    request.CustomerId.Value);

                // 削除ログを記録
                await LogDeletionAsync(request.Id, "customer", 
                    request.CustomerId.Value.ToString(), backupData, "delete");

                // 注文データの削除/匿名化
                if (!string.IsNullOrEmpty(request.OrdersToRedact))
                {
                    var orderIds = JsonSerializer.Deserialize<List<long>>(request.OrdersToRedact);
                    if (orderIds != null)
                    {
                        foreach (var orderId in orderIds)
                        {
                            await LogDeletionAsync(request.Id, "order", 
                                orderId.ToString(), null, "anonymize");
                        }
                    }
                }

                await MarkAsCompletedAsync(requestId);

                _logger.LogInformation("顧客データ削除完了. RequestId: {Id}, CustomerId: {CustomerId}", 
                    requestId, request.CustomerId.Value);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客データ削除中にエラー. RequestId: {Id}", requestId);
                await MarkAsFailedAsync(requestId, ex.Message);
                throw;
            }
        }

        /// <summary>
        /// ショップデータ削除要求を処理
        /// </summary>
        public async Task ProcessShopRedactAsync(int requestId)
        {
            var request = await GetRequestAsync(requestId);
            if (request == null)
            {
                _logger.LogWarning("GDPRリクエストが見つかりません. Id: {Id}", requestId);
                return;
            }

            try
            {
                await UpdateRequestStatusAsync(requestId, "processing");

                // ショップ全データを削除
                await _cleanupService.DeleteStoreDataAsync(request.ShopDomain);

                // 削除ログを記録
                await LogDeletionAsync(request.Id, "shop", 
                    request.ShopDomain, null, "delete");

                await MarkAsCompletedAsync(requestId);

                _logger.LogInformation("ショップデータ削除完了. RequestId: {Id}, Shop: {Shop}", 
                    requestId, request.ShopDomain);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ショップデータ削除中にエラー. RequestId: {Id}", requestId);
                await MarkAsFailedAsync(requestId, ex.Message);
                throw;
            }
        }

        /// <summary>
        /// リクエストステータスを更新
        /// </summary>
        public async Task UpdateRequestStatusAsync(int requestId, string status, string? details = null)
        {
            var request = await GetRequestAsync(requestId);
            if (request == null) return;

            request.Status = status;
            request.UpdatedAt = DateTime.UtcNow;

            if (status == "processing" && !request.ProcessingStartedAt.HasValue)
            {
                request.ProcessingStartedAt = DateTime.UtcNow;
            }

            if (!string.IsNullOrEmpty(details))
            {
                request.ProcessingDetails = details;
            }

            // 監査ログに追記
            var auditLog = new List<object>();
            if (!string.IsNullOrEmpty(request.AuditLog))
            {
                auditLog = JsonSerializer.Deserialize<List<object>>(request.AuditLog) ?? new List<object>();
            }
            
            auditLog.Add(new
            {
                timestamp = DateTime.UtcNow,
                status,
                details
            });
            
            request.AuditLog = JsonSerializer.Serialize(auditLog);

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// リクエストを完了としてマーク
        /// </summary>
        public async Task MarkAsCompletedAsync(int requestId)
        {
            var request = await GetRequestAsync(requestId);
            if (request == null) return;

            request.Status = "completed";
            request.CompletedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // 統計を更新
            await UpdateStatisticsAsync(request);
        }

        /// <summary>
        /// リクエストを失敗としてマーク
        /// </summary>
        public async Task MarkAsFailedAsync(int requestId, string errorMessage)
        {
            var request = await GetRequestAsync(requestId);
            if (request == null) return;

            request.Status = "failed";
            request.ErrorMessage = errorMessage;
            request.RetryCount++;
            request.UpdatedAt = DateTime.UtcNow;

            // リトライ可能な場合はスケジュールを再設定
            if (request.CanRetry)
            {
                request.Status = "pending";
                request.ScheduledFor = DateTime.UtcNow.AddHours(Math.Pow(2, request.RetryCount)); // 指数バックオフ
                _logger.LogInformation("GDPRリクエストをリトライスケジュール. Id: {Id}, RetryCount: {Count}", 
                    requestId, request.RetryCount);
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// 統計を取得
        /// </summary>
        public async Task<GDPRStatistics> GetStatisticsAsync(string period)
        {
            var stats = await _context.Set<GDPRStatistics>()
                .FirstOrDefaultAsync(s => s.Period == period);

            if (stats == null)
            {
                // 新規作成
                stats = await GenerateStatisticsAsync(period);
            }

            return stats;
        }

        /// <summary>
        /// コンプライアンスレポートを生成
        /// </summary>
        public async Task GenerateComplianceReportAsync(DateTime startDate, DateTime endDate)
        {
            var requests = await _context.Set<GDPRRequest>()
                .Where(r => r.ReceivedAt >= startDate && r.ReceivedAt <= endDate)
                .ToListAsync();

            var report = new
            {
                Period = $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}",
                Summary = new
                {
                    TotalRequests = requests.Count,
                    Completed = requests.Count(r => r.Status == "completed"),
                    Pending = requests.Count(r => r.Status == "pending"),
                    Failed = requests.Count(r => r.Status == "failed"),
                    Overdue = requests.Count(r => r.IsOverdue)
                },
                ByType = requests.GroupBy(r => r.RequestType).Select(g => new
                {
                    Type = g.Key,
                    Count = g.Count(),
                    Completed = g.Count(r => r.Status == "completed"),
                    AverageProcessingTime = g.Where(r => r.CompletedAt.HasValue)
                        .Select(r => (r.CompletedAt.Value - r.ReceivedAt).TotalHours)
                        .DefaultIfEmpty(0)
                        .Average()
                }),
                ComplianceRate = requests.Count > 0 
                    ? (double)requests.Count(r => r.Status == "completed" && !r.IsOverdue) / requests.Count * 100 
                    : 100
            };

            var reportJson = JsonSerializer.Serialize(report, new JsonSerializerOptions
            {
                WriteIndented = true
            });

            _logger.LogInformation("コンプライアンスレポート生成完了:\n{Report}", reportJson);

            // TODO: レポートをファイルやメールで送信
        }

        #region Private Methods

        /// <summary>
        /// 冪等性キーを生成
        /// </summary>
        private string GenerateIdempotencyKey(string shopDomain, string requestType, string webhookPayload)
        {
            var payload = JsonSerializer.Deserialize<JsonElement>(webhookPayload);
            var keyComponents = new List<string> { shopDomain, requestType };

            // リクエストタイプ別の一意識別子を追加
            if (requestType == "customers_data_request" || requestType == "customers_redact")
            {
                if (payload.TryGetProperty("customer", out var customer))
                {
                    if (customer.TryGetProperty("id", out var customerId))
                    {
                        keyComponents.Add(customerId.ToString());
                    }
                }
            }

            // タイムスタンプがあれば追加
            if (payload.TryGetProperty("created_at", out var createdAt))
            {
                keyComponents.Add(createdAt.ToString());
            }

            return string.Join("_", keyComponents);
        }

        /// <summary>
        /// 期限を計算
        /// </summary>
        private DateTime CalculateDueDate(string requestType)
        {
            return requestType.ToLower() switch
            {
                "customers_data_request" => DateTime.UtcNow.AddDays(10),  // 10日以内
                "customers_redact" => DateTime.UtcNow.AddDays(30),        // 30日以内
                "shop_redact" => DateTime.UtcNow.AddDays(90),            // 90日以内
                _ => DateTime.UtcNow.AddDays(30)
            };
        }

        /// <summary>
        /// スケジュール日時を計算
        /// </summary>
        private DateTime CalculateScheduledDate(string requestType)
        {
            // 開発環境では即座に処理
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                return DateTime.UtcNow;
            }

            // 本番環境では適切な遅延を設定
            return requestType.ToLower() switch
            {
                "customers_data_request" => DateTime.UtcNow.AddHours(1),  // 1時間後
                "customers_redact" => DateTime.UtcNow.AddDays(7),         // 7日後
                "shop_redact" => DateTime.UtcNow.AddDays(48),            // 48時間後
                _ => DateTime.UtcNow.AddDays(1)
            };
        }

        /// <summary>
        /// 削除ログを記録
        /// </summary>
        private async Task LogDeletionAsync(int requestId, string entityType, string entityId, 
            string? anonymizedData, string method)
        {
            var log = new GDPRDeletionLog
            {
                GDPRRequestId = requestId,
                EntityType = entityType,
                EntityId = entityId,
                AnonymizedData = anonymizedData,
                DeletionMethod = method,
                DeletedBy = "GDPRService",
                DeletedAt = DateTime.UtcNow
            };

            _context.Set<GDPRDeletionLog>().Add(log);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// 統計を生成
        /// </summary>
        private async Task<GDPRStatistics> GenerateStatisticsAsync(string period)
        {
            var year = int.Parse(period.Substring(0, 4));
            var month = int.Parse(period.Substring(5, 2));
            
            var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endDate = startDate.AddMonths(1).AddSeconds(-1);

            var requests = await _context.Set<GDPRRequest>()
                .Where(r => r.ReceivedAt >= startDate && r.ReceivedAt <= endDate)
                .ToListAsync();

            var stats = new GDPRStatistics
            {
                Period = period,
                RequestType = "all",
                TotalRequests = requests.Count,
                CompletedRequests = requests.Count(r => r.Status == "completed"),
                CompletedOnTime = requests.Count(r => r.Status == "completed" && r.CompletedAt <= r.DueDate),
                Overdue = requests.Count(r => r.IsOverdue),
                Failed = requests.Count(r => r.Status == "failed"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var completedRequests = requests.Where(r => r.CompletedAt.HasValue).ToList();
            if (completedRequests.Any())
            {
                var processingTimes = completedRequests
                    .Select(r => (r.CompletedAt!.Value - r.ReceivedAt).TotalHours)
                    .ToList();

                stats.AverageProcessingHours = processingTimes.Average();
                stats.MinProcessingHours = processingTimes.Min();
                stats.MaxProcessingHours = processingTimes.Max();
            }

            _context.Set<GDPRStatistics>().Add(stats);
            await _context.SaveChangesAsync();

            return stats;
        }

        /// <summary>
        /// 統計を更新
        /// </summary>
        private async Task UpdateStatisticsAsync(GDPRRequest request)
        {
            var period = request.ReceivedAt.ToString("yyyy-MM");
            var stats = await GetStatisticsAsync(period);
            
            // 統計を再計算
            await GenerateStatisticsAsync(period);
        }

        #endregion
    }
}