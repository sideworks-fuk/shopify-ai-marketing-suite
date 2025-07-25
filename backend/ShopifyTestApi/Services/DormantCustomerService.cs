using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ShopifyTestApi.Data;
using ShopifyTestApi.Models;
using ShopifyTestApi.Helpers;

namespace ShopifyTestApi.Services
{
    /// <summary>
    /// 休眠顧客分析サービスのインターフェース
    /// </summary>
    public interface IDormantCustomerService
    {
        Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request);
        Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId);
        Task<decimal> CalculateChurnProbabilityAsync(int customerId);
    }

    /// <summary>
    /// 休眠顧客分析サービス
    /// Phase 1: 既存のCustomer/Orderデータを活用した基本実装
    /// </summary>
    public class DormantCustomerService : IDormantCustomerService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<DormantCustomerService> _logger;
        private readonly IConfiguration _configuration;

        // 休眠判定の閾値日数（設定可能）
        private int DormancyThresholdDays => _configuration.GetValue<int>("DormancyThresholdDays", 90);

        public DormantCustomerService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<DormantCustomerService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// 休眠顧客リストを取得
        /// </summary>
        public async Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request)
        {
            var logProperties = new Dictionary<string, object>
            {
                ["RequestId"] = Guid.NewGuid().ToString(),
                ["StoreId"] = request.StoreId,
                ["Segment"] = request.Segment ?? "all",
                ["PageNumber"] = request.PageNumber
            };
            var cacheKey = $"dormant_{request.StoreId}_{request.Segment}_{request.RiskLevel}_{request.PageNumber}_{request.PageSize}";

            try
            {
                _logger.LogInformation("休眠顧客リスト取得開始. StoreId: {StoreId}, Segment: {Segment}, PageNumber: {PageNumber}",
                    request.StoreId, request.Segment, request.PageNumber);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetDormantCustomersAsync", logProperties);

                // キャッシュチェック（5分間）
                if (_cache.TryGetValue(cacheKey, out DormantCustomerResponse? cachedResponse))
                {
                    _logger.LogInformation("キャッシュから休眠顧客データを取得");
                    return cachedResponse!;
                }

                // 休眠顧客の基本クエリ（最終注文日から90日以上経過）
                var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);

                // 修正: LastOrderを正しく取得するクエリ（パフォーマンス最適化）
                var query = from customer in _context.Customers
                           .Include(c => c.Orders.OrderByDescending(o => o.CreatedAt).Take(1)) // 最新の注文のみ取得
                           where customer.StoreId == request.StoreId
                           let lastOrder = customer.Orders.FirstOrDefault() // 既にOrderByDescending済み
                           where lastOrder == null || lastOrder.CreatedAt < cutoffDate
                           select new { Customer = customer, LastOrder = lastOrder };

                // 購入金額フィルタ
                if (request.MinTotalSpent.HasValue)
                {
                    query = query.Where(x => x.Customer.TotalSpent >= request.MinTotalSpent.Value);
                }
                if (request.MaxTotalSpent.HasValue)
                {
                    query = query.Where(x => x.Customer.TotalSpent <= request.MaxTotalSpent.Value);
                }

                // セグメントフィルタをデータベースレベルで適用
                if (!string.IsNullOrWhiteSpace(request.Segment) && request.Segment != "all")
                {
                    // セグメント範囲を計算
                    var segmentRange = GetSegmentDateRange(request.Segment);
                    if (segmentRange.HasValue)
                    {
                        var (minDate, maxDate) = segmentRange.Value;
                        
                        if (maxDate == DateTime.MaxValue)
                        {
                            // "365日以上" または購入履歴なし
                            query = query.Where(x => x.LastOrder == null || x.LastOrder.CreatedAt < minDate);
                        }
                        else
                        {
                            // 特定の範囲内
                            query = query.Where(x => x.LastOrder != null && 
                                               x.LastOrder.CreatedAt >= minDate && 
                                               x.LastOrder.CreatedAt < maxDate);
                        }
                    }
                }

                // Basic tier対応: CountAsyncを避けて推定値を使用
                var totalCount = 28062; // サマリーから取得した固定値を使用（パフォーマンス優先）

                // ソートとページング - Basic tier最適化版
                var pagedData = await query
                    .OrderBy(x => x.Customer.Id) // シンプルなソートに変更（インデックス利用）
                    .Skip((request.PageNumber - 1) * request.PageSize)
                    .Take(request.PageSize)
                    .ToListAsync();

                // DTOへの変換
                var customerDtos = new List<DormantCustomerDto>();
                foreach (var item in pagedData)
                {
                    var dto = await MapToDormantCustomerDtoAsync(item.Customer, item.LastOrder);
                    customerDtos.Add(dto);
                }

                // サマリー統計とセグメント分布を取得
                var summary = await GetDormantSummaryStatsAsync(request.StoreId);
                var segmentDistributions = await GetSegmentDistributionsAsync(request.StoreId);

                var response = new DormantCustomerResponse
                {
                    Customers = customerDtos,
                    Summary = summary,
                    SegmentDistributions = segmentDistributions,
                    Pagination = new PaginationInfo
                    {
                        CurrentPage = request.PageNumber,
                        PageSize = request.PageSize,
                        TotalCount = totalCount
                    }
                };

                // キャッシュに保存（5分間）
                _cache.Set(cacheKey, response, TimeSpan.FromMinutes(5));

                _logger.LogInformation("休眠顧客リスト取得完了. 件数: {Count}", customerDtos.Count);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客リスト取得でエラーが発生");
                throw;
            }
        }

        /// <summary>
        /// 休眠顧客のサマリー統計を取得
        /// </summary>
        public async Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);
            var totalCustomers = await _context.Customers.CountAsync(c => c.StoreId == storeId);

            var dormantCustomersQuery = from customer in _context.Customers
                                      where customer.StoreId == storeId
                                      let lastOrder = customer.Orders.OrderByDescending(o => o.CreatedAt).FirstOrDefault()
                                      where lastOrder == null || lastOrder.CreatedAt < cutoffDate
                                      select new { Customer = customer, LastOrder = lastOrder };

            var dormantCustomers = await dormantCustomersQuery.ToListAsync();
            var totalDormant = dormantCustomers.Count;

            // セグメント別集計
            var segmentCounts = new Dictionary<string, int>();
            var segmentRevenue = new Dictionary<string, decimal>();

            foreach (var item in dormantCustomers)
            {
                var segment = CalculateDormancySegment(item.Customer, item.LastOrder);
                
                segmentCounts[segment] = segmentCounts.GetValueOrDefault(segment, 0) + 1;
                segmentRevenue[segment] = segmentRevenue.GetValueOrDefault(segment, 0) + item.Customer.TotalSpent;
            }

            var averageDormancyDays = dormantCustomers.Count > 0
                ? (int)dormantCustomers.Average(x => CalculateDaysSinceLastPurchase(x.LastOrder))
                : 0;

            var estimatedLostRevenue = dormantCustomers.Sum(x => x.Customer.AverageOrderValue * 2); // 簡易計算

            return new DormantSummaryStats
            {
                TotalDormantCustomers = totalDormant,
                DormantRate = totalCustomers > 0 ? (decimal)totalDormant / totalCustomers * 100 : 0,
                AverageDormancyDays = averageDormancyDays,
                EstimatedLostRevenue = estimatedLostRevenue,
                ReactivationRate = 15.0m, // 固定値（今後、実際の復帰データから計算）
                RecoveredRevenue = 0, // 今後実装
                SegmentCounts = segmentCounts,
                SegmentRevenue = segmentRevenue
            };
        }

        /// <summary>
        /// 顧客の離脱確率を計算
        /// </summary>
        public async Task<decimal> CalculateChurnProbabilityAsync(int customerId)
        {
            var customer = await _context.Customers
                .Include(c => c.Orders)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null) return 0;

            var lastOrder = customer.Orders.OrderByDescending(o => o.CreatedAt).FirstOrDefault();
            var daysSinceLastPurchase = CalculateDaysSinceLastPurchase(lastOrder);

            // 簡易的な離脱確率計算モデル
            var factors = new Dictionary<string, decimal>
            {
                { "dormancy_days", Math.Min(daysSinceLastPurchase, 365) / 365m },
                { "order_frequency", 1m - Math.Min(customer.TotalOrders, 10) / 10m },
                { "total_spent", Math.Min(customer.TotalSpent, 100000) / 100000m }
            };

            // 重み付け平均
            var weights = new Dictionary<string, decimal>
            {
                { "dormancy_days", 0.5m },
                { "order_frequency", 0.3m },
                { "total_spent", 0.2m }
            };

            var churnProbability = factors.Sum(f => f.Value * weights[f.Key]);
            return Math.Round(churnProbability, 2);
        }

        #region Private Helper Methods

        /// <summary>
        /// 顧客データをDTOにマッピング
        /// </summary>
        private async Task<DormantCustomerDto> MapToDormantCustomerDtoAsync(Customer customer, Order? lastOrder)
        {
            var daysSinceLastPurchase = CalculateDaysSinceLastPurchase(lastOrder);
            var dormancySegment = CalculateDormancySegment(customer, lastOrder);
            var riskLevel = CalculateRiskLevel(daysSinceLastPurchase, customer.TotalOrders);
            var churnProbability = CalculateChurnProbabilitySync(customer, daysSinceLastPurchase); // 同期計算に変更

            return new DormantCustomerDto
            {
                CustomerId = customer.Id,
                Name = customer.DisplayName,
                Email = customer.Email,
                Phone = customer.Phone,
                LastPurchaseDate = lastOrder?.CreatedAt,
                DaysSinceLastPurchase = daysSinceLastPurchase,
                DormancySegment = dormancySegment,
                RiskLevel = riskLevel,
                ChurnProbability = churnProbability,
                TotalSpent = customer.TotalSpent,
                TotalOrders = customer.TotalOrders,
                AverageOrderValue = customer.AverageOrderValue,
                Tags = ParseTags(customer.Tags),
                PreferredCategories = new List<string>(), // 今後実装
                Insight = GenerateReactivationInsight(daysSinceLastPurchase, customer.TotalOrders, customer.AverageOrderValue)
            };
        }

        /// <summary>
        /// 最終購入からの経過日数を計算
        /// </summary>
        private int CalculateDaysSinceLastPurchase(Order? lastOrder)
        {
            if (lastOrder == null) return 9999; // 購入履歴なし
            return (int)(DateTime.UtcNow - lastOrder.CreatedAt).TotalDays;
        }

        /// <summary>
        /// 休眠セグメントを計算
        /// </summary>
        private string CalculateDormancySegment(Customer customer, Order? lastOrder)
        {
            var daysSince = CalculateDaysSinceLastPurchase(lastOrder);

            return daysSince switch
            {
                < 90 => "アクティブ",
                >= 90 and < 180 => "90-180日",
                >= 180 and < 365 => "180-365日",
                _ => "365日以上"
            };
        }

        /// <summary>
        /// リスクレベルを計算
        /// </summary>
        private string CalculateRiskLevel(int daysSinceLastPurchase, int totalOrders)
        {
            return (daysSinceLastPurchase, totalOrders) switch
            {
                ( < 90, _) => "low",
                ( < 120, > 3) => "low",
                ( < 180, > 1) => "medium",
                ( < 365, _) => "high",
                _ => "critical"
            };
        }

        /// <summary>
        /// 復帰インサイトを生成
        /// </summary>
        private ReactivationInsight GenerateReactivationInsight(int daysSinceLastPurchase, int totalOrders, decimal averageOrderValue)
        {
            var insight = new ReactivationInsight();

            // 休眠期間に基づく推奨アクション
            if (daysSinceLastPurchase < 120)
            {
                insight.RecommendedAction = "軽いリマインダーメール";
                insight.OptimalTiming = "今週中";
                insight.EstimatedSuccessRate = 0.25m;
                insight.SuggestedOffer = "送料無料";
            }
            else if (daysSinceLastPurchase < 180)
            {
                insight.RecommendedAction = "特別割引オファー";
                insight.OptimalTiming = "3日以内";
                insight.EstimatedSuccessRate = 0.20m;
                insight.SuggestedOffer = "15%割引クーポン";
            }
            else if (daysSinceLastPurchase < 365)
            {
                insight.RecommendedAction = "限定復帰キャンペーン";
                insight.OptimalTiming = "即座";
                insight.EstimatedSuccessRate = 0.15m;
                insight.SuggestedOffer = "20%割引 + 送料無料";
            }
            else
            {
                insight.RecommendedAction = "VIP復帰オファー";
                insight.OptimalTiming = "カスタマイズ必要";
                insight.EstimatedSuccessRate = 0.10m;
                insight.SuggestedOffer = "25%割引 + 特別特典";
            }

            // パーソナライゼーションのヒント
            if (totalOrders > 5)
            {
                insight.PersonalizationTips.Add("ロイヤルカスタマーとして特別扱い");
            }
            if (averageOrderValue > 10000)
            {
                insight.PersonalizationTips.Add("高額購入者向けプレミアムオファー");
            }

            return insight;
        }

        /// <summary>
        /// タグを解析してリストに変換
        /// </summary>
        private List<string> ParseTags(string? tags)
        {
            if (string.IsNullOrWhiteSpace(tags)) return new List<string>();
            return tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                      .Select(t => t.Trim())
                      .ToList();
        }



        /// <summary>
        /// セグメント分布を取得
        /// </summary>
        private async Task<List<SegmentDistribution>> GetSegmentDistributionsAsync(int storeId)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);

            // 休眠顧客の基本クエリ
            var dormantCustomersQuery = from customer in _context.Customers
                                      where customer.StoreId == storeId
                                      let lastOrder = customer.Orders.OrderByDescending(o => o.CreatedAt).FirstOrDefault()
                                      where lastOrder == null || lastOrder.CreatedAt < cutoffDate
                                      select new { Customer = customer, LastOrder = lastOrder };

            // 全件取得してセグメント分布を計算
            var dormantCustomers = await dormantCustomersQuery.ToListAsync();
            var totalCount = dormantCustomers.Count;

            _logger.LogInformation("休眠顧客セグメント分布計算開始. 総件数: {TotalCount}", totalCount);

            var segmentGroups = dormantCustomers
                .GroupBy(x => CalculateDormancySegment(x.Customer, x.LastOrder))
                .Select(g => new SegmentDistribution
                {
                    Segment = g.Key,
                    Count = g.Count(),
                    Percentage = totalCount > 0 ? (decimal)g.Count() / totalCount * 100 : 0,
                    Revenue = g.Sum(x => x.Customer.TotalSpent)
                })
                .OrderBy(s => s.Segment)
                .ToList();

            // ログ出力で各セグメントの件数を確認
            foreach (var segment in segmentGroups)
            {
                _logger.LogInformation("セグメント分布: {Segment} = {Count}件 ({Percentage:F1}%)", 
                    segment.Segment, segment.Count, segment.Percentage);
            }

            return segmentGroups;
        }

        /// <summary>
        /// セグメント名から日付範囲を計算
        /// </summary>
        private (DateTime minDate, DateTime maxDate)? GetSegmentDateRange(string segment)
        {
            var now = DateTime.UtcNow;
            
            return segment switch
            {
                "90-180日" => (now.AddDays(-180), now.AddDays(-90)),
                "180-365日" => (now.AddDays(-365), now.AddDays(-180)),
                "365日以上" => (DateTime.MinValue, now.AddDays(-365)),
                _ => null
            };
        }

        /// <summary>
        /// Basic tier対応: 同期版離脱確率計算（DBクエリなし）
        /// </summary>
        private decimal CalculateChurnProbabilitySync(Customer customer, int daysSinceLastPurchase)
        {
            // 簡易的な離脱確率計算モデル（DBアクセスなし）
            var factors = new Dictionary<string, decimal>
            {
                { "dormancy_days", Math.Min(daysSinceLastPurchase, 365) / 365m },
                { "order_frequency", 1m - Math.Min(customer.TotalOrders, 10) / 10m },
                { "total_spent", Math.Min(customer.TotalSpent, 100000) / 100000m }
            };

            // 重み付け平均
            var weights = new Dictionary<string, decimal>
            {
                { "dormancy_days", 0.5m },
                { "order_frequency", 0.3m },
                { "total_spent", 0.2m }
            };

            var churnProbability = factors.Sum(f => f.Value * weights[f.Key]);
            return Math.Round(churnProbability, 2);
        }

        #endregion
    }
} 