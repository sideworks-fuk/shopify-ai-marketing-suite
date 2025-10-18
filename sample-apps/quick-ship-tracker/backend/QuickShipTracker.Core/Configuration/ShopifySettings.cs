namespace QuickShipTracker.Core.Configuration;

public class ShopifySettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
    public string Scopes { get; set; } = "read_orders,write_fulfillments,write_draft_orders";
    public string RedirectUri { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
}