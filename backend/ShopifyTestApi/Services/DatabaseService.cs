using Microsoft.EntityFrameworkCore;
using ShopifyTestApi.Data;
using ShopifyTestApi.Models;

namespace ShopifyTestApi.Services
{
    public interface IDatabaseService
    {
        Task<IEnumerable<Customer>> GetCustomersAsync();
        Task<Customer?> GetCustomerByIdAsync(int id);
        Task<IEnumerable<Order>> GetOrdersAsync();
        Task<IEnumerable<Product>> GetProductsAsync();
        Task<bool> TestConnectionAsync();
        Task InitializeDatabaseAsync();
    }

    public class DatabaseService : IDatabaseService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<DatabaseService> _logger;

        public DatabaseService(ShopifyDbContext context, ILogger<DatabaseService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<Customer>> GetCustomersAsync()
        {
            try
            {
                _logger.LogInformation("Fetching customers from database");
                return await _context.Customers
                    .Include(c => c.Orders)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customers from database");
                throw;
            }
        }

        public async Task<Customer?> GetCustomerByIdAsync(int id)
        {
            try
            {
                _logger.LogInformation("Fetching customer {CustomerId} from database", id);
                return await _context.Customers
                    .Include(c => c.Orders)
                    .ThenInclude(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                    .FirstOrDefaultAsync(c => c.Id == id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching customer {CustomerId} from database", id);
                throw;
            }
        }

        public async Task<IEnumerable<Order>> GetOrdersAsync()
        {
            try
            {
                _logger.LogInformation("Fetching orders from database");
                return await _context.Orders
                    .Include(o => o.Customer)
                    .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching orders from database");
                throw;
            }
        }

        public async Task<IEnumerable<Product>> GetProductsAsync()
        {
            try
            {
                _logger.LogInformation("Fetching products from database");
                return await _context.Products.ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching products from database");
                throw;
            }
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                _logger.LogInformation("Testing database connection");
                await _context.Database.CanConnectAsync();
                
                var customerCount = await _context.Customers.CountAsync();
                _logger.LogInformation("Database connection successful. Customer count: {Count}", customerCount);
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database connection test failed");
                return false;
            }
        }

        public async Task InitializeDatabaseAsync()
        {
            try
            {
                _logger.LogInformation("Initializing database");
                
                // マイグレーションを適用
                await _context.Database.MigrateAsync();
                
                _logger.LogInformation("Database initialization completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database initialization failed");
                throw;
            }
        }
    }
} 