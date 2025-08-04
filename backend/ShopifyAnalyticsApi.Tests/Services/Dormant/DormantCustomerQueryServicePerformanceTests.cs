using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Dormant;
using System.Diagnostics;

namespace ShopifyAnalyticsApi.Tests.Services.Dormant
{
    public class DormantCustomerQueryServicePerformanceTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly Mock<ILogger<DormantCustomerQueryService>> _mockLogger;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly DormantCustomerQueryService _service;

        public DormantCustomerQueryServicePerformanceTests()
        {
            // In-memoryデータベースのセットアップ
            var options = new DbContextOptionsBuilder<ShopifyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new ShopifyDbContext(options);

            // メモリキャッシュのセットアップ
            _cache = new MemoryCache(new MemoryCacheOptions());

            // モックのセットアップ
            _mockLogger = new Mock<ILogger<DormantCustomerQueryService>>();
            _mockConfiguration = new Mock<IConfiguration>();
            _mockConfiguration.Setup(x => x.GetValue<int>("DormancyThresholdDays", 90)).Returns(90);

            // サービスのインスタンス化
            _service = new DormantCustomerQueryService(
                _context,
                _cache,
                _mockLogger.Object,
                _mockConfiguration.Object);
        }

        [Fact]
        public async Task GetDormantCustomersAsync_LargeDataset_PerformsEfficiently()
        {
            // Arrange
            SeedLargeDataset(1000); // 1000件のテストデータ

            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 50,
                SortBy = "DaysSinceLastPurchase"
            };

            // Act
            var stopwatch = Stopwatch.StartNew();
            var result = await _service.GetDormantCustomersAsync(query);
            stopwatch.Stop();

            // Assert
            result.Should().NotBeNull();
            result.Items.Count.Should().Be(50);
            stopwatch.ElapsedMilliseconds.Should().BeLessThan(1000); // 1秒以内
        }

        [Fact]
        public async Task GetDormantCustomersAsync_CachePerformance_ImprovesTiming()
        {
            // Arrange
            SeedLargeDataset(500);
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 20
            };

            // Act - 初回実行
            var stopwatch1 = Stopwatch.StartNew();
            var result1 = await _service.GetDormantCustomersAsync(query);
            stopwatch1.Stop();

            // Act - キャッシュからの取得
            var stopwatch2 = Stopwatch.StartNew();
            var result2 = await _service.GetDormantCustomersAsync(query);
            stopwatch2.Stop();

            // Assert
            stopwatch2.ElapsedMilliseconds.Should().BeLessThan(stopwatch1.ElapsedMilliseconds / 10);
            result1.Should().BeEquivalentTo(result2);
        }

        [Fact]
        public async Task GetDormantCustomersAsync_ComplexFilters_PerformsAcceptably()
        {
            // Arrange
            SeedLargeDataset(500);
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 20,
                SortBy = "TotalSpent",
                Descending = true,
                Filters = new DormantCustomerFilters
                {
                    DormancySegment = "180-365日",
                    MinTotalSpent = 50000,
                    MaxTotalSpent = 200000,
                    RiskLevel = "high"
                }
            };

            // Act
            var stopwatch = Stopwatch.StartNew();
            var result = await _service.GetDormantCustomersAsync(query);
            stopwatch.Stop();

            // Assert
            result.Should().NotBeNull();
            stopwatch.ElapsedMilliseconds.Should().BeLessThan(2000); // 2秒以内
        }

        [Theory]
        [InlineData(10)]
        [InlineData(50)]
        [InlineData(100)]
        [InlineData(500)]
        public async Task GetDormantCustomersAsync_VariablePageSizes_ScalesLinearly(int pageSize)
        {
            // Arrange
            SeedLargeDataset(1000);
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = pageSize
            };

            // Act
            var stopwatch = Stopwatch.StartNew();
            var result = await _service.GetDormantCustomersAsync(query);
            stopwatch.Stop();

            // Assert
            result.Items.Count.Should().Be(Math.Min(pageSize, result.Pagination.TotalItems));
            
            // ページサイズに比例した時間内に完了すること
            var expectedMaxTime = 100 + (pageSize * 10); // 基準時間 + ページサイズに応じた追加時間
            stopwatch.ElapsedMilliseconds.Should().BeLessThan(expectedMaxTime);
        }

        [Fact]
        public async Task GetDormantCustomersAsync_ConcurrentRequests_HandlesCorrectly()
        {
            // Arrange
            SeedLargeDataset(200);
            var tasks = new List<Task<PaginatedResult<DormantCustomerDto>>>();

            // Act - 10個の並行リクエスト
            for (int i = 1; i <= 10; i++)
            {
                var query = new DormantCustomerQuery
                {
                    StoreId = 1,
                    PageNumber = i,
                    PageSize = 10
                };
                tasks.Add(_service.GetDormantCustomersAsync(query));
            }

            var stopwatch = Stopwatch.StartNew();
            var results = await Task.WhenAll(tasks);
            stopwatch.Stop();

            // Assert
            results.Should().HaveCount(10);
            results.Should().OnlyContain(r => r != null && r.Items != null);
            stopwatch.ElapsedMilliseconds.Should().BeLessThan(3000); // 並行実行でも3秒以内
        }

        private void SeedLargeDataset(int customerCount)
        {
            var customers = new List<Customer>();
            var orders = new List<Order>();
            var random = new Random(42); // 固定シードで再現可能性を確保

            for (int i = 1; i <= customerCount; i++)
            {
                var customer = new Customer
                {
                    Id = i,
                    StoreId = 1,
                    FirstName = "顧客",
                    LastName = $"{i:D5}",
                    Email = $"customer{i}@example.com",
                    TotalSpent = random.Next(10000, 500000),
                    TotalOrders = random.Next(1, 20),
                    Company = i % 10 == 0 ? $"会社{i}" : null,
                    Phone = i % 5 == 0 ? $"090-0000-{i:D4}" : null,
                    Tags = i % 3 == 0 ? "VIP,リピーター" : null
                };
                customers.Add(customer);

                // 休眠顧客として最後の注文を作成（90日以上前）
                if (i <= customerCount * 0.8) // 80%を休眠顧客に
                {
                    var daysAgo = random.Next(91, 500);
                    var order = new Order
                    {
                        Id = i,
                        CustomerId = i,
                        StoreId = 1,
                        CreatedAt = DateTime.UtcNow.AddDays(-daysAgo),
                        FinancialStatus = "paid",
                        TotalPrice = random.Next(5000, 100000)
                    };
                    orders.Add(order);
                }
                else // 20%はアクティブ顧客
                {
                    var daysAgo = random.Next(1, 89);
                    var order = new Order
                    {
                        Id = i,
                        CustomerId = i,
                        StoreId = 1,
                        CreatedAt = DateTime.UtcNow.AddDays(-daysAgo),
                        FinancialStatus = "paid",
                        TotalPrice = random.Next(5000, 100000)
                    };
                    orders.Add(order);
                }
            }

            _context.Customers.AddRange(customers);
            _context.Orders.AddRange(orders);
            _context.SaveChanges();
        }

        public void Dispose()
        {
            _context.Dispose();
            _cache.Dispose();
        }
    }
}