using Microsoft.Data.SqlClient;
using Azure.Identity;
using Dapper;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using DatabaseFunction.Models;
using System.Data;

namespace DatabaseFunction.Services
{
    public class DatabaseService : IDatabaseService
    {
        private readonly ILogger<DatabaseService> _logger;
        private readonly string _connectionString;
        private readonly bool _useManagedIdentity;

        public DatabaseService(ILogger<DatabaseService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _connectionString = configuration["SqlConnectionString"] ?? 
                "Server=tcp:shopify-test-server.database.windows.net,1433;Database=shopify-test-db;";
            _useManagedIdentity = configuration.GetValue<bool>("UseManagedIdentity", false);
        }

        private async Task<IDbConnection> GetConnectionAsync()
        {
            SqlConnection connection;

            if (_useManagedIdentity)
            {
                // Managed Identity を使用した接続
                _logger.LogInformation("Connecting to SQL Database using Managed Identity");
                connection = new SqlConnection(_connectionString);
                var credential = new DefaultAzureCredential();
                var token = await credential.GetTokenAsync(
                    new Azure.Core.TokenRequestContext(
                        scopes: new[] { "https://database.windows.net/.default" }));
                
                connection.AccessToken = token.Token;
            }
            else
            {
                // 接続文字列にユーザー名/パスワードが含まれている場合
                _logger.LogInformation("Connecting to SQL Database using connection string");
                connection = new SqlConnection(_connectionString);
            }

            await connection.OpenAsync();
            return connection;
        }

        public async Task<OrderStatistics> GetOrderStatisticsAsync(int storeId, string period)
        {
            _logger.LogInformation("Getting order statistics for store {StoreId}, period {Period}", 
                storeId, period);

            // 期間の計算
            var startDate = period switch
            {
                "7days" => DateTime.UtcNow.AddDays(-7),
                "30days" => DateTime.UtcNow.AddDays(-30),
                "90days" => DateTime.UtcNow.AddDays(-90),
                "1year" => DateTime.UtcNow.AddYears(-1),
                _ => DateTime.UtcNow.AddDays(-30)
            };

            using var connection = await GetConnectionAsync();

            var sql = @"
                SELECT 
                    COUNT(*) as OrderCount,
                    COUNT(DISTINCT CustomerId) as UniqueCustomers,
                    ISNULL(SUM(TotalPrice), 0) as TotalRevenue,
                    ISNULL(AVG(TotalPrice), 0) as AverageOrderValue,
                    ISNULL(MAX(TotalPrice), 0) as MaxOrderValue,
                    ISNULL(MIN(TotalPrice), 0) as MinOrderValue
                FROM Orders
                WHERE StoreId = @StoreId 
                AND CreatedAt >= @StartDate";

            var statistics = await connection.QueryFirstOrDefaultAsync<OrderStatistics>(sql, new
            {
                StoreId = storeId,
                StartDate = startDate
            });

            // nullの場合はデフォルト値を返す
            return statistics ?? new OrderStatistics
            {
                OrderCount = 0,
                UniqueCustomers = 0,
                TotalRevenue = 0,
                AverageOrderValue = 0,
                MaxOrderValue = 0,
                MinOrderValue = 0
            };
        }

        public async Task<List<TopProduct>> GetTopProductsAsync(int storeId, int limit = 10)
        {
            _logger.LogInformation("Getting top {Limit} products for store {StoreId}", limit, storeId);

            using var connection = await GetConnectionAsync();

            var sql = @"
                SELECT TOP (@Limit)
                    oi.ProductTitle,
                    COUNT(*) as OrderCount,
                    SUM(oi.Quantity) as TotalQuantity,
                    SUM(oi.Price * oi.Quantity) as TotalRevenue
                FROM OrderItems oi
                INNER JOIN Orders o ON oi.OrderId = o.Id
                WHERE o.StoreId = @StoreId
                GROUP BY oi.ProductTitle
                ORDER BY TotalRevenue DESC";

            var products = await connection.QueryAsync<TopProduct>(sql, new
            {
                StoreId = storeId,
                Limit = limit
            });

            return products.ToList();
        }

        public async Task<CustomerSummary> GetCustomerSummaryAsync(int storeId)
        {
            _logger.LogInformation("Getting customer summary for store {StoreId}", storeId);

            using var connection = await GetConnectionAsync();

            var sql = @"
                SELECT 
                    COUNT(*) as TotalCustomers,
                    COUNT(CASE WHEN TotalOrders > 1 THEN 1 END) as RepeatCustomers,
                    COUNT(CASE WHEN TotalOrders = 1 THEN 1 END) as OneTimeCustomers,
                    COUNT(CASE WHEN AcceptsEmailMarketing = 1 THEN 1 END) as EmailSubscribers,
                    ISNULL(AVG(TotalSpent), 0) as AverageCustomerValue
                FROM Customers
                WHERE StoreId = @StoreId";

            var summary = await connection.QueryFirstOrDefaultAsync<CustomerSummary>(sql, new
            {
                StoreId = storeId
            });

            return summary ?? new CustomerSummary();
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                using var connection = await GetConnectionAsync();
                var result = await connection.ExecuteScalarAsync<int>("SELECT 1");
                _logger.LogInformation("Database connection test successful");
                return result == 1;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database connection test failed");
                return false;
            }
        }
    }
}