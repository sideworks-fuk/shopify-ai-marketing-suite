using System;
using System.ComponentModel.DataAnnotations;

namespace QuickShipTracker.Models
{
    public class Shop
    {
        [Key]
        public string ShopDomain { get; set; } = string.Empty;
        public string AccessToken { get; set; } = string.Empty;
        public string? ShopName { get; set; }
        public string? Email { get; set; }
        public string? PlanName { get; set; } = "free";
        public DateTime? ChargeActivatedOn { get; set; }
        public long? ChargeId { get; set; }
        public int MonthlyShipmentCount { get; set; } = 0;
        public DateTime MonthlyCountResetDate { get; set; } = DateTime.UtcNow;
        public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
        public DateTime? UninstalledAt { get; set; }
        public bool IsActive { get; set; } = true;
    }
}