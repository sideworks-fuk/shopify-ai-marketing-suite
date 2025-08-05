using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 初期設定関連のAPI
    /// </summary>
    [ApiController]
    [Route("api/setup")]
    public class SetupController : StoreAwareControllerBase
    {
        private readonly ShopifyDbContext _context;
        private readonly IStoreService _storeService;
        private readonly ILogger<SetupController> _logger;

        public SetupController(
            ShopifyDbContext context,
            IStoreService storeService,
            ILogger<SetupController> logger)
        {
            _context = context;
            _storeService = storeService;
            _logger = logger;
        }

        /// <summary>
        /// 初期設定の完了状態を確認
        /// </summary>
        /// <returns>初期設定の状態</returns>
        [HttpGet("status")]
        public async Task<IActionResult> GetSetupStatus()
        {
            try
            {
                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var response = new
                {
                    initialSetupCompleted = currentStore.InitialSetupCompleted,
                    lastSyncDate = currentStore.LastSyncDate,
                    storeName = currentStore.Name,
                    storeId = currentStore.Id
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting setup status for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 初期設定を完了としてマーク（手動設定用）
        /// </summary>
        /// <returns>更新結果</returns>
        [HttpPost("complete")]
        public async Task<IActionResult> MarkSetupComplete()
        {
            try
            {
                var currentStore = await _context.Stores.FindAsync(StoreId);
                if (currentStore == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                currentStore.InitialSetupCompleted = true;
                currentStore.LastSyncDate = DateTime.UtcNow;
                currentStore.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Initial setup marked as complete for store: {StoreName} (ID: {StoreId})", 
                    currentStore.Name, currentStore.Id);

                return Ok(new
                {
                    success = true,
                    message = "Initial setup marked as complete",
                    storeId = currentStore.Id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking setup as complete for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }
}