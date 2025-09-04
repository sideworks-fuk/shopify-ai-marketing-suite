using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Moq;
using Moq.Protected;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using System.Net;
using System.Text;
using System.Text.Json;
using Xunit;

namespace ShopifyAnalyticsApi.Tests.Services
{
    public class ShopifySubscriptionServiceTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;
        private readonly Mock<IConfiguration> _configurationMock;
        private readonly Mock<ILogger<ShopifySubscriptionService>> _loggerMock;
        private readonly ShopifySubscriptionService _service;

        public ShopifySubscriptionServiceTests()
        {
            // In-memory database setup
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new ShopifyDbContext(options);

            // Mock setup
            _httpClientFactoryMock = new Mock<IHttpClientFactory>();
            _configurationMock = new Mock<IConfiguration>();
            _loggerMock = new Mock<ILogger<ShopifySubscriptionService>>();

            // Configuration setup
            _configurationMock.Setup(x => x["AppUrl"]).Returns("https://test.azurewebsites.net");
            _configurationMock.Setup(x => x["Shopify:TestMode"]).Returns("true");

            _service = new ShopifySubscriptionService(
                _context,
                _httpClientFactoryMock.Object,
                _configurationMock.Object,
                _loggerMock.Object
            );

            // Seed test data
            SeedTestData();
        }

        private void SeedTestData()
        {
            var store = new Store
            {
                Id = 1,
                Name = "Test Store",
                Domain = "test-store.myshopify.com",
                AccessToken = "test-access-token",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var plan = new SubscriptionPlan
            {
                Id = 1,
                Name = "Professional",
                Price = 79.00m,
                TrialDays = 7,
                IsActive = true,
                Features = "{\"maxProducts\": 10000, \"maxOrders\": 50000}",
                CreatedAt = DateTime.UtcNow
            };

            _context.Stores.Add(store);
            _context.SubscriptionPlans.Add(plan);
            _context.SaveChanges();
        }

        [Fact]
        public async Task CreateSubscription_ShouldReturnSuccess_WhenValidPlanAndStore()
        {
            // Arrange
            var shopDomain = "test-store.myshopify.com";
            var accessToken = "test-access-token";
            var planId = 1;

            var expectedResponse = new
            {
                data = new
                {
                    appSubscriptionCreate = new
                    {
                        appSubscription = new
                        {
                            id = "gid://shopify/AppSubscription/12345",
                            name = "Professional",
                            status = "PENDING"
                        },
                        confirmationUrl = "https://test-store.myshopify.com/admin/charges/confirm",
                        userErrors = new object[] { }
                    }
                }
            };

            var httpClient = CreateMockHttpClient(expectedResponse);
            _httpClientFactoryMock.Setup(x => x.CreateClient()).Returns(httpClient);

            // Act
            var result = await _service.CreateSubscription(shopDomain, accessToken, planId);

            // Assert
            Assert.True(result.Success);
            Assert.NotNull(result.ConfirmationUrl);
            Assert.Equal("https://test-store.myshopify.com/admin/charges/confirm", result.ConfirmationUrl);

            // Verify subscription was saved to database
            var savedSubscription = await _context.StoreSubscriptions.FirstOrDefaultAsync();
            Assert.NotNull(savedSubscription);
            Assert.Equal("pending", savedSubscription.Status);
            Assert.Equal(planId, savedSubscription.PlanId);
        }

        [Fact]
        public async Task CreateSubscription_ShouldReturnError_WhenPlanNotFound()
        {
            // Arrange
            var shopDomain = "test-store.myshopify.com";
            var accessToken = "test-access-token";
            var invalidPlanId = 999;

            // Act
            var result = await _service.CreateSubscription(shopDomain, accessToken, invalidPlanId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal("Plan not found", result.ErrorMessage);
        }

        [Fact]
        public async Task CreateSubscription_ShouldReturnError_WhenStoreNotFound()
        {
            // Arrange
            var invalidShopDomain = "invalid-store.myshopify.com";
            var accessToken = "test-access-token";
            var planId = 1;

            // Act
            var result = await _service.CreateSubscription(invalidShopDomain, accessToken, planId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal("Store not found", result.ErrorMessage);
        }

        [Fact]
        public async Task ConfirmSubscription_ShouldActivateSubscription_WhenValid()
        {
            // Arrange
            var shopDomain = "test-store.myshopify.com";
            var accessToken = "test-access-token";
            var chargeId = 12345L;

            // Create pending subscription
            var subscription = new StoreSubscription
            {
                StoreId = 1,
                PlanId = 1,
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };
            _context.StoreSubscriptions.Add(subscription);
            await _context.SaveChangesAsync();

            var expectedResponse = new
            {
                data = new
                {
                    node = new
                    {
                        id = "gid://shopify/AppSubscription/12345",
                        status = "ACTIVE",
                        currentPeriodEnd = DateTime.UtcNow.AddDays(30).ToString("O")
                    }
                }
            };

            var httpClient = CreateMockHttpClient(expectedResponse);
            _httpClientFactoryMock.Setup(x => x.CreateClient()).Returns(httpClient);

            // Act
            var result = await _service.ConfirmSubscription(shopDomain, accessToken, chargeId);

            // Assert
            Assert.True(result);

            // Verify subscription was activated
            var updatedSubscription = await _context.StoreSubscriptions.FirstAsync();
            Assert.Equal("active", updatedSubscription.Status);
            Assert.Equal(chargeId, updatedSubscription.ShopifyChargeId);
            Assert.NotNull(updatedSubscription.ActivatedAt);
        }

        [Fact]
        public async Task CancelSubscription_ShouldReturnTrue_WhenSuccessful()
        {
            // Arrange
            var shopDomain = "test-store.myshopify.com";
            var accessToken = "test-access-token";
            var chargeId = 12345L;

            var expectedResponse = new
            {
                data = new
                {
                    appSubscriptionCancel = new
                    {
                        appSubscription = new
                        {
                            id = "gid://shopify/AppSubscription/12345",
                            status = "CANCELLED"
                        },
                        userErrors = new object[] { }
                    }
                }
            };

            var httpClient = CreateMockHttpClient(expectedResponse);
            _httpClientFactoryMock.Setup(x => x.CreateClient()).Returns(httpClient);

            // Act
            var result = await _service.CancelSubscription(shopDomain, accessToken, chargeId);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task CheckTrialExpirations_ShouldIdentifyExpiredTrials()
        {
            // Arrange
            var expiredSubscription = new StoreSubscription
            {
                StoreId = 1,
                PlanId = 1,
                Status = "active",
                TrialEndsAt = DateTime.UtcNow.AddDays(-1), // Expired yesterday
                ShopifyChargeId = 12345,
                CreatedAt = DateTime.UtcNow.AddDays(-8)
            };
            _context.StoreSubscriptions.Add(expiredSubscription);
            await _context.SaveChangesAsync();

            // Act
            await _service.CheckTrialExpirations();

            // Assert
            // Verify that the method logged the expired trial
            _loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Trial expired")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task ExecuteGraphQL_ShouldRetryOnRateLimit()
        {
            // Arrange
            var shopDomain = "test-store.myshopify.com";
            var accessToken = "test-access-token";
            
            var handlerMock = new Mock<HttpMessageHandler>();
            var responses = new Queue<HttpResponseMessage>();
            
            // First response: Rate limited
            responses.Enqueue(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.TooManyRequests,
                Headers = { RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromSeconds(1)) }
            });
            
            // Second response: Success
            var successResponse = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(new { data = new { test = "success" } }))
            };
            responses.Enqueue(successResponse);

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(() => responses.Dequeue());

            var httpClient = new HttpClient(handlerMock.Object);
            _httpClientFactoryMock.Setup(x => x.CreateClient()).Returns(httpClient);

            // Act
            // Need to use reflection to test private method
            var methodInfo = typeof(ShopifySubscriptionService).GetMethod(
                "ExecuteGraphQL",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            
            Assert.NotNull(methodInfo);

            var task = (Task<JsonDocument?>)methodInfo.Invoke(
                _service,
                new object[] { shopDomain, accessToken, "query { test }", new { }, 3 });
            
            var result = await task;

            // Assert
            Assert.NotNull(result);
            
            // Verify retry was logged
            _loggerMock.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Rate limited")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        private HttpClient CreateMockHttpClient(object responseContent)
        {
            var handlerMock = new Mock<HttpMessageHandler>();
            var response = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(responseContent), Encoding.UTF8, "application/json")
            };

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(response);

            return new HttpClient(handlerMock.Object);
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}