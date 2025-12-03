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
            // デフォルトの期間（過去365日）を使用
            return await GetSegmentCustomerIdsAsync(storeId, segment, null, null);
        }

        /// <summary>
        /// セグメント顧客IDを取得（期間指定あり）
        /// </summary>
        public async Task<(string segmentName, List<int> customerIds)> GetSegmentCustomerIdsAsync(int storeId, string segment, DateTime? startDate, DateTime? endDate)
        {
            try
            {
                _logger.LogDebug("セグメント顧客ID取得開始: StoreId={StoreId}, Segment={Segment}, StartDate={StartDate}, EndDate={EndDate}", 
                    storeId, segment, startDate, endDate);

                // 期間が指定されていない場合はデフォルト値を使用
                var actualEndDate = endDate ?? DateTime.UtcNow.Date;
                var actualStartDate = startDate ?? actualEndDate.AddDays(-365);

                List<int> customerIds;
                string segmentName;

                switch (segment.ToLower())
                {
                    case "new":
                        // 新規顧客（初回購入が分析期間内）
                        customerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId)
                            .GroupBy(o => o.CustomerId)
                            .Where(g => g.Min(o => o.CreatedAt) >= actualStartDate && g.Min(o => o.CreatedAt) <= actualEndDate)
                            .Select(g => g.Key)
                            .ToListAsync();
                        segmentName = "新規顧客";
                        break;

                    case "returning":
                        // 復帰顧客（6ヶ月以上購入がなく、分析期間内に購入）
                        var dormantPeriodDays = 180; // 6ヶ月の休眠期間
                        var dormantStartDate = actualStartDate.AddDays(-dormantPeriodDays);
                        
                        // 指定期間内に購入した顧客
                        var recentCustomerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       o.CreatedAt >= actualStartDate && 
                                       o.CreatedAt <= actualEndDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();

                        // 休眠期間前に購入歴がある顧客
                        var oldCustomerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       o.CreatedAt < dormantStartDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();

                        // 休眠期間中に購入がない顧客を特定
                        var activeInDormant = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       o.CreatedAt >= dormantStartDate && 
                                       o.CreatedAt < actualStartDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();

                        // 復帰顧客 = 期間内購入 ∩ 過去購入あり - 休眠期間中購入
                        customerIds = recentCustomerIds
                            .Intersect(oldCustomerIds)
                            .Except(activeInDormant)
                            .ToList();
                        segmentName = "復帰顧客";
                        break;

                    case "existing":
                        // 既存顧客（指定期間より前に購入歴があり、期間内にも購入）
                        var periodCustomers = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       o.CreatedAt >= actualStartDate && 
                                       o.CreatedAt <= actualEndDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();
                        
                        var previousCustomers = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       o.CreatedAt < actualStartDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();
                        
                        // 既存顧客 = 期間内購入 ∩ 期間前購入
                        customerIds = periodCustomers.Intersect(previousCustomers).ToList();
                        segmentName = "既存顧客";
                        break;

                    default:
                        // 全顧客（期間内に購入したすべての顧客）
                        customerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       o.CreatedAt >= actualStartDate && 
                                       o.CreatedAt <= actualEndDate)
                            .Select(o => o.CustomerId)
                            .Distinct()
                            .ToListAsync();
                        segmentName = "全顧客";
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