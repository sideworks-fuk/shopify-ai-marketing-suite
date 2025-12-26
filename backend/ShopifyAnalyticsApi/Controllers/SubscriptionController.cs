using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// Shopify課金管理コントローラー
    /// 月額サブスクリプションと無料トライアルを管理
    /// </summary>
    [ApiController]
    [Route("api/subscription")]
    [Authorize]
    public class SubscriptionController : StoreAwareControllerBase
    {
        private readonly ILogger<SubscriptionController> _logger;
        private readonly ShopifyDbContext _context;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IConfiguration _configuration;

        public SubscriptionController(
            ILogger<SubscriptionController> logger,
            ShopifyDbContext context,
            ISubscriptionService subscriptionService,
            IConfiguration configuration) : base(logger)
        {
            _logger = logger;
            _context = context;
            _subscriptionService = subscriptionService;
            _configuration = configuration;
        }

        /// <summary>
        /// 現在のサブスクリプション状態を取得
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetSubscriptionStatus()
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                var subscription = await _context.StoreSubscriptions
                    .Include(s => s.Plan)
                    .Where(s =>
                        s.StoreId == StoreId &&
                        (s.Status == "active" || s.Status == "trialing"))
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (subscription == null)
                {
                    return Ok(new
                    {
                        hasActiveSubscription = false,
                        requiresPayment = true,
                        message = "No active subscription found",
                        subscription = (object?)null
                    });
                }

                // フロント（SubscriptionContext/useFeatureAccess）向けの planId マッピング
                // - 案1: trialing は professional 相当として扱い、全機能アクセスを許可する
                var planIdForFrontend = "starter";
                var planName = subscription.Plan?.Name ?? subscription.PlanName ?? "Free";
                var normalizedPlanName = planName.Trim().ToLowerInvariant();
                var isTrialing = string.Equals(subscription.Status, "trialing", StringComparison.OrdinalIgnoreCase);
                if (isTrialing)
                {
                    planIdForFrontend = "professional";
                }
                else if (normalizedPlanName.Contains("enterprise"))
                {
                    planIdForFrontend = "enterprise";
                }
                else if (normalizedPlanName.Contains("pro") || normalizedPlanName.Contains("professional") || normalizedPlanName.Contains("basic"))
                {
                    planIdForFrontend = "professional";
                }
                else if (normalizedPlanName.Contains("free") || subscription.Plan?.Price == 0)
                {
                    planIdForFrontend = "starter";
                }

                return Ok(new
                {
                    hasActiveSubscription = true,
                    requiresPayment = false,
                    subscription = new
                    {
                        // frontend/src/types/billing.ts の Subscription 互換（id/planId/status/dates）
                        id = subscription.Id.ToString(),
                        planId = planIdForFrontend,
                        status = subscription.Status,
                        currentPeriodStart = subscription.ActivatedAt ?? subscription.CreatedAt,
                        currentPeriodEnd = subscription.CurrentPeriodEnd ?? subscription.TrialEndsAt ?? subscription.CreatedAt.AddDays(14),
                        trialEnd = subscription.TrialEndsAt,

                        // 既存互換/表示用（残す）
                        planName = subscription.Plan?.Name ?? subscription.PlanName,
                        price = subscription.Plan?.Price,
                        isInTrialPeriod = isTrialing ? (subscription.TrialEndsAt.HasValue && subscription.TrialEndsAt > DateTime.UtcNow) : subscription.IsInTrialPeriod,
                        trialEndsAt = subscription.TrialEndsAt,
                        daysLeftInTrial = subscription.DaysLeftInTrial,
                        features = subscription.Plan?.Features != null
                            ? JsonSerializer.Deserialize<object>(subscription.Plan.Features)
                            : null
                    }
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Unauthorized access while getting subscription status");
                return Unauthorized(new { error = "Unauthorized", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription status");
                return StatusCode(500, new { error = "Failed to get subscription status" });
            }
        }

        /// <summary>
        /// 利用可能なプラン一覧を取得
        /// </summary>
        [HttpGet("plans")]
        public async Task<IActionResult> GetAvailablePlans()
        {
            try
            {
                var plansData = await _context.SubscriptionPlans
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.Price)
                    .ToListAsync();
                
                var plans = plansData.Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    price = p.Price,
                    trialDays = p.TrialDays,
                    features = p.Features != null 
                        ? JsonSerializer.Deserialize<object>(p.Features) 
                        : null
                }).ToList();

                return Ok(plans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription plans");
                return StatusCode(500, new { error = "Failed to get subscription plans" });
            }
        }

        /// <summary>
        /// サブスクリプションを作成（課金URL生成）
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> CreateSubscription([FromBody] CreateSubscriptionRequest request)
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                var store = await _context.Stores.FindAsync(StoreId);
                if (store == null || string.IsNullOrEmpty(store.AccessToken))
                {
                    return BadRequest(new { error = "Store not properly authenticated" });
                }

                // 既存のアクティブなサブスクリプションをチェック
                var existingSubscription = await _context.StoreSubscriptions
                    .AnyAsync(s => s.StoreId == StoreId && s.Status == "active");

                if (existingSubscription)
                {
                    return BadRequest(new { error = "Active subscription already exists" });
                }

                // プランの存在確認
                var plan = await _context.SubscriptionPlans.FindAsync(request.PlanId);
                if (plan == null || !plan.IsActive)
                {
                    return BadRequest(new { error = "Invalid plan selected" });
                }

                // Shopify課金URLを生成
                var result = await _subscriptionService.CreateSubscription(
                    store.Domain ?? store.Name,
                    store.AccessToken,
                    request.PlanId);

                if (result.Success)
                {
                    return Ok(new
                    {
                        confirmationUrl = result.ConfirmationUrl,
                        message = "Please confirm the subscription on Shopify"
                    });
                }

                return BadRequest(new { error = result.ErrorMessage });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription");
                return StatusCode(500, new { error = "Failed to create subscription" });
            }
        }

        /// <summary>
        /// サブスクリプション確認コールバック
        /// </summary>
        [HttpGet("confirm")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmSubscription([FromQuery] string charge_id, [FromQuery] string shop)
        {
            try
            {
                _logger.LogInformation("Subscription confirmation received. ChargeId: {ChargeId}, Shop: {Shop}", charge_id, shop);

                if (string.IsNullOrEmpty(charge_id) || string.IsNullOrEmpty(shop))
                {
                    return BadRequest(new { error = "Invalid confirmation parameters" });
                }

                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Domain == shop);

                if (store == null)
                {
                    return NotFound(new { error = "Store not found" });
                }

                // Shopifyから課金情報を取得して確認
                var confirmed = await _subscriptionService.ConfirmSubscription(
                    shop,
                    store.AccessToken!,
                    long.Parse(charge_id));

                if (confirmed)
                {
                    // フロントエンドの成功ページにリダイレクト
                    // データベースから最初のアクティブなAppUrlを取得
                    var defaultApp = await _context.ShopifyApps
                        .Where(a => a.IsActive && !string.IsNullOrEmpty(a.AppUrl))
                        .OrderBy(a => a.Id)
                        .Select(a => a.AppUrl)
                        .FirstOrDefaultAsync();
                    
                    var frontendUrl = defaultApp ?? "https://localhost:3000";
                    return Redirect($"{frontendUrl}/subscription/success");
                }

                return BadRequest(new { error = "Failed to confirm subscription" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming subscription");
                return StatusCode(500, new { error = "Failed to confirm subscription" });
            }
        }

        /// <summary>
        /// サブスクリプションをキャンセル
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

                var store = await _context.Stores.FindAsync(StoreId);
                if (store == null)
                {
                    return BadRequest(new { error = "Store not found" });
                }

                var subscription = await _context.StoreSubscriptions
                    .Where(s => s.StoreId == StoreId && s.Status == "active")
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (subscription == null)
                {
                    return BadRequest(new { error = "No active subscription found" });
                }

                // Shopify APIでキャンセル
                if (subscription.ShopifyChargeId.HasValue)
                {
                    var cancelled = await _subscriptionService.CancelSubscription(
                        store.Domain ?? store.Name,
                        store.AccessToken!,
                        subscription.ShopifyChargeId.Value);

                    if (!cancelled)
                    {
                        return BadRequest(new { error = "Failed to cancel subscription on Shopify" });
                    }
                }

                // ローカルDBを更新
                subscription.Status = "cancelled";
                subscription.CancelledAt = DateTime.UtcNow;
                subscription.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Subscription cancelled for store {StoreId}", StoreId);

                return Ok(new { message = "Subscription cancelled successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling subscription");
                return StatusCode(500, new { error = "Failed to cancel subscription" });
            }
        }

        /// <summary>
        /// サブスクリプション履歴を取得
        /// </summary>
        [HttpGet("history")]
        public async Task<IActionResult> GetSubscriptionHistory()
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                var history = await _context.StoreSubscriptions
                    .Include(s => s.Plan)
                    .Where(s => s.StoreId == StoreId)
                    .OrderByDescending(s => s.CreatedAt)
                    .Select(s => new
                    {
                        id = s.Id,
                        planName = s.Plan!.Name,
                        price = s.Plan.Price,
                        status = s.Status,
                        activatedAt = s.ActivatedAt,
                        cancelledAt = s.CancelledAt,
                        trialEndsAt = s.TrialEndsAt,
                        createdAt = s.CreatedAt
                    })
                    .ToListAsync();

                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription history");
                return StatusCode(500, new { error = "Failed to get subscription history" });
            }
        }

        /// <summary>
        /// プランをアップグレード/ダウングレード
        /// </summary>
        [HttpPost("change-plan")]
        public async Task<IActionResult> ChangePlan([FromBody] ChangePlanRequest request)
        {
            try
            {
                if (!HasStoreContext)
                {
                    return BadRequest(new { error = "Store context not found" });
                }

                var store = await _context.Stores.FindAsync(StoreId);
                if (store == null)
                {
                    return BadRequest(new { error = "Store not found" });
                }

                // 現在のサブスクリプションを取得
                var currentSubscription = await _context.StoreSubscriptions
                    .Where(s => s.StoreId == StoreId && s.Status == "active")
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync();

                if (currentSubscription == null)
                {
                    return BadRequest(new { error = "No active subscription found" });
                }

                if (currentSubscription.PlanId == request.NewPlanId)
                {
                    return BadRequest(new { error = "Already on this plan" });
                }

                // 新しいプランの存在確認
                var newPlan = await _context.SubscriptionPlans.FindAsync(request.NewPlanId);
                if (newPlan == null || !newPlan.IsActive)
                {
                    return BadRequest(new { error = "Invalid plan selected" });
                }

                // Shopifyでプラン変更処理
                var result = await _subscriptionService.ChangePlan(
                    store.Domain ?? store.Name,
                    store.AccessToken!,
                    currentSubscription.ShopifyChargeId!.Value,
                    request.NewPlanId);

                if (result.Success)
                {
                    return Ok(new
                    {
                        confirmationUrl = result.ConfirmationUrl,
                        message = "Please confirm the plan change on Shopify"
                    });
                }

                return BadRequest(new { error = result.ErrorMessage });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing subscription plan");
                return StatusCode(500, new { error = "Failed to change plan" });
            }
        }
    }

    // リクエストDTO
    public class CreateSubscriptionRequest
    {
        public int PlanId { get; set; }
    }

    public class ChangePlanRequest
    {
        public int NewPlanId { get; set; }
    }
}