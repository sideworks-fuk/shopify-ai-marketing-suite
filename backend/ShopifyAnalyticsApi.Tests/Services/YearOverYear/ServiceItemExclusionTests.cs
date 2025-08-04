using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using Xunit;

namespace ShopifyAnalyticsApi.Tests.Services.YearOverYear
{
    public class ServiceItemExclusionTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly Mock<ILogger<YearOverYearService>> _loggerMock;
        private readonly YearOverYearService _service;

        public ServiceItemExclusionTests()
        {
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ShopifyDbContext(options);
            _cache = new MemoryCache(new MemoryCacheOptions());
            _loggerMock = new Mock<ILogger<YearOverYearService>>();
            _service = new YearOverYearService(_context, _cache, _loggerMock.Object);

            // Seed test data
            SeedTestData();
        }

        private void SeedTestData()
        {
            var store = new Store { Id = 1, Name = "Test Store" };
            _context.Stores.Add(store);

            // Add test customers
            var customer = new Customer
            {
                Id = 1,
                StoreId = 1,
                Email = "test@example.com",
                FirstName = "Test",
                LastName = "Customer"
            };
            _context.Customers.Add(customer);

            // Add test orders
            var orders = new List<Order>
            {
                new Order
                {
                    Id = 1,
                    StoreId = 1,
                    CustomerId = 1,
                    OrderNumber = "1001",
                    TotalPrice = 1000,
                    CreatedAt = new DateTime(2024, 3, 15),
                    Currency = "JPY"
                },
                new Order
                {
                    Id = 2,
                    StoreId = 1,
                    CustomerId = 1,
                    OrderNumber = "1002",
                    TotalPrice = 2000,
                    CreatedAt = new DateTime(2023, 3, 15),
                    Currency = "JPY"
                }
            };
            _context.Orders.AddRange(orders);

            // Add test order items (including service items)
            var orderItems = new List<OrderItem>
            {
                // Regular products
                new OrderItem
                {
                    Id = 1,
                    OrderId = 1,
                    ProductTitle = "iPhone 15 Pro",
                    ProductType = "Electronics",
                    ProductVendor = "Apple",
                    Quantity = 1,
                    Price = 800,
                    TotalPrice = 800
                },
                new OrderItem
                {
                    Id = 2,
                    OrderId = 1,
                    ProductTitle = "送料",
                    ProductType = "Service",
                    ProductVendor = "配送業者",
                    Quantity = 1,
                    Price = 100,
                    TotalPrice = 100
                },
                new OrderItem
                {
                    Id = 3,
                    OrderId = 1,
                    ProductTitle = "代引き手数料",
                    ProductType = "Service",
                    ProductVendor = "決済業者",
                    Quantity = 1,
                    Price = 50,
                    TotalPrice = 50
                },
                new OrderItem
                {
                    Id = 4,
                    OrderId = 1,
                    ProductTitle = "包装料",
                    ProductType = "Service",
                    ProductVendor = "配送業者",
                    Quantity = 1,
                    Price = 50,
                    TotalPrice = 50
                },
                // Previous year data
                new OrderItem
                {
                    Id = 5,
                    OrderId = 2,
                    ProductTitle = "iPhone 14 Pro",
                    ProductType = "Electronics",
                    ProductVendor = "Apple",
                    Quantity = 1,
                    Price = 700,
                    TotalPrice = 700
                },
                new OrderItem
                {
                    Id = 6,
                    OrderId = 2,
                    ProductTitle = "配送料",
                    ProductType = "Service",
                    ProductVendor = "配送業者",
                    Quantity = 1,
                    Price = 100,
                    TotalPrice = 100
                },
                new OrderItem
                {
                    Id = 7,
                    OrderId = 2,
                    ProductTitle = "決済手数料",
                    ProductType = "Service",
                    ProductVendor = "決済業者",
                    Quantity = 1,
                    Price = 30,
                    TotalPrice = 30
                },
                new OrderItem
                {
                    Id = 8,
                    OrderId = 2,
                    ProductTitle = "MacBook Pro",
                    ProductType = "Electronics",
                    ProductVendor = "Apple",
                    Quantity = 1,
                    Price = 1170,
                    TotalPrice = 1170
                }
            };
            _context.OrderItems.AddRange(orderItems);

            _context.SaveChanges();
        }

        [Fact]
        public async Task GetYearOverYearAnalysisAsync_WithExcludeServiceItems_ShouldFilterOutServiceItems()
        {
            // Arrange
            var request = new YearOverYearRequest
            {
                StoreId = 1,
                Year = 2024,
                ViewMode = "sales",
                ExcludeServiceItems = true
            };

            // Act
            var result = await _service.GetYearOverYearAnalysisAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Products);
            
            // Should only have regular products (iPhone and MacBook)
            Assert.Equal(2, result.Products.Count);
            
            // Verify no service items are included
            Assert.DoesNotContain(result.Products, p => p.ProductTitle.Contains("送料"));
            Assert.DoesNotContain(result.Products, p => p.ProductTitle.Contains("手数料"));
            Assert.DoesNotContain(result.Products, p => p.ProductTitle.Contains("配送料"));
            Assert.DoesNotContain(result.Products, p => p.ProductTitle.Contains("包装料"));
            
            // Verify regular products are included
            Assert.Contains(result.Products, p => p.ProductTitle.Contains("iPhone"));
            Assert.Contains(result.Products, p => p.ProductTitle.Contains("MacBook"));
        }

        [Fact]
        public async Task GetYearOverYearAnalysisAsync_WithoutExcludeServiceItems_ShouldIncludeAllItems()
        {
            // Arrange
            var request = new YearOverYearRequest
            {
                StoreId = 1,
                Year = 2024,
                ViewMode = "sales",
                ExcludeServiceItems = false
            };

            // Act
            var result = await _service.GetYearOverYearAnalysisAsync(request);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Products);
            
            // Should have all products including service items
            Assert.True(result.Products.Count > 2);
            
            // Verify service items are included
            var serviceItems = result.Products.Where(p => 
                p.ProductTitle.Contains("送料") || 
                p.ProductTitle.Contains("手数料") || 
                p.ProductTitle.Contains("配送料") || 
                p.ProductTitle.Contains("包装料")).ToList();
            
            Assert.NotEmpty(serviceItems);
        }

        [Fact]
        public async Task GetYearOverYearAnalysisAsync_ExcludeServiceItems_ShouldCalculateCorrectTotals()
        {
            // Arrange
            var requestWithExclusion = new YearOverYearRequest
            {
                StoreId = 1,
                Year = 2024,
                ViewMode = "sales",
                ExcludeServiceItems = true
            };

            var requestWithoutExclusion = new YearOverYearRequest
            {
                StoreId = 1,
                Year = 2024,
                ViewMode = "sales",
                ExcludeServiceItems = false
            };

            // Act
            var resultWithExclusion = await _service.GetYearOverYearAnalysisAsync(requestWithExclusion);
            var resultWithoutExclusion = await _service.GetYearOverYearAnalysisAsync(requestWithoutExclusion);

            // Assert
            Assert.NotNull(resultWithExclusion.Summary);
            Assert.NotNull(resultWithoutExclusion.Summary);
            
            // Total sales with exclusion should be less than without exclusion
            Assert.True(resultWithExclusion.Summary.CurrentYearTotalSales < resultWithoutExclusion.Summary.CurrentYearTotalSales);
            Assert.True(resultWithExclusion.Summary.PreviousYearTotalSales < resultWithoutExclusion.Summary.PreviousYearTotalSales);
        }

        public void Dispose()
        {
            _context?.Dispose();
            _cache?.Dispose();
        }
    }
}