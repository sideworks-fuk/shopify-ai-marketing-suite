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
    public class CheckpointManagerTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly CheckpointManager _checkpointManager;
        private readonly Mock<ILogger<CheckpointManager>> _loggerMock;

        public CheckpointManagerTests()
        {
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ShopifyDbContext(options);
            _loggerMock = new Mock<ILogger<CheckpointManager>>();
            _checkpointManager = new CheckpointManager(_context, _loggerMock.Object);
        }

        [Fact]
        public async Task SaveCheckpointAsync_ShouldCreateNewCheckpoint_WhenNoneExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var cursor = "cursor123";
            var recordsProcessed = 100;
            var dateRange = new DateRange(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);

            // Act
            await _checkpointManager.SaveCheckpointAsync(
                storeId, dataType, cursor, recordsProcessed, dateRange);

            // Assert
            var checkpoint = await _context.SyncCheckpoints
                .FirstOrDefaultAsync(c => c.StoreId == storeId && c.DataType == dataType);

            Assert.NotNull(checkpoint);
            Assert.Equal(cursor, checkpoint.LastSuccessfulCursor);
            Assert.Equal(recordsProcessed, checkpoint.RecordsProcessedSoFar);
            Assert.True(checkpoint.CanResume);
        }

        [Fact]
        public async Task SaveCheckpointAsync_ShouldUpdateExistingCheckpoint()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var existingCheckpoint = new SyncCheckpoint
            {
                StoreId = storeId,
                DataType = dataType,
                LastSuccessfulCursor = "old_cursor",
                RecordsProcessedSoFar = 50,
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            };
            _context.SyncCheckpoints.Add(existingCheckpoint);
            await _context.SaveChangesAsync();

            var newCursor = "new_cursor";
            var newRecordsProcessed = 150;
            var dateRange = new DateRange(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);

            // Act
            await _checkpointManager.SaveCheckpointAsync(
                storeId, dataType, newCursor, newRecordsProcessed, dateRange);

            // Assert
            var checkpoint = await _context.SyncCheckpoints
                .FirstOrDefaultAsync(c => c.StoreId == storeId && c.DataType == dataType);

            Assert.NotNull(checkpoint);
            Assert.Equal(newCursor, checkpoint.LastSuccessfulCursor);
            Assert.Equal(newRecordsProcessed, checkpoint.RecordsProcessedSoFar);
        }

        [Fact]
        public async Task GetResumeInfoAsync_ShouldReturnNull_WhenNoValidCheckpointExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";

            // Act
            var resumeInfo = await _checkpointManager.GetResumeInfoAsync(storeId, dataType);

            // Assert
            Assert.Null(resumeInfo);
        }

        [Fact]
        public async Task GetResumeInfoAsync_ShouldReturnResumeInfo_WhenValidCheckpointExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var checkpoint = new SyncCheckpoint
            {
                StoreId = storeId,
                DataType = dataType,
                LastSuccessfulCursor = "cursor123",
                RecordsProcessedSoFar = 100,
                LastProcessedDate = DateTime.UtcNow,
                CanResume = true,
                ExpiresAt = DateTime.UtcNow.AddDays(1)
            };
            _context.SyncCheckpoints.Add(checkpoint);
            await _context.SaveChangesAsync();

            // Act
            var resumeInfo = await _checkpointManager.GetResumeInfoAsync(storeId, dataType);

            // Assert
            Assert.NotNull(resumeInfo);
            Assert.Equal(checkpoint.LastSuccessfulCursor, resumeInfo.LastCursor);
            Assert.Equal(checkpoint.RecordsProcessedSoFar, resumeInfo.RecordsAlreadyProcessed);
        }

        [Fact]
        public async Task GetResumeInfoAsync_ShouldReturnNull_WhenCheckpointIsExpired()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var checkpoint = new SyncCheckpoint
            {
                StoreId = storeId,
                DataType = dataType,
                LastSuccessfulCursor = "cursor123",
                RecordsProcessedSoFar = 100,
                CanResume = true,
                ExpiresAt = DateTime.UtcNow.AddDays(-1) // 期限切れ
            };
            _context.SyncCheckpoints.Add(checkpoint);
            await _context.SaveChangesAsync();

            // Act
            var resumeInfo = await _checkpointManager.GetResumeInfoAsync(storeId, dataType);

            // Assert
            Assert.Null(resumeInfo);
        }

        [Fact]
        public async Task ClearCheckpointAsync_ShouldRemoveAllCheckpoints()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var checkpoint = new SyncCheckpoint
            {
                StoreId = storeId,
                DataType = dataType,
                LastSuccessfulCursor = "cursor123",
                RecordsProcessedSoFar = 100
            };
            _context.SyncCheckpoints.Add(checkpoint);
            await _context.SaveChangesAsync();

            // Act
            await _checkpointManager.ClearCheckpointAsync(storeId, dataType);

            // Assert
            var checkpoints = await _context.SyncCheckpoints
                .Where(c => c.StoreId == storeId && c.DataType == dataType)
                .ToListAsync();
            Assert.Empty(checkpoints);
        }

        [Fact]
        public async Task HasValidCheckpointAsync_ShouldReturnTrue_WhenValidCheckpointExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var checkpoint = new SyncCheckpoint
            {
                StoreId = storeId,
                DataType = dataType,
                CanResume = true,
                ExpiresAt = DateTime.UtcNow.AddDays(1)
            };
            _context.SyncCheckpoints.Add(checkpoint);
            await _context.SaveChangesAsync();

            // Act
            var hasCheckpoint = await _checkpointManager.HasValidCheckpointAsync(storeId, dataType);

            // Assert
            Assert.True(hasCheckpoint);
        }

        [Fact]
        public async Task HasValidCheckpointAsync_ShouldReturnFalse_WhenNoValidCheckpointExists()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";

            // Act
            var hasCheckpoint = await _checkpointManager.HasValidCheckpointAsync(storeId, dataType);

            // Assert
            Assert.False(hasCheckpoint);
        }

        [Fact]
        public async Task InvalidateCheckpointAsync_ShouldSetCanResumeToFalse()
        {
            // Arrange
            var storeId = 1;
            var dataType = "Products";
            var checkpoint = new SyncCheckpoint
            {
                StoreId = storeId,
                DataType = dataType,
                CanResume = true
            };
            _context.SyncCheckpoints.Add(checkpoint);
            await _context.SaveChangesAsync();

            // Act
            await _checkpointManager.InvalidateCheckpointAsync(storeId, dataType);

            // Assert
            var updatedCheckpoint = await _context.SyncCheckpoints
                .FirstOrDefaultAsync(c => c.StoreId == storeId && c.DataType == dataType);
            Assert.NotNull(updatedCheckpoint);
            Assert.False(updatedCheckpoint.CanResume);
        }

        [Fact]
        public async Task CleanupExpiredCheckpointsAsync_ShouldRemoveExpiredCheckpoints()
        {
            // Arrange
            var expiredCheckpoint = new SyncCheckpoint
            {
                StoreId = 1,
                DataType = "Products",
                ExpiresAt = DateTime.UtcNow.AddDays(-1)
            };
            var validCheckpoint = new SyncCheckpoint
            {
                StoreId = 2,
                DataType = "Orders",
                ExpiresAt = DateTime.UtcNow.AddDays(1)
            };
            _context.SyncCheckpoints.Add(expiredCheckpoint);
            _context.SyncCheckpoints.Add(validCheckpoint);
            await _context.SaveChangesAsync();

            // Act
            await _checkpointManager.CleanupExpiredCheckpointsAsync();

            // Assert
            var remainingCheckpoints = await _context.SyncCheckpoints.ToListAsync();
            Assert.Single(remainingCheckpoints);
            Assert.Equal(2, remainingCheckpoints[0].StoreId);
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}