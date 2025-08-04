using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.Dormant;

namespace ShopifyAnalyticsApi.Services.Dormant
{
    /// <summary>
    /// チャーン分析サービスの実装
    /// 責任範囲: 顧客の離反確率計算とリスク分析
    /// </summary>
    public class ChurnAnalysisService : IChurnAnalysisService
    {
        private readonly ShopifyDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ChurnAnalysisService> _logger;
        private readonly IConfiguration _configuration;

        // キャッシュキー
        private const string CHURN_PROBABILITY_CACHE_KEY = "churn_probability_{0}";
        private const string RISK_LEVEL_CACHE_KEY = "risk_level_{0}";
        private const string BATCH_CHURN_CACHE_KEY = "batch_churn_{0}";

        // 設定値
        private readonly int _cacheExpirationMinutes;
        private readonly int _dormancyThresholdDays;
        private readonly decimal _highRiskThreshold;
        private readonly decimal _mediumRiskThreshold;
        private readonly decimal _criticalRiskThreshold;

        public ChurnAnalysisService(
            ShopifyDbContext context,
            IMemoryCache cache,
            ILogger<ChurnAnalysisService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
            _configuration = configuration;

            _cacheExpirationMinutes = _configuration.GetValue<int>("ChurnAnalysis:CacheExpirationMinutes", 60);
            _dormancyThresholdDays = _configuration.GetValue<int>("DormancyThresholdDays", 90);
            _highRiskThreshold = _configuration.GetValue<decimal>("ChurnAnalysis:HighRiskThreshold", 0.7m);
            _mediumRiskThreshold = _configuration.GetValue<decimal>("ChurnAnalysis:MediumRiskThreshold", 0.4m);
            _criticalRiskThreshold = _configuration.GetValue<decimal>("ChurnAnalysis:CriticalRiskThreshold", 0.9m);
        }

        /// <summary>
        /// 指定された顧客のチャーン確率を計算
        /// </summary>
        public async Task<decimal> CalculateChurnProbabilityAsync(int customerId)
        {
            try
            {
                var cacheKey = string.Format(CHURN_PROBABILITY_CACHE_KEY, customerId);
                
                if (_cache.TryGetValue(cacheKey, out decimal cachedProbability))
                {
                    _logger.LogDebug("チャーン確率をキャッシュから取得: CustomerId={CustomerId}, Probability={Probability}", 
                        customerId, cachedProbability);
                    return cachedProbability;
                }

                var customer = await _context.Customers
                    .Include(c => c.Orders)
                    .FirstOrDefaultAsync(c => c.Id == customerId);

                if (customer == null)
                {
                    _logger.LogWarning("顧客が見つかりません: CustomerId={CustomerId}", customerId);
                    return 0.0m;
                }

                var probability = await CalculateChurnProbabilityInternal(customer);

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, probability, cacheOptions);

                _logger.LogDebug("チャーン確率を計算: CustomerId={CustomerId}, Probability={Probability}", 
                    customerId, probability);

                return probability;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "チャーン確率計算中にエラーが発生: CustomerId={CustomerId}", customerId);
                throw;
            }
        }

        /// <summary>
        /// 複数顧客のチャーン確率を一括計算
        /// </summary>
        public async Task<Dictionary<int, decimal>> CalculateBatchChurnProbabilityAsync(List<int> customerIds)
        {
            try
            {
                var cacheKey = string.Format(BATCH_CHURN_CACHE_KEY, string.Join(",", customerIds.OrderBy(x => x)));
                
                if (_cache.TryGetValue(cacheKey, out Dictionary<int, decimal>? cachedResults) && cachedResults != null)
                {
                    _logger.LogDebug("一括チャーン確率をキャッシュから取得: Count={Count}", cachedResults.Count);
                    return cachedResults;
                }

                var customers = await _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => customerIds.Contains(c.Id))
                    .ToListAsync();

                var results = new Dictionary<int, decimal>();

                foreach (var customer in customers)
                {
                    var probability = await CalculateChurnProbabilityInternal(customer);
                    results[customer.Id] = probability;
                }

                // 見つからなかった顧客IDは0.0として追加
                foreach (var id in customerIds.Where(id => !results.ContainsKey(id)))
                {
                    results[id] = 0.0m;
                }

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, results, cacheOptions);

                _logger.LogDebug("一括チャーン確率を計算: Count={Count}", results.Count);

                return results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "一括チャーン確率計算中にエラーが発生: CustomerIds={CustomerIds}", 
                    string.Join(",", customerIds));
                throw;
            }
        }

        /// <summary>
        /// チャーンリスクセグメント分析を実行
        /// </summary>
        public async Task<List<ChurnRiskSegment>> AnalyzeChurnRiskSegmentsAsync(ChurnAnalysisRequest request)
        {
            try
            {
                var query = _context.Customers
                    .Include(c => c.Orders)
                    .Where(c => c.StoreId == request.StoreId);

                if (request.AnalysisStartDate.HasValue && request.AnalysisEndDate.HasValue)
                {
                    query = query.Where(c => c.CreatedAt >= request.AnalysisStartDate.Value && 
                                           c.CreatedAt <= request.AnalysisEndDate.Value);
                }

                var customers = await query.ToListAsync();

                var segments = new List<ChurnRiskSegment>();

                // 休眠期間別セグメント分析
                await AddDormancySegments(segments, customers);

                // 購入頻度別セグメント分析
                await AddPurchaseFrequencySegments(segments, customers);

                // 総購入金額別セグメント分析
                await AddSpendingSegments(segments, customers);

                _logger.LogInformation("チャーンリスクセグメント分析完了: StoreId={StoreId}, SegmentCount={Count}", 
                    request.StoreId, segments.Count);

                return segments.OrderByDescending(s => s.PotentialLoss).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "チャーンリスクセグメント分析中にエラーが発生: StoreId={StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 顧客のリスクレベルを判定
        /// </summary>
        public async Task<CustomerRiskLevel> DetermineRiskLevelAsync(int customerId)
        {
            try
            {
                var cacheKey = string.Format(RISK_LEVEL_CACHE_KEY, customerId);
                
                if (_cache.TryGetValue(cacheKey, out CustomerRiskLevel cachedLevel))
                {
                    _logger.LogDebug("リスクレベルをキャッシュから取得: CustomerId={CustomerId}, Level={Level}", 
                        customerId, cachedLevel);
                    return cachedLevel;
                }

                var probability = await CalculateChurnProbabilityAsync(customerId);
                var riskLevel = DetermineRiskLevelFromProbability(probability);

                // キャッシュに保存
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_cacheExpirationMinutes),
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheExpirationMinutes / 2)
                };
                _cache.Set(cacheKey, riskLevel, cacheOptions);

                _logger.LogDebug("リスクレベルを判定: CustomerId={CustomerId}, Level={Level}, Probability={Probability}", 
                    customerId, riskLevel, probability);

                return riskLevel;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "リスクレベル判定中にエラーが発生: CustomerId={CustomerId}", customerId);
                throw;
            }
        }

        #region Private Methods

        /// <summary>
        /// チャーン確率の内部計算ロジック
        /// </summary>
        private async Task<decimal> CalculateChurnProbabilityInternal(Customer customer)
        {
            if (customer.Orders == null || !customer.Orders.Any())
            {
                return 0.9m; // 購入履歴なしは高リスク
            }

            var lastOrder = customer.Orders.OrderByDescending(o => o.CreatedAt).First();
            var daysSinceLastPurchase = (DateTime.UtcNow - lastOrder.CreatedAt).Days;

            // 基本的な休眠期間ベースの計算
            var baseProbability = CalculateBaseProbabilityFromDormancy(daysSinceLastPurchase);

            // 購入頻度による調整
            var frequencyAdjustment = CalculateFrequencyAdjustment(customer);

            // 購入金額による調整
            var spendingAdjustment = CalculateSpendingAdjustment(customer);

            // 最終確率計算（重み付き平均）
            var finalProbability = (baseProbability * 0.5m) + 
                                 (frequencyAdjustment * 0.3m) + 
                                 (spendingAdjustment * 0.2m);

            return Math.Min(Math.Max(finalProbability, 0.0m), 1.0m);
        }

        /// <summary>
        /// 休眠期間ベースの基本確率計算
        /// </summary>
        private decimal CalculateBaseProbabilityFromDormancy(int daysSinceLastPurchase)
        {
            return daysSinceLastPurchase switch
            {
                <= 30 => 0.05m,
                <= 60 => 0.15m,
                <= 90 => 0.25m,
                <= 120 => 0.40m,
                <= 180 => 0.60m,
                <= 365 => 0.80m,
                _ => 0.95m
            };
        }

        /// <summary>
        /// 購入頻度による調整
        /// </summary>
        private decimal CalculateFrequencyAdjustment(Customer customer)
        {
            if (customer.Orders == null || !customer.Orders.Any())
                return 0.9m;

            var orderCount = customer.Orders.Count;
            var customerAge = (DateTime.UtcNow - customer.CreatedAt).Days;
            var ordersPerMonth = customerAge > 0 ? (orderCount * 30.0m) / customerAge : 0;

            return ordersPerMonth switch
            {
                >= 2.0m => 0.1m,
                >= 1.0m => 0.2m,
                >= 0.5m => 0.4m,
                >= 0.25m => 0.6m,
                _ => 0.8m
            };
        }

        /// <summary>
        /// 購入金額による調整
        /// </summary>
        private decimal CalculateSpendingAdjustment(Customer customer)
        {
            var totalSpent = customer.TotalSpent;

            return totalSpent switch
            {
                >= 100000 => 0.1m,
                >= 50000 => 0.2m,
                >= 20000 => 0.3m,
                >= 10000 => 0.5m,
                _ => 0.7m
            };
        }

        /// <summary>
        /// 確率からリスクレベルを判定
        /// </summary>
        private CustomerRiskLevel DetermineRiskLevelFromProbability(decimal probability)
        {
            if (probability >= _criticalRiskThreshold)
                return CustomerRiskLevel.Critical;
            if (probability >= _highRiskThreshold)
                return CustomerRiskLevel.High;
            if (probability >= _mediumRiskThreshold)
                return CustomerRiskLevel.Medium;
            return CustomerRiskLevel.Low;
        }

        /// <summary>
        /// 休眠期間別セグメント追加
        /// </summary>
        private async Task AddDormancySegments(List<ChurnRiskSegment> segments, List<Customer> customers)
        {
            var dormancySegments = new[]
            {
                ("0-30日", 0, 30),
                ("31-60日", 31, 60),
                ("61-90日", 61, 90),
                ("91-180日", 91, 180),
                ("181-365日", 181, 365),
                ("365日以上", 366, int.MaxValue)
            };

            foreach (var (name, minDays, maxDays) in dormancySegments)
            {
                var segmentCustomers = GetCustomersInDormancyRange(customers, minDays, maxDays);
                
                if (segmentCustomers.Any())
                {
                    var segment = await CreateSegment(name, segmentCustomers);
                    segments.Add(segment);
                }
            }
        }

        /// <summary>
        /// 購入頻度別セグメント追加
        /// </summary>
        private async Task AddPurchaseFrequencySegments(List<ChurnRiskSegment> segments, List<Customer> customers)
        {
            var lowFrequency = customers.Where(c => c.TotalOrders <= 2).ToList();
            var mediumFrequency = customers.Where(c => c.TotalOrders is > 2 and <= 5).ToList();
            var highFrequency = customers.Where(c => c.TotalOrders > 5).ToList();

            if (lowFrequency.Any())
                segments.Add(await CreateSegment("低頻度購入者", lowFrequency));

            if (mediumFrequency.Any())
                segments.Add(await CreateSegment("中頻度購入者", mediumFrequency));

            if (highFrequency.Any())
                segments.Add(await CreateSegment("高頻度購入者", highFrequency));
        }

        /// <summary>
        /// 購入金額別セグメント追加
        /// </summary>
        private async Task AddSpendingSegments(List<ChurnRiskSegment> segments, List<Customer> customers)
        {
            var lowSpenders = customers.Where(c => c.TotalSpent < 20000).ToList();
            var mediumSpenders = customers.Where(c => c.TotalSpent is >= 20000 and < 50000).ToList();
            var highSpenders = customers.Where(c => c.TotalSpent >= 50000).ToList();

            if (lowSpenders.Any())
                segments.Add(await CreateSegment("低額購入者", lowSpenders));

            if (mediumSpenders.Any())
                segments.Add(await CreateSegment("中額購入者", mediumSpenders));

            if (highSpenders.Any())
                segments.Add(await CreateSegment("高額購入者", highSpenders));
        }

        /// <summary>
        /// 休眠期間範囲内の顧客を取得
        /// </summary>
        private List<Customer> GetCustomersInDormancyRange(List<Customer> customers, int minDays, int maxDays)
        {
            return customers.Where(c =>
            {
                if (c.Orders == null || !c.Orders.Any()) return false;
                
                var lastOrder = c.Orders.OrderByDescending(o => o.CreatedAt).First();
                var daysSince = (DateTime.UtcNow - lastOrder.CreatedAt).Days;
                
                return daysSince >= minDays && (maxDays == int.MaxValue || daysSince <= maxDays);
            }).ToList();
        }

        /// <summary>
        /// セグメント作成
        /// </summary>
        private async Task<ChurnRiskSegment> CreateSegment(string segmentName, List<Customer> customers)
        {
            var customerIds = customers.Select(c => c.Id).ToList();
            var churnProbabilities = await CalculateBatchChurnProbabilityAsync(customerIds);
            
            var averageProbability = churnProbabilities.Values.Average();
            var totalRevenue = customers.Sum(c => c.TotalSpent);
            var potentialLoss = totalRevenue * averageProbability;

            var riskLevel = DetermineRiskLevelFromProbability(averageProbability);

            return new ChurnRiskSegment
            {
                SegmentName = segmentName,
                RiskLevel = riskLevel,
                CustomerCount = customers.Count,
                AverageChurnProbability = averageProbability,
                TotalRevenue = totalRevenue,
                PotentialLoss = potentialLoss,
                TopRiskFactors = GetTopRiskFactors(customers)
            };
        }

        /// <summary>
        /// トップリスクファクター取得
        /// </summary>
        private List<ChurnRiskFactor> GetTopRiskFactors(List<Customer> customers)
        {
            var factors = new List<ChurnRiskFactor>();

            // 休眠期間の長さ
            var avgDormancy = customers.Where(c => c.Orders?.Any() == true)
                .Select(c => (DateTime.UtcNow - c.Orders!.Max(o => o.CreatedAt)).Days)
                .DefaultIfEmpty(0)
                .Average();

            if (avgDormancy > _dormancyThresholdDays)
            {
                factors.Add(new ChurnRiskFactor
                {
                    FactorName = "長期休眠",
                    ImpactScore = Math.Min((decimal)(avgDormancy / _dormancyThresholdDays) * 0.3m, 1.0m),
                    Description = $"平均休眠期間: {avgDormancy:F0}日"
                });
            }

            // 低購入頻度
            var avgOrderCount = customers.Average(c => c.TotalOrders);
            if (avgOrderCount < 3)
            {
                factors.Add(new ChurnRiskFactor
                {
                    FactorName = "低購入頻度",
                    ImpactScore = (decimal)(3 - avgOrderCount) / 3 * 0.4m,
                    Description = $"平均注文数: {avgOrderCount:F1}回"
                });
            }

            // 低購入金額
            var avgSpending = customers.Average(c => c.TotalSpent);
            if (avgSpending < 30000)
            {
                factors.Add(new ChurnRiskFactor
                {
                    FactorName = "低購入金額",
                    ImpactScore = (30000 - avgSpending) / 30000 * 0.3m,
                    Description = $"平均購入金額: ¥{avgSpending:N0}"
                });
            }

            return factors.OrderByDescending(f => f.ImpactScore).Take(3).ToList();
        }

        #endregion
    }
}