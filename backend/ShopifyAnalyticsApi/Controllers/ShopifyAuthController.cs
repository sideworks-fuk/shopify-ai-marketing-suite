using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// Shopify OAuth認証を処理するコントローラー
    /// </summary>
    [ApiController]
    [Route("api/shopify")]
    public class ShopifyAuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ShopifyAuthController> _logger;
        private readonly ShopifyDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;

        // State保存用のキャッシュキープレフィックス
        private const string StateCacheKeyPrefix = "shopify_oauth_state_";
        private const int StateExpirationMinutes = 10;

        public ShopifyAuthController(
            IConfiguration configuration,
            ILogger<ShopifyAuthController> logger,
            ShopifyDbContext context,
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache)
        {
            _configuration = configuration;
            _logger = logger;
            _context = context;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
        }

        /// <summary>
        /// Shopifyアプリのインストールを開始する
        /// </summary>
        /// <param name="shop">ショップドメイン (例: example.myshopify.com)</param>
        [HttpGet("install")]
        [AllowAnonymous]
        public IActionResult Install([FromQuery] string shop)
        {
            try
            {
                // ショップドメインの検証
                if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
                {
                    _logger.LogWarning("無効なショップドメイン: {Shop}", shop);
                    return BadRequest(new { error = "Invalid shop domain" });
                }

                // CSRF対策用のstateを生成
                var state = GenerateRandomString(32);
                var cacheKey = $"{StateCacheKeyPrefix}{state}";
                
                // stateをキャッシュに保存（10分間有効）
                _cache.Set(cacheKey, shop, TimeSpan.FromMinutes(StateExpirationMinutes));
                
                _logger.LogInformation("OAuth認証開始. Shop: {Shop}, State: {State}", shop, state);

                // Shopify OAuth URLを構築
                var apiKey = _configuration["Shopify:ApiKey"];
                var scopes = _configuration["Shopify:Scopes"] ?? "read_orders,read_products,read_customers";
                var redirectUri = $"{GetBaseUrl()}/api/shopify/callback";

                var authUrl = $"https://{shop}/admin/oauth/authorize" +
                    $"?client_id={apiKey}" +
                    $"&scope={scopes}" +
                    $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                    $"&state={state}";

                // Shopifyの認証ページにリダイレクト
                return Redirect(authUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "インストール処理でエラーが発生. Shop: {Shop}", shop);
                return StatusCode(500, new { error = "Installation failed" });
            }
        }

        /// <summary>
        /// Shopifyからの認証コールバックを処理する
        /// </summary>
        [HttpGet("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> Callback(
            [FromQuery] string code,
            [FromQuery] string shop,
            [FromQuery] string state,
            [FromQuery] string? timestamp,
            [FromQuery] string? hmac)
        {
            try
            {
                // パラメータ検証
                if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(shop) || string.IsNullOrWhiteSpace(state))
                {
                    _logger.LogWarning("必須パラメータが不足しています");
                    return BadRequest(new { error = "Missing required parameters" });
                }

                // State検証（CSRF対策）
                var cacheKey = $"{StateCacheKeyPrefix}{state}";
                if (!_cache.TryGetValue<string>(cacheKey, out var cachedShop) || cachedShop != shop)
                {
                    _logger.LogWarning("無効なstate. Shop: {Shop}, State: {State}", shop, state);
                    return Unauthorized(new { error = "Invalid state parameter" });
                }

                // キャッシュからstateを削除（使い捨て）
                _cache.Remove(cacheKey);

                // HMAC検証（オプション - Shopifyが送信する場合）
                if (!string.IsNullOrWhiteSpace(hmac) && !string.IsNullOrWhiteSpace(timestamp))
                {
                    if (!VerifyHmac(code, shop, state, timestamp, hmac))
                    {
                        _logger.LogWarning("HMAC検証失敗. Shop: {Shop}", shop);
                        return Unauthorized(new { error = "HMAC validation failed" });
                    }
                }

                // アクセストークンを取得
                var accessToken = await ExchangeCodeForAccessToken(code, shop);
                if (string.IsNullOrWhiteSpace(accessToken))
                {
                    _logger.LogError("アクセストークン取得失敗. Shop: {Shop}", shop);
                    return StatusCode(500, new { error = "Failed to obtain access token" });
                }

                // ストア情報を保存・更新
                await SaveOrUpdateStore(shop, accessToken);

                // Webhook登録
                await RegisterWebhooks(shop, accessToken);

                _logger.LogInformation("OAuth認証完了. Shop: {Shop}", shop);

                // フロントエンドのサクセスページにリダイレクト
                var frontendUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
                return Redirect($"{frontendUrl}/shopify/success?shop={shop}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "コールバック処理でエラーが発生. Shop: {Shop}", shop);
                
                var frontendUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
                return Redirect($"{frontendUrl}/shopify/error?message=Authentication%20failed");
            }
        }

        /// <summary>
        /// 認証コードをアクセストークンに交換する
        /// </summary>
        private async Task<string?> ExchangeCodeForAccessToken(string code, string shop)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                
                var tokenUrl = $"https://{shop}/admin/oauth/access_token";
                var requestData = new
                {
                    client_id = _configuration["Shopify:ApiKey"],
                    client_secret = _configuration["Shopify:ApiSecret"],
                    code = code
                };

                var json = JsonSerializer.Serialize(requestData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(tokenUrl, content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("トークン取得失敗. Status: {Status}, Error: {Error}", 
                        response.StatusCode, errorContent);
                    return null;
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<ShopifyTokenResponse>(responseJson);
                
                return tokenResponse?.AccessToken;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "アクセストークン取得中にエラーが発生");
                return null;
            }
        }

        /// <summary>
        /// ストア情報をデータベースに保存または更新する
        /// </summary>
        private async Task SaveOrUpdateStore(string shopDomain, string accessToken)
        {
            try
            {
                // 既存のストアを検索
                var store = await _context.Stores
                    .FirstOrDefaultAsync(s => s.Domain == shopDomain);

                if (store == null)
                {
                    // 新規ストアを作成
                    store = new Store
                    {
                        Name = shopDomain.Replace(".myshopify.com", ""),
                        Domain = shopDomain,
                        ShopifyShopId = shopDomain,
                        DataType = "production",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Stores.Add(store);
                }

                // トークンと認証情報を更新
                // TODO: アクセストークンを暗号化して保存
                store.Settings = JsonSerializer.Serialize(new
                {
                    ShopifyAccessToken = EncryptToken(accessToken),
                    ShopifyScope = _configuration["Shopify:Scopes"],
                    InstalledAt = DateTime.UtcNow
                });
                store.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                
                _logger.LogInformation("ストア情報を保存しました. Shop: {Shop}", shopDomain);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア情報の保存中にエラーが発生. Shop: {Shop}", shopDomain);
                throw;
            }
        }

        /// <summary>
        /// 必須のWebhookを登録する
        /// </summary>
        private async Task RegisterWebhooks(string shop, string accessToken)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("X-Shopify-Access-Token", accessToken);

                var webhookBaseUrl = $"{GetBaseUrl()}/api/webhook";
                var webhooks = new[]
                {
                    new { topic = "app/uninstalled", address = $"{webhookBaseUrl}/uninstalled" },
                    new { topic = "customers/redact", address = $"{webhookBaseUrl}/customers-redact" },
                    new { topic = "shop/redact", address = $"{webhookBaseUrl}/shop-redact" },
                    new { topic = "customers/data_request", address = $"{webhookBaseUrl}/customers-data-request" }
                };

                foreach (var webhook in webhooks)
                {
                    var webhookUrl = $"https://{shop}/admin/api/2024-01/webhooks.json";
                    var requestData = new
                    {
                        webhook = new
                        {
                            topic = webhook.topic,
                            address = webhook.address,
                            format = "json"
                        }
                    };

                    var json = JsonSerializer.Serialize(requestData);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                    var response = await client.PostAsync(webhookUrl, content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Webhook登録成功. Topic: {Topic}", webhook.topic);
                    }
                    else
                    {
                        var error = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Webhook登録失敗. Topic: {Topic}, Error: {Error}", 
                            webhook.topic, error);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook登録中にエラーが発生");
                // Webhook登録の失敗は致命的ではないため、処理を続行
            }
        }

        /// <summary>
        /// ショップドメインの形式を検証する
        /// </summary>
        private bool IsValidShopDomain(string shop)
        {
            if (string.IsNullOrWhiteSpace(shop))
                return false;

            // 基本的な形式チェック（.myshopify.comで終わる）
            if (!shop.EndsWith(".myshopify.com"))
                return false;

            // 危険な文字が含まれていないかチェック
            var invalidChars = new[] { '<', '>', '"', '\'', '&', '\n', '\r' };
            if (shop.IndexOfAny(invalidChars) >= 0)
                return false;

            return true;
        }

        /// <summary>
        /// ランダムな文字列を生成する（State用）
        /// </summary>
        private string GenerateRandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        /// <summary>
        /// HMACを検証する
        /// </summary>
        private bool VerifyHmac(string code, string shop, string state, string timestamp, string hmac)
        {
            var secret = _configuration["Shopify:ApiSecret"];
            if (string.IsNullOrWhiteSpace(secret))
                return false;

            // クエリパラメータを構築（hmacを除く）
            var queryString = $"code={code}&shop={shop}&state={state}&timestamp={timestamp}";
            
            // HMAC-SHA256を計算
            using var hmacSha256 = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var computedHash = hmacSha256.ComputeHash(Encoding.UTF8.GetBytes(queryString));
            var computedHmac = BitConverter.ToString(computedHash).Replace("-", "").ToLower();

            return computedHmac == hmac.ToLower();
        }

        /// <summary>
        /// トークンを暗号化する（簡易実装）
        /// </summary>
        private string EncryptToken(string token)
        {
            // TODO: 本番環境では適切な暗号化を実装
            // Azure Key Vaultの使用を推奨
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(token));
        }

        /// <summary>
        /// ベースURLを取得する
        /// </summary>
        private string GetBaseUrl()
        {
            var request = HttpContext.Request;
            return $"{request.Scheme}://{request.Host}";
        }

        /// <summary>
        /// Shopifyトークンレスポンス
        /// </summary>
        private class ShopifyTokenResponse
        {
            public string? AccessToken { get; set; }
            public string? Scope { get; set; }
        }
    }
}