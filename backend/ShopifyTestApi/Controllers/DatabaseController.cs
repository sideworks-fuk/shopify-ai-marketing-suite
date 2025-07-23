using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using Microsoft.EntityFrameworkCore;
using ShopifyTestApi.Data;
using ShopifyTestApi.Models;
using ShopifyTestApi.Services;
using ShopifyTestApi.Helpers;
using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace ShopifyTestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableCors("AllowAll")]
    public class DatabaseController : ControllerBase
    {
        private readonly ShopifyDbContext _context;
        private readonly IDatabaseService _databaseService;
        private readonly ILogger<DatabaseController> _logger;

        public DatabaseController(
            ShopifyDbContext context,
            IDatabaseService databaseService,
            ILogger<DatabaseController> logger)
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
        /// </summary>
        [HttpPost("initialize")]
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
                var totalCount = await _context.Customers.CountAsync();
                var customers = await _context.Customers
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
                        createdAt = c.CreatedAt,
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
                var stats = await _context.Customers
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
        /// </summary>
        [HttpPost("import/customers")]
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
                var customerCount = await _context.Customers.CountAsync();
                var orderCount = await _context.Orders.CountAsync();
                var productCount = await _context.Products.CountAsync();
                var orderItemCount = await _context.OrderItems.CountAsync();

                var totalRevenue = await _context.Orders.SumAsync(o => o.TotalPrice);
                var averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

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
    }
}