using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ShopifyAnalyticsApi.Controllers;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Services;
using System.Text.Json;
using System.Web;
using Xunit;

namespace ShopifyAnalyticsApi.Tests.Controllers
{
    /// <summary>
    /// ShopifyAuthControllerのテストクラス
    /// </summary>
    public class ShopifyAuthControllerTests
    {
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly Mock<ILogger<ShopifyAuthController>> _mockLogger;
        private readonly Mock<ShopifyDbContext> _mockContext;
        private readonly Mock<IHttpClientFactory> _mockHttpClientFactory;
        private readonly IMemoryCache _memoryCache;
        private readonly ShopifyAuthController _controller;

        public ShopifyAuthControllerTests()
        {
            _mockConfiguration = new Mock<IConfiguration>();
            _mockLogger = new Mock<ILogger<ShopifyAuthController>>();
            _mockContext = new Mock<ShopifyDbContext>();
            _mockHttpClientFactory = new Mock<IHttpClientFactory>();
            _memoryCache = new MemoryCache(new MemoryCacheOptions());

            // デフォルト設定
            _mockConfiguration.Setup(x => x["Shopify:ApiKey"]).Returns("test-api-key");
            _mockConfiguration.Setup(x => x["Shopify:ApiSecret"]).Returns("test-api-secret");
            _mockConfiguration.Setup(x => x["Shopify:EncryptionKey"]).Returns("dGVzdC1lbmNyeXB0aW9uLWtleS1mb3ItdGVzdGluZw=="); // Base64 encoded 32-byte key
            _mockConfiguration.Setup(x => x["Shopify:Scopes"]).Returns("read_orders,read_products,read_customers");
            _mockConfiguration.Setup(x => x["Frontend:BaseUrl"]).Returns("http://localhost:3000");

            // ShopifyOAuthServiceを作成
            var mockOAuthLogger = new Mock<ILogger<ShopifyOAuthService>>();
            var oauthService = new ShopifyOAuthService(
                _mockConfiguration.Object,
                mockOAuthLogger.Object,
                _memoryCache);

            _controller = new ShopifyAuthController(
                _mockConfiguration.Object,
                _mockLogger.Object,
                _mockContext.Object,
                _mockHttpClientFactory.Object,
                _memoryCache,
                oauthService);
        }

        [Fact]
        public async Task Install_WithValidShopDomain_ReturnsRedirect()
        {
            // Arrange
            var shop = "test-shop.myshopify.com";

            // Act
            var result = await _controller.Install(shop);

            // Assert
            Assert.IsType<RedirectResult>(result);
            var redirectResult = (RedirectResult)result;
            Assert.Contains(shop, redirectResult.Url);
            Assert.Contains("test-api-key", redirectResult.Url);
        }

        [Fact]
        public async Task Install_WithInvalidShopDomain_ReturnsBadRequest()
        {
            // Arrange
            var shop = "invalid-shop.com";

            // Act
            var result = await _controller.Install(shop);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task Install_WithNullShopDomain_ReturnsBadRequest()
        {
            // Arrange
            string? shop = null;

            // Act
            var result = await _controller.Install(shop!);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public void TestConfig_ReturnsConfigurationStatus()
        {
            // Act
            var result = _controller.TestConfig();

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var okResult = (OkObjectResult)result;
            var response = JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(okResult.Value));
            
            Assert.True(response.GetProperty("config").GetProperty("ApiKey").GetBoolean());
            Assert.True(response.GetProperty("config").GetProperty("ApiSecret").GetBoolean());
            Assert.True(response.GetProperty("config").GetProperty("EncryptionKey").GetBoolean());
        }

        [Fact]
        public void TestEncryption_WithValidText_ReturnsEncryptedAndDecrypted()
        {
            // Arrange
            var testText = "test-token-string";
            var request = new ShopifyAuthController.TestEncryptionRequest { Text = testText };

            // Act
            var result = _controller.TestEncryption(request);

            // Assert
            Assert.IsType<OkObjectResult>(result);
            var okResult = (OkObjectResult)result;
            var response = JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(okResult.Value));
            
            Assert.Equal(testText, response.GetProperty("original").GetString());
            Assert.Equal(testText, response.GetProperty("decrypted").GetString());
            Assert.True(response.GetProperty("success").GetBoolean());
            Assert.NotEqual(testText, response.GetProperty("encrypted").GetString());
        }

        [Fact]
        public void TestEncryption_WithNullText_ReturnsBadRequest()
        {
            // Arrange
            var request = new ShopifyAuthController.TestEncryptionRequest { Text = null };

            // Act
            var result = _controller.TestEncryption(request);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public void TestEncryption_WithEmptyText_ReturnsBadRequest()
        {
            // Arrange
            var request = new ShopifyAuthController.TestEncryptionRequest { Text = "" };

            // Act
            var result = _controller.TestEncryption(request);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Theory]
        [InlineData("valid-shop.myshopify.com", true)]
        [InlineData("invalid-shop.com", false)]
        [InlineData("shop.myshopify.com", true)]
        [InlineData("", false)]
        [InlineData(null, false)]
        [InlineData("shop<script>.myshopify.com", false)]
        public async Task IsValidShopDomain_ValidatesCorrectly(string shop, bool expected)
        {
            // Arrange & Act
            var result = await _controller.Install(shop);

            // Assert
            if (expected)
            {
                Assert.IsType<RedirectResult>(result);
            }
            else
            {
                Assert.IsType<BadRequestObjectResult>(result);
            }
        }

        [Fact]
        public async Task Install_GeneratesUniqueStateForEachRequest()
        {
            // Arrange
            var shop = "test-shop.myshopify.com";

            // Act
            var result1 = await _controller.Install(shop);
            var result2 = await _controller.Install(shop);

            // Assert
            Assert.IsType<RedirectResult>(result1);
            Assert.IsType<RedirectResult>(result2);
            
            var redirect1 = (RedirectResult)result1;
            var redirect2 = (RedirectResult)result2;
            
            // Stateパラメータが異なることを確認
            var state1 = ExtractStateFromUrl(redirect1.Url);
            var state2 = ExtractStateFromUrl(redirect2.Url);
            
            Assert.NotEqual(state1, state2);
        }

        private string? ExtractStateFromUrl(string url)
        {
            var uri = new Uri(url);
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
            return query["state"];
        }
    }
}