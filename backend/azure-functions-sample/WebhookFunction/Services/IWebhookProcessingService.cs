using WebhookFunction.Models;

namespace WebhookFunction.Services;

public interface IWebhookProcessingService
{
    /// <summary>
    /// Validates Shopify webhook signature using HMAC-SHA256
    /// </summary>
    Task<bool> ValidateWebhookSignature(ShopifyWebhookData webhookData);

    /// <summary>
    /// Processes webhook data and determines routing
    /// </summary>
    Task<bool> ProcessWebhookData(ShopifyWebhookData webhookData);

    /// <summary>
    /// Extracts store information from webhook data
    /// </summary>
    Task<string?> ExtractStoreId(ShopifyWebhookData webhookData);
}