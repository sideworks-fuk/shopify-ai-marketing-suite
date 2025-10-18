using System.ComponentModel.DataAnnotations;

namespace QuickShipTracker.Core.Models;

public class Shop
{
    [Key]
    public long Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Domain { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string AccessToken { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string PlanId { get; set; } = "free";
    
    public int MonthlyTrackingCount { get; set; }
    
    public DateTime? LastTrackingResetDate { get; set; }
    
    public long? ActiveChargeId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsActive { get; set; } = true;
    
    // Navigation properties
    public virtual ICollection<TrackingInfo> TrackingInfos { get; set; } = new List<TrackingInfo>();
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}