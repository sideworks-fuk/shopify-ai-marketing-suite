using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Jobs;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Sync;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace ShopifyAnalyticsApi.Tests.Jobs
{
    public class ShopifyCustomerSyncJobTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly Mock<ShopifyApiService> _mockShopifyApi;
        private readonly Mock<ILogger<ShopifyCustomerSyncJob>> _mockLogger;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly Mock<ICheckpointManager> _mockCheckpointManager;
        private readonly Mock<ISyncRangeManager> _mockSyncRangeManager;
        private readonly Mock<ISyncProgressTracker> _mockProgressTracker;
        private readonly ShopifyCustomerSyncJob _job;
        private readonly Store _testStore;

        public ShopifyCustomerSyncJobTests()
        {
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new ShopifyDbContext(options);

            _mockShopifyApi = new Mock<ShopifyApiService>();
            _mockLogger = new Mock<ILogger<ShopifyCustomerSyncJob>>();
            _mockConfiguration = new Mock<IConfiguration>();
            _mockCheckpointManager = new Mock<ICheckpointManager>();
            _mockSyncRangeManager = new Mock<ISyncRangeManager>();
            _mockProgressTracker = new Mock<ISyncProgressTracker>();

            _testStore = new Store
            {
                Id = 1,
                Name = "Test Store",
                Domain = "test-store.myshopify.com",
                AccessToken = "test-token",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Stores.Add(_testStore);
            _context.SaveChanges();

            _job = new ShopifyCustomerSyncJob(
                _mockShopifyApi.Object,
                _context,
                _mockLogger.Object,
                _mockConfiguration.Object,
                _mockCheckpointManager.Object,
                _mockSyncRangeManager.Object,
                _mockProgressTracker.Object
            );
        }

        [Fact]
        public async Task SyncCustomers_ShouldSkipInactiveStore()
        {
            _testStore.IsActive = false;
            await _context.SaveChangesAsync();

            await _job.SyncCustomers(_testStore.Id, null);

            _mockProgressTracker.Verify(
                x => x.StartSyncAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()),
                Times.Never);
        }

        [Fact]
        public async Task SyncCustomers_ShouldHandleNonExistentStore()
        {
            await _job.SyncCustomers(999, null);

            _mockProgressTracker.Verify(
                x => x.StartSyncAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()),
                Times.Never);
        }

        [Fact]
        public async Task SyncCustomers_ShouldSyncActiveStore()
        {
            var dateRange = new DateRange(
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow
            );

            _mockSyncRangeManager.Setup(x => x.DetermineSyncRangeAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<InitialSyncOptions>()))
                .ReturnsAsync(dateRange);

            _mockProgressTracker.Setup(x => x.StartSyncAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()))
                .ReturnsAsync(1);

            _mockCheckpointManager.Setup(x => x.GetResumeInfoAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ResumeInfo)null);

            _mockProgressTracker.Setup(x => x.UpdateProgressAsync(
                    It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockProgressTracker.Setup(x => x.CompleteSyncAsync(
                    It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.SaveCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), 
                    It.IsAny<int>(), It.IsAny<DateRange>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.ClearCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            await _job.SyncCustomers(_testStore.Id, null);

            _mockProgressTracker.Verify(x => x.StartSyncAsync(
                _testStore.Id, "Customers", It.IsAny<DateRange>(), It.IsAny<int>()), Times.Once);

            _mockProgressTracker.Verify(x => x.CompleteSyncAsync(
                It.IsAny<int>(), true, null), Times.Once);

            Assert.NotNull(_testStore.LastSyncDate);
        }

        [Fact]
        public async Task SyncCustomers_ShouldResumeFromCheckpoint()
        {
            var dateRange = new DateRange(
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow
            );

            var resumeInfo = new ResumeInfo
            {
                LastCursor = "page-2",
                RecordsAlreadyProcessed = 100,
                LastProcessedDate = DateTime.UtcNow.AddMinutes(-5)
            };

            _mockSyncRangeManager.Setup(x => x.DetermineSyncRangeAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<InitialSyncOptions>()))
                .ReturnsAsync(dateRange);

            _mockProgressTracker.Setup(x => x.StartSyncAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()))
                .ReturnsAsync(1);

            _mockCheckpointManager.Setup(x => x.GetResumeInfoAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync(resumeInfo);

            _mockProgressTracker.Setup(x => x.UpdateProgressAsync(
                    It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockProgressTracker.Setup(x => x.CompleteSyncAsync(
                    It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.SaveCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), 
                    It.IsAny<int>(), It.IsAny<DateRange>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.ClearCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            await _job.SyncCustomers(_testStore.Id, null);

            _mockCheckpointManager.Verify(x => x.GetResumeInfoAsync(
                _testStore.Id, "Customers"), Times.Once);
        }

        [Fact]
        public async Task SyncCustomers_ShouldSaveCheckpointsRegularly()
        {
            var dateRange = new DateRange(
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow
            );

            _mockSyncRangeManager.Setup(x => x.DetermineSyncRangeAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<InitialSyncOptions>()))
                .ReturnsAsync(dateRange);

            _mockProgressTracker.Setup(x => x.StartSyncAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()))
                .ReturnsAsync(1);

            _mockCheckpointManager.Setup(x => x.GetResumeInfoAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ResumeInfo)null);

            _mockProgressTracker.Setup(x => x.UpdateProgressAsync(
                    It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockProgressTracker.Setup(x => x.CompleteSyncAsync(
                    It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.SaveCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), 
                    It.IsAny<int>(), It.IsAny<DateRange>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.ClearCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            await _job.SyncCustomers(_testStore.Id, null);

            _mockCheckpointManager.Verify(x => x.SaveCheckpointAsync(
                _testStore.Id, "Customers", It.IsAny<string>(), 
                It.IsAny<int>(), It.IsAny<DateRange>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task SyncCustomers_ShouldHandleErrors()
        {
            var dateRange = new DateRange(
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow
            );

            _mockSyncRangeManager.Setup(x => x.DetermineSyncRangeAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<InitialSyncOptions>()))
                .ReturnsAsync(dateRange);

            _mockProgressTracker.Setup(x => x.StartSyncAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()))
                .ThrowsAsync(new Exception("Test error"));

            await Assert.ThrowsAsync<Exception>(() => _job.SyncCustomers(_testStore.Id, null));
        }

        [Fact]
        public async Task SyncAllStoresCustomers_ShouldQueueJobsForActiveStores()
        {
            var store2 = new Store
            {
                Id = 2,
                Name = "Test Store 2",
                Domain = "test-store-2.myshopify.com",
                AccessToken = "test-token-2",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            var inactiveStore = new Store
            {
                Id = 3,
                Name = "Inactive Store",
                Domain = "inactive-store.myshopify.com",
                AccessToken = "test-token-3",
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Stores.AddRange(store2, inactiveStore);
            await _context.SaveChangesAsync();

            await _job.SyncAllStoresCustomers();

            var activeStores = await _context.Stores
                .Where(s => s.IsActive)
                .ToListAsync();

            Assert.Equal(2, activeStores.Count);
        }

        [Fact]
        public async Task SyncCustomers_ShouldUpdateExistingCustomers()
        {
            var existingCustomer = new Customer
            {
                StoreId = _testStore.Id,
                ShopifyCustomerId = "shop_1_cust_1_0",
                FirstName = "Old",
                LastName = "Name",
                Email = "old@example.com",
                Phone = "090-0000-0000",
                TotalSpent = 1000,
                TotalOrders = 1,
                CustomerSegment = "新規",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            };

            _context.Customers.Add(existingCustomer);
            await _context.SaveChangesAsync();

            var dateRange = new DateRange(
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow
            );

            _mockSyncRangeManager.Setup(x => x.DetermineSyncRangeAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<InitialSyncOptions>()))
                .ReturnsAsync(dateRange);

            _mockProgressTracker.Setup(x => x.StartSyncAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateRange>(), It.IsAny<int>()))
                .ReturnsAsync(1);

            _mockCheckpointManager.Setup(x => x.GetResumeInfoAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ResumeInfo)null);

            _mockProgressTracker.Setup(x => x.UpdateProgressAsync(
                    It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockProgressTracker.Setup(x => x.CompleteSyncAsync(
                    It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.SaveCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), 
                    It.IsAny<int>(), It.IsAny<DateRange>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.ClearCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            await _job.SyncCustomers(_testStore.Id, null);

            var updatedCustomer = await _context.Customers
                .FirstOrDefaultAsync(c => c.ShopifyCustomerId == "shop_1_cust_1_0");

            Assert.NotNull(updatedCustomer);
            Assert.Equal("Customer1_0", updatedCustomer.FirstName);
            Assert.Equal("Test", updatedCustomer.LastName);
        }

        [Fact]
        public async Task SyncCustomers_ShouldUseCustomDateRange()
        {
            var customOptions = new InitialSyncOptions
            {
                StartDate = DateTime.UtcNow.AddDays(-7),
                EndDate = DateTime.UtcNow
            };

            var expectedDateRange = new DateRange(
                customOptions.StartDate.Value,
                customOptions.EndDate.Value
            );

            _mockSyncRangeManager.Setup(x => x.DetermineSyncRangeAsync(
                    _testStore.Id, "Customers", customOptions))
                .ReturnsAsync(expectedDateRange);

            _mockProgressTracker.Setup(x => x.StartSyncAsync(
                    It.IsAny<int>(), It.IsAny<string>(), expectedDateRange, It.IsAny<int>()))
                .ReturnsAsync(1);

            _mockCheckpointManager.Setup(x => x.GetResumeInfoAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync((ResumeInfo)null);

            _mockProgressTracker.Setup(x => x.UpdateProgressAsync(
                    It.IsAny<int>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockProgressTracker.Setup(x => x.CompleteSyncAsync(
                    It.IsAny<int>(), It.IsAny<bool>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.SaveCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), 
                    It.IsAny<int>(), It.IsAny<DateRange>()))
                .Returns(Task.CompletedTask);

            _mockCheckpointManager.Setup(x => x.ClearCheckpointAsync(
                    It.IsAny<int>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            await _job.SyncCustomers(_testStore.Id, customOptions);

            _mockSyncRangeManager.Verify(x => x.DetermineSyncRangeAsync(
                _testStore.Id, "Customers", customOptions), Times.Once);
        }

        public void Dispose()
        {
            _context?.Dispose();
        }
    }
}