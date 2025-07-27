using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using ShopifyAnalyticsApi.Data;
using System.Diagnostics;

namespace ShopifyAnalyticsApi.HealthChecks
{
    public class DatabaseHealthCheck : IHealthCheck
    {
        private readonly ShopifyDbContext _context;
        private readonly ILogger<DatabaseHealthCheck> _logger;

        public DatabaseHealthCheck(ShopifyDbContext context, ILogger<DatabaseHealthCheck> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                _logger.LogInformation("Database health check started");

                // データベース接続テスト
                var canConnect = await _context.Database.CanConnectAsync(cancellationToken);
                
                if (!canConnect)
                {
                    _logger.LogError("Database health check failed: Cannot connect to database");
                    return HealthCheckResult.Unhealthy("データベースに接続できません");
                }

                // 簡単なクエリを実行してレスポンス時間を測定
                var customerCount = await _context.Customers.CountAsync(cancellationToken);
                
                stopwatch.Stop();
                var responseTime = stopwatch.ElapsedMilliseconds;

                _logger.LogInformation("Database health check completed successfully. Response time: {ResponseTime}ms, Customer count: {CustomerCount}", 
                    responseTime, customerCount);

                // レスポンス時間に基づいてヘルスステータスを決定
                if (responseTime > 5000) // 5秒以上
                {
                    return HealthCheckResult.Degraded($"データベースの応答が遅いです ({responseTime}ms)");
                }
                else if (responseTime > 1000) // 1秒以上
                {
                    return HealthCheckResult.Healthy($"データベースは正常です (応答時間: {responseTime}ms)");
                }
                else
                {
                    return HealthCheckResult.Healthy($"データベースは正常です (応答時間: {responseTime}ms)");
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Database health check failed with exception. Duration: {Duration}ms", stopwatch.ElapsedMilliseconds);
                
                return HealthCheckResult.Unhealthy("データベースヘルスチェックでエラーが発生しました", ex);
            }
        }
    }
} 