using Microsoft.AspNetCore.Http;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using System.Diagnostics;

namespace ShopifyTestApi.Helpers
{
    public static class LoggingHelper
    {
        private static readonly string RequestIdHeader = "X-Request-ID";
        private static readonly string CorrelationIdHeader = "X-Correlation-ID";

        /// <summary>
        /// リクエストIDを取得または生成
        /// </summary>
        public static string GetOrCreateRequestId(HttpContext context)
        {
            if (context.Request.Headers.TryGetValue(RequestIdHeader, out var requestId) && !string.IsNullOrEmpty(requestId))
            {
                return requestId;
            }

            var newRequestId = Guid.NewGuid().ToString();
            context.Request.Headers[RequestIdHeader] = newRequestId;
            context.Response.Headers[RequestIdHeader] = newRequestId;
            return newRequestId;
        }

        /// <summary>
        /// 相関IDを取得または生成
        /// </summary>
        public static string GetOrCreateCorrelationId(HttpContext context)
        {
            if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var correlationId) && !string.IsNullOrEmpty(correlationId))
            {
                return correlationId;
            }

            var newCorrelationId = Guid.NewGuid().ToString();
            context.Request.Headers[CorrelationIdHeader] = newCorrelationId;
            context.Response.Headers[CorrelationIdHeader] = newCorrelationId;
            return newCorrelationId;
        }

        /// <summary>
        /// ユーザー情報を取得（認証済みの場合）
        /// </summary>
        public static string? GetUserInfo(HttpContext context)
        {
            // 認証が実装された場合のユーザー情報取得
            // 現在は認証未実装のためnullを返す
            return null;
        }

        /// <summary>
        /// パフォーマンス測定用のスコープを作成
        /// </summary>
        public static IDisposable CreatePerformanceScope(ILogger logger, string operationName, Dictionary<string, object>? properties = null)
        {
            var stopwatch = Stopwatch.StartNew();
            var scopeProperties = new Dictionary<string, object>
            {
                ["OperationName"] = operationName,
                ["StartTime"] = DateTime.UtcNow
            };

            if (properties != null)
            {
                foreach (var prop in properties)
                {
                    scopeProperties[prop.Key] = prop.Value;
                }
            }

            return new PerformanceScope(logger, stopwatch, scopeProperties);
        }

        /// <summary>
        /// 機密情報をマスク
        /// </summary>
        public static string MaskSensitiveData(string input, string maskPattern = "***")
        {
            if (string.IsNullOrEmpty(input))
                return input;

            // クレジットカード番号のマスク（簡易版）
            if (input.Length >= 13 && input.Length <= 19 && input.All(char.IsDigit))
            {
                return input.Substring(0, 4) + maskPattern + input.Substring(input.Length - 4);
            }

            // メールアドレスのマスク
            if (input.Contains('@'))
            {
                var parts = input.Split('@');
                if (parts.Length == 2)
                {
                    var username = parts[0];
                    var domain = parts[1];
                    var maskedUsername = username.Length > 2 ? username.Substring(0, 2) + maskPattern : maskPattern;
                    return maskedUsername + "@" + domain;
                }
            }

            return input;
        }

        /// <summary>
        /// 構造化ログ用のプロパティ辞書を作成
        /// </summary>
        public static Dictionary<string, object> CreateLogProperties(HttpContext context, string? userId = null, Dictionary<string, object>? additionalProperties = null)
        {
            var properties = new Dictionary<string, object>
            {
                ["RequestId"] = GetOrCreateRequestId(context),
                ["CorrelationId"] = GetOrCreateCorrelationId(context),
                ["UserAgent"] = context.Request.Headers.UserAgent.ToString(),
                ["RemoteIpAddress"] = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
                ["RequestPath"] = context.Request.Path,
                ["RequestMethod"] = context.Request.Method
            };

            if (!string.IsNullOrEmpty(userId))
            {
                properties["UserId"] = userId;
            }

            if (additionalProperties != null)
            {
                foreach (var prop in additionalProperties)
                {
                    properties[prop.Key] = prop.Value;
                }
            }

            return properties;
        }

        private class PerformanceScope : IDisposable
        {
            private readonly ILogger _logger;
            private readonly Stopwatch _stopwatch;
            private readonly Dictionary<string, object> _properties;
            private readonly TelemetryClient? _telemetryClient;

            public PerformanceScope(ILogger logger, Stopwatch stopwatch, Dictionary<string, object> properties)
            {
                _logger = logger;
                _stopwatch = stopwatch;
                _properties = properties;
                
                // TelemetryClientをDIから取得（可能な場合）
                try
                {
                    var serviceProvider = new Microsoft.Extensions.DependencyInjection.ServiceCollection()
                        .AddApplicationInsightsTelemetry()
                        .BuildServiceProvider();
                    _telemetryClient = serviceProvider.GetService<TelemetryClient>();
                }
                catch
                {
                    // Application Insightsが利用できない場合はnullのまま
                    _telemetryClient = null;
                }
            }

            public void Dispose()
            {
                _stopwatch.Stop();
                var durationMs = _stopwatch.ElapsedMilliseconds;
                _properties["DurationMs"] = durationMs;
                _properties["EndTime"] = DateTime.UtcNow;

                // パフォーマンス監視の閾値チェック
                var slowThreshold = 1000; // デフォルト1秒
                var criticalThreshold = 5000; // デフォルト5秒

                if (durationMs >= criticalThreshold)
                {
                    _logger.LogWarning("Critical performance issue detected. {OperationName} took {DurationMs}ms", 
                        _properties["OperationName"], durationMs);
                    
                    // Application Insightsにカスタムメトリクスを送信
                    _telemetryClient?.TrackMetric("CriticalOperationDuration", durationMs, new Dictionary<string, string>
                    {
                        ["OperationName"] = _properties["OperationName"].ToString() ?? "Unknown"
                    });
                }
                else if (durationMs >= slowThreshold)
                {
                    _logger.LogWarning("Slow operation detected. {OperationName} took {DurationMs}ms", 
                        _properties["OperationName"], durationMs);
                    
                    // Application Insightsにカスタムメトリクスを送信
                    _telemetryClient?.TrackMetric("SlowOperationDuration", durationMs, new Dictionary<string, string>
                    {
                        ["OperationName"] = _properties["OperationName"].ToString() ?? "Unknown"
                    });
                }
                else
                {
                    _logger.LogInformation("Performance measurement completed. {OperationName} took {DurationMs}ms", 
                        _properties["OperationName"], durationMs);
                }

                // 通常のパフォーマンスメトリクスも送信
                _telemetryClient?.TrackMetric("OperationDuration", durationMs, new Dictionary<string, string>
                {
                    ["OperationName"] = _properties["OperationName"].ToString() ?? "Unknown"
                });
            }
        }
    }
} 