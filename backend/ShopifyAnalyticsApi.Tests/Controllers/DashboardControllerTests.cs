using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Controllers;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Jobs;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace ShopifyAnalyticsApi.Tests.Controllers
{
    public class DashboardControllerTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly Mock<ILogger<DashboardController>> _mockLogger;
        private readonly Mock<IBackgroundJobClient> _mockBackgroundJobClient;
        private readonly DashboardController _controller;

        public DashboardControllerTests()
        {
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new ShopifyDbContext(options);

            _mockLogger = new Mock<ILogger<DashboardController>>();
            _mockBackgroundJobClient = new Mock<IBackgroundJobClient>();

            _controller = new DashboardController(
                _context,
                _mockLogger.Object,
                _mockBackgroundJobClient.Object
            );
        }

        private async Task SetupTestData(int storeId)
        {
            var store = new Store
            {
                Id = storeId,
                Name = "Test Store",
                Domain = "test.myshopify.com",
                AccessToken = "test_token",
                IsActive = true
            };
            _context.Stores.Add(store);

            var customer1 = new Customer
            {
                Id = 1,
                StoreId = storeId,
                ShopifyCustomerId = "1001",
                Email = "customer1@test.com",
                FirstName = "John",
                LastName = "Doe",
                TotalOrders = 2,
                TotalSpent = 300
            };
            var customer2 = new Customer
            {
                Id = 2,
                StoreId = storeId,
                ShopifyCustomerId = "1002",
                Email = "customer2@test.com",
                FirstName = "Jane",
                LastName = "Smith",
                TotalOrders = 1,
                TotalSpent = 150
            };
            _context.Customers.AddRange(customer1, customer2);

            var product1 = new Product
            {
                Id = 1,
                StoreId = storeId,
                ShopifyProductId = "prod1",
                Title = "Product 1",
                ProductType = "Type A",
                Vendor = "Vendor 1"
            };
            var product2 = new Product
            {
                Id = 2,
                StoreId = storeId,
                ShopifyProductId = "prod2",
                Title = "Product 2",
                ProductType = "Type B",
                Vendor = "Vendor 2"
            };
            _context.Products.AddRange(product1, product2);

            var order1 = new Order
            {
                Id = 1,
                StoreId = storeId,
                ShopifyOrderId = "2001",
                OrderNumber = "1001",
                CustomerId = customer1.Id,
                Customer = customer1,
                Email = customer1.Email,
                TotalPrice = 200,
                Currency = "USD",
                FinancialStatus = "paid",
                FulfillmentStatus = "fulfilled",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                OrderItems = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = product1.Id.ToString(),
                        ProductTitle = product1.Title,
                        Quantity = 2,
                        Price = 100
                    }
                }
            };

            var order2 = new Order
            {
                Id = 2,
                StoreId = storeId,
                ShopifyOrderId = "2002",
                OrderNumber = "1002",
                CustomerId = customer1.Id,
                Customer = customer1,
                Email = customer1.Email,
                TotalPrice = 100,
                Currency = "USD",
                FinancialStatus = "paid",
                FulfillmentStatus = "pending",
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                OrderItems = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = product2.Id.ToString(),
                        ProductTitle = product2.Title,
                        Quantity = 1,
                        Price = 100
                    }
                }
            };

            var order3 = new Order
            {
                Id = 3,
                StoreId = storeId,
                ShopifyOrderId = "2003",
                OrderNumber = "1003",
                CustomerId = customer2.Id,
                Customer = customer2,
                Email = customer2.Email,
                TotalPrice = 150,
                Currency = "USD",
                FinancialStatus = "paid",
                FulfillmentStatus = "fulfilled",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                OrderItems = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = product1.Id.ToString(),
                        ProductTitle = product1.Title,
                        Quantity = 1,
                        Price = 100
                    },
                    new OrderItem
                    {
                        ProductId = product2.Id.ToString(),
                        ProductTitle = product2.Title,
                        Quantity = 1,
                        Price = 50
                    }
                }
            };

            _context.Orders.AddRange(order1, order2, order3);
            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task GetDashboard_ReturnsCorrectData()
        {
            var storeId = 1;
            var startDate = DateTime.UtcNow.AddDays(-7);
            var endDate = DateTime.UtcNow;
            
            await SetupTestData(storeId);
            
            var result = await _controller.GetDashboard(startDate, endDate, storeId);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dashboardData = Assert.IsType<DashboardDto>(okResult.Value);
            
            Assert.NotNull(dashboardData);
            Assert.Equal(450m, dashboardData.TotalSales);
            Assert.Equal(3, dashboardData.OrderCount);
            Assert.Equal(2, dashboardData.CustomerCount);
            Assert.Equal(150m, dashboardData.AverageOrderValue);
            Assert.NotEmpty(dashboardData.TopProducts);
            Assert.NotEmpty(dashboardData.RecentOrders);
        }

        [Fact]
        public async Task GetDashboard_WithNoData_ReturnsEmptyData()
        {
            var storeId = 99;
            var startDate = DateTime.UtcNow.AddDays(-7);
            var endDate = DateTime.UtcNow;
            
            var result = await _controller.GetDashboard(startDate, endDate, storeId);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dashboardData = Assert.IsType<DashboardDto>(okResult.Value);
            
            Assert.NotNull(dashboardData);
            Assert.Equal(0m, dashboardData.TotalSales);
            Assert.Equal(0, dashboardData.OrderCount);
            Assert.Equal(0, dashboardData.CustomerCount);
            Assert.Empty(dashboardData.TopProducts);
            Assert.Empty(dashboardData.RecentOrders);
        }

        [Fact]
        public async Task GetDashboard_WithoutStoreId_ReturnsAllStoresData()
        {
            await SetupTestData(1);
            await SetupTestData(2);
            
            var result = await _controller.GetDashboard(null, null, null);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dashboardData = Assert.IsType<DashboardDto>(okResult.Value);
            
            Assert.NotNull(dashboardData);
            Assert.True(dashboardData.TotalSales > 0);
            Assert.True(dashboardData.OrderCount > 0);
        }

        [Fact]
        public async Task RefreshDashboard_WithValidStore_QueuesJob()
        {
            var store = new Store
            {
                Id = 1,
                Name = "Test Store",
                Domain = "test.myshopify.com",
                AccessToken = "test_token",
                IsActive = true
            };
            _context.Stores.Add(store);
            await _context.SaveChangesAsync();

            _mockBackgroundJobClient
                .Setup(x => x.Create(It.IsAny<Job>(), It.IsAny<IState>()))
                .Returns("job-123");

            var request = new RefreshRequest { StoreId = 1 };
            var result = await _controller.RefreshDashboard(request);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            dynamic response = okResult.Value!;
            
            Assert.Equal("Data refresh started", response.message);
            Assert.Equal(1, response.storeId);
            
            _mockBackgroundJobClient.Verify(
                x => x.Create(It.IsAny<Job>(), It.IsAny<IState>()),
                Times.Once);
        }

        [Fact]
        public async Task RefreshDashboard_WithInvalidStoreId_ReturnsBadRequest()
        {
            var request = new RefreshRequest { StoreId = 0 };
            var result = await _controller.RefreshDashboard(request);
            
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            dynamic response = badRequestResult.Value!;
            
            Assert.Equal("Invalid store ID", response.error);
        }

        [Fact]
        public async Task RefreshDashboard_WithNonExistentStore_ReturnsNotFound()
        {
            var request = new RefreshRequest { StoreId = 999 };
            var result = await _controller.RefreshDashboard(request);
            
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            dynamic response = notFoundResult.Value!;
            
            Assert.Equal("Store not found", response.error);
        }

        [Fact]
        public async Task RefreshDashboard_WithInactiveStore_ReturnsBadRequest()
        {
            var store = new Store
            {
                Id = 1,
                Name = "Inactive Store",
                Domain = "inactive.myshopify.com",
                AccessToken = "test_token",
                IsActive = false
            };
            _context.Stores.Add(store);
            await _context.SaveChangesAsync();

            var request = new RefreshRequest { StoreId = 1 };
            var result = await _controller.RefreshDashboard(request);
            
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            dynamic response = badRequestResult.Value!;
            
            Assert.Equal("Store is not active", response.error);
        }

        [Fact]
        public async Task GetSyncStatus_WithValidStore_ReturnsStatus()
        {
            var store = new Store
            {
                Id = 1,
                Name = "Test Store",
                Domain = "test.myshopify.com",
                AccessToken = "test_token",
                IsActive = true,
                LastSyncDate = DateTime.UtcNow.AddHours(-1)
            };
            _context.Stores.Add(store);
            await SetupTestData(1);
            
            var result = await _controller.GetSyncStatus(1);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            var syncStatus = Assert.IsType<SyncStatusDto>(okResult.Value);
            
            Assert.NotNull(syncStatus);
            Assert.Equal(1, syncStatus.StoreId);
            Assert.Equal("Test Store", syncStatus.StoreName);
            Assert.NotNull(syncStatus.LastProductSync);
            Assert.Equal(2, syncStatus.ProductCount);
            Assert.Equal(2, syncStatus.CustomerCount);
            Assert.Equal(3, syncStatus.OrderCount);
            Assert.True(syncStatus.IsActive);
        }

        [Fact]
        public async Task GetSyncStatus_WithNonExistentStore_ReturnsNotFound()
        {
            var result = await _controller.GetSyncStatus(999);
            
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            dynamic response = notFoundResult.Value!;
            
            Assert.Equal("Store not found", response.error);
        }

        [Fact]
        public async Task GetDashboard_CalculatesGrowthRateCorrectly()
        {
            var storeId = 1;
            var store = new Store
            {
                Id = storeId,
                Name = "Test Store",
                Domain = "test.myshopify.com",
                AccessToken = "test_token",
                IsActive = true
            };
            _context.Stores.Add(store);

            var currentOrder = new Order
            {
                Id = 1,
                StoreId = storeId,
                ShopifyOrderId = "3001",
                OrderNumber = "2001",
                TotalPrice = 200,
                Currency = "USD",
                FinancialStatus = "paid",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            };

            var previousOrder = new Order
            {
                Id = 2,
                StoreId = storeId,
                ShopifyOrderId = "3002",
                OrderNumber = "2002",
                TotalPrice = 100,
                Currency = "USD",
                FinancialStatus = "paid",
                CreatedAt = DateTime.UtcNow.AddDays(-8)
            };

            _context.Orders.AddRange(currentOrder, previousOrder);
            await _context.SaveChangesAsync();

            var startDate = DateTime.UtcNow.AddDays(-7);
            var endDate = DateTime.UtcNow;
            
            var result = await _controller.GetDashboard(startDate, endDate, storeId);
            
            var okResult = Assert.IsType<OkObjectResult>(result);
            var dashboardData = Assert.IsType<DashboardDto>(okResult.Value);
            
            Assert.NotNull(dashboardData);
            Assert.Equal(200m, dashboardData.TotalSales);
            Assert.Equal(100, dashboardData.GrowthRate);
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}