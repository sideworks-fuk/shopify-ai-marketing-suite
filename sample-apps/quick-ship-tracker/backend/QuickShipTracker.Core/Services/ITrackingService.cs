using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Models;

namespace QuickShipTracker.Core.Services;

public interface ITrackingService
{
    Task<bool> CanAddTrackingAsync(long shopId);
    Task<TrackingInfo?> CreateTrackingAsync(long shopId, CreateTrackingRequest request);
    Task<TrackingInfo?> UpdateTrackingAsync(long trackingId, UpdateTrackingRequest request);
    Task<bool> DeleteTrackingAsync(long trackingId);
    Task<BulkTrackingResponse> CreateBulkTrackingAsync(long shopId, BulkTrackingRequest request);
    string GenerateTrackingUrl(string carrier, string trackingNumber);
}