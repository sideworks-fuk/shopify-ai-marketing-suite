using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Xunit;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Services.Sync;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Jobs;
using System.Diagnostics;

namespace ShopifyAnalyticsApi.Tests.Performance;

/// <summary>
/// Shopify API パフォーマンステスト
/// 大量データ処理、メモリ使用量、レスポンス時間の測定
/// </summary>
public class ShopifyApiPerformanceTests : IClassFixture<ShopifyApiPerformanceTestFixture>
{
    private readonly ShopifyApiPerformanceTestFixture _fixture;
    private readonly ILogger<ShopifyApiPerformanceTests> _logger;

    public ShopifyApiPerformanceTests(ShopifyApiPerformanceTestFixture fixture)
    {
        _fixture = fixture;
        _logger = _fixture.ServiceProvider.GetRequiredService<ILogger<ShopifyApiPerformanceTests>>();
    }

    [Fact]
    public async Task ProductSync_LargeDataset_ShouldMeetPerformanceThresholds()
    {
        // Arrange
        var productSyncJob = _fixture.ServiceProvider.GetRequiredService<ShopifyProductSyncJob>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Act
        var performanceMetrics = await MeasurePerformanceAsync(async () =>
        {
            await productSyncJob.SyncProducts(storeId, null);
        });
        
        // Assert - Performance thresholds
        Assert.True(performanceMetrics.ExecutionTime < TimeSpan.FromMinutes(5), 
            $"Product sync should complete within 5 minutes, took {performanceMetrics.ExecutionTime.TotalMinutes:F2} minutes");
        
        Assert.True(performanceMetrics.PeakMemoryUsageMB < 200, 
            $"Peak memory usage should be under 200MB, was {performanceMetrics.PeakMemoryUsageMB:F2} MB");
        
        Assert.True(performanceMetrics.MemoryLeakMB < 50, 
            $"Memory leak should be under 50MB, was {performanceMetrics.MemoryLeakMB:F2} MB");
        
        _logger.LogInformation($"Product sync performance: {performanceMetrics}");
    }

    [Fact]
    public async Task CustomerSync_LargeDataset_ShouldMeetPerformanceThresholds()
    {
        // Arrange
        var customerSyncJob = _fixture.ServiceProvider.GetRequiredService<ShopifyCustomerSyncJob>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Test with 6 months of data
        var sinceDate = DateTime.UtcNow.AddMonths(-6);
        
        // Act
        var performanceMetrics = await MeasurePerformanceAsync(async () =>
        {
            var options = new InitialSyncOptions { StartDate = sinceDate };
            await customerSyncJob.SyncCustomers(storeId, options);
        });
        
        // Assert - Performance thresholds
        Assert.True(performanceMetrics.ExecutionTime < TimeSpan.FromMinutes(10), 
            $"Customer sync should complete within 10 minutes, took {performanceMetrics.ExecutionTime.TotalMinutes:F2} minutes");
        
        Assert.True(performanceMetrics.PeakMemoryUsageMB < 300, 
            $"Peak memory usage should be under 300MB, was {performanceMetrics.PeakMemoryUsageMB:F2} MB");
        
        Assert.True(performanceMetrics.MemoryLeakMB < 75, 
            $"Memory leak should be under 75MB, was {performanceMetrics.MemoryLeakMB:F2} MB");
        
        _logger.LogInformation($"Customer sync performance: {performanceMetrics}");
    }

    [Fact]
    public async Task OrderSync_LargeDataset_ShouldMeetPerformanceThresholds()
    {
        // Arrange
        var orderSyncJob = _fixture.ServiceProvider.GetRequiredService<ShopifyOrderSyncJob>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Test with 3 months of data
        var sinceDate = DateTime.UtcNow.AddMonths(-3);
        
        // Act
        var performanceMetrics = await MeasurePerformanceAsync(async () =>
        {
            var options = new InitialSyncOptions { StartDate = sinceDate };
            await orderSyncJob.SyncOrders(storeId, options);
        });
        
        // Assert - Performance thresholds
        Assert.True(performanceMetrics.ExecutionTime < TimeSpan.FromMinutes(15), 
            $"Order sync should complete within 15 minutes, took {performanceMetrics.ExecutionTime.TotalMinutes:F2} minutes");
        
        Assert.True(performanceMetrics.PeakMemoryUsageMB < 500, 
            $"Peak memory usage should be under 500MB, was {performanceMetrics.PeakMemoryUsageMB:F2} MB");
        
        Assert.True(performanceMetrics.MemoryLeakMB < 100, 
            $"Memory leak should be under 100MB, was {performanceMetrics.MemoryLeakMB:F2} MB");
        
        _logger.LogInformation($"Order sync performance: {performanceMetrics}");
    }

    [Fact]
    public async Task ConcurrentSyncOperations_ShouldHandleLoadEfficiently()
    {
        // Arrange
        var productSyncJob = _fixture.ServiceProvider.GetRequiredService<ShopifyProductSyncJob>();
        var customerSyncJob = _fixture.ServiceProvider.GetRequiredService<ShopifyCustomerSyncJob>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Act - Run multiple sync operations concurrently
        var stopwatch = Stopwatch.StartNew();
        var memoryBefore = GC.GetTotalMemory(false);
        
        var tasks = new[]
        {
            productSyncJob.SyncProducts(storeId, null),
            customerSyncJob.SyncCustomers(storeId, new InitialSyncOptions { StartDate = DateTime.UtcNow.AddMonths(-1) })
        };
        
        await Task.WhenAll(tasks);
        
        stopwatch.Stop();
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        var memoryAfter = GC.GetTotalMemory(false);
        
        var memoryUsedMB = (memoryAfter - memoryBefore) / 1024.0 / 1024.0;
        
        // Assert
        Assert.True(stopwatch.Elapsed < TimeSpan.FromMinutes(8), 
            $"Concurrent sync operations should complete within 8 minutes, took {stopwatch.Elapsed.TotalMinutes:F2} minutes");
        
        Assert.True(memoryUsedMB < 400, 
            $"Concurrent operations should use under 400MB, used {memoryUsedMB:F2} MB");
        
        _logger.LogInformation($"Concurrent sync performance: {stopwatch.Elapsed.TotalMinutes:F2} minutes, {memoryUsedMB:F2} MB");
    }

    [Fact]
    public async Task DatabaseWritePerformance_ShouldMeetThresholds()
    {
        // Arrange
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        // Create test data
        var testProducts = GenerateTestProducts(storeId, 1000);
        
        // Act
        var stopwatch = Stopwatch.StartNew();
        
        await context.Products.AddRangeAsync(testProducts);
        await context.SaveChangesAsync();
        
        stopwatch.Stop();
        
        // Assert
        var productsPerSecond = testProducts.Count / stopwatch.Elapsed.TotalSeconds;
        
        Assert.True(productsPerSecond > 50, 
            $"Database write performance should exceed 50 products/second, achieved {productsPerSecond:F2} products/second");
        
        _logger.LogInformation($"Database write performance: {productsPerSecond:F2} products/second");
        
        // Cleanup
        context.Products.RemoveRange(testProducts);
        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task MemoryUsage_UnderContinuousLoad_ShouldStabilize()
    {
        // Arrange
        var apiService = _fixture.ServiceProvider.GetRequiredService<ShopifyApiService>();
        var context = _fixture.ServiceProvider.GetRequiredService<ShopifyDbContext>();
        var storeId = await GetOrCreateTestStoreAsync(context);
        
        var memoryMeasurements = new List<long>();
        
        // Act - Simulate continuous load
        for (int i = 0; i < 5; i++)
        {
            await apiService.SyncProductsAsync(storeId);
            
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            
            var currentMemory = GC.GetTotalMemory(false);
            memoryMeasurements.Add(currentMemory);
            
            _logger.LogInformation($"Memory after iteration {i + 1}: {currentMemory / 1024.0 / 1024.0:F2} MB");
            
            await Task.Delay(1000); // Wait between iterations
        }
        
        // Assert - Memory should stabilize (not continuously grow)
        var firstMeasurement = memoryMeasurements.First();
        var lastMeasurement = memoryMeasurements.Last();
        var memoryGrowth = (lastMeasurement - firstMeasurement) / 1024.0 / 1024.0;
        
        Assert.True(memoryGrowth < 100, 
            $"Memory growth should be under 100MB after 5 iterations, was {memoryGrowth:F2} MB");
    }

    private async Task<PerformanceMetrics> MeasurePerformanceAsync(Func<Task> operation)
    {
        // Force garbage collection before measurement
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        
        var memoryBefore = GC.GetTotalMemory(false);
        var stopwatch = Stopwatch.StartNew();
        
        var peakMemory = memoryBefore;
        var memoryMonitor = Task.Run(async () =>
        {
            while (!stopwatch.IsRunning || stopwatch.IsRunning)
            {
                var currentMemory = GC.GetTotalMemory(false);
                if (currentMemory > peakMemory)
                    peakMemory = currentMemory;
                
                await Task.Delay(100);
                
                if (stopwatch.Elapsed > TimeSpan.FromMinutes(20)) // Safety timeout
                    break;
            }
        });
        
        // Execute operation
        await operation();
        
        stopwatch.Stop();
        
        // Final garbage collection
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        
        var memoryAfter = GC.GetTotalMemory(false);
        
        return new PerformanceMetrics
        {
            ExecutionTime = stopwatch.Elapsed,
            MemoryBeforeMB = memoryBefore / 1024.0 / 1024.0,
            MemoryAfterMB = memoryAfter / 1024.0 / 1024.0,
            PeakMemoryUsageMB = peakMemory / 1024.0 / 1024.0,
            MemoryLeakMB = (memoryAfter - memoryBefore) / 1024.0 / 1024.0
        };
    }

    private List<Product> GenerateTestProducts(int storeId, int count)
    {
        var products = new List<Product>();
        
        for (int i = 0; i < count; i++)
        {
            products.Add(new Product
            {
                StoreId = storeId,
                ShopifyProductId = $"test_product_{i}",
                Title = $"Test Product {i}",
                Handle = $"test-product-{i}",
                ProductType = "Test",
                Vendor = "Test Vendor",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
        
        return products;
    }

    private async Task<int> GetOrCreateTestStoreAsync(ShopifyDbContext context)
    {
        var testShop = _fixture.Configuration["Shopify:TestShop"] ?? "performance-test-store.myshopify.com";
        var testAccessToken = _fixture.Configuration["Shopify:TestAccessToken"] ?? "test_access_token";
        
        var store = await context.Stores.FirstOrDefaultAsync(s => s.Domain == testShop);
        
        if (store == null)
        {
            store = new Store
            {
                Domain = testShop,
                Name = "Performance Test Store",
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
/// パフォーマンス測定結果
/// </summary>
public class PerformanceMetrics
{
    public TimeSpan ExecutionTime { get; set; }
    public double MemoryBeforeMB { get; set; }
    public double MemoryAfterMB { get; set; }
    public double PeakMemoryUsageMB { get; set; }
    public double MemoryLeakMB { get; set; }

    public override string ToString()
    {
        return $"Execution: {ExecutionTime.TotalSeconds:F2}s, " +
               $"Memory: {MemoryBeforeMB:F2}MB → {MemoryAfterMB:F2}MB, " +
               $"Peak: {PeakMemoryUsageMB:F2}MB, " +
               $"Leak: {MemoryLeakMB:F2}MB";
    }
}

/// <summary>
/// パフォーマンステスト用のフィクスチャクラス
/// </summary>
public class ShopifyApiPerformanceTestFixture : IDisposable
{
    public IServiceProvider ServiceProvider { get; private set; }
    public IConfiguration Configuration { get; private set; }

    public ShopifyApiPerformanceTestFixture()
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
        services.AddScoped<ShopifyDataSyncService>();
        services.AddScoped<ShopifyProductSyncJob>();
        services.AddScoped<ShopifyCustomerSyncJob>();
        services.AddScoped<ShopifyOrderSyncJob>();
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