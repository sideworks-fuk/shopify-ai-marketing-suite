using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Jobs
{
    /// <summary>
    /// Webhook受信後のバックグラウンド処理をHangfireジョブとして実行する。
    /// Task.Run + リクエストスコープDbContextの問題を回避するため、
    /// Hangfire経由で新しいDIスコープで実行する。
    /// </summary>
    public class WebhookBackgroundJobs
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<WebhookBackgroundJobs> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IDataCleanupService _dataCleanupService;
        private readonly IGDPRService _gdprService;

        public WebhookBackgroundJobs(
            ShopifyDbContext context,
            ILogger<WebhookBackgroundJobs> logger,
            IServiceProvider serviceProvider,
            IDataCleanupService dataCleanupService,
            IGDPRService gdprService)
        {
            _context = context;
            _logger = logger;
            _serviceProvider = serviceProvider;
            _dataCleanupService = dataCleanupService;
            _gdprService = gdprService;
        }

        /// <summary>
        /// app/uninstalled: サブスクリプションキャンセル + データ削除スケジュール
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task ProcessAppUninstalled(string shopDomain)
        {
            _logger.LogInformation("[WebhookJob] app/uninstalled 処理開始. Shop: {Shop}", shopDomain);

            // 1. 課金をキャンセル
            await CancelStoreSubscription(shopDomain);

            // 2. データ削除をスケジュール（48時間以内）
            await ScheduleDataDeletion(shopDomain, 48);

            _logger.LogInformation("[WebhookJob] app/uninstalled 処理完了. Shop: {Shop}", shopDomain);
        }

        /// <summary>
        /// app_subscriptions/update: サブスクリプション更新処理
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task ProcessSubscriptionUpdate(string webhookPayloadJson)
        {
            var webhook = JsonSerializer.Deserialize<AppSubscriptionWebhook>(webhookPayloadJson);
            if (webhook?.AppSubscription == null) return;

            try
            {
                var chargeIdString = webhook.AppSubscription.AdminGraphqlApiId?.Replace("gid://shopify/AppSubscription/", "");
                if (!long.TryParse(chargeIdString, out var chargeId))
                {
                    _logger.LogWarning("[WebhookJob] 無効なChargeId: {ChargeId}", webhook.AppSubscription.AdminGraphqlApiId);
                    return;
                }

                var subscription = await _context.StoreSubscriptions
                    .Include(s => s.Store)
                    .Include(s => s.Plan)
                    .FirstOrDefaultAsync(s => s.ShopifyChargeId == chargeId);

                if (subscription == null)
                {
                    _logger.LogWarning("[WebhookJob] サブスクリプションが見つかりません. ChargeId: {ChargeId}", chargeId);
                    return;
                }

                var previousStatus = subscription.Status;
                var previousPlanName = subscription.PlanName;

                subscription.Status = webhook.AppSubscription.Status?.ToLower() ?? "unknown";
                subscription.UpdatedAt = DateTime.UtcNow;

                if (!string.IsNullOrEmpty(webhook.AppSubscription.Name))
                {
                    subscription.PlanName = webhook.AppSubscription.Name;
                }

                if (webhook.AppSubscription.TrialDays.HasValue)
                {
                    subscription.TrialEndsAt = subscription.CreatedAt.AddDays(webhook.AppSubscription.TrialDays.Value);
                }

                if (!string.IsNullOrEmpty(webhook.AppSubscription.CurrentPeriodEnd))
                {
                    if (DateTime.TryParse(webhook.AppSubscription.CurrentPeriodEnd, out var periodEnd))
                    {
                        subscription.CurrentPeriodEnd = periodEnd;
                    }
                }

                await _context.SaveChangesAsync();

                // プラン変更を検出して機能アクセスを更新
                using (var scope = _serviceProvider.CreateScope())
                {
                    var featureService = scope.ServiceProvider.GetRequiredService<IFeatureSelectionService>();
                    var memoryCache = scope.ServiceProvider.GetRequiredService<IMemoryCache>();

                    var storeId = subscription.StoreId.ToString();

                    if (IsDowngradeToFree(previousPlanName, webhook.AppSubscription.Name, previousStatus, subscription.Status))
                    {
                        _logger.LogInformation("[WebhookJob] 無料プランへのダウングレードを検出. StoreId: {StoreId}", storeId);

                        var selectedFeatures = await featureService.GetSelectedFeaturesAsync(storeId);
                        if (selectedFeatures != null && selectedFeatures.Any())
                        {
                            var latestFeature = selectedFeatures.Last();
                            await featureService.UpdateSelectedFeaturesAsync(storeId, new[] { latestFeature });
                        }
                    }
                    else if (IsUpgradeToPaid(previousPlanName, webhook.AppSubscription.Name, previousStatus, subscription.Status))
                    {
                        _logger.LogInformation("[WebhookJob] 有料プランへのアップグレードを検出. StoreId: {StoreId}", storeId);

                        var allFeatures = FeatureConstants.FreeSelectableFeatures
                            .Select(f => new AvailableFeature
                            {
                                FeatureId = f,
                                DisplayName = FeatureConstants.FeatureDisplayNames[f],
                                Description = FeatureConstants.FeatureDescriptions[f],
                                IsAccessible = true
                            });
                        await featureService.UpdateSelectedFeaturesAsync(storeId, allFeatures);
                    }

                    memoryCache.Remove($"feature_access_{storeId}");
                    memoryCache.Remove($"feature_selection_{storeId}");
                }

                await LogWebhookEvent(subscription.Store?.Domain ?? "", "app_subscriptions/update", webhookPayloadJson);

                _logger.LogInformation("[WebhookJob] Subscription update completed. StoreId: {StoreId}, Status: {Status}, Plan: {Plan}",
                    subscription.StoreId, subscription.Status, subscription.PlanName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WebhookJob] Error during subscription update processing");
                throw; // Hangfire にリトライさせる
            }
        }

        /// <summary>
        /// app_subscriptions/cancel: サブスクリプションキャンセル処理
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task ProcessSubscriptionCancel(string webhookPayloadJson)
        {
            var webhook = JsonSerializer.Deserialize<AppSubscriptionWebhook>(webhookPayloadJson);
            if (webhook?.AppSubscription == null) return;

            try
            {
                var chargeIdString = webhook.AppSubscription.AdminGraphqlApiId?.Replace("gid://shopify/AppSubscription/", "");
                if (!long.TryParse(chargeIdString, out var chargeId))
                {
                    _logger.LogWarning("[WebhookJob] 無効なChargeId: {ChargeId}", webhook.AppSubscription.AdminGraphqlApiId);
                    return;
                }

                var subscription = await _context.StoreSubscriptions
                    .Include(s => s.Store)
                    .FirstOrDefaultAsync(s => s.ShopifyChargeId == chargeId);

                if (subscription == null)
                {
                    _logger.LogWarning("[WebhookJob] サブスクリプションが見つかりません. ChargeId: {ChargeId}", chargeId);
                    return;
                }

                subscription.Status = "cancelled";
                subscription.CancelledAt = DateTime.UtcNow;
                subscription.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                await LogWebhookEvent(subscription.Store?.Domain ?? "", "app_subscriptions/cancel", webhookPayloadJson);

                _logger.LogInformation("[WebhookJob] Subscription cancellation completed. StoreId: {StoreId}", subscription.StoreId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[WebhookJob] Error during subscription cancellation processing");
                throw;
            }
        }

        /// <summary>
        /// customers/redact: 顧客データ削除
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task ProcessCustomersRedact(string shopDomain, string webhookPayloadJson)
        {
            _logger.LogInformation("[WebhookJob] customers/redact 処理開始. Shop: {Shop}", shopDomain);

            var request = await _gdprService.CreateRequestAsync(shopDomain, "customers_redact", webhookPayloadJson);

            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                await _gdprService.ProcessCustomerRedactAsync(request.Id);
            }

            _logger.LogInformation("[WebhookJob] customers/redact 処理完了. Shop: {Shop}", shopDomain);
        }

        /// <summary>
        /// shop/redact: ショップデータ削除
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task ProcessShopRedact(string shopDomain, string webhookPayloadJson)
        {
            _logger.LogInformation("[WebhookJob] shop/redact 処理開始. Shop: {Shop}", shopDomain);

            var request = await _gdprService.CreateRequestAsync(shopDomain, "shop_redact", webhookPayloadJson);

            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                await _gdprService.ProcessShopRedactAsync(request.Id);
            }

            _logger.LogInformation("[WebhookJob] shop/redact 処理完了. Shop: {Shop}", shopDomain);
        }

        /// <summary>
        /// customers/data_request: 顧客データエクスポート
        /// </summary>
        [AutomaticRetry(Attempts = 3)]
        public async Task ProcessCustomersDataRequest(string shopDomain, string webhookPayloadJson)
        {
            _logger.LogInformation("[WebhookJob] customers/data_request 処理開始. Shop: {Shop}", shopDomain);

            var request = await _gdprService.CreateRequestAsync(shopDomain, "customers_data_request", webhookPayloadJson);

            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                await _gdprService.ProcessCustomerDataRequestAsync(request.Id);
            }

            _logger.LogInformation("[WebhookJob] customers/data_request 処理完了. Shop: {Shop}", shopDomain);
        }

        #region Private helpers (moved from WebhookController)

        private async Task CancelStoreSubscription(string shopDomain)
        {
            _logger.LogInformation("[WebhookJob] サブスクリプションをキャンセル. Shop: {Shop}", shopDomain);

            var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shopDomain);
            if (store == null)
            {
                _logger.LogWarning("[WebhookJob] ストアが見つかりません. Shop: {Shop}", shopDomain);
                return;
            }

            using (var scope = _serviceProvider.CreateScope())
            {
                var subscriptionService = scope.ServiceProvider.GetRequiredService<ISubscriptionService>();
                var result = await subscriptionService.CancelSubscriptionAsync(store.Id);
                if (!result.Success)
                {
                    _logger.LogWarning("[WebhookJob] サービス経由のキャンセルに失敗したためローカル更新を試行. Shop: {Shop}", shopDomain);

                    var activeSubscription = await _context.StoreSubscriptions
                        .Where(s => s.StoreId == store.Id && (s.Status == "ACTIVE" || s.Status == "PENDING" || s.Status == "active" || s.Status == "pending"))
                        .FirstOrDefaultAsync();
                    if (activeSubscription != null)
                    {
                        activeSubscription.Status = "cancelled";
                        activeSubscription.CancelledAt = DateTime.UtcNow;
                        activeSubscription.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("[WebhookJob] ローカルのみキャンセル完了. Shop: {Shop}, SubscriptionId: {SubId}", shopDomain, activeSubscription.Id);
                    }
                }
            }
        }

        private async Task ScheduleDataDeletion(string shopDomain, int daysToDelete)
        {
            _logger.LogInformation("[WebhookJob] データ削除をスケジュール. Shop: {Shop}, Days: {Days}", shopDomain, daysToDelete);

            await LogWebhookEvent(shopDomain, "app/uninstalled", JsonSerializer.Serialize(new { daysToDelete, scheduledDeletionDate = DateTime.UtcNow.AddDays(daysToDelete) }));

            var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shopDomain);
            if (store != null)
            {
                var settings = string.IsNullOrEmpty(store.Settings)
                    ? new Dictionary<string, object>()
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(store.Settings) ?? new Dictionary<string, object>();

                settings["OriginalDomain"] = store.Domain;
                settings["UninstalledAt"] = DateTime.UtcNow;
                settings["ScheduledDeletionDate"] = DateTime.UtcNow.AddDays(daysToDelete);

                store.IsActive = false;
                store.UpdatedAt = DateTime.UtcNow;
                store.AccessToken = null;
                store.Settings = JsonSerializer.Serialize(settings);

                await _context.SaveChangesAsync();

                // 定期同期ジョブをキャンセル
                RecurringJob.RemoveIfExists($"sync-products-store-{store.Id}");
                RecurringJob.RemoveIfExists($"sync-customers-store-{store.Id}");
                RecurringJob.RemoveIfExists($"sync-orders-store-{store.Id}");
                _logger.LogInformation("[WebhookJob] 定期同期ジョブを削除. Shop: {Shop}, StoreId: {StoreId}", shopDomain, store.Id);

                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" || daysToDelete == 0)
                {
                    _logger.LogWarning("[WebhookJob] 開発環境のため、即座にデータを削除します. Shop: {Shop}", shopDomain);
                    await _dataCleanupService.DeleteStoreDataAsync(shopDomain);
                }
                else
                {
                    var scheduledTime = TimeSpan.FromHours(daysToDelete);
                    var jobId = BackgroundJob.Schedule<IDataCleanupService>(
                        service => service.DeleteStoreDataAsync(shopDomain),
                        scheduledTime);

                    settings["DeletionJobId"] = jobId;
                    store.Settings = JsonSerializer.Serialize(settings);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("[WebhookJob] ストアデータ削除をスケジュール. Shop: {Shop}, JobId: {JobId}, 予定: {Hours}時間後",
                        shopDomain, jobId, daysToDelete);
                }
            }
        }

        private async Task LogWebhookEvent(string shopDomain, string topic, string payload)
        {
            try
            {
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shopDomain);
                var storeId = store?.Id ?? 0;

                var idempotencyKey = GenerateWebhookIdempotencyKey(shopDomain, topic, payload);

                var exists = await _context.WebhookEvents.AnyAsync(w => w.IdempotencyKey == idempotencyKey);
                if (exists) return;

                var webhookEvent = new WebhookEvent
                {
                    StoreId = storeId,
                    ShopDomain = shopDomain,
                    Topic = topic,
                    Payload = payload,
                    ProcessedAt = DateTime.UtcNow,
                    Status = "processed",
                    IdempotencyKey = idempotencyKey,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Add(webhookEvent);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[WebhookJob] Webhookイベント記録に失敗. Shop: {Shop}, Topic: {Topic}", shopDomain, topic);
            }
        }

        private static string GenerateWebhookIdempotencyKey(string shopDomain, string topic, string payload)
        {
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var input = $"{shopDomain}:{topic}:{payload}";
            var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
            return Convert.ToBase64String(hashBytes);
        }

        private static bool IsDowngradeToFree(string? previousPlan, string? newPlan, string? previousStatus, string? newStatus)
        {
            var isFreeNow = string.Equals(newPlan, "Free", StringComparison.OrdinalIgnoreCase);
            var wasPaidBefore = !string.Equals(previousPlan, "Free", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(previousPlan);
            var wasActive = string.Equals(previousStatus, "active", StringComparison.OrdinalIgnoreCase);
            var isCancelled = string.Equals(newStatus, "cancelled", StringComparison.OrdinalIgnoreCase);
            return (isFreeNow && wasPaidBefore) || (wasActive && isCancelled);
        }

        private static bool IsUpgradeToPaid(string? previousPlan, string? newPlan, string? previousStatus, string? newStatus)
        {
            var isPaidNow = !string.Equals(newPlan, "Free", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(newPlan);
            var wasFreeBefore = string.Equals(previousPlan, "Free", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(previousPlan);
            var isActiveNow = string.Equals(newStatus, "active", StringComparison.OrdinalIgnoreCase);
            return (isPaidNow && wasFreeBefore) || (isPaidNow && isActiveNow);
        }

        #endregion
    }
}
