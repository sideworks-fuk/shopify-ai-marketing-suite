using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using ShopifyAnalyticsApi.Helpers;
using Microsoft.Extensions.DependencyInjection;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// Shopify Webhookを処理するコントローラー
    /// GDPR必須Webhook対応
    /// </summary>
    [ApiController]
    [Route("api/webhook")]
    [AllowAnonymous] // Webhookは認証なしでアクセス可能
    [RequestSizeLimit(262144)] // 256 KB 上限
    public class WebhookController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<WebhookController> _logger;
        private readonly ShopifyDbContext _context;
        private readonly IServiceProvider _serviceProvider;
        private readonly IDataCleanupService _dataCleanupService;
        private readonly IGDPRService _gdprService;

        public WebhookController(
            IConfiguration configuration,
            ILogger<WebhookController> logger,
            ShopifyDbContext context,
            IServiceProvider serviceProvider,
            IDataCleanupService dataCleanupService,
            IGDPRService gdprService)
        {
            _configuration = configuration;
            _logger = logger;
            _context = context;
            _serviceProvider = serviceProvider;
            _dataCleanupService = dataCleanupService;
            _gdprService = gdprService;
        }

        /// <summary>
        /// アプリがアンインストールされた時のWebhook
        /// 48時間以内にストアデータを削除する必要がある
        /// </summary>
        [HttpPost("uninstalled")]
        public async Task<IActionResult> AppUninstalled()
        {
            var started = Stopwatch.StartNew();
            try
            {
                // 必須ヘッダ/トピック検証
                if (!ValidateRequiredHeaders("app/uninstalled", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    return Forbid();
                }

                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: app/uninstalled");
                    return Forbid();
                }

                // リクエストボディを読み取る
                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<ShopifyWebhook>(body);

                if (webhook?.Domain == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: app/uninstalled");
                    return BadRequest();
                }

                var correlationId = LoggingHelper.GetOrCreateCorrelationId(HttpContext);
                var requestId = LoggingHelper.GetOrCreateRequestId(HttpContext);
                _logger.LogInformation("アプリアンインストール通知受信 Shop={Shop} Topic={Topic} WebhookId={WebhookId} CorrelationId={CorrelationId} RequestId={RequestId}", webhook.Domain, topic, webhookId, correlationId, requestId);

                // 非同期で処理を実行
                _ = Task.Run(async () =>
                {
                    try
                    {
                        // 1. 課金をキャンセル（Shopify側とローカル両方を冪等に処理）
                        await CancelStoreSubscription(webhook.Domain);
                        
                        // 2. データ削除をスケジュール（48時間以内）
                        await ScheduleDataDeletion(webhook.Domain, 48);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "アンインストール処理中にエラー. Shop: {Shop}", webhook.Domain);
                    }
                });

                // 即座に200 OKを返す（5秒ルール）
                started.Stop();
                _logger.LogInformation("app/uninstalled 処理完了 Shop={Shop} WebhookId={WebhookId} Result={Result} LatencyMs={Latency} CorrelationId={CorrelationId} RequestId={RequestId}", webhook.Domain, webhookId, "accepted", started.ElapsedMilliseconds, correlationId, requestId);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "app/uninstalled Webhook処理中にエラー");
                // エラーでも200を返す
                return Ok();
            }
        }

        /// <summary>
        /// 顧客データ削除要求のWebhook
        /// 30日以内に顧客データを削除する必要がある
        /// </summary>
        [HttpPost("customers-redact")]
        public async Task<IActionResult> CustomersRedact()
        {
            var started = Stopwatch.StartNew();
            try
            {
                if (!ValidateRequiredHeaders("customers/redact", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    return Forbid();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: customers/redact");
                    return Forbid();
                }

                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<CustomerRedactWebhook>(body);

                if (webhook?.ShopDomain == null || webhook.Customer == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: customers/redact");
                    return BadRequest();
                }

                _logger.LogInformation("顧客データ削除要求受信 Shop={Shop} CustomerId={CustomerId} Topic={Topic} WebhookId={WebhookId}", 
                    webhook.ShopDomain, webhook.Customer.Id, topic, webhookId);

                // GDPRサービスでリクエストを作成
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var request = await _gdprService.CreateRequestAsync(
                            webhook.ShopDomain, 
                            "customers_redact", 
                            body);
                        
                        // 開発環境では即座に処理
                        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                        {
                            await _gdprService.ProcessCustomerRedactAsync(request.Id);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "顧客データ削除処理中にエラー. Shop: {Shop}", webhook.ShopDomain);
                    }
                });

                started.Stop();
                _logger.LogInformation("customers/redact 受付完了 Shop={Shop} WebhookId={WebhookId} LatencyMs={Latency}", webhook.ShopDomain, webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "customers/redact Webhook処理中にエラー");
                return Ok();
            }
        }

        /// <summary>
        /// ショップデータ削除要求のWebhook
        /// 90日以内にショップデータを削除する必要がある
        /// </summary>
        [HttpPost("shop-redact")]
        public async Task<IActionResult> ShopRedact()
        {
            var started = Stopwatch.StartNew();
            try
            {
                if (!ValidateRequiredHeaders("shop/redact", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    return Forbid();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: shop/redact");
                    return Forbid();
                }

                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<ShopifyWebhook>(body);

                if (webhook?.Domain == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: shop/redact");
                    return BadRequest();
                }

                _logger.LogInformation("ショップデータ削除要求受信 Shop={Shop} Topic={Topic} WebhookId={WebhookId}", webhook.Domain, topic, webhookId);

                // GDPRサービスでリクエストを作成
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var request = await _gdprService.CreateRequestAsync(
                            webhook.Domain, 
                            "shop_redact", 
                            body);
                        
                        // 開発環境では即座に処理
                        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                        {
                            await _gdprService.ProcessShopRedactAsync(request.Id);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "ショップデータ削除処理中にエラー. Shop: {Shop}", webhook.Domain);
                    }
                });

                started.Stop();
                _logger.LogInformation("shop/redact 受付完了 Shop={Shop} WebhookId={WebhookId} LatencyMs={Latency}", webhook.Domain, webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "shop/redact Webhook処理中にエラー");
                return Ok();
            }
        }

        /// <summary>
        /// 顧客データリクエストのWebhook
        /// 10日以内にデータを提供する必要がある
        /// </summary>
        [HttpPost("customers-data-request")]
        public async Task<IActionResult> CustomersDataRequest()
        {
            var started = Stopwatch.StartNew();
            try
            {
                if (!ValidateRequiredHeaders("customers/data_request", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    return Forbid();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: customers/data_request");
                    return Forbid();
                }

                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<CustomerDataRequestWebhook>(body);

                if (webhook?.ShopDomain == null || webhook.Customer == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: customers/data_request");
                    return BadRequest();
                }

                _logger.LogInformation("顧客データ提供要求受信 Shop={Shop} CustomerId={CustomerId} Topic={Topic} WebhookId={WebhookId}", 
                    webhook.ShopDomain, webhook.Customer.Id, topic, webhookId);

                // GDPRサービスでリクエストを作成
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var request = await _gdprService.CreateRequestAsync(
                            webhook.ShopDomain, 
                            "customers_data_request", 
                            body);
                        
                        // 開発環境では即座に処理
                        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                        {
                            await _gdprService.ProcessCustomerDataRequestAsync(request.Id);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "顧客データエクスポート処理中にエラー. Shop: {Shop}", webhook.ShopDomain);
                    }
                });

                started.Stop();
                _logger.LogInformation("customers/data_request 受付完了 Shop={Shop} WebhookId={WebhookId} LatencyMs={Latency}", webhook.ShopDomain, webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "customers/data_request Webhook処理中にエラー");
                return Ok();
            }
        }

        /// <summary>
        /// サブスクリプション更新のWebhook
        /// </summary>
        [HttpPost("subscriptions-update")]
        public async Task<IActionResult> SubscriptionsUpdate()
        {
            var started = Stopwatch.StartNew();
            try
            {
                if (!ValidateRequiredHeaders("app_subscriptions/update", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    return Forbid();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: app_subscriptions/update");
                    return Forbid();
                }

                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<AppSubscriptionWebhook>(body);

                if (webhook?.AppSubscription == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: app_subscriptions/update");
                    return BadRequest();
                }

                _logger.LogInformation("サブスクリプション更新通知受信. ChargeId: {ChargeId}, Status: {Status}", 
                    webhook.AppSubscription.AdminGraphqlApiId, webhook.AppSubscription.Status);

                // 非同期でサブスクリプション更新処理
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ProcessSubscriptionUpdate(webhook);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "サブスクリプション更新処理中にエラー");
                    }
                });

                started.Stop();
                _logger.LogInformation("subscriptions-update 受付完了 WebhookId={WebhookId} LatencyMs={Latency}", webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "app_subscriptions/update Webhook処理中にエラー");
                return Ok();
            }
        }

        /// <summary>
        /// サブスクリプションキャンセルのWebhook
        /// </summary>
        [HttpPost("subscriptions-cancel")]
        public async Task<IActionResult> SubscriptionsCancel()
        {
            var started = Stopwatch.StartNew();
            try
            {
                if (!ValidateRequiredHeaders("app_subscriptions/cancel", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    return Forbid();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: app_subscriptions/cancel");
                    return Forbid();
                }

                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<AppSubscriptionWebhook>(body);

                if (webhook?.AppSubscription == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: app_subscriptions/cancel");
                    return BadRequest();
                }

                _logger.LogInformation("サブスクリプションキャンセル通知受信. ChargeId: {ChargeId}", 
                    webhook.AppSubscription.AdminGraphqlApiId);

                // 非同期でサブスクリプションキャンセル処理
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ProcessSubscriptionCancel(webhook);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "サブスクリプションキャンセル処理中にエラー");
                    }
                });

                started.Stop();
                _logger.LogInformation("subscriptions-cancel 受付完了 WebhookId={WebhookId} LatencyMs={Latency}", webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "app_subscriptions/cancel Webhook処理中にエラー");
                return Ok();
            }
        }

        /// <summary>
        /// Webhook署名を検証する（マルチアプリ対応）
        /// </summary>
        private async Task<bool> VerifyWebhookRequest()
        {
            try
            {
                // Shopify-Hmac-SHA256ヘッダーを取得
                if (!Request.Headers.TryGetValue("X-Shopify-Hmac-SHA256", out var receivedHmac))
                {
                    _logger.LogWarning("HMAC署名ヘッダーが見つかりません");
                    return false;
                }

                // リクエストボディを読み取る
                Request.EnableBuffering();
                var body = await GetRequestBodyAsync();
                Request.Body.Position = 0;

                // マルチアプリ対応: ストアドメインからShopifyAppを特定してWebhookSecretを取得
                string? secret = null;
                
                // X-Shopify-Shop-Domainヘッダーからストアドメインを取得
                if (Request.Headers.TryGetValue("X-Shopify-Shop-Domain", out var shopDomainHeader))
                {
                    var shopDomain = shopDomainHeader.ToString();
                    if (!string.IsNullOrWhiteSpace(shopDomain))
                    {
                        // ストアからShopifyAppを取得
                        var store = await _context.Stores
                            .Include(s => s.ShopifyApp)
                            .FirstOrDefaultAsync(s => s.Domain == shopDomain);
                        
                        if (store?.ShopifyApp != null && store.ShopifyApp.IsActive)
                        {
                            // ShopifyAppのApiSecretを使用（Webhook Secretは通常ApiSecretと同じ）
                            secret = store.ShopifyApp.ApiSecret;
                            _logger.LogDebug("Webhook SecretをShopifyAppから取得. Shop: {Shop}, App: {App}", shopDomain, store.ShopifyApp.Name);
                        }
                    }
                }
                
                // フォールバック: 設定ファイルから取得
                if (string.IsNullOrWhiteSpace(secret))
                {
                    secret = _configuration["Shopify:WebhookSecret"];
                    if (!string.IsNullOrWhiteSpace(secret))
                    {
                        _logger.LogDebug("Webhook Secretを設定ファイルから取得");
                    }
                }
                
                if (string.IsNullOrWhiteSpace(secret))
                {
                    _logger.LogError("Webhook秘密鍵が設定されていません");
                    return false;
                }

                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var computedHashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));

                // 受信値をBase64デコード
                byte[] receivedHmacBytes;
                try
                {
                    receivedHmacBytes = Convert.FromBase64String(receivedHmac.ToString());
                }
                catch
                {
                    _logger.LogWarning("HMAC署名の形式が不正です");
                    return false;
                }

                if (receivedHmacBytes.Length != computedHashBytes.Length)
                {
                    return false;
                }

                // 固定時間比較で検証
                return CryptographicOperations.FixedTimeEquals(computedHashBytes, receivedHmacBytes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HMAC検証中にエラーが発生");
                return false;
            }
        }

        /// <summary>
        /// リクエストボディを文字列として取得する
        /// </summary>
        private async Task<string> GetRequestBodyAsync()
        {
            Request.EnableBuffering();
            using var reader = new StreamReader(Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            // サイズ上限（256KB）を超える場合は拒否
            if (Encoding.UTF8.GetByteCount(body) > 262144)
            {
                _logger.LogWarning("Webhookリクエストがサイズ上限を超過: {Size} bytes", Encoding.UTF8.GetByteCount(body));
                throw new InvalidOperationException("Payload too large");
            }
            Request.Body.Position = 0;
            return body;
        }

        /// <summary>
        /// ストアのサブスクリプションをキャンセル
        /// </summary>
        private async Task CancelStoreSubscription(string shopDomain)
        {
            try
            {
                _logger.LogInformation("サブスクリプションをキャンセル. Shop: {Shop}", shopDomain);

                // ストアを検索
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shopDomain);
                if (store == null)
                {
                    _logger.LogWarning("ストアが見つかりません. Shop: {Shop}", shopDomain);
                    return;
                }

                // まずShopify側/ローカル双方を内包するサービス経由でキャンセル（冪等）
                using (var scope = _serviceProvider.CreateScope())
                {
                    var subscriptionService = scope.ServiceProvider.GetRequiredService<ISubscriptionService>();
                    var result = await subscriptionService.CancelSubscriptionAsync(store.Id);
                    if (!result.Success)
                    {
                        _logger.LogWarning("サービス経由のキャンセルに失敗したためローカル更新を試行. Shop: {Shop}", shopDomain);

                        // フォールバック: ローカルのみキャンセル
                        var activeSubscription = await _context.StoreSubscriptions
                            .Where(s => s.StoreId == store.Id && (s.Status == "ACTIVE" || s.Status == "PENDING"))
                            .FirstOrDefaultAsync();
                        if (activeSubscription != null)
                        {
                            activeSubscription.Status = "CANCELLED";
                            activeSubscription.CancelledAt = DateTime.UtcNow;
                            activeSubscription.UpdatedAt = DateTime.UtcNow;
                            await _context.SaveChangesAsync();
                            _logger.LogInformation("ローカルのみキャンセル完了. Shop: {Shop}, SubscriptionId: {SubId}", shopDomain, activeSubscription.Id);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "サブスクリプションキャンセル中にエラー. Shop: {Shop}", shopDomain);
                // エラーを再スローして上位でハンドリング
                throw;
            }
        }

        /// <summary>
        /// データ削除をスケジュールする
        /// </summary>
        private async Task ScheduleDataDeletion(string shopDomain, int daysToDelete)
        {
            _logger.LogInformation("データ削除をスケジュール. Shop: {Shop}, Days: {Days}", shopDomain, daysToDelete);

            // ストアを非アクティブ化
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shopDomain);
            if (store != null)
            {
                // 元のDomainをSettingsに保存（再インストール時の検索用）
                var settings = string.IsNullOrEmpty(store.Settings) 
                    ? new Dictionary<string, object>() 
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(store.Settings) ?? new Dictionary<string, object>();
                
                settings["OriginalDomain"] = store.Domain; // 元のDomainを保存
                settings["UninstalledAt"] = DateTime.UtcNow;
                settings["ScheduledDeletionDate"] = DateTime.UtcNow.AddDays(daysToDelete);
                
                // ストアを非アクティブ化
                store.IsActive = false;
                store.UpdatedAt = DateTime.UtcNow;
                
                // Domainを無効化（再インストール時に既存レコードが見つからないようにする）
                // ただし、レコードは残す（削除と同じ扱いにするため）
                store.Domain = $"{store.Domain}_uninstalled_{DateTime.UtcNow:yyyyMMddHHmmss}";
                
                // AccessTokenをクリア（セキュリティのため）
                store.AccessToken = null;
                
                store.Settings = JsonSerializer.Serialize(settings);
                
                await _context.SaveChangesAsync();
                
                // 開発環境では即座に削除（本番環境ではHangfireでスケジュールすべき）
                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" || daysToDelete == 0)
                {
                    _logger.LogWarning("開発環境のため、即座にデータを削除します. Shop: {Shop}", shopDomain);
                    await _dataCleanupService.DeleteStoreDataAsync(shopDomain);
                }
                else
                {
                    // TODO: 本番環境ではHangfireでスケジュール
                    _logger.LogInformation("本番環境では{Days}日後にデータを削除します. Shop: {Shop}", daysToDelete, shopDomain);
                }
            }
        }

        /// <summary>
        /// 顧客データ削除をスケジュールする
        /// </summary>
        private async Task ScheduleCustomerDataDeletion(string shopDomain, long customerId, int daysToDelete)
        {
            _logger.LogInformation("顧客データ削除をスケジュール. Shop: {Shop}, CustomerId: {CustomerId}, Days: {Days}", 
                shopDomain, customerId, daysToDelete);

            // Webhook履歴を記録
            await LogWebhookEvent(shopDomain, "customers/redact", new { customerId, daysToDelete });
            
            // 開発環境では即座に削除（本番環境ではHangfireでスケジュールすべき）
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" || daysToDelete == 0)
            {
                _logger.LogWarning("開発環境のため、即座に顧客データを削除します. Shop: {Shop}, CustomerId: {CustomerId}", shopDomain, customerId);
                await _dataCleanupService.DeleteCustomerDataAsync(shopDomain, customerId);
            }
            else
            {
                // TODO: 本番環境ではHangfireでスケジュール
                _logger.LogInformation("本番環境では{Days}日後に顧客データを削除します. Shop: {Shop}, CustomerId: {CustomerId}", daysToDelete, shopDomain, customerId);
            }
        }

        /// <summary>
        /// ショップデータ削除をスケジュールする
        /// </summary>
        private async Task ScheduleShopDataDeletion(string shopDomain, int daysToDelete)
        {
            // TODO: Azure Service BusまたはHangfireでスケジュール
            _logger.LogInformation("ショップデータ削除をスケジュール. Shop: {Shop}, Days: {Days}", 
                shopDomain, daysToDelete);

            // Webhook履歴を記録
            await LogWebhookEvent(shopDomain, "shop/redact", new { daysToDelete });
        }

        /// <summary>
        /// 顧客データエクスポートをスケジュールする
        /// </summary>
        private async Task ScheduleCustomerDataExport(string shopDomain, long customerId, long requestId)
        {
            // TODO: Azure Service BusまたはHangfireでスケジュール
            _logger.LogInformation("顧客データエクスポートをスケジュール. Shop: {Shop}, CustomerId: {CustomerId}, RequestId: {RequestId}", 
                shopDomain, customerId, requestId);

            // Webhook履歴を記録
            await LogWebhookEvent(shopDomain, "customers/data_request", new { customerId, requestId });
        }

        /// <summary>
        /// サブスクリプション更新を処理する
        /// </summary>
        private async Task ProcessSubscriptionUpdate(AppSubscriptionWebhook webhook)
        {
            if (webhook?.AppSubscription == null) return;

            try
            {
                // ChargeIDからストアを特定
                var chargeIdString = webhook.AppSubscription.AdminGraphqlApiId?.Replace("gid://shopify/AppSubscription/", "");
                if (!long.TryParse(chargeIdString, out var chargeId))
                {
                    _logger.LogWarning("無効なChargeId: {ChargeId}", webhook.AppSubscription.AdminGraphqlApiId);
                    return;
                }

                var subscription = await _context.StoreSubscriptions
                    .Include(s => s.Store)
                    .FirstOrDefaultAsync(s => s.ShopifyChargeId == chargeId);

                if (subscription == null)
                {
                    _logger.LogWarning("サブスクリプションが見つかりません. ChargeId: {ChargeId}", chargeId);
                    return;
                }

                // 以前のステータスを保存
                var previousStatus = subscription.Status;
                var previousPlanName = subscription.PlanName;

                // ステータスを更新
                subscription.Status = webhook.AppSubscription.Status?.ToLower() ?? "unknown";
                subscription.UpdatedAt = DateTime.UtcNow;

                // プラン名を更新
                if (!string.IsNullOrEmpty(webhook.AppSubscription.Name))
                {
                    subscription.PlanName = webhook.AppSubscription.Name;
                }

                // トライアル期間の更新
                if (webhook.AppSubscription.TrialDays.HasValue)
                {
                    subscription.TrialEndsAt = subscription.CreatedAt.AddDays(webhook.AppSubscription.TrialDays.Value);
                }

                // 現在の期間終了日を更新
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
                    var memoryCache = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>();
                    
                    var storeId = subscription.StoreId.ToString();
                    
                    // 無料プランへのダウングレードを検出
                    if (IsDowngradeToFree(previousPlanName, webhook.AppSubscription.Name, previousStatus, subscription.Status))
                    {
                        _logger.LogInformation("無料プランへのダウングレードを検出. StoreId: {StoreId}", storeId);
                        
                        // 最後に選択された機能のみを有効化
                        var selectedFeatures = await featureService.GetSelectedFeaturesAsync(storeId);
                        if (selectedFeatures != null && selectedFeatures.Any())
                        {
                            // 最新の1機能のみを保持
                            var latestFeature = selectedFeatures.Last();
                            await featureService.UpdateSelectedFeaturesAsync(storeId, new[] { latestFeature });
                            
                            _logger.LogInformation("無料プランの機能制限を適用. StoreId: {StoreId}, Feature: {Feature}", 
                                storeId, latestFeature);
                        }
                    }
                    // 有料プランへのアップグレードを検出
                    else if (IsUpgradeToPaid(previousPlanName, webhook.AppSubscription.Name, previousStatus, subscription.Status))
                    {
                        _logger.LogInformation("有料プランへのアップグレードを検出. StoreId: {StoreId}", storeId);
                        
                        // 全機能を即座に解放（全機能を選択状態にする）
                        var allFeatures = FeatureConstants.FreeSelectableFeatures
                            .Select(f => new AvailableFeature 
                            { 
                                FeatureId = f,
                                DisplayName = FeatureConstants.FeatureDisplayNames[f],
                                Description = FeatureConstants.FeatureDescriptions[f],
                                IsAccessible = true
                            });
                        await featureService.UpdateSelectedFeaturesAsync(storeId, allFeatures);
                        
                        _logger.LogInformation("有料プランの全機能を解放. StoreId: {StoreId}", storeId);
                    }
                    
                    // キャッシュをクリア
                    memoryCache.Remove($"feature_access_{storeId}");
                    memoryCache.Remove($"feature_selection_{storeId}");
                }

                // Webhookイベントを記録
                await LogWebhookEvent(subscription.Store?.Domain ?? "", "app_subscriptions/update", webhook);

                _logger.LogInformation("サブスクリプション更新完了. StoreId: {StoreId}, Status: {Status}, Plan: {Plan}", 
                    subscription.StoreId, subscription.Status, subscription.PlanName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "サブスクリプション更新処理中にエラー");
            }
        }

        /// <summary>
        /// 無料プランへのダウングレードかどうかを判定
        /// </summary>
        private bool IsDowngradeToFree(string previousPlan, string newPlan, string previousStatus, string newStatus)
        {
            // プラン名で判定
            var isFreeNow = string.Equals(newPlan, "Free", StringComparison.OrdinalIgnoreCase);
            var wasPaidBefore = !string.Equals(previousPlan, "Free", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(previousPlan);
            
            // ステータスで判定（ACTIVEからキャンセルへ）
            var wasActive = string.Equals(previousStatus, "active", StringComparison.OrdinalIgnoreCase);
            var isCancelled = string.Equals(newStatus, "cancelled", StringComparison.OrdinalIgnoreCase);
            
            return (isFreeNow && wasPaidBefore) || (wasActive && isCancelled);
        }

        /// <summary>
        /// 有料プランへのアップグレードかどうかを判定
        /// </summary>
        private bool IsUpgradeToPaid(string previousPlan, string newPlan, string previousStatus, string newStatus)
        {
            // プラン名で判定
            var isPaidNow = !string.Equals(newPlan, "Free", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(newPlan);
            var wasFreeBefore = string.Equals(previousPlan, "Free", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(previousPlan);
            
            // ステータスで判定（非アクティブからACTIVEへ）
            var isActiveNow = string.Equals(newStatus, "active", StringComparison.OrdinalIgnoreCase);
            
            return (isPaidNow && wasFreeBefore) || (isPaidNow && isActiveNow);
        }

        /// <summary>
        /// サブスクリプションキャンセルを処理する
        /// </summary>
        private async Task ProcessSubscriptionCancel(AppSubscriptionWebhook webhook)
        {
            if (webhook?.AppSubscription == null) return;

            try
            {
                // ChargeIDからストアを特定
                var chargeIdString = webhook.AppSubscription.AdminGraphqlApiId?.Replace("gid://shopify/AppSubscription/", "");
                if (!long.TryParse(chargeIdString, out var chargeId))
                {
                    _logger.LogWarning("無効なChargeId: {ChargeId}", webhook.AppSubscription.AdminGraphqlApiId);
                    return;
                }

                var subscription = await _context.StoreSubscriptions
                    .Include(s => s.Store)
                    .FirstOrDefaultAsync(s => s.ShopifyChargeId == chargeId);

                if (subscription == null)
                {
                    _logger.LogWarning("サブスクリプションが見つかりません. ChargeId: {ChargeId}", chargeId);
                    return;
                }

                // ステータスをキャンセルに更新
                subscription.Status = "cancelled";
                subscription.CancelledAt = DateTime.UtcNow;
                subscription.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Webhookイベントを記録
                await LogWebhookEvent(subscription.Store?.Domain ?? "", "app_subscriptions/cancel", webhook);

                _logger.LogInformation("サブスクリプションキャンセル完了. StoreId: {StoreId}", subscription.StoreId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "サブスクリプションキャンセル処理中にエラー");
            }
        }

        /// <summary>
        /// Webhookイベントをログに記録する
        /// </summary>
        private async Task LogWebhookEvent(string shopDomain, string topic, object payload)
        {
            try
            {
                // ストアID解決
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shopDomain);
                var storeId = store?.Id ?? 0;

                var serialized = JsonSerializer.Serialize(payload);
                var idempotencyKey = GenerateWebhookIdempotencyKey(shopDomain, topic, serialized);

                // 既存チェック（冪等）
                var exists = await _context.WebhookEvents.AnyAsync(w => w.IdempotencyKey == idempotencyKey);
                if (exists)
                {
                    _logger.LogInformation("Webhookイベントは既に記録済み（冪等）. Key: {Key}", idempotencyKey);
                    return;
                }

                // WebhookEventsテーブルに記録（UPSERT相当: 事前チェック + ユニーク制約）
                var webhookEvent = new WebhookEvent
                {
                    StoreId = storeId,
                    ShopDomain = shopDomain,
                    Topic = topic,
                    Payload = serialized,
                    ProcessedAt = DateTime.UtcNow,
                    Status = "processed",
                    IdempotencyKey = idempotencyKey,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Add(webhookEvent);
                await _context.SaveChangesAsync();

                var correlationId = LoggingHelper.GetOrCreateCorrelationId(HttpContext);
                var requestId = LoggingHelper.GetOrCreateRequestId(HttpContext);
                _logger.LogInformation(
                    "WebhookEvent 記録 StoreId={StoreId} Shop={Shop} Topic={Topic} WebhookId={WebhookId} IdempotencyKey={IdempotencyKey} Result={Result} CorrelationId={CorrelationId} RequestId={RequestId}",
                    storeId,
                    shopDomain,
                    topic,
                    Request.Headers["X-Shopify-Webhook-Id"].ToString(),
                    idempotencyKey,
                    "processed",
                    correlationId,
                    requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhookイベント記録中にエラー");
            }
        }

        /// <summary>
        /// 必須ヘッダ検証とトピック許可リストチェック
        /// </summary>
        private bool ValidateRequiredHeaders(string expectedTopic, out string topic, out string shopDomain, out string webhookId)
        {
            topic = Request.Headers["X-Shopify-Topic"].ToString();
            shopDomain = Request.Headers["X-Shopify-Shop-Domain"].ToString();
            webhookId = Request.Headers["X-Shopify-Webhook-Id"].ToString();

            if (string.IsNullOrWhiteSpace(topic) || string.IsNullOrWhiteSpace(shopDomain) || string.IsNullOrWhiteSpace(webhookId))
            {
                _logger.LogWarning("必須ヘッダ欠落 topic={Topic} shop={Shop} webhookId={WebhookId}", topic, shopDomain, webhookId);
                return false;
            }

            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "app/uninstalled",
                "customers/redact",
                "shop/redact",
                "customers/data_request",
                "app_subscriptions/update",
                "app_subscriptions/cancel"
            };

            if (!allowed.Contains(topic))
            {
                _logger.LogWarning("未許可トピック: {Topic}", topic);
                return false;
            }

            if (!string.Equals(topic, expectedTopic, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("トピックとエンドポイント不一致: expected={Expected} actual={Actual}", expectedTopic, topic);
                return false;
            }

            return true;
        }

        /// <summary>
        /// Webhookイベント用の冪等性キーを生成
        /// 推奨: hash(StoreDomain + Topic + created_at + X-Shopify-Webhook-Id)
        /// </summary>
        private string GenerateWebhookIdempotencyKey(string shopDomain, string topic, string payloadJson)
        {
            string createdAt = string.Empty;
            try
            {
                var json = JsonSerializer.Deserialize<JsonElement>(payloadJson);
                if (json.ValueKind == JsonValueKind.Object && json.TryGetProperty("created_at", out var created))
                {
                    createdAt = created.GetRawText();
                }
            }
            catch
            {
                // ignore parse issues
            }

            var webhookId = Request.Headers.TryGetValue("X-Shopify-Webhook-Id", out var headerVal)
                ? headerVal.ToString()
                : string.Empty;

            var seed = $"{shopDomain}|{topic}|{createdAt}|{webhookId}";
            using var sha = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(seed);
            var hash = sha.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        // Webhook用のDTOクラス
        private class ShopifyWebhook
        {
            public string? Domain { get; set; }
            public long Id { get; set; }
        }

        private class CustomerRedactWebhook
        {
            public string? ShopDomain { get; set; }
            public CustomerInfo? Customer { get; set; }
            public List<long>? OrdersToRedact { get; set; }
        }

        private class CustomerDataRequestWebhook
        {
            public string? ShopDomain { get; set; }
            public CustomerInfo? Customer { get; set; }
            public DataRequestInfo? DataRequest { get; set; }
        }

        private class CustomerInfo
        {
            public long Id { get; set; }
            public string? Email { get; set; }
            public string? Phone { get; set; }
        }

        private class DataRequestInfo
        {
            public long Id { get; set; }
        }

        private class AppSubscriptionWebhook
        {
            public AppSubscriptionInfo? AppSubscription { get; set; }
        }

        private class AppSubscriptionInfo
        {
            public string? AdminGraphqlApiId { get; set; }
            public string? Name { get; set; }
            public string? Status { get; set; }
            public string? CurrentPeriodEnd { get; set; }
            public int? TrialDays { get; set; }
            public bool Test { get; set; }
            public decimal? Price { get; set; }
            public string? CurrencyCode { get; set; }
        }
    }
}