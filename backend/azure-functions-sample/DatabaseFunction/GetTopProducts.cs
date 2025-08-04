using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.ApplicationInsights;
using System.Net;
using DatabaseFunction.Services;

namespace DatabaseFunction
{
    public class GetTopProducts
    {
        private readonly ILogger<GetTopProducts> _logger;
        private readonly TelemetryClient _telemetryClient;
        private readonly IDatabaseService _databaseService;

        public GetTopProducts(
            ILogger<GetTopProducts> logger,
            TelemetryClient telemetryClient,
            IDatabaseService databaseService)
        {
            _logger = logger;
            _telemetryClient = telemetryClient;
            _databaseService = databaseService;
        }

        [Function("GetTopProducts")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "products/top")] HttpRequestData req)
        {
            var startTime = DateTime.UtcNow;
            _logger.LogInformation("GetTopProducts function triggered at: {time}", startTime);

            // リクエストからパラメータを取得
            var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
            var storeIdString = query["storeId"];
            var limitString = query["limit"];

            if (!int.TryParse(storeIdString, out int storeId))
            {
                storeId = 1; // デフォルト値
            }

            if (!int.TryParse(limitString, out int limit) || limit <= 0 || limit > 100)
            {
                limit = 10; // デフォルト値
            }

            try
            {
                // データベースから上位商品を取得
                var products = await _databaseService.GetTopProductsAsync(storeId, limit);

                // レスポンスの作成
                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new
                {
                    success = true,
                    data = new
                    {
                        products = products,
                        count = products.Count,
                        totalRevenue = products.Sum(p => p.TotalRevenue),
                        totalQuantity = products.Sum(p => p.TotalQuantity)
                    },
                    metadata = new
                    {
                        storeId = storeId,
                        limit = limit,
                        generatedAt = DateTime.UtcNow,
                        processingTimeMs = (DateTime.UtcNow - startTime).TotalMilliseconds
                    }
                });

                // メトリクスの記録
                _telemetryClient.TrackEvent("TopProductsRetrieved", new Dictionary<string, string>
                {
                    { "StoreId", storeId.ToString() },
                    { "ProductCount", products.Count.ToString() }
                });

                _logger.LogInformation("Top products retrieved successfully. Count: {count}", products.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving top products");
                
                _telemetryClient.TrackException(ex);

                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteAsJsonAsync(new
                {
                    success = false,
                    error = "An error occurred while retrieving top products",
                    message = ex.Message
                });

                return errorResponse;
            }
        }
    }
}