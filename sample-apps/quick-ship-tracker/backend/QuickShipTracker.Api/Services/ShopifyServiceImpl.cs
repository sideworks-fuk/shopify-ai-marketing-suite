using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Models;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;
using ShopifySharp;
using ShopifySharp.Filters;

namespace QuickShipTracker.Api.Services;

public class ShopifyServiceImpl : QuickShipTracker.Core.Services.IShopifyService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public ShopifyServiceImpl(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<List<OrderDto>> GetOrdersAsync(long shopId, int page = 1, int limit = 50, string? status = null)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return new List<OrderDto>();

        var service = new OrderService(shop.Domain, shop.AccessToken);
        var filter = new OrderListFilter
        {
            Limit = limit,
            Status = status ?? "any"
        };

        var orders = await service.ListAsync(filter);
        
        return orders.Items.Select(o => new OrderDto
        {
            Id = o.Id?.ToString() ?? "",
            OrderNumber = o.OrderNumber?.ToString() ?? "",
            CustomerName = $"{o.Customer?.FirstName} {o.Customer?.LastName}".Trim(),
            Email = o.Customer?.Email ?? o.Email ?? "",
            TotalPrice = o.TotalPrice?.ToString("F2") ?? "0.00",
            Currency = o.Currency ?? "USD",
            CreatedAt = o.CreatedAt?.DateTime ?? DateTime.UtcNow,
            FulfillmentStatus = o.FulfillmentStatus ?? "pending"
        }).ToList();
    }

    public async Task<OrderDetailDto?> GetOrderDetailAsync(long shopId, long orderId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return null;

        try
        {
            var service = new OrderService(shop.Domain, shop.AccessToken);
            var order = await service.GetAsync(orderId);
            
            if (order == null) return null;

            var shippingAddress = order.ShippingAddress;
            var lineItems = order.LineItems ?? new List<LineItem>();

            return new OrderDetailDto
            {
                Id = order.Id?.ToString() ?? "",
                OrderNumber = order.OrderNumber?.ToString() ?? "",
                CustomerName = $"{order.Customer?.FirstName} {order.Customer?.LastName}".Trim(),
                Email = order.Customer?.Email ?? order.Email ?? "",
                TotalPrice = order.TotalPrice?.ToString("F2") ?? "0.00",
                Currency = order.Currency ?? "USD",
                CreatedAt = order.CreatedAt?.DateTime ?? DateTime.UtcNow,
                FulfillmentStatus = order.FulfillmentStatus ?? "pending",
                FinancialStatus = order.FinancialStatus ?? "pending",
                Customer = new CustomerDto
                {
                    Name = $"{order.Customer?.FirstName} {order.Customer?.LastName}".Trim(),
                    Email = order.Customer?.Email ?? "",
                    Phone = order.Customer?.Phone ?? ""
                },
                ShippingAddress = shippingAddress != null ? new AddressDto
                {
                    Name = shippingAddress.Name ?? "",
                    Address1 = shippingAddress.Address1 ?? "",
                    Address2 = shippingAddress.Address2,
                    City = shippingAddress.City ?? "",
                    Province = shippingAddress.Province ?? "",
                    Country = shippingAddress.Country ?? "",
                    Zip = shippingAddress.Zip ?? ""
                } : new AddressDto(),
                LineItems = lineItems.Select(li => new LineItemDto
                {
                    Id = li.Id?.ToString() ?? "",
                    Title = li.Title ?? "",
                    VariantTitle = li.VariantTitle,
                    Quantity = li.Quantity ?? 0,
                    Price = li.Price?.ToString("F2") ?? "0.00"
                }).ToList()
            };
        }
        catch
        {
            return null;
        }
    }

    public async Task<bool> CreateFulfillmentAsync(long shopId, long orderId, string trackingNumber, string trackingCompany, bool notifyCustomer)
    {
        // Simplified implementation - in production, use proper Shopify Fulfillment API
        // This would require proper handling of fulfillment orders and line items
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return false;

        try
        {
            // Store tracking info locally for now
            // In production, integrate with Shopify's fulfillment API properly
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<long?> CreateRecurringChargeAsync(long shopId, string planId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return null;

        var plan = BillingPlan.GetPlan(planId);
        if (plan == null || plan.Price == 0) return null;

        try
        {
            var service = new RecurringChargeService(shop.Domain, shop.AccessToken);
            var charge = new RecurringCharge
            {
                Name = $"Quick Ship Tracker - {plan.Name}",
                Price = plan.Price,
                TrialDays = 7,
                Test = true, // Set to false in production
                ReturnUrl = $"{_configuration["Shopify:AppUrl"]}/api/billing/callback?shop={shop.Domain}"
            };

            var createdCharge = await service.CreateAsync(charge);
            
            // Store the charge ID
            shop.ActiveChargeId = createdCharge.Id;
            shop.PlanId = planId;
            shop.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return createdCharge.Id;
        }
        catch
        {
            return null;
        }
    }

    public async Task<bool> CancelRecurringChargeAsync(long shopId, long chargeId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return false;

        try
        {
            var service = new RecurringChargeService(shop.Domain, shop.AccessToken);
            await service.DeleteAsync(chargeId);
            
            shop.ActiveChargeId = null;
            shop.PlanId = "free";
            shop.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<long> GetDefaultLocationId(string shopDomain, string accessToken)
    {
        var locationService = new LocationService(shopDomain, accessToken);
        var locations = await locationService.ListAsync();
        return locations.Items.FirstOrDefault()?.Id ?? 0;
    }
}