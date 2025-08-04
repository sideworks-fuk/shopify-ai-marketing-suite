using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using WebhookFunction.Models;

namespace WebhookFunction.Services;

public class WebhookProcessingService : IWebhookProcessingService
{
    private readonly ILogger<WebhookProcessingService> _logger;
    private readonly IConfiguration _configuration;

    public WebhookProcessingService(
        ILogger<WebhookProcessingService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<bool> ValidateWebhookSignature(ShopifyWebhookData webhookData)
    {
        try
        {
            var webhookSecret = _configuration["SHOPIFY_WEBHOOK_SECRET"];
            if (string.IsNullOrEmpty(webhookSecret))
            {
                _logger.LogWarning("⚠️ SHOPIFY_WEBHOOK_SECRET not configured. Skipping signature validation.");
                return true; // Allow processing in development
            }

            // Get signature from headers
            var signature = webhookData.Headers?.GetValueOrDefault("X-Shopify-Hmac-Sha256");
            if (string.IsNullOrEmpty(signature))
            {
                _logger.LogWarning("⚠️ No webhook signature found in headers");
                return false;
            }

            // Calculate expected signature
            var rawPayload = webhookData.Data?.ToString() ?? "";
            var expectedSignature = await ComputeHmacSha256(rawPayload, webhookSecret);

            var isValid = string.Equals(signature, expectedSignature, StringComparison.OrdinalIgnoreCase);
            
            if (isValid)
            {
                _logger.LogInformation("✅ Webhook signature validation successful");
            }
            else
            {
                _logger.LogWarning("❌ Webhook signature validation failed. Expected: {Expected}, Received: {Received}", 
                    expectedSignature, signature);
            }

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error validating webhook signature");
            return false;
        }
    }

    public async Task<bool> ProcessWebhookData(ShopifyWebhookData webhookData)
    {
        try
        {
            _logger.LogInformation("🔄 Processing webhook data for topic: {Topic}", webhookData.Topic);

            // Extract store ID for multi-tenant processing
            var storeId = await ExtractStoreId(webhookData);
            webhookData.StoreId = storeId;

            if (!string.IsNullOrEmpty(storeId))
            {
                _logger.LogInformation("🏪 Identified store: {StoreId}", storeId);
            }
            else
            {
                _logger.LogWarning("⚠️ Could not identify store from webhook data");
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error processing webhook data");
            return false;
        }
    }

    public async Task<string?> ExtractStoreId(ShopifyWebhookData webhookData)
    {
        try
        {
            // Method 1: Extract from shop domain
            if (!string.IsNullOrEmpty(webhookData.ShopDomain))
            {
                var shopName = webhookData.ShopDomain.Split('.')[0];
                _logger.LogInformation("🏪 Extracted shop name from domain: {ShopName}", shopName);
                return shopName;
            }

            // Method 2: Extract from headers
            var shopDomainHeader = webhookData.Headers?.GetValueOrDefault("X-Shopify-Shop-Domain");
            if (!string.IsNullOrEmpty(shopDomainHeader))
            {
                var shopName = shopDomainHeader.Split('.')[0];
                _logger.LogInformation("🏪 Extracted shop name from headers: {ShopName}", shopName);
                return shopName;
            }

            // Method 3: Extract from webhook data (if it contains store info)
            // This would depend on your specific webhook payload structure

            _logger.LogWarning("⚠️ Could not extract store ID from webhook data");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 Error extracting store ID");
            return null;
        }
        finally
        {
            await Task.CompletedTask; // Satisfy async requirement
        }
    }

    private async Task<string> ComputeHmacSha256(string data, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var dataBytes = Encoding.UTF8.GetBytes(data);

        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(dataBytes);
        
        await Task.CompletedTask; // Satisfy async requirement
        return Convert.ToBase64String(hashBytes);
    }
}