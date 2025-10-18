using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Hangfire;
using ShopifyAnalyticsApi.Jobs;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// HangFireジョブを管理するコントローラー
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // 認証が必要
    public class HangFireJobController : ControllerBase
    {
        private readonly ILogger<HangFireJobController> _logger;
        private readonly IBackgroundJobClient _backgroundJobClient;
        private readonly IRecurringJobManager _recurringJobManager;

        public HangFireJobController(
            ILogger<HangFireJobController> logger,
            IBackgroundJobClient backgroundJobClient,
            IRecurringJobManager recurringJobManager)
        {
            _logger = logger;
            _backgroundJobClient = backgroundJobClient;
            _recurringJobManager = recurringJobManager;
        }

        /// <summary>
        /// 特定のストアの商品同期ジョブを手動実行
        /// </summary>
        [HttpPost("sync-products/{storeId}")]
        public IActionResult TriggerProductSync(int storeId)
        {
            try
            {
                var jobId = _backgroundJobClient.Enqueue<ShopifyProductSyncJob>(
                    job => job.SyncProducts(storeId, null));
                
                _logger.LogInformation($"Product sync job queued for store {storeId}. Job ID: {jobId}");
                
                return Ok(new 
                { 
                    message = "Product sync job queued successfully",
                    jobId = jobId,
                    storeId = storeId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to queue product sync job for store {storeId}");
                return StatusCode(500, new { error = "Failed to queue sync job" });
            }
        }

        /// <summary>
        /// 全ストアの商品同期ジョブを手動実行
        /// </summary>
        [HttpPost("sync-all-products")]
        public IActionResult TriggerAllStoresProductSync()
        {
            try
            {
                var jobId = _backgroundJobClient.Enqueue<ShopifyProductSyncJob>(
                    job => job.SyncAllStoresProducts());
                
                _logger.LogInformation($"All stores product sync job queued. Job ID: {jobId}");
                
                return Ok(new 
                { 
                    message = "All stores product sync job queued successfully",
                    jobId = jobId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to queue all stores product sync job");
                return StatusCode(500, new { error = "Failed to queue sync job" });
            }
        }

        /// <summary>
        /// 定期ジョブを登録
        /// </summary>
        [HttpPost("register-recurring-jobs")]
        public IActionResult RegisterRecurringJobs()
        {
            try
            {
                // 毎時実行される商品同期ジョブを登録
                _recurringJobManager.AddOrUpdate<ShopifyProductSyncJob>(
                    "hourly-product-sync-all-stores",
                    job => job.SyncAllStoresProducts(),
                    Cron.Hourly);
                
                // 毎日深夜2時に実行される商品同期ジョブを登録
                _recurringJobManager.AddOrUpdate<ShopifyProductSyncJob>(
                    "daily-product-sync-all-stores",
                    job => job.SyncAllStoresProducts(),
                    "0 2 * * *"); // CRON式: 毎日2:00 AM
                
                _logger.LogInformation("Recurring jobs registered successfully");
                
                return Ok(new 
                { 
                    message = "Recurring jobs registered successfully",
                    jobs = new[]
                    {
                        new { id = "hourly-product-sync-all-stores", schedule = "Every hour" },
                        new { id = "daily-product-sync-all-stores", schedule = "Daily at 2:00 AM" }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to register recurring jobs");
                return StatusCode(500, new { error = "Failed to register recurring jobs" });
            }
        }

        /// <summary>
        /// 定期ジョブを削除
        /// </summary>
        [HttpDelete("recurring-job/{jobId}")]
        public IActionResult RemoveRecurringJob(string jobId)
        {
            try
            {
                _recurringJobManager.RemoveIfExists(jobId);
                
                _logger.LogInformation($"Recurring job {jobId} removed");
                
                return Ok(new 
                { 
                    message = "Recurring job removed successfully",
                    jobId = jobId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to remove recurring job {jobId}");
                return StatusCode(500, new { error = "Failed to remove recurring job" });
            }
        }

        /// <summary>
        /// テスト用のシンプルなジョブを実行
        /// </summary>
        [HttpPost("test-job")]
        [AllowAnonymous] // テスト用なので認証なしでアクセス可能
        public IActionResult TriggerTestJob()
        {
            try
            {
                var jobId = _backgroundJobClient.Enqueue(() => 
                    Console.WriteLine($"[HangFire Test Job] Executed at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"));
                
                _logger.LogInformation($"Test job queued. Job ID: {jobId}");
                
                return Ok(new 
                { 
                    message = "Test job queued successfully",
                    jobId = jobId,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to queue test job");
                return StatusCode(500, new { error = "Failed to queue test job" });
            }
        }
    }
}