using Microsoft.AspNetCore.Mvc;
using ShopifyTestApi.Services;

namespace ShopifyTestApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatabaseController : ControllerBase
    {
        private readonly IDatabaseService _databaseService;
        private readonly ILogger<DatabaseController> _logger;

        public DatabaseController(IDatabaseService databaseService, ILogger<DatabaseController> logger)
        {
            _databaseService = databaseService;
            _logger = logger;
        }

        /// <summary>
        /// データベース接続テスト
        /// GET: api/database/test
        /// </summary>
        [HttpGet("test")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                _logger.LogInformation("Database connection test requested");
                
                var isConnected = await _databaseService.TestConnectionAsync();
                
                if (isConnected)
                {
                    return Ok(new 
                    { 
                        success = true,
                        message = "Azure SQL Database接続成功！",
                        timestamp = DateTime.UtcNow,
                        database = "shopify-test-db",
                        server = "shopify-test-server.database.windows.net"
                    });
                }
                else
                {
                    return StatusCode(500, new 
                    { 
                        success = false,
                        message = "データベース接続に失敗しました",
                        timestamp = DateTime.UtcNow
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database connection test error");
                return StatusCode(500, new 
                { 
                    success = false,
                    message = "データベース接続エラー",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// データベース初期化
        /// POST: api/database/initialize
        /// </summary>
        [HttpPost("initialize")]
        public async Task<IActionResult> InitializeDatabase()
        {
            try
            {
                _logger.LogInformation("Database initialization requested");
                
                await _databaseService.InitializeDatabaseAsync();
                
                return Ok(new 
                { 
                    success = true,
                    message = "データベース初期化完了！マイグレーションとサンプルデータの投入が完了しました。",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database initialization error");
                return StatusCode(500, new 
                { 
                    success = false,
                    message = "データベース初期化に失敗しました",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// データベースから顧客一覧取得
        /// GET: api/database/customers
        /// </summary>
        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers()
        {
            try
            {
                _logger.LogInformation("Database customers list requested");
                
                var customers = await _databaseService.GetCustomersAsync();
                
                return Ok(new 
                { 
                    success = true,
                    data = customers.Select(c => new {
                        id = c.Id,
                        name = $"{c.FirstName} {c.LastName}",
                        email = c.Email,
                        phone = c.Phone,
                        segment = c.CustomerSegment,
                        totalSpent = c.TotalSpent,
                        ordersCount = c.OrdersCount,
                        createdAt = c.CreatedAt
                    }),
                    count = customers.Count(),
                    message = "データベースから顧客データを取得しました",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customers from database");
                return StatusCode(500, new 
                { 
                    success = false,
                    message = "顧客データの取得に失敗しました",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// データベースから注文一覧取得
        /// GET: api/database/orders
        /// </summary>
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders()
        {
            try
            {
                _logger.LogInformation("Database orders list requested");
                
                var orders = await _databaseService.GetOrdersAsync();
                
                return Ok(new 
                { 
                    success = true,
                    data = orders.Select(o => new {
                        id = o.Id,
                        orderNumber = o.OrderNumber,
                        customerName = $"{o.Customer.FirstName} {o.Customer.LastName}",
                        totalPrice = o.TotalPrice,
                        status = o.Status,
                        itemsCount = o.OrderItems.Count,
                        createdAt = o.CreatedAt
                    }),
                    count = orders.Count(),
                    message = "データベースから注文データを取得しました",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching orders from database");
                return StatusCode(500, new 
                { 
                    success = false,
                    message = "注文データの取得に失敗しました",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        /// <summary>
        /// データベースから商品一覧取得
        /// GET: api/database/products
        /// </summary>
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            try
            {
                _logger.LogInformation("Database products list requested");
                
                var products = await _databaseService.GetProductsAsync();
                
                return Ok(new 
                { 
                    success = true,
                    data = products.Select(p => new {
                        id = p.Id,
                        title = p.Title,
                        description = p.Description,
                        price = p.Price,
                        category = p.Category,
                        inventory = p.InventoryQuantity,
                        createdAt = p.CreatedAt
                    }),
                    count = products.Count(),
                    message = "データベースから商品データを取得しました",
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching products from database");
                return StatusCode(500, new 
                { 
                    success = false,
                    message = "商品データの取得に失敗しました",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }
    }
} 