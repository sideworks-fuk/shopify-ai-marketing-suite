using Microsoft.AspNetCore.Mvc;
using ShopifyTestApi.Models;
using ShopifyTestApi.Services;
using ShopifyTestApi.Helpers;

namespace ShopifyTestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseController : ControllerBase
    {
        private readonly IPurchaseCountAnalysisService _purchaseCountAnalysisService;
        private readonly ILogger<PurchaseController> _logger;

        public PurchaseController(
            IPurchaseCountAnalysisService purchaseCountAnalysisService,
            ILogger<PurchaseController> logger)
        {
            _purchaseCountAnalysisService = purchaseCountAnalysisService;
            _logger = logger;
        }

        /// <summary>
        /// 購入回数分析データを取得
        /// GET: api/purchase/count-analysis
        /// </summary>
        [HttpGet("count-analysis")]
        public async Task<ActionResult<ApiResponse<PurchaseCountAnalysisResponse>>> GetPurchaseCountAnalysis(
            [FromQuery] PurchaseCountAnalysisRequest request)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("購入回数分析データ取得開始. StoreId: {StoreId}, Period: {StartDate} - {EndDate}, RequestId: {RequestId}",
                    request.StoreId, request.StartDate, request.EndDate, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetPurchaseCountAnalysis", logProperties);

                var result = await _purchaseCountAnalysisService.GetPurchaseCountAnalysisAsync(request);

                _logger.LogInformation("購入回数分析データ取得完了. DetailCount: {DetailCount}, TrendCount: {TrendCount}, RequestId: {RequestId}",
                    result.Details.Count, result.Trends.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<PurchaseCountAnalysisResponse>
                {
                    Success = true,
                    Data = result,
                    Message = "購入回数分析データを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数分析データ取得でエラーが発生. RequestId: {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<PurchaseCountAnalysisResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "購入回数分析データ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 購入回数分析サマリーを取得
        /// GET: api/purchase/count-summary
        /// </summary>
        [HttpGet("count-summary")]
        public async Task<ActionResult<ApiResponse<PurchaseCountSummary>>> GetPurchaseCountSummary(
            [FromQuery] int storeId = 1, 
            [FromQuery] int days = 365)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("購入回数サマリー取得開始. StoreId: {StoreId}, Days: {Days}, RequestId: {RequestId}",
                    storeId, days, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetPurchaseCountSummary", logProperties);

                var result = await _purchaseCountAnalysisService.GetPurchaseCountSummaryAsync(storeId, days);

                _logger.LogInformation("購入回数サマリー取得完了. TotalCustomers: {TotalCustomers}, RepeatRate: {RepeatRate}%, RequestId: {RequestId}",
                    result.TotalCustomers, result.RepeatCustomerRate, logProperties["RequestId"]);

                return Ok(new ApiResponse<PurchaseCountSummary>
                {
                    Success = true,
                    Data = result,
                    Message = "購入回数サマリーを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数サマリー取得でエラーが発生. RequestId: {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<PurchaseCountSummary>
                {
                    Success = false,
                    Data = null,
                    Message = "購入回数サマリー取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 購入回数トレンドデータを取得
        /// GET: api/purchase/count-trends
        /// </summary>
        [HttpGet("count-trends")]
        public async Task<ActionResult<ApiResponse<List<PurchaseCountTrend>>>> GetPurchaseCountTrends(
            [FromQuery] int storeId = 1, 
            [FromQuery] int months = 12)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("購入回数トレンド取得開始. StoreId: {StoreId}, Months: {Months}, RequestId: {RequestId}",
                    storeId, months, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetPurchaseCountTrends", logProperties);

                var result = await _purchaseCountAnalysisService.GetPurchaseCountTrendsAsync(storeId, months);

                _logger.LogInformation("購入回数トレンド取得完了. TrendCount: {TrendCount}, RequestId: {RequestId}",
                    result.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<List<PurchaseCountTrend>>
                {
                    Success = true,
                    Data = result,
                    Message = "購入回数トレンドデータを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数トレンド取得でエラーが発生. RequestId: {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<List<PurchaseCountTrend>>
                {
                    Success = false,
                    Data = null,
                    Message = "購入回数トレンドデータ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// セグメント別購入回数分析を取得
        /// GET: api/purchase/segment-analysis
        /// </summary>
        [HttpGet("segment-analysis")]
        public async Task<ActionResult<ApiResponse<SegmentAnalysisData>>> GetSegmentAnalysis(
            [FromQuery] int storeId = 1, 
            [FromQuery] string segment = "new")
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("セグメント別購入回数分析取得開始. StoreId: {StoreId}, Segment: {Segment}, RequestId: {RequestId}",
                    storeId, segment, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetSegmentAnalysis", logProperties);

                var result = await _purchaseCountAnalysisService.GetSegmentAnalysisAsync(storeId, segment);

                _logger.LogInformation("セグメント別購入回数分析取得完了. SegmentName: {SegmentName}, TotalCustomers: {TotalCustomers}, RequestId: {RequestId}",
                    result.SegmentName, result.Summary.TotalCustomers, logProperties["RequestId"]);

                return Ok(new ApiResponse<SegmentAnalysisData>
                {
                    Success = true,
                    Data = result,
                    Message = "セグメント別購入回数分析データを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント別購入回数分析取得でエラーが発生. RequestId: {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<SegmentAnalysisData>
                {
                    Success = false,
                    Data = null,
                    Message = "セグメント別購入回数分析データ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// API接続テスト用エンドポイント
        /// GET: api/purchase/test
        /// </summary>
        [HttpGet("test")]
        public ActionResult<ApiResponse<object>> TestConnection()
        {
            _logger.LogInformation("Purchase API connection test requested");

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    message = "Purchase API接続テスト成功！",
                    serverTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                    version = "1.0.0",
                    service = "PurchaseCountAnalysis",
                    availableEndpoints = new[]
                    {
                        "GET /api/purchase/count-analysis - 購入回数分析データ",
                        "GET /api/purchase/count-summary - 購入回数サマリー",
                        "GET /api/purchase/count-trends - 購入回数トレンド",
                        "GET /api/purchase/segment-analysis - セグメント別分析",
                        "GET /api/purchase/test - 接続テスト"
                    }
                },
                Message = "Purchase API は正常に動作しています。"
            });
        }

        /// <summary>
        /// 購入回数分析のクイック統計情報を取得
        /// GET: api/purchase/quick-stats
        /// </summary>
        [HttpGet("quick-stats")]
        public async Task<ActionResult<ApiResponse<object>>> GetQuickStats([FromQuery] int storeId = 1)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("購入回数クイック統計取得開始. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);

                var summary = await _purchaseCountAnalysisService.GetPurchaseCountSummaryAsync(storeId, 90);
                var trends = await _purchaseCountAnalysisService.GetPurchaseCountTrendsAsync(storeId, 3);

                var quickStats = new
                {
                    totalCustomers = summary.TotalCustomers,
                    totalOrders = summary.TotalOrders,
                    totalRevenue = summary.TotalRevenue,
                    averagePurchaseCount = summary.AveragePurchaseCount,
                    repeatCustomerRate = summary.RepeatCustomerRate,
                    multiPurchaseRate = summary.MultiPurchaseRate,
                    lastUpdate = DateTime.UtcNow,
                    period = summary.PeriodLabel,
                    recentTrends = trends.TakeLast(3).Select(t => new
                    {
                        period = t.PeriodLabel,
                        customers = t.TotalCustomers,
                        avgPurchaseCount = t.AveragePurchaseCount,
                        repeatRate = t.RepeatRate
                    })
                };

                _logger.LogInformation("購入回数クイック統計取得完了. TotalCustomers: {TotalCustomers}, RequestId: {RequestId}",
                    summary.TotalCustomers, logProperties["RequestId"]);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = quickStats,
                    Message = "購入回数クイック統計を正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数クイック統計取得でエラーが発生. RequestId: {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Data = null,
                    Message = "購入回数クイック統計取得中にエラーが発生しました。"
                });
            }
        }
    }
}