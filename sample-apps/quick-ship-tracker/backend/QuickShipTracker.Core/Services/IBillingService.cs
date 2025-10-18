using QuickShipTracker.Core.Models;

namespace QuickShipTracker.Core.Services;

public interface IBillingService
{
    Task<List<BillingPlan>> GetAvailablePlansAsync();
    Task<BillingPlan> GetCurrentPlanAsync(long shopId);
    Task<string?> CreateSubscriptionAsync(long shopId, string planId);
    Task<bool> CancelSubscriptionAsync(long shopId);
    Task<object> GetUsageStatsAsync(long shopId);
    Task ResetMonthlyUsageAsync(long shopId);
}