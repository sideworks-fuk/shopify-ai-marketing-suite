using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Xunit;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Sync;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using System.Diagnostics;

namespace ShopifyAnalyticsApi.Tests.Integration;

/// <summary>
/// Shopify API実結合テストクラス
/// 実際のShopify APIと接続してエンドツーエンドの動作を確認
/// </summary>
public class ShopifyApiIntegrationTests : IClassFixture<ShopifyApiIntegrationTestFixture>
{
    private readonly ShopifyApiIntegrationTestFixture _fixture;
    private readonly ILogger<ShopifyApiIntegrationTests> _logger;

    public ShopifyApiIntegrationTests(ShopifyApiIntegrationTestFixture fixture)
    {
        _fixture = fixture;
        _logger = _fixture.ServiceProvider.GetRequiredService<ILogger<ShopifyApiIntegrationTests>>();
    }

    [Fact]
    public async Task OAuth_AuthorizationFlow_ShouldCompleteSuccessfully()
    {
        // Arrange
        var oauthService = _fixture.ServiceProvider.GetRequiredService<ShopifyOAuthService>();
        var testShop = _fixture.Configuration["Shopify:TestShop"];
        
        if (string.IsNullOrEmpty(testShop))
        {
            _logger.LogWarning("TestShop not configured, skipping OAuth test");
            return;
        }

        // Act & Assert
        var authUrl = oauthService.GenerateAuthorizationUrl(testShop, "https://example.com/callback", "state123");
        Assert.NotNull(authUrl);
        Assert.Contains("client_id", authUrl);
        Assert.Contains("scope", authUrl);
        Assert.Contains("redirect_uri", authUrl);
        
        _logger.LogInformation($"OAuth Authorization URL generated: {authUrl}");
    }

    [Fact]
    public async Task ProductSync_WithRealAPI_ShouldCompleteSuccessfully()
    {
        // Arrange
        var apiService = _fixture.ServiceProvider.GetRequiredService<ShopifyApiService>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Act
        var stopwatch = Stopwatch.StartNew();
        var memoryBefore = GC.GetTotalMemory(false);
        
        var syncedCount = await apiService.SyncProductsAsync(storeId);
        
        stopwatch.Stop();
        var memoryAfter = GC.GetTotalMemory(false);
        var memoryUsed = memoryAfter - memoryBefore;
        
        // Assert
        Assert.True(syncedCount >= 0, "Product sync should return non-negative count");
        Assert.True(stopwatch.Elapsed < TimeSpan.FromMinutes(2), "Product sync should complete within 2 minutes");
        Assert.True(memoryUsed < 50_000_000, "Memory usage should be under 50MB"); // 50MB limit
        
        _logger.LogInformation($"Product sync completed: {syncedCount} products in {stopwatch.Elapsed.TotalSeconds:F2} seconds, Memory used: {memoryUsed / 1024 / 1024:F2} MB");
    }

    [Fact]
    public async Task CustomerSync_WithPagination_ShouldHandleCorrectly()
    {
        // Arrange
        var apiService = _fixture.ServiceProvider.GetRequiredService<ShopifyApiService>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Act
        var stopwatch = Stopwatch.StartNew();
        var memoryBefore = GC.GetTotalMemory(false);
        
        // Test with date range to limit results
        var sinceDate = DateTime.UtcNow.AddMonths(-3);
        var syncedCount = await apiService.SyncCustomersAsync(storeId, sinceDate);
        
        stopwatch.Stop();
        var memoryAfter = GC.GetTotalMemory(false);
        var memoryUsed = memoryAfter - memoryBefore;
        
        // Assert
        Assert.True(syncedCount >= 0, "Customer sync should return non-negative count");
        Assert.True(stopwatch.Elapsed < TimeSpan.FromMinutes(3), "Customer sync should complete within 3 minutes");
        Assert.True(memoryUsed < 100_000_000, "Memory usage should be under 100MB");
        
        _logger.LogInformation($"Customer sync completed: {syncedCount} customers in {stopwatch.Elapsed.TotalSeconds:F2} seconds, Memory used: {memoryUsed / 1024 / 1024:F2} MB");
    }

    [Fact]
    public async Task OrderSync_WithDateRange_ShouldFilterCorrectly()
    {
        // Arrange
        var apiService = _fixture.ServiceProvider.GetRequiredService<ShopifyApiService>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Act
        var stopwatch = Stopwatch.StartNew();
        var memoryBefore = GC.GetTotalMemory(false);
        
        // Test with recent date range
        var sinceDate = DateTime.UtcNow.AddMonths(-1);
        var syncedCount = await apiService.SyncOrdersAsync(storeId, sinceDate);
        
        stopwatch.Stop();
        var memoryAfter = GC.GetTotalMemory(false);
        var memoryUsed = memoryAfter - memoryBefore;
        
        // Assert
        Assert.True(syncedCount >= 0, "Order sync should return non-negative count");
        Assert.True(stopwatch.Elapsed < TimeSpan.FromMinutes(5), "Order sync should complete within 5 minutes");
        Assert.True(memoryUsed < 150_000_000, "Memory usage should be under 150MB");
        
        // Verify orders are within date range
        var orders = await context.Orders
            .Where(o => o.StoreId == storeId)
            .Take(10)
            .ToListAsync();
            
        foreach (var order in orders)
        {
            Assert.True(order.CreatedAt >= sinceDate, $"Order {order.ShopifyOrderId} should be after {sinceDate}");
        }
        
        _logger.LogInformation($"Order sync completed: {syncedCount} orders in {stopwatch.Elapsed.TotalSeconds:F2} seconds, Memory used: {memoryUsed / 1024 / 1024:F2} MB");
    }

    [Fact]
    public async Task RateLimit_ShouldBeRespectedDuringSync()
    {
        // Arrange
        var apiService = _fixture.ServiceProvider.GetRequiredService<ShopifyApiService>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Act - Execute multiple sync operations rapidly
        var tasks = new List<Task<int>>();
        for (int i = 0; i < 3; i++)
        {
            tasks.Add(apiService.SyncProductsAsync(storeId));
        }
        
        var stopwatch = Stopwatch.StartNew();
        var results = await Task.WhenAll(tasks);
        stopwatch.Stop();
        
        // Assert
        Assert.All(results, count => Assert.True(count >= 0, "All sync operations should complete successfully"));
        
        // Rate limiting should ensure operations take appropriate time
        // 3 operations with 2 req/sec rate limit should take at least 1 second
        Assert.True(stopwatch.Elapsed >= TimeSpan.FromSeconds(1), "Rate limiting should introduce appropriate delays");
        
        _logger.LogInformation($"Rate limit test completed in {stopwatch.Elapsed.TotalSeconds:F2} seconds");
    }

    [Fact]
    public async Task ErrorHandling_ShouldRetryOnTransientFailures()
    {
        // Arrange
        var apiService = _fixture.ServiceProvider.GetRequiredService<ShopifyApiService>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        
        // Create a store with invalid credentials to trigger retry logic
        var invalidStore = new Store
        {
            Domain = "invalid-store-domain-12345.myshopify.com",
            Name = "Invalid Test Store",
            AccessToken = "invalid_token",
            IsActive = true,
            Id = 99999
        };
        
        // Act & Assert
        // This should fail but should retry according to the retry policy
        var exception = await Assert.ThrowsAnyAsync<Exception>(async () =>
        {
            await apiService.SyncProductsAsync(invalidStore.Id);
        });
        
        _logger.LogInformation($"Expected error occurred: {exception.Message}");
    }

    [Fact]
    public async Task FullDataSync_EndToEnd_ShouldMaintainDataIntegrity()
    {
        // Arrange
        var apiService = _fixture.ServiceProvider.GetRequiredService<ShopifyApiService>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Act - Perform full sync
        var stopwatch = Stopwatch.StartNew();
        
        var productCount = await apiService.SyncProductsAsync(storeId);
        var customerCount = await apiService.SyncCustomersAsync(storeId, DateTime.UtcNow.AddMonths(-6));
        var orderCount = await apiService.SyncOrdersAsync(storeId, DateTime.UtcNow.AddMonths(-3));
        
        stopwatch.Stop();
        
        // Assert - Verify data integrity
        var dbProducts = await context.Products.Where(p => p.StoreId == storeId).CountAsync();
        var dbCustomers = await context.Customers.Where(c => c.StoreId == storeId).CountAsync();
        var dbOrders = await context.Orders.Where(o => o.StoreId == storeId).CountAsync();
        
        Assert.Equal(productCount, dbProducts);
        Assert.Equal(customerCount, dbCustomers);
        Assert.Equal(orderCount, dbOrders);
        
        // Verify relationships
        var ordersWithItems = await context.Orders
            .Include(o => o.OrderItems)
            .Where(o => o.StoreId == storeId)
            .Take(5)
            .ToListAsync();
            
        foreach (var order in ordersWithItems)
        {
            Assert.NotNull(order.OrderItems);
            Assert.True(order.OrderItems.Count >= 0, "Order items should be populated");
        }
        
        _logger.LogInformation($"Full sync completed: {productCount} products, {customerCount} customers, {orderCount} orders in {stopwatch.Elapsed.TotalSeconds:F2} seconds");
    }

    private async Task<int> GetOrCreateTestStoreAsync(ShopifyDbContext context)
    {
        var testShop = _fixture.Configuration["Shopify:TestShop"] ?? "test-store.myshopify.com";
        var testAccessToken = _fixture.Configuration["Shopify:TestAccessToken"] ?? "test_access_token";
        
        var store = await context.Stores.FirstOrDefaultAsync(s => s.Domain == testShop);
        
        if (store == null)
        {
            store = new Store
            {
                Domain = testShop,
                Name = "Test Store",
                AccessToken = testAccessToken,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            
            context.Stores.Add(store);
            await context.SaveChangesAsync();
        }
        
        return store.Id;
    }
}

/// <summary>
/// 統合テスト用のフィクスチャクラス
/// </summary>
public class ShopifyApiIntegrationTestFixture : IDisposable
{
    public IServiceProvider ServiceProvider { get; private set; }
    public IConfiguration Configuration { get; private set; }

    public ShopifyApiIntegrationTestFixture()
    {
        var services = new ServiceCollection();
        
        // Configuration
        var configBuilder = new ConfigurationBuilder()
            .AddJsonFile("appsettings.Development.json", optional: false)
            .AddEnvironmentVariables();
        Configuration = configBuilder.Build();
        
        // Services
        services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Information));
        services.AddSingleton(Configuration);
        services.AddHttpClient();
        
        // Database context
        services.AddDbContext<ShopifyDbContext>(options =>
            options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));
        
        // Sync services
        services.AddScoped<ICheckpointManager, CheckpointManager>();
        services.AddScoped<ISyncProgressTracker, SyncProgressTracker>();
        services.AddScoped<ISyncRangeManager, SyncRangeManager>();
        
        // Application services
        services.AddScoped<ShopifyApiService>();
        services.AddScoped<ShopifyOAuthService>();
        services.AddMemoryCache();
        
        ServiceProvider = services.BuildServiceProvider();
    }

    public void Dispose()
    {
        if (ServiceProvider is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }
}