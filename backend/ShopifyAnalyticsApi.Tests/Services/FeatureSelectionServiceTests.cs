using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Moq;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace ShopifyAnalyticsApi.Tests.Services
{
    public class FeatureSelectionServiceTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _memoryCache;
        private readonly Mock<ILogger<FeatureSelectionService>> _loggerMock;
        private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;
        private readonly FeatureSelectionService _service;

        public FeatureSelectionServiceTests()
        {
            // In-memory database setup
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new ShopifyDbContext(options);

            // Memory cache setup
            _memoryCache = new MemoryCache(new MemoryCacheOptions());

            // Mock setup
            _loggerMock = new Mock<ILogger<FeatureSelectionService>>();
            _httpContextAccessorMock = new Mock<IHttpContextAccessor>();

            // Service setup
            _service = new FeatureSelectionService(
                _context,
                _loggerMock.Object,
                _memoryCache,
                _httpContextAccessorMock.Object
            );

            // Seed test data
            SeedTestData();
        }

        private void SeedTestData()
        {
            // Add test store
            var store = new Store
            {
                Id = 1,
                Domain = "test-store.myshopify.com",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.Stores.Add(store);

            // Add subscription plans
            var freePlan = new SubscriptionPlan
            {
                Id = 1,
                Name = "Free",
                Price = 0,
                Features = "Basic features",
                IsActive = true
            };

            var basicPlan = new SubscriptionPlan
            {
                Id = 2,
                Name = "Basic",
                Price = 29.99m,
                Features = "All features",
                IsActive = true
            };

            _context.SubscriptionPlans.AddRange(freePlan, basicPlan);

            // Add store subscription (Free plan)
            var subscription = new StoreSubscription
            {
                Id = 1,
                StoreId = 1,
                PlanId = 1,
                Plan = freePlan,
                Status = "active",
                CreatedAt = DateTime.UtcNow
            };
            _context.StoreSubscriptions.Add(subscription);

            _context.SaveChanges();
        }

        [Fact]
        public async Task GetCurrentSelectionAsync_ShouldReturnCorrectSelection_WhenExists()
        {
            // Arrange
            var storeId = 1;
            var featureId = "dormant_analysis";
            var selection = new UserFeatureSelection
            {
                StoreId = storeId,
                SelectedFeatureId = featureId,
                IsActive = true,
                LastChangeDate = DateTime.UtcNow.AddDays(-5),
                NextChangeAvailableDate = DateTime.UtcNow.AddDays(25)
            };
            _context.UserFeatureSelections.Add(selection);
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.GetCurrentSelectionAsync(storeId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(featureId, result.SelectedFeature);
            Assert.False(result.CanChangeToday); // Next change is 25 days away
            Assert.Equal("free", result.PlanType);
        }

        [Fact]
        public async Task SelectFeatureAsync_ShouldSucceed_WhenValidFeature()
        {
            // Arrange
            var storeId = 1;
            var featureId = "year_over_year";
            var idempotencyToken = Guid.NewGuid().ToString();

            // Act
            var (success, errorCode, message) = await _service.SelectFeatureAsync(storeId, featureId, idempotencyToken);

            // Assert
            Assert.True(success);
            Assert.Null(errorCode);
            Assert.Equal("機能の選択が完了しました", message);

            // Verify database
            var selection = await _context.UserFeatureSelections
                .FirstOrDefaultAsync(s => s.StoreId == storeId);
            Assert.NotNull(selection);
            Assert.Equal(featureId, selection.SelectedFeatureId);
        }

        [Fact]
        public async Task SelectFeatureAsync_ShouldFail_WhenInvalidFeature()
        {
            // Arrange
            var storeId = 1;
            var invalidFeatureId = "invalid_feature";
            var idempotencyToken = Guid.NewGuid().ToString();

            // Act
            var (success, errorCode, message) = await _service.SelectFeatureAsync(storeId, invalidFeatureId, idempotencyToken);

            // Assert
            Assert.False(success);
            Assert.Equal("invalid_feature_id", errorCode);
            Assert.Equal("指定された機能は無効です", message);
        }

        [Fact]
        public async Task SelectFeatureAsync_ShouldHandleIdempotency_WhenDuplicateToken()
        {
            // Arrange
            var storeId = 1;
            var featureId = "monthly_sales";
            var idempotencyToken = Guid.NewGuid().ToString();

            // First request
            var (success1, _, _) = await _service.SelectFeatureAsync(storeId, featureId, idempotencyToken);
            Assert.True(success1);

            // Act - Second request with same token
            var (success2, errorCode2, message2) = await _service.SelectFeatureAsync(storeId, featureId, idempotencyToken);

            // Assert
            Assert.True(success2); // Should still return success for idempotent request
            Assert.Null(errorCode2);
            Assert.Equal("リクエストは既に処理されています", message2);
        }

        [Fact]
        public async Task CheckFeatureAccessAsync_ShouldAllowAccess_WhenFeatureSelected()
        {
            // Arrange
            var storeId = 1;
            var featureId = "purchase_count";
            
            // Select the feature first
            var selection = new UserFeatureSelection
            {
                StoreId = storeId,
                SelectedFeatureId = featureId,
                IsActive = true,
                LastChangeDate = DateTime.UtcNow
            };
            _context.UserFeatureSelections.Add(selection);
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.CheckFeatureAccessAsync(storeId, featureId);

            // Assert
            Assert.NotNull(result);
            Assert.True(result.IsAllowed);
            Assert.Null(result.DeniedReason);
        }

        [Fact]
        public async Task CheckFeatureAccessAsync_ShouldDenyAccess_WhenFeatureNotSelected()
        {
            // Arrange
            var storeId = 1;
            var selectedFeatureId = "dormant_analysis";
            var requestedFeatureId = "year_over_year";
            
            // Select a different feature
            var selection = new UserFeatureSelection
            {
                StoreId = storeId,
                SelectedFeatureId = selectedFeatureId,
                IsActive = true,
                LastChangeDate = DateTime.UtcNow
            };
            _context.UserFeatureSelections.Add(selection);
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.CheckFeatureAccessAsync(storeId, requestedFeatureId);

            // Assert
            Assert.NotNull(result);
            Assert.False(result.IsAllowed);
            Assert.Equal("not_selected", result.DeniedReason);
        }

        [Fact]
        public async Task HandlePlanChangeAsync_ShouldResetFeature_WhenDowngradeToFree()
        {
            // Arrange
            var storeId = 1;
            var selectedFeatureId = "analytics";
            
            // Setup existing selection
            var selection = new UserFeatureSelection
            {
                StoreId = storeId,
                SelectedFeatureId = selectedFeatureId,
                IsActive = true,
                LastChangeDate = DateTime.UtcNow.AddDays(-10),
                NextChangeAvailableDate = null // Was on paid plan
            };
            _context.UserFeatureSelections.Add(selection);
            await _context.SaveChangesAsync();

            // Act
            await _service.HandlePlanChangeAsync(storeId, "free", "subscription_cancelled");

            // Assert
            var updatedSelection = await _context.UserFeatureSelections
                .FirstOrDefaultAsync(s => s.StoreId == storeId);
            Assert.NotNull(updatedSelection);
            Assert.NotNull(updatedSelection.NextChangeAvailableDate); // Should have restriction now
        }

        [Fact]
        public async Task GetSelectedFeaturesAsync_ShouldReturnCorrectFeatures()
        {
            // Arrange
            var storeId = "1";
            var featureId = "Analytics";
            
            var selection = new UserFeatureSelection
            {
                StoreId = 1,
                SelectedFeatureId = featureId,
                IsActive = true,
                LastChangeDate = DateTime.UtcNow
            };
            _context.UserFeatureSelections.Add(selection);
            await _context.SaveChangesAsync();

            // Act
            var features = await _service.GetSelectedFeaturesAsync(storeId);

            // Assert
            Assert.NotNull(features);
            Assert.Single(features);
            var firstFeature = features.First();
            Assert.Equal("dormant_analysis", firstFeature.FeatureId);
        }

        [Fact]
        public async Task UpdateSelectedFeaturesAsync_ShouldUpdateFeatures()
        {
            // Arrange
            var storeId = "1";
            var newFeatures = new[] { 
                new AvailableFeature 
                { 
                    FeatureId = "yoy_comparison",
                    DisplayName = "前年同月比分析",
                    IsAccessible = true
                } 
            };

            // Act
            await _service.UpdateSelectedFeaturesAsync(storeId, newFeatures);

            // Assert
            var selection = await _context.UserFeatureSelections
                .FirstOrDefaultAsync(s => s.StoreId == 1);
            Assert.NotNull(selection);
            Assert.Equal("yoy_comparison", selection.SelectedFeatureId);
        }

        [Fact]
        public async Task ConcurrentRequests_ShouldBeHandledCorrectly()
        {
            // Arrange
            var storeId = 1;
            var tasks = new List<Task<(bool success, string? errorCode, string? message)>>();

            // Act - Simulate concurrent requests
            for (int i = 0; i < 5; i++)
            {
                var featureId = i % 2 == 0 ? "dormant_analysis" : "year_over_year";
                var token = Guid.NewGuid().ToString();
                tasks.Add(_service.SelectFeatureAsync(storeId, featureId, token));
            }

            var results = await Task.WhenAll(tasks);

            // Assert - All requests should complete without errors
            foreach (var result in results)
            {
                Assert.True(result.success);
            }
        }

        public void Dispose()
        {
            _context?.Dispose();
            _memoryCache?.Dispose();
        }
    }
}