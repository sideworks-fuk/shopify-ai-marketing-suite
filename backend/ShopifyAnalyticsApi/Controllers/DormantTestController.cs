using Microsoft.AspNetCore.Mvc;
using ShopifyAnalyticsApi.Services.Dormant;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 新しい分割されたDormantCustomerQueryServiceのテスト用コントローラー
    /// 本格運用前の動作確認とA/Bテスト用
    /// </summary>
    [ApiController]
    [Route("api/dormant-test")]
    public class DormantTestController : ControllerBase
    {
        private readonly IDormantCustomerQueryService _queryService;
        private readonly ILogger<DormantTestController> _logger;

        public DormantTestController(
            IDormantCustomerQueryService queryService,
            ILogger<DormantTestController> logger)
        {
            _queryService = queryService;
            _logger = logger;
        }

        /// <summary>
        /// 新しいクエリサービスの動作テスト
        /// </summary>
        [HttpGet("customers")]
        public async Task<ActionResult<PaginatedResult<DormantCustomerDto>>> GetDormantCustomers(
            [FromQuery] int storeId = 1,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string sortBy = "DaysSinceLastPurchase",
            [FromQuery] bool descending = false,
            [FromQuery] string? segment = null,
            [FromQuery] string? riskLevel = null,
            [FromQuery] decimal? minTotalSpent = null,
            [FromQuery] decimal? maxTotalSpent = null)
        {
            try
            {
                _logger.LogInformation("新しいDormantCustomerQueryServiceのテスト開始");

                var query = new DormantCustomerQuery
                {
                    StoreId = storeId,
                    PageNumber = pageNumber,
                    PageSize = pageSize,
                    SortBy = sortBy,
                    Descending = descending,
                    Filters = new DormantCustomerFilters
                    {
                        DormancySegment = segment,
                        RiskLevel = riskLevel,
                        MinTotalSpent = minTotalSpent,
                        MaxTotalSpent = maxTotalSpent
                    }
                };

                var result = await _queryService.GetDormantCustomersAsync(query);

                _logger.LogInformation("新しいサービステスト成功 取得件数: {Count}", result.Items.Count);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "新しいサービステストエラー");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// 特定顧客の休眠情報取得テスト
        /// </summary>
        [HttpGet("customers/{customerId}")]
        public async Task<ActionResult<DormantCustomerDto>> GetDormantCustomerById(int customerId)
        {
            try
            {
                _logger.LogInformation("休眠顧客詳細取得テスト開始 CustomerId: {CustomerId}", customerId);

                var result = await _queryService.GetDormantCustomerByIdAsync(customerId);

                if (result == null)
                {
                    return NotFound(new { message = "休眠顧客が見つかりません、または休眠状態ではありません" });
                }

                _logger.LogInformation("休眠顧客詳細取得テスト成功");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客詳細取得テストエラー CustomerId: {CustomerId}", customerId);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// 休眠顧客総数取得テスト
        /// </summary>
        [HttpGet("count")]
        public async Task<ActionResult<int>> GetDormantCustomerCount(
            [FromQuery] int storeId = 1,
            [FromQuery] string? segment = null,
            [FromQuery] decimal? minTotalSpent = null,
            [FromQuery] decimal? maxTotalSpent = null)
        {
            try
            {
                _logger.LogInformation("休眠顧客総数取得テスト開始 StoreId: {StoreId}", storeId);

                var filters = new DormantCustomerFilters
                {
                    DormancySegment = segment,
                    MinTotalSpent = minTotalSpent,
                    MaxTotalSpent = maxTotalSpent
                };

                var count = await _queryService.GetDormantCustomerCountAsync(storeId, filters);

                _logger.LogInformation("休眠顧客総数取得テスト成功 Count: {Count}", count);
                return Ok(count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客総数取得テストエラー StoreId: {StoreId}", storeId);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// パフォーマンステスト用エンドポイント
        /// </summary>
        [HttpGet("performance-test")]
        public async Task<ActionResult> PerformanceTest(
            [FromQuery] int iterations = 5,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                _logger.LogInformation("パフォーマンステスト開始 Iterations: {Iterations}", iterations);

                var results = new List<object>();

                for (int i = 0; i < iterations; i++)
                {
                    var stopwatch = System.Diagnostics.Stopwatch.StartNew();

                    var query = new DormantCustomerQuery
                    {
                        StoreId = 1,
                        PageNumber = 1,
                        PageSize = pageSize,
                        SortBy = "DaysSinceLastPurchase",
                        Descending = false
                    };

                    var result = await _queryService.GetDormantCustomersAsync(query);
                    stopwatch.Stop();

                    results.Add(new
                    {
                        iteration = i + 1,
                        elapsedMs = stopwatch.ElapsedMilliseconds,
                        itemCount = result.Items.Count,
                        totalItems = result.Pagination.TotalItems
                    });

                    _logger.LogInformation("パフォーマンステスト {Iteration}/{Total} 完了: {ElapsedMs}ms, Items: {ItemCount}",
                        i + 1, iterations, stopwatch.ElapsedMilliseconds, result.Items.Count);
                }

                var summary = new
                {
                    iterations = iterations,
                    pageSize = pageSize,
                    averageTimeMs = results.Average(r => ((dynamic)r).elapsedMs),
                    minTimeMs = results.Min(r => ((dynamic)r).elapsedMs),
                    maxTimeMs = results.Max(r => ((dynamic)r).elapsedMs),
                    results = results
                };

                _logger.LogInformation("パフォーマンステスト完了 平均: {AverageMs}ms", summary.averageTimeMs);

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "パフォーマンステストエラー");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}