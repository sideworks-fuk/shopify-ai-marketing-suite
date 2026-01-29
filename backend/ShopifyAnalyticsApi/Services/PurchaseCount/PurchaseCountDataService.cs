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
                               !o.IsTest &&
                               o.ShopifyProcessedAt != null &&
                               o.ShopifyProcessedAt.Value >= startDate && 
                               o.ShopifyProcessedAt.Value <= endDate &&
                               o.CustomerId.HasValue)
                    .GroupBy(o => o.CustomerId!.Value) // nullチェック済みなので!を使用
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
                            .Where(o => o.StoreId == storeId && o.CustomerId.HasValue && o.ShopifyProcessedAt != null && !o.IsTest)
                            .GroupBy(o => o.CustomerId!.Value)
                            .Where(g => g.Min(o => o.ShopifyProcessedAt!.Value) >= actualStartDate && g.Min(o => o.ShopifyProcessedAt!.Value) <= actualEndDate)
                            .Select(g => g.Key)
                            .ToListAsync();
                        segmentName = "新規顧客";
                        break;

                    case "returning":
                        // 復帰顧客（分析期間開始前6ヶ月以上購入がなく、分析期間内に購入）
                        var dormantPeriodDays = 180; // 6ヶ月の休眠期間
                        var dormantEndDate = actualStartDate; // 休眠期間の終了は分析期間開始日
                        var dormantStartDate = dormantEndDate.AddDays(-dormantPeriodDays); // 休眠期間の開始
                        
                        _logger.LogDebug("復帰顧客判定期間: 休眠期間={DormantStart}～{DormantEnd}, 分析期間={AnalysisStart}～{AnalysisEnd}", 
                            dormantStartDate, dormantEndDate, actualStartDate, actualEndDate);
                        
                        // 1. 分析期間内に購入した顧客（テスト注文除外）
                        var recentCustomerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       !o.IsTest &&
                                       o.ShopifyProcessedAt != null &&
                                       o.ShopifyProcessedAt.Value >= actualStartDate && 
                                       o.ShopifyProcessedAt.Value <= actualEndDate &&
                                       o.CustomerId.HasValue)
                            .Select(o => o.CustomerId!.Value)
                            .Distinct()
                            .ToListAsync();

                        // 2. 休眠期間より前（6ヶ月以上前）に購入歴がある顧客（テスト注文除外）
                        var oldCustomerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       !o.IsTest &&
                                       o.ShopifyProcessedAt != null &&
                                       o.ShopifyProcessedAt.Value < dormantStartDate &&
                                       o.CustomerId.HasValue)
                            .Select(o => o.CustomerId!.Value)
                            .Distinct()
                            .ToListAsync();

                        // 3. 休眠期間中（分析期間開始前6ヶ月）に購入した顧客（テスト注文除外）
                        var activeInDormantPeriod = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       !o.IsTest &&
                                       o.ShopifyProcessedAt != null &&
                                       o.ShopifyProcessedAt.Value >= dormantStartDate && 
                                       o.ShopifyProcessedAt.Value < dormantEndDate &&
                                       o.CustomerId.HasValue)
                            .Select(o => o.CustomerId!.Value)
                            .Distinct()
                            .ToListAsync();

                        // 復帰顧客 = 分析期間内購入 ∩ 6ヶ月以上前に購入あり - 休眠期間中に購入
                        customerIds = recentCustomerIds
                            .Intersect(oldCustomerIds)  // 過去に購入歴がある
                            .Except(activeInDormantPeriod)  // 休眠期間中に購入がない
                            .ToList();
                        
                        _logger.LogDebug("復帰顧客算出: 期間内購入={RecentCount}, 過去購入={OldCount}, 休眠期間購入={DormantCount}, 結果={ResultCount}", 
                            recentCustomerIds.Count, oldCustomerIds.Count, activeInDormantPeriod.Count, customerIds.Count);
                        
                        segmentName = "復帰顧客";
                        break;

                    case "existing":
                        // 既存顧客（指定期間より前に購入歴がある全ての顧客）
                        // 期間内の購入有無は問わない（0回購入も含む）
                        customerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       !o.IsTest &&
                                       o.ShopifyProcessedAt != null &&
                                       o.ShopifyProcessedAt.Value < actualStartDate &&
                                       o.CustomerId.HasValue)
                            .Select(o => o.CustomerId!.Value)
                            .Distinct()
                            .ToListAsync();
                        
                        segmentName = "既存顧客";
                        _logger.LogDebug("既存顧客取得: 全既存顧客数={Count}（期間内購入有無を問わず）", customerIds.Count);
                        break;

                    default:
                        // 全顧客（期間内に購入したすべての顧客）
                        customerIds = await _context.Orders
                            .Where(o => o.StoreId == storeId && 
                                       !o.IsTest &&
                                       o.ShopifyProcessedAt != null &&
                                       o.ShopifyProcessedAt.Value >= actualStartDate && 
                                       o.ShopifyProcessedAt.Value <= actualEndDate &&
                                       o.CustomerId.HasValue)
                            .Select(o => o.CustomerId!.Value)
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
        /// セグメント顧客の購入回数データを取得（0回購入も含む）
        /// </summary>
        public async Task<List<CustomerPurchaseData>> GetSegmentCustomerPurchaseCountsAsync(int storeId, List<int> customerIds, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogDebug("セグメント顧客購入データ取得開始: StoreId={StoreId}, CustomerCount={CustomerCount}", 
                    storeId, customerIds.Count);

                // 期間内に購入した顧客のデータを取得
                var purchasedCustomers = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               !o.IsTest &&
                               o.CustomerId.HasValue &&
                               customerIds.Contains(o.CustomerId.Value) &&
                               o.ShopifyProcessedAt != null &&
                               o.ShopifyProcessedAt.Value >= startDate && 
                               o.ShopifyProcessedAt.Value <= endDate)
                    .GroupBy(o => o.CustomerId!.Value) // nullチェック済みなので!を使用
                    .Select(g => new 
                    { 
                        CustomerId = g.Key, 
                        PurchaseCount = g.Count(),
                        TotalAmount = g.Sum(order => order.TotalPrice),
                        OrderCount = g.Count()
                    })
                    .ToDictionaryAsync(x => x.CustomerId);

                // 全顧客に対して結果を作成（購入なしは0回）
                var customerPurchaseCounts = customerIds.Select(customerId => 
                {
                    if (purchasedCustomers.ContainsKey(customerId))
                    {
                        var data = purchasedCustomers[customerId];
                        return new CustomerPurchaseData
                        {
                            CustomerId = customerId,
                            PurchaseCount = data.PurchaseCount,
                            TotalAmount = data.TotalAmount,
                            OrderCount = data.OrderCount
                        };
                    }
                    else
                    {
                        // 購入がない顧客は0回として含める
                        return new CustomerPurchaseData
                        {
                            CustomerId = customerId,
                            PurchaseCount = 0,
                            TotalAmount = 0,
                            OrderCount = 0
                        };
                    }
                }).ToList();

                _logger.LogDebug("セグメント顧客購入データ取得完了: 全顧客数={TotalCount}, 購入あり={PurchasedCount}, 購入なし={NoPurchaseCount}", 
                    customerPurchaseCounts.Count,
                    purchasedCustomers.Count,
                    customerPurchaseCounts.Count - purchasedCustomers.Count);
                    
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
                               !o.IsTest &&
                               o.ShopifyProcessedAt != null &&
                               o.ShopifyProcessedAt.Value >= startDate && 
                               o.ShopifyProcessedAt.Value <= endDate)
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
                               !o.IsTest &&
                               o.ShopifyProcessedAt != null &&
                               o.ShopifyProcessedAt.Value >= periodStart && 
                               o.ShopifyProcessedAt.Value <= periodEnd &&
                               o.CustomerId.HasValue)
                    .GroupBy(o => o.CustomerId!.Value) // nullチェック済みなので!を使用
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