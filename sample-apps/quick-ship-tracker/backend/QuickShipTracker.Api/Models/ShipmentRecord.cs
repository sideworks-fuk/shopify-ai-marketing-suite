using System;
using System.ComponentModel.DataAnnotations;

namespace QuickShipTracker.Models
{
    public class ShipmentRecord
    {
        [Key]
        public int Id { get; set; }
        public string ShopDomain { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string OrderNumber { get; set; } = string.Empty;
        public string TrackingNumber { get; set; } = string.Empty;
        public string TrackingCompany { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public DateTime ShippedAt { get; set; } = DateTime.UtcNow;
        public bool NotificationSent { get; set; } = false;
    }
}