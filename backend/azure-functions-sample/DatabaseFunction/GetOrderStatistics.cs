using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using System.Net;
using DatabaseFunction.Services;
using DatabaseFunction.Models;

namespace DatabaseFunction
{
    public class GetOrderStatistics
    {
        private readonly ILogger<GetOrderStatistics> _logger;
        private readonly TelemetryClient _telemetryClient;
        private readonly IDatabaseService _databaseService;

        public GetOrderStatistics(
            ILogger<GetOrderStatistics> logger,
            TelemetryClient telemetryClient,
            IDatabaseService databaseService)
        {
            _logger = logger;
            _telemetryClient = telemetryClient;
            _databaseService = databaseService;
        }

        [Function("GetOrderStatistics")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "orders/statistics")] HttpRequestData req)
        {
            var startTime = DateTime.UtcNow;
            _logger.LogInformation("GetOrderStatistics function triggered at: {time}", startTime);

            // リクエストからパラメータを取得
            var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
            var storeIdString = query["storeId"];
            var period = query["period"] ?? "30days";

            // Application Insightsにカスタムイベントを送信
            _telemetryClient.TrackEvent("OrderStatisticsRequested", new Dictionary<string, string>
            {
                { "StoreId", storeIdString ?? "all" },
                { "Period", period },
                { "RequestId", req.Headers.GetValues("X-Request-Id")?.FirstOrDefault() ?? Guid.NewGuid().ToString() }
            });

            try
            {
                // パラメータ検証
                if (!int.TryParse(storeIdString, out int storeId))
                {
                    storeId = 1; // デフォルト値
                }

                // データベースから統計情報を取得
                var statistics = await _databaseService.GetOrderStatisticsAsync(storeId, period);

                // レスポンスの作成
                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new
                {
                    success = true,
                    data = statistics,
                    metadata = new
                    {
                        storeId = storeId,
                        period = period,
                        generatedAt = DateTime.UtcNow,
                        processingTimeMs = (DateTime.UtcNow - startTime).TotalMilliseconds
                    }
                });

                // メトリクスの記録
                _telemetryClient.TrackMetric("OrderStatisticsProcessingTime", 
                    (DateTime.UtcNow - startTime).TotalMilliseconds);
                _telemetryClient.TrackMetric("OrderStatisticsRecordCount", 
                    statistics.OrderCount);

                _logger.LogInformation("Order statistics retrieved successfully. Orders: {count}, Revenue: {revenue}", 
                    statistics.OrderCount, statistics.TotalRevenue);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving order statistics");
                
                // Application Insightsに例外を記録
                _telemetryClient.TrackException(ex, new Dictionary<string, string>
                {
                    { "FunctionName", "GetOrderStatistics" },
                    { "StoreId", storeIdString ?? "unknown" },
                    { "Period", period }
                });

                // エラーレスポンス
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteAsJsonAsync(new
                {
                    success = false,
                    error = "An error occurred while retrieving order statistics",
                    message = ex.Message
                });

                return errorResponse;
            }
        }
    }
}