using System.Security.Cryptography;
using System.Text;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// ShopifyのWebhook署名を検証するミドルウェア
    /// </summary>
    public class HmacValidationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<HmacValidationMiddleware> _logger;
        private readonly IConfiguration _configuration;

        public HmacValidationMiddleware(
            RequestDelegate next,
            ILogger<HmacValidationMiddleware> logger,
            IConfiguration configuration)
        {
            _next = next;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Webhookエンドポイントのみ検証
            if (!context.Request.Path.StartsWithSegments("/api/webhook"))
            {
                await _next(context);
                return;
            }

            // ShopifyAuthControllerのコールバックは除外
            if (context.Request.Path.StartsWithSegments("/api/shopify"))
            {
                await _next(context);
                return;
            }

            try
            {
                // HMAC署名の検証
                if (!await ValidateHmacSignature(context))
                {
                    _logger.LogWarning("HMAC署名検証失敗. Path: {Path}, IP: {IP}", 
                        context.Request.Path, context.Connection.RemoteIpAddress);
                    
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Unauthorized");
                    return;
                }

                _logger.LogDebug("HMAC署名検証成功. Path: {Path}", context.Request.Path);
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HMAC検証中にエラーが発生");
                
                // Webhookは常に200を返す（5秒ルール）
                context.Response.StatusCode = 200;
                await context.Response.WriteAsync("OK");
            }
        }

        private async Task<bool> ValidateHmacSignature(HttpContext context)
        {
            try
            {
                // X-Shopify-Hmac-SHA256ヘッダーを取得
                if (!context.Request.Headers.TryGetValue("X-Shopify-Hmac-SHA256", out var receivedHmac))
                {
                    _logger.LogWarning("HMAC署名ヘッダーが見つかりません");
                    return false;
                }

                // リクエストボディを読み取る（バッファリングを有効化）
                context.Request.EnableBuffering();
                
                using var reader = new StreamReader(
                    context.Request.Body,
                    encoding: Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: false,
                    leaveOpen: true);
                
                var body = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0; // ボディを巻き戻す

                // Webhook秘密鍵を取得
                var secret = _configuration["Shopify:WebhookSecret"];
                if (string.IsNullOrWhiteSpace(secret))
                {
                    _logger.LogError("Webhook秘密鍵が設定されていません");
                    return false;
                }

                // HMAC-SHA256を計算
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var computedHashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
                var computedHash = Convert.ToBase64String(computedHashBytes);

                // タイミング攻撃を防ぐため、固定時間で比較
                var isValid = CryptographicEquals(computedHash, receivedHmac.ToString());

                if (!isValid)
                {
                    _logger.LogWarning("HMAC署名が一致しません. Received: {Received}, Computed: {Computed}", 
                        receivedHmac.ToString(), computedHash);
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HMAC署名検証中にエラーが発生");
                return false;
            }
        }

        /// <summary>
        /// タイミング攻撃を防ぐための固定時間比較
        /// </summary>
        private static bool CryptographicEquals(string a, string b)
        {
            if (a == null || b == null || a.Length != b.Length)
                return false;

            var areSame = true;
            for (var i = 0; i < a.Length; i++)
            {
                areSame &= a[i] == b[i];
            }

            return areSame;
        }
    }

    /// <summary>
    /// HmacValidationMiddleware拡張メソッド
    /// </summary>
    public static class HmacValidationMiddlewareExtensions
    {
        public static IApplicationBuilder UseHmacValidation(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<HmacValidationMiddleware>();
        }
    }
}