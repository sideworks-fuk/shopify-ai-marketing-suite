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
    /// Shopify OAuth認証を処理するコントローラー
    /// </summary>
    /// <remarks>
    /// このファイルはPartial classの一部です:
    /// - ShopifyAuthController.cs (このファイル): メインのOAuthフロー
    /// - ShopifyAuthController.Debug.cs: デバッグ・テスト用エンドポイント
    /// - ShopifyAuthController.Private.cs: Privateメソッドと内部クラス
    /// </remarks>
    [ApiController]
    [Route("api/shopify")]
    public partial class ShopifyAuthController : ControllerBase
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
                _logger.LogError(ex, "Error occurred while getting OAuth URL. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey ?? "not specified");
                return StatusCode(500, new { error = "Failed to get OAuth URL", details = ex.Message });
            }
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
                // 🆕 デバッグ: エンドポイント到達を確認
                _logger.LogInformation("🚀 ===== /api/shopify/install エンドポイント到達 ===== ");
                _logger.LogInformation("📍 リクエストURL: {RequestUrl}", HttpContext.Request.GetDisplayUrl());
                _logger.LogInformation("📍 Shop: {Shop}", shop);
                _logger.LogInformation("📍 ApiKey: {ApiKey}", apiKey ?? "未指定");
                _logger.LogInformation("📍 リクエスト時刻: {Timestamp}", DateTime.UtcNow);
                _logger.LogInformation("📍 リクエストヘッダー: {Headers}", 
                    string.Join(", ", HttpContext.Request.Headers.Select(h => $"{h.Key}={h.Value}")));

                // デバッグ: リクエストパラメータをログ出力
                _logger.LogInformation("===== OAuth Install Started ===== Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);

                var authUrl = await BuildOAuthUrlAsync(shop, apiKey);
                if (string.IsNullOrEmpty(authUrl))
                {
                    _logger.LogError("❌ OAuth URL生成失敗. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey ?? "未指定");
                    return BadRequest(new { error = "Invalid shop domain or failed to build OAuth URL" });
                }

                _logger.LogInformation("✅ OAuth URL生成成功. AuthUrl: {AuthUrl}", authUrl);
                _logger.LogInformation("🔄 Shopify認証ページにリダイレクトします");

                // Shopifyの認証ページにリダイレクト
                return Redirect(authUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ /api/shopify/install エラー発生. Shop: {Shop}", shop);
                return await HandleOAuthError(ex, shop, "Install");
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
                _logger.LogInformation("OAuth callback received. Shop: {Shop}, State: {State}", shop, state);

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

                    if (!isValidHmac)
                    {
                        _logger.LogError("HMAC検証失敗. Shop: {Shop}, IsDevelopment: {IsDevelopment}", shop, isDevelopment);

                        if (isDevelopment)
                        {
                            // 開発環境でもエラーログを出力（本番環境ではエラーになることを警告）
                            _logger.LogWarning("Development environment: HMAC verification failure is allowed, but will cause error in production");
                        }
                        else
                        {
                            // 本番環境ではエラーを返す
                            return Unauthorized(new { error = "HMAC validation failed" });
                        }
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
                    _logger.LogError("Failed to obtain access token. Shop: {Shop}", shop);
                    return StatusCode(500, new { error = "Failed to obtain access token" });
                }

                // OAuth認証成功後の共通処理（ストア保存、Webhook登録、トライアル付与）
                var storeId = await ProcessOAuthSuccessAsync(
                    shop,
                    tokenResponse.AccessToken,
                    stateData.apiKey,
                    stateData.apiSecret,
                    stateData.shopifyAppId,
                    tokenResponse.Scope);

                // セッションCookieを設定
                await SetOAuthSessionCookie(storeId, shop);

                // リダイレクトURLを構築
                var hostParam = HttpContext.Request.Query["host"].ToString();
                var embeddedParam = HttpContext.Request.Query["embedded"].ToString();
                var redirectUrl = await BuildRedirectUrlAsync(shop, storeId, stateData.apiKey, hostParam, embeddedParam);

                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during OAuth callback processing. Shop: {Shop}", shop);
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
                var stateDataJson = _cache.Get<string>(cacheKey);

                if (string.IsNullOrEmpty(stateDataJson))
                {
                    _logger.LogWarning("無効なstate. Shop: {Shop}, State: {State}", request.Shop, request.State);
                    return Unauthorized(new { error = "Invalid state parameter" });
                }

                // stateからAPI Key/Secret/ShopifyAppIdを取得
                var stateData = JsonSerializer.Deserialize<StateData>(stateDataJson);
                if (stateData == null || string.IsNullOrEmpty(stateData.apiKey))
                {
                    _logger.LogError("OAuthコールバック: stateデータの解析に失敗. Shop: {Shop}", request.Shop);
                    return StatusCode(500, new { error = "Failed to parse state data" });
                }

                // State検証: stateに含まれるshopとリクエストのshopが一致するか確認
                if (stateData.shop != request.Shop)
                {
                    _logger.LogWarning("stateのshopとリクエストのshopが一致しません. StateShop: {StateShop}, RequestShop: {RequestShop}",
                        stateData.shop, request.Shop);
                    return Unauthorized(new { error = "Invalid state parameter" });
                }

                // キャッシュからstateを削除（使い捨て）
                _cache.Remove(cacheKey);

                // 開発環境判定
                var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();

                // HMAC検証（ShopifySharpライブラリ使用）
                if (!string.IsNullOrWhiteSpace(request.Hmac) && !string.IsNullOrWhiteSpace(request.Timestamp))
                {
                    // クエリパラメータをShopifyOAuthService用に準備
                    var queryParams = new List<KeyValuePair<string, StringValues>>
                    {
                        new("code", request.Code),
                        new("shop", request.Shop),
                        new("state", request.State),
                        new("timestamp", request.Timestamp),
                        new("hmac", request.Hmac)
                    };

                    // stateに含めたApiSecret（ShopifyApps由来）をHMAC検証に使用（マルチアプリ対応）
                    var isValidHmac = _oauthService.VerifyHmac(queryParams, secretOverride: stateData.apiSecret);

                    if (!isValidHmac)
                    {
                        _logger.LogError("HMAC検証失敗. Shop: {Shop}, IsDevelopment: {IsDevelopment}", request.Shop, isDevelopment);

                        if (isDevelopment)
                        {
                            // 開発環境でもエラーログを出力（本番環境ではエラーになることを警告）
                            _logger.LogWarning("Development environment: HMAC verification failure is allowed, but will cause error in production");
                        }
                        else
                        {
                            // 本番環境ではエラーを返す
                            return Unauthorized(new { error = "HMAC validation failed" });
                        }
                    }
                }

                // stateDataからAPI Key/Secret/ShopifyAppIdを取得（Callbackメソッドと同様）
                var apiKey = stateData.apiKey;
                var apiSecret = stateData.apiSecret;
                var shopifyAppId = stateData.shopifyAppId;

                // アクセストークンを取得（リトライ機能付き）
                var tokenResponse = await ExchangeCodeForAccessTokenWithRetry(
                    request.Code,
                    request.Shop,
                    apiKey,
                    apiSecret);
                if (tokenResponse == null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
                {
                    _logger.LogError("Failed to obtain access token. Shop: {Shop}", request.Shop);
                    return StatusCode(500, new { error = "Failed to obtain access token" });
                }

                // OAuth認証成功後の共通処理（ストア保存、Webhook登録、トライアル付与）
                var storeId = await ProcessOAuthSuccessAsync(
                    request.Shop,
                    tokenResponse.AccessToken,
                    apiKey,
                    apiSecret,
                    shopifyAppId,
                    tokenResponse.Scope);

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
    }
}