using Microsoft.AspNetCore.Mvc;
using ShopifyTestApi.Models;
using ShopifyTestApi.Services;
using ShopifyTestApi.Helpers;

namespace ShopifyTestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerController : ControllerBase
    {
        private readonly IMockDataService _mockDataService;
        private readonly IDormantCustomerService _dormantCustomerService;
        private readonly ILogger<CustomerController> _logger;

        public CustomerController(
            IMockDataService mockDataService,
            IDormantCustomerService dormantCustomerService,
            ILogger<CustomerController> logger)
        {
            _mockDataService = mockDataService;
            _dormantCustomerService = dormantCustomerService;
            _logger = logger;
        }

        /// <summary>
        /// 顧客ダッシュボード用のすべてのデータを取得
        /// GET: api/customer/dashboard
        /// </summary>
        [HttpGet("dashboard")]
        public ActionResult<ApiResponse<CustomerDashboardData>> GetDashboardData()
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("Customer dashboard data requested. {RequestId}", logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetCustomerDashboardData", logProperties);

                var data = _mockDataService.GetCustomerDashboardData();

                _logger.LogInformation("Customer dashboard data retrieved successfully. {RequestId}, DataCount: {DataCount}",
                    logProperties["RequestId"], data?.CustomerSegments?.Count ?? 0);

                return Ok(new ApiResponse<CustomerDashboardData>
                {
                    Success = true,
                    Data = data,
                    Message = "顧客ダッシュボードデータを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving customer dashboard data. {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<CustomerDashboardData>
                {
                    Success = false,
                    Data = null,
                    Message = "データ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 顧客セグメントデータを取得
        /// GET: api/customer/segments
        /// </summary>
        [HttpGet("segments")]
        public ActionResult<ApiResponse<List<CustomerSegment>>> GetSegments()
        {
            try
            {
                _logger.LogInformation("Customer segments data requested");

                var segments = _mockDataService.GetCustomerSegments();

                return Ok(new ApiResponse<List<CustomerSegment>>
                {
                    Success = true,
                    Data = segments,
                    Message = "顧客セグメントデータを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving customer segments");
                return StatusCode(500, new ApiResponse<List<CustomerSegment>>
                {
                    Success = false,
                    Data = null,
                    Message = "セグメントデータ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 顧客詳細データ一覧を取得
        /// GET: api/customer/details
        /// </summary>
        [HttpGet("details")]
        public ActionResult<ApiResponse<List<CustomerDetail>>> GetCustomerDetails()
        {
            try
            {
                _logger.LogInformation("Customer details list requested");

                var details = _mockDataService.GetCustomerDetails();

                return Ok(new ApiResponse<List<CustomerDetail>>
                {
                    Success = true,
                    Data = details,
                    Message = "顧客詳細データを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving customer details");
                return StatusCode(500, new ApiResponse<List<CustomerDetail>>
                {
                    Success = false,
                    Data = null,
                    Message = "顧客詳細データ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 指定された顧客IDの詳細データを取得
        /// GET: api/customer/details/{customerId}
        /// </summary>
        [HttpGet("details/{customerId}")]
        public ActionResult<ApiResponse<CustomerDetail>> GetCustomerDetail(string customerId)
        {
            try
            {
                _logger.LogInformation("Customer detail requested for ID: {CustomerId}", customerId);

                var customer = _mockDataService.GetCustomerDetail(customerId);

                if (customer == null)
                {
                    return NotFound(new ApiResponse<CustomerDetail>
                    {
                        Success = false,
                        Data = null,
                        Message = $"顧客ID {customerId} が見つかりません。"
                    });
                }

                return Ok(new ApiResponse<CustomerDetail>
                {
                    Success = true,
                    Data = customer,
                    Message = "顧客詳細データを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving customer detail for ID: {CustomerId}", customerId);
                return StatusCode(500, new ApiResponse<CustomerDetail>
                {
                    Success = false,
                    Data = null,
                    Message = "顧客詳細データ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// トップ顧客データを取得
        /// GET: api/customer/top
        /// </summary>
        [HttpGet("top")]
        public ActionResult<ApiResponse<List<TopCustomer>>> GetTopCustomers()
        {
            try
            {
                _logger.LogInformation("Top customers data requested");

                var topCustomers = _mockDataService.GetTopCustomers();

                return Ok(new ApiResponse<List<TopCustomer>>
                {
                    Success = true,
                    Data = topCustomers,
                    Message = "トップ顧客データを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving top customers");
                return StatusCode(500, new ApiResponse<List<TopCustomer>>
                {
                    Success = false,
                    Data = null,
                    Message = "トップ顧客データ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// API接続テスト用エンドポイント
        /// GET: api/customer/test
        /// </summary>
        [HttpGet("test")]
        public ActionResult<ApiResponse<object>> TestConnection()
        {
            _logger.LogInformation("Customer API connection test requested");

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    message = "Customer API接続テスト成功！",
                    serverTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                    version = "1.1.0",
                    deploymentTest = "GitHub Actions CI/CD 自動デプロイテスト",
                    testTimestamp = "2025-07-21 14:00 JST",
                    availableEndpoints = new[]
                    {
                        "GET /api/customer/dashboard - 全ダッシュボードデータ",
                        "GET /api/customer/segments - 顧客セグメント",
                        "GET /api/customer/details - 顧客詳細一覧",
                        "GET /api/customer/details/{id} - 顧客詳細",
                        "GET /api/customer/top - トップ顧客",
                        "GET /api/customer/test - 接続テスト",
                        "GET /api/customer/dormant - 休眠顧客分析 (NEW!)"
                    }
                },
                Message = "Customer API は正常に動作しています。"
            });
        }

        // ==============================================
        // 休眠顧客分析API (Phase 1実装)
        // ==============================================

        /// <summary>
        /// 休眠顧客分析データを取得
        /// GET: api/customer/dormant
        /// </summary>
        [HttpGet("dormant")]
        public async Task<ActionResult<ApiResponse<DormantCustomerResponse>>> GetDormantCustomers([FromQuery] DormantCustomerRequest request)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("休眠顧客分析データ取得開始. StoreId: {StoreId}, Segment: {Segment}, RequestId: {RequestId}",
                    request.StoreId, request.Segment, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetDormantCustomers", logProperties);

                var result = await _dormantCustomerService.GetDormantCustomersAsync(request);

                _logger.LogInformation("休眠顧客分析データ取得完了. CustomerCount: {CustomerCount}, RequestId: {RequestId}",
                    result.Customers.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<DormantCustomerResponse>
                {
                    Success = true,
                    Data = result,
                    Message = "休眠顧客分析データを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客分析データ取得でエラーが発生. RequestId: {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<DormantCustomerResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "休眠顧客分析データ取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 休眠顧客サマリー統計を取得
        /// GET: api/customer/dormant/summary
        /// </summary>
        [HttpGet("dormant/summary")]
        public async Task<ActionResult<ApiResponse<DormantSummaryStats>>> GetDormantSummary([FromQuery] int storeId = 1)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("休眠顧客サマリー取得開始. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);

                var result = await _dormantCustomerService.GetDormantSummaryStatsAsync(storeId);

                _logger.LogInformation("休眠顧客サマリー取得完了. TotalDormant: {TotalDormant}, RequestId: {RequestId}",
                    result.TotalDormantCustomers, logProperties["RequestId"]);

                return Ok(new ApiResponse<DormantSummaryStats>
                {
                    Success = true,
                    Data = result,
                    Message = "休眠顧客サマリー統計を正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客サマリー取得でエラーが発生. RequestId: {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<DormantSummaryStats>
                {
                    Success = false,
                    Data = null,
                    Message = "休眠顧客サマリー統計取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 顧客の離脱確率を取得
        /// GET: api/customer/{customerId}/churn-probability
        /// </summary>
        [HttpGet("{customerId}/churn-probability")]
        public async Task<ActionResult<ApiResponse<decimal>>> GetChurnProbability(int customerId)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("離脱確率計算開始. CustomerId: {CustomerId}, RequestId: {RequestId}",
                    customerId, logProperties["RequestId"]);

                var result = await _dormantCustomerService.CalculateChurnProbabilityAsync(customerId);

                _logger.LogInformation("離脱確率計算完了. CustomerId: {CustomerId}, Probability: {Probability}, RequestId: {RequestId}",
                    customerId, result, logProperties["RequestId"]);

                return Ok(new ApiResponse<decimal>
                {
                    Success = true,
                    Data = result,
                    Message = "離脱確率を正常に計算しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "離脱確率計算でエラーが発生. CustomerId: {CustomerId}, RequestId: {RequestId}",
                    customerId, logProperties["RequestId"]);
                return StatusCode(500, new ApiResponse<decimal>
                {
                    Success = false,
                    Data = 0,
                    Message = "離脱確率計算中にエラーが発生しました。"
                });
            }
        }
    }
}