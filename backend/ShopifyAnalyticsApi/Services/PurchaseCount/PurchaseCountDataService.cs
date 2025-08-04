using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.PurchaseCount;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数データアクセスサービスの実装
    /// 責任範囲: データクエリ・顧客セグメント取得
    /// </summary>
    public class PurchaseCountDataService : IPurchaseCountDataService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<PurchaseCountDataService> _logger;

        public PurchaseCountDataService(
            ShopifyDbContext context,
            ILogger<PurchaseCountDataService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 顧客購入回数データを取得
        /// </summary>
        public async Task<List<CustomerPurchaseData>> GetCustomerPurchaseCountsAsync(int storeId, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogDebug("顧客購入回数データ取得開始: StoreId={StoreId}, Period={StartDate}-{EndDate}", 
                    storeId, startDate, endDate);

                var customerPurchaseCounts = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               o.CreatedAt >= startDate && 
                               o.CreatedAt <= endDate)
                    .GroupBy(o => o.CustomerId)
                    .Select(g => new CustomerPurchaseData
                    { 
                        CustomerId = g.Key, 
                        PurchaseCount = g.Count(),
                        TotalAmount = g.Sum(order => order.TotalPrice),
                        OrderCount = g.Count()
                    })
                    .ToListAsync();

                _logger.LogDebug("顧客購入回数データ取得完了: 件数={Count}", customerPurchaseCounts.Count);
                return customerPurchaseCounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "顧客購入回数データ取得中にエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// セグメント顧客IDを取得
        /// </summary>
        public async Task<(string segmentName, List<int> customerIds)> GetSegmentCustomerIdsAsync(int storeId, string segment)
        {
            try
            {
                _logger.LogDebug("セグメント顧客ID取得開始: StoreId={StoreId}, Segment={Segment}", storeId, segment);

                var endDate = DateTime.UtcNow.Date;
                var startDate = endDate.AddDays(-365);

                List<int> customerIds;
                string segmentName;

                switch (segment.ToLower())
                {
                    case "new":
                        // 新規顧客（初回購入が分析期間内）
                        customerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId)
                            .GroupBy(o => o.CustomerId)
                            .Where(g => g.Min(o => o.CreatedAt) >= startDate)
                            .Select(g => g.Key)
                            .ToListAsync();
                        segmentName = "新規顧客";
                        break;

                    case "returning":
                        // 復帰顧客（過去1年以上購入がなく、分析期間内に購入）
                        var recentCustomerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && o.CreatedAt >= startDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();

                        var oldCustomerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && o.CreatedAt < startDate.AddDays(-365))
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();

                        customerIds = recentCustomerIds.Intersect(oldCustomerIds).ToList();
                        segmentName = "復帰顧客";
                        break;

                    case "existing":
                    default:
                        // 既存顧客（継続的な購入履歴がある）
                        customerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && o.CreatedAt >= startDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();
                        segmentName = "既存顧客";
                        break;
                }

                _logger.LogDebug("セグメント顧客ID取得完了: Segment={Segment}, Count={Count}", segment, customerIds.Count);
                return (segmentName, customerIds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント顧客ID取得中にエラー: StoreId={StoreId}, Segment={Segment}", storeId, segment);
                throw;
            }
        }

        /// <summary>
        /// セグメント顧客の購入回数データを取得
        /// </summary>
        public async Task<List<CustomerPurchaseData>> GetSegmentCustomerPurchaseCountsAsync(int storeId, List<int> customerIds, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogDebug("セグメント顧客購入データ取得開始: StoreId={StoreId}, CustomerCount={CustomerCount}", 
                    storeId, customerIds.Count);

                var customerPurchaseCounts = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               customerIds.Contains(o.CustomerId) &&
                               o.CreatedAt >= startDate && 
                               o.CreatedAt <= endDate)
                    .GroupBy(o => o.CustomerId)
                    .Select(g => new CustomerPurchaseData
                    { 
                        CustomerId = g.Key, 
                        PurchaseCount = g.Count(),
                        TotalAmount = g.Sum(order => order.TotalPrice),
                        OrderCount = g.Count()
                    })
                    .ToListAsync();

                _logger.LogDebug("セグメント顧客購入データ取得完了: 件数={Count}", customerPurchaseCounts.Count);
                return customerPurchaseCounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント顧客購入データ取得中にエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// 期間の総売上を取得
        /// </summary>
        public async Task<decimal> GetTotalRevenueAsync(int storeId, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogDebug("総売上取得開始: StoreId={StoreId}, Period={StartDate}-{EndDate}", 
                    storeId, startDate, endDate);

                var totalRevenue = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               o.CreatedAt >= startDate && 
                               o.CreatedAt <= endDate)
                    .SumAsync(o => o.TotalPrice);

                _logger.LogDebug("総売上取得完了: Revenue={Revenue}", totalRevenue);
                return totalRevenue;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "総売上取得中にエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// 月次期間の顧客購入データを取得
        /// </summary>
        public async Task<List<CustomerPurchaseData>> GetMonthlyCustomerPurchaseCountsAsync(int storeId, DateTime periodStart, DateTime periodEnd)
        {
            try
            {
                _logger.LogDebug("月次顧客購入データ取得開始: StoreId={StoreId}, Period={StartDate}-{EndDate}", 
                    storeId, periodStart, periodEnd);

                var customerPurchaseCounts = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               o.CreatedAt >= periodStart && 
                               o.CreatedAt <= periodEnd)
                    .GroupBy(o => o.CustomerId)
                    .Select(g => new CustomerPurchaseData
                    { 
                        CustomerId = g.Key, 
                        PurchaseCount = g.Count(),
                        TotalAmount = g.Sum(order => order.TotalPrice),
                        OrderCount = g.Count()
                    })
                    .ToListAsync();

                _logger.LogDebug("月次顧客購入データ取得完了: 件数={Count}", customerPurchaseCounts.Count);
                return customerPurchaseCounts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "月次顧客購入データ取得中にエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }
    }
}