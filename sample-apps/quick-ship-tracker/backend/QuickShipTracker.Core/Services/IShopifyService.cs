using QuickShipTracker.Core.DTOs;

namespace QuickShipTracker.Core.Services;

public interface IShopifyService
{
    Task<List<OrderDto>> GetOrdersAsync(long shopId, int page = 1, int limit = 50, string? status = null);
    Task<OrderDetailDto?> GetOrderDetailAsync(long shopId, long orderId);
    Task<bool> CreateFulfillmentAsync(long shopId, long orderId, string trackingNumber, string trackingCompany, bool notifyCustomer);
    Task<long?> CreateRecurringChargeAsync(long shopId, string planId);
    Task<bool> CancelRecurringChargeAsync(long shopId, long chargeId);
}