using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Dormant;
using Xunit;
using FluentAssertions;

namespace ShopifyAnalyticsApi.Tests.Services.Dormant
{
    public class DormantCustomerQueryServiceTests : IDisposable
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly Mock<ILogger<DormantCustomerQueryService>> _mockLogger;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly DormantCustomerQueryService _service;

        public DormantCustomerQueryServiceTests()
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

            // テストデータの準備
            SeedTestData();
        }

        [Fact]
        public async Task GetDormantCustomersAsync_ValidQuery_ReturnsPagedResults()
        {
            // Arrange
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 10,
                SortBy = "DaysSinceLastPurchase",
                Descending = false
            };

            // Act
            var result = await _service.GetDormantCustomersAsync(query);

            // Assert
            result.Should().NotBeNull();
            result.Items.Should().NotBeNull();
            result.Items.Count.Should().BeLessThanOrEqualTo(10);
            result.Pagination.Should().NotBeNull();
            result.Pagination.CurrentPage.Should().Be(1);
            result.Pagination.PageSize.Should().Be(10);
            result.Pagination.TotalItems.Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task GetDormantCustomersAsync_WithSegmentFilter_ReturnsFilteredResults()
        {
            // Arrange
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 10,
                Filters = new DormantCustomerFilters
                {
                    DormancySegment = "90-180日"
                }
            };

            // Act
            var result = await _service.GetDormantCustomersAsync(query);

            // Assert
            result.Should().NotBeNull();
            result.Items.Should().NotBeNull();
            result.Items.Should().OnlyContain(x => x.DormancySegment == "90-180日");
        }

        [Fact]
        public async Task GetDormantCustomersAsync_WithMinTotalSpentFilter_ReturnsFilteredResults()
        {
            // Arrange
            var minSpent = 50000m;
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 10,
                Filters = new DormantCustomerFilters
                {
                    MinTotalSpent = minSpent
                }
            };

            // Act
            var result = await _service.GetDormantCustomersAsync(query);

            // Assert
            result.Should().NotBeNull();
            result.Items.Should().NotBeNull();
            result.Items.Should().OnlyContain(x => x.TotalSpent >= minSpent);
        }

        [Fact]
        public async Task GetDormantCustomersAsync_WithPaging_ReturnsCorrectPage()
        {
            // Arrange
            var query1 = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 2,
                SortBy = "CustomerName"
            };

            var query2 = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 2,
                PageSize = 2,
                SortBy = "CustomerName"
            };

            // Act
            var result1 = await _service.GetDormantCustomersAsync(query1);
            var result2 = await _service.GetDormantCustomersAsync(query2);

            // Assert
            result1.Items.Count.Should().Be(2);
            result2.Items.Count.Should().BeGreaterThanOrEqualTo(1);
            result1.Items[0].CustomerId.Should().NotBe(result2.Items[0].CustomerId);
        }

        [Fact]
        public async Task GetDormantCustomersAsync_WithCaching_ReturnsCachedResults()
        {
            // Arrange
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 10
            };

            // Act
            var result1 = await _service.GetDormantCustomersAsync(query);
            var result2 = await _service.GetDormantCustomersAsync(query);

            // Assert
            result1.Should().BeEquivalentTo(result2);
            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("キャッシュから")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task GetDormantCustomersAsync_NullQuery_ThrowsArgumentNullException()
        {
            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(
                async () => await _service.GetDormantCustomersAsync(null!));
        }

        [Fact]
        public async Task GetDormantCustomersAsync_WithSorting_ReturnsSortedResults()
        {
            // Arrange
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 10,
                SortBy = "TotalSpent",
                Descending = true
            };

            // Act
            var result = await _service.GetDormantCustomersAsync(query);

            // Assert
            result.Items.Should().BeInDescendingOrder(x => x.TotalSpent);
        }

        [Fact]
        public async Task GetDormantCustomerByIdAsync_ExistingDormantCustomer_ReturnsCustomer()
        {
            // Arrange
            var customerId = 1; // テストデータの休眠顧客

            // Act
            var result = await _service.GetDormantCustomerByIdAsync(customerId);

            // Assert
            result.Should().NotBeNull();
            result!.CustomerId.Should().Be(customerId);
            result.DaysSinceLastPurchase.Should().BeGreaterThan(90);
        }

        [Fact]
        public async Task GetDormantCustomerByIdAsync_NonExistentCustomer_ReturnsNull()
        {
            // Arrange
            var customerId = 999;

            // Act
            var result = await _service.GetDormantCustomerByIdAsync(customerId);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetDormantCustomerByIdAsync_ActiveCustomer_ReturnsNull()
        {
            // Arrange
            var customerId = 5; // テストデータのアクティブ顧客

            // Act
            var result = await _service.GetDormantCustomerByIdAsync(customerId);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetDormantCustomerCountAsync_WithFilters_ReturnsCorrectCount()
        {
            // Arrange
            var filters = new DormantCustomerFilters
            {
                DormancySegment = "90-180日"
            };

            // Act
            var count = await _service.GetDormantCustomerCountAsync(1, filters);

            // Assert
            count.Should().BeGreaterThan(0);
            count.Should().BeLessThan(10); // テストデータの総数以下
        }

        [Fact]
        public async Task GetDormantCustomerCountAsync_NoFilters_ReturnsAllDormantCount()
        {
            // Act
            var count = await _service.GetDormantCustomerCountAsync(1, null);

            // Assert
            count.Should().Be(4); // テストデータの休眠顧客数
        }

        [Fact]
        public async Task CalculateDormancySegment_ReturnsCorrectSegment()
        {
            // Arrange
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 10
            };

            // Act
            var result = await _service.GetDormantCustomersAsync(query);

            // Assert
            foreach (var customer in result.Items)
            {
                if (customer.DaysSinceLastPurchase <= 180)
                {
                    customer.DormancySegment.Should().Be("90-180日");
                }
                else if (customer.DaysSinceLastPurchase <= 365)
                {
                    customer.DormancySegment.Should().Be("180-365日");
                }
                else
                {
                    customer.DormancySegment.Should().Be("365日以上");
                }
            }
        }

        [Fact]
        public async Task CalculateRiskLevel_ConsidersOrderHistory()
        {
            // Arrange
            var query = new DormantCustomerQuery
            {
                StoreId = 1,
                PageNumber = 1,
                PageSize = 20
            };

            // Act
            var result = await _service.GetDormantCustomersAsync(query);

            // Assert
            var highOrderCustomer = result.Items.FirstOrDefault(x => x.TotalOrders >= 10);
            if (highOrderCustomer != null)
            {
                // 注文回数が多い顧客はリスクレベルが下がる
                highOrderCustomer.RiskLevel.Should().BeOneOf("low", "medium");
            }
        }

        private void SeedTestData()
        {
            // テスト用の顧客データ作成
            var customers = new List<Customer>
            {
                // 休眠顧客（90-180日）
                new Customer { Id = 1, StoreId = 1, FirstName = "休眠", LastName = "太郎", Email = "dormant1@example.com", TotalSpent = 100000, TotalOrders = 5 },
                // 休眠顧客（180-365日）
                new Customer { Id = 2, StoreId = 1, FirstName = "休眠", LastName = "花子", Email = "dormant2@example.com", TotalSpent = 200000, TotalOrders = 10 },
                // 休眠顧客（365日以上）
                new Customer { Id = 3, StoreId = 1, FirstName = "休眠", LastName = "三郎", Email = "dormant3@example.com", TotalSpent = 50000, TotalOrders = 2 },
                // 休眠顧客（低額）
                new Customer { Id = 4, StoreId = 1, FirstName = "休眠", LastName = "四郎", Email = "dormant4@example.com", TotalSpent = 10000, TotalOrders = 1 },
                // アクティブ顧客（休眠ではない）
                new Customer { Id = 5, StoreId = 1, FirstName = "活発", LastName = "五郎", Email = "active@example.com", TotalSpent = 300000, TotalOrders = 15 },
                // 異なる店舗の顧客
                new Customer { Id = 6, StoreId = 2, FirstName = "他店", LastName = "六郎", Email = "other@example.com", TotalSpent = 150000, TotalOrders = 7 }
            };

            _context.Customers.AddRange(customers);

            // テスト用の注文データ作成
            var orders = new List<Order>
            {
                // 顧客1の注文（120日前）
                new Order { Id = 1, CustomerId = 1, StoreId = 1, CreatedAt = DateTime.UtcNow.AddDays(-120), FinancialStatus = "paid", TotalPrice = 20000 },
                // 顧客2の注文（200日前）
                new Order { Id = 2, CustomerId = 2, StoreId = 1, CreatedAt = DateTime.UtcNow.AddDays(-200), FinancialStatus = "paid", TotalPrice = 30000 },
                // 顧客3の注文（400日前）
                new Order { Id = 3, CustomerId = 3, StoreId = 1, CreatedAt = DateTime.UtcNow.AddDays(-400), FinancialStatus = "paid", TotalPrice = 25000 },
                // 顧客4の注文（150日前）
                new Order { Id = 4, CustomerId = 4, StoreId = 1, CreatedAt = DateTime.UtcNow.AddDays(-150), FinancialStatus = "paid", TotalPrice = 10000 },
                // 顧客5の注文（30日前 - アクティブ）
                new Order { Id = 5, CustomerId = 5, StoreId = 1, CreatedAt = DateTime.UtcNow.AddDays(-30), FinancialStatus = "paid", TotalPrice = 50000 },
                // 顧客6の注文（他店舗）
                new Order { Id = 6, CustomerId = 6, StoreId = 2, CreatedAt = DateTime.UtcNow.AddDays(-100), FinancialStatus = "paid", TotalPrice = 30000 }
            };

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