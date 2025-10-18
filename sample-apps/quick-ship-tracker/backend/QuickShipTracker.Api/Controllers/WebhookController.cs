using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;
using System.Text;
using System.Text.Json;

namespace QuickShipTracker.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhookController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AppDbContext _context;
    private readonly ILogger<WebhookController> _logger;

    public WebhookController(IAuthService authService, AppDbContext context, ILogger<WebhookController> logger)
    {
        _authService = authService;
        _context = context;
        _logger = logger;
    }

    [HttpPost("app/uninstalled")]
    public async Task<IActionResult> AppUninstalled()
    {
        var (isValid, body, shopDomain) = await ValidateWebhookRequest();
        if (!isValid)
        {
            return Unauthorized();
        }

        try
        {
            var shop = await _context.Shops.FirstOrDefaultAsync(s => s.Domain == shopDomain);
            if (shop != null)
            {
                shop.IsActive = false;
                shop.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation($"App uninstalled for shop: {shopDomain}");
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error processing app/uninstalled webhook for shop: {shopDomain}");
            return StatusCode(500);
        }
    }

    [HttpPost("customers/data_request")]
    public async Task<IActionResult> CustomersDataRequest()
    {
        var (isValid, body, shopDomain) = await ValidateWebhookRequest();
        if (!isValid)
        {
            return Unauthorized();
        }

        try
        {
            var requestData = JsonSerializer.Deserialize<CustomerDataRequest>(body);
            if (requestData != null)
            {
                // Log the data request for GDPR compliance
                _logger.LogInformation($"Customer data request for shop {shopDomain}, customer: {requestData.Customer?.Email}");
                
                // In a production app, you would:
                // 1. Queue a job to collect customer data
                // 2. Send the data to the customer or designated endpoint
                // 3. Log the completion of the request
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error processing customers/data_request webhook for shop: {shopDomain}");
            return StatusCode(500);
        }
    }

    [HttpPost("customers/redact")]
    public async Task<IActionResult> CustomersRedact()
    {
        var (isValid, body, shopDomain) = await ValidateWebhookRequest();
        if (!isValid)
        {
            return Unauthorized();
        }

        try
        {
            var requestData = JsonSerializer.Deserialize<CustomerRedactRequest>(body);
            if (requestData != null && requestData.Customer != null)
            {
                // Find and delete customer-related data
                var shop = await _context.Shops.FirstOrDefaultAsync(s => s.Domain == shopDomain);
                if (shop != null)
                {
                    var ordersToRedact = await _context.Orders
                        .Where(o => o.ShopId == shop.Id && o.CustomerEmail == requestData.Customer.Email)
                        .ToListAsync();

                    foreach (var order in ordersToRedact)
                    {
                        // Redact customer information
                        order.CustomerName = "REDACTED";
                        order.CustomerEmail = "REDACTED";
                        order.UpdatedAt = DateTime.UtcNow;
                    }

                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Customer data redacted for shop {shopDomain}, customer: {requestData.Customer.Email}");
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error processing customers/redact webhook for shop: {shopDomain}");
            return StatusCode(500);
        }
    }

    [HttpPost("shop/redact")]
    public async Task<IActionResult> ShopRedact()
    {
        var (isValid, body, shopDomain) = await ValidateWebhookRequest();
        if (!isValid)
        {
            return Unauthorized();
        }

        try
        {
            var shop = await _context.Shops
                .Include(s => s.Orders)
                .Include(s => s.TrackingInfos)
                .FirstOrDefaultAsync(s => s.Domain == shopDomain);

            if (shop != null)
            {
                // Delete all shop data (GDPR compliance after 48 hours of app uninstall)
                _context.TrackingInfos.RemoveRange(shop.TrackingInfos);
                _context.Orders.RemoveRange(shop.Orders);
                _context.Shops.Remove(shop);
                
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Shop data completely removed for: {shopDomain}");
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error processing shop/redact webhook for shop: {shopDomain}");
            return StatusCode(500);
        }
    }

    private async Task<(bool isValid, string body, string shopDomain)> ValidateWebhookRequest()
    {
        // Read the raw body
        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        // Get the HMAC header
        var hmacHeader = Request.Headers["X-Shopify-Hmac-Sha256"].FirstOrDefault();
        var shopDomain = Request.Headers["X-Shopify-Shop-Domain"].FirstOrDefault() ?? "";

        if (string.IsNullOrEmpty(hmacHeader))
        {
            _logger.LogWarning("Webhook request missing HMAC header");
            return (false, body, shopDomain);
        }

        // Validate the webhook
        var isValid = _authService.ValidateWebhookRequest(body, hmacHeader);
        if (!isValid)
        {
            _logger.LogWarning($"Invalid webhook signature for shop: {shopDomain}");
        }

        return (isValid, body, shopDomain);
    }

    private class CustomerDataRequest
    {
        public long ShopId { get; set; }
        public string ShopDomain { get; set; } = string.Empty;
        public CustomerInfo? Customer { get; set; }
        public DataRequestInfo? DataRequest { get; set; }
    }

    private class CustomerRedactRequest
    {
        public long ShopId { get; set; }
        public string ShopDomain { get; set; } = string.Empty;
        public CustomerInfo? Customer { get; set; }
    }

    private class CustomerInfo
    {
        public long Id { get; set; }
        public string Email { get; set; } = string.Empty;
    }

    private class DataRequestInfo
    {
        public long Id { get; set; }
    }
}