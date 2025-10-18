using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using Microsoft.EntityFrameworkCore;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 課金管理用APIコントローラー
    /// フロントエンドの/api/billing/*エンドポイントに対応
    /// SubscriptionControllerの機能をラップして提供
    /// </summary>
    [ApiController]
    [Route("api/billing")]
    [Authorize]
    public class BillingController : StoreAwareControllerBase
    {
        private readonly ILogger<BillingController> _logger;
        private readonly ShopifyDbContext _context;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IConfiguration _configuration;

        public BillingController(
            ILogger<BillingController> logger,
            ShopifyDbContext context,
            ISubscriptionService subscriptionService,
            IConfiguration configuration)
        {
            _logger = logger;
            _context = context;
            _subscriptionService = subscriptionService;
            _configuration = configuration;
        }

        /// <summary>
        /// 利用可能なプラン一覧を取得
        /// GET /api/billing/plans
        /// </summary>
        [HttpGet("plans")]
        public async Task<IActionResult> GetAvailablePlans()
        {
            try
            {
                var plans = await _subscriptionService.GetAvailablePlansAsync();
                
                // フロントエンドが期待する形式に変換
                var formattedPlans = plans.Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    displayName = p.Name, // SubscriptionPlanにはDisplayNameがないのでNameを使用
                    price = p.Price,
                    interval = "EVERY_30_DAYS", // 固定値
                    features = p.Features,
                    maxStores = 1, // 固定値
                    maxProductsPerStore = 1000, // 固定値
                    isPopular = p.Name == "standard", // standardプランを人気として設定
                    description = $"{p.Name} plan - ${p.Price}/month"
                }).ToList();

                return Ok(formattedPlans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching billing plans");
                return StatusCode(500, new { error = "Failed to fetch billing plans" });
            }
        }

        /// <summary>
        /// 現在のサブスクリプション情報を取得
        /// GET /api/billing/current
        /// </summary>
        [HttpGet("current")]
        public async Task<IActionResult> GetCurrentSubscription()
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                var subscription = await _context.StoreSubscriptions
                    .FirstOrDefaultAsync(s => s.StoreId == StoreId && s.Status != "cancelled");

                if (subscription == null)
                {
                    return NotFound();
                }

                // フロントエンドが期待する形式に変換
                var response = new
                {
                    id = subscription.Id,
                    storeId = subscription.StoreId,
                    planId = subscription.PlanId,
                    planName = subscription.PlanName,
                    status = subscription.Status,
                    currentPeriodStart = subscription.CreatedAt, // StoreSubscriptionにCurrentPeriodStartがないので代替
                    currentPeriodEnd = subscription.CurrentPeriodEnd,
                    trialEnd = subscription.TrialEndsAt,
                    cancelledAt = subscription.CancelledAt,
                    shopifyChargeId = subscription.ShopifyChargeId,
                    createdAt = subscription.CreatedAt,
                    updatedAt = subscription.UpdatedAt
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching current subscription for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Failed to fetch subscription" });
            }
        }

        /// <summary>
        /// 課金情報の詳細を取得
        /// GET /api/billing/info
        /// </summary>
        [HttpGet("info")]
        public async Task<IActionResult> GetBillingInfo()
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                // プラン一覧を取得
                var plans = await _subscriptionService.GetAvailablePlansAsync();
                
                // 現在のサブスクリプションを取得
                var subscription = await _context.StoreSubscriptions
                    .FirstOrDefaultAsync(s => s.StoreId == StoreId && s.Status != "cancelled");

                // トライアル残日数を計算
                int trialDaysRemaining = 0;
                if (subscription?.Status == "trialing" && subscription.TrialEndsAt.HasValue)
                {
                    var daysLeft = (subscription.TrialEndsAt.Value - DateTime.UtcNow).Days;
                    trialDaysRemaining = Math.Max(0, daysLeft);
                }

                // アップグレード/ダウングレード可否を判定
                var currentPlanIndex = subscription != null 
                    ? plans.FindIndex(p => p.Id == subscription.PlanId)
                    : -1;

                var response = new
                {
                    subscription = subscription != null ? new
                    {
                        id = subscription.Id,
                        planId = subscription.PlanId,
                        planName = subscription.PlanName,
                        status = subscription.Status,
                        currentPeriodStart = subscription.CreatedAt, // StoreSubscriptionにCurrentPeriodStartがないので代替
                        currentPeriodEnd = subscription.CurrentPeriodEnd,
                        trialEnd = subscription.TrialEndsAt
                    } : null,
                    plans = plans.Select(p => new
                    {
                        id = p.Id,
                        name = p.Name,
                        displayName = p.Name,
                        price = p.Price,
                        interval = "EVERY_30_DAYS",
                        features = p.Features,
                        isPopular = p.Name == "standard"
                    }),
                    trialDaysRemaining,
                    canUpgrade = currentPlanIndex >= 0 && currentPlanIndex < plans.Count - 1,
                    canDowngrade = currentPlanIndex > 0
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching billing info for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Failed to fetch billing info" });
            }
        }

        /// <summary>
        /// サブスクリプションを作成/更新
        /// POST /api/billing/subscribe
        /// </summary>
        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe([FromBody] BillingSubscribeRequest request)
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                // バリデーション
                if (string.IsNullOrEmpty(request.PlanId))
                {
                    return BadRequest(new { error = "Plan ID is required" });
                }

                // SubscriptionServiceを使用してサブスクリプション作成
                var result = await _subscriptionService.CreateOrUpdateSubscriptionAsync(
                    StoreId, 
                    request.PlanId,
                    request.ReturnUrl ?? "/billing"
                );

                if (result.Success)
                {
                    return Ok(new
                    {
                        success = true,
                        confirmationUrl = result.ConfirmationUrl,
                        subscription = result.Subscription
                    });
                }
                else
                {
                    return BadRequest(new { error = result.Error });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Failed to create subscription" });
            }
        }

        /// <summary>
        /// サブスクリプションをキャンセル
        /// POST /api/billing/cancel
        /// </summary>
        [HttpPost("cancel")]
        public async Task<IActionResult> CancelSubscription()
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                var subscription = await _context.StoreSubscriptions
                    .FirstOrDefaultAsync(s => s.StoreId == StoreId && s.Status == "active");

                if (subscription == null)
                {
                    return NotFound(new { error = "No active subscription found" });
                }

                // SubscriptionServiceを使用してキャンセル処理
                var result = await _subscriptionService.CancelSubscriptionAsync(StoreId);

                if (result.Success)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Subscription cancelled successfully"
                    });
                }
                else
                {
                    return BadRequest(new { error = result.Error });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling subscription for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Failed to cancel subscription" });
            }
        }

        /// <summary>
        /// プラン変更
        /// POST /api/billing/change-plan
        /// </summary>
        [HttpPost("change-plan")]
        public async Task<IActionResult> ChangePlan([FromBody] BillingChangePlanRequest request)
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                if (string.IsNullOrEmpty(request.NewPlanId))
                {
                    return BadRequest(new { error = "New plan ID is required" });
                }

                // 既存のサブスクリプションを確認
                var currentSubscription = await _context.StoreSubscriptions
                    .FirstOrDefaultAsync(s => s.StoreId == StoreId && s.Status == "active");

                if (currentSubscription == null)
                {
                    return NotFound(new { error = "No active subscription found" });
                }

                // プラン変更処理
                var result = await _subscriptionService.ChangePlanAsync(
                    StoreId, 
                    request.NewPlanId,
                    request.ReturnUrl ?? "/billing"
                );

                if (result.Success)
                {
                    return Ok(new
                    {
                        success = true,
                        confirmationUrl = result.ConfirmationUrl,
                        message = "Plan change initiated"
                    });
                }
                else
                {
                    return BadRequest(new { error = result.Error });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing plan for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Failed to change plan" });
            }
        }

        /// <summary>
        /// 無料トライアルを開始
        /// POST /api/billing/start-trial
        /// </summary>
        [HttpPost("start-trial")]
        public async Task<IActionResult> StartFreeTrial([FromBody] BillingStartTrialRequest request)
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                // 既存のサブスクリプションがないことを確認
                var existingSubscription = await _context.StoreSubscriptions
                    .AnyAsync(s => s.StoreId == StoreId && s.Status != "cancelled");

                if (existingSubscription)
                {
                    return BadRequest(new { error = "Store already has a subscription" });
                }

                // 無料トライアルプランを取得
                var trialPlan = await _context.SubscriptionPlans
                    .FirstOrDefaultAsync(p => p.Name == "free" || p.Price == 0);

                if (trialPlan == null)
                {
                    return BadRequest(new { error = "Trial plan not available" });
                }

                // トライアル開始
                var result = await _subscriptionService.StartFreeTrialAsync(
                    StoreId,
                    trialPlan.Id.ToString(),
                    request.TrialDays ?? 14  // デフォルト14日間
                );

                if (result.Success)
                {
                    return Ok(new
                    {
                        success = true,
                        subscription = result.Subscription,
                        trialEnd = result.Subscription?.TrialEndsAt
                    });
                }
                else
                {
                    return BadRequest(new { error = result.Error });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting trial for store {StoreId}", StoreId);
                return StatusCode(500, new { error = "Failed to start trial" });
            }
        }
    }

    // リクエストモデル
    public class BillingSubscribeRequest
    {
        public string PlanId { get; set; }
        public string? ReturnUrl { get; set; }
    }

    public class BillingChangePlanRequest
    {
        public string NewPlanId { get; set; }
        public string? ReturnUrl { get; set; }
    }

    public class BillingStartTrialRequest
    {
        public int? TrialDays { get; set; }
    }
}