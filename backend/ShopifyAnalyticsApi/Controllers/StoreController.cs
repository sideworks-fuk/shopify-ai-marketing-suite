using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Helpers;

namespace ShopifyAnalyticsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class StoreController : ControllerBase
    {
        private readonly IStoreService _storeService;
        private readonly ILogger<StoreController> _logger;

        public StoreController(
            IStoreService storeService,
            ILogger<StoreController> logger)
        {
            _storeService = storeService;
            _logger = logger;
        }

        /// <summary>
        /// アクティブなストア一覧を取得
        /// GET: api/store
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<StoreListResponse>>> GetActiveStores()
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("Starting to retrieve active stores. RequestId: {RequestId}", 
                    logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetActiveStores", logProperties);

                var stores = await _storeService.GetActiveStoresAsync();

                var response = new StoreListResponse
                {
                    Stores = stores,
                    TotalCount = stores.Count
                };

                _logger.LogInformation("Completed retrieving active stores. Count: {Count}, RequestId: {RequestId}",
                    stores.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<StoreListResponse>
                {
                    Success = true,
                    Data = response,
                    Message = "Stores retrieved successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving stores. RequestId: {RequestId}", 
                    logProperties["RequestId"]);
                
                return StatusCode(500, new ApiResponse<StoreListResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "An error occurred while retrieving stores."
                });
            }
        }

        /// <summary>
        /// 指定IDのストア情報を取得
        /// GET: api/store/{id}
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<ApiResponse<StoreDetailResponse>>> GetStore(int id)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                _logger.LogInformation("Starting to retrieve store details. StoreId: {StoreId}, RequestId: {RequestId}", 
                    id, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetStore", logProperties);

                var response = await _storeService.GetStoreDetailAsync(id);

                _logger.LogInformation("Completed retrieving store details. StoreId: {StoreId}, RequestId: {RequestId}",
                    id, logProperties["RequestId"]);

                return Ok(new ApiResponse<StoreDetailResponse>
                {
                    Success = true,
                    Data = response,
                    Message = "Store information retrieved successfully."
                });
            }
            catch (KeyNotFoundException)
            {
                _logger.LogWarning("Store not found. StoreId: {StoreId}, RequestId: {RequestId}", 
                    id, logProperties["RequestId"]);
                
                return NotFound(new ApiResponse<StoreDetailResponse>
                {
                    Success = false,
                    Data = null,
                    Message = $"Store with ID {id} not found."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving store details. StoreId: {StoreId}, RequestId: {RequestId}", 
                    id, logProperties["RequestId"]);
                
                return StatusCode(500, new ApiResponse<StoreDetailResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "An error occurred while retrieving store information."
                });
            }
        }

        /// <summary>
        /// API接続テスト用エンドポイント
        /// GET: api/store/test
        /// </summary>
        [HttpGet("test")]
        public ActionResult<ApiResponse<object>> TestConnection()
        {
            _logger.LogInformation("Store API connection test requested");

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    message = "Store API connection test successful!",
                    serverTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                    version = "1.0.0",
                    service = "StoreService",
                    availableEndpoints = new[]
                    {
                        "GET /api/store - Get active stores",
                        "GET /api/store/{id} - Get store details",
                        "GET /api/store/test - Connection test"
                    }
                },
                Message = "Store API is working correctly."
            });
        }
    }
}