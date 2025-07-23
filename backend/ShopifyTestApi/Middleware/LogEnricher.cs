using Serilog.Core;
using Serilog.Events;
using System.Reflection;

namespace ShopifyTestApi.Middleware
{
    public class LogEnricher : ILogEventEnricher
    {
        public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
        {
            // 環境名
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Environment", environment));

            // アプリケーション名
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Application", "ShopifyTestApi"));

            // アプリケーションバージョン
            var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Version", version));

            // デプロイメントID（環境変数から取得）
            var deploymentId = Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME") ?? "local";
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("DeploymentId", deploymentId));

            // リージョン情報（Azure App Serviceの場合）
            var region = Environment.GetEnvironmentVariable("WEBSITE_LOCATION") ?? "unknown";
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("Region", region));

            // インスタンスID
            var instanceId = Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID") ?? "local";
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("InstanceId", instanceId));

            // タイムスタンプ（UTC）
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty("TimestampUtc", DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")));
        }
    }
} 