using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using System.Net.Http;
using System.Text.Json;

namespace ShopifyAzureFunctionsSample
{
    public class HelloShopify
    {
        private readonly ILogger<HelloShopify> _logger;
        private readonly TelemetryClient _telemetryClient;
        private readonly HttpClient _httpClient;

        public HelloShopify(
            ILogger<HelloShopify> logger,
            TelemetryClient telemetryClient,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _telemetryClient = telemetryClient;
            _httpClient = httpClientFactory.CreateClient("ShopifyClient");
        }

        [Function("HelloShopify")]
        public async Task Run([TimerTrigger("0 */30 * * * *")] TimerInfo myTimer)
        {
            var startTime = DateTime.UtcNow;
            _logger.LogInformation("Hello Shopify timer trigger executed at: {time}", startTime);

            // Application Insightsにカスタムイベントを送信
            _telemetryClient.TrackEvent("HelloShopifyTriggered", new Dictionary<string, string>
            {
                { "ExecutionTime", startTime.ToString("yyyy-MM-dd HH:mm:ss") },
                { "IsPastDue", myTimer.IsPastDue.ToString() }
            });

            try
            {
                // Shopify API呼び出しのサンプル（実際の認証は省略）
                await CallShopifyApiSample();

                // 処理時間の記録
                var duration = DateTime.UtcNow - startTime;
                _telemetryClient.TrackMetric("HelloShopifyDuration", duration.TotalMilliseconds);

                _logger.LogInformation("Hello Shopify function completed successfully. Duration: {duration}ms", 
                    duration.TotalMilliseconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in HelloShopify function");
                
                // Application Insightsに例外を記録
                _telemetryClient.TrackException(ex, new Dictionary<string, string>
                {
                    { "FunctionName", "HelloShopify" },
                    { "ExecutionTime", startTime.ToString("yyyy-MM-dd HH:mm:ss") }
                });

                throw; // 例外を再スローして、Azure Functionsランタイムに通知
            }
        }

        private async Task CallShopifyApiSample()
        {
            var shopDomain = Environment.GetEnvironmentVariable("ShopifyDomain") ?? "test-shop.myshopify.com";
            
            _logger.LogInformation("Calling Shopify API for shop: {shopDomain}", shopDomain);

            try
            {
                // 実際のShopify APIエンドポイント（認証なしでアクセス可能なものは限定的）
                // 本番環境では適切な認証ヘッダーを追加する必要があります
                var url = $"https://{shopDomain}/admin/api/2024-01/shop.json";
                
                // 注: このサンプルでは認証を実装していないため、実際のAPIコールはコメントアウト
                // var response = await _httpClient.GetAsync(url);
                
                // サンプルとして、模擬的な処理を実行
                await Task.Delay(100); // API呼び出しをシミュレート
                
                _logger.LogInformation("Shopify API call simulation completed");

                // カスタムメトリクスの記録
                _telemetryClient.TrackEvent("ShopifyApiCalled", new Dictionary<string, string>
                {
                    { "ShopDomain", shopDomain },
                    { "ApiVersion", "2024-01" },
                    { "Status", "Simulated" }
                });
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "HTTP error when calling Shopify API");
                throw new Exception($"Failed to call Shopify API for {shopDomain}", httpEx);
            }
            catch (TaskCanceledException tcEx)
            {
                _logger.LogError(tcEx, "Timeout when calling Shopify API");
                throw new Exception($"Timeout calling Shopify API for {shopDomain}", tcEx);
            }
        }
    }

    // Timer trigger info
    public class TimerInfo
    {
        public TimerSchedule? Schedule { get; set; }
        public ScheduleStatus? ScheduleStatus { get; set; }
        public bool IsPastDue { get; set; }
    }

    public class TimerSchedule
    {
        public bool AdjustForDST { get; set; }
    }

    public class ScheduleStatus
    {
        public DateTime Last { get; set; }
        public DateTime Next { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}