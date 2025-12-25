using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Data;
using ShopifyAnalyticsApi.Attributes;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.Extensions;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using Polly;
using Polly.Extensions.Http;
using ShopifySharp.Utilities;
using Microsoft.Extensions.Primitives;

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
        private readonly ShopifyOAuthService _oauthService;

        // State保存用のキャッシュキープレフィックス
        private const string StateCacheKeyPrefix = "shopify_oauth_state_";
        private const int StateExpirationMinutes = 10;

        public ShopifyAuthController(
            IConfiguration configuration,
            ILogger<ShopifyAuthController> logger,
            ShopifyDbContext context,
            IHttpClientFactory httpClientFactory,
            IMemoryCache cache,
            ShopifyOAuthService oauthService)
        {
            _configuration = configuration;
            _logger = logger;
            _context = context;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _oauthService = oauthService;
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
        /// OAuth URLを取得する（JSON形式、フロントエンド用）
        /// </summary>
        /// <param name="shop">ショップドメイン (例: example.myshopify.com)</param>
        /// <param name="apiKey">フロントエンドから渡されるAPI Key（オプション）</param>
        [HttpGet("install-url")]
        [AllowAnonymous]
        public async Task<IActionResult> GetInstallUrl([FromQuery] string shop, [FromQuery] string? apiKey = null)
        {
            try
            {
                _logger.LogInformation("🔍 ===== OAuth URL取得リクエスト受信 ===== ");
                _logger.LogInformation("📍 Shop: {Shop}", shop);
                _logger.LogInformation("🔑 ApiKey: {ApiKey}", apiKey ?? "未指定");
                _logger.LogInformation("⏰ リクエスト時刻: {Timestamp}", DateTime.UtcNow);
                
                var authUrl = await BuildOAuthUrlAsync(shop, apiKey);
                
                if (string.IsNullOrEmpty(authUrl))
                {
                    _logger.LogError("❌ OAuth URL生成失敗. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey ?? "未指定");
                    return BadRequest(new { error = "Failed to build OAuth URL" });
                }
                
                _logger.LogInformation("✅ OAuth URL生成成功. Shop: {Shop}, AuthUrl: {AuthUrl}", shop, authUrl);
                _logger.LogInformation("🔍 ============================================");
                
                return Ok(new { authUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ OAuth URL取得中にエラーが発生. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey ?? "未指定");
                return StatusCode(500, new { error = "Failed to get OAuth URL", details = ex.Message });
            }
        }

        /// <summary>
        /// OAuth URLを構築する共通メソッド
        /// </summary>
        private async Task<string?> BuildOAuthUrlAsync(string shop, string? apiKey = null)
        {
            // ショップドメインの検証
            if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
            {
                _logger.LogWarning("無効なショップドメイン: {Shop}", shop);
                return null;
            }

            // API Key/Secretの取得ロジック
            string finalApiKey;
            string? finalApiSecret;
            int? shopifyAppId = null;
            string? shopifyAppUrl = null;
            
            if (!string.IsNullOrEmpty(apiKey))
            {
                var shopifyApp = await _context.ShopifyApps
                    .FirstOrDefaultAsync(a => a.ApiKey == apiKey && a.IsActive);
                
                if (shopifyApp != null)
                {
                    finalApiKey = shopifyApp.ApiKey;
                    finalApiSecret = shopifyApp.ApiSecret;
                    shopifyAppId = shopifyApp.Id;
                    shopifyAppUrl = shopifyApp.AppUrl;
                }
                else
                {
                    finalApiKey = apiKey;
                    finalApiSecret = await GetApiSecretByApiKeyAsync(apiKey);
                    
                    if (string.IsNullOrEmpty(finalApiSecret))
                    {
                        _logger.LogError("❌ API Keyに対応するSecretが見つかりません. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
                        return null;
                    }
                }
            }
            else
            {
                var (dbApiKey, dbApiSecret) = await GetShopifyCredentialsAsync(shop);
                finalApiKey = dbApiKey;
                finalApiSecret = dbApiSecret;
            }
            
            if (string.IsNullOrEmpty(finalApiKey))
            {
                _logger.LogError("API Keyが見つかりません. Shop: {Shop}", shop);
                return null;
            }

            // CSRF対策用のstateを生成
            var state = GenerateRandomString(32);
            var cacheKey = $"{StateCacheKeyPrefix}{state}";
            
            // stateとAPI Key/Secret/ShopifyAppIdをキャッシュに保存（10分間有効）
            var stateData = new { shop, apiKey = finalApiKey, apiSecret = finalApiSecret, shopifyAppId };
            _cache.Set(cacheKey, JsonSerializer.Serialize(stateData), TimeSpan.FromMinutes(StateExpirationMinutes));
            
            _logger.LogInformation("OAuth認証開始. Shop: {Shop}, State: {State}, ApiKey: {ApiKey}", shop, state, finalApiKey);

            // Shopify OAuth URLを構築
            var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
            _logger.LogInformation("OAuth認証スコープ: {Scopes}", scopes);
            
            // マルチアプリ対応
            if (string.IsNullOrWhiteSpace(shopifyAppUrl))
            {
                shopifyAppUrl = await _context.ShopifyApps
                    .Where(a => a.ApiKey == finalApiKey && a.IsActive)
                    .Select(a => a.AppUrl)
                    .FirstOrDefaultAsync();
            }

            var redirectUri = !string.IsNullOrWhiteSpace(shopifyAppUrl)
                ? $"{shopifyAppUrl.TrimEnd('/')}/api/shopify/callback"
                : GetRedirectUri();
            
            _logger.LogInformation("OAuth redirect_uri決定. Shop: {Shop}, ApiKey: {ApiKey}, RedirectUri: {RedirectUri}", shop, finalApiKey, redirectUri);

            var authUrl = $"https://{shop}/admin/oauth/authorize" +
                $"?client_id={finalApiKey}" +
                $"&scope={scopes}" +
                $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                $"&state={state}";

            _logger.LogInformation("生成されたOAuth認証URL: {AuthUrl}", authUrl);
            
            return authUrl;
        }

        /// <summary>
        /// Shopifyアプリのインストールを開始する
        /// </summary>
        /// <param name="shop">ショップドメイン (例: example.myshopify.com)</param>
        /// <param name="apiKey">フロントエンドから渡されるAPI Key（オプション）</param>
        [HttpGet("install")]
        [AllowAnonymous]
        public async Task<IActionResult> Install([FromQuery] string shop, [FromQuery] string? apiKey = null)
        {
            try
            {
                // デバッグ: リクエストパラメータをログ出力
                _logger.LogInformation("===== OAuth Install 開始 ===== Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
                
                var authUrl = await BuildOAuthUrlAsync(shop, apiKey);
                if (string.IsNullOrEmpty(authUrl))
                {
                    return BadRequest(new { error = "Invalid shop domain or failed to build OAuth URL" });
                }

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

                // 開発環境判定（メソッド全体で使用）
                var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();

                // State検証（CSRF対策）
                var cacheKey = $"{StateCacheKeyPrefix}{state}";
                var stateDataJson = _cache.Get<string>(cacheKey);
                
                if (string.IsNullOrEmpty(stateDataJson))
                {
                    _logger.LogWarning("無効なstate. Shop: {Shop}, State: {State}", shop, state);
                    return BadRequest(new { error = "Invalid state parameter" });
                }

                // stateからAPI Key/Secret/ShopifyAppIdを取得
                var stateData = JsonSerializer.Deserialize<StateData>(stateDataJson);
                if (stateData == null || string.IsNullOrEmpty(stateData.apiKey))
                {
                    _logger.LogError("OAuthコールバック: stateデータの解析に失敗. Shop: {Shop}", shop);
                    return StatusCode(500, new { error = "Failed to parse state data" });
                }

                // キャッシュからstateを削除（使い捨て）
                _cache.Remove(cacheKey);

                // HMAC検証（ShopifySharpライブラリ使用）
                if (!string.IsNullOrWhiteSpace(hmac) && !string.IsNullOrWhiteSpace(timestamp))
                {
                    
                    // クエリパラメータをShopifyOAuthService用に準備
                    var queryParams = HttpContext.Request.Query
                        .Select(q => new KeyValuePair<string, StringValues>(q.Key, q.Value))
                        .ToList();
                    
                    // stateに含めたApiSecret（ShopifyApps由来）をHMAC検証に使用（マルチアプリ対応）
                    var isValidHmac = _oauthService.VerifyHmac(queryParams, secretOverride: stateData.apiSecret);
                    
                    if (!isValidHmac && !isDevelopment)
                    {
                        _logger.LogWarning("HMAC検証失敗. Shop: {Shop}", shop);
                        return Unauthorized(new { error = "HMAC validation failed" });
                    }
                    
                    if (!isValidHmac && isDevelopment)
                    {
                        _logger.LogWarning("開発環境のためHMAC検証失敗を無視. Shop: {Shop}", shop);
                    }
                }

                // アクセストークンを取得（リトライ機能付き）
                var tokenResponse = await ExchangeCodeForAccessTokenWithRetry(
                    code, 
                    shop, 
                    stateData.apiKey, 
                    stateData.apiSecret);
                if (tokenResponse == null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
                {
                    _logger.LogError("アクセストークン取得失敗. Shop: {Shop}", shop);
                    return StatusCode(500, new { error = "Failed to obtain access token" });
                }

                // ストア情報を保存・更新（ShopifyAppIdも保存、承認されたスコープも保存）
                var storeId = await SaveOrUpdateStore(
                    shop, 
                    tokenResponse.AccessToken, 
                    stateData.apiKey, 
                    stateData.apiSecret,
                    stateData.shopifyAppId,
                    tokenResponse.Scope);

                // Webhook登録
                await RegisterWebhooks(shop, tokenResponse.AccessToken);

                // ✅ 案1: インストール直後はトライアル（trialing）を自動付与して全機能を解放
                await EnsureTrialSubscriptionAsync(storeId);

                _logger.LogInformation("OAuth認証完了. Shop: {Shop}, StoreId: {StoreId}, ShopifyAppId: {ShopifyAppId}", 
                    shop, storeId, stateData.shopifyAppId);

                // OAuth認証成功後、セッションCookieを設定（埋め込みアプリでない場合の認証に使用）
                // Cookie名: oauth_session
                // 値: storeIdとshopドメインを含むJSON（暗号化推奨だが、開発環境では簡易実装）
                var sessionData = new
                {
                    storeId = storeId,
                    shop = shop,
                    authenticatedAt = DateTime.UtcNow
                };
                var sessionJson = System.Text.Json.JsonSerializer.Serialize(sessionData);
                
                // Cookie 設定
                // - ngrok(フロント) → localhost(バック) のようなクロスサイト fetch では SameSite=Lax だと Cookie が送信されず 401 になる
                // - そのため「フロントBaseUrlのHost」と「このリクエストHost」が異なる場合は SameSite=None にする
                // 注: isDevelopmentはメソッドの先頭で既に定義済み
                var frontendBaseUrl = _configuration["Frontend:BaseUrl"];
                var isCrossSite = false;
                if (!string.IsNullOrWhiteSpace(frontendBaseUrl) && Uri.TryCreate(frontendBaseUrl, UriKind.Absolute, out var feUri))
                {
                    isCrossSite = !string.Equals(feUri.Host, Request.Host.Host, StringComparison.OrdinalIgnoreCase);
                }

                var sessionCookieOptions = new CookieOptions
                {
                    HttpOnly = true, // JavaScriptからアクセス不可（XSS対策）
                    SameSite = isCrossSite ? SameSiteMode.None : SameSiteMode.Lax,
                    // SameSite=None の場合は Secure 必須。Lax の場合は環境/スキームに追従
                    Secure = isCrossSite ? true : (!isDevelopment || Request.IsHttps),
                    Expires = DateTimeOffset.UtcNow.AddDays(30), // 30日間有効
                    Path = "/"
                };
                
                // SameSite=Noneの場合はSecure=trueが必須
                if (sessionCookieOptions.SameSite == SameSiteMode.None)
                {
                    sessionCookieOptions.Secure = true;
                }
                
                Response.Cookies.Append("oauth_session", sessionJson, sessionCookieOptions);
                _logger.LogInformation("OAuth認証セッションCookieを設定しました. StoreId: {StoreId}, Shop: {Shop}, Secure: {Secure}, SameSite: {SameSite}, IsDevelopment: {IsDevelopment}", 
                    storeId, shop, sessionCookieOptions.Secure, sessionCookieOptions.SameSite, isDevelopment);

                // フロントエンドにリダイレクト（認証成功ページを経由）
                var appUrl = await GetShopifyAppUrlAsync(stateData.apiKey);
                // embeddedアプリ復帰のため host / embedded を可能な限り引き継ぐ
                var hostParam = HttpContext.Request.Query["host"].ToString();
                var embeddedParam = HttpContext.Request.Query["embedded"].ToString();

                var redirectUrl = $"{appUrl}/auth/success?shop={Uri.EscapeDataString(shop)}&storeId={storeId}&success=true";
                if (!string.IsNullOrWhiteSpace(hostParam))
                {
                    redirectUrl += $"&host={Uri.EscapeDataString(hostParam)}";
                }
                // embedded は "1" などの値が来る。無い場合でもフロント側で補完できるが、あれば引き継ぐ
                if (!string.IsNullOrWhiteSpace(embeddedParam))
                {
                    redirectUrl += $"&embedded={Uri.EscapeDataString(embeddedParam)}";
                }
                _logger.LogInformation("OAuth認証完了後のリダイレクト: {RedirectUrl}", redirectUrl);
                return Redirect(redirectUrl);
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
                    
                    if (!isDevelopment && !await VerifyHmacAsync(request.Code, request.Shop, request.State, request.Timestamp, request.Hmac))
                    {
                        _logger.LogWarning("HMAC検証失敗. Shop: {Shop}", request.Shop);
                        return Unauthorized(new { error = "HMAC validation failed" });
                    }
                    
                    if (isDevelopment)
                    {
                        _logger.LogInformation("開発環境のためHMAC検証をスキップ. Shop: {Shop}", request.Shop);
                    }
                }

                // ストア情報を取得（ShopifyAppを含む）
                var (apiKey, apiSecret) = await GetShopifyCredentialsAsync(request.Shop);
                var store = await _context.Stores
                    .Include(s => s.ShopifyApp)
                    .FirstOrDefaultAsync(s => s.Domain == request.Shop);
                int? shopifyAppId = store?.ShopifyAppId;

                // アクセストークンを取得（リトライ機能付き）
                var tokenResponse = await ExchangeCodeForAccessTokenWithRetry(
                    request.Code, 
                    request.Shop, 
                    apiKey, 
                    apiSecret);
                if (tokenResponse == null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
                {
                    _logger.LogError("アクセストークン取得失敗. Shop: {Shop}", request.Shop);
                    return StatusCode(500, new { error = "Failed to obtain access token" });
                }

                // ストア情報を保存・更新（ShopifyAppIdも保存、承認されたスコープも保存）
                var storeId = await SaveOrUpdateStore(request.Shop, tokenResponse.AccessToken, apiKey, apiSecret, shopifyAppId, tokenResponse.Scope);

                // Webhook登録
                await RegisterWebhooks(request.Shop, tokenResponse.AccessToken);

                // ✅ 案1: インストール直後はトライアル（trialing）を自動付与して全機能を解放
                await EnsureTrialSubscriptionAsync(storeId);

                _logger.LogInformation("OAuth認証完了（ハイブリッド方式）. Shop: {Shop}, StoreId: {StoreId}", request.Shop, storeId);

                return Ok(new
                {
                    success = true,
                    shop = request.Shop,
                    storeId = storeId,
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
        [RequireDeveloperAuth]
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
        [RequireDeveloperAuth]
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
        [RequireDeveloperAuth]
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
        /// デバッグ用エンドポイント - ShopifyAppsテーブルの状態確認
        /// </summary>
        [HttpGet("debug-shopify-apps")]
        [RequireDeveloperAuth]
        public async Task<IActionResult> DebugShopifyApps()
        {
            try
            {
                var apps = await _context.ShopifyApps
                    .Select(a => new
                    {
                        a.Id,
                        a.Name,
                        a.DisplayName,
                        a.AppType,
                        ApiKey = a.ApiKey.Substring(0, Math.Min(8, a.ApiKey.Length)) + "...",
                        // ApiKeyFullは削除（セキュリティのため）
                        AppUrl = a.AppUrl,
                        IsActive = a.IsActive,
                        a.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    message = "ShopifyAppsテーブルの状態",
                    count = apps.Count,
                    apps = apps,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ShopifyAppsテーブル確認中にエラーが発生");
                return StatusCode(500, new { error = "Failed to query ShopifyApps table", details = ex.Message });
            }
        }

        /// <summary>
        /// デバッグ用エンドポイント - 承認済みスコープの確認
        /// </summary>
        [HttpGet("debug-approved-scopes")]
        [RequireDeveloperAuth]
        public async Task<IActionResult> DebugApprovedScopes([FromQuery] string? shop = null)
        {
            try
            {
                var query = _context.Stores.AsQueryable();
                
                if (!string.IsNullOrEmpty(shop))
                {
                    query = query.Where(s => s.Domain == shop);
                }

                var stores = await query
                    .Select(s => new
                    {
                        s.Id,
                        s.Name,
                        s.Domain,
                        s.ShopifyShopId,
                        Settings = s.Settings
                    })
                    .ToListAsync();

                var storesWithScopes = stores.Select(s =>
                {
                    string? approvedScope = null;
                    try
                    {
                        if (!string.IsNullOrEmpty(s.Settings))
                        {
                            var settings = JsonSerializer.Deserialize<Dictionary<string, object>>(s.Settings);
                            if (settings != null && settings.ContainsKey("ShopifyScope"))
                            {
                                approvedScope = settings["ShopifyScope"]?.ToString();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Settingsの解析に失敗. StoreId: {StoreId}", s.Id);
                    }

                    return new
                    {
                        s.Id,
                        s.Name,
                        s.Domain,
                        s.ShopifyShopId,
                        ApprovedScope = approvedScope ?? "未設定",
                        HasSettings = !string.IsNullOrEmpty(s.Settings)
                    };
                }).ToList();

                return Ok(new
                {
                    message = "承認済みスコープの確認",
                    count = storesWithScopes.Count,
                    stores = storesWithScopes,
                    timestamp = DateTime.UtcNow,
                    note = "ApprovedScopeはOAuth認証時にShopifyから返されたスコープです。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "承認済みスコープ確認中にエラーが発生");
                return StatusCode(500, new { error = "Failed to query approved scopes", details = ex.Message });
            }
        }

        /// <summary>
        /// デバッグ用エンドポイント - Storeテーブルの状態確認（AccessTokenの保存状況を確認）
        /// </summary>
        [HttpGet("debug-stores")]
        [RequireDeveloperAuth]
        public async Task<IActionResult> DebugStores([FromQuery] string? shop = null)
        {
            try
            {
                var query = _context.Stores.AsQueryable();
                
                if (!string.IsNullOrEmpty(shop))
                {
                    query = query.Where(s => s.Domain == shop);
                }

                var stores = await query
                    .Include(s => s.ShopifyApp)
                    .Select(s => new
                    {
                        s.Id,
                        s.Name,
                        s.Domain,
                        s.ShopifyShopId,
                        HasAccessToken = !string.IsNullOrEmpty(s.AccessToken),
                        AccessTokenLength = s.AccessToken != null ? s.AccessToken.Length : 0,
                        AccessTokenPreview = s.AccessToken != null 
                            ? s.AccessToken.Substring(0, Math.Min(20, s.AccessToken.Length)) + "..." 
                            : null,
                        HasApiKey = !string.IsNullOrEmpty(s.ApiKey),
                        HasApiSecret = !string.IsNullOrEmpty(s.ApiSecret),
                        ShopifyAppId = s.ShopifyAppId,
                        ShopifyAppName = s.ShopifyApp != null ? s.ShopifyApp.Name : null,
                        s.IsActive,
                        s.LastSyncDate,
                        s.InitialSetupCompleted,
                        s.CreatedAt,
                        s.UpdatedAt,
                        // AccessTokenの復号化テスト（エラーが発生しないか確認）
                        CanDecryptToken = s.AccessToken != null
                    })
                    .ToListAsync();

                // AccessTokenの復号化テストを実行
                var storesWithDecryptTest = stores.Select(s =>
                {
                    bool canDecrypt = false;
                    string? decryptError = null;
                    
                    if (s.HasAccessToken)
                    {
                        try
                        {
                            var store = _context.Stores.Find(s.Id);
                            if (store != null && !string.IsNullOrEmpty(store.AccessToken))
                            {
                                var decrypted = DecryptToken(store.AccessToken);
                                canDecrypt = !string.IsNullOrEmpty(decrypted);
                                if (canDecrypt)
                                {
                                    // 復号化成功（最初の10文字のみ表示）
                                    decryptError = $"復号化成功: {decrypted.Substring(0, Math.Min(10, decrypted.Length))}...";
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            decryptError = $"復号化エラー: {ex.Message}";
                        }
                    }
                    
                    return new
                    {
                        s.Id,
                        s.Name,
                        s.Domain,
                        s.ShopifyShopId,
                        s.HasAccessToken,
                        s.AccessTokenLength,
                        s.AccessTokenPreview,
                        s.HasApiKey,
                        s.HasApiSecret,
                        s.ShopifyAppId,
                        s.ShopifyAppName,
                        s.IsActive,
                        s.LastSyncDate,
                        s.InitialSetupCompleted,
                        s.CreatedAt,
                        s.UpdatedAt,
                        CanDecryptToken = canDecrypt,
                        DecryptTestResult = decryptError
                    };
                }).ToList();

                return Ok(new
                {
                    message = "Storeテーブルの状態（AccessToken保存状況）",
                    count = storesWithDecryptTest.Count,
                    stores = storesWithDecryptTest,
                    timestamp = DateTime.UtcNow,
                    note = "AccessTokenは暗号化されて保存されています。DecryptTestResultで復号化の可否を確認できます。"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Storeテーブル確認中にエラーが発生");
                return StatusCode(500, new { error = "Failed to query Store table", details = ex.Message });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - 設定値確認テスト
        /// </summary>
        [HttpGet("test-settings")]
        [RequireDeveloperAuth]
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
        [RequireDeveloperAuth]
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
        private async Task<ShopifyTokenResponse?> ExchangeCodeForAccessTokenWithRetry(
            string code, 
            string shop, 
            string apiKey, 
            string? apiSecret)
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
                return await ExchangeCodeForAccessToken(code, shop, apiKey, apiSecret);
            });
        }

        /// <summary>
        /// 認証コードをアクセストークンに交換する
        /// </summary>
        private async Task<ShopifyTokenResponse?> ExchangeCodeForAccessToken(
            string code, 
            string shop, 
            string apiKey, 
            string? apiSecret)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30); // 30秒タイムアウト
                
                var tokenUrl = $"https://{shop}/admin/oauth/access_token";
                
                _logger.LogInformation("トークン交換開始. Shop: {Shop}, URL: {URL}, ClientId: {ClientId}", 
                    shop, tokenUrl, apiKey);
                
                var requestData = new
                {
                    client_id = apiKey,
                    client_secret = apiSecret,
                    code = code
                };

                var json = JsonSerializer.Serialize(requestData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                _logger.LogDebug("トークン交換リクエスト. Code: {Code}, ClientId: {ClientId}", 
                    code?.Substring(0, Math.Min(code.Length, 8)) + "***", apiKey);

                var response = await client.PostAsync(tokenUrl, content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("トークン取得失敗. Status: {Status}, Error: {Error}, Shop: {Shop}", 
                        response.StatusCode, errorContent, shop);
                    
                    // Shopify API エラーの詳細をログ出力
                    if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                    {
                        _logger.LogError("Shopify APIエラー (400 Bad Request): 無効なリクエストパラメータ");
                    }
                    else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized) 
                    {
                        _logger.LogError("Shopify APIエラー (401 Unauthorized): API Key/Secretが無効か、認証コードが無効");
                    }
                    else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        _logger.LogError("Shopify APIエラー (404 Not Found): ショップドメインが無効");
                    }
                    
                    return null;
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                if (string.IsNullOrEmpty(responseJson))
                {
                    _logger.LogError("Shopify OAuth応答が空です. Shop: {Shop}", shop);
                    return null;
                }
                
                _logger.LogDebug("トークン取得成功. Shop: {Shop}, Response Length: {Length}", 
                    shop, responseJson.Length);
                
                // デバッグ: Shopifyからの応答をログ出力（access_tokenはマスク）
                try
                {
                    var responseObj = JsonSerializer.Deserialize<JsonElement>(responseJson);
                    var maskedResponse = responseJson;
                    if (responseObj.TryGetProperty("access_token", out var accessTokenElement))
                    {
                        var accessToken = accessTokenElement.GetString();
                        if (!string.IsNullOrEmpty(accessToken))
                        {
                            // access_tokenをマスク（最初の10文字と最後の4文字のみ表示）
                            var maskedToken = accessToken.Length > 14 
                                ? $"{accessToken.Substring(0, 10)}...{accessToken.Substring(accessToken.Length - 4)}"
                                : "***";
                            maskedResponse = maskedResponse.Replace(accessToken, maskedToken);
                        }
                    }
                    _logger.LogInformation("Shopify OAuth応答（access_tokenマスク済み）: {Response}", maskedResponse);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Shopify応答のログ出力中にエラーが発生");
                }
                
                var tokenResponse = JsonSerializer.Deserialize<ShopifyTokenResponse>(responseJson);
                
                if (tokenResponse?.AccessToken != null)
                {
                    // scopeが空の場合は、OAuth URLでリクエストしたスコープを使用
                    if (string.IsNullOrWhiteSpace(tokenResponse.Scope))
                    {
                        var requestedScopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
                        _logger.LogWarning("Shopify応答にscopeが含まれていません. リクエストしたスコープを使用します. Shop: {Shop}, RequestedScopes: {Scopes}", 
                            shop, requestedScopes);
                        tokenResponse.Scope = requestedScopes;
                    }
                    
                    _logger.LogInformation("アクセストークン取得成功. Shop: {Shop}, 承認されたスコープ: {Scope}", 
                        shop, tokenResponse.Scope ?? "未設定");
                }
                else
                {
                    _logger.LogWarning("アクセストークンがレスポンスに含まれていません. Shop: {Shop}, Response: {Response}", 
                        shop, responseJson?.Substring(0, Math.Min(200, responseJson?.Length ?? 0)));
                }
                
                return tokenResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "アクセストークン取得中にエラーが発生. Shop: {Shop}", shop);
                throw;
            }
        }

        /// <summary>
        /// ストア情報をデータベースに保存または更新する
        /// </summary>
        /// <param name="shopDomain">ショップドメイン</param>
        /// <param name="accessToken">アクセストークン</param>
        /// <param name="apiKey">使用したAPI Key（オプション、後方互換性のため）</param>
        /// <param name="apiSecret">使用したAPI Secret（オプション、後方互換性のため）</param>
        /// <param name="shopifyAppId">ShopifyAppId（オプション、優先的に設定）</param>
        /// <param name="approvedScope">Shopifyから返された承認済みスコープ（オプション）</param>
        private async Task<int> SaveOrUpdateStore(
            string shopDomain, 
            string accessToken, 
            string? apiKey = null, 
            string? apiSecret = null,
            int? shopifyAppId = null,
            string? approvedScope = null)
        {
            try
            {
                // 既存のストアを検索（通常のDomainで検索、IsActiveは問わない）
                var store = await _context.Stores
                    .Include(s => s.ShopifyApp)
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
                    _logger.LogInformation("新規ストアを作成. Shop: {Shop}", shopDomain);
                }
                else
                {
                    // 既存レコードを更新（IsActiveがfalseの場合はtrueに戻す）
                    if (!store.IsActive)
                    {
                        _logger.LogInformation("ストアを再アクティブ化. Shop: {Shop}, StoreId: {StoreId}", 
                            shopDomain, store.Id);
                        store.IsActive = true;
                    }
                    _logger.LogInformation("既存ストアを更新. Shop: {Shop}, StoreId: {StoreId}", 
                        shopDomain, store.Id);
                }

                // ShopifyAppIdを設定（優先）
                if (shopifyAppId.HasValue)
                {
                    store.ShopifyAppId = shopifyAppId.Value;
                    _logger.LogInformation("ストアにShopifyAppIdを設定しました. Shop: {Shop}, ShopifyAppId: {ShopifyAppId}", 
                        shopDomain, shopifyAppId.Value);
                }
                // 後方互換性: ApiKey/ApiSecretが提供され、かつShopifyAppIdが設定されていない場合のみ保存
                else if (!string.IsNullOrEmpty(apiKey) && string.IsNullOrEmpty(store.ApiKey))
                {
                    store.ApiKey = apiKey;
                    _logger.LogInformation("ストア固有のAPI Keyを保存しました（後方互換性）. Shop: {Shop}", shopDomain);
                }
                
                if (!string.IsNullOrEmpty(apiSecret) && string.IsNullOrEmpty(store.ApiSecret))
                {
                    store.ApiSecret = apiSecret;
                    _logger.LogInformation("ストア固有のAPI Secretを保存しました（後方互換性）. Shop: {Shop}", shopDomain);
                }

                // アクセストークンを保存
                store.AccessToken = EncryptToken(accessToken);

                // トークンと認証情報を更新（暗号化して保存）
                // 承認済みスコープが提供されている場合はそれを使用、なければ設定ファイルのスコープを使用
                var scopeToSave = !string.IsNullOrWhiteSpace(approvedScope) 
                    ? approvedScope 
                    : GetShopifySetting("Scopes");
                
                store.Settings = JsonSerializer.Serialize(new
                {
                    ShopifyAccessToken = EncryptToken(accessToken),
                    ShopifyScope = scopeToSave,
                    InstalledAt = DateTime.UtcNow,
                    LastTokenRefresh = DateTime.UtcNow
                });
                store.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                
                _logger.LogInformation("ストア情報を保存しました. Shop: {Shop}, StoreId: {StoreId}, ShopifyAppId: {ShopifyAppId}, HasApiKey: {HasApiKey}", 
                    shopDomain, store.Id, store.ShopifyAppId, !string.IsNullOrEmpty(store.ApiKey));
                
                return store.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ストア情報の保存中にエラーが発生. Shop: {Shop}", shopDomain);
                throw;
            }
        }

        /// <summary>
        /// ✅ 案1: インストール直後に trialing サブスクを自動付与（全機能解放）
        /// - 既に active/trialing/pending が存在する場合は何もしない
        /// - Shopify課金APIは呼ばず、ローカルDB上の trialing として扱う
        /// </summary>
        private async Task EnsureTrialSubscriptionAsync(int storeId)
        {
            try
            {
                var existing = await _context.StoreSubscriptions
                    .FirstOrDefaultAsync(s =>
                        s.StoreId == storeId &&
                        (s.Status == "active" || s.Status == "trialing" || s.Status == "pending"));

                if (existing != null)
                {
                    _logger.LogInformation(
                        "Trial subscription skipped (already exists). StoreId: {StoreId}, Status: {Status}, SubscriptionId: {SubscriptionId}",
                        storeId, existing.Status, existing.Id);
                    return;
                }

                // 「Free」以外の最安有効プランをトライアル対象として採用（存在しない場合は最初の有効プラン）
                var trialPlan = await _context.SubscriptionPlans
                    .Where(p => p.IsActive && p.Name != "Free")
                    .OrderBy(p => p.Price)
                    .FirstOrDefaultAsync();

                if (trialPlan == null)
                {
                    trialPlan = await _context.SubscriptionPlans
                        .Where(p => p.IsActive)
                        .OrderBy(p => p.Price)
                        .FirstOrDefaultAsync();
                }

                if (trialPlan == null)
                {
                    _logger.LogWarning("Trial subscription could not be created because no active SubscriptionPlan exists. StoreId: {StoreId}", storeId);
                    return;
                }

                var trialDays = trialPlan.TrialDays > 0 ? trialPlan.TrialDays : 14;
                var now = DateTime.UtcNow;

                var trialSubscription = new StoreSubscription
                {
                    StoreId = storeId,
                    PlanId = trialPlan.Id,
                    PlanName = trialPlan.Name,
                    Status = "trialing",
                    ActivatedAt = now,
                    TrialEndsAt = now.AddDays(trialDays),
                    CurrentPeriodEnd = now.AddDays(trialDays),
                    CreatedAt = now,
                    UpdatedAt = now
                };

                _context.StoreSubscriptions.Add(trialSubscription);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Trial subscription created. StoreId: {StoreId}, PlanId: {PlanId}, PlanName: {PlanName}, TrialDays: {TrialDays}, TrialEndsAt: {TrialEndsAt}",
                    storeId, trialPlan.Id, trialPlan.Name, trialDays, trialSubscription.TrialEndsAt);
            }
            catch (Exception ex)
            {
                // トライアル作成に失敗してもOAuthは完了させたい（致命ではない）
                _logger.LogError(ex, "Failed to ensure trial subscription. StoreId: {StoreId}", storeId);
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
        /// HMACを検証する（ShopifySharpライブラリ使用）
        /// </summary>
        private async Task<bool> VerifyHmacAsync(string code, string shop, string state, string timestamp, string hmac)
        {
            // ストア固有のCredentialsを取得
            var (apiKey, apiSecret) = await GetShopifyCredentialsAsync(shop);
            
            if (string.IsNullOrWhiteSpace(apiSecret))
            {
                _logger.LogError("HMAC検証エラー: ApiSecretが設定されていません. Shop: {Shop}", shop);
                return false;
            }
            
            var secret = apiSecret;

            try
            {
                // 開発環境でのデバッグ情報出力
                var isDevelopment = _configuration["ASPNETCORE_ENVIRONMENT"] == "Development";
                
                // すべてのクエリパラメータを収集（ShopifySharp用）
                var queryParams = new List<KeyValuePair<string, StringValues>>();
                foreach (var queryParam in HttpContext.Request.Query)
                {
                    queryParams.Add(new KeyValuePair<string, StringValues>(queryParam.Key, queryParam.Value));
                }

                if (isDevelopment)
                {
                    _logger.LogInformation("=== HMAC検証開始（ShopifySharp使用） ===");
                    _logger.LogInformation("受信したパラメータ:");
                    foreach (var p in queryParams.OrderBy(x => x.Key))
                    {
                        _logger.LogInformation("  {Key}: {Value}", p.Key, string.Join(",", p.Value));
                    }
                    _logger.LogInformation("受信HMAC: {Hmac}", hmac);
                    _logger.LogInformation("使用するAPIシークレット: {Secret}", secret.Substring(0, Math.Min(4, secret.Length)) + "..." + secret.Substring(Math.Max(0, secret.Length - 4)));
                }

                // ShopifySharpライブラリでHMAC検証
                var validator = new ShopifyRequestValidationUtility();
                var isValid = validator.IsAuthenticRequest(queryParams, secret);

                if (isDevelopment)
                {
                    _logger.LogInformation("ShopifySharp検証結果: {IsValid}", isValid);
                }

                if (!isValid)
                {
                    // フォールバック: 手動検証も試みる（デバッグ用）
                    if (isDevelopment)
                    {
                        _logger.LogWarning("ShopifySharp検証失敗。手動検証を試みます...");
                        
                        // 手動でパラメータを構築
                        var manualParams = new Dictionary<string, string>();
                        foreach (var queryParam in HttpContext.Request.Query)
                        {
                            var key = queryParam.Key;
                            var value = queryParam.Value.FirstOrDefault() ?? "";
                            
                            if (!string.Equals(key, "hmac", StringComparison.OrdinalIgnoreCase) && 
                                !string.Equals(key, "signature", StringComparison.OrdinalIgnoreCase))
                            {
                                manualParams[key] = value;
                            }
                        }
                        
                        var sortedParams = manualParams
                            .OrderBy(p => p.Key, StringComparer.Ordinal)
                            .ToList();
                        
                        var queryString = string.Join("&", 
                            sortedParams.Select(p => $"{p.Key}={p.Value}"));
                        
                        _logger.LogInformation("手動構築したクエリ文字列: {QueryString}", queryString);
                        
                        using (var hmacSha256 = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
                        {
                            var hashBytes = hmacSha256.ComputeHash(Encoding.UTF8.GetBytes(queryString));
                            var computedHmac = BitConverter.ToString(hashBytes)
                                .Replace("-", "")
                                .ToLower();
                            
                            _logger.LogInformation("手動計算HMAC: {Computed}", computedHmac);
                            _logger.LogInformation("受信HMAC: {Received}", hmac);
                            _logger.LogInformation("手動検証一致: {Match}", string.Equals(computedHmac, hmac, StringComparison.OrdinalIgnoreCase));
                        }
                    }
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HMAC検証中にエラーが発生");
                return false;
            }
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
        /// API KeyからAPI Secretを取得する（ShopifyAppsテーブル優先、フォールバックは環境変数）
        /// </summary>
        /// <param name="apiKey">Shopify API Key</param>
        /// <returns>API Secret（見つからない場合はnull）</returns>
        private async Task<string?> GetApiSecretByApiKeyAsync(string apiKey)
        {
            try
            {
                // 1. ShopifyAppsテーブルから取得（優先）
                var shopifyApp = await _context.ShopifyApps
                    .FirstOrDefaultAsync(a => a.ApiKey == apiKey && a.IsActive);
                
                if (shopifyApp != null)
                {
                    _logger.LogInformation("ShopifyAppテーブルからAPI Secretを取得. ApiKey: {ApiKey}, App: {AppName}", 
                        apiKey, shopifyApp.Name);
                    return shopifyApp.ApiSecret;
                }
                
                // 2. フォールバック: 環境変数から取得
                var defaultApiSecret = GetShopifySetting("ApiSecret");
                if (!string.IsNullOrEmpty(defaultApiSecret))
                {
                    _logger.LogInformation("環境変数からAPI Secretを取得. ApiKey: {ApiKey}", apiKey);
                    return defaultApiSecret;
                }
                
                _logger.LogWarning("API Secretが見つかりません. ApiKey: {ApiKey}", apiKey);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API Secret取得中にエラーが発生. ApiKey: {ApiKey}", apiKey);
                return null;
            }
        }

        /// <summary>
        /// API KeyからAPI Secretを取得する（同期版、後方互換性のため）
        /// </summary>
        /// <param name="apiKey">Shopify API Key</param>
        /// <returns>API Secret（見つからない場合はnull）</returns>
        private string? GetApiSecretByApiKey(string apiKey)
        {
            // 環境変数から取得（非同期版はGetApiSecretByApiKeyAsyncを使用）
            return GetShopifySetting("ApiSecret");
        }

        /// <summary>
        /// API KeyからApp URLを取得
        /// </summary>
        /// <param name="apiKey">Shopify API Key</param>
        /// <returns>App URL</returns>
        private async Task<string> GetShopifyAppUrlAsync(string apiKey)
        {
            var shopifyApp = await _context.ShopifyApps
                .FirstOrDefaultAsync(a => a.ApiKey == apiKey && a.IsActive);
            
            if (shopifyApp != null && !string.IsNullOrEmpty(shopifyApp.AppUrl))
            {
                return shopifyApp.AppUrl;
            }
            
            // フォールバック: 環境変数から取得
            return GetShopifySetting("AppUrl") ?? "https://localhost:3000";
        }

        /// <summary>
        /// ストアドメインに基づいてShopify Credentialsを取得する
        /// 優先順位: 1. ShopifyAppテーブル 2. Store.ApiKey/ApiSecret（後方互換性） 3. 環境変数
        /// </summary>
        /// <param name="shopDomain">ショップドメイン（例: example.myshopify.com）</param>
        /// <returns>API KeyとAPI Secretのタプル</returns>
        private async Task<(string ApiKey, string ApiSecret)> GetShopifyCredentialsAsync(string shopDomain)
        {
            try
            {
                // 1. データベースからストア情報を取得（ShopifyAppを含む）
                var store = await _context.Stores
                    .Include(s => s.ShopifyApp)
                    .FirstOrDefaultAsync(s => s.Domain == shopDomain);
                
                // 2. ShopifyAppテーブルから取得（優先）
                if (store?.ShopifyApp != null && store.ShopifyApp.IsActive)
                {
                    _logger.LogInformation("ShopifyAppテーブルからCredentialsを取得. Shop: {Shop}, App: {AppName}", 
                        shopDomain, store.ShopifyApp.Name);
                    return (store.ShopifyApp.ApiKey, store.ShopifyApp.ApiSecret);
                }
                
                // 3. 後方互換性: Store.ApiKey/ApiSecretから取得
                if (store != null && 
                    !string.IsNullOrEmpty(store.ApiKey) && 
                    !string.IsNullOrEmpty(store.ApiSecret))
                {
                    _logger.LogInformation("ストア固有のCredentialsを使用（後方互換性）. Shop: {Shop}", shopDomain);
                    return (store.ApiKey, store.ApiSecret);
                }
                
                // 4. フォールバック: 環境変数/設定ファイルから取得
                var defaultApiKey = GetShopifySetting("ApiKey");
                var defaultApiSecret = GetShopifySetting("ApiSecret");
                
                if (string.IsNullOrEmpty(defaultApiKey))
                {
                    _logger.LogError("API Keyが見つかりません. Shop: {Shop}", shopDomain);
                    throw new InvalidOperationException($"API Key not configured for shop: {shopDomain}");
                }
                
                _logger.LogInformation("デフォルトCredentialsを使用（設定ファイル/環境変数）. Shop: {Shop}", shopDomain);
                return (defaultApiKey, defaultApiSecret);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Credentials取得中にエラーが発生. Shop: {Shop}, フォールバックを使用", shopDomain);
                // エラー時は環境変数のデフォルト値を使用
                var defaultApiKey = GetShopifySetting("ApiKey");
                var defaultApiSecret = GetShopifySetting("ApiSecret");
                return (defaultApiKey, defaultApiSecret);
            }
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
            [JsonPropertyName("access_token")]
            public string? AccessToken { get; set; }
            
            [JsonPropertyName("scope")]
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
        /// OAuth stateデータ（キャッシュに保存する情報）
        /// </summary>
        private class StateData
        {
            public string shop { get; set; } = string.Empty;
            public string apiKey { get; set; } = string.Empty;
            public string? apiSecret { get; set; }
            public int? shopifyAppId { get; set; }
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