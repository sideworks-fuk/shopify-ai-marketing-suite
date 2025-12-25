using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Helpers;
using ShopifyAnalyticsApi.Attributes;

namespace ShopifyAnalyticsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DebugController : ControllerBase
    {
        private readonly IPurchaseCountAnalysisService _purchaseCountAnalysisService;
        private readonly ILogger<DebugController> _logger;

        public DebugController(
            IPurchaseCountAnalysisService purchaseCountAnalysisService,
            ILogger<DebugController> logger)
        {
            _purchaseCountAnalysisService = purchaseCountAnalysisService;
            _logger = logger;
        }

        /// <summary>
        /// セグメント診断情報を取得（デバッグ用）
        /// GET: api/debug/segment-analysis
        /// </summary>
        [HttpGet("segment-analysis")]
        [RequireDeveloperAuth]
        public async Task<ActionResult<object>> GetSegmentDebugInfo(
            [FromQuery] int storeId = 1,
            [FromQuery] string period = "12months")
        {
            try
            {
                var endDate = DateTime.UtcNow.Date;
                var startDate = period switch
                {
                    "1month" => endDate.AddMonths(-1),
                    "3months" => endDate.AddMonths(-3),
                    "6months" => endDate.AddMonths(-6),
                    "12months" => endDate.AddYears(-1),
                    _ => endDate.AddYears(-1)
                };
                
                _logger.LogInformation("セグメント診断開始: StoreId={StoreId}, Period={Period}, StartDate={StartDate}, EndDate={EndDate}", 
                    storeId, period, startDate, endDate);
                
                // 各セグメントの分析データを取得してサマリを比較
                var allData = await _purchaseCountAnalysisService.GetSegmentAnalysisAsync(storeId, "all", startDate, endDate);
                var newData = await _purchaseCountAnalysisService.GetSegmentAnalysisAsync(storeId, "new", startDate, endDate);
                var existingData = await _purchaseCountAnalysisService.GetSegmentAnalysisAsync(storeId, "existing", startDate, endDate);
                var returningData = await _purchaseCountAnalysisService.GetSegmentAnalysisAsync(storeId, "returning", startDate, endDate);
                
                var debugInfo = new
                {
                    success = true,
                    analysisInfo = new
                    {
                        storeId,
                        period,
                        startDate = startDate.ToString("yyyy-MM-dd"),
                        endDate = endDate.ToString("yyyy-MM-dd"),
                        daysCovered = (endDate - startDate).TotalDays
                    },
                    segments = new
                    {
                        all = new
                        {
                            name = allData.SegmentName,
                            customers = allData.Summary.TotalCustomers,
                            avgPurchase = allData.Summary.AveragePurchaseCount
                        },
                        newCustomers = new
                        {
                            name = newData.SegmentName,
                            customers = newData.Summary.TotalCustomers,
                            avgPurchase = newData.Summary.AveragePurchaseCount,
                            definition = "初回購入が分析期間内"
                        },
                        existing = new
                        {
                            name = existingData.SegmentName,
                            customers = existingData.Summary.TotalCustomers,
                            avgPurchase = existingData.Summary.AveragePurchaseCount,
                            definition = "分析期間前から存在（0回購入含む）"
                        },
                        returning = new
                        {
                            name = returningData.SegmentName,
                            customers = returningData.Summary.TotalCustomers,
                            avgPurchase = returningData.Summary.AveragePurchaseCount,
                            definition = "6ヶ月休眠後、分析期間内に再購入",
                            dormantPeriod = $"{startDate.AddDays(-180):yyyy-MM-dd} ～ {startDate:yyyy-MM-dd}"
                        }
                    },
                    analysis = new
                    {
                        newVsReturning = $"新規: {newData.Summary.TotalCustomers} / 復帰: {returningData.Summary.TotalCustomers}",
                        ratio = newData.Summary.TotalCustomers > 0 
                            ? $"復帰/新規 = {(double)returningData.Summary.TotalCustomers / newData.Summary.TotalCustomers:P1}"
                            : "N/A",
                        issue = newData.Summary.TotalCustomers == returningData.Summary.TotalCustomers 
                            ? "⚠️ 新規と復帰が同数です。データまたはロジックの確認が必要です。"
                            : returningData.Summary.TotalCustomers > newData.Summary.TotalCustomers 
                                ? "⚠️ 復帰が新規より多いです。通常と異なるパターンです。"
                                : "✅ 正常な分布です"
                    },
                    debugNote = "このエンドポイントはデバッグ専用です。本番環境では削除してください。"
                };
                
                return Ok(debugInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "セグメント診断取得でエラーが発生");
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }
    }
}