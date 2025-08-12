using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Data;

namespace ShopifyAnalyticsApi.Services
{
    /// <summary>
    /// Azure App Serviceのアイドルタイムアウトを防ぐためのKeep Aliveサービス
    /// </summary>
    public class KeepAliveService : BackgroundService
    {
        private readonly ILogger<KeepAliveService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly TimeSpan _pingInterval = TimeSpan.FromMinutes(5);

        public KeepAliveService(
            ILogger<KeepAliveService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("KeepAliveService started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // スコープを作成してDbContextを取得
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var context = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
                        
                        // 簡単なクエリを実行してデータベース接続を維持
                        await context.Database.ExecuteSqlRawAsync("SELECT 1", stoppingToken);
                    }
                    
                    _logger.LogDebug("Keep alive ping executed at {Time}", DateTime.UtcNow);
                    
                    // 次のping実行まで待機
                    await Task.Delay(_pingInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // キャンセルされた場合は正常終了
                    _logger.LogInformation("KeepAliveService is stopping due to cancellation");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Keep alive ping failed at {Time}", DateTime.UtcNow);
                    
                    // エラーが発生しても継続実行
                    // 短い間隔で再試行
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
            }

            _logger.LogInformation("KeepAliveService stopped");
        }
    }
}