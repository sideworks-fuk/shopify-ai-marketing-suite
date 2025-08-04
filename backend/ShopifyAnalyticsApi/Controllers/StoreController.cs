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
                _logger.LogInformation("アクティブなストア一覧取得開始. RequestId: {RequestId}", 
                    logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetActiveStores", logProperties);

                var stores = await _storeService.GetActiveStoresAsync();

                var response = new StoreListResponse
                {
                    Stores = stores,
                    TotalCount = stores.Count
                };

                _logger.LogInformation("アクティブなストア一覧取得完了. Count: {Count}, RequestId: {RequestId}",
                    stores.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<StoreListResponse>
                {
                    Success = true,
                    Data = response,
                    Message = "ストア一覧を正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア一覧取得でエラーが発生. RequestId: {RequestId}", 
                    logProperties["RequestId"]);
                
                return StatusCode(500, new ApiResponse<StoreListResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "ストア一覧の取得中にエラーが発生しました。"
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
                _logger.LogInformation("ストア詳細取得開始. StoreId: {StoreId}, RequestId: {RequestId}", 
                    id, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetStore", logProperties);

                var response = await _storeService.GetStoreDetailAsync(id);

                _logger.LogInformation("ストア詳細取得完了. StoreId: {StoreId}, RequestId: {RequestId}",
                    id, logProperties["RequestId"]);

                return Ok(new ApiResponse<StoreDetailResponse>
                {
                    Success = true,
                    Data = response,
                    Message = "ストア情報を正常に取得しました。"
                });
            }
            catch (KeyNotFoundException)
            {
                _logger.LogWarning("ストアが見つかりません. StoreId: {StoreId}, RequestId: {RequestId}", 
                    id, logProperties["RequestId"]);
                
                return NotFound(new ApiResponse<StoreDetailResponse>
                {
                    Success = false,
                    Data = null,
                    Message = $"指定されたID {id} のストアが見つかりません。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア詳細取得でエラーが発生. StoreId: {StoreId}, RequestId: {RequestId}", 
                    id, logProperties["RequestId"]);
                
                return StatusCode(500, new ApiResponse<StoreDetailResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "ストア情報の取得中にエラーが発生しました。"
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
                    message = "Store API接続テスト成功！",
                    serverTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                    version = "1.0.0",
                    service = "StoreService",
                    availableEndpoints = new[]
                    {
                        "GET /api/store - アクティブなストア一覧",
                        "GET /api/store/{id} - ストア詳細情報",
                        "GET /api/store/test - 接続テスト"
                    }
                },
                Message = "Store API は正常に動作しています。"
            });
        }
    }
}