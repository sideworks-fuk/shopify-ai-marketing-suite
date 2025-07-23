using ShopifyTestApi.Helpers;
using ShopifyTestApi.Models;
using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace ShopifyTestApi.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;
        private readonly IWebHostEnvironment _environment;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IWebHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var requestId = LoggingHelper.GetOrCreateRequestId(context);
            var correlationId = LoggingHelper.GetOrCreateCorrelationId(context);

            // ログプロパティの作成
            var logProperties = LoggingHelper.CreateLogProperties(context);
            logProperties["ExceptionType"] = exception.GetType().Name;
            logProperties["ExceptionMessage"] = exception.Message;
            logProperties["StackTrace"] = exception.StackTrace;

            // 例外の種類に応じたログレベルとメッセージの設定
            var (logLevel, userMessage, statusCode) = GetExceptionDetails(exception);

            // ログ記録
            _logger.Log(logLevel, exception, 
                "Unhandled exception occurred. RequestId: {RequestId}, CorrelationId: {CorrelationId}, " +
                "Path: {RequestPath}, Method: {RequestMethod}, ExceptionType: {ExceptionType}, " +
                "Message: {ExceptionMessage}",
                requestId, correlationId, context.Request.Path, context.Request.Method,
                exception.GetType().Name, exception.Message);

            // レスポンスヘッダーの設定
            context.Response.Headers["X-Request-ID"] = requestId;
            context.Response.Headers["X-Correlation-ID"] = correlationId;

            // レスポンスの設定
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;

            // エラーレスポンスの作成
            var errorResponse = new ApiResponse<object>
            {
                Success = false,
                Data = null,
                Message = userMessage,
                Errors = new List<string> { userMessage }
            };

            // 開発環境の場合のみ詳細情報を含める
            if (_environment.IsDevelopment())
            {
                errorResponse.Errors.Add($"Exception Type: {exception.GetType().Name}");
                errorResponse.Errors.Add($"Request ID: {requestId}");
                if (!string.IsNullOrEmpty(exception.StackTrace))
                {
                    errorResponse.Errors.Add($"Stack Trace: {exception.StackTrace}");
                }
            }

            var jsonResponse = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await context.Response.WriteAsync(jsonResponse);
        }

        private (LogLevel logLevel, string userMessage, HttpStatusCode statusCode) GetExceptionDetails(Exception exception)
        {
            return exception switch
            {
                ArgumentException or ArgumentNullException => 
                    (LogLevel.Warning, "無効なパラメータが指定されました。", HttpStatusCode.BadRequest),
                
                UnauthorizedAccessException => 
                    (LogLevel.Warning, "アクセス権限がありません。", HttpStatusCode.Unauthorized),
                
                InvalidOperationException => 
                    (LogLevel.Error, "操作を実行できませんでした。", HttpStatusCode.BadRequest),
                
                TimeoutException => 
                    (LogLevel.Error, "リクエストがタイムアウトしました。", HttpStatusCode.RequestTimeout),
                
                HttpRequestException => 
                    (LogLevel.Error, "外部サービスとの通信でエラーが発生しました。", HttpStatusCode.ServiceUnavailable),
                
                DbUpdateException => 
                    (LogLevel.Error, "データベースの更新でエラーが発生しました。", HttpStatusCode.InternalServerError),
                
                _ => 
                    (LogLevel.Error, "予期しないエラーが発生しました。", HttpStatusCode.InternalServerError)
            };
        }
    }

    // 拡張メソッド
    public static class GlobalExceptionMiddlewareExtensions
    {
        public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<GlobalExceptionMiddleware>();
        }
    }
} 