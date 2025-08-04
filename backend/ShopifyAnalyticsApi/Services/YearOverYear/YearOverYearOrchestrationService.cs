using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services.YearOverYear;

namespace ShopifyAnalyticsApi.Services.YearOverYear
{
    /// <summary>
    /// 前年同月比オーケストレーションサービスの実装
    /// 責任範囲: 全体調整・ワークフロー管理・キャッシュ管理
    /// </summary>
    public class YearOverYearOrchestrationService : IYearOverYearOrchestrationService
    {
        private readonly IYearOverYearDataService _dataService;
        private readonly IYearOverYearCalculationService _calculationService;
        private readonly IYearOverYearFilterService _filterService;
        private readonly IMemoryCache _cache;
        private readonly ILogger<YearOverYearOrchestrationService> _logger;

        // キャッシュキー
        private const string ANALYSIS_CACHE_KEY = "yoy_analysis_{0}_{1}_{2}_{3}_{4}_{5}_{6}";
        private const string FILTER_OPTIONS_CACHE_KEY = "yoy_filter_options_{0}";

        // キャッシュ有効期限
        private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);

        public YearOverYearOrchestrationService(
            IYearOverYearDataService dataService,
            IYearOverYearCalculationService calculationService,
            IYearOverYearFilterService filterService,
            IMemoryCache cache,
            ILogger<YearOverYearOrchestrationService> logger)
        {
            _dataService = dataService;
            _calculationService = calculationService;
            _filterService = filterService;
            _cache = cache;
            _logger = logger;
        }

        /// <summary>
        /// 前年同月比分析を実行
        /// </summary>
        public async Task<YearOverYearResponse> GetYearOverYearAnalysisAsync(YearOverYearRequest request)
        {
            try
            {
                _logger.LogInformation("前年同月比分析開始: StoreId={StoreId}, CurrentYear={CurrentYear}, PreviousYear={PreviousYear}", 
                    request.StoreId, request.CurrentYear, request.PreviousYear);

                // キャッシュキー生成
                var cacheKey = GenerateCacheKey(request);
                
                // キャッシュから取得を試行
                if (_cache.TryGetValue(cacheKey, out YearOverYearResponse? cachedResponse) && cachedResponse != null)
                {
                    _logger.LogDebug("キャッシュから分析結果を取得: StoreId={StoreId}", request.StoreId);
                    return cachedResponse;
                }

                // 分析実行
                var response = await ExecuteAnalysisAsync(request);

                // キャッシュに保存
                _cache.Set(cacheKey, response, _cacheExpiration);

                _logger.LogInformation("前年同月比分析完了: StoreId={StoreId}, 商品数={ProductCount}", 
                    request.StoreId, response.Products.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "前年同月比分析中にエラーが発生: StoreId={StoreId}", request.StoreId);
                throw;
            }
        }

        /// <summary>
        /// 利用可能なフィルターオプションを取得
        /// </summary>
        public async Task<YearOverYearFilterOptions> GetFilterOptionsAsync(int storeId)
        {
            try
            {
                _logger.LogDebug("フィルターオプション取得開始: StoreId={StoreId}", storeId);

                var cacheKey = string.Format(FILTER_OPTIONS_CACHE_KEY, storeId);
                
                if (_cache.TryGetValue(cacheKey, out YearOverYearFilterOptions? cachedOptions) && cachedOptions != null)
                {
                    _logger.LogDebug("キャッシュからフィルターオプションを取得: StoreId={StoreId}", storeId);
                    return cachedOptions;
                }

                // 並行してデータ取得
                var productTypesTask = _dataService.GetAvailableProductTypesAsync(storeId);
                var vendorsTask = _dataService.GetAvailableVendorsAsync(storeId);
                var dateRangeTask = _dataService.GetAnalysisDateRangeAsync(storeId);

                await Task.WhenAll(productTypesTask, vendorsTask, dateRangeTask);

                var (earliestYear, latestYear) = await dateRangeTask;

                var options = new YearOverYearFilterOptions
                {
                    AvailableProductTypes = await productTypesTask,
                    AvailableVendors = await vendorsTask,
                    AvailableGrowthCategories = GetAvailableGrowthCategories(),
                    EarliestYear = earliestYear,
                    LatestYear = latestYear
                };

                // キャッシュに保存
                _cache.Set(cacheKey, options, TimeSpan.FromHours(1));

                _logger.LogDebug("フィルターオプション取得完了: StoreId={StoreId}", storeId);
                return options;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "フィルターオプション取得中にエラーが発生: StoreId={StoreId}", storeId);
                throw;
            }
        }

        /// <summary>
        /// キャッシュをクリア
        /// </summary>
        public async Task<bool> ClearCacheAsync(int storeId)
        {
            try
            {
                _logger.LogInformation("キャッシュクリア開始: StoreId={StoreId}", storeId);

                // 該当するキャッシュキーをクリア（実装は簡易版）
                var filterOptionsCacheKey = string.Format(FILTER_OPTIONS_CACHE_KEY, storeId);
                _cache.Remove(filterOptionsCacheKey);

                // 分析結果のキャッシュはパターンマッチングが困難なため、
                // 実際の実装では IMemoryCache を拡張するか、
                // Redis などの外部キャッシュを使用することを推奨

                _logger.LogInformation("キャッシュクリア完了: StoreId={StoreId}", storeId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "キャッシュクリア中にエラーが発生: StoreId={StoreId}", storeId);
                return false;
            }
        }

        #region Private Methods

        /// <summary>
        /// 分析を実行
        /// </summary>
        private async Task<YearOverYearResponse> ExecuteAnalysisAsync(YearOverYearRequest request)
        {
            // 1. データ取得
            var rawData = await _dataService.GetOrderItemsDataAsync(request, request.CurrentYear, request.PreviousYear);

            // 2. データ処理・計算
            var productData = _calculationService.ProcessProductData(rawData, request, request.CurrentYear, request.PreviousYear);

            // 3. フィルタリング・ソート
            var filteredProducts = _filterService.ApplyFiltersAndSorting(productData, request);

            // 4. サマリー計算
            var summary = _filterService.CalculateSummary(filteredProducts, request.CurrentYear, request.PreviousYear, request.ViewMode);

            // 5. レスポンス構築
            var response = new YearOverYearResponse
            {
                Products = filteredProducts,
                Summary = summary,
                MonthlyComparisons = new List<MonthlyComparisonData>(), // 必要に応じて実装
                Metadata = new ResponseMetadata
                {
                    GeneratedAt = DateTime.UtcNow,
                    DataSource = "Database",
                    CacheHit = false,
                    ApiVersion = "1.0"
                }
            };

            return response;
        }

        /// <summary>
        /// キャッシュキーを生成
        /// </summary>
        private string GenerateCacheKey(YearOverYearRequest request)
        {
            var keyElements = new[]
            {
                request.StoreId.ToString(),
                request.CurrentYear.ToString(),
                request.PreviousYear.ToString(),
                request.ViewMode ?? "revenue",
                request.ProductType ?? "all",
                request.Vendor ?? "all",
                request.ExcludeServiceItems.ToString()
            };

            return string.Format(ANALYSIS_CACHE_KEY, keyElements[0], keyElements[1], keyElements[2], 
                                keyElements[3], keyElements[4], keyElements[5], keyElements[6]);
        }

        /// <summary>
        /// 利用可能な成長カテゴリを取得
        /// </summary>
        private List<string> GetAvailableGrowthCategories()
        {
            return new List<string>
            {
                "急成長",
                "成長", 
                "安定",
                "減少",
                "大幅減少"
            };
        }

        #endregion
    }
}