using QuickShipTracker.Core.DTOs;

namespace QuickShipTracker.Core.Services;

public interface IAuthService
{
    string GenerateAuthorizationUrl(string shop, string state);
    Task<AuthCallbackResponse?> CompleteAuthorizationAsync(string shop, string code);
    string GenerateJwtToken(long shopId, string shopDomain, string planId);
    bool ValidateWebhookRequest(string requestBody, string hmacHeader);
}