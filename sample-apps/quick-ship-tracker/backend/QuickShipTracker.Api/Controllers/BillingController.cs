using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Models;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;

namespace QuickShipTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class BillingController : ControllerBase
{
    private readonly IBillingService _billingService;
    private readonly IShopifyService _shopifyService;
    private readonly AppDbContext _context;

    public BillingController(IBillingService billingService, IShopifyService shopifyService, AppDbContext context)
    {
        _billingService = billingService;
        _shopifyService = shopifyService;
        _context = context;
    }

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        try
        {
            var shop = await _context.Shops.FindAsync(shopId.Value);
            if (shop == null)
            {
                return NotFound(new ErrorResponse("NOT_FOUND", "Shop not found"));
            }

            var plans = await _billingService.GetAvailablePlansAsync();
            var currentPlan = await _billingService.GetCurrentPlanAsync(shopId.Value);

            // Calculate reset date (first day of next month)
            var now = DateTime.UtcNow;
            var resetDate = new DateTime(now.Year, now.Month, 1).AddMonths(1);

            var response = new
            {
                plans = plans.Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    price = p.Price,
                    currency = p.Currency,
                    trackingLimit = p.TrackingLimit,
                    features = p.Features
                }),
                currentPlan = currentPlan.Id,
                usage = new
                {
                    current = shop.MonthlyTrackingCount,
                    limit = currentPlan.TrackingLimit,
                    resetDate = resetDate
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to fetch billing plans", ex.Message));
        }
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        try
        {
            var shop = await _context.Shops.FindAsync(shopId.Value);
            if (shop == null)
            {
                return NotFound(new ErrorResponse("NOT_FOUND", "Shop not found"));
            }

            // Validate plan ID
            var plan = BillingPlan.GetPlan(request.PlanId);
            if (plan == null)
            {
                return BadRequest(new ErrorResponse("VALIDATION_ERROR", "Invalid plan ID"));
            }

            // Don't create charge for free plan
            if (request.PlanId == "free")
            {
                shop.PlanId = "free";
                shop.ActiveChargeId = null;
                shop.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Successfully switched to Free plan" });
            }

            // Create recurring charge in Shopify
            var chargeId = await _shopifyService.CreateRecurringChargeAsync(shopId.Value, request.PlanId);
            if (chargeId == null)
            {
                return BadRequest(new ErrorResponse("BILLING_ERROR", "Failed to create subscription"));
            }

            // Generate confirmation URL
            var confirmationUrl = $"https://{shop.Domain}/admin/charges/{chargeId}/confirm";

            return Ok(new { confirmationUrl });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to create subscription", ex.Message));
        }
    }

    [HttpPost("cancel")]
    public async Task<IActionResult> CancelSubscription()
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        try
        {
            var success = await _billingService.CancelSubscriptionAsync(shopId.Value);
            if (!success)
            {
                return BadRequest(new ErrorResponse("BILLING_ERROR", "Failed to cancel subscription"));
            }

            return Ok(new 
            { 
                success = true, 
                message = "Subscription cancelled. You will have access until the end of the billing period." 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to cancel subscription", ex.Message));
        }
    }

    [HttpGet("usage")]
    public async Task<IActionResult> GetUsage()
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        try
        {
            var shop = await _context.Shops.FindAsync(shopId.Value);
            if (shop == null)
            {
                return NotFound(new ErrorResponse("NOT_FOUND", "Shop not found"));
            }

            var plan = BillingPlan.GetPlan(shop.PlanId);
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var endOfMonth = startOfMonth.AddMonths(1).AddSeconds(-1);

            var response = new
            {
                planId = plan.Id,
                planName = plan.Name,
                usage = new
                {
                    trackings = new
                    {
                        current = shop.MonthlyTrackingCount,
                        limit = plan.TrackingLimit,
                        percentage = plan.TrackingLimit > 0 
                            ? (shop.MonthlyTrackingCount * 100.0 / plan.TrackingLimit) 
                            : 0
                    }
                },
                billingCycle = new
                {
                    start = startOfMonth,
                    end = endOfMonth
                },
                nextBilling = plan.Price > 0 ? new
                {
                    date = startOfMonth.AddMonths(1),
                    amount = plan.Price,
                    currency = plan.Currency
                } : null
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to fetch usage stats", ex.Message));
        }
    }

    private long? GetShopId()
    {
        var shopIdClaim = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(shopIdClaim))
        {
            return null;
        }

        if (long.TryParse(shopIdClaim, out var shopId))
        {
            return shopId;
        }

        return null;
    }
}

public class SubscribeRequest
{
    public string PlanId { get; set; } = string.Empty;
}