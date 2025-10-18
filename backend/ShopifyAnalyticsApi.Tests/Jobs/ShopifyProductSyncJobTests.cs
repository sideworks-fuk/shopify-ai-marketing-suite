using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using ShopifyAnalyticsApi.Jobs;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Sync;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;
using System.Linq;

namespace ShopifyAnalyticsApi.Tests.Jobs
{
    public class ShopifyProductSyncJobTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly Mock<ILogger<ShopifyProductSyncJob>> _mockLogger;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly Mock<ICheckpointManager> _mockCheckpointManager;
        private readonly Mock<ISyncRangeManager> _mockSyncRangeManager;
        private readonly Mock<ISyncProgressTracker> _mockProgressTracker;

        public ShopifyProductSyncJobTests()
        {
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: System.Guid.NewGuid().ToString())
                .Options;
            _context = new ShopifyDbContext(options);

            _mockLogger = new Mock<ILogger<ShopifyProductSyncJob>>();
            _mockConfiguration = new Mock<IConfiguration>();
            _mockCheckpointManager = new Mock<ICheckpointManager>();
            _mockSyncRangeManager = new Mock<ISyncRangeManager>();
            _mockProgressTracker = new Mock<ISyncProgressTracker>();
            
            _mockConfiguration.Setup(x => x.GetValue<bool>("Shopify:CheckDeletedProducts", false))
                .Returns(false);
                
            // Setup default mock behaviors
            _mockSyncRangeManager
                .Setup(x => x.DetermineSyncRangeAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<InitialSyncOptions>()))
                .ReturnsAsync(new DateRange(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow));
                
            _mockProgressTracker
                .Setup(x => x.StartSyncAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()))
                .ReturnsAsync(1);
        }

        [Fact]
        public async Task SyncProducts_WithValidStore_ShouldLogSuccess()
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

            var mockApiService = new Mock<ShopifyApiService>();
            mockApiService
                .Setup(x => x.SyncProductsAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
                .ReturnsAsync(5);

            var job = new ShopifyProductSyncJob(
                mockApiService.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );

            await job.SyncProducts(store.Id, null);

            var updatedStore = await _context.Stores.FindAsync(store.Id);
            Assert.NotNull(updatedStore);
            Assert.NotNull(updatedStore.LastSyncDate);
            
            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Product sync completed")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task SyncProducts_WithInvalidStore_ShouldLogWarning()
        {
            var invalidStoreId = 999;
            
            var mockApiService = new Mock<ShopifyApiService>();
            var job = new ShopifyProductSyncJob(
                mockApiService.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );

            await job.SyncProducts(invalidStoreId);

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Store not found")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task SyncProducts_WithInactiveStore_ShouldSkipSync()
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

            var mockApiService = new Mock<ShopifyApiService>();
            var job = new ShopifyProductSyncJob(
                mockApiService.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );

            await job.SyncProducts(store.Id, null);

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Store is not active")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task SyncProducts_WithNoAccessToken_ShouldLogError()
        {
            var store = new Store
            {
                Id = 1,
                Name = "No Token Store",
                Domain = "notoken.myshopify.com",
                AccessToken = null,
                IsActive = true
            };
            _context.Stores.Add(store);
            await _context.SaveChangesAsync();

            var mockApiService = new Mock<ShopifyApiService>();
            var job = new ShopifyProductSyncJob(
                mockApiService.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );

            await job.SyncProducts(store.Id, null);

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Access token not found")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task SyncAllStoresProducts_WithActiveStores_ShouldQueueJobs()
        {
            var store1 = new Store
            {
                Id = 1,
                Name = "Store 1",
                Domain = "store1.myshopify.com",
                AccessToken = "token1",
                IsActive = true
            };
            var store2 = new Store
            {
                Id = 2,
                Name = "Store 2",
                Domain = "store2.myshopify.com",
                AccessToken = "token2",
                IsActive = true
            };
            var store3 = new Store
            {
                Id = 3,
                Name = "Store 3",
                Domain = "store3.myshopify.com",
                AccessToken = "token3",
                IsActive = false
            };
            
            _context.Stores.AddRange(store1, store2, store3);
            await _context.SaveChangesAsync();

            var mockApiService = new Mock<ShopifyApiService>();
            var job = new ShopifyProductSyncJob(
                mockApiService.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );

            await job.SyncAllStoresProducts();

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Found 2 active stores")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task SyncAllStoresProducts_WithNoActiveStores_ShouldLogWarning()
        {
            var store = new Store
            {
                Id = 1,
                Name = "Inactive Store",
                Domain = "inactive.myshopify.com",
                AccessToken = "token",
                IsActive = false
            };
            _context.Stores.Add(store);
            await _context.SaveChangesAsync();

            var mockApiService = new Mock<ShopifyApiService>();
            var job = new ShopifyProductSyncJob(
                mockApiService.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );

            await job.SyncAllStoresProducts();

            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("No active stores found")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task SyncProducts_ShouldUpdateLastSyncDate()
        {
            var store = new Store
            {
                Id = 1,
                Name = "Test Store",
                Domain = "test.myshopify.com",
                AccessToken = "test_token",
                IsActive = true,
                LastSyncDate = null
            };
            _context.Stores.Add(store);
            await _context.SaveChangesAsync();

            var mockApiService = new Mock<ShopifyApiService>();
            mockApiService
                .Setup(x => x.SyncProductsAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
                .ReturnsAsync(10);

            var job = new ShopifyProductSyncJob(
                mockApiService.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );

            var beforeSync = DateTime.UtcNow;
            await job.SyncProducts(store.Id, null);
            var afterSync = DateTime.UtcNow;

            var updatedStore = await _context.Stores.FindAsync(store.Id);
            Assert.NotNull(updatedStore);
            Assert.NotNull(updatedStore.LastSyncDate);
            Assert.True(updatedStore.LastSyncDate >= beforeSync);
            Assert.True(updatedStore.LastSyncDate <= afterSync);
            Assert.True(updatedStore.UpdatedAt >= beforeSync);
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}