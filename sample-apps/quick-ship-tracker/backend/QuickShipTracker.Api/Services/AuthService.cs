using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using QuickShipTracker.Core.Configuration;
using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Models;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;
using ShopifySharp;
using ShopifySharp.Enums;

namespace QuickShipTracker.Api.Services;

public class AuthService : IAuthService
{
    private readonly ShopifySettings _shopifySettings;
    private readonly JwtSettings _jwtSettings;
    private readonly AppDbContext _context;

    public AuthService(IOptions<ShopifySettings> shopifySettings, IOptions<JwtSettings> jwtSettings, AppDbContext context)
    {
        _shopifySettings = shopifySettings.Value;
        _jwtSettings = jwtSettings.Value;
        _context = context;
    }

    public string GenerateAuthorizationUrl(string shop, string state)
    {
        var authorizationUrl = AuthorizationService.BuildAuthorizationUrl(
            _shopifySettings.Scopes.Split(','),
            shop,
            _shopifySettings.ApiKey,
            _shopifySettings.RedirectUri,
            state
        );

        return authorizationUrl.ToString();
    }

    public async Task<AuthCallbackResponse?> CompleteAuthorizationAsync(string shop, string code)
    {
        try
        {
            // Exchange the authorization code for an access token
            var accessToken = await AuthorizationService.Authorize(code, shop, _shopifySettings.ApiKey, _shopifySettings.ApiSecret);

            // Get shop information
            var service = new ShopService(shop, accessToken);
            var shopInfo = await service.GetAsync();

            // Find or create shop in database
            var dbShop = _context.Shops.FirstOrDefault(s => s.Domain == shop);
            if (dbShop == null)
            {
                dbShop = new QuickShipTracker.Core.Models.Shop
                {
                    Id = shopInfo.Id ?? 0,
                    Domain = shop,
                    Name = shopInfo.Name ?? shop,
                    Email = shopInfo.Email ?? "",
                    AccessToken = accessToken,
                    PlanId = "free",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };
                _context.Shops.Add(dbShop);
            }
            else
            {
                dbShop.AccessToken = accessToken;
                dbShop.Name = shopInfo.Name ?? shop;
                dbShop.Email = shopInfo.Email ?? "";
                dbShop.UpdatedAt = DateTime.UtcNow;
                dbShop.IsActive = true;
            }

            await _context.SaveChangesAsync();

            // Generate JWT token
            var token = GenerateJwtToken(dbShop.Id, dbShop.Domain, dbShop.PlanId);

            return new AuthCallbackResponse
            {
                Token = token,
                Shop = new ShopDto
                {
                    Id = dbShop.Id.ToString(),
                    Name = dbShop.Name,
                    Domain = dbShop.Domain,
                    PlanName = BillingPlan.GetPlan(dbShop.PlanId).Name
                }
            };
        }
        catch (Exception ex)
        {
            // Log exception
            Console.WriteLine($"Authorization failed: {ex.Message}");
            return null;
        }
    }

    public string GenerateJwtToken(long shopId, string shopDomain, string planId)
    {
        var key = Encoding.ASCII.GetBytes(_jwtSettings.Secret);
        var tokenHandler = new JwtSecurityTokenHandler();
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", shopId.ToString()),
                new Claim("shop", shopDomain),
                new Claim("planId", planId),
                new Claim(ClaimTypes.NameIdentifier, shopId.ToString())
            }),
            Expires = DateTime.UtcNow.AddDays(_jwtSettings.ExpirationInDays),
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public bool ValidateWebhookRequest(string requestBody, string hmacHeader)
    {
        var hash = Convert.ToBase64String(
            new HMACSHA256(Encoding.UTF8.GetBytes(_shopifySettings.WebhookSecret))
                .ComputeHash(Encoding.UTF8.GetBytes(requestBody))
        );

        return hash == hmacHeader;
    }
}