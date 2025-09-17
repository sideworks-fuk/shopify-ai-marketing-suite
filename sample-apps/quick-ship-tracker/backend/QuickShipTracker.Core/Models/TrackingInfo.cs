using System.ComponentModel.DataAnnotations;

namespace QuickShipTracker.Core.Models;

public class TrackingInfo
{
    [Key]
    public long Id { get; set; }
    
    public long ShopId { get; set; }
    
    public long OrderId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Carrier { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string TrackingNumber { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? TrackingUrl { get; set; }
    
    public bool CustomerNotified { get; set; }
    
    public DateTime? ShippedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Shop Shop { get; set; } = null!;
    public virtual Order Order { get; set; } = null!;
}