using System.ComponentModel.DataAnnotations;

namespace QuickShipTracker.Core.DTOs;

public class TrackingInfoDto
{
    public string Carrier { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string? TrackingUrl { get; set; }
    public DateTime? ShippedAt { get; set; }
}

public class CreateTrackingRequest
{
    [Required]
    public string OrderId { get; set; } = string.Empty;
    
    [Required]
    public string Carrier { get; set; } = string.Empty;
    
    [Required]
    public string TrackingNumber { get; set; } = string.Empty;
    
    public bool NotifyCustomer { get; set; } = true;
}

public class UpdateTrackingRequest
{
    [Required]
    public string Carrier { get; set; } = string.Empty;
    
    [Required]
    public string TrackingNumber { get; set; } = string.Empty;
}

public class BulkTrackingRequest
{
    [Required]
    public List<BulkTrackingItem> Trackings { get; set; } = new();
}

public class BulkTrackingItem
{
    [Required]
    public string OrderId { get; set; } = string.Empty;
    
    [Required]
    public string Carrier { get; set; } = string.Empty;
    
    [Required]
    public string TrackingNumber { get; set; } = string.Empty;
}

public class TrackingResponse
{
    public bool Success { get; set; }
    public TrackingDto? Tracking { get; set; }
}

public class TrackingDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string Carrier { get; set; } = string.Empty;
    public string TrackingNumber { get; set; } = string.Empty;
    public string? TrackingUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BulkTrackingResponse
{
    public int Success { get; set; }
    public int Failed { get; set; }
    public List<BulkTrackingResult> Results { get; set; } = new();
}

public class BulkTrackingResult
{
    public string OrderId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? TrackingId { get; set; }
    public string? Error { get; set; }
}