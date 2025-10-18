namespace QuickShipTracker.Core.Models;

public class BillingPlan
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "USD";
    public int TrackingLimit { get; set; } // -1 for unlimited
    public List<string> Features { get; set; } = new();
    
    public static readonly BillingPlan Free = new()
    {
        Id = "free",
        Name = "Free",
        Price = 0,
        Currency = "USD",
        TrackingLimit = 10,
        Features = new List<string>
        {
            "10 trackings/month",
            "Basic support"
        }
    };
    
    public static readonly BillingPlan Basic = new()
    {
        Id = "basic",
        Name = "Basic",
        Price = 9.99m,
        Currency = "USD",
        TrackingLimit = 100,
        Features = new List<string>
        {
            "100 trackings/month",
            "Email support",
            "Bulk upload"
        }
    };
    
    public static readonly BillingPlan Pro = new()
    {
        Id = "pro",
        Name = "Pro",
        Price = 29.99m,
        Currency = "USD",
        TrackingLimit = -1, // Unlimited
        Features = new List<string>
        {
            "Unlimited trackings",
            "Priority support",
            "Bulk upload",
            "API access",
            "Custom carriers"
        }
    };
    
    public static List<BillingPlan> GetAllPlans()
    {
        return new List<BillingPlan> { Free, Basic, Pro };
    }
    
    public static BillingPlan GetPlan(string planId)
    {
        return planId?.ToLower() switch
        {
            "basic" => Basic,
            "pro" => Pro,
            _ => Free
        };
    }
}