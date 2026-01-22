using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Helpers;
using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace ShopifyAnalyticsApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [EnableCors("AllowAll")]
    public class DatabaseController : StoreAwareControllerBase
    {
        private readonly ShopifyDbContext _context;
        private readonly IDatabaseService _databaseService;
        private readonly ILogger<DatabaseController> _logger;

        public DatabaseController(
            ShopifyDbContext context,
            IDatabaseService databaseService,
            ILogger<DatabaseController> logger) : base(logger)
        {
            _context = context;
            _databaseService = databaseService;
            _logger = logger;
        }

        /// <summary>
        /// データベース接続テスト
        /// </summary>
        [HttpGet("test")]
        public async Task<IActionResult> TestConnection()
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);
            
            try
            {
                _logger.LogInformation("Database connection test requested. {RequestId}", logProperties["RequestId"]);
                
                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "TestDatabaseConnection", logProperties);
                
                var canConnect = await _context.Database.CanConnectAsync();
                
                // 接続文字列を安全に取得
                string connectionStringPreview = "";
                try
                {
                    var connection = _context.Database.GetDbConnection();
                    connectionStringPreview = connection.ConnectionString?.Substring(0, Math.Min(50, connection.ConnectionString.Length)) + "...";
                }
                catch
                {
                    connectionStringPreview = "接続文字列の取得に失敗";
                }

                _logger.LogInformation("Database connection test completed. {RequestId}, Success: {Success}", 
                    logProperties["RequestId"], canConnect);

                return Ok(new
                {
                    success = canConnect,
                    message = canConnect ? "データベース接続成功" : "データベース接続失敗",
                    connectionString = connectionStringPreview,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database connection test failed. {RequestId}", logProperties["RequestId"]);
                return StatusCode(500, new
                {
                    success = false,
                    message = "データベース接続エラー",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// データベース初期化（テーブル作成・サンプルデータ投入）
        /// 管理者専用機能
        /// </summary>
        [HttpPost("initialize")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> InitializeDatabase()
        {
            try
            {
                await _databaseService.InitializeDatabaseAsync();
                return Ok(new
                {
                    success = true,
                    message = "データベース初期化完了",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データベース初期化でエラーが発生しました");
                return StatusCode(500, new
                {
                    success = false,
                    message = "データベース初期化エラー",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// 顧客データ一覧取得
        /// </summary>
        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                // JWTから取得したStoreIdでフィルタリング
                var storeId = this.StoreId;
                
                var totalCount = await _context.Customers.Where(c => c.StoreId == storeId).CountAsync();
                var customers = await _context.Customers
                    .Where(c => c.StoreId == storeId)
                    .OrderByDescending(c => c.TotalSpent)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(c => new
                    {
                        c.Id,
                        name = $"{c.FirstName} {c.LastName}".Trim(),
                        c.FirstName,
                        c.LastName,
                        c.Email,
                        c.Company,
                        c.City,
                        c.ProvinceCode,
                        c.CountryCode,
                        totalSpent = c.TotalSpent,
                        ordersCount = c.TotalOrders,
                        c.Industry,
                        c.AcceptsEmailMarketing,
                        c.AcceptsSMSMarketing,
                        c.Tags,
                        createdAt = c.ShopifyCreatedAt ?? c.CreatedAt,
                        AverageOrderValue = c.TotalOrders > 0 ? c.TotalSpent / c.TotalOrders : 0,
                        IsHighValue = c.TotalSpent > 100000,
                        RegionDisplay = !string.IsNullOrEmpty(c.ProvinceCode) ?
                            $"{c.City}, {c.ProvinceCode}" : c.City
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = customers,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客データ取得でエラーが発生しました");
                return StatusCode(500, new
                {
                    success = false,
                    message = "顧客データ取得エラー",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// 顧客統計情報取得
        /// </summary>
        [HttpGet("customers/stats")]
        public async Task<IActionResult> GetCustomerStats()
        {
            try
            {
                // JWTから取得したStoreIdでフィルタリング
                var storeId = this.StoreId;
                
                var stats = await _context.Customers
                    .Where(c => c.StoreId == storeId)
                    .GroupBy(c => 1)
                    .Select(g => new
                    {
                        TotalCustomers = g.Count(),
                        TotalRevenue = g.Sum(c => c.TotalSpent),
                        AverageOrderValue = g.Average(c => c.TotalOrders > 0 ? c.TotalSpent / c.TotalOrders : 0),
                        HighValueCustomers = g.Count(c => c.TotalSpent > 100000),
                        EmailMarketingOptIn = g.Count(c => c.AcceptsEmailMarketing),
                        SMSMarketingOptIn = g.Count(c => c.AcceptsSMSMarketing),
                        TopRegions = g.GroupBy(c => c.ProvinceCode)
                            .Where(r => !string.IsNullOrEmpty(r.Key))
                            .OrderByDescending(r => r.Count())
                            .Take(5)
                            .Select(r => new { Region = r.Key, Count = r.Count() })
                            .ToList(),
                        TopIndustries = g.GroupBy(c => c.Industry)
                            .Where(i => !string.IsNullOrEmpty(i.Key))
                            .OrderByDescending(i => i.Count())
                            .Take(5)
                            .Select(i => new { Industry = i.Key, Count = i.Count() })
                            .ToList()
                    })
                    .FirstOrDefaultAsync();

                if (stats == null)
                {
                    return Ok(new
                    {
                        success = true,
                        data = new
                        {
                            TotalCustomers = 0,
                            TotalRevenue = 0m,
                            AverageOrderValue = 0m,
                            HighValueCustomers = 0,
                            EmailMarketingOptIn = 0,
                            SMSMarketingOptIn = 0,
                            TopRegions = new List<object>(),
                            TopIndustries = new List<object>()
                        },
                        timestamp = DateTime.UtcNow
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = stats,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客統計取得でエラーが発生しました");
                return StatusCode(500, new
                {
                    success = false,
                    message = "顧客統計取得エラー",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// CSVファイルから顧客データをインポート
        /// 管理者専用機能
        /// </summary>
        [HttpPost("import/customers")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> ImportCustomersFromCsv(IFormFile csvFile)
        {
            if (csvFile == null || csvFile.Length == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "CSVファイルが指定されていません"
                });
            }

            if (!csvFile.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "CSVファイルのみ受け付けています"
                });
            }

            try
            {
                var result = await _databaseService.ImportCustomersFromCsvAsync(csvFile);

                return Ok(new
                {
                    success = true,
                    message = $"顧客データインポート完了: {result.ImportedCount}件",
                    data = new
                    {
                        importedCount = result.ImportedCount,
                        skippedCount = result.SkippedCount,
                        errorCount = result.ErrorCount,
                        errors = result.Errors.Take(10).ToList(), // 最初の10件のエラーのみ表示
                        summary = result.Summary
                    },
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CSVインポートでエラーが発生しました");
                return StatusCode(500, new
                {
                    success = false,
                    message = "CSVインポートエラー",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// データベース全体の統計情報取得
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetDatabaseStats()
        {
            try
            {
                var totalStopwatch = System.Diagnostics.Stopwatch.StartNew();
                
                // JWTから取得したStoreIdでフィルタリング
                var storeId = this.StoreId;
                
                var sw = System.Diagnostics.Stopwatch.StartNew();
                var customerCount = await _context.Customers.Where(c => c.StoreId == storeId).CountAsync();
                _logger.LogInformation("📊 [パフォーマンス] Customers.Count: {ElapsedMs}ms, 件数: {Count}", sw.ElapsedMilliseconds, customerCount);
                
                sw.Restart();
                var orderCount = await _context.Orders.Where(o => o.StoreId == storeId).CountAsync();
                _logger.LogInformation("📊 [パフォーマンス] Orders.Count: {ElapsedMs}ms, 件数: {Count}", sw.ElapsedMilliseconds, orderCount);
                
                sw.Restart();
                var productCount = await _context.Products.Where(p => p.StoreId == storeId).CountAsync();
                _logger.LogInformation("📊 [パフォーマンス] Products.Count: {ElapsedMs}ms, 件数: {Count}", sw.ElapsedMilliseconds, productCount);
                
                sw.Restart();
                // 改善版: JOINを使用（EXISTSサブクエリより効率的）
                var orderItemCount = await (
                    from oi in _context.OrderItems
                    join o in _context.Orders on oi.OrderId equals o.Id
                    where o.StoreId == storeId
                    select oi
                ).CountAsync();
                _logger.LogInformation("📊 [パフォーマンス] OrderItems.Count: {ElapsedMs}ms, 件数: {Count}", sw.ElapsedMilliseconds, orderItemCount);

                sw.Restart();
                var totalRevenue = await _context.Orders.Where(o => o.StoreId == storeId).SumAsync(o => o.TotalPrice);
                _logger.LogInformation("📊 [パフォーマンス] Orders.Sum(TotalPrice): {ElapsedMs}ms, 合計: {Total}", sw.ElapsedMilliseconds, totalRevenue);
                
                var averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
                
                totalStopwatch.Stop();
                _logger.LogInformation("📊 [パフォーマンス] GetDatabaseStats 全体: {ElapsedMs}ms", totalStopwatch.ElapsedMilliseconds);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        customers = customerCount,
                        orders = orderCount,
                        products = productCount,
                        orderItems = orderItemCount,
                        totalRevenue,
                        averageOrderValue,
                        lastUpdated = DateTime.UtcNow
                    },
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データベース統計取得でエラーが発生しました");
                return StatusCode(500, new
                {
                    success = false,
                    message = "データベース統計取得エラー",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// CORSテスト用エンドポイント
        /// </summary>
        [HttpGet("cors-test")]
        public IActionResult CorsTest()
        {
            // リクエストヘッダーをログ出力
            var headers = Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString());
            
            return Ok(new
            {
                success = true,
                message = "CORS test successful",
                timestamp = DateTime.UtcNow,
                corsEnabled = true,
                requestHeaders = headers,
                origin = Request.Headers["Origin"].ToString(),
                userAgent = Request.Headers["User-Agent"].ToString()
            });
        }

        /// <summary>
        /// データベース接続文字列情報取得（デバッグ用）
        /// </summary>
        [HttpGet("connection-info")]
        public IActionResult GetConnectionInfo()
        {
            try
            {
                var connectionString = _context.Database.GetConnectionString();
                var serverInfo = connectionString?.Split(';')
                    .Where(part => part.Contains("Server") || part.Contains("Database"))
                    .ToList();

                return Ok(new
                {
                    success = true,
                    serverInfo = serverInfo ?? new List<string>(),
                    provider = _context.Database.ProviderName,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "接続情報取得でエラーが発生しました");
                return StatusCode(500, new
                {
                    success = false,
                    message = "接続情報取得エラー",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Customer.TotalOrdersを更新
        /// POST: api/database/update-customer-totals
        /// </summary>
        [HttpPost("update-customer-totals")]
        public async Task<IActionResult> UpdateCustomerTotals([FromQuery] int? storeId = null)
        {
            try
            {
                // JWTから取得したStoreIdを使用（セキュリティ対策）
                storeId = this.StoreId;
                
                _logger.LogInformation("Customer totals update requested for StoreId: {StoreId}", storeId);

                // CustomerDataMaintenanceServiceがDIに登録されていない場合は、直接実装
                var customersQuery = _context.Customers.AsQueryable();
                if (storeId.HasValue)
                {
                    customersQuery = customersQuery.Where(c => c.StoreId == storeId.Value);
                }

                var customers = await customersQuery.ToListAsync();
                var updatedCount = 0;

                foreach (var customer in customers)
                {
                    var orderStats = await _context.Orders
                        .Where(o => o.CustomerId == customer.Id)
                        .GroupBy(o => o.CustomerId)
                        .Select(g => new
                        {
                            OrderCount = g.Count(),
                            TotalSpent = g.Sum(o => o.TotalPrice),
                            LastOrderDate = g.Max(o => o.ShopifyProcessedAt ?? o.ShopifyCreatedAt ?? o.CreatedAt)
                        })
                        .FirstOrDefaultAsync();

                    if (orderStats != null)
                    {
                        customer.TotalOrders = orderStats.OrderCount;
                        customer.TotalSpent = orderStats.TotalSpent;
                        customer.LastOrderDate = orderStats.LastOrderDate; // 最終購入日を更新
                        customer.UpdatedAt = DateTime.UtcNow;

                        // CustomerSegmentも更新
                        if (customer.TotalOrders >= 10 || customer.TotalSpent >= 100000)
                        {
                            customer.CustomerSegment = "VIP顧客";
                        }
                        else if (customer.TotalOrders >= 2)
                        {
                            customer.CustomerSegment = "リピーター";
                        }
                        else
                        {
                            customer.CustomerSegment = "新規顧客";
                        }

                        updatedCount++;
                    }
                    else
                    {
                        customer.TotalOrders = 0;
                        customer.TotalSpent = 0;
                        customer.LastOrderDate = null; // 注文がなければnull
                        customer.CustomerSegment = "新規顧客";
                        customer.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Customer totals updated successfully. Updated: {Count} customers", updatedCount);

                return Ok(new
                {
                    success = true,
                    message = $"Customer totals updated successfully for {updatedCount} customers",
                    storeId = storeId,
                    updatedCount = updatedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating customer totals");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating customer totals",
                    error = ex.Message
                });
            }
        }
    }
}