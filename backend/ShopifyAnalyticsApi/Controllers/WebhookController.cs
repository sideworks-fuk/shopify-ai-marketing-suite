using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// Shopify Webhookを処理するコントローラー
    /// GDPR必須Webhook対応
    /// </summary>
    [ApiController]
    [Route("api/webhook")]
    [AllowAnonymous] // Webhookは認証なしでアクセス可能
    public class WebhookController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<WebhookController> _logger;
        private readonly ShopifyDbContext _context;
        private readonly IServiceProvider _serviceProvider;
        private readonly IDataCleanupService _dataCleanupService;

        public WebhookController(
            IConfiguration configuration,
            ILogger<WebhookController> logger,
            ShopifyDbContext context,
            IServiceProvider serviceProvider,
            IDataCleanupService dataCleanupService)
        {
            _configuration = configuration;
            _logger = logger;
            _context = context;
            _serviceProvider = serviceProvider;
            _dataCleanupService = dataCleanupService;
        }

        /// <summary>
        /// アプリがアンインストールされた時のWebhook
        /// 48時間以内にストアデータを削除する必要がある
        /// </summary>
        [HttpPost("uninstalled")]
        public async Task<IActionResult> AppUninstalled()
        {
            try
            {
                // HMAC検証
                if (!await VerifyWebhookRequest())
                {
                    _logger.LogWarning("HMAC検証失敗: app/uninstalled");
                    return Unauthorized();
                }

                // リクエストボディを読み取る
                var body = await GetRequestBodyAsync();
                var webhook = JsonSerializer.Deserialize<ShopifyWebhook>(body);

                if (webhook?.Domain == null)
                {
                    _logger.LogWarning("無効なWebhookペイロード: app/uninstalled");
                    return BadRequest();
                }

                _logger.LogInformation("アプリアンインストール通知受信. Shop: {Shop}", webhook.Domain);

                // 非同期でデータ削除処理をスケジュール
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ScheduleDataDeletion(webhook.Domain, 48);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "データ削除スケジュール中にエラー. Shop: {Shop}", webhook.Domain);
                    }
                });

                // 即座に200 OKを返す（5秒ルール）
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
            try
            {
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

                _logger.LogInformation("顧客データ削除要求受信. Shop: {Shop}, CustomerId: {CustomerId}", 
                    webhook.ShopDomain, webhook.Customer.Id);

                // 非同期で顧客データ削除処理をスケジュール
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ScheduleCustomerDataDeletion(webhook.ShopDomain, webhook.Customer.Id, 30);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "顧客データ削除スケジュール中にエラー. Shop: {Shop}", webhook.ShopDomain);
                    }
                });

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
            try
            {
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

                _logger.LogInformation("ショップデータ削除要求受信. Shop: {Shop}", webhook.Domain);

                // 非同期でショップデータ削除処理をスケジュール
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ScheduleShopDataDeletion(webhook.Domain, 90);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "ショップデータ削除スケジュール中にエラー. Shop: {Shop}", webhook.Domain);
                    }
                });

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
            try
            {
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

                _logger.LogInformation("顧客データ提供要求受信. Shop: {Shop}, CustomerId: {CustomerId}", 
                    webhook.ShopDomain, webhook.Customer.Id);

                // 非同期で顧客データエクスポート処理をスケジュール
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ScheduleCustomerDataExport(webhook.ShopDomain, webhook.Customer.Id, webhook.DataRequest.Id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "顧客データエクスポートスケジュール中にエラー. Shop: {Shop}", webhook.ShopDomain);
                    }
                });

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "customers/data_request Webhook処理中にエラー");
                return Ok();
            }
        }

        /// <summary>
        /// Webhook署名を検証する
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

                // HMACを計算
                var secret = _configuration["Shopify:WebhookSecret"];
                if (string.IsNullOrWhiteSpace(secret))
                {
                    _logger.LogError("Webhook秘密鍵が設定されていません");
                    return false;
                }

                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var computedHashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
                var computedHash = Convert.ToBase64String(computedHashBytes);

                // 比較
                return computedHash == receivedHmac.ToString();
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
            Request.Body.Position = 0;
            return body;
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
                store.IsActive = false;
                store.UpdatedAt = DateTime.UtcNow;
                
                // UninstalledAtを記録
                var settings = string.IsNullOrEmpty(store.Settings) 
                    ? new Dictionary<string, object>() 
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(store.Settings) ?? new Dictionary<string, object>();
                
                settings["UninstalledAt"] = DateTime.UtcNow;
                settings["ScheduledDeletionDate"] = DateTime.UtcNow.AddDays(daysToDelete);
                
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
        /// Webhookイベントをログに記録する
        /// </summary>
        private async Task LogWebhookEvent(string shopDomain, string topic, object payload)
        {
            try
            {
                // TODO: WebhookEventsテーブルに記録
                _logger.LogInformation("Webhookイベントを記録. Shop: {Shop}, Topic: {Topic}", shopDomain, topic);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhookイベント記録中にエラー");
            }
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
    }
}