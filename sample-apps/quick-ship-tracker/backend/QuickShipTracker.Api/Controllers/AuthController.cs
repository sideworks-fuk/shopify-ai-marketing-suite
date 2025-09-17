using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickShipTracker.Core.DTOs;
using QuickShipTracker.Core.Services;
using QuickShipTracker.Data;
using System.Security.Cryptography;
using System.Text;

namespace QuickShipTracker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, AppDbContext context, IConfiguration configuration)
    {
        _authService = authService;
        _context = context;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Shop))
        {
            return BadRequest(new ErrorResponse("VALIDATION_ERROR", "Shop domain is required"));
        }

        // Generate a random state parameter for CSRF protection
        var state = GenerateRandomString(32);
        HttpContext.Session.SetString($"state_{request.Shop}", state);

        var authUrl = _authService.GenerateAuthorizationUrl(request.Shop, state);

        return Ok(new LoginResponse { AuthUrl = authUrl });
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string shop, [FromQuery] string state)
    {
        // Validate parameters
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(shop))
        {
            return BadRequest(new ErrorResponse("VALIDATION_ERROR", "Missing required parameters"));
        }

        // Validate state parameter for CSRF protection
        var sessionState = HttpContext.Session.GetString($"state_{shop}");
        if (string.IsNullOrEmpty(sessionState) || sessionState != state)
        {
            return BadRequest(new ErrorResponse("VALIDATION_ERROR", "Invalid state parameter"));
        }

        // Clear the state from session
        HttpContext.Session.Remove($"state_{shop}");

        try
        {
            var result = await _authService.CompleteAuthorizationAsync(shop, code);
            if (result == null)
            {
                return BadRequest(new ErrorResponse("AUTH_ERROR", "Failed to complete authorization"));
            }

            // Set JWT token in HTTP-only cookie for security
            Response.Cookies.Append("auth_token", result.Token, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(7)
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ErrorResponse("INTERNAL_ERROR", "An error occurred during authentication", ex.Message));
        }
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token");
        return Ok(new { success = true });
    }

    [HttpGet("verify")]
    public async Task<IActionResult> Verify()
    {
        var shopId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(shopId))
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Invalid or missing authentication"));
        }

        var shop = await _context.Shops.FindAsync(long.Parse(shopId));
        if (shop == null || !shop.IsActive)
        {
            return Unauthorized(new ErrorResponse("UNAUTHORIZED", "Shop not found or inactive"));
        }

        return Ok(new ShopDto
        {
            Id = shop.Id.ToString(),
            Name = shop.Name,
            Domain = shop.Domain,
            PlanName = shop.PlanId
        });
    }

    private static string GenerateRandomString(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var data = new byte[length];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(data);
        }
        var result = new StringBuilder(length);
        foreach (var b in data)
        {
            result.Append(chars[b % chars.Length]);
        }
        return result.ToString();
    }
}