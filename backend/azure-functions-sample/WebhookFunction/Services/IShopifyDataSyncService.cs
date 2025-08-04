using WebhookFunction.Models;

namespace WebhookFunction.Services;

public interface IShopifyDataSyncService
{
    /// <summary>
    /// Synchronizes order data from webhook to database
    /// </summary>
    Task<bool> SyncOrderData(ShopifyWebhookData webhookData);

    /// <summary>
    /// Synchronizes customer data from webhook to database
    /// </summary>
    Task<bool> SyncCustomerData(ShopifyWebhookData webhookData);

    /// <summary>
    /// Synchronizes product data from webhook to database
    /// </summary>
    Task<bool> SyncProductData(ShopifyWebhookData webhookData);

    /// <summary>
    /// Updates customer statistics after order changes
    /// </summary>
    Task<bool> UpdateCustomerStatistics(string customerId);

    /// <summary>
    /// Handles order cancellation and updates related data
    /// </summary>
    Task<bool> HandleOrderCancellation(ShopifyWebhookData webhookData);

    /// <summary>
    /// Processes inventory updates from product webhooks
    /// </summary>
    Task<bool> UpdateInventoryData(ShopifyWebhookData webhookData);
}