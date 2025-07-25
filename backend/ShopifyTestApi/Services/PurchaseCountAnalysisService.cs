using Microsoft.EntityFrameworkCore;
using ShopifyTestApi.Data;
using ShopifyTestApi.Models;

namespace ShopifyTestApi.Services
{
    /// <summary>
    /// 購入回数分析サービス実装
    /// </summary>
    public class PurchaseCountAnalysisService : IPurchaseCountAnalysisService
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<PurchaseCountAnalysisService> _logger;

        public PurchaseCountAnalysisService(
            ShopifyDbContext context,
            ILogger<PurchaseCountAnalysisService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<PurchaseCountAnalysisResponse> GetPurchaseCountAnalysisAsync(PurchaseCountAnalysisRequest request)
        {
            try
            {
                _logger.LogInformation("購入回数分析開始 - StoreId: {StoreId}, Period: {StartDate} - {EndDate}",
                    request.StoreId, request.StartDate, request.EndDate);

                var response = new PurchaseCountAnalysisResponse();

                // サマリーデータ取得
                response.Summary = await GetPurchaseCountSummaryAsync(request.StoreId, 
                    (int)(request.EndDate - request.StartDate).TotalDays);

                // 詳細データ取得
                response.Details = await GetPurchaseCountDetailsAsync(request);

                // トレンドデータ取得
                response.Trends = await GetPurchaseCountTrendsAsync(request.StoreId, 12);

                // セグメント分析データ取得
                if (request.Segment == "all" || string.IsNullOrEmpty(request.Segment))
                {
                    response.SegmentAnalysis = await GetAllSegmentAnalysisAsync(request.StoreId);
                }
                else
                {
                    var segmentData = await GetSegmentAnalysisAsync(request.StoreId, request.Segment);
                    response.SegmentAnalysis = new List<SegmentAnalysisData> { segmentData };
                }

                // インサイト生成
                response.Insights = GenerateInsights(response);

                _logger.LogInformation("購入回数分析完了 - DetailCount: {DetailCount}, TrendCount: {TrendCount}",
                    response.Details.Count, response.Trends.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数分析エラー - StoreId: {StoreId}", request.StoreId);
                throw;
            }
        }

        public async Task<PurchaseCountSummary> GetPurchaseCountSummaryAsync(int storeId, int days = 365)
        {
            var endDate = DateTime.UtcNow.Date;
            var startDate = endDate.AddDays(-days);

            // 顧客の購入回数を集計
            var customerPurchaseCounts = await _context.Orders
                .Where(o => o.StoreId == storeId && 
                           o.CreatedAt >= startDate && 
                           o.CreatedAt <= endDate)
                .GroupBy(o => o.CustomerId)
                .Select(g => new { CustomerId = g.Key, PurchaseCount = g.Count() })
                .ToListAsync();

            var totalCustomers = customerPurchaseCounts.Count;
            var totalOrders = customerPurchaseCounts.Sum(c => c.PurchaseCount);
            var totalRevenue = await _context.Orders
                .Where(o => o.StoreId == storeId && 
                           o.CreatedAt >= startDate && 
                           o.CreatedAt <= endDate)
                .SumAsync(o => o.TotalPrice);

            var averagePurchaseCount = totalCustomers > 0 ? 
                (decimal)totalOrders / totalCustomers : 0;

            var repeatCustomers = customerPurchaseCounts.Count(c => c.PurchaseCount >= 2);
            var multiPurchaseCustomers = customerPurchaseCounts.Count(c => c.PurchaseCount >= 3);

            var repeatCustomerRate = totalCustomers > 0 ? 
                (decimal)repeatCustomers / totalCustomers * 100 : 0;
            var multiPurchaseRate = totalCustomers > 0 ? 
                (decimal)multiPurchaseCustomers / totalCustomers * 100 : 0;

            // 前年同期比較データ取得
            var previousStartDate = startDate.AddYears(-1);
            var previousEndDate = endDate.AddYears(-1);
            var comparison = await GetComparisonMetricsAsync(storeId, previousStartDate, previousEndDate);

            return new PurchaseCountSummary
            {
                TotalCustomers = totalCustomers,
                TotalOrders = totalOrders,
                TotalRevenue = totalRevenue,
                AveragePurchaseCount = Math.Round(averagePurchaseCount, 2),
                RepeatCustomerRate = Math.Round(repeatCustomerRate, 1),
                MultiPurchaseRate = Math.Round(multiPurchaseRate, 1),
                PeriodLabel = $"{startDate:yyyy/MM/dd} - {endDate:yyyy/MM/dd}",
                Comparison = comparison
            };
        }

        public async Task<List<PurchaseCountTrend>> GetPurchaseCountTrendsAsync(int storeId, int months = 12)
        {
            var trends = new List<PurchaseCountTrend>();
            var endDate = DateTime.UtcNow.Date;

            for (int i = months - 1; i >= 0; i--)
            {
                var periodStart = endDate.AddMonths(-i).AddDays(1 - endDate.AddMonths(-i).Day);
                var periodEnd = periodStart.AddMonths(1).AddDays(-1);

                var customerPurchaseCounts = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               o.CreatedAt >= periodStart && 
                               o.CreatedAt <= periodEnd)
                    .GroupBy(o => o.CustomerId)
                    .Select(g => new { CustomerId = g.Key, PurchaseCount = g.Count() })
                    .ToListAsync();

                var totalCustomers = customerPurchaseCounts.Count;
                var totalOrders = customerPurchaseCounts.Sum(c => c.PurchaseCount);
                var averagePurchaseCount = totalCustomers > 0 ? 
                    (decimal)totalOrders / totalCustomers : 0;
                var repeatRate = totalCustomers > 0 ? 
                    (decimal)customerPurchaseCounts.Count(c => c.PurchaseCount >= 2) / totalCustomers * 100 : 0;

                // 購入回数分布計算
                var distribution = new List<PurchaseCountDistribution>();
                for (int count = 1; count <= 20; count++)
                {
                    var customersWithCount = customerPurchaseCounts.Count(c => c.PurchaseCount == count);
                    var percentage = totalCustomers > 0 ? 
                        (decimal)customersWithCount / totalCustomers * 100 : 0;

                    distribution.Add(new PurchaseCountDistribution
                    {
                        PurchaseCount = count,
                        CustomerCount = customersWithCount,
                        Percentage = Math.Round(percentage, 1)
                    });
                }

                // 20回以上をまとめる
                var customers20Plus = customerPurchaseCounts.Count(c => c.PurchaseCount > 20);
                var percentage20Plus = totalCustomers > 0 ? 
                    (decimal)customers20Plus / totalCustomers * 100 : 0;

                distribution.Add(new PurchaseCountDistribution
                {
                    PurchaseCount = 21, // 21以上を表す
                    CustomerCount = customers20Plus,
                    Percentage = Math.Round(percentage20Plus, 1)
                });

                trends.Add(new PurchaseCountTrend
                {
                    Period = periodStart.ToString("yyyy-MM"),
                    PeriodLabel = periodStart.ToString("yyyy年M月"),
                    TotalCustomers = totalCustomers,
                    AveragePurchaseCount = Math.Round(averagePurchaseCount, 2),
                    RepeatRate = Math.Round(repeatRate, 1),
                    Distribution = distribution
                });
            }

            return trends;
        }

        public async Task<SegmentAnalysisData> GetSegmentAnalysisAsync(int storeId, string segment)
        {
            // セグメント条件の定義
            var (segmentName, customerIds) = await GetSegmentCustomerIdsAsync(storeId, segment);

            var request = new PurchaseCountAnalysisRequest
            {
                StoreId = storeId,
                Segment = segment
            };

            // セグメント内での購入回数詳細取得
            var details = await GetPurchaseCountDetailsForSegmentAsync(request, customerIds);

            // セグメントサマリー計算
            var summary = CalculateSegmentSummary(details);

            return new SegmentAnalysisData
            {
                Segment = segment,
                SegmentName = segmentName,
                Details = details,
                Summary = summary
            };
        }

        private async Task<List<PurchaseCountDetail>> GetPurchaseCountDetailsAsync(PurchaseCountAnalysisRequest request)
        {
            var details = new List<PurchaseCountDetail>();

            // 現在期間の顧客購入回数を集計
            var customerPurchaseCounts = await _context.Orders
                .Where(o => o.StoreId == request.StoreId && 
                           o.CreatedAt >= request.StartDate && 
                           o.CreatedAt <= request.EndDate)
                .GroupBy(o => o.CustomerId)
                .Select(g => new CustomerPurchaseData
                { 
                    CustomerId = g.Key, 
                    PurchaseCount = g.Count(),
                    TotalAmount = g.Sum(order => order.TotalPrice),
                    OrderCount = g.Count()
                })
                .ToListAsync();

            // 前年同期データ取得（比較用）
            var previousStart = request.StartDate.AddYears(-1);
            var previousEnd = request.EndDate.AddYears(-1);
            
            var previousCustomerPurchaseCounts = request.IncludeComparison ? await _context.Orders
                .Where(o => o.StoreId == request.StoreId && 
                           o.CreatedAt >= previousStart && 
                           o.CreatedAt <= previousEnd)
                .GroupBy(o => o.CustomerId)
                .Select(g => new CustomerPurchaseData
                { 
                    CustomerId = g.Key, 
                    PurchaseCount = g.Count(),
                    TotalAmount = g.Sum(order => order.TotalPrice),
                    OrderCount = g.Count()
                })
                .ToListAsync() : new List<CustomerPurchaseData>();

            // 1回から20回、および20回以上の分析
            for (int count = 1; count <= request.MaxPurchaseCount + 1; count++)
            {
                var currentData = count <= request.MaxPurchaseCount ?
                    customerPurchaseCounts.Where(c => c.PurchaseCount == count).ToList() :
                    customerPurchaseCounts.Where(c => c.PurchaseCount > request.MaxPurchaseCount).ToList();

                var previousData = count <= request.MaxPurchaseCount ?
                    previousCustomerPurchaseCounts.Where(c => c.PurchaseCount == count).ToList() :
                    previousCustomerPurchaseCounts.Where(c => c.PurchaseCount > request.MaxPurchaseCount).ToList();

                var currentMetrics = new BasicMetrics
                {
                    CustomerCount = currentData.Count,
                    OrderCount = currentData.Sum(c => c.OrderCount),
                    TotalAmount = currentData.Sum(c => c.TotalAmount),
                    AverageOrderValue = currentData.Count > 0 ? currentData.Sum(c => c.TotalAmount) / currentData.Sum(c => c.OrderCount) : 0,
                    AverageCustomerValue = currentData.Count > 0 ? currentData.Sum(c => c.TotalAmount) / currentData.Count : 0
                };

                BasicMetrics? previousMetrics = null;
                GrowthRateMetrics? growthRate = null;

                if (request.IncludeComparison && previousData.Any())
                {
                    previousMetrics = new BasicMetrics
                    {
                        CustomerCount = previousData.Count,
                        OrderCount = previousData.Sum(c => c.OrderCount),
                        TotalAmount = previousData.Sum(c => c.TotalAmount),
                        AverageOrderValue = previousData.Count > 0 ? previousData.Sum(c => c.TotalAmount) / previousData.Sum(c => c.OrderCount) : 0,
                        AverageCustomerValue = previousData.Count > 0 ? previousData.Sum(c => c.TotalAmount) / previousData.Count : 0
                    };

                    growthRate = CalculateGrowthRate(currentMetrics, previousMetrics);
                }

                // 構成比計算
                var totalCustomers = customerPurchaseCounts.Count;
                var totalOrders = customerPurchaseCounts.Sum(c => c.OrderCount);
                var totalAmount = customerPurchaseCounts.Sum(c => c.TotalAmount);

                var percentage = new PercentageMetrics
                {
                    CustomerPercentage = totalCustomers > 0 ? (decimal)currentMetrics.CustomerCount / totalCustomers * 100 : 0,
                    OrderPercentage = totalOrders > 0 ? (decimal)currentMetrics.OrderCount / totalOrders * 100 : 0,
                    AmountPercentage = totalAmount > 0 ? currentMetrics.TotalAmount / totalAmount * 100 : 0
                };

                // 詳細分析メトリクス計算
                var analysis = await CalculateDetailedAnalysisMetricsAsync(request.StoreId, count);

                var label = count <= request.MaxPurchaseCount ? $"{count}回" : $"{request.MaxPurchaseCount}回以上";

                details.Add(new PurchaseCountDetail
                {
                    PurchaseCount = count,
                    PurchaseCountLabel = label,
                    Current = currentMetrics,
                    Previous = previousMetrics,
                    GrowthRate = growthRate,
                    Percentage = percentage,
                    Analysis = analysis
                });
            }

            return details;
        }

        private async Task<List<SegmentAnalysisData>> GetAllSegmentAnalysisAsync(int storeId)
        {
            var segments = new List<SegmentAnalysisData>();
            var segmentTypes = new[] { "new", "existing", "returning" };

            foreach (var segmentType in segmentTypes)
            {
                var segmentData = await GetSegmentAnalysisAsync(storeId, segmentType);
                segments.Add(segmentData);
            }

            return segments;
        }

        private async Task<(string segmentName, List<int> customerIds)> GetSegmentCustomerIdsAsync(int storeId, string segment)
        {
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

            return (segmentName, customerIds);
        }

        private async Task<List<PurchaseCountDetail>> GetPurchaseCountDetailsForSegmentAsync(
            PurchaseCountAnalysisRequest request, List<int> customerIds)
        {
            // セグメント顧客のみを対象とした購入回数分析
            var customerPurchaseCounts = await _context.Orders
                .Where(o => o.StoreId == request.StoreId && 
                           customerIds.Contains(o.CustomerId) &&
                           o.CreatedAt >= request.StartDate && 
                           o.CreatedAt <= request.EndDate)
                .GroupBy(o => o.CustomerId)
                .Select(g => new { 
                    CustomerId = g.Key, 
                    PurchaseCount = g.Count(),
                    TotalAmount = g.Sum(order => order.TotalPrice),
                    OrderCount = g.Count()
                })
                .ToListAsync();

            // 詳細データ作成（簡易版）
            var details = new List<PurchaseCountDetail>();

            for (int count = 1; count <= request.MaxPurchaseCount + 1; count++)
            {
                var currentData = count <= request.MaxPurchaseCount ?
                    customerPurchaseCounts.Where(c => c.PurchaseCount == count).ToList() :
                    customerPurchaseCounts.Where(c => c.PurchaseCount > request.MaxPurchaseCount).ToList();

                var currentMetrics = new BasicMetrics
                {
                    CustomerCount = currentData.Count,
                    OrderCount = currentData.Sum(c => c.OrderCount),
                    TotalAmount = currentData.Sum(c => c.TotalAmount),
                    AverageOrderValue = currentData.Count > 0 ? currentData.Sum(c => c.TotalAmount) / currentData.Sum(c => c.OrderCount) : 0,
                    AverageCustomerValue = currentData.Count > 0 ? currentData.Sum(c => c.TotalAmount) / currentData.Count : 0
                };

                var totalCustomers = customerPurchaseCounts.Count;
                var totalAmount = customerPurchaseCounts.Sum(c => c.TotalAmount);

                var percentage = new PercentageMetrics
                {
                    CustomerPercentage = totalCustomers > 0 ? (decimal)currentMetrics.CustomerCount / totalCustomers * 100 : 0,
                    AmountPercentage = totalAmount > 0 ? currentMetrics.TotalAmount / totalAmount * 100 : 0
                };

                var label = count <= request.MaxPurchaseCount ? $"{count}回" : $"{request.MaxPurchaseCount}回以上";

                details.Add(new PurchaseCountDetail
                {
                    PurchaseCount = count,
                    PurchaseCountLabel = label,
                    Current = currentMetrics,
                    Percentage = percentage,
                    Analysis = new DetailedAnalysisMetrics() // 簡易版では省略
                });
            }

            return details;
        }

        private async Task<ComparisonMetrics?> GetComparisonMetricsAsync(int storeId, DateTime startDate, DateTime endDate)
        {
            try
            {
                var customerPurchaseCounts = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               o.CreatedAt >= startDate && 
                               o.CreatedAt <= endDate)
                    .GroupBy(o => o.CustomerId)
                    .Select(g => new { CustomerId = g.Key, PurchaseCount = g.Count() })
                    .ToListAsync();

                var totalCustomers = customerPurchaseCounts.Count;
                var totalOrders = customerPurchaseCounts.Sum(c => c.PurchaseCount);
                var totalRevenue = await _context.Orders
                    .Where(o => o.StoreId == storeId && 
                               o.CreatedAt >= startDate && 
                               o.CreatedAt <= endDate)
                    .SumAsync(o => o.TotalPrice);

                return new ComparisonMetrics
                {
                    Previous = new BasicMetrics
                    {
                        CustomerCount = totalCustomers,
                        OrderCount = totalOrders,
                        TotalAmount = totalRevenue
                    },
                    ComparisonPeriod = $"{startDate:yyyy/MM/dd} - {endDate:yyyy/MM/dd}"
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "前年同期データ取得に失敗 - StoreId: {StoreId}", storeId);
                return null;
            }
        }

        private GrowthRateMetrics CalculateGrowthRate(BasicMetrics current, BasicMetrics previous)
        {
            return new GrowthRateMetrics
            {
                CustomerCountGrowth = previous.CustomerCount > 0 ? 
                    (decimal)(current.CustomerCount - previous.CustomerCount) / previous.CustomerCount * 100 : 0,
                OrderCountGrowth = previous.OrderCount > 0 ? 
                    (decimal)(current.OrderCount - previous.OrderCount) / previous.OrderCount * 100 : 0,
                AmountGrowth = previous.TotalAmount > 0 ? 
                    (current.TotalAmount - previous.TotalAmount) / previous.TotalAmount * 100 : 0,
                GrowthTrend = DetermineGrowthTrend(current.TotalAmount, previous.TotalAmount)
            };
        }

        private string DetermineGrowthTrend(decimal current, decimal previous)
        {
            if (previous == 0) return "横ばい";
            
            var growthRate = (current - previous) / previous * 100;
            
            return growthRate switch
            {
                >= 20 => "大幅増加",
                >= 5 => "増加",
                <= -20 => "大幅減少",
                <= -5 => "減少",
                _ => "横ばい"
            };
        }

        private async Task<DetailedAnalysisMetrics> CalculateDetailedAnalysisMetricsAsync(int storeId, int purchaseCount)
        {
            // 簡易版実装（実際の計算は複雑になるため、ダミーデータ）
            return new DetailedAnalysisMetrics
            {
                ConversionRate = purchaseCount < 10 ? 15.5m : 5.2m,
                RetentionRate = Math.Max(90 - purchaseCount * 3.5m, 30),
                AverageDaysBetweenOrders = purchaseCount < 5 ? 45 : 30,
                HighValueCustomers = Math.Max(0, 50 - purchaseCount * 2),
                RiskLevel = purchaseCount == 1 ? "高" : purchaseCount < 3 ? "中" : "低"
            };
        }

        private SegmentSummaryMetrics CalculateSegmentSummary(List<PurchaseCountDetail> details)
        {
            var totalCustomers = details.Sum(d => d.Current.CustomerCount);
            var totalOrders = details.Sum(d => d.Current.OrderCount);
            var totalAmount = details.Sum(d => d.Current.TotalAmount);
            var repeatCustomers = details.Where(d => d.PurchaseCount >= 2).Sum(d => d.Current.CustomerCount);

            return new SegmentSummaryMetrics
            {
                TotalCustomers = totalCustomers,
                AveragePurchaseCount = totalCustomers > 0 ? (decimal)totalOrders / totalCustomers : 0,
                RepeatRate = totalCustomers > 0 ? (decimal)repeatCustomers / totalCustomers * 100 : 0,
                AverageLTV = totalCustomers > 0 ? totalAmount / totalCustomers : 0,
                RevenueContribution = totalAmount
            };
        }

        private PurchaseCountInsights GenerateInsights(PurchaseCountAnalysisResponse response)
        {
            var insights = new PurchaseCountInsights();

            // 主要発見事項
            var oneTimeCustomers = response.Details.FirstOrDefault(d => d.PurchaseCount == 1);
            if (oneTimeCustomers != null && oneTimeCustomers.Percentage.CustomerPercentage > 60)
            {
                insights.KeyFindings.Add($"一回購入顧客が{oneTimeCustomers.Percentage.CustomerPercentage:F1}%と高い比率を占めています");
            }

            var highFreqCustomers = response.Details.Where(d => d.PurchaseCount >= 5).Sum(d => d.Percentage.CustomerPercentage);
            if (highFreqCustomers > 15)
            {
                insights.KeyFindings.Add($"5回以上購入する高頻度顧客が{highFreqCustomers:F1}%存在します");
            }

            // 推奨アクション
            if (oneTimeCustomers?.Percentage.CustomerPercentage > 60)
            {
                insights.Recommendations.Add(new RecommendationItem
                {
                    Category = "リピート促進",
                    Title = "新規顧客リピート促進",
                    Description = "一回購入顧客の比率が高いため、リピート購入を促進する施策が必要です",
                    Priority = "高",
                    Action = "フォローアップメール、割引クーポン、リターゲティング広告の実施"
                });
            }

            // リスク分析
            insights.Risk = new RiskAnalysis
            {
                OneTimeCustomerRate = oneTimeCustomers?.Percentage.CustomerPercentage ?? 0,
                ChurnRisk = oneTimeCustomers?.Percentage.CustomerPercentage > 70 ? 80 : 40,
                RiskFactors = new List<string> { "高い一回購入率", "低いリピート率" },
                OverallRiskLevel = oneTimeCustomers?.Percentage.CustomerPercentage > 70 ? "高" : "中"
            };

            // 機会分析
            insights.Opportunity = new OpportunityAnalysis
            {
                UpsellPotential = highFreqCustomers,
                RetentionOpportunity = 100 - (oneTimeCustomers?.Percentage.CustomerPercentage ?? 0),
                GrowthOpportunities = new List<string> { "リピート顧客育成", "クロスセル機会拡大" },
                PrimaryOpportunityArea = "新規顧客のリピート化"
            };

            return insights;
        }
    }
}