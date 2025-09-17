using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Models;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;

namespace QuickShipTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TrackingController : ControllerBase
{
    private readonly ITrackingService _trackingService;
    private readonly IShopifyService _shopifyService;
    private readonly AppDbContext _context;

    public TrackingController(ITrackingService trackingService, IShopifyService shopifyService, AppDbContext context)
    {
        _trackingService = trackingService;
        _shopifyService = shopifyService;
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTracking([FromBody] CreateTrackingRequest request)
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        // Check if shop can add more trackings based on their plan
        if (!await _trackingService.CanAddTrackingAsync(shopId.Value))
        {
            var shop = await _context.Shops.FindAsync(shopId.Value);
            var plan = BillingPlan.GetPlan(shop?.PlanId ?? "free");
            
            return StatusCode(402, new ErrorResponse("PLAN_LIMIT_EXCEEDED", 
                "You have reached your monthly tracking limit. Please upgrade your plan.",
                new PlanLimitErrorDetails 
                { 
                    CurrentUsage = shop?.MonthlyTrackingCount ?? 0,
                    PlanLimit = plan.TrackingLimit
                }));
        }

        try
        {
            var tracking = await _trackingService.CreateTrackingAsync(shopId.Value, request);
            if (tracking == null)
            {
                return BadRequest(new ErrorResponse("TRACKING_ERROR", "Failed to create tracking"));
            }

            // Update fulfillment in Shopify if requested
            if (request.NotifyCustomer && long.TryParse(request.OrderId, out var orderId))
            {
                await _shopifyService.CreateFulfillmentAsync(shopId.Value, orderId, 
                    tracking.TrackingNumber, tracking.Carrier, request.NotifyCustomer);
            }

            var response = new TrackingResponse
            {
                Success = true,
                Tracking = new TrackingDto
                {
                    Id = tracking.Id.ToString(),
                    OrderId = tracking.OrderId.ToString(),
                    Carrier = tracking.Carrier,
                    TrackingNumber = tracking.TrackingNumber,
                    TrackingUrl = tracking.TrackingUrl,
                    CreatedAt = tracking.CreatedAt
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to create tracking", ex.Message));
        }
    }

    [HttpPut("{trackingId}")]
    public async Task<IActionResult> UpdateTracking(string trackingId, [FromBody] UpdateTrackingRequest request)
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        if (!long.TryParse(trackingId, out var trackingIdLong))
        {
            return BadRequest(new ErrorResponse("VALIDATION_ERROR", "Invalid tracking ID"));
        }

        // Verify tracking belongs to shop
        var existingTracking = await _context.TrackingInfos
            .FirstOrDefaultAsync(t => t.Id == trackingIdLong && t.ShopId == shopId.Value);

        if (existingTracking == null)
        {
            return NotFound(new ErrorResponse("NOT_FOUND", "Tracking not found"));
        }

        try
        {
            var updatedTracking = await _trackingService.UpdateTrackingAsync(trackingIdLong, request);
            if (updatedTracking == null)
            {
                return BadRequest(new ErrorResponse("UPDATE_ERROR", "Failed to update tracking"));
            }

            return Ok(new
            {
                success = true,
                tracking = new TrackingDto
                {
                    Id = updatedTracking.Id.ToString(),
                    OrderId = updatedTracking.OrderId.ToString(),
                    Carrier = updatedTracking.Carrier,
                    TrackingNumber = updatedTracking.TrackingNumber,
                    TrackingUrl = updatedTracking.TrackingUrl,
                    CreatedAt = updatedTracking.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to update tracking", ex.Message));
        }
    }

    [HttpDelete("{trackingId}")]
    public async Task<IActionResult> DeleteTracking(string trackingId)
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        if (!long.TryParse(trackingId, out var trackingIdLong))
        {
            return BadRequest(new ErrorResponse("VALIDATION_ERROR", "Invalid tracking ID"));
        }

        // Verify tracking belongs to shop
        var existingTracking = await _context.TrackingInfos
            .FirstOrDefaultAsync(t => t.Id == trackingIdLong && t.ShopId == shopId.Value);

        if (existingTracking == null)
        {
            return NotFound(new ErrorResponse("NOT_FOUND", "Tracking not found"));
        }

        try
        {
            var success = await _trackingService.DeleteTrackingAsync(trackingIdLong);
            return Ok(new { success });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to delete tracking", ex.Message));
        }
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulkTracking([FromBody] BulkTrackingRequest request)
    {
        var shopId = GetShopId();
        if (shopId == null)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop ID not found"));
        }

        // Check if shop can add the requested number of trackings
        var shop = await _context.Shops.FindAsync(shopId.Value);
        var plan = BillingPlan.GetPlan(shop?.PlanId ?? "free");
        
        if (plan.TrackingLimit > 0)
        {
            var remainingTrackings = plan.TrackingLimit - (shop?.MonthlyTrackingCount ?? 0);
            if (request.Trackings.Count > remainingTrackings)
            {
                return StatusCode(402, new ErrorResponse("PLAN_LIMIT_EXCEEDED",
                    $"You can only add {remainingTrackings} more trackings this month. Please upgrade your plan.",
                    new PlanLimitErrorDetails
                    {
                        CurrentUsage = shop?.MonthlyTrackingCount ?? 0,
                        PlanLimit = plan.TrackingLimit
                    }));
            }
        }

        try
        {
            var result = await _trackingService.CreateBulkTrackingAsync(shopId.Value, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "Failed to create bulk tracking", ex.Message));
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