using System.ComponentModel.DataAnnotations;

namespace QuickShipTracker.Core.Models;

public class Order
{
    [Key]
    public long Id { get; set; }
    
    public long ShopId { get; set; }
    
    public long ShopifyOrderId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string CustomerName { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string CustomerEmail { get; set; } = string.Empty;
    
    public decimal TotalPrice { get; set; }
    
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";
    
    [MaxLength(50)]
    public string FulfillmentStatus { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string FinancialStatus { get; set; } = string.Empty;
    
    public DateTime OrderCreatedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Shop Shop { get; set; } = null!;
    public virtual TrackingInfo? TrackingInfo { get; set; }
}