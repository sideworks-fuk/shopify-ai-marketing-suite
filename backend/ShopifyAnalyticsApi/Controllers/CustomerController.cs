using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Dormant;
using ShopifyAnalyticsApi.Helpers;
using ShopifyAnalyticsApi.Data;

namespace ShopifyAnalyticsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CustomerController : StoreAwareControllerBase
    {
        private readonly IMockDataService _mockDataService;
        private readonly IDormantCustomerService _dormantCustomerService;
        private readonly ILogger<CustomerController> _logger;
        private readonly ShopifyDbContext _context;

        public CustomerController(
            IMockDataService mockDataService,
            IDormantCustomerService dormantCustomerService,
            ILogger<CustomerController> logger,
            ShopifyDbContext context)
        {
            _mockDataService = mockDataService;
            _dormantCustomerService = dormantCustomerService;
            _logger = logger;
            _context = context;
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
                // JWTから取得したStoreIdで上書き（セキュリティ対策）
                request.StoreId = this.StoreId;
                
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
        public async Task<ActionResult<ApiResponse<Models.DormantSummaryStats>>> GetDormantSummary([FromQuery] int storeId = 1)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);
            
            // JWTから取得したStoreIdを使用（セキュリティ対策）
            storeId = this.StoreId;
            logProperties["StoreId"] = storeId;

            try
            {
                _logger.LogInformation("Dormant customer summary requested. StoreId: {StoreId}", storeId);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetDormantSummary", logProperties);

                var summary = await _dormantCustomerService.GetDormantSummaryStatsAsync(storeId);

                _logger.LogInformation("Dormant customer summary retrieved successfully. StoreId: {StoreId}, TotalDormant: {TotalDormant}",
                    storeId, summary.TotalDormantCustomers);

                return Ok(new ApiResponse<Models.DormantSummaryStats>
                {
                    Success = true,
                    Data = summary,
                    Message = "休眠顧客サマリーを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dormant customer summary. StoreId: {StoreId}", storeId);
                return StatusCode(500, new ApiResponse<Models.DormantSummaryStats>
                {
                    Success = false,
                    Data = null,
                    Message = "休眠顧客サマリーの取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 詳細な期間別セグメントの件数を取得
        /// GET: api/customer/dormant/detailed-segments
        /// </summary>
        [HttpGet("dormant/detailed-segments")]
        public async Task<ActionResult<ApiResponse<List<DetailedSegmentDistribution>>>> GetDetailedSegments([FromQuery] int storeId = 1)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);
            
            // JWTから取得したStoreIdを使用（セキュリティ対策）
            storeId = this.StoreId;
            logProperties["StoreId"] = storeId;

            try
            {
                _logger.LogInformation("Detailed segment distributions requested. StoreId: {StoreId}", storeId);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetDetailedSegments", logProperties);

                var segments = await _dormantCustomerService.GetDetailedSegmentDistributionsAsync(storeId);

                // 全体の件数を計算して各セグメントに設定
                var totalCount = segments.Sum(s => s.Count);
                foreach (var segment in segments)
                {
                    segment.TotalCount = totalCount;
                }

                _logger.LogInformation("Detailed segment distributions retrieved successfully. StoreId: {StoreId}, SegmentCount: {SegmentCount}, TotalCount: {TotalCount}",
                    storeId, segments.Count, totalCount);

                return Ok(new ApiResponse<List<DetailedSegmentDistribution>>
                {
                    Success = true,
                    Data = segments,
                    Message = "詳細な期間別セグメント分布を正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving detailed segment distributions. StoreId: {StoreId}", storeId);
                return StatusCode(500, new ApiResponse<List<DetailedSegmentDistribution>>
                {
                    Success = false,
                    Data = null,
                    Message = "詳細な期間別セグメント分布の取得中にエラーが発生しました。"
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
        /// <summary>
        /// Store 2のデータ存在確認用デバッグエンドポイント
        /// GET: api/customer/debug/store-data
        /// </summary>
        [HttpGet("debug/store-data")]
        public async Task<IActionResult> GetStoreDataSummary([FromQuery] int storeId)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);
            
            // JWTから取得したStoreIdを使用（セキュリティ対策）
            storeId = this.StoreId;
            
            try
            {
                _logger.LogInformation("Store data debug requested. StoreId: {StoreId}, RequestId: {RequestId}", 
                    storeId, logProperties["RequestId"]);
                
                // Storeの存在確認
                var store = await _context.Stores.FindAsync(storeId);
                var storeInfo = store != null ? new
                {
                    store.Id,
                    store.Name,
                    store.DataType,
                    store.IsActive,
                    store.Description
                } : null;
                
                // 各テーブルのレコード数を取得
                var customerCount = await _context.Customers.CountAsync(c => c.StoreId == storeId);
                var productCount = await _context.Products.CountAsync(p => p.StoreId == storeId);
                var orderCount = await _context.Orders.CountAsync(o => o.StoreId == storeId);
                
                // サンプルデータ取得
                var sampleCustomers = await _context.Customers
                    .Where(c => c.StoreId == storeId)
                    .Take(5)
                    .Select(c => new { c.Id, c.FirstName, c.LastName, c.Email, c.TotalOrders, c.CreatedAt })
                    .ToListAsync();
                    
                var sampleOrders = await _context.Orders
                    .Where(o => o.StoreId == storeId)
                    .OrderByDescending(o => o.CreatedAt)
                    .Take(5)
                    .Join(_context.Customers,
                        o => o.CustomerId,
                        c => c.Id,
                        (o, c) => new 
                        { 
                            o.Id, 
                            o.OrderNumber, 
                            CustomerName = c.DisplayName,
                            o.TotalPrice, 
                            o.CreatedAt 
                        })
                    .ToListAsync();
                
                // 休眠顧客の計算（90日以上購入なし）
                var cutoffDate = DateTime.UtcNow.AddDays(-90);
                
                // デバッグ用：最新注文日の分布を確認
                var orderDateDistribution = await _context.Customers
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .Select(c => new
                    {
                        CustomerId = c.Id,
                        CustomerName = c.DisplayName,
                        LastOrderDate = _context.Orders
                            .Where(o => o.CustomerId == c.Id)
                            .OrderByDescending(o => o.CreatedAt)
                            .Select(o => (DateTime?)o.CreatedAt)
                            .FirstOrDefault()
                    })
                    .Take(10) // 上位10件のみ
                    .ToListAsync();
                
                var dormantQuery = from customer in _context.Customers
                                  where customer.StoreId == storeId && customer.TotalOrders > 0
                                  let lastOrderDate = _context.Orders
                                      .Where(o => o.CustomerId == customer.Id)
                                      .OrderByDescending(o => o.CreatedAt)
                                      .Select(o => (DateTime?)o.CreatedAt)
                                      .FirstOrDefault()
                                  where lastOrderDate.HasValue && lastOrderDate < cutoffDate
                                  select customer;
                                  
                var dormantCount = await dormantQuery.CountAsync();
                
                // 購入履歴のある顧客で最新注文日を持つ顧客数
                var customersWithOrders = await _context.Customers
                    .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                    .CountAsync();
                
                var summary = new
                {
                    StoreId = storeId,
                    Store = storeInfo,
                    DataCounts = new
                    {
                        Customers = customerCount,
                        Products = productCount,
                        Orders = orderCount,
                        DormantCustomers = dormantCount,
                        CustomersWithOrders = customersWithOrders
                    },
                    SampleData = new
                    {
                        Customers = sampleCustomers,
                        Orders = sampleOrders,
                        OrderDateDistribution = orderDateDistribution.Select(o => new
                        {
                            o.CustomerId,
                            o.CustomerName,
                            o.LastOrderDate,
                            DaysSinceLastOrder = o.LastOrderDate.HasValue 
                                ? (int)(DateTime.UtcNow - o.LastOrderDate.Value).TotalDays 
                                : -1,
                            IsDormant = o.LastOrderDate.HasValue && o.LastOrderDate < cutoffDate
                        })
                    },
                    DebugInfo = new
                    {
                        CurrentUtcTime = DateTime.UtcNow,
                        CutoffDateFor90Days = cutoffDate,
                        RequestId = logProperties["RequestId"],
                        OrderYearDistribution = await _context.Orders
                            .Where(o => o.StoreId == storeId)
                            .GroupBy(o => o.CreatedAt.Year)
                            .Select(g => new { Year = g.Key, Count = g.Count() })
                            .OrderBy(x => x.Year)
                            .ToListAsync()
                    }
                };
                
                _logger.LogInformation("Store data debug completed. Summary: {@Summary}", summary);
                
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = summary,
                    Message = $"Store {storeId} のデータサマリーを取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Store data debug error. StoreId: {StoreId}, RequestId: {RequestId}", 
                    storeId, logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = $"エラーが発生しました: {ex.Message}"
                });
            }
        }
    }
}