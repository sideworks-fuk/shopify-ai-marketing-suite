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
using ShopifyAnalyticsApi.Jobs;
using Microsoft.Extensions.DependencyInjection;
using Hangfire;

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
            _logger.LogInformation("Webhook受信開始: app/uninstalled RemoteIp={RemoteIp}", HttpContext.Connection.RemoteIpAddress);
            try
            {
                // 必須ヘッダ/トピック検証
                if (!ValidateRequiredHeaders("app/uninstalled", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    _logger.LogWarning("Webhook拒否(ヘッダ検証失敗): app/uninstalled");
                    return Unauthorized();
                }

                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC verification failed: app/uninstalled");
                    return Unauthorized();
                }

                // リクエストボディを読み取る
                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<ShopifyWebhook>(body);
                var shopDomain = webhook?.GetEffectiveDomain();

                if (string.IsNullOrWhiteSpace(shopDomain))
                {
                    _logger.LogWarning("Invalid webhook payload: app/uninstalled. Domain not found in payload. BodyPreview={BodyPreview}", 
                        body.Length > 200 ? body.Substring(0, 200) : body);
                    return BadRequest();
                }

                var correlationId = LoggingHelper.GetOrCreateCorrelationId(HttpContext);
                var requestId = LoggingHelper.GetOrCreateRequestId(HttpContext);
                _logger.LogInformation("App uninstall notification received Shop={Shop} Topic={Topic} WebhookId={WebhookId} CorrelationId={CorrelationId} RequestId={RequestId}", shopDomain, topic, webhookId, correlationId, requestId);

                // Hangfireジョブとして実行（新しいDIスコープでDbContextが解決される）
                BackgroundJob.Enqueue<WebhookBackgroundJobs>(job => job.ProcessAppUninstalled(shopDomain, DateTime.UtcNow));

                // 即座に200 OKを返す（5秒ルール）
                started.Stop();
                _logger.LogInformation("app/uninstalled processing completed Shop={Shop} WebhookId={WebhookId} Result={Result} LatencyMs={Latency} CorrelationId={CorrelationId} RequestId={RequestId}", shopDomain, webhookId, "accepted", started.ElapsedMilliseconds, correlationId, requestId);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing app/uninstalled webhook");
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
            _logger.LogInformation("Webhook受信開始: customers/redact RemoteIp={RemoteIp}", HttpContext.Connection.RemoteIpAddress);
            try
            {
                if (!ValidateRequiredHeaders("customers/redact", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    _logger.LogWarning("Webhook拒否(ヘッダ検証失敗): customers/redact");
                    return Unauthorized();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: customers/redact");
                    return Unauthorized();
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

                // Hangfireジョブとして実行
                BackgroundJob.Enqueue<WebhookBackgroundJobs>(job => job.ProcessCustomersRedact(webhook.ShopDomain, body));

                started.Stop();
                _logger.LogInformation("customers/redact accepted Shop={Shop} WebhookId={WebhookId} LatencyMs={Latency}", webhook.ShopDomain, webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing customers/redact webhook");
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
            _logger.LogInformation("Webhook受信開始: shop/redact RemoteIp={RemoteIp}", HttpContext.Connection.RemoteIpAddress);
            try
            {
                if (!ValidateRequiredHeaders("shop/redact", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    _logger.LogWarning("Webhook拒否(ヘッダ検証失敗): shop/redact");
                    return Unauthorized();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: shop/redact");
                    return Unauthorized();
                }

                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<ShopifyWebhook>(body);

                if (webhook?.Domain == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: shop/redact");
                    return BadRequest();
                }

                _logger.LogInformation("ショップデータ削除要求受信 Shop={Shop} Topic={Topic} WebhookId={WebhookId}", webhook.Domain, topic, webhookId);

                // Hangfireジョブとして実行
                BackgroundJob.Enqueue<WebhookBackgroundJobs>(job => job.ProcessShopRedact(webhook.Domain, body));

                started.Stop();
                _logger.LogInformation("shop/redact accepted Shop={Shop} WebhookId={WebhookId} LatencyMs={Latency}", webhook.Domain, webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing shop/redact webhook");
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
            _logger.LogInformation("Webhook受信開始: customers/data_request RemoteIp={RemoteIp}", HttpContext.Connection.RemoteIpAddress);
            try
            {
                if (!ValidateRequiredHeaders("customers/data_request", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    _logger.LogWarning("Webhook拒否(ヘッダ検証失敗): customers/data_request");
                    return Unauthorized();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: customers/data_request");
                    return Unauthorized();
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

                // Hangfireジョブとして実行
                BackgroundJob.Enqueue<WebhookBackgroundJobs>(job => job.ProcessCustomersDataRequest(webhook.ShopDomain, body));

                started.Stop();
                _logger.LogInformation("customers/data_request accepted Shop={Shop} WebhookId={WebhookId} LatencyMs={Latency}", webhook.ShopDomain, webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing customers/data_request webhook");
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
            _logger.LogInformation("Webhook受信開始: app_subscriptions/update RemoteIp={RemoteIp}", HttpContext.Connection.RemoteIpAddress);
            try
            {
                if (!ValidateRequiredHeaders("app_subscriptions/update", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    _logger.LogWarning("Webhook拒否(ヘッダ検証失敗): app_subscriptions/update");
                    return Unauthorized();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: app_subscriptions/update");
                    return Unauthorized();
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

                // Hangfireジョブとして実行
                BackgroundJob.Enqueue<WebhookBackgroundJobs>(job => job.ProcessSubscriptionUpdate(body));

                started.Stop();
                _logger.LogInformation("subscriptions-update accepted WebhookId={WebhookId} LatencyMs={Latency}", webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing app_subscriptions/update webhook");
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
            _logger.LogInformation("Webhook受信開始: app_subscriptions/cancel RemoteIp={RemoteIp}", HttpContext.Connection.RemoteIpAddress);
            try
            {
                if (!ValidateRequiredHeaders("app_subscriptions/cancel", out var topic, out var shopDomainHeader, out var webhookId))
                {
                    _logger.LogWarning("Webhook拒否(ヘッダ検証失敗): app_subscriptions/cancel");
                    return Unauthorized();
                }
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: app_subscriptions/cancel");
                    return Unauthorized();
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

                // Hangfireジョブとして実行
                BackgroundJob.Enqueue<WebhookBackgroundJobs>(job => job.ProcessSubscriptionCancel(body));

                started.Stop();
                _logger.LogInformation("subscriptions-cancel accepted WebhookId={WebhookId} LatencyMs={Latency}", webhookId, started.ElapsedMilliseconds);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while processing app_subscriptions/cancel webhook");
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
                    _logger.LogWarning("HMAC signature header not found");
                    return false;
                }

                // リクエストボディを読み取る
                Request.EnableBuffering();
                var body = await GetRequestBodyAsync();
                Request.Body.Position = 0;

                // マルチアプリ対応: ストアドメインからShopifyAppを特定してWebhookSecretを取得
                string? secret = null;
                string secretSource = "none";
                
                // X-Shopify-Shop-Domainヘッダーからストアドメインを取得
                if (Request.Headers.TryGetValue("X-Shopify-Shop-Domain", out var shopDomainHeader))
                {
                    var shopDomain = shopDomainHeader.ToString();
                    _logger.LogInformation("HMAC検証開始: Shop={Shop}, HmacHeader={HmacPrefix}...", 
                        shopDomain, 
                        receivedHmac.ToString().Length > 10 ? receivedHmac.ToString().Substring(0, 10) : receivedHmac.ToString());
                    
                    if (!string.IsNullOrWhiteSpace(shopDomain))
                    {
                        // ストアからShopifyAppを取得
                        var store = await _context.Stores
                            .Include(s => s.ShopifyApp)
                            .FirstOrDefaultAsync(s => s.Domain == shopDomain);
                        
                        if (store == null)
                        {
                            _logger.LogWarning("HMAC検証: ストアがDBに存在しません Shop={Shop}", shopDomain);
                        }
                        else if (store.ShopifyApp == null)
                        {
                            _logger.LogWarning("HMAC検証: ストアにShopifyAppが紐づいていません Shop={Shop}, StoreId={StoreId}, ShopifyAppId={ShopifyAppId}", 
                                shopDomain, store.Id, store.ShopifyAppId);
                        }
                        else if (!store.ShopifyApp.IsActive)
                        {
                            _logger.LogWarning("HMAC検証: ShopifyAppが非アクティブです Shop={Shop}, App={App}", 
                                shopDomain, store.ShopifyApp.Name);
                        }
                        else
                        {
                            // ShopifyAppのApiSecretを使用（Webhook Secretは通常ApiSecretと同じ）
                            secret = store.ShopifyApp.ApiSecret;
                            secretSource = $"ShopifyApp:{store.ShopifyApp.Name}";
                            _logger.LogInformation("HMAC検証: SecretをShopifyAppから取得 Shop={Shop}, App={App}, SecretLength={SecretLength}", 
                                shopDomain, store.ShopifyApp.Name, secret?.Length ?? 0);
                        }
                    }
                }
                
                // フォールバック: 設定ファイルから取得
                if (string.IsNullOrWhiteSpace(secret))
                {
                    secret = _configuration["Shopify:WebhookSecret"];
                    if (!string.IsNullOrWhiteSpace(secret))
                    {
                        secretSource = "appsettings:Shopify:WebhookSecret";
                        _logger.LogInformation("HMAC検証: Secretをappsettingsから取得 SecretLength={SecretLength}", secret.Length);
                    }
                }
                
                if (string.IsNullOrWhiteSpace(secret))
                {
                    _logger.LogError("HMAC検証失敗: Webhook秘密鍵が設定されていません SecretSource={SecretSource}", secretSource);
                    return false;
                }

                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var computedHashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
                var computedHmacBase64 = Convert.ToBase64String(computedHashBytes);

                // 受信値をBase64デコード
                byte[] receivedHmacBytes;
                try
                {
                    receivedHmacBytes = Convert.FromBase64String(receivedHmac.ToString());
                }
                catch
                {
                    _logger.LogWarning("HMAC signature format is invalid");
                    return false;
                }

                if (receivedHmacBytes.Length != computedHashBytes.Length)
                {
                    _logger.LogWarning("HMAC検証失敗: 長さ不一致 Received={ReceivedLen}, Computed={ComputedLen}", 
                        receivedHmacBytes.Length, computedHashBytes.Length);
                    return false;
                }

                // 固定時間比較で検証
                var isValid = CryptographicOperations.FixedTimeEquals(computedHashBytes, receivedHmacBytes);
                
                if (!isValid)
                {
                    // デバッグ用: ボディの先頭100文字も出力
                    var bodyPreview = body.Length > 100 ? body.Substring(0, 100) + "..." : body;
                    _logger.LogWarning("HMAC検証失敗: 署名不一致 SecretSource={SecretSource}, ReceivedHmac={ReceivedHmac}, ComputedHmac={ComputedHmac}, BodyLength={BodyLength}, BodyPreview={BodyPreview}", 
                        secretSource,
                        receivedHmac.ToString(),
                        computedHmacBase64,
                        body.Length,
                        bodyPreview);
                }
                else
                {
                    _logger.LogInformation("HMAC検証成功: SecretSource={SecretSource}", secretSource);
                }
                
                return isValid;
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

        // CancelStoreSubscription → WebhookBackgroundJobs.ProcessAppUninstalled に移動

        // ScheduleDataDeletion, ScheduleCustomerDataDeletion, ScheduleShopDataDeletion,
        // ScheduleCustomerDataExport, ProcessSubscriptionUpdate, ProcessSubscriptionCancel,
        // IsDowngradeToFree, IsUpgradeToPaid
        // → WebhookBackgroundJobs に移動済み

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
            [System.Text.Json.Serialization.JsonPropertyName("domain")]
            public string? Domain { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("myshopify_domain")]
            public string? MyshopifyDomain { get; set; }
            
            [System.Text.Json.Serialization.JsonPropertyName("id")]
            public long Id { get; set; }
            
            /// <summary>
            /// 有効なドメインを取得（domain または myshopify_domain）
            /// </summary>
            public string? GetEffectiveDomain() => Domain ?? MyshopifyDomain;
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

        // AppSubscriptionWebhook, AppSubscriptionInfo → Models/WebhookModels.cs に移動済み
    }
}