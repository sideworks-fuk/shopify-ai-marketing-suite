using Hangfire;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Jobs
{
    public class DataRetentionJob
    {
        private readonly IDataRetentionService _retentionService;
        private readonly ILogger<DataRetentionJob> _logger;

        public DataRetentionJob(
            IDataRetentionService retentionService,
            ILogger<DataRetentionJob> logger)
        {
            _retentionService = retentionService;
            _logger = logger;
        }

        [DisableConcurrentExecution(timeoutInSeconds: 600)]
        public async Task ExecuteRetentionCleanup()
        {
            try
            {
                _logger.LogInformation("データ保持期間定期削除ジョブ開始");

                var result = await _retentionService.ExecuteAsync();

                if (result.Success)
                {
                    _logger.LogInformation(
                        "データ保持期間定期削除ジョブ完了. 合計削除: {TotalDeleted}, 所要時間: {Duration}",
                        result.TotalDeleted, result.CompletedAt - result.StartedAt);
                }
                else
                {
                    _logger.LogWarning(
                        "データ保持期間定期削除ジョブ完了（一部エラーあり）. 合計削除: {TotalDeleted}, エラー: {Errors}",
                        result.TotalDeleted, string.Join("; ", result.Errors));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データ保持期間定期削除ジョブで例外発生");
                throw;
            }
        }
    }
}
