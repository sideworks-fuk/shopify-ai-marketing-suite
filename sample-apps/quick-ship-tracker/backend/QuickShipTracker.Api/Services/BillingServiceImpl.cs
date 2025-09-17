using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.Models;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;

namespace QuickShipTracker.Api.Services;

public class BillingServiceImpl : IBillingService
{
    private readonly AppDbContext _context;
    private readonly IShopifyService _shopifyService;

    public BillingServiceImpl(AppDbContext context, IShopifyService shopifyService)
    {
        _context = context;
        _shopifyService = shopifyService;
    }

    public Task<List<BillingPlan>> GetAvailablePlansAsync()
    {
        return Task.FromResult(BillingPlan.GetAllPlans());
    }

    public async Task<BillingPlan> GetCurrentPlanAsync(long shopId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        return BillingPlan.GetPlan(shop?.PlanId ?? "free");
    }

    public async Task<string?> CreateSubscriptionAsync(long shopId, string planId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return null;

        var plan = BillingPlan.GetPlan(planId);
        if (plan == null || plan.Price == 0) return null;

        try
        {
            // Create recurring charge through Shopify API
            var chargeId = await _shopifyService.CreateRecurringChargeAsync(shopId, planId);
            if (chargeId != null)
            {
                // Don't update the plan yet - wait for charge confirmation
                shop.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return $"https://{shop.Domain}/admin/charges/{chargeId}/confirm";
            }
        }
        catch (Exception ex)
        {
            // Log error
            Console.WriteLine($"Failed to create subscription: {ex.Message}");
        }

        return null;
    }

    public async Task<bool> CancelSubscriptionAsync(long shopId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return false;

        try
        {
            if (shop.ActiveChargeId != null)
            {
                await _shopifyService.CancelRecurringChargeAsync(shopId, shop.ActiveChargeId.Value);
            }

            // Downgrade to free plan
            shop.PlanId = "free";
            shop.ActiveChargeId = null;
            shop.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            // Log error
            Console.WriteLine($"Failed to cancel subscription: {ex.Message}");
            return false;
        }
    }

    public async Task<object> GetUsageStatsAsync(long shopId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return new { };

        var plan = BillingPlan.GetPlan(shop.PlanId);
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddSeconds(-1);

        // Count trackings for current month
        var trackingCount = await _context.TrackingInfos
            .CountAsync(t => t.ShopId == shopId && 
                           t.CreatedAt >= startOfMonth && 
                           t.CreatedAt <= endOfMonth);

        return new
        {
            plan = new
            {
                id = plan.Id,
                name = plan.Name,
                price = plan.Price,
                trackingLimit = plan.TrackingLimit
            },
            usage = new
            {
                trackings = trackingCount,
                limit = plan.TrackingLimit,
                remaining = plan.TrackingLimit == -1 ? -1 : Math.Max(0, plan.TrackingLimit - trackingCount)
            },
            period = new
            {
                start = startOfMonth,
                end = endOfMonth
            }
        };
    }

    public async Task ResetMonthlyUsageAsync(long shopId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop != null)
        {
            shop.MonthlyTrackingCount = 0;
            shop.LastTrackingResetDate = DateTime.UtcNow;
            shop.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}