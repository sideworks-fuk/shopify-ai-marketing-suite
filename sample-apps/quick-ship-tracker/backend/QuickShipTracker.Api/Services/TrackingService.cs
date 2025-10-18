using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Models;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;

namespace QuickShipTracker.Api.Services;

public class TrackingService : ITrackingService
{
    private readonly AppDbContext _context;

    public TrackingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> CanAddTrackingAsync(long shopId)
    {
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop == null) return false;

        var plan = BillingPlan.GetPlan(shop.PlanId);
        
        // Unlimited tracking for pro plan
        if (plan.TrackingLimit == -1) return true;

        // Check monthly limit
        return shop.MonthlyTrackingCount < plan.TrackingLimit;
    }

    public async Task<TrackingInfo?> CreateTrackingAsync(long shopId, CreateTrackingRequest request)
    {
        if (!long.TryParse(request.OrderId, out var orderId))
        {
            return null;
        }

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.ShopId == shopId && o.Id == orderId);
        if (order == null)
        {
            // Try to find by Shopify order ID
            order = await _context.Orders.FirstOrDefaultAsync(o => o.ShopId == shopId && o.ShopifyOrderId == orderId);
            if (order == null) return null;
        }

        // Check if tracking already exists
        var existingTracking = await _context.TrackingInfos.FirstOrDefaultAsync(t => t.OrderId == order.Id);
        if (existingTracking != null)
        {
            // Update existing tracking
            existingTracking.Carrier = request.Carrier;
            existingTracking.TrackingNumber = request.TrackingNumber;
            existingTracking.TrackingUrl = GenerateTrackingUrl(request.Carrier, request.TrackingNumber);
            existingTracking.UpdatedAt = DateTime.UtcNow;
            existingTracking.ShippedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return existingTracking;
        }

        var tracking = new TrackingInfo
        {
            ShopId = shopId,
            OrderId = order.Id,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = GenerateTrackingUrl(request.Carrier, request.TrackingNumber),
            CustomerNotified = request.NotifyCustomer,
            ShippedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.TrackingInfos.Add(tracking);

        // Update shop's monthly tracking count
        var shop = await _context.Shops.FindAsync(shopId);
        if (shop != null)
        {
            // Reset monthly count if it's a new month
            if (shop.LastTrackingResetDate == null || 
                shop.LastTrackingResetDate.Value.Month != DateTime.UtcNow.Month ||
                shop.LastTrackingResetDate.Value.Year != DateTime.UtcNow.Year)
            {
                shop.MonthlyTrackingCount = 0;
                shop.LastTrackingResetDate = DateTime.UtcNow;
            }

            shop.MonthlyTrackingCount++;
            shop.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return tracking;
    }

    public async Task<TrackingInfo?> UpdateTrackingAsync(long trackingId, UpdateTrackingRequest request)
    {
        var tracking = await _context.TrackingInfos.FindAsync(trackingId);
        if (tracking == null) return null;

        tracking.Carrier = request.Carrier;
        tracking.TrackingNumber = request.TrackingNumber;
        tracking.TrackingUrl = GenerateTrackingUrl(request.Carrier, request.TrackingNumber);
        tracking.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return tracking;
    }

    public async Task<bool> DeleteTrackingAsync(long trackingId)
    {
        var tracking = await _context.TrackingInfos.FindAsync(trackingId);
        if (tracking == null) return false;

        _context.TrackingInfos.Remove(tracking);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<BulkTrackingResponse> CreateBulkTrackingAsync(long shopId, BulkTrackingRequest request)
    {
        var response = new BulkTrackingResponse
        {
            Results = new List<BulkTrackingResult>()
        };

        foreach (var item in request.Trackings)
        {
            var result = new BulkTrackingResult
            {
                OrderId = item.OrderId
            };

            try
            {
                if (await CanAddTrackingAsync(shopId))
                {
                    var tracking = await CreateTrackingAsync(shopId, new CreateTrackingRequest
                    {
                        OrderId = item.OrderId,
                        Carrier = item.Carrier,
                        TrackingNumber = item.TrackingNumber,
                        NotifyCustomer = false
                    });

                    if (tracking != null)
                    {
                        result.Success = true;
                        result.TrackingId = tracking.Id.ToString();
                        response.Success++;
                    }
                    else
                    {
                        result.Success = false;
                        result.Error = "Order not found";
                        response.Failed++;
                    }
                }
                else
                {
                    result.Success = false;
                    result.Error = "Plan limit exceeded";
                    response.Failed++;
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Error = ex.Message;
                response.Failed++;
            }

            response.Results.Add(result);
        }

        return response;
    }

    public string GenerateTrackingUrl(string carrier, string trackingNumber)
    {
        var carrierLower = carrier.ToLower();
        return carrierLower switch
        {
            "usps" => $"https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1={trackingNumber}",
            "ups" => $"https://www.ups.com/track?tracknum={trackingNumber}",
            "fedex" => $"https://www.fedex.com/fedextrack/?tracknumbers={trackingNumber}",
            "dhl" => $"https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}",
            "canada post" => $"https://www.canadapost.ca/track-reperage/en#/search?searchFor={trackingNumber}",
            _ => $"https://www.google.com/search?q={carrier}+tracking+{trackingNumber}"
        };
    }
}