using Microsoft.AspNetCore.Mvc;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using System.ComponentModel.DataAnnotations;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 無料プラン機能選択コントローラー
    /// </summary>
    [ApiController]
    [Route("api/feature-selection")]
    public class FeatureSelectionController : StoreAwareControllerBase
    {
        private readonly IFeatureSelectionService _featureSelectionService;
        private readonly ILogger<FeatureSelectionController> _logger;

        public FeatureSelectionController(
            IFeatureSelectionService featureSelectionService,
            ILogger<FeatureSelectionController> logger) : base(logger)
        {
            _featureSelectionService = featureSelectionService;
            _logger = logger;
        }

        /// <summary>
        /// 現在の機能選択状態を取得
        /// </summary>
        /// <returns>現在の選択状態</returns>
        [HttpGet("current")]
        [ProducesResponseType(typeof(CurrentSelectionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCurrentSelection()
        {
            try
            {
                var storeId = StoreId;
                if (storeId == 0)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var result = await _featureSelectionService.GetCurrentSelectionAsync(storeId);
                
                _logger.LogInformation(
                    "Feature selection retrieved for store {StoreId}: {SelectedFeature}", 
                    storeId, 
                    result.SelectedFeature ?? "none");
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get current feature selection");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 機能を選択/変更
        /// </summary>
        /// <param name="request">選択リクエスト</param>
        /// <returns>選択結果</returns>
        [HttpPost("select")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> SelectFeature([FromBody] SelectFeatureRequest request)
        {
            // 冪等性トークンの取得（必須）
            if (!Request.Headers.TryGetValue("X-Idempotency-Token", out var idempotencyToken) || 
                string.IsNullOrWhiteSpace(idempotencyToken))
            {
                return BadRequest(new { 
                    error = "missing_idempotency_token", 
                    message = "X-Idempotency-Token header is required" 
                });
            }

            // バリデーション
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var storeId = StoreId;
                if (storeId == 0)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var (success, errorCode, message) = await _featureSelectionService.SelectFeatureAsync(
                    storeId,
                    request.FeatureId,
                    idempotencyToken!);

                if (!success)
                {
                    _logger.LogWarning(
                        "Feature selection failed for store {StoreId}: {ErrorCode} - {Message}", 
                        storeId, 
                        errorCode, 
                        message);

                    // エラーコードに応じたステータスコードを返す
                    return errorCode switch
                    {
                        "invalid_feature_id" => BadRequest(new { error = errorCode, message }),
                        "change_not_allowed" => Conflict(new { error = errorCode, message }),
                        "concurrent_update_conflict" => Conflict(new { error = errorCode, message }),
                        _ => StatusCode(500, new { error = errorCode ?? "unknown_error", message })
                    };
                }

                _logger.LogInformation(
                    "Feature {FeatureId} selected for store {StoreId}", 
                    request.FeatureId, 
                    storeId);

                return Ok(new { 
                    success = true, 
                    message,
                    featureId = request.FeatureId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to select feature");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 利用可能な機能一覧を取得
        /// </summary>
        /// <returns>利用可能な機能のリスト</returns>
        [HttpGet("available-features")]
        [ProducesResponseType(typeof(List<AvailableFeature>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAvailableFeatures()
        {
            try
            {
                var storeId = StoreId;
                if (storeId == 0)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var features = await _featureSelectionService.GetAvailableFeaturesAsync(storeId);
                
                _logger.LogInformation(
                    "Available features retrieved for store {StoreId}: {Count} features", 
                    storeId, 
                    features.Count);
                
                return Ok(features);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get available features");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 特定機能の使用状況を取得
        /// </summary>
        /// <param name="feature">機能ID</param>
        /// <returns>使用状況</returns>
        [HttpGet("usage/{feature}")]
        [ProducesResponseType(typeof(FeatureUsageResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetFeatureUsage([Required] string feature)
        {
            // 機能IDの検証
            if (!FeatureConstants.IsValidFeature(feature))
            {
                return BadRequest(new { 
                    error = "invalid_feature_id", 
                    message = "指定された機能は無効です" 
                });
            }

            try
            {
                var storeId = StoreId;
                if (storeId == 0)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var usage = await _featureSelectionService.GetFeatureUsageAsync(storeId, feature);
                
                _logger.LogInformation(
                    "Feature usage retrieved for store {StoreId}, feature {Feature}: Today={Today}, Monthly={Monthly}", 
                    storeId, 
                    feature, 
                    usage.TodayUsageCount, 
                    usage.MonthlyUsageCount);
                
                return Ok(usage);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get feature usage for {Feature}", feature);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 機能へのアクセス権限をチェック（内部API）
        /// </summary>
        /// <param name="feature">機能ID</param>
        /// <returns>アクセス権限の結果</returns>
        [HttpGet("check-access/{feature}")]
        [ProducesResponseType(typeof(FeatureAccessResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CheckFeatureAccess([Required] string feature)
        {
            // 機能IDの検証
            if (!FeatureConstants.IsValidFeature(feature))
            {
                return BadRequest(new { 
                    error = "invalid_feature_id", 
                    message = "指定された機能は無効です" 
                });
            }

            try
            {
                var storeId = StoreId;
                if (storeId == 0)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var accessResult = await _featureSelectionService.CheckFeatureAccessAsync(storeId, feature);
                
                _logger.LogInformation(
                    "Access check for store {StoreId}, feature {Feature}: {IsAllowed} ({Reason})", 
                    storeId, 
                    feature, 
                    accessResult.IsAllowed, 
                    accessResult.DeniedReason ?? "allowed");
                
                return Ok(accessResult);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check feature access for {Feature}", feature);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// 機能制限情報を取得（デバッグ用）
        /// </summary>
        /// <returns>制限情報</returns>
        [HttpGet("debug/limits")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetFeatureLimits()
        {
            try
            {
                var storeId = StoreId;
                if (storeId == 0)
                {
                    return NotFound(new { error = "Store not found" });
                }

                var currentSelection = await _featureSelectionService.GetCurrentSelectionAsync(storeId);
                var features = await _featureSelectionService.GetAvailableFeaturesAsync(storeId);
                
                var debugInfo = new
                {
                    StoreId = storeId,
                    CurrentSelection = currentSelection,
                    AvailableFeatures = features,
                    ServerTime = DateTime.UtcNow,
                    Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                };

                return Ok(debugInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get debug limits");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }
}