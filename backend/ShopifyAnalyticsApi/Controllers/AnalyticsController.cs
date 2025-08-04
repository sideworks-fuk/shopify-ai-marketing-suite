using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Helpers;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// 分析・レポート機能用のAPIコントローラー
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : StoreAwareControllerBase
    {
        private readonly IYearOverYearService _yearOverYearService;
        private readonly IMonthlySalesService _monthlySalesService;
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(
            IYearOverYearService yearOverYearService,
            IMonthlySalesService monthlySalesService,
            ILogger<AnalyticsController> logger)
        {
            _yearOverYearService = yearOverYearService;
            _monthlySalesService = monthlySalesService;
            _logger = logger;
        }

        /// <summary>
        /// 前年同月比分析データを取得
        /// GET: api/analytics/year-over-year
        /// </summary>
        /// <param name="request">分析リクエストパラメータ</param>
        /// <returns>前年同月比分析結果</returns>
        [HttpGet("year-over-year")]
        public async Task<ActionResult<ApiResponse<YearOverYearResponse>>> GetYearOverYearAnalysis([FromQuery] YearOverYearRequest request)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                // JWTから取得したStoreIdで上書き（セキュリティ対策）
                request.StoreId = this.StoreId;
                
                _logger.LogInformation("前年同月比分析データ取得開始. StoreId: {StoreId}, Year: {Year}, ViewMode: {ViewMode}, RequestId: {RequestId}",
                    request.StoreId, request.Year, request.ViewMode, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetYearOverYearAnalysis", logProperties);

                // バリデーション
                if (request.Year < 2020 || request.Year > DateTime.Now.Year)
                {
                    return BadRequest(new ApiResponse<YearOverYearResponse>
                    {
                        Success = false,
                        Data = null,
                        Message = "年指定が無効です。2020年以降、現在年以下を指定してください。"
                    });
                }

                if (request.StartMonth > request.EndMonth)
                {
                    return BadRequest(new ApiResponse<YearOverYearResponse>
                    {
                        Success = false,
                        Data = null,
                        Message = "開始月は終了月以前である必要があります。"
                    });
                }

                // 前年同月比分析実行
                var result = await _yearOverYearService.GetYearOverYearAnalysisAsync(request);

                _logger.LogInformation("前年同月比分析データ取得完了. ProductCount: {ProductCount}, ProcessingTime: {ProcessingTime}ms, RequestId: {RequestId}",
                    result.Products.Count, result.Metadata.ProcessingTimeMs, logProperties["RequestId"]);

                return Ok(new ApiResponse<YearOverYearResponse>
                {
                    Success = true,
                    Data = result,
                    Message = $"前年同月比分析データを正常に取得しました。（商品数: {result.Products.Count}件）"
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "前年同月比分析で無効なパラメータ. StoreId: {StoreId}, Year: {Year}, RequestId: {RequestId}",
                    request.StoreId, request.Year, logProperties["RequestId"]);
                    
                return BadRequest(new ApiResponse<YearOverYearResponse>
                {
                    Success = false,
                    Data = null,
                    Message = $"パラメータエラー: {ex.Message}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "前年同月比分析でエラーが発生. StoreId: {StoreId}, Year: {Year}, RequestId: {RequestId}",
                    request.StoreId, request.Year, logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<YearOverYearResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "前年同月比分析中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 利用可能な商品タイプ一覧を取得
        /// GET: api/analytics/product-types
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>商品タイプ一覧</returns>
        [HttpGet("product-types")]
        public async Task<ActionResult<ApiResponse<List<string>>>> GetProductTypes([FromQuery] int storeId = 1)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                // JWTから取得したStoreIdを使用（セキュリティ対策）
                storeId = this.StoreId;
                
                _logger.LogInformation("商品タイプ一覧取得開始. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);

                var productTypes = await _yearOverYearService.GetAvailableProductTypesAsync(storeId);

                _logger.LogInformation("商品タイプ一覧取得完了. Count: {Count}, RequestId: {RequestId}",
                    productTypes.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<List<string>>
                {
                    Success = true,
                    Data = productTypes,
                    Message = $"商品タイプ一覧を正常に取得しました。（{productTypes.Count}件）"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "商品タイプ一覧取得でエラーが発生. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<List<string>>
                {
                    Success = false,
                    Data = null,
                    Message = "商品タイプ一覧取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 利用可能なベンダー一覧を取得
        /// GET: api/analytics/vendors
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>ベンダー一覧</returns>
        [HttpGet("vendors")]
        public async Task<ActionResult<ApiResponse<List<string>>>> GetVendors([FromQuery] int storeId = 1)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                // JWTから取得したStoreIdを使用（セキュリティ対策）
                storeId = this.StoreId;
                
                _logger.LogInformation("ベンダー一覧取得開始. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);

                var vendors = await _yearOverYearService.GetAvailableVendorsAsync(storeId);

                _logger.LogInformation("ベンダー一覧取得完了. Count: {Count}, RequestId: {RequestId}",
                    vendors.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<List<string>>
                {
                    Success = true,
                    Data = vendors,
                    Message = $"ベンダー一覧を正常に取得しました。（{vendors.Count}件）"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ベンダー一覧取得でエラーが発生. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<List<string>>
                {
                    Success = false,
                    Data = null,
                    Message = "ベンダー一覧取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 分析可能期間を取得
        /// GET: api/analytics/date-range
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <returns>最古年と最新年</returns>
        [HttpGet("date-range")]
        public async Task<ActionResult<ApiResponse<object>>> GetAnalysisDateRange([FromQuery] int storeId = 1)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                // JWTから取得したStoreIdを使用（セキュリティ対策）
                storeId = this.StoreId;
                
                _logger.LogInformation("分析可能期間取得開始. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);

                var (earliestYear, latestYear) = await _yearOverYearService.GetAnalysisDateRangeAsync(storeId);

                var result = new
                {
                    EarliestYear = earliestYear,
                    LatestYear = latestYear,
                    AvailableYears = Enumerable.Range(earliestYear, latestYear - earliestYear + 1).ToList()
                };

                _logger.LogInformation("分析可能期間取得完了. Range: {EarliestYear}-{LatestYear}, RequestId: {RequestId}",
                    earliestYear, latestYear, logProperties["RequestId"]);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = result,
                    Message = $"分析可能期間を正常に取得しました。（{earliestYear}年-{latestYear}年）"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "分析可能期間取得でエラーが発生. StoreId: {StoreId}, RequestId: {RequestId}",
                    storeId, logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Data = null,
                    Message = "分析可能期間取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 月別売上統計を取得
        /// GET: api/analytics/monthly-sales
        /// </summary>
        /// <param name="request">月別売上統計リクエストパラメータ</param>
        /// <returns>月別売上統計結果</returns>
        [HttpGet("monthly-sales")]
        public async Task<ActionResult<ApiResponse<MonthlySalesResponse>>> GetMonthlySales([FromQuery] MonthlySalesRequest request)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                // JWTから取得したStoreIdで上書き（セキュリティ対策）
                request.StoreId = this.StoreId;
                
                _logger.LogInformation("月別売上統計取得開始. StoreId: {StoreId}, Period: {Period}, DisplayMode: {DisplayMode}, RequestId: {RequestId}",
                    request.StoreId, $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}", 
                    request.DisplayMode, logProperties["RequestId"]);

                using var performanceScope = LoggingHelper.CreatePerformanceScope(_logger, "GetMonthlySales", logProperties);

                // 月別売上統計実行
                var result = await _monthlySalesService.GetMonthlySalesAsync(request);

                _logger.LogInformation("月別売上統計取得完了. ProductCount: {ProductCount}, ProcessingTime: {ProcessingTime}ms, RequestId: {RequestId}",
                    result.Products.Count, result.Metadata.CalculationTimeMs, logProperties["RequestId"]);

                return Ok(new ApiResponse<MonthlySalesResponse>
                {
                    Success = true,
                    Data = result,
                    Message = $"月別売上統計データを正常に取得しました。（商品数: {result.Products.Count}件）"
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "月別売上統計で無効なパラメータ. StoreId: {StoreId}, Period: {Period}, RequestId: {RequestId}",
                    request.StoreId, $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}", logProperties["RequestId"]);
                    
                return BadRequest(new ApiResponse<MonthlySalesResponse>
                {
                    Success = false,
                    Data = null,
                    Message = $"パラメータエラー: {ex.Message}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "月別売上統計でエラーが発生. StoreId: {StoreId}, Period: {Period}, RequestId: {RequestId}",
                    request.StoreId, $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}", logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<MonthlySalesResponse>
                {
                    Success = false,
                    Data = null,
                    Message = "月別売上統計分析中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 月別売上サマリーを取得
        /// GET: api/analytics/monthly-sales/summary
        /// </summary>
        /// <param name="request">月別売上統計リクエストパラメータ</param>
        /// <returns>月別売上サマリー</returns>
        [HttpGet("monthly-sales/summary")]
        public async Task<ActionResult<ApiResponse<MonthlySalesSummary>>> GetMonthlySalesSummary([FromQuery] MonthlySalesRequest request)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                // JWTから取得したStoreIdで上書き（セキュリティ対策）
                request.StoreId = this.StoreId;
                
                _logger.LogInformation("月別売上サマリー取得開始. StoreId: {StoreId}, Period: {Period}, RequestId: {RequestId}",
                    request.StoreId, $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}", logProperties["RequestId"]);

                var result = await _monthlySalesService.GetMonthlySalesSummaryAsync(request);

                _logger.LogInformation("月別売上サマリー取得完了. TotalAmount: {TotalAmount}, ProductCount: {ProductCount}, RequestId: {RequestId}",
                    result.TotalAmount, result.ProductCount, logProperties["RequestId"]);

                return Ok(new ApiResponse<MonthlySalesSummary>
                {
                    Success = true,
                    Data = result,
                    Message = "月別売上サマリーを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "月別売上サマリー取得でエラーが発生. StoreId: {StoreId}, Period: {Period}, RequestId: {RequestId}",
                    request.StoreId, $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}", logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<MonthlySalesSummary>
                {
                    Success = false,
                    Data = null,
                    Message = "月別売上サマリー取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// カテゴリ別売上統計を取得
        /// GET: api/analytics/monthly-sales/categories
        /// </summary>
        /// <param name="request">月別売上統計リクエストパラメータ</param>
        /// <returns>カテゴリ別売上統計</returns>
        [HttpGet("monthly-sales/categories")]
        public async Task<ActionResult<ApiResponse<List<CategorySalesSummary>>>> GetCategorySales([FromQuery] MonthlySalesRequest request)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);

            try
            {
                // JWTから取得したStoreIdで上書き（セキュリティ対策）
                request.StoreId = this.StoreId;
                
                _logger.LogInformation("カテゴリ別売上統計取得開始. StoreId: {StoreId}, Period: {Period}, RequestId: {RequestId}",
                    request.StoreId, $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}", logProperties["RequestId"]);

                var result = await _monthlySalesService.GetCategorySalesAsync(request);

                _logger.LogInformation("カテゴリ別売上統計取得完了. CategoryCount: {CategoryCount}, RequestId: {RequestId}",
                    result.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<List<CategorySalesSummary>>
                {
                    Success = true,
                    Data = result,
                    Message = $"カテゴリ別売上統計を正常に取得しました。（カテゴリ数: {result.Count}件）"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "カテゴリ別売上統計取得でエラーが発生. StoreId: {StoreId}, Period: {Period}, RequestId: {RequestId}",
                    request.StoreId, $"{request.StartYear}-{request.StartMonth:D2} to {request.EndYear}-{request.EndMonth:D2}", logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<List<CategorySalesSummary>>
                {
                    Success = false,
                    Data = null,
                    Message = "カテゴリ別売上統計取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// 月別売上トレンドを取得
        /// GET: api/analytics/monthly-sales/trends
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="year">対象年</param>
        /// <returns>月別売上トレンド</returns>
        [HttpGet("monthly-sales/trends")]
        public async Task<ActionResult<ApiResponse<List<MonthlySalesTrend>>>> GetSalesTrend([FromQuery] int storeId = 1, [FromQuery] int year = 0)
        {
            var logProperties = LoggingHelper.CreateLogProperties(HttpContext);
            
            if (year == 0)
            {
                year = DateTime.Now.Year;
            }

            try
            {
                // JWTから取得したStoreIdを使用（セキュリティ対策）
                storeId = this.StoreId;
                
                _logger.LogInformation("月別売上トレンド取得開始. StoreId: {StoreId}, Year: {Year}, RequestId: {RequestId}",
                    storeId, year, logProperties["RequestId"]);

                var result = await _monthlySalesService.GetSalesTrendAsync(storeId, year);

                _logger.LogInformation("月別売上トレンド取得完了. MonthCount: {MonthCount}, RequestId: {RequestId}",
                    result.Count, logProperties["RequestId"]);

                return Ok(new ApiResponse<List<MonthlySalesTrend>>
                {
                    Success = true,
                    Data = result,
                    Message = $"{year}年の月別売上トレンドを正常に取得しました。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "月別売上トレンド取得でエラーが発生. StoreId: {StoreId}, Year: {Year}, RequestId: {RequestId}",
                    storeId, year, logProperties["RequestId"]);
                    
                return StatusCode(500, new ApiResponse<List<MonthlySalesTrend>>
                {
                    Success = false,
                    Data = null,
                    Message = "月別売上トレンド取得中にエラーが発生しました。"
                });
            }
        }

        /// <summary>
        /// Analytics API接続テスト用エンドポイント
        /// GET: api/analytics/test
        /// </summary>
        [HttpGet("test")]
        public ActionResult<ApiResponse<object>> TestConnection()
        {
            _logger.LogInformation("Analytics API接続テスト実行");

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = new
                {
                    message = "Analytics API接続テスト成功！",
                    serverTime = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                    version = "1.0.0",
                    features = new[]
                    {
                        "前年同月比分析 (year-over-year)",
                        "月別売上統計 (monthly-sales)",
                        "商品タイプフィルタ (product-types)",
                        "ベンダーフィルタ (vendors)",
                        "分析期間取得 (date-range)"
                    },
                    endpoints = new[]
                    {
                        "GET /api/analytics/year-over-year - 前年同月比分析",
                        "GET /api/analytics/monthly-sales - 月別売上統計",
                        "GET /api/analytics/monthly-sales/summary - 月別売上サマリー",
                        "GET /api/analytics/monthly-sales/categories - カテゴリ別売上統計",
                        "GET /api/analytics/monthly-sales/trends - 月別売上トレンド",
                        "GET /api/analytics/product-types - 商品タイプ一覧",
                        "GET /api/analytics/vendors - ベンダー一覧",
                        "GET /api/analytics/date-range - 分析可能期間"
                    }
                },
                Message = "Analytics APIが正常に動作しています。"
            });
        }
    }
}