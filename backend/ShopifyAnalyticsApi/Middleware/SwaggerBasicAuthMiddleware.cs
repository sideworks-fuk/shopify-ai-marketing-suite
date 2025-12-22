using System;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// Swagger UIへのアクセスをBasic認証で制御するミドルウェア
    /// </summary>
    public class SwaggerBasicAuthMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _configuration;

        public SwaggerBasicAuthMiddleware(RequestDelegate next, IConfiguration configuration)
        {
            _next = next;
            _configuration = configuration;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Swagger関連のパス以外はスキップ
            if (!context.Request.Path.StartsWithSegments("/swagger"))
            {
                await _next(context);
                return;
            }

            // 開発環境では認証をスキップ
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (environment == "Development")
            {
                await _next(context);
                return;
            }

            // Basic認証のチェック
            var authHeader = context.Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();
                    var decodedCredentials = Encoding.UTF8.GetString(Convert.FromBase64String(encodedCredentials));
                    var parts = decodedCredentials.Split(':', 2);
                    
                    if (parts.Length == 2)
                    {
                        var username = parts[0];
                        var password = parts[1];
                        
                        // 設定から認証情報を取得
                        var expectedUsername = _configuration["Swagger:BasicAuth:Username"] ?? "admin";
                        var expectedPassword = _configuration["Swagger:BasicAuth:Password"] ?? "SwaggerAdmin2025!";
                        
                        if (username == expectedUsername && password == expectedPassword)
                        {
                            await _next(context);
                            return;
                        }
                    }
                }
                catch
                {
                    // Basic認証のパースに失敗した場合は認証失敗として扱う
                }
            }

            // 認証失敗: 401 Unauthorizedを返す
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Swagger UI\"";
            await context.Response.WriteAsync("Unauthorized");
        }
    }
}

