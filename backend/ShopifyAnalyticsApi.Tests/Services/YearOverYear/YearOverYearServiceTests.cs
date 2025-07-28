using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.YearOverYear;
using Xunit;

namespace ShopifyAnalyticsApi.Tests.Services.YearOverYear
{
    public class YearOverYearServiceTests
    {
        private ShopifyDbContext GetInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: System.Guid.NewGuid().ToString())
                .Options;

            return new ShopifyDbContext(options);
        }

        [Fact]
        public async Task GetYearOverYearAnalysis_Should_Return_All_Products_Without_Limit()
        {
            // Arrange
            using var context = GetInMemoryContext();
            var cache = new MemoryCache(new MemoryCacheOptions());
            var logger = new Mock<ILogger<YearOverYearService>>().Object;
            var dataServiceLogger = new Mock<ILogger<YearOverYearDataService>>().Object;
            var calculationServiceLogger = new Mock<ILogger<YearOverYearCalculationService>>().Object;
            var filterServiceLogger = new Mock<ILogger<YearOverYearFilterService>>().Object;
            var orchestrationServiceLogger = new Mock<ILogger<YearOverYearOrchestrationService>>().Object;

            // Add test store
            var store = new Store { Id = 1, Name = "Test Store" };
            context.Stores.Add(store);

            // Add 10 test products
            for (int i = 1; i <= 10; i++)
            {
                var product = new Product
                {
                    Id = i,
                    StoreId = 1,
                    ShopifyProductId = $"product{i}",
                    Title = $"Test Product {i}",
                    ProductType = "Test Category",
                    Vendor = "Test Vendor",
                    Handle = $"test-product-{i}"
                };
                context.Products.Add(product);
            }

            // Add test orders and order items for 2024 and 2025
            for (int month = 1; month <= 12; month++)
            {
                for (int productId = 1; productId <= 10; productId++)
                {
                    // 2024 data
                    var order2024 = new Order
                    {
                        Id = month * 100 + productId,
                        StoreId = 1,
                        ShopifyOrderId = $"order-2024-{month}-{productId}",
                        OrderNumber = month * 100 + productId,
                        CreatedAt = new DateTime(2024, month, 15),
                        TotalPrice = 10000m,
                        Currency = "JPY"
                    };
                    context.Orders.Add(order2024);

                    var orderItem2024 = new OrderItem
                    {
                        Id = month * 100 + productId,
                        OrderId = order2024.Id,
                        ProductId = productId,
                        ProductTitle = $"Test Product {productId}",
                        ProductType = "Test Category",
                        ProductVendor = "Test Vendor",
                        Quantity = 5,
                        Price = 2000m,
                        TotalPrice = 10000m
                    };
                    context.OrderItems.Add(orderItem2024);

                    // 2025 data
                    var order2025 = new Order
                    {
                        Id = 10000 + month * 100 + productId,
                        StoreId = 1,
                        ShopifyOrderId = $"order-2025-{month}-{productId}",
                        OrderNumber = 10000 + month * 100 + productId,
                        CreatedAt = new DateTime(2025, month, 15),
                        TotalPrice = 12000m,
                        Currency = "JPY"
                    };
                    context.Orders.Add(order2025);

                    var orderItem2025 = new OrderItem
                    {
                        Id = 10000 + month * 100 + productId,
                        OrderId = order2025.Id,
                        ProductId = productId,
                        ProductTitle = $"Test Product {productId}",
                        ProductType = "Test Category",
                        ProductVendor = "Test Vendor",
                        Quantity = 6,
                        Price = 2000m,
                        TotalPrice = 12000m
                    };
                    context.OrderItems.Add(orderItem2025);
                }
            }

            await context.SaveChangesAsync();

            // Create services
            var dataService = new YearOverYearDataService(context, dataServiceLogger);
            var calculationService = new YearOverYearCalculationService(calculationServiceLogger);
            var filterService = new YearOverYearFilterService(filterServiceLogger);
            var orchestrationService = new YearOverYearOrchestrationService(
                dataService, calculationService, filterService, cache, orchestrationServiceLogger);

            // Act
            var request = new YearOverYearRequest
            {
                StoreId = 1,
                Year = 2025,
                ViewMode = "sales",
                ExcludeServiceItems = false
            };

            var result = await orchestrationService.GetYearOverYearAnalysisAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Products);
            Assert.Equal(10, result.Products.Count); // Should return all 10 products, not just 6
            Assert.All(result.Products, product => 
            {
                Assert.NotNull(product.ProductName);
                Assert.True(product.CurrentYearValue > 0);
                Assert.True(product.PreviousYearValue > 0);
            });
        }

        [Fact]
        public async Task GetYearOverYearAnalysis_With_Limit_Should_Return_Limited_Results()
        {
            // Arrange
            using var context = GetInMemoryContext();
            var cache = new MemoryCache(new MemoryCacheOptions());
            var logger = new Mock<ILogger<YearOverYearService>>().Object;
            var dataServiceLogger = new Mock<ILogger<YearOverYearDataService>>().Object;
            var calculationServiceLogger = new Mock<ILogger<YearOverYearCalculationService>>().Object;
            var filterServiceLogger = new Mock<ILogger<YearOverYearFilterService>>().Object;
            var orchestrationServiceLogger = new Mock<ILogger<YearOverYearOrchestrationService>>().Object;

            // Add test data (similar to above but simplified)
            var store = new Store { Id = 1, Name = "Test Store" };
            context.Stores.Add(store);

            for (int i = 1; i <= 10; i++)
            {
                var product = new Product
                {
                    Id = i,
                    StoreId = 1,
                    ShopifyProductId = $"product{i}",
                    Title = $"Test Product {i}",
                    ProductType = "Test Category",
                    Vendor = "Test Vendor",
                    Handle = $"test-product-{i}"
                };
                context.Products.Add(product);

                var order = new Order
                {
                    Id = i,
                    StoreId = 1,
                    ShopifyOrderId = $"order-{i}",
                    OrderNumber = i,
                    CreatedAt = new DateTime(2025, 1, 15),
                    TotalPrice = 10000m * i,
                    Currency = "JPY"
                };
                context.Orders.Add(order);

                var orderItem = new OrderItem
                {
                    Id = i,
                    OrderId = order.Id,
                    ProductId = i,
                    ProductTitle = $"Test Product {i}",
                    ProductType = "Test Category",
                    ProductVendor = "Test Vendor",
                    Quantity = 5,
                    Price = 2000m * i,
                    TotalPrice = 10000m * i
                };
                context.OrderItems.Add(orderItem);
            }

            await context.SaveChangesAsync();

            // Create services
            var dataService = new YearOverYearDataService(context, dataServiceLogger);
            var calculationService = new YearOverYearCalculationService(calculationServiceLogger);
            var filterService = new YearOverYearFilterService(filterServiceLogger);
            var orchestrationService = new YearOverYearOrchestrationService(
                dataService, calculationService, filterService, cache, orchestrationServiceLogger);

            // Act - with limit
            var request = new YearOverYearRequest
            {
                StoreId = 1,
                Year = 2025,
                ViewMode = "sales",
                Limit = 6 // Explicitly set limit to 6
            };

            var result = await orchestrationService.GetYearOverYearAnalysisAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Products);
            Assert.Equal(6, result.Products.Count); // Should return only 6 products when limit is set
        }
    }
}