using DatabaseFunction.Models;

namespace DatabaseFunction.Services
{
    public interface IDatabaseService
    {
        Task<OrderStatistics> GetOrderStatisticsAsync(int storeId, string period);
        Task<List<TopProduct>> GetTopProductsAsync(int storeId, int limit = 10);
        Task<CustomerSummary> GetCustomerSummaryAsync(int storeId);
        Task<bool> TestConnectionAsync();
    }
}