using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Hangfire;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Jobs;

namespace ShopifyAnalyticsApi.Controllers
{
    [ApiController]
    [Route("api/admin/data-retention")]
    [Authorize]
    public class DataRetentionController : ControllerBase
    {
        private readonly IDataRetentionService _retentionService;
        private readonly IBackgroundJobClient _backgroundJobClient;
        private readonly ILogger<DataRetentionController> _logger;

        public DataRetentionController(
            IDataRetentionService retentionService,
            IBackgroundJobClient backgroundJobClient,
            ILogger<DataRetentionController> logger)
        {
            _retentionService = retentionService;
            _backgroundJobClient = backgroundJobClient;
            _logger = logger;
        }

        [HttpGet("preview")]
        public async Task<IActionResult> Preview([FromQuery] int? storeId = null)
        {
            try
            {
                var result = await _retentionService.PreviewAsync(storeId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データ保持期間プレビューでエラー発生");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpPost("execute")]
        public async Task<IActionResult> Execute([FromBody] DataRetentionExecuteRequest? request = null)
        {
            try
            {
                _logger.LogInformation("データ保持期間削除API呼び出し. StoreId: {StoreId}", request?.StoreId);
                var result = await _retentionService.ExecuteAsync(request?.StoreId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データ保持期間削除でエラー発生");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        [HttpPost("enqueue")]
        public IActionResult Enqueue()
        {
            try
            {
                var jobId = _backgroundJobClient.Enqueue<DataRetentionJob>(
                    job => job.ExecuteRetentionCleanup());

                _logger.LogInformation("データ保持期間削除ジョブをキューに追加. JobId: {JobId}", jobId);

                return Ok(new
                {
                    message = "Data retention job enqueued",
                    jobId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データ保持期間削除ジョブのキュー追加でエラー発生");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }
    }

    public class DataRetentionExecuteRequest
    {
        public int? StoreId { get; set; }
    }
}
