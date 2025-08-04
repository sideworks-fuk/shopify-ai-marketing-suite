using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.PurchaseCount;

namespace ShopifyAnalyticsApi.Services.PurchaseCount
{
    /// <summary>
    /// 購入回数分析サービスの実装
    /// 責任範囲: トレンド分析・セグメント分析・統合処理
    /// </summary>
    public class PurchaseCountAnalysisService : IPurchaseCountAnalysisService
    {
        private readonly IPurchaseCountDataService _dataService;
        private readonly IPurchaseCountCalculationService _calculationService;
        private readonly ILogger<PurchaseCountAnalysisService> _logger;

        public PurchaseCountAnalysisService(
            IPurchaseCountDataService dataService,
            IPurchaseCountCalculationService calculationService,
            ILogger<PurchaseCountAnalysisService> logger)
        {
            _dataService = dataService;
            _calculationService = calculationService;
            _logger = logger;
        }

        /// <summary>
        /// 購入回数トレンド分析を実行
        /// </summary>
        public async Task<List<PurchaseCountTrend>> GetPurchaseCountTrendsAsync(int storeId, int months = 12)
        {
            try
            {
                _logger.LogInformation("購入回数トレンド分析開始: StoreId={StoreId}, Months={Months}", storeId, months);

                var trends = new List<PurchaseCountTrend>();
                var endDate = DateTime.UtcNow.Date;

                for (int i = months - 1; i >= 0; i--)
                {
                    var periodStart = endDate.AddMonths(-i).AddDays(1 - endDate.AddMonths(-i).Day);
                    var periodEnd = periodStart.AddMonths(1).AddDays(-1);

                    var customerPurchaseCounts = await _dataService.GetMonthlyCustomerPurchaseCountsAsync(storeId, periodStart, periodEnd);
                    var trend = _calculationService.CalculatePurchaseCountTrend(customerPurchaseCounts, periodStart);
                    
                    trends.Add(trend);
                }

                _logger.LogInformation("購入回数トレンド分析完了: トレンド数={Count}", trends.Count);
                return trends;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数トレンド分析中にエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// セグメント分析を実行
        /// </summary>
        public async Task<SegmentAnalysisData> GetSegmentAnalysisAsync(int storeId, string segment)
        {
            try
            {
                _logger.LogInformation("セグメント分析開始: StoreId={StoreId}, Segment={Segment}", storeId, segment);

                // セグメント条件の定義
                var (segmentName, customerIds) = await _dataService.GetSegmentCustomerIdsAsync(storeId, segment);

                var request = new PurchaseCountAnalysisRequest
                {
                    StoreId = storeId,
                    Segment = segment,
                    StartDate = DateTime.UtcNow.Date.AddDays(-365),
                    EndDate = DateTime.UtcNow.Date,
                    MaxPurchaseCount = 20,
                    IncludeComparison = false
                };

                // セグメント内での購入回数詳細取得
                var details = await GetPurchaseCountDetailsForSegmentAsync(request, customerIds);

                // セグメントサマリー計算
                var summary = _calculationService.CalculateSegmentSummary(details);

                var segmentData = new SegmentAnalysisData
                {
                    Segment = segment,
                    SegmentName = segmentName,
                    Details = details,
                    Summary = summary
                };

                _logger.LogInformation("セグメント分析完了: Segment={Segment}, 顧客数={CustomerCount}", 
                    segment, customerIds.Count);

                return segmentData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント分析中にエラー: StoreId={StoreId}, Segment={Segment}", storeId, segment);
                throw;
            }
        }

        /// <summary>
        /// 全セグメント分析を実行
        /// </summary>
        public async Task<List<SegmentAnalysisData>> GetAllSegmentAnalysisAsync(int storeId)
        {
            try
            {
                _logger.LogInformation("全セグメント分析開始: StoreId={StoreId}", storeId);

                var segments = new List<SegmentAnalysisData>();
                var segmentTypes = new[] { "new", "existing", "returning" };

                foreach (var segmentType in segmentTypes)
                {
                    var segmentData = await GetSegmentAnalysisAsync(storeId, segmentType);
                    segments.Add(segmentData);
                }

                _logger.LogInformation("全セグメント分析完了: セグメント数={Count}", segments.Count);
                return segments;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "全セグメント分析中にエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// セグメント詳細分析を実行
        /// </summary>
        public async Task<List<PurchaseCountDetail>> GetPurchaseCountDetailsForSegmentAsync(
            PurchaseCountAnalysisRequest request, 
            List<int> customerIds)
        {
            try
            {
                _logger.LogDebug("セグメント詳細分析開始: StoreId={StoreId}, 顧客数={CustomerCount}", 
                    request.StoreId, customerIds.Count);

                // セグメント顧客のみを対象とした購入回数データ取得
                var customerPurchaseCounts = await _dataService.GetSegmentCustomerPurchaseCountsAsync(
                    request.StoreId, customerIds, request.StartDate, request.EndDate);

                // 詳細データ作成（簡易版）
                var details = new List<PurchaseCountDetail>();

                for (int count = 1; count <= request.MaxPurchaseCount + 1; count++)
                {
                    var currentMetrics = _calculationService.CalculateBasicMetrics(customerPurchaseCounts, count, request.MaxPurchaseCount);
                    var percentage = _calculationService.CalculatePercentageMetrics(currentMetrics, customerPurchaseCounts);

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

                _logger.LogDebug("セグメント詳細分析完了: 詳細数={Count}", details.Count);
                return details;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント詳細分析中にエラー: StoreId={StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 購入回数サマリーを取得
        /// </summary>
        public async Task<PurchaseCountSummary> GetPurchaseCountSummaryAsync(int storeId, int days = 365)
        {
            try
            {
                _logger.LogDebug("購入回数サマリー取得開始: StoreId={StoreId}, Days={Days}", storeId, days);

                var endDate = DateTime.UtcNow.Date;
                var startDate = endDate.AddDays(-days);

                // 現在期間のデータ取得
                var customerPurchaseCounts = await _dataService.GetCustomerPurchaseCountsAsync(storeId, startDate, endDate);
                var totalRevenue = await _dataService.GetTotalRevenueAsync(storeId, startDate, endDate);

                // 前年同期比較データ取得
                var previousStartDate = startDate.AddYears(-1);
                var previousEndDate = endDate.AddYears(-1);
                var previousCustomerPurchaseCounts = await _dataService.GetCustomerPurchaseCountsAsync(storeId, previousStartDate, previousEndDate);
                var previousTotalRevenue = await _dataService.GetTotalRevenueAsync(storeId, previousStartDate, previousEndDate);

                var comparison = _calculationService.CalculateComparisonMetrics(
                    previousCustomerPurchaseCounts, 
                    previousTotalRevenue,
                    $"{previousStartDate:yyyy/MM/dd} - {previousEndDate:yyyy/MM/dd}");

                var periodLabel = $"{startDate:yyyy/MM/dd} - {endDate:yyyy/MM/dd}";
                var summary = _calculationService.CalculatePurchaseCountSummary(
                    customerPurchaseCounts, totalRevenue, periodLabel, comparison);

                _logger.LogDebug("購入回数サマリー取得完了");
                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数サマリー取得中にエラー: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// 購入回数詳細を取得
        /// </summary>
        public async Task<List<PurchaseCountDetail>> GetPurchaseCountDetailsAsync(PurchaseCountAnalysisRequest request)
        {
            try
            {
                _logger.LogDebug("購入回数詳細取得開始: StoreId={StoreId}", request.StoreId);

                // 現在期間の顧客購入回数を集計
                var currentData = await _dataService.GetCustomerPurchaseCountsAsync(request.StoreId, request.StartDate, request.EndDate);

                // 前年同期データ取得（比較用）
                var previousData = new List<CustomerPurchaseData>();
                if (request.IncludeComparison)
                {
                    var previousStart = request.StartDate.AddYears(-1);
                    var previousEnd = request.EndDate.AddYears(-1);
                    previousData = await _dataService.GetCustomerPurchaseCountsAsync(request.StoreId, previousStart, previousEnd);
                }

                var details = _calculationService.CalculatePurchaseCountDetails(currentData, previousData, request);

                _logger.LogDebug("購入回数詳細取得完了: 詳細数={Count}", details.Count);
                return details;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "購入回数詳細取得中にエラー: StoreId={StoreId}", request.StoreId);
                throw;
            }
        }
    }
}