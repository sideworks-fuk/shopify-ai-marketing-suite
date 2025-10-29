using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// Shopify埋め込みアプリ用のエンドポイント
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmbeddedAppController : StoreAwareControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmbeddedAppController> _logger;

        public EmbeddedAppController(
            IConfiguration configuration,
            ILogger<EmbeddedAppController> logger) : base(logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// 埋め込みアプリの設定情報を取得
        /// </summary>
        [HttpGet("config")]
        public IActionResult GetEmbeddedAppConfig()
        {
            try
            {
                var config = new
                {
                    apiKey = _configuration["Shopify:ApiKey"] ?? "",
                    host = Request.Headers["X-Shopify-Shop-Domain"].ToString(),
                    forceRedirect = true,
                    storeId = this.StoreId,
                    features = new
                    {
                        // アプリで利用可能な機能フラグ
                        dormantAnalysis = true,
                        yearOverYear = true,
                        purchaseCount = true,
                        monthlyStats = true
                    },
                    navigation = new
                    {
                        // ナビゲーションリンク設定
                        items = new[]
                        {
                            new { label = "ダッシュボード", destination = "/" },
                            new { label = "休眠顧客分析", destination = "/customer-analysis/dormant" },
                            new { label = "前年同月比", destination = "/product-analysis/year-over-year" },
                            new { label = "購入回数分析", destination = "/purchase-analysis/count" }
                        }
                    }
                };

                _logger.LogInformation("Embedded app config requested for store: {StoreId}", this.StoreId);
                return Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting embedded app config");
                return StatusCode(500, new { error = "Failed to retrieve app configuration" });
            }
        }

        /// <summary>
        /// アプリの初期化状態を確認
        /// </summary>
        [HttpGet("status")]
        public IActionResult GetAppStatus()
        {
            try
            {
                var status = new
                {
                    initialized = true,
                    storeId = this.StoreId,
                    authenticated = User.Identity?.IsAuthenticated ?? false,
                    tokenSource = User.Claims.FirstOrDefault(c => c.Type == "token_source")?.Value,
                    serverTime = DateTime.UtcNow
                };

                return Ok(status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting app status");
                return StatusCode(500, new { error = "Failed to retrieve app status" });
            }
        }

        /// <summary>
        /// Shopify App Bridge用のトースト通知テスト
        /// </summary>
        [HttpPost("test-notification")]
        public IActionResult TestNotification([FromBody] TestNotificationRequest request)
        {
            try
            {
                _logger.LogInformation("Test notification requested: {Message}", request.Message);
                
                return Ok(new
                {
                    success = true,
                    message = request.Message ?? "テスト通知が送信されました",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending test notification");
                return StatusCode(500, new { error = "Failed to send test notification" });
            }
        }
    }

    public class TestNotificationRequest
    {
        public string? Message { get; set; }
    }
}