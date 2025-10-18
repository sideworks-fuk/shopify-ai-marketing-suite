namespace QuickShipTracker.Core.DTOs;

public class AuthCallbackResponse
{
    public string Token { get; set; } = string.Empty;
    public ShopDto Shop { get; set; } = new();
}

public class ShopDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
}