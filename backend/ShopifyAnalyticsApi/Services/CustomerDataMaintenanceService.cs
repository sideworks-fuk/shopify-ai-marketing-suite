using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;

namespace ShopifyAnalyticsApi.Services
{
    public interface ICustomerDataMaintenanceService
    {
        Task<int> UpdateCustomerTotalOrdersAsync(int? storeId = null);
        Task<CustomerUpdateSummary> GetCustomerUpdateSummaryAsync(int storeId);
    }

    public class CustomerDataMaintenanceService : ICustomerDataMaintenanceService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<CustomerDataMaintenanceService> _logger;

        public CustomerDataMaintenanceService(
            ShopifyDbContext context,
            ILogger<CustomerDataMaintenanceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Customer.TotalOrdersとTotalSpentをOrdersテーブルから再計算して更新
        /// </summary>
        public async Task<int> UpdateCustomerTotalOrdersAsync(int? storeId = null)
        {
            _logger.LogInformation("Customer.TotalOrdersの更新開始. StoreId: {StoreId}", storeId);

            try
            {
                // ストアIDでフィルタリング
                var customersQuery = _context.Customers.AsQueryable();
                if (storeId.HasValue)
                {
                    customersQuery = customersQuery.Where(c => c.StoreId == storeId.Value);
                }

                var customers = await customersQuery.ToListAsync();
                var updatedCount = 0;

                foreach (var customer in customers)
                {
                    // 注文データから集計
                    var orderStats = await _context.Orders
                        .Where(o => o.CustomerId == customer.Id)
                        .GroupBy(o => o.CustomerId)
                        .Select(g => new
                        {
                            OrderCount = g.Count(),
                            TotalSpent = g.Sum(o => o.TotalPrice)
                        })
                        .FirstOrDefaultAsync();

                    if (orderStats != null)
                    {
                        customer.TotalOrders = orderStats.OrderCount;
                        customer.TotalSpent = orderStats.TotalSpent;
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
                        // 注文がない場合は0に設定
                        customer.TotalOrders = 0;
                        customer.TotalSpent = 0;
                        customer.CustomerSegment = "新規顧客";
                        customer.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Customer.TotalOrdersの更新完了. 更新件数: {UpdatedCount}", updatedCount);
                return updatedCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Customer.TotalOrdersの更新でエラーが発生しました");
                throw;
            }
        }

        /// <summary>
        /// 更新前後のサマリー情報を取得
        /// </summary>
        public async Task<CustomerUpdateSummary> GetCustomerUpdateSummaryAsync(int storeId)
        {
            var summary = new CustomerUpdateSummary
            {
                StoreId = storeId,
                TotalCustomers = await _context.Customers.CountAsync(c => c.StoreId == storeId),
                CustomersWithOrders = await _context.Customers.CountAsync(c => c.StoreId == storeId && c.TotalOrders > 0)
            };

            // 休眠顧客数の計算
            var cutoffDate = DateTime.UtcNow.AddDays(-90);
            var dormantQuery = from customer in _context.Customers
                              where customer.StoreId == storeId && customer.TotalOrders > 0
                              let lastOrderDate = _context.Orders
                                  .Where(o => o.CustomerId == customer.Id)
                                  .OrderByDescending(o => o.ShopifyCreatedAt ?? o.CreatedAt)
                                  .Select(o => (DateTime?)(o.ShopifyCreatedAt ?? o.CreatedAt))
                                  .FirstOrDefault()
                              where lastOrderDate.HasValue && lastOrderDate < cutoffDate
                              select customer;

            summary.DormantCustomers = await dormantQuery.CountAsync();

            // セグメント別の内訳
            summary.SegmentBreakdown = await _context.Customers
                .Where(c => c.StoreId == storeId)
                .GroupBy(c => c.CustomerSegment)
                .Select(g => new SegmentCount
                {
                    Segment = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            return summary;
        }
    }

    public class CustomerUpdateSummary
    {
        public int StoreId { get; set; }
        public int TotalCustomers { get; set; }
        public int CustomersWithOrders { get; set; }
        public int DormantCustomers { get; set; }
        public List<SegmentCount> SegmentBreakdown { get; set; } = new List<SegmentCount>();
    }

    public class SegmentCount
    {
        public string Segment { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}