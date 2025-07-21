using Microsoft.AspNetCore.Mvc;
using ShopifyTestApi.Models;
using ShopifyTestApi.Services;

namespace ShopifyTestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerController : ControllerBase
    {
        private readonly IMockDataService _mockDataService;
        private readonly ILogger<CustomerController> _logger;

        public CustomerController(IMockDataService mockDataService, ILogger<CustomerController> logger)
        {
            _mockDataService = mockDataService;
            _logger = logger;
        }

        /// <summary>
        /// 顧客ダッシュボード用のすべてのデータを取得
        /// GET: api/customer/dashboard
        /// </summary>
        [HttpGet("dashboard")]
        public ActionResult<ApiResponse<CustomerDashboardData>> GetDashboardData()
        {
            try
            {
                _logger.LogInformation("Customer dashboard data requested");
                
                var data = _mockDataService.GetCustomerDashboardData();
                
                return Ok(new ApiResponse<CustomerDashboardData>
                {
                    Success = true,
                    Data = data,
                    Message = "顧客ダッシュボードデータを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving customer dashboard data");
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
                    availableEndpoints = new[]
                    {
                        "GET /api/customer/dashboard - 全ダッシュボードデータ",
                        "GET /api/customer/segments - 顧客セグメント",
                        "GET /api/customer/details - 顧客詳細一覧",
                        "GET /api/customer/details/{id} - 顧客詳細",
                        "GET /api/customer/top - トップ顧客",
                        "GET /api/customer/test - 接続テスト"
                    }
                },
                Message = "Customer API は正常に動作しています。"
            });
        }
    }
} 