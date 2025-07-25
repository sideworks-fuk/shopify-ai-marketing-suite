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

            // パフォーマンス改善: ページサイズの制限（最大20件に削減）
            request.PageSize = Math.Min(request.PageSize, 20);
            if (request.PageSize <= 0)
            {
                request.PageSize = 20; // デフォルトに設定
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

                // 最適化: 必要な情報のみを射影（Include削除）
                var query = from customer in _context.Customers
                           where customer.StoreId == request.StoreId
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
                    // 全セグメントの場合、休眠判定のみ
                    query = query.Where(c => c.LastOrderDate < cutoffDate || c.LastOrderDate == null);
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
        /// </summary>
        public async Task<DormantSummaryStats> GetDormantSummaryStatsAsync(int storeId)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-DormancyThresholdDays);
            
            // 購入経験のある顧客数を取得（分母として使用）
            var customersWithPurchases = await _context.Customers
                .Where(c => c.StoreId == storeId && c.Orders.Any())
                .CountAsync();

            // 休眠顧客クエリ（購入経験があり、90日以上購入がない顧客のみ）
            var dormantCustomersQuery = from customer in _context.Customers
                                      where customer.StoreId == storeId
                                      let lastOrder = customer.Orders.OrderByDescending(o => o.CreatedAt).FirstOrDefault()
                                      where lastOrder != null && lastOrder.CreatedAt < cutoffDate
                                      select new { Customer = customer, LastOrder = lastOrder };

            var dormantCustomers = await dormantCustomersQuery.ToListAsync();
            var totalDormant = dormantCustomers.Count;

            // セグメント別集計
            var segmentCounts = new Dictionary<string, int>();
            var segmentRevenue = new Dictionary<string, decimal>();

            foreach (var item in dormantCustomers)
            {
                var daysSinceLastPurchase = CalculateDaysSinceLastPurchase(item.LastOrder);
                var segment = CalculateDormancySegment(daysSinceLastPurchase);
                
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
                DormantRate = customersWithPurchases > 0 ? (decimal)totalDormant / customersWithPurchases * 100 : 0,
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

                // 詳細な期間別セグメント定義
                var segmentDefinitions = new[]
                {
                    new { Label = "1ヶ月", Range = "30-59日", MinDays = 30, MaxDays = 59 },
                    new { Label = "2ヶ月", Range = "60-89日", MinDays = 60, MaxDays = 89 },
                    new { Label = "3ヶ月", Range = "90-119日", MinDays = 90, MaxDays = 119 },
                    new { Label = "4ヶ月", Range = "120-149日", MinDays = 120, MaxDays = 149 },
                    new { Label = "5ヶ月", Range = "150-179日", MinDays = 150, MaxDays = 179 },
                    new { Label = "6ヶ月", Range = "180-209日", MinDays = 180, MaxDays = 209 },
                    new { Label = "7ヶ月", Range = "210-239日", MinDays = 210, MaxDays = 239 },
                    new { Label = "8ヶ月", Range = "240-269日", MinDays = 240, MaxDays = 269 },
                    new { Label = "9ヶ月", Range = "270-299日", MinDays = 270, MaxDays = 299 },
                    new { Label = "10ヶ月", Range = "300-329日", MinDays = 300, MaxDays = 329 },
                    new { Label = "11ヶ月", Range = "330-359日", MinDays = 330, MaxDays = 359 },
                    new { Label = "12ヶ月", Range = "360-389日", MinDays = 360, MaxDays = 389 },
                    new { Label = "15ヶ月", Range = "450-479日", MinDays = 450, MaxDays = 479 },
                    new { Label = "18ヶ月", Range = "540-569日", MinDays = 540, MaxDays = 569 },
                    new { Label = "21ヶ月", Range = "630-659日", MinDays = 630, MaxDays = 659 },
                    new { Label = "24ヶ月+", Range = "720日以上", MinDays = 720, MaxDays = int.MaxValue }
                };

                var results = new List<DetailedSegmentDistribution>();

                // パフォーマンス最適化: 全顧客データを一度に取得してメモリで処理
                _logger.LogInformation("休眠顧客データを一括取得開始. StoreId: {StoreId}", storeId);
                
                var allCustomersData = await _context.Customers
                    .Where(c => c.StoreId == storeId)
                    .Select(c => new {
                        Customer = c,
                        LastOrderDate = c.Orders.OrderByDescending(o => o.CreatedAt).Select(o => (DateTime?)o.CreatedAt).FirstOrDefault()
                    })
                    .ToListAsync();

                _logger.LogInformation("顧客データ取得完了. 件数: {Count}", allCustomersData.Count);

                // メモリ内でセグメント分類
                foreach (var segment in segmentDefinitions)
                {
                    var segmentCustomers = allCustomersData.Where(x => 
                        x.LastOrderDate.HasValue &&
                        (DateTime.UtcNow - x.LastOrderDate.Value).Days >= segment.MinDays &&
                        (segment.MaxDays == int.MaxValue || (DateTime.UtcNow - x.LastOrderDate.Value).Days <= segment.MaxDays)
                    ).ToList();

                    var count = segmentCustomers.Count;
                    var revenue = segmentCustomers.Sum(x => x.Customer.TotalSpent);

                    results.Add(new DetailedSegmentDistribution
                    {
                        Label = segment.Label,
                        Range = segment.Range,
                        Count = count,
                        Revenue = revenue,
                        MinDays = segment.MinDays,
                        MaxDays = segment.MaxDays
                    });

                    _logger.LogInformation("セグメント計算完了: {Label} = {Count}件, 売上: {Revenue:C}", 
                        segment.Label, count, revenue);
                }

                // キャッシュに保存（10分間）
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));
                _cache.Set(cacheKey, results, cacheOptions);

                _logger.LogInformation("詳細セグメント分布を取得完了. StoreId: {StoreId}, セグメント数: {SegmentCount}", 
                    storeId, results.Count);

                return results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "詳細セグメント分布の取得に失敗. StoreId: {StoreId}, エラー詳細: {Message}", 
                    storeId, ex.Message);
                
                // より詳細なエラー情報をログに出力
                _logger.LogError("エラータイプ: {ExceptionType}, スタックトレース: {StackTrace}", 
                    ex.GetType().Name, ex.StackTrace);
                
                if (ex.InnerException != null)
                {
                    _logger.LogError("内部例外: {InnerMessage}", ex.InnerException.Message);
                }
                
                throw new Exception($"詳細セグメント分布の取得に失敗しました: {ex.Message}", ex);
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
        /// </summary>
        private int CalculateDaysSinceLastPurchase(Order? lastOrder)
        {
            if (lastOrder == null) return 9999; // 購入履歴なし
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
                .GroupBy(x => {
                    var daysSinceLastPurchase = CalculateDaysSinceLastPurchase(x.LastOrder);
                    return CalculateDormancySegment(daysSinceLastPurchase);
                })
                .Select(g => new SegmentDistribution
                {
                    Segment = g.Key,
                    Count = g.Count(),
                    Percentage = totalCount > 0 ? (decimal)g.Count() / totalCount * 100 : 0,
                    Revenue = g.Sum(x => x.Customer.TotalSpent)
                })
                .OrderBy(s => GetSegmentSortOrder(s.Segment))
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

        /// <summary>
        /// セグメントのソート順序を決定
        /// </summary>
        private int GetSegmentSortOrder(string segment)
        {
            return segment switch
            {
                "アクティブ" => 0,
                "90-180日" => 1,
                "180-365日" => 2,
                "365日以上" => 3,
                _ => 99
            };
        }

        #endregion
    }
} 