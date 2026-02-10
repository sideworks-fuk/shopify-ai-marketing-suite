using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// GDPR準拠のためのデータ削除サービス
    /// </summary>
    public interface IDataCleanupService
    {
        Task DeleteStoreDataAsync(string domain);
        Task DeleteCustomerDataAsync(string domain, long customerId);
        Task<string> ExportCustomerDataAsync(string domain, long customerId);
    }

    public class DataCleanupService : IDataCleanupService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<DataCleanupService> _logger;

        public DataCleanupService(
            ShopifyDbContext context,
            ILogger<DataCleanupService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// ストアの全データを削除
        /// </summary>
        public async Task DeleteStoreDataAsync(string domain)
        {
            try
            {
                _logger.LogInformation("ストアデータ削除開始. Domain: {Domain}", domain);

                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == domain);

                // フォールバック: 旧バージョンでDomainが "{domain}_uninstalled_..." にリネームされたレコードを検索
                if (store == null)
                {
                    store = await _context.Stores.FirstOrDefaultAsync(s =>
                        s.Domain != null && s.Domain.StartsWith(domain + "_uninstalled_"));
                    if (store != null)
                    {
                        _logger.LogInformation("Found store with renamed domain. Original: {Domain}, Current: {CurrentDomain}",
                            domain, store.Domain);
                    }
                }

                if (store == null)
                {
                    _logger.LogWarning("ストアが見つかりません. Domain: {Domain}", domain);
                    return;
                }

                var storeId = store.Id;

                // トランザクション開始
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // OrderItemsを削除（外部キー制約のため最初に削除）
                    var orderIds = await _context.Orders
                        .Where(o => o.StoreId == storeId)
                        .Select(o => o.Id)
                        .ToListAsync();

                    if (orderIds.Any())
                    {
                        var deletedOrderItems = await _context.OrderItems
                            .Where(oi => orderIds.Contains(oi.OrderId))
                            .ExecuteDeleteAsync();
                        _logger.LogInformation("OrderItems削除完了. Count: {Count}", deletedOrderItems);
                    }

                    // Ordersを削除
                    var deletedOrders = await _context.Orders
                        .Where(o => o.StoreId == storeId)
                        .ExecuteDeleteAsync();
                    _logger.LogInformation("Orders削除完了. Count: {Count}", deletedOrders);

                    // Customersを削除
                    var deletedCustomers = await _context.Customers
                        .Where(c => c.StoreId == storeId)
                        .ExecuteDeleteAsync();
                    _logger.LogInformation("Customers削除完了. Count: {Count}", deletedCustomers);

                    // Productsを削除
                    var deletedProducts = await _context.Products
                        .Where(p => p.StoreId == storeId)
                        .ExecuteDeleteAsync();
                    _logger.LogInformation("Products削除完了. Count: {Count}", deletedProducts);

                    // Storeを削除
                    _context.Stores.Remove(store);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Store削除完了. Domain: {Domain}", domain);

                    await transaction.CommitAsync();
                    _logger.LogInformation("ストアデータ削除完了. Domain: {Domain}", domain);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストアデータ削除中にエラー発生. Domain: {Domain}", domain);
                throw;
            }
        }

        /// <summary>
        /// 特定の顧客データを削除
        /// </summary>
        public async Task DeleteCustomerDataAsync(string domain, long customerId)
        {
            try
            {
                _logger.LogInformation("顧客データ削除開始. Domain: {Domain}, CustomerId: {CustomerId}", domain, customerId);

                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == domain)
                    ?? await _context.Stores.FirstOrDefaultAsync(s =>
                        s.Domain != null && s.Domain.StartsWith(domain + "_uninstalled_"));
                if (store == null)
                {
                    _logger.LogWarning("ストアが見つかりません. Domain: {Domain}", domain);
                    return;
                }

                var customer = await _context.Customers
                    .FirstOrDefaultAsync(c => c.StoreId == store.Id && c.ShopifyCustomerId == customerId.ToString());

                if (customer == null)
                {
                    _logger.LogWarning("顧客が見つかりません. CustomerId: {CustomerId}", customerId);
                    return;
                }

                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // 顧客の注文を匿名化（削除ではなく匿名化）
                    var orders = await _context.Orders
                        .Where(o => o.CustomerId == customer.Id)
                        .ToListAsync();

                    foreach (var order in orders)
                    {
                        // 注文と顧客の関連を切る（匿名化）
                        // Orderモデルには個人情報フィールドがないため、関連のみ切断
                        order.CustomerId = 0; // 顧客との関連を切る（0は無効な顧客ID）
                    }

                    await _context.SaveChangesAsync();
                    _logger.LogInformation("注文データ匿名化完了. Count: {Count}", orders.Count);

                    // 顧客レコードを削除
                    _context.Customers.Remove(customer);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    _logger.LogInformation("顧客データ削除完了. CustomerId: {CustomerId}", customerId);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客データ削除中にエラー発生. Domain: {Domain}, CustomerId: {CustomerId}", domain, customerId);
                throw;
            }
        }

        /// <summary>
        /// 顧客データをエクスポート
        /// </summary>
        public async Task<string> ExportCustomerDataAsync(string domain, long customerId)
        {
            try
            {
                _logger.LogInformation("顧客データエクスポート開始. Domain: {Domain}, CustomerId: {CustomerId}", domain, customerId);

                var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == domain)
                    ?? await _context.Stores.FirstOrDefaultAsync(s =>
                        s.Domain != null && s.Domain.StartsWith(domain + "_uninstalled_"));
                if (store == null)
                {
                    _logger.LogWarning("ストアが見つかりません. Domain: {Domain}", domain);
                    return string.Empty;
                }

                var customer = await _context.Customers
                    .Include(c => c.Orders)
                        .ThenInclude(o => o.OrderItems)
                    .FirstOrDefaultAsync(c => c.StoreId == store.Id && c.ShopifyCustomerId == customerId.ToString());

                if (customer == null)
                {
                    _logger.LogWarning("顧客が見つかりません. CustomerId: {CustomerId}", customerId);
                    return string.Empty;
                }

                // 顧客データを収集
                var exportData = new
                {
                    Customer = new
                    {
                        customer.ShopifyCustomerId,
                        customer.Email,
                        customer.FirstName,
                        customer.LastName,
                        customer.Phone,
                        customer.TotalOrders,
                        customer.TotalSpent,
                        customer.CreatedAt,
                        customer.UpdatedAt,
                        customer.ShopifyCreatedAt,
                        customer.ShopifyUpdatedAt,
                        customer.SyncedAt
                    },
                    Orders = customer.Orders.Select(o => new
                    {
                        o.OrderNumber,
                        o.CreatedAt,
                        o.UpdatedAt,
                        o.ShopifyCreatedAt,
                        o.ShopifyUpdatedAt,
                        o.SyncedAt,
                        o.TotalPrice,
                        o.SubtotalPrice,
                        o.TaxPrice,
                        o.Currency,
                        o.Status,
                        o.FinancialStatus,
                        LineItems = o.OrderItems.Select(oi => new
                        {
                            oi.ProductTitle,
                            oi.VariantTitle,
                            oi.Quantity,
                            oi.Price,
                            oi.Sku
                        })
                    })
                };

                var json = JsonSerializer.Serialize(exportData, new JsonSerializerOptions
                {
                    WriteIndented = true
                });

                _logger.LogInformation("顧客データエクスポート完了. CustomerId: {CustomerId}", customerId);
                return json;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客データエクスポート中にエラー発生. Domain: {Domain}, CustomerId: {CustomerId}", domain, customerId);
                throw;
            }
        }
    }
}