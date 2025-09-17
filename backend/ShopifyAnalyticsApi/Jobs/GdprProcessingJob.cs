using Hangfire;
using Microsoft.Extensions.Logging;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Jobs
{
    /// <summary>
    /// GDPRのpendingリクエストを定期的に処理するジョブ
    /// </summary>
    public class GdprProcessingJob
    {
        private readonly IGDPRService _gdprService;
        private readonly ILogger<GdprProcessingJob> _logger;

        public GdprProcessingJob(IGDPRService gdprService, ILogger<GdprProcessingJob> logger)
        {
            _gdprService = gdprService;
            _logger = logger;
        }

        /// <summary>
        /// pendingのGDPRリクエストを処理（5秒応答要件はWebhook側で満たす想定）
        /// </summary>
        [DisableConcurrentExecution(timeoutInSeconds: 300)]
        public async Task ProcessPendingRequests()
        {
            try
            {
                var pending = await _gdprService.GetPendingRequestsAsync();
                if (pending == null || pending.Count == 0)
                {
                    return;
                }

                foreach (var request in pending)
                {
                    try
                    {
                        switch (request.RequestType.ToLower())
                        {
                            case "customers_data_request":
                                await _gdprService.ProcessCustomerDataRequestAsync(request.Id);
                                break;
                            case "customers_redact":
                                await _gdprService.ProcessCustomerRedactAsync(request.Id);
                                break;
                            case "shop_redact":
                                await _gdprService.ProcessShopRedactAsync(request.Id);
                                break;
                            default:
                                _logger.LogWarning("未対応のGDPRリクエストタイプ: {Type} (Id: {Id})", request.RequestType, request.Id);
                                break;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "GDPRリクエスト処理中にエラー (Id: {Id}, Type: {Type})", request.Id, request.RequestType);
                        await _gdprService.MarkAsFailedAsync(request.Id, ex.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GDPR pending処理ジョブ全体で例外が発生");
            }
        }
    }
}


