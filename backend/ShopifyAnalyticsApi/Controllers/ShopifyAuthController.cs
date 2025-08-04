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
using Polly;
using Polly.Extensions.Http;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// Shopify OAuth認証を処理するコントローラー（改善版）
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
        /// リダイレクトURIを取得する（フロントエンドのコールバックURLを使用）
        /// </summary>
        private string GetRedirectUri()
        {
            // フロントエンドのコールバックURLを設定ファイルから取得（必須）
            // 環境変数 → Shopify:Frontend:BaseUrl → Frontend:BaseUrl の順で検索
            var frontendUrl = Environment.GetEnvironmentVariable("SHOPIFY_FRONTEND_BASEURL") ?? 
                             _configuration["Shopify:Frontend:BaseUrl"] ?? 
                             _configuration["Frontend:BaseUrl"];
            
            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                _logger.LogError("Frontend:BaseUrl設定が見つかりません。設定ファイルを確認してください。");
                _logger.LogError("検索したパス: SHOPIFY_FRONTEND_BASEURL, Shopify:Frontend:BaseUrl, Frontend:BaseUrl");
                throw new InvalidOperationException("Frontend:BaseUrl設定が必要です。appsettings.jsonまたは環境変数で設定してください。");
            }
            
            _logger.LogInformation("リダイレクトURI生成: FrontendUrl={FrontendUrl}, RedirectUri={RedirectUri}", 
                frontendUrl, $"{frontendUrl}/api/shopify/callback");
            
            return $"{frontendUrl}/api/shopify/callback";
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
                var apiKey = GetShopifySetting("ApiKey");
                var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
                // フロントエンドのコールバックAPIを使用（ハイブリッド方式）
                var redirectUri = GetRedirectUri();

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
                return HandleOAuthError(ex, shop, "Install");
            }
        }



        /// <summary>
        /// Shopify OAuthコールバック処理（GET - フロントエンドからの委譲）
        /// </summary>
        [HttpGet("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> Callback(
            [FromQuery] string code,
            [FromQuery] string shop,
            [FromQuery] string state,
            [FromQuery] string? hmac = null,
            [FromQuery] string? timestamp = null)
        {
            try
            {
                _logger.LogInformation("OAuthコールバック受信. Shop: {Shop}, State: {State}", shop, state);

                // パラメータ検証
                if (string.IsNullOrWhiteSpace(code) || 
                    string.IsNullOrWhiteSpace(shop) || 
                    string.IsNullOrWhiteSpace(state))
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

                // HMAC検証（オプション - 開発環境ではスキップ）
                if (!string.IsNullOrWhiteSpace(hmac) && !string.IsNullOrWhiteSpace(timestamp))
                {
                    var isDevelopment = _configuration["ASPNETCORE_ENVIRONMENT"] == "Development";
                    
                    if (!isDevelopment && !VerifyHmac(code, shop, state, timestamp, hmac))
                    {
                        _logger.LogWarning("HMAC検証失敗. Shop: {Shop}", shop);
                        return Unauthorized(new { error = "HMAC validation failed" });
                    }
                    
                    if (isDevelopment)
                    {
                        _logger.LogInformation("開発環境のためHMAC検証をスキップ. Shop: {Shop}", shop);
                    }
                }

                // アクセストークンを取得（リトライ機能付き）
                var accessToken = await ExchangeCodeForAccessTokenWithRetry(code, shop);
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

                return Ok(new
                {
                    success = true,
                    shop = shop,
                    message = "OAuth authentication completed successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OAuthコールバック処理中にエラーが発生. Shop: {Shop}", shop);
                return StatusCode(500, new { error = "OAuth callback processing failed" });
            }
        }

        /// <summary>
        /// フロントエンドからのOAuth処理委譲API（ハイブリッド方式 - POST）
        /// </summary>
        [HttpPost("process-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> ProcessCallback([FromBody] OAuthCallbackRequest request)
        {
            try
            {
                // パラメータ検証
                if (string.IsNullOrWhiteSpace(request?.Code) || 
                    string.IsNullOrWhiteSpace(request?.Shop) || 
                    string.IsNullOrWhiteSpace(request?.State))
                {
                    _logger.LogWarning("必須パラメータが不足しています");
                    return BadRequest(new { error = "Missing required parameters" });
                }

                // State検証（CSRF対策）
                var cacheKey = $"{StateCacheKeyPrefix}{request.State}";
                if (!_cache.TryGetValue<string>(cacheKey, out var cachedShop) || cachedShop != request.Shop)
                {
                    _logger.LogWarning("無効なstate. Shop: {Shop}, State: {State}", request.Shop, request.State);
                    return Unauthorized(new { error = "Invalid state parameter" });
                }

                // キャッシュからstateを削除（使い捨て）
                _cache.Remove(cacheKey);

                // HMAC検証（オプション - 開発環境ではスキップ）
                if (!string.IsNullOrWhiteSpace(request.Hmac) && !string.IsNullOrWhiteSpace(request.Timestamp))
                {
                    var isDevelopment = _configuration["ASPNETCORE_ENVIRONMENT"] == "Development";
                    
                    if (!isDevelopment && !VerifyHmac(request.Code, request.Shop, request.State, request.Timestamp, request.Hmac))
                    {
                        _logger.LogWarning("HMAC検証失敗. Shop: {Shop}", request.Shop);
                        return Unauthorized(new { error = "HMAC validation failed" });
                    }
                    
                    if (isDevelopment)
                    {
                        _logger.LogInformation("開発環境のためHMAC検証をスキップ. Shop: {Shop}", request.Shop);
                    }
                }

                // アクセストークンを取得（リトライ機能付き）
                var accessToken = await ExchangeCodeForAccessTokenWithRetry(request.Code, request.Shop);
                if (string.IsNullOrWhiteSpace(accessToken))
                {
                    _logger.LogError("アクセストークン取得失敗. Shop: {Shop}", request.Shop);
                    return StatusCode(500, new { error = "Failed to obtain access token" });
                }

                // ストア情報を保存・更新
                await SaveOrUpdateStore(request.Shop, accessToken);

                // Webhook登録
                await RegisterWebhooks(request.Shop, accessToken);

                _logger.LogInformation("OAuth認証完了（ハイブリッド方式）. Shop: {Shop}", request.Shop);

                return Ok(new
                {
                    success = true,
                    shop = request.Shop,
                    message = "OAuth authentication completed successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OAuth処理委譲中にエラーが発生. Shop: {Shop}", request?.Shop);
                return StatusCode(500, new { error = "OAuth processing failed" });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - OAuth設定の確認
        /// </summary>
        [HttpGet("test-config")]
        [AllowAnonymous]
        public IActionResult TestConfig()
        {
            try
            {
                var baseUrl = GetBaseUrl();
                var redirectUri = $"{baseUrl}/api/shopify/callback";
                var frontendUrl = GetShopifySetting("Frontend:BaseUrl", "http://localhost:3000");
                var processCallbackUrl = $"{baseUrl}/api/shopify/process-callback";
                
                var config = new
                {
                    ApiKey = !string.IsNullOrEmpty(GetShopifySetting("ApiKey")),
                    ApiSecret = !string.IsNullOrEmpty(GetShopifySetting("ApiSecret")),
                    EncryptionKey = !string.IsNullOrEmpty(GetShopifySetting("EncryptionKey")),
                    Scopes = GetShopifySetting("Scopes"),
                    BaseUrl = baseUrl,
                    RedirectUri = redirectUri,
                    FrontendUrl = frontendUrl,
                    ProcessCallbackUrl = processCallbackUrl,
                    HybridMode = new
                    {
                        Enabled = true,
                        FrontendCallbackUrl = $"{frontendUrl}/api/shopify/callback",
                        BackendProcessUrl = processCallbackUrl
                    },
                    RequestInfo = new
                    {
                        Scheme = HttpContext.Request.Scheme,
                        Host = HttpContext.Request.Host.Value,
                        XForwardedProto = HttpContext.Request.Headers["X-Forwarded-Proto"].FirstOrDefault(),
                        IsNgrok = HttpContext.Request.Host.Value.Contains("ngrok")
                    },
                    RateLimit = new
                    {
                        MaxRetries = GetShopifySetting("RateLimit:MaxRetries"),
                        RetryDelaySeconds = GetShopifySetting("RateLimit:RetryDelaySeconds")
                    }
                };

                return Ok(new { 
                    message = "Shopify OAuth設定確認（ハイブリッド方式対応）",
                    config = config,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "設定確認中にエラーが発生");
                return StatusCode(500, new { error = "Configuration test failed" });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - ハイブリッド方式のテスト
        /// </summary>
        [HttpGet("test-hybrid-mode")]
        [AllowAnonymous]
        public IActionResult TestHybridMode([FromQuery] string shop = "fuk-dev1.myshopify.com")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
                {
                    return BadRequest(new { error = "Invalid shop domain" });
                }

                var apiKey = GetShopifySetting("ApiKey");
                var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
                var frontendUrl = GetShopifySetting("Frontend:BaseUrl", "http://localhost:3000");
                var redirectUri = $"{frontendUrl}/api/shopify/callback";
                var state = GenerateRandomString(32);

                var authUrl = $"https://{shop}/admin/oauth/authorize" +
                    $"?client_id={apiKey}" +
                    $"&scope={scopes}" +
                    $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                    $"&state={state}";

                return Ok(new
                {
                    shop = shop,
                    frontendUrl = frontendUrl,
                    redirectUri = redirectUri,
                    oauthUrl = authUrl,
                    backendProcessUrl = $"{GetBaseUrl()}/api/shopify/process-callback",
                    flow = new
                    {
                        step1 = "フロントエンドでOAuth URLを生成",
                        step2 = "Shopify認証ページにリダイレクト",
                        step3 = "フロントエンドのコールバックページで受信",
                        step4 = "バックエンドのprocess-callback APIに委譲",
                        step5 = "バックエンドでトークン取得・保存・Webhook登録",
                        step6 = "フロントエンドのサクセスページにリダイレクト"
                    },
                    testData = new
                    {
                        sampleCallbackRequest = new
                        {
                            code = "sample_auth_code",
                            shop = shop,
                            state = state,
                            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                            hmac = "sample_hmac"
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ハイブリッド方式テスト中にエラーが発生");
                return StatusCode(500, new { error = "Hybrid mode test failed" });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - OAuth URL生成テスト
        /// </summary>
        [HttpGet("test-oauth-url")]
        [AllowAnonymous]
        public IActionResult TestOAuthUrl([FromQuery] string shop = "fuk-dev1.myshopify.com")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
                {
                    return BadRequest(new { error = "Invalid shop domain" });
                }

                var apiKey = GetShopifySetting("ApiKey");
                var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
                var redirectUri = GetRedirectUri(); // ハイブリッド方式用のリダイレクトURI
                var state = GenerateRandomString(32);

                var authUrl = $"https://{shop}/admin/oauth/authorize" +
                    $"?client_id={apiKey}" +
                    $"&scope={scopes}" +
                    $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                    $"&state={state}";

                return Ok(new
                {
                    shop = shop,
                    baseUrl = GetBaseUrl(),
                    redirectUri = redirectUri,
                    oauthUrl = authUrl,
                    requestInfo = new
                    {
                        scheme = HttpContext.Request.Scheme,
                        host = HttpContext.Request.Host.Value,
                        xForwardedProto = HttpContext.Request.Headers["X-Forwarded-Proto"].FirstOrDefault(),
                        isNgrok = HttpContext.Request.Host.Value.Contains("ngrok")
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OAuth URL生成テスト中にエラーが発生");
                return StatusCode(500, new { error = "OAuth URL generation test failed" });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - 設定値確認テスト
        /// </summary>
        [HttpGet("test-settings")]
        [AllowAnonymous]
        public IActionResult TestSettings()
        {
            try
            {
                var settings = new
                {
                    // 環境変数
                    EnvironmentVariable = Environment.GetEnvironmentVariable("SHOPIFY_FRONTEND_BASEURL"),
                    
                    // 設定ファイルの値
                    ShopifyFrontendBaseUrl = _configuration["Shopify:Frontend:BaseUrl"],
                    FrontendBaseUrl = _configuration["Frontend:BaseUrl"],
                    
                    // GetShopifySettingメソッドの結果
                    GetShopifySettingResult = GetShopifySetting("Frontend:BaseUrl"),
                    
                    // 実際に使用される値
                    ActualRedirectUri = GetRedirectUri(),
                    
                    // その他の設定
                    ApiKey = GetShopifySetting("ApiKey"),
                    ApiSecret = GetShopifySetting("ApiSecret"),
                    Scopes = GetShopifySetting("Scopes")
                };

                return Ok(settings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "設定値確認テスト中にエラーが発生");
                return StatusCode(500, new { error = "Settings test failed", details = ex.Message });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - 暗号化テスト
        /// </summary>
        [HttpPost("test-encryption")]
        [AllowAnonymous]
        public IActionResult TestEncryption([FromBody] TestEncryptionRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request?.Text))
                {
                    return BadRequest(new { error = "Text is required" });
                }

                var encrypted = EncryptToken(request.Text);
                var decrypted = DecryptToken(encrypted);

                return Ok(new
                {
                    original = request.Text,
                    encrypted = encrypted,
                    decrypted = decrypted,
                    success = request.Text == decrypted
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "暗号化テスト中にエラーが発生");
                return StatusCode(500, new { error = "Encryption test failed" });
            }
        }

        /// <summary>
        /// 認証コードをアクセストークンに交換する（リトライ機能付き）
        /// </summary>
        private async Task<string?> ExchangeCodeForAccessTokenWithRetry(string code, string shop)
        {
            var maxRetries = int.Parse(GetShopifySetting("RateLimit:MaxRetries", "3"));
            var retryDelaySeconds = int.Parse(GetShopifySetting("RateLimit:RetryDelaySeconds", "2"));

            var retryPolicy = Policy
                .Handle<HttpRequestException>()
                .Or<TimeoutException>()
                .WaitAndRetryAsync(maxRetries, retryAttempt => 
                    TimeSpan.FromSeconds(Math.Pow(retryDelaySeconds, retryAttempt)),
                    onRetry: (exception, timeSpan, retryCount, context) =>
                    {
                        _logger.LogWarning("トークン取得リトライ {RetryCount}. Shop: {Shop}, Delay: {Delay}ms", 
                            retryCount, shop, timeSpan.TotalMilliseconds);
                    });

            return await retryPolicy.ExecuteAsync(async () =>
            {
                return await ExchangeCodeForAccessToken(code, shop);
            });
        }

        /// <summary>
        /// 認証コードをアクセストークンに交換する
        /// </summary>
        private async Task<string?> ExchangeCodeForAccessToken(string code, string shop)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30); // 30秒タイムアウト
                
                var tokenUrl = $"https://{shop}/admin/oauth/access_token";
                var requestData = new
                {
                    client_id = GetShopifySetting("ApiKey"),
                    client_secret = GetShopifySetting("ApiSecret"),
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
                throw;
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

                // トークンと認証情報を更新（暗号化して保存）
                store.Settings = JsonSerializer.Serialize(new
                {
                    ShopifyAccessToken = EncryptToken(accessToken),
                    ShopifyScope = GetShopifySetting("Scopes"),
                    InstalledAt = DateTime.UtcNow,
                    LastTokenRefresh = DateTime.UtcNow
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
                client.Timeout = TimeSpan.FromSeconds(30);

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
                    try
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
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Webhook登録中にエラーが発生. Topic: {Topic}", webhook.topic);
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
            var secret = GetShopifySetting("ApiSecret");
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
        /// トークンを暗号化する（AES暗号化）
        /// </summary>
        private string EncryptToken(string token)
        {
            var key = GetShopifySetting("EncryptionKey");
            if (string.IsNullOrEmpty(key))
            {
                _logger.LogWarning("暗号化キーが設定されていません。Base64エンコードを使用します");
                return Convert.ToBase64String(Encoding.UTF8.GetBytes(token));
            }

            try
            {
                using var aes = Aes.Create();
                aes.Key = Convert.FromBase64String(key);
                aes.GenerateIV();

                using var encryptor = aes.CreateEncryptor();
                using var msEncrypt = new MemoryStream();
                using var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write);
                using var swEncrypt = new StreamWriter(csEncrypt);

                swEncrypt.Write(token);
                swEncrypt.Close();

                var encrypted = msEncrypt.ToArray();
                var result = new byte[aes.IV.Length + encrypted.Length];
                Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
                Buffer.BlockCopy(encrypted, 0, result, aes.IV.Length, encrypted.Length);

                return Convert.ToBase64String(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "トークン暗号化中にエラーが発生。Base64エンコードを使用します");
                return Convert.ToBase64String(Encoding.UTF8.GetBytes(token));
            }
        }

        /// <summary>
        /// トークンを復号化する（AES暗号化）
        /// </summary>
        private string DecryptToken(string encryptedToken)
        {
            var key = GetShopifySetting("EncryptionKey");
            if (string.IsNullOrEmpty(key))
            {
                _logger.LogWarning("暗号化キーが設定されていません。Base64デコードを使用します");
                var bytes = Convert.FromBase64String(encryptedToken);
                return Encoding.UTF8.GetString(bytes);
            }

            try
            {
                var encryptedBytes = Convert.FromBase64String(encryptedToken);
                
                using var aes = Aes.Create();
                aes.Key = Convert.FromBase64String(key);

                // IVを抽出（最初の16バイト）
                var iv = new byte[16];
                var encrypted = new byte[encryptedBytes.Length - 16];
                Buffer.BlockCopy(encryptedBytes, 0, iv, 0, 16);
                Buffer.BlockCopy(encryptedBytes, 16, encrypted, 0, encrypted.Length);

                aes.IV = iv;

                using var decryptor = aes.CreateDecryptor();
                using var msDecrypt = new MemoryStream(encrypted);
                using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
                using var srDecrypt = new StreamReader(csDecrypt);

                return srDecrypt.ReadToEnd();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "トークン復号化中にエラーが発生。Base64デコードを使用します");
                var bytes = Convert.FromBase64String(encryptedToken);
                return Encoding.UTF8.GetString(bytes);
            }
        }

        /// <summary>
        /// ベースURLを取得する
        /// </summary>
        private string GetBaseUrl()
        {
            var request = HttpContext.Request;
            
            // X-Forwarded-Protoヘッダーを確認（プロキシ経由の場合）
            var forwardedProto = request.Headers["X-Forwarded-Proto"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedProto))
            {
                return $"{forwardedProto}://{request.Host}";
            }
            
            // ngrok経由の場合は強制的にHTTPSを使用
            var scheme = request.Host.Value.Contains("ngrok") ? "https" : request.Scheme;
            return $"{scheme}://{request.Host}";
        }

        /// <summary>
        /// Shopify設定を取得する（環境変数優先）
        /// </summary>
        private string GetShopifySetting(string key, string defaultValue = "")
        {
            var envKey = $"SHOPIFY_{key.Replace(":", "_").ToUpper()}";
            return Environment.GetEnvironmentVariable(envKey) ?? 
                   _configuration[$"Shopify:{key}"] ?? 
                   defaultValue;
        }

        /// <summary>
        /// OAuthエラーを処理する
        /// </summary>
        private IActionResult HandleOAuthError(Exception ex, string shop, string operation)
        {
            _logger.LogError(ex, "OAuth {Operation}でエラーが発生. Shop: {Shop}", operation, shop);

            if (ex is HttpRequestException httpEx)
            {
                if (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    return StatusCode(429, new { error = "Rate limit exceeded. Please try again later." });
                }
                return StatusCode(502, new { error = "Shopify API is temporarily unavailable." });
            }

            if (ex is TimeoutException)
            {
                return StatusCode(504, new { error = "Request timeout. Please try again." });
            }

            // フロントエンドのエラーページにリダイレクト
            var frontendUrl = GetShopifySetting("Frontend:BaseUrl", "http://localhost:3000");
            return Redirect($"{frontendUrl}/shopify/error?message=Authentication%20failed");
        }

        /// <summary>
        /// Shopifyトークンレスポンス
        /// </summary>
        private class ShopifyTokenResponse
        {
            public string? AccessToken { get; set; }
            public string? Scope { get; set; }
        }

        /// <summary>
        /// 暗号化テスト用リクエスト
        /// </summary>
        public class TestEncryptionRequest
        {
            public string? Text { get; set; }
        }

        /// <summary>
        /// フロントエンドからのOAuthコールバックリクエスト
        /// </summary>
        public class OAuthCallbackRequest
        {
            public string? Code { get; set; }
            public string? Shop { get; set; }
            public string? State { get; set; }
            public string? Timestamp { get; set; }
            public string? Hmac { get; set; }
        }
    }
}