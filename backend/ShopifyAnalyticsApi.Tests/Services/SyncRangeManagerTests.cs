using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Sync;
using System;
using System.Threading.Tasks;

namespace ShopifyAnalyticsApi.Tests.Services
{
    public class SyncRangeManagerTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly SyncRangeManager _syncRangeManager;
        private readonly Mock<ILogger<SyncRangeManager>> _loggerMock;

        public SyncRangeManagerTests()
        {
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ShopifyDbContext(options);
            _loggerMock = new Mock<ILogger<SyncRangeManager>>();
            _syncRangeManager = new SyncRangeManager(_context, _loggerMock.Object);
        }

        [Fact]
        public async Task DetermineSyncRangeAsync_ShouldReturnExistingRange_WhenSettingExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var existingSetting = new SyncRangeSetting
            {
                StoreId = storeId,
                DataType = dataType,
                StartDate = DateTime.UtcNow.AddYears(-1),
                EndDate = DateTime.UtcNow,
                IsActive = true
            };
            _context.SyncRangeSettings.Add(existingSetting);
            await _context.SaveChangesAsync();

            // Act
            var dateRange = await _syncRangeManager.DetermineSyncRangeAsync(
                storeId, dataType, null);

            // Assert
            Assert.Equal(existingSetting.StartDate, dateRange.Start);
            Assert.Equal(existingSetting.EndDate, dateRange.End);
        }

        [Fact]
        public async Task DetermineSyncRangeAsync_ShouldCreateNewRange_WhenNoSettingExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var options = new InitialSyncOptions
            {
                MaxYearsBack = 3,
                IncludeArchived = true
            };

            // Act
            var dateRange = await _syncRangeManager.DetermineSyncRangeAsync(
                storeId, dataType, options);

            // Assert
            Assert.NotNull(dateRange);
            Assert.True(dateRange.End <= DateTime.UtcNow);
            Assert.True(dateRange.Start >= DateTime.UtcNow.AddYears(-3).AddDays(-1));

            // 設定が保存されていることを確認
            var savedSetting = await _context.SyncRangeSettings
                .FirstOrDefaultAsync(s => s.StoreId == storeId && s.DataType == dataType);
            Assert.NotNull(savedSetting);
            Assert.Equal(3, savedSetting.YearsBack);
            Assert.True(savedSetting.IncludeArchived);
        }

        [Fact]
        public async Task DetermineSyncRangeAsync_ShouldUseCustomDateRange_WhenProvided()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Orders";
            var customStart = DateTime.UtcNow.AddMonths(-6);
            var customEnd = DateTime.UtcNow.AddMonths(-1);
            var options = new InitialSyncOptions
            {
                StartDate = customStart,
                EndDate = customEnd,
                MaxYearsBack = 2
            };

            // Act
            var dateRange = await _syncRangeManager.DetermineSyncRangeAsync(
                storeId, dataType, options);

            // Assert
            Assert.Equal(customStart, dateRange.Start);
            Assert.Equal(customEnd, dateRange.End);
        }

        [Fact]
        public async Task UpdateSyncRangeAsync_ShouldUpdateExistingSetting()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Customers";
            var originalSetting = new SyncRangeSetting
            {
                StoreId = storeId,
                DataType = dataType,
                StartDate = DateTime.UtcNow.AddYears(-2),
                EndDate = DateTime.UtcNow.AddMonths(-6),
                IsActive = true
            };
            _context.SyncRangeSettings.Add(originalSetting);
            await _context.SaveChangesAsync();

            var newStart = DateTime.UtcNow.AddYears(-1);
            var newEnd = DateTime.UtcNow;

            // Act
            await _syncRangeManager.UpdateSyncRangeAsync(
                storeId, dataType, newStart, newEnd);

            // Assert
            var updatedSetting = await _context.SyncRangeSettings
                .FirstOrDefaultAsync(s => s.StoreId == storeId && s.DataType == dataType);
            Assert.NotNull(updatedSetting);
            Assert.Equal(newStart, updatedSetting.StartDate);
            Assert.Equal(newEnd, updatedSetting.EndDate);
        }

        [Fact]
        public async Task UpdateSyncRangeAsync_ShouldNotThrow_WhenSettingNotFound()
        {
            // Arrange
            var storeId = 999;
            var dataType = "NonExistent";

            // Act & Assert (should not throw)
            await _syncRangeManager.UpdateSyncRangeAsync(
                storeId, dataType, DateTime.UtcNow, DateTime.UtcNow);
        }

        [Fact]
        public async Task ResetSyncRangeAsync_ShouldDeactivateAllSettings()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var setting1 = new SyncRangeSetting
            {
                StoreId = storeId,
                DataType = dataType,
                IsActive = true
            };
            var setting2 = new SyncRangeSetting
            {
                StoreId = storeId,
                DataType = dataType,
                IsActive = true
            };
            _context.SyncRangeSettings.Add(setting1);
            _context.SyncRangeSettings.Add(setting2);
            await _context.SaveChangesAsync();

            // Act
            await _syncRangeManager.ResetSyncRangeAsync(storeId, dataType);

            // Assert
            var settings = await _context.SyncRangeSettings
                .Where(s => s.StoreId == storeId && s.DataType == dataType)
                .ToListAsync();
            Assert.All(settings, s => Assert.False(s.IsActive));
        }

        [Fact]
        public async Task IsWithinSyncRangeAsync_ShouldReturnTrue_WhenDateIsInRange()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Orders";
            var setting = new SyncRangeSetting
            {
                StoreId = storeId,
                DataType = dataType,
                StartDate = DateTime.UtcNow.AddDays(-30),
                EndDate = DateTime.UtcNow,
                IsActive = true
            };
            _context.SyncRangeSettings.Add(setting);
            await _context.SaveChangesAsync();

            var testDate = DateTime.UtcNow.AddDays(-15);

            // Act
            var isWithinRange = await _syncRangeManager.IsWithinSyncRangeAsync(
                storeId, dataType, testDate);

            // Assert
            Assert.True(isWithinRange);
        }

        [Fact]
        public async Task IsWithinSyncRangeAsync_ShouldReturnFalse_WhenDateIsOutOfRange()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Orders";
            var setting = new SyncRangeSetting
            {
                StoreId = storeId,
                DataType = dataType,
                StartDate = DateTime.UtcNow.AddDays(-30),
                EndDate = DateTime.UtcNow.AddDays(-10),
                IsActive = true
            };
            _context.SyncRangeSettings.Add(setting);
            await _context.SaveChangesAsync();

            var testDate = DateTime.UtcNow.AddDays(-5);

            // Act
            var isWithinRange = await _syncRangeManager.IsWithinSyncRangeAsync(
                storeId, dataType, testDate);

            // Assert
            Assert.False(isWithinRange);
        }

        [Fact]
        public async Task IsWithinSyncRangeAsync_ShouldReturnTrue_WhenNoSettingExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var testDate = DateTime.UtcNow;

            // Act
            var isWithinRange = await _syncRangeManager.IsWithinSyncRangeAsync(
                storeId, dataType, testDate);

            // Assert
            Assert.True(isWithinRange);
        }

        [Theory]
        [InlineData("products", 10)]
        [InlineData("customers", 3)]
        [InlineData("orders", 1)]
        [InlineData("unknown", 2)]
        public void GetRecommendedRange_ShouldReturnCorrectRangeForDataType(
            string dataType, int expectedYearsBack)
        {
            // Act
            var range = _syncRangeManager.GetRecommendedRange(dataType);

            // Assert
            var expectedStart = DateTime.UtcNow.AddYears(-expectedYearsBack);
            Assert.True(range.Start >= expectedStart.AddDays(-1));
            Assert.True(range.Start <= expectedStart.AddDays(1));
            Assert.True(range.End <= DateTime.UtcNow.AddMinutes(1));
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}