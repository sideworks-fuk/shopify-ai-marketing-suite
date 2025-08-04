using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Azure.Messaging.ServiceBus;
using WebhookFunction.Services;
using WebhookFunction.Models;
using Newtonsoft.Json;
using System.Text;

namespace WebhookFunction;

public class ShopifyWebhookProcessor
{
    private readonly ILogger<ShopifyWebhookProcessor> _logger;
    private readonly IWebhookProcessingService _webhookProcessor;
    private readonly IShopifyDataSyncService _dataSyncService;

    public ShopifyWebhookProcessor(
        ILogger<ShopifyWebhookProcessor> logger,
        IWebhookProcessingService webhookProcessor,
        IShopifyDataSyncService dataSyncService)
    {
        _logger = logger;
        _webhookProcessor = webhookProcessor;
        _dataSyncService = dataSyncService;
    }

    [Function("ProcessShopifyWebhook")]
    public async Task ProcessWebhook(
        [ServiceBusTrigger("shopify-webhooks", Connection = "ServiceBusConnectionString")] 
        ServiceBusReceivedMessage message,
        ServiceBusMessageActions messageActions)
    {
        try
        {
            _logger.LogInformation("🔔 Processing Shopify webhook. MessageId: {MessageId}", message.MessageId);

            // Get message body
            var messageBody = Encoding.UTF8.GetString(message.Body);
            _logger.LogInformation("📄 Message body length: {Length} characters", messageBody.Length);

            // Parse webhook data
            var webhookData = JsonConvert.DeserializeObject<ShopifyWebhookData>(messageBody);
            if (webhookData == null)
            {
                _logger.LogError("❌ Failed to deserialize webhook data");
                await messageActions.DeadLetterMessageAsync(message, "Invalid JSON format");
                return;
            }

            // Validate webhook signature if configured
            if (await _webhookProcessor.ValidateWebhookSignature(webhookData))
            {
                _logger.LogInformation("✅ Webhook signature validated successfully");
            }
            else
            {
                _logger.LogWarning("⚠️ Webhook signature validation failed");
            }

            // Process based on webhook type
            var processed = webhookData.Topic?.ToLower() switch
            {
                "orders/create" => await ProcessOrderCreate(webhookData),
                "orders/updated" => await ProcessOrderUpdate(webhookData),
                "orders/cancelled" => await ProcessOrderCancel(webhookData),
                "customers/create" => await ProcessCustomerCreate(webhookData),
                "customers/update" => await ProcessCustomerUpdate(webhookData),
                "products/create" => await ProcessProductCreate(webhookData),
                "products/update" => await ProcessProductUpdate(webhookData),
                _ => await ProcessUnknownWebhook(webhookData)
            };

            if (processed)
            {
                _logger.LogInformation("✅ Successfully processed webhook: {Topic}", webhookData.Topic);
                await messageActions.CompleteMessageAsync(message);
            }
            else
            {
                _logger.LogError("❌ Failed to process webhook: {Topic}", webhookData.Topic);
                await messageActions.DeadLetterMessageAsync(message, "Processing failed");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error processing webhook message");
            
            // Check retry count
            var deliveryCount = message.DeliveryCount;
            if (deliveryCount >= 3)
            {
                await messageActions.DeadLetterMessageAsync(message, ex.Message);
                _logger.LogError("☠️ Message sent to dead letter queue after {Count} attempts", deliveryCount);
            }
            else
            {
                // Abandon message for retry
                await messageActions.AbandonMessageAsync(message);
                _logger.LogInformation("🔄 Message abandoned for retry. Attempt: {Count}", deliveryCount);
            }
        }
    }

    private async Task<bool> ProcessOrderCreate(ShopifyWebhookData webhookData)
    {
        _logger.LogInformation("🛍️ Processing new order creation");
        
        try
        {
            var orderData = JsonConvert.DeserializeObject<dynamic>(webhookData.Data?.ToString() ?? "{}");
            
            // Extract key information
            var orderId = orderData?.id?.ToString();
            var customerId = orderData?.customer?.id?.ToString();
            var totalPrice = orderData?.total_price?.ToString();
            
            _logger.LogInformation("📊 Order details - ID: {OrderId}, Customer: {CustomerId}, Total: ${Total}", 
                orderId, customerId, totalPrice);

            // Sync order data to database
            await _dataSyncService.SyncOrderData(webhookData);
            
            // Update customer statistics
            if (!string.IsNullOrEmpty(customerId))
            {
                await _dataSyncService.UpdateCustomerStatistics(customerId);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing order creation");
            return false;
        }
    }

    private async Task<bool> ProcessOrderUpdate(ShopifyWebhookData webhookData)
    {
        _logger.LogInformation("📝 Processing order update");
        
        try
        {
            await _dataSyncService.SyncOrderData(webhookData);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing order update");
            return false;
        }
    }

    private async Task<bool> ProcessOrderCancel(ShopifyWebhookData webhookData)
    {
        _logger.LogInformation("❌ Processing order cancellation");
        
        try
        {
            await _dataSyncService.HandleOrderCancellation(webhookData);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing order cancellation");
            return false;
        }
    }

    private async Task<bool> ProcessCustomerCreate(ShopifyWebhookData webhookData)
    {
        _logger.LogInformation("👤 Processing new customer creation");
        
        try
        {
            await _dataSyncService.SyncCustomerData(webhookData);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing customer creation");
            return false;
        }
    }

    private async Task<bool> ProcessCustomerUpdate(ShopifyWebhookData webhookData)
    {
        _logger.LogInformation("🔄 Processing customer update");
        
        try
        {
            await _dataSyncService.SyncCustomerData(webhookData);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing customer update");
            return false;
        }
    }

    private async Task<bool> ProcessProductCreate(ShopifyWebhookData webhookData)
    {
        _logger.LogInformation("🏷️ Processing new product creation");
        
        try
        {
            await _dataSyncService.SyncProductData(webhookData);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing product creation");
            return false;
        }
    }

    private async Task<bool> ProcessProductUpdate(ShopifyWebhookData webhookData)
    {
        _logger.LogInformation("📦 Processing product update");
        
        try
        {
            await _dataSyncService.SyncProductData(webhookData);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing product update");
            return false;
        }
    }

    private async Task<bool> ProcessUnknownWebhook(ShopifyWebhookData webhookData)
    {
        _logger.LogWarning("❓ Unknown webhook type: {Topic}", webhookData.Topic);
        
        // Log for monitoring but don't fail
        await Task.CompletedTask;
        return true;
    }
}