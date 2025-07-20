using Microsoft.AspNetCore.Mvc;

namespace ShopifyTestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;

        public HealthController(ILogger<HealthController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Get()
        {
            _logger.LogInformation("Health check endpoint called");
            
            return Ok(new 
            { 
                status = "healthy",
                timestamp = DateTime.UtcNow,
                message = "API is running!",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown"
            });
        }

        [HttpGet("detailed")]
        public IActionResult GetDetailed()
        {
            _logger.LogInformation("Detailed health check endpoint called");
            
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                machineName = Environment.MachineName,
                osVersion = Environment.OSVersion.ToString(),
                dotnetVersion = Environment.Version.ToString(),
                uptime = GetUptime()
            });
        }

        private string GetUptime()
        {
            var uptime = DateTime.UtcNow - System.Diagnostics.Process.GetCurrentProcess().StartTime.ToUniversalTime();
            return $"{uptime.Days}d {uptime.Hours}h {uptime.Minutes}m {uptime.Seconds}s";
        }
    }
} 