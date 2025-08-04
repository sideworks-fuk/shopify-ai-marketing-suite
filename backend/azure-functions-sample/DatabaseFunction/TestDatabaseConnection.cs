using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using DatabaseFunction.Services;

namespace DatabaseFunction
{
    public class TestDatabaseConnection
    {
        private readonly ILogger<TestDatabaseConnection> _logger;
        private readonly IDatabaseService _databaseService;

        public TestDatabaseConnection(
            ILogger<TestDatabaseConnection> logger,
            IDatabaseService databaseService)
        {
            _logger = logger;
            _databaseService = databaseService;
        }

        [Function("TestDatabaseConnection")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "database/test")] HttpRequestData req)
        {
            _logger.LogInformation("Testing database connection");

            try
            {
                var isConnected = await _databaseService.TestConnectionAsync();

                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new
                {
                    success = isConnected,
                    message = isConnected 
                        ? "Database connection successful" 
                        : "Database connection failed",
                    timestamp = DateTime.UtcNow,
                    environment = Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT") ?? "Development"
                });

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing database connection");

                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteAsJsonAsync(new
                {
                    success = false,
                    error = "Connection test failed",
                    message = ex.Message
                });

                return errorResponse;
            }
        }
    }
}