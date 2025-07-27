using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Helpers;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// 休眠顧客分析サービスのインターフェース
    /// </summary>
    public interface IDormantCustomerService
    {
        Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request);
        Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId);
        Task<decimal> CalculateChurnProbabilityAsync(int customerId);
        Task<List<DetailedSegmentDistribution>> GetDetailedSegmentDistributionsAsync(int storeId);
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
        /// 休眠顧客リストを取得（パフォーマンス最適化版）
        /// </summary>
        public async Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request)
        {
            // 入力検証
            if (request == null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            // ページサイズの設定（最大500件、デフォルト100件）
            request.PageSize = Math.Min(request.PageSize, 500);
            if (request.PageSize <= 0)
            {
                request.PageSize = 100; // デフォルトに設定
            }

            var logProperties = new Dictionary<string, object>
            {
                ["RequestId"] = Guid.NewGuid().ToString(),
                ["StoreId"] = request.StoreId,
                ["Segment"] = request.Segment ?? "all",
                ["PageNumber"] = request.PageNumber,
                ["PageSize"] = request.PageSize
            };
            var cacheKey = $"dormant_v2_{request.StoreId}_{request.Segment}_{request.RiskLevel}_{request.PageNumber}_{request.PageSize}";

            try
            {
                _logger.LogInformation("休眠顧客リスト取得開始. StoreId: {StoreId}, Segment: {Segment}, PageNumber: {PageNumber}",
                    request.StoreId, request.Segment, request.PageNumber);

                // キャッシュチェック（15分間に延長）
                if (_cache.TryGetValue(cacheKey, out DormantCustomerResponse? cachedResponse))
                {
                    _logger.LogInformation("キャッシュから休眠顧客データを取得");
                    return cachedResponse!;
                }

                // 休眠顧客の基本クエリ（パフォーマンス最適化）
                var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);

                // 最適化: 購入履歴のある顧客のみを対象として必要な情報のみを射影
                var query = from customer in _context.Customers
                           where customer.StoreId == request.StoreId && customer.TotalOrders > 0
                           select new 
                           {
                               CustomerId = customer.Id,
                               CustomerName = customer.DisplayName,
                               CustomerEmail = customer.Email,
                               CustomerPhone = customer.Phone,
                               CustomerCompany = customer.Company,  // 会社名を追加
                               TotalSpent = customer.TotalSpent,
                               TotalOrders = customer.TotalOrders,
                               Tags = customer.Tags,
                               // 最終注文日はサブクエリで取得（N+1問題回避）- nullableとして返す
                               LastOrderDate = (DateTime?)_context.Orders
                                   .Where(o => o.CustomerId == customer.Id)
                                   .OrderByDescending(o => o.CreatedAt)
                                   .Select(o => o.CreatedAt)
                                   .FirstOrDefault()
                           };

                // セグメントフィルタ（日付範囲で絞り込み）
                if (!string.IsNullOrEmpty(request.Segment))
                {
                    var segmentRange = GetSegmentDateRange(request.Segment);
                    if (segmentRange.HasValue)
                    {
                        query = query.Where(c => 
                            c.LastOrderDate >= segmentRange.Value.minDate && 
                            c.LastOrderDate <= segmentRange.Value.maxDate);
                    }
                }
                else
                {
                    // 全セグメントの場合、休眠判定のみ（購入履歴のある顧客は必ずLastOrderDateが存在）
                    query = query.Where(c => c.LastOrderDate.HasValue && c.LastOrderDate < cutoffDate);
                }

                // 購入金額フィルタ
                if (request.MinTotalSpent.HasValue)
                {
                    query = query.Where(c => c.TotalSpent >= request.MinTotalSpent.Value);
                }
                if (request.MaxTotalSpent.HasValue)
                {
                    query = query.Where(c => c.TotalSpent <= request.MaxTotalSpent.Value);
                }

                // リスクレベルフィルタ
                if (!string.IsNullOrEmpty(request.RiskLevel))
                {
                    // リスクレベルは後で計算するため、ここでは日数で絞り込み
                    var riskDays = request.RiskLevel switch
                    {
                        "critical" => 365,
                        "high" => 180,
                        "medium" => 90,
                        _ => 0
                    };
                    if (riskDays > 0)
                    {
                        var riskCutoffDate = DateTime.UtcNow.AddDays(-riskDays);
                        query = query.Where(c => c.LastOrderDate < riskCutoffDate);
                    }
                }

                // ソート
                var sortQuery = request.SortBy?.ToLower() switch
                {
                    "dayssincelastpurchase" => request.Descending 
                        ? query.OrderByDescending(c => c.LastOrderDate)
                        : query.OrderBy(c => c.LastOrderDate),
                    "totalspent" => request.Descending 
                        ? query.OrderByDescending(c => c.TotalSpent)
                        : query.OrderBy(c => c.TotalSpent),
                    "totalorders" => request.Descending 
                        ? query.OrderByDescending(c => c.TotalOrders)
                        : query.OrderBy(c => c.TotalOrders),
                    _ => query.OrderByDescending(c => c.LastOrderDate) // デフォルト
                };

                // 総件数を取得（高速化のため別クエリ）
                var totalCount = await query.CountAsync();

                // ページネーション
                var customers = await sortQuery
                    .Skip((request.PageNumber - 1) * request.PageSize)
                    .Take(request.PageSize)
                    .ToListAsync();

                // DTOに変換（メモリ効率化）
                var dormantCustomers = new List<DormantCustomerDto>();
                foreach (var customer in customers)
                {
                    var daysSinceLastPurchase = customer.LastOrderDate.HasValue 
                        ? (int)(DateTime.UtcNow - customer.LastOrderDate.Value).TotalDays 
                        : 0;

                    // Customerオブジェクトを取得（離脱確率計算用）
                    var customerEntity = await _context.Customers
                        .FirstOrDefaultAsync(c => c.Id == customer.CustomerId);

                    var dormantCustomer = new DormantCustomerDto
                    {
                        CustomerId = customer.CustomerId,
                        Name = customer.CustomerName,
                        Email = customer.CustomerEmail,
                        Phone = customer.CustomerPhone,
                        Company = customer.CustomerCompany,  // 会社名を設定
                        LastPurchaseDate = customer.LastOrderDate,
                        DaysSinceLastPurchase = daysSinceLastPurchase,
                        DormancySegment = CalculateDormancySegment(daysSinceLastPurchase),
                        RiskLevel = CalculateRiskLevel(daysSinceLastPurchase, customer.TotalOrders),
                        ChurnProbability = customerEntity != null 
                            ? CalculateChurnProbabilitySync(customerEntity, daysSinceLastPurchase)
                            : 0.5m, // デフォルト値
                        TotalSpent = customer.TotalSpent,
                        TotalOrders = customer.TotalOrders,
                        AverageOrderValue = customer.TotalOrders > 0 ? customer.TotalSpent / customer.TotalOrders : 0,
                        Tags = ParseTags(customer.Tags),
                        Insight = GenerateReactivationInsight(daysSinceLastPurchase, customer.TotalOrders, 
                            customer.TotalOrders > 0 ? customer.TotalSpent / customer.TotalOrders : 0)
                    };

                    dormantCustomers.Add(dormantCustomer);
                }

                // セグメント分布を取得（並列処理で高速化）
                var segmentDistributions = await GetSegmentDistributionsAsync(request.StoreId);

                var response = new DormantCustomerResponse
                {
                    Customers = dormantCustomers,
                    Summary = new DormantSummaryStats
                    {
                        TotalDormantCustomers = totalCount,
                        // その他の統計は別途計算
                    },
                    SegmentDistributions = segmentDistributions,
                    Pagination = new PaginationInfo
                    {
                        CurrentPage = request.PageNumber,
                        PageSize = request.PageSize,
                        TotalCount = totalCount
                    }
                };

                // キャッシュに保存（15分間）
                _cache.Set(cacheKey, response, TimeSpan.FromMinutes(15));

                _logger.LogInformation("休眠顧客リスト取得完了. 取得件数: {Count}, 総件数: {TotalCount}",
                    dormantCustomers.Count, totalCount);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客リスト取得中にエラーが発生. StoreId: {StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 休眠顧客のサマリー統計を取得
        /// 購入履歴のある顧客のみを対象として正確な休眠率と平均休眠日数を計算
        /// </summary>
        public async Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);
            
            _logger.LogInformation("休眠顧客サマリー統計の計算開始. StoreId: {StoreId}, 休眠判定日: {CutoffDate}", 
                storeId, cutoffDate.ToString("yyyy-MM-dd"));

            // 購入履歴のある顧客の総数を取得
            var totalCustomersWithPurchases = await _context.Customers
                .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                .CountAsync();

            // 全顧客数（参考値）
            var totalAllCustomers = await _context.Customers.CountAsync(c => c.StoreId == storeId);

            // 購入履歴のある休眠顧客のみを対象とする
            var dormantCustomersQuery = from customer in _context.Customers
                                      where customer.StoreId == storeId && customer.TotalOrders > 0
                                      let lastOrder = customer.Orders.OrderByDescending(o => o.CreatedAt).FirstOrDefault()
                                      where lastOrder != null && lastOrder.CreatedAt < cutoffDate
                                      select new { Customer = customer, LastOrder = lastOrder };

            var dormantCustomers = await dormantCustomersQuery.ToListAsync();
            var totalDormantWithPurchases = dormantCustomers.Count;

            _logger.LogInformation("顧客統計: 全顧客数={AllCustomers}, 購入履歴あり={WithPurchases}, 休眠顧客数={DormantCount}", 
                totalAllCustomers, totalCustomersWithPurchases, totalDormantWithPurchases);

            // セグメント別集計（購入履歴のある顧客のみ）
            var segmentCounts = new Dictionary<string, int>();
            var segmentRevenue = new Dictionary<string, decimal>();

            // 購入履歴のない顧客も「未購入」セグメントとして集計
            var neverPurchasedCount = await _context.Customers
                .Where(c => c.StoreId == storeId && c.TotalOrders == 0)
                .CountAsync();

            foreach (var item in dormantCustomers)
            {
                var daysSinceLastPurchase = CalculateDaysSinceLastPurchase(item.LastOrder);
                var segment = CalculateDormancySegment(daysSinceLastPurchase);
                
                segmentCounts[segment] = segmentCounts.GetValueOrDefault(segment, 0) + 1;
                segmentRevenue[segment] = segmentRevenue.GetValueOrDefault(segment, 0) + item.Customer.TotalSpent;
            }

            // 未購入顧客を別セグメントとして追加
            if (neverPurchasedCount > 0)
            {
                segmentCounts["未購入"] = neverPurchasedCount;
                segmentRevenue["未購入"] = 0;
            }

            // 平均休眠日数は購入履歴のある休眠顧客のみで計算
            var averageDormancyDays = dormantCustomers.Count > 0
                ? (int)dormantCustomers.Average(x => CalculateDaysSinceLastPurchase(x.LastOrder))
                : 0;

            // 休眠率は購入履歴のある顧客に対する比率として計算（小数点以下1桁）
            var dormantRate = totalCustomersWithPurchases > 0 
                ? Math.Round((decimal)totalDormantWithPurchases / totalCustomersWithPurchases * 100, 1)
                : 0;

            var estimatedLostRevenue = dormantCustomers.Sum(x => x.Customer.AverageOrderValue * 2); // 簡易計算

            _logger.LogInformation("計算結果: 休眠率={DormantRate:F1}%, 平均休眠日数={AvgDays}日, セグメント数={SegmentCount}", 
                dormantRate, averageDormancyDays, segmentCounts.Count);

            return new DormantSummaryStats
            {
                TotalDormantCustomers = totalDormantWithPurchases, // 購入履歴のある休眠顧客のみ
                DormantRate = dormantRate, // 購入履歴のある顧客に対する休眠率
                AverageDormancyDays = averageDormancyDays, // 購入履歴のある休眠顧客の平均休眠日数
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

        /// <summary>
        /// 詳細な期間別セグメントの件数を取得
        /// </summary>
        public async Task<List<DetailedSegmentDistribution>> GetDetailedSegmentDistributionsAsync(int storeId)
        {
            var cacheKey = $"detailed_segments_{storeId}";
            
            try
            {
                // キャッシュチェック
                if (_cache.TryGetValue(cacheKey, out List<DetailedSegmentDistribution>? cachedResult))
                {
                    _logger.LogInformation("キャッシュから詳細セグメント分布を取得");
                    return cachedResult!;
                }

                var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);

                // 主要3区分のみの簡素化されたセグメント定義
                var segmentDefinitions = new[]
                {
                    new { Label = "90-180日", Range = "90-180日", MinDays = 90, MaxDays = 179 },
                    new { Label = "180-365日", Range = "180-365日", MinDays = 180, MaxDays = 364 },
                    new { Label = "365日以上", Range = "365日以上", MinDays = 365, MaxDays = int.MaxValue }
                };

                var results = new List<DetailedSegmentDistribution>();

                foreach (var segment in segmentDefinitions)
                {
                    // 各セグメントの件数を計算（購入履歴のある顧客のみ）
                    var count = await _context.Customers
                        .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                        .Select(c => new {
                            Customer = c,
                            LastOrderDate = c.Orders.OrderByDescending(o => o.CreatedAt).Select(o => (DateTime?)o.CreatedAt).FirstOrDefault()
                        })
                        .Where(x => x.LastOrderDate.HasValue &&
                            (DateTime.UtcNow - x.LastOrderDate.Value).Days >= segment.MinDays &&
                            (DateTime.UtcNow - x.LastOrderDate.Value).Days <= segment.MaxDays)
                        .CountAsync();

                    // 各セグメントの総購入金額を計算（購入履歴のある顧客のみ）
                    var revenue = await _context.Customers
                        .Where(c => c.StoreId == storeId && c.TotalOrders > 0)
                        .Select(c => new {
                            Customer = c,
                            LastOrderDate = c.Orders.OrderByDescending(o => o.CreatedAt).Select(o => (DateTime?)o.CreatedAt).FirstOrDefault()
                        })
                        .Where(x => x.LastOrderDate.HasValue &&
                            (DateTime.UtcNow - x.LastOrderDate.Value).Days >= segment.MinDays &&
                            (DateTime.UtcNow - x.LastOrderDate.Value).Days <= segment.MaxDays)
                        .SumAsync(x => x.Customer.TotalSpent);

                    results.Add(new DetailedSegmentDistribution
                    {
                        Label = segment.Label,
                        Range = segment.Range,
                        Count = count,
                        Revenue = revenue,
                        MinDays = segment.MinDays,
                        MaxDays = segment.MaxDays
                    });
                }

                // キャッシュに保存（10分間）
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));
                _cache.Set(cacheKey, results, cacheOptions);

                _logger.LogInformation("詳細セグメント分布を取得完了. StoreId: {StoreId}, セグメント数: {SegmentCount}", 
                    storeId, results.Count);
                
                // 各セグメントの詳細ログ
                foreach (var result in results)
                {
                    _logger.LogInformation("詳細セグメント: {Label} = {Count}件, 売上: {Revenue:C}", 
                        result.Label, result.Count, result.Revenue);
                }

                return results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "詳細セグメント分布の取得に失敗. StoreId: {StoreId}", storeId);
                throw;
            }
        }

        #region Private Helper Methods

        /// <summary>
        /// 顧客データをDTOにマッピング
        /// </summary>
        private async Task<DormantCustomerDto> MapToDormantCustomerDtoAsync(Customer customer, Order? lastOrder)
        {
            var daysSinceLastPurchase = CalculateDaysSinceLastPurchase(lastOrder);
            var dormancySegment = CalculateDormancySegment(daysSinceLastPurchase);
            var riskLevel = CalculateRiskLevel(daysSinceLastPurchase, customer.TotalOrders);
            var churnProbability = CalculateChurnProbabilitySync(customer, daysSinceLastPurchase); // 同期計算に変更

            return new DormantCustomerDto
            {
                CustomerId = customer.Id,
                Name = customer.DisplayName,
                Email = customer.Email,
                Phone = customer.Phone,
                Company = customer.Company,  // 会社名を設定
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
        /// 購入履歴のない顧客は除外されるため、通常はnullにならない
        /// </summary>
        private int CalculateDaysSinceLastPurchase(Order? lastOrder)
        {
            if (lastOrder == null) 
            {
                _logger.LogWarning("購入履歴のない顧客が休眠顧客として検出されました。データ整合性を確認してください。");
                return 365; // フォールバック値として1年とする
            }
            return (int)(DateTime.UtcNow - lastOrder.CreatedAt).TotalDays;
        }

        /// <summary>
        /// 休眠セグメントを計算
        /// </summary>
        private string CalculateDormancySegment(int daysSinceLastPurchase)
        {
            return daysSinceLastPurchase switch
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

            // 購入履歴のある休眠顧客の基本クエリ
            var dormantCustomersQuery = from customer in _context.Customers
                                      where customer.StoreId == storeId && customer.TotalOrders > 0
                                      let lastOrder = customer.Orders.OrderByDescending(o => o.CreatedAt).FirstOrDefault()
                                      where lastOrder != null && lastOrder.CreatedAt < cutoffDate
                                      select new { Customer = customer, LastOrder = lastOrder };

            // 全件取得してセグメント分布を計算
            var dormantCustomers = await dormantCustomersQuery.ToListAsync();
            var totalCount = dormantCustomers.Count;

            _logger.LogInformation("休眠顧客セグメント分布計算開始（購入履歴あり）. 総件数: {TotalCount}", totalCount);

            var segmentGroups = dormantCustomers
                .GroupBy(x => {
                    var daysSinceLastPurchase = CalculateDaysSinceLastPurchase(x.LastOrder);
                    return CalculateDormancySegment(daysSinceLastPurchase);
                })
                .Select(g => new SegmentDistribution
                {
                    Segment = g.Key,
                    Count = g.Count(),
                    Percentage = totalCount > 0 ? Math.Round((decimal)g.Count() / totalCount * 100, 1) : 0,
                    Revenue = g.Sum(x => x.Customer.TotalSpent)
                })
                .OrderBy(s => s.Segment)
                .ToList();

            // ログ出力で各セグメントの件数を確認
            foreach (var segment in segmentGroups)
            {
                _logger.LogInformation("セグメント分布（購入履歴あり）: {Segment} = {Count}件 ({Percentage:F1}%)", 
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