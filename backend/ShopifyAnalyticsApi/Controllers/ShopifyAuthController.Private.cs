using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using ShopifyAnalyticsApi.Services;
using ShopifyAnalyticsApi.Models;
using ShopifyAnalyticsApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.Extensions;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Hangfire;
using Polly;
using ShopifySharp.Utilities;
using Microsoft.Extensions.Primitives;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// ShopifyAuthController - Privateメソッドと内部クラス
    /// </summary>
    /// <remarks>
    /// このファイルはPartial classの一部です:
    /// - ShopifyAuthController.cs: メインのOAuthフロー（フィールド、コンストラクタ、Publicエンドポイント）
    /// - ShopifyAuthController.Debug.cs: デバッグ・テスト用エンドポイント
    /// - ShopifyAuthController.Private.cs (このファイル): Privateメソッドと内部クラス
    /// </remarks>
    public partial class ShopifyAuthController
    {
        #region Private Methods - URL & Redirect

        /// <summary>
        /// リダイレクトURIを取得する（常にフロントエンドプロキシ方式）
        /// </summary>
        /// <remarks>
        /// Shopify埋め込みアプリでは、iframe内でのOAuth認証がShopifyのセキュリティポリシーによりブロックされるため、
        /// 常にフロントエンドプロキシ方式を使用する必要があります。
        /// フロントエンドのApp Bridge Redirect.toRemote()を使用してトップレベルウィンドウでOAuth認証を行います。
        /// </remarks>
        private async Task<string> GetRedirectUriAsync(string? apiKey = null)
        {
            // 🆕 常にフロントエンドプロキシ方式を使用（Shopify埋め込みアプリの要件）
            // iframe内でのOAuth認証はShopifyのセキュリティポリシーによりブロックされるため、
            // フロントエンドのApp Bridge Redirect.toRemote()を使用してトップレベルウィンドウで
            // OAuth認証を行う必要がある

            // データベースからフロントエンドURL（AppUrl）を取得
            string? frontendUrl = null;

            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                var shopifyApp = await _context.ShopifyApps
                    .Where(a => a.ApiKey == apiKey && a.IsActive)
                    .Select(a => a.AppUrl)
                    .FirstOrDefaultAsync();

                if (!string.IsNullOrWhiteSpace(shopifyApp))
                {
                    frontendUrl = shopifyApp;
                    _logger.LogInformation("GetRedirectUriAsync: AppUrl found from database for apiKey={ApiKey}, AppUrl={AppUrl}",
                        apiKey?.Substring(0, Math.Min(8, apiKey.Length)) + "...", frontendUrl);
                }
            }

            // apiKeyが指定されていない、またはデータベースから取得できなかった場合
            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                frontendUrl = await _context.ShopifyApps
                    .Where(a => a.IsActive && !string.IsNullOrEmpty(a.AppUrl))
                    .OrderBy(a => a.Id)
                    .Select(a => a.AppUrl)
                    .FirstOrDefaultAsync();

                if (!string.IsNullOrWhiteSpace(frontendUrl))
                {
                    _logger.LogInformation("GetRedirectUriAsync: Using default AppUrl from database: {AppUrl}", frontendUrl);
                }
            }

            // 環境変数からのフォールバック
            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                frontendUrl = Environment.GetEnvironmentVariable("SHOPIFY_FRONTEND_BASEURL") ??
                              _configuration["Frontend:BaseUrl"];

                if (!string.IsNullOrWhiteSpace(frontendUrl))
                {
                    _logger.LogWarning("GetRedirectUriAsync: Using fallback URL from environment variable: {FrontendUrl}", frontendUrl);
                }
            }

            if (!string.IsNullOrWhiteSpace(frontendUrl))
            {
                var redirectUri = $"{frontendUrl.TrimEnd('/')}/api/shopify/callback";
                _logger.LogInformation("GetRedirectUriAsync: Redirect URI generated (frontend proxy): FrontendUrl={FrontendUrl}, RedirectUri={RedirectUri}",
                    frontendUrl, redirectUri);
                return redirectUri;
            }

            // フォールバック: フロントエンドURLが取得できない場合はエラー
            _logger.LogError("GetRedirectUriAsync: Frontend URL not configured. Please set AppUrl in ShopifyApps table or SHOPIFY_FRONTEND_BASEURL environment variable.");
            throw new InvalidOperationException("Frontend URL is not configured. OAuth authentication requires a frontend URL for redirect.");
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
                        _logger.LogError("API Secret not found for API Key. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
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

            _logger.LogInformation("OAuth authentication started. Shop: {Shop}, State: {State}, ApiKey: {ApiKey}", shop, state, finalApiKey);

            // Shopify OAuth URLを構築
            var scopes = GetShopifySetting("Scopes", "read_orders,read_products");
            _logger.LogInformation("OAuth scopes: {Scopes}", scopes);

            // マルチアプリ対応: AppUrlを取得（フロントエンドへのリダイレクト用）
            if (string.IsNullOrWhiteSpace(shopifyAppUrl))
            {
                shopifyAppUrl = await _context.ShopifyApps
                    .Where(a => a.ApiKey == finalApiKey && a.IsActive)
                    .Select(a => a.AppUrl)
                    .FirstOrDefaultAsync();
            }

            // redirect_uriの決定:
            // フロントエンドプロキシを使用する場合はデータベースからAppUrlを取得して使用
            // それ以外の場合はバックエンドURLを使用
            _logger.LogInformation("🔍 [BuildOAuthUrlAsync] GetRedirectUriAsync呼び出し前. Shop: {Shop}, ApiKey: {ApiKey}", 
                shop, finalApiKey?.Substring(0, Math.Min(8, finalApiKey?.Length ?? 0)) + "...");
            var redirectUri = await GetRedirectUriAsync(finalApiKey);
            _logger.LogInformation("✅ [BuildOAuthUrlAsync] GetRedirectUriAsync呼び出し後. RedirectUri: {RedirectUri}", redirectUri);
            _logger.LogInformation("OAuth redirect_uri決定. Shop: {Shop}, ApiKey: {ApiKey}, RedirectUri: {RedirectUri}", shop, finalApiKey, redirectUri);

            var authUrl = $"https://{shop}/admin/oauth/authorize" +
                $"?client_id={finalApiKey}" +
                $"&scope={scopes}" +
                $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                $"&state={state}";

            _logger.LogInformation("Generated OAuth authorization URL: {AuthUrl}", authUrl);

            // 🆕 追加: OAuth URLの最終パラメータを明示的にログ出力（見やすい形式）
            _logger.LogInformation("========== OAuth URL Summary ==========");
            _logger.LogInformation("  Shop: {Shop}", shop);
            _logger.LogInformation("  ApiKey: {ApiKey}", finalApiKey);
            _logger.LogInformation("  Scopes: {Scopes}", scopes);
            _logger.LogInformation("  RedirectUri (raw): {RedirectUri}", redirectUri);
            _logger.LogInformation("  RedirectUri (encoded): {RedirectUriEncoded}", Uri.EscapeDataString(redirectUri));
            _logger.LogInformation("  State: {State}", state);
            _logger.LogInformation("  Full AuthUrl: {AuthUrl}", authUrl);
            _logger.LogInformation("========================================");

            return authUrl;
        }

        /// <summary>
        /// OAuth認証成功後のリダイレクトURLを構築する
        /// </summary>
        /// <param name="shop">ショップドメイン</param>
        /// <param name="storeId">ストアID</param>
        /// <param name="apiKey">API Key</param>
        /// <param name="hostParam">hostパラメータ（Base64エンコード）</param>
        /// <param name="embeddedParam">embeddedパラメータ</param>
        /// <returns>リダイレクトURL</returns>
        private async Task<string> BuildRedirectUrlAsync(
            string shop,
            int storeId,
            string apiKey,
            string? hostParam,
            string? embeddedParam)
        {
            // 埋め込みアプリの場合
            if (!string.IsNullOrWhiteSpace(hostParam))
            {
                // hostパラメータをデコード
                var decodedHost = DecodeHost(hostParam);
                _logger.LogInformation("BuildRedirectUrlAsync: hostParam={HostParam}, decodedHost={DecodedHost}", hostParam, decodedHost);

                if (!string.IsNullOrWhiteSpace(decodedHost))
                {
                    // 埋め込みアプリの場合、OAuthコールバック後は既にiframeから脱出しているため、
                    // ExitIframePageを経由せず、直接/auth/successにリダイレクト
                    // 注意: Shopify管理画面がiframeでアプリを読み込む際、カスタムパラメータは破棄されるため、
                    // /auth/successページで認証状態を設定し、その後Shopify管理画面にリダイレクトする
                    var appUrl = await GetShopifyAppUrlAsync(apiKey);
                    _logger.LogInformation("BuildRedirectUrlAsync: apiKey={ApiKey}, appUrl={AppUrl}",
                        apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)) + "...", appUrl);

                    if (string.IsNullOrWhiteSpace(appUrl))
                    {
                        _logger.LogError("BuildRedirectUrlAsync: Failed to get AppUrl. apiKey={ApiKey}",
                            apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)) + "...");
                        throw new InvalidOperationException("AppUrl is not configured. Please check ShopifyApps table or environment variables.");
                    }

                    var finalRedirectUrl = $"{appUrl.TrimEnd('/')}/auth/success?shop={Uri.EscapeDataString(shop)}&storeId={storeId}&success=true&host={Uri.EscapeDataString(hostParam)}";
                    if (!string.IsNullOrWhiteSpace(embeddedParam))
                    {
                        finalRedirectUrl += $"&embedded={Uri.EscapeDataString(embeddedParam)}";
                    }

                    _logger.LogInformation("Built embedded app URL (direct to /auth/success): {RedirectUrl}", finalRedirectUrl);
                    return finalRedirectUrl;
                }
                else
                {
                    // デコードに失敗した場合はフォールバック
                    var appUrl = await GetShopifyAppUrlAsync(apiKey);
                    _logger.LogWarning("BuildRedirectUrlAsync: Failed to decode host parameter. appUrl={AppUrl}", appUrl);

                    if (string.IsNullOrWhiteSpace(appUrl))
                    {
                        _logger.LogError("BuildRedirectUrlAsync: Failed to get AppUrl (fallback). apiKey={ApiKey}",
                            apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)) + "...");
                        throw new InvalidOperationException("AppUrl is not configured. Please check ShopifyApps table or environment variables.");
                    }

                    var redirectUrl = $"{appUrl.TrimEnd('/')}/auth/success?shop={Uri.EscapeDataString(shop)}&storeId={storeId}&success=true&host={Uri.EscapeDataString(hostParam)}";
                    _logger.LogWarning("Using fallback URL due to host parameter decode failure: {RedirectUrl}", redirectUrl);
                    return redirectUrl;
                }
            }
            else
            {
                // 非埋め込みアプリの場合
                var appUrl = await GetShopifyAppUrlAsync(apiKey);
                _logger.LogInformation("BuildRedirectUrlAsync: Non-embedded app. apiKey={ApiKey}, appUrl={AppUrl}",
                    apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)) + "...", appUrl);

                if (string.IsNullOrWhiteSpace(appUrl))
                {
                    _logger.LogError("BuildRedirectUrlAsync: Failed to get AppUrl (non-embedded). apiKey={ApiKey}",
                        apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)) + "...");
                    throw new InvalidOperationException("AppUrl is not configured. Please check ShopifyApps table or environment variables.");
                }

                var redirectUrl = $"{appUrl.TrimEnd('/')}/auth/success?shop={Uri.EscapeDataString(shop)}&storeId={storeId}&success=true";
                if (!string.IsNullOrWhiteSpace(embeddedParam))
                {
                    redirectUrl += $"&embedded={Uri.EscapeDataString(embeddedParam)}";
                }
                _logger.LogInformation("Built non-embedded app URL: {RedirectUrl}", redirectUrl);
                return redirectUrl;
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

        #endregion

        #region Private Methods - Token Exchange

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

                _logger.LogInformation("Starting token exchange. Shop: {Shop}, URL: {URL}, ClientId: {ClientId}",
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
                        _logger.LogError("Shopify API error (400 Bad Request): Invalid request parameters");
                    }
                    else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                    {
                        _logger.LogError("Shopify API error (401 Unauthorized): Invalid API Key/Secret or authorization code");
                    }
                    else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        _logger.LogError("Shopify API error (404 Not Found): Invalid shop domain");
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
                        var requestedScopes = GetShopifySetting("Scopes", "read_orders,read_products");
                        _logger.LogWarning("Shopify応答にscopeが含まれていません. リクエストしたスコープを使用します. Shop: {Shop}, RequestedScopes: {Scopes}",
                            shop, requestedScopes);
                        tokenResponse.Scope = requestedScopes;
                    }

                    _logger.LogInformation("Access token obtained successfully. Shop: {Shop}, Approved scopes: {Scope}",
                        shop, tokenResponse.Scope ?? "not set");
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

        #endregion

        #region Private Methods - Store Management

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

                // フォールバック: Domainで見つからない場合、旧リネーム済みレコードをSettingsのOriginalDomainで検索
                if (store == null)
                {
                    var allInactiveStores = await _context.Stores
                        .Include(s => s.ShopifyApp)
                        .Where(s => !s.IsActive && !string.IsNullOrEmpty(s.Settings))
                        .ToListAsync();

                    store = allInactiveStores.FirstOrDefault(s =>
                    {
                        try
                        {
                            var settings = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(s.Settings!);
                            return settings != null
                                && settings.TryGetValue("OriginalDomain", out var od)
                                && od.GetString() == shopDomain;
                        }
                        catch { return false; }
                    });

                    if (store != null)
                    {
                        _logger.LogInformation(
                            "Found previously uninstalled store by OriginalDomain. Shop: {Shop}, StoreId: {StoreId}, OldDomain: {OldDomain}",
                            shopDomain, store.Id, store.Domain);
                        store.Domain = shopDomain;
                    }
                }

                if (store != null && !store.IsActive)
                {
                    // 再インストール検知: 旧レコードのDomainをクリアし、削除ジョブもキャンセルする
                    _logger.LogInformation(
                        "Reinstall detected: old store (StoreId: {OldStoreId}) is inactive. Clearing Domain and cancelling deletion job to protect new store. Shop: {Shop}",
                        store.Id, shopDomain);
                    store.Domain = null; // 同一Domainによる検索競合を防ぐ
                    store.UpdatedAt = DateTime.UtcNow;
                    CancelScheduledDeletion(store); // 重要: 旧ジョブが新ストアのデータを誤削除しないようキャンセル
                    // EF Core が変更をトラッキング済み。後のSaveChangesAsyncで新旧レコードを同時保存する
                    store = null;
                }

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
                    _logger.LogInformation("Created new store. Shop: {Shop}", shopDomain);
                }
                else
                {
                    _logger.LogInformation("Updating existing store. Shop: {Shop}, StoreId: {StoreId}",
                        shopDomain, store.Id);
                }

                // ShopifyAppIdを設定（優先）
                if (shopifyAppId.HasValue)
                {
                    store.ShopifyAppId = shopifyAppId.Value;
                    _logger.LogInformation("Set ShopifyAppId to store. Shop: {Shop}, ShopifyAppId: {ShopifyAppId}",
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
                    _logger.LogInformation("Saved store-specific API Secret (backward compatibility). Shop: {Shop}", shopDomain);
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

                _logger.LogInformation("Store information saved. Shop: {Shop}, StoreId: {StoreId}, ShopifyAppId: {ShopifyAppId}, HasApiKey: {HasApiKey}",
                    shopDomain, store.Id, store.ShopifyAppId, !string.IsNullOrEmpty(store.ApiKey));

                return store.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while saving store information. Shop: {Shop}", shopDomain);
                throw;
            }
        }

        /// <summary>
        /// 予約済みデータ削除ジョブをキャンセルする（再インストール時に使用）
        /// </summary>
        private void CancelScheduledDeletion(Store store)
        {
            if (string.IsNullOrEmpty(store.Settings)) return;

            try
            {
                var settings = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(store.Settings);
                if (settings != null && settings.TryGetValue("DeletionJobId", out var jobIdElement))
                {
                    var jobId = jobIdElement.GetString();
                    if (!string.IsNullOrEmpty(jobId))
                    {
                        var deleted = BackgroundJob.Delete(jobId);
                        _logger.LogInformation(
                            "Cancelled scheduled data deletion. StoreId: {StoreId}, JobId: {JobId}, Success: {Success}",
                            store.Id, jobId, deleted);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to cancel scheduled deletion job. StoreId: {StoreId}", store.Id);
            }
        }

        /// <summary>
        /// OAuth認証成功後の共通処理（ストア保存、Webhook登録、トライアル付与）
        /// </summary>
        /// <param name="shop">ショップドメイン</param>
        /// <param name="accessToken">アクセストークン</param>
        /// <param name="apiKey">API Key</param>
        /// <param name="apiSecret">API Secret</param>
        /// <param name="shopifyAppId">ShopifyAppId（オプション）</param>
        /// <param name="scopes">承認されたスコープ</param>
        /// <returns>保存されたストアID</returns>
        private async Task<int> ProcessOAuthSuccessAsync(
            string shop,
            string accessToken,
            string apiKey,
            string? apiSecret,
            int? shopifyAppId,
            string? scopes)
        {
            // パラメータのnullチェック
            if (string.IsNullOrWhiteSpace(apiSecret))
            {
                _logger.LogWarning("apiSecretがnullまたは空です。Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
                // フォールバック: データベースから取得を試みる
                var (fallbackApiKey, fallbackApiSecret) = await GetShopifyCredentialsAsync(shop);
                apiSecret = fallbackApiSecret ?? throw new InvalidOperationException($"API Secret not found for shop: {shop}");
            }

            if (string.IsNullOrWhiteSpace(scopes))
            {
                _logger.LogWarning("scopesがnullまたは空です。Shop: {Shop}", shop);
                scopes = string.Empty; // 空文字列をデフォルト値として使用
            }

            // ストア情報を保存・更新（ShopifyAppIdも保存、承認されたスコープも保存）
            var storeId = await SaveOrUpdateStore(
                shop,
                accessToken,
                apiKey,
                apiSecret,
                shopifyAppId,
                scopes);

            // Webhook登録
            await RegisterWebhooks(shop, accessToken);

            // インストール直後はトライアル（trialing）を自動付与して全機能を解放
            await EnsureTrialSubscriptionAsync(storeId);

            _logger.LogInformation("OAuth authentication success processing completed. Shop: {Shop}, StoreId: {StoreId}, ShopifyAppId: {ShopifyAppId}",
                shop, storeId, shopifyAppId);

            return storeId;
        }

        #endregion

        #region Private Methods - Subscription

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

        #endregion

        #region Private Methods - Webhook

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
                            _logger.LogInformation("Webhook registered successfully. Topic: {Topic}", webhook.topic);
                        }
                        else
                        {
                            var error = await response.Content.ReadAsStringAsync();
                            _logger.LogWarning("Webhook registration failed. Topic: {Topic}, Error: {Error}",
                                webhook.topic, error);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error occurred while registering webhook. Topic: {Topic}", webhook.topic);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook登録中にエラーが発生");
                // Webhook登録の失敗は致命的ではないため、処理を続行
            }
        }

        #endregion

        #region Private Methods - Authentication & Validation

        /// <summary>
        /// HMACを検証する（ShopifySharpライブラリ使用）
        /// </summary>
        private async Task<bool> VerifyHmacAsync(string code, string shop, string state, string timestamp, string hmac)
        {
            // ストア固有のCredentialsを取得
            var (apiKey, apiSecret) = await GetShopifyCredentialsAsync(shop);

            if (string.IsNullOrWhiteSpace(apiSecret))
            {
                _logger.LogError("HMAC verification error: ApiSecret is not configured. Shop: {Shop}", shop);
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
                    _logger.LogInformation("=== Starting HMAC verification (using ShopifySharp) ===");
                    _logger.LogInformation("Received parameters:");
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
                _logger.LogError(ex, "Error occurred during HMAC verification");
                return false;
            }
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
                    _logger.LogInformation("Retrieved credentials from ShopifyApp table. Shop: {Shop}, App: {AppName}",
                        shopDomain, store.ShopifyApp.Name);
                    return (store.ShopifyApp.ApiKey, store.ShopifyApp.ApiSecret);
                }

                // 3. 後方互換性: Store.ApiKey/ApiSecretから取得
                if (store != null &&
                    !string.IsNullOrEmpty(store.ApiKey) &&
                    !string.IsNullOrEmpty(store.ApiSecret))
                {
                    _logger.LogInformation("Using store-specific credentials (backward compatibility). Shop: {Shop}", shopDomain);
                    return (store.ApiKey, store.ApiSecret);
                }

                // 4. フォールバック: 環境変数/設定ファイルから取得
                var defaultApiKey = GetShopifySetting("ApiKey");
                var defaultApiSecret = GetShopifySetting("ApiSecret");

                if (string.IsNullOrEmpty(defaultApiKey))
                {
                    _logger.LogError("API Key not found. Shop: {Shop}", shopDomain);
                    throw new InvalidOperationException($"API Key not configured for shop: {shopDomain}");
                }

                _logger.LogInformation("Using default credentials (from config/environment variables). Shop: {Shop}", shopDomain);
                return (defaultApiKey, defaultApiSecret);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving credentials. Shop: {Shop}, using fallback", shopDomain);
                // エラー時は環境変数のデフォルト値を使用
                var defaultApiKey = GetShopifySetting("ApiKey");
                var defaultApiSecret = GetShopifySetting("ApiSecret");
                return (defaultApiKey, defaultApiSecret);
            }
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
                    _logger.LogInformation("Retrieved API Secret from ShopifyApp table. ApiKey: {ApiKey}, App: {AppName}",
                        apiKey, shopifyApp.Name);
                    return shopifyApp.ApiSecret;
                }

                // 2. フォールバック: 環境変数から取得
                var defaultApiSecret = GetShopifySetting("ApiSecret");
                if (!string.IsNullOrEmpty(defaultApiSecret))
                {
                    _logger.LogInformation("Retrieved API Secret from environment variables. ApiKey: {ApiKey}", apiKey);
                    return defaultApiSecret;
                }

                _logger.LogWarning("API Secret not found. ApiKey: {ApiKey}", apiKey);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving API Secret. ApiKey: {ApiKey}", apiKey);
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

        #endregion

        #region Private Methods - Encryption

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
                _logger.LogError(ex, "Error occurred during token encryption. Using Base64 encoding");
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
                _logger.LogError(ex, "Error occurred during token decryption. Using Base64 decoding");
                var bytes = Convert.FromBase64String(encryptedToken);
                return Encoding.UTF8.GetString(bytes);
            }
        }

        #endregion

        #region Private Methods - Settings

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
        /// API KeyからApp URLを取得
        /// </summary>
        /// <param name="apiKey">Shopify API Key</param>
        /// <returns>App URL</returns>
        private async Task<string> GetShopifyAppUrlAsync(string apiKey)
        {
            _logger.LogInformation("GetShopifyAppUrlAsync: apiKey={ApiKey}",
                apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)) + "...");

            var shopifyApp = await _context.ShopifyApps
                .FirstOrDefaultAsync(a => a.ApiKey == apiKey && a.IsActive);

            if (shopifyApp != null)
            {
                _logger.LogInformation("GetShopifyAppUrlAsync: ShopifyApp found. Id={Id}, Name={Name}, AppUrl={AppUrl}, IsActive={IsActive}",
                    shopifyApp.Id, shopifyApp.Name, shopifyApp.AppUrl, shopifyApp.IsActive);

                if (!string.IsNullOrEmpty(shopifyApp.AppUrl))
                {
                    return shopifyApp.AppUrl;
                }
                else
                {
                    _logger.LogWarning("GetShopifyAppUrlAsync: ShopifyApp found but AppUrl is empty. Id={Id}, Name={Name}",
                        shopifyApp.Id, shopifyApp.Name);
                }
            }
            else
            {
                _logger.LogWarning("GetShopifyAppUrlAsync: ShopifyApp not found for apiKey={ApiKey}",
                    apiKey?.Substring(0, Math.Min(8, apiKey?.Length ?? 0)) + "...");
            }

            // フォールバック: データベースから最初のアクティブなAppUrlを取得
            var defaultApp = await _context.ShopifyApps
                .Where(a => a.IsActive && !string.IsNullOrEmpty(a.AppUrl))
                .OrderBy(a => a.Id)
                .Select(a => a.AppUrl)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrEmpty(defaultApp))
            {
                _logger.LogInformation("GetShopifyAppUrlAsync: Using default AppUrl from database: {AppUrl}", defaultApp);
                return defaultApp;
            }

            // 最終フォールバック: 環境変数から取得
            var fallbackUrl = GetShopifySetting("AppUrl") ?? "https://localhost:3000";
            _logger.LogWarning("GetShopifyAppUrlAsync: Using fallback URL from environment variable: {FallbackUrl}", fallbackUrl);
            return fallbackUrl;
        }

        /// <summary>
        /// デフォルトのフロントエンドURLを取得（データベースから）
        /// </summary>
        /// <returns>フロントエンドURL</returns>
        private async Task<string> GetDefaultFrontendUrlAsync()
        {
            // データベースから最初のアクティブなAppUrlを取得
            var defaultApp = await _context.ShopifyApps
                .Where(a => a.IsActive && !string.IsNullOrEmpty(a.AppUrl))
                .OrderBy(a => a.Id)
                .Select(a => a.AppUrl)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrEmpty(defaultApp))
            {
                return defaultApp;
            }

            // フォールバック: 環境変数から取得
            return GetShopifySetting("AppUrl") ?? "https://localhost:3000";
        }

        #endregion

        #region Private Methods - Utilities

        /// <summary>
        /// Shopifyのhostパラメータをデコードする
        /// </summary>
        /// <param name="encodedHost">Base64エンコードされたhostパラメータ</param>
        /// <returns>デコードされたhost（例: example.myshopify.com/admin）</returns>
        private string? DecodeHost(string? encodedHost)
        {
            if (string.IsNullOrWhiteSpace(encodedHost))
            {
                return null;
            }

            try
            {
                // 🆕 Step 1: URLデコードを先に実行（ShopifyがURLエンコードしている可能性がある）
                var urlDecoded = Uri.UnescapeDataString(encodedHost);
                _logger.LogInformation("DecodeHost: URLデコード後: {UrlDecoded}, Length: {Length}", urlDecoded, urlDecoded.Length);
                
                // 🆕 Step 2: Base64パディングを追加（Shopifyはパディング文字を削除している可能性がある）
                var paddedBase64 = urlDecoded;
                var mod = urlDecoded.Length % 4;
                if (mod > 0)
                {
                    var paddingNeeded = 4 - mod;
                    paddedBase64 += new string('=', paddingNeeded);
                    _logger.LogInformation("DecodeHost: パディング追加: {OriginalLength} -> {PaddedLength}, Padding: {Padding}", 
                        urlDecoded.Length, paddedBase64.Length, paddingNeeded);
                }
                
                // Step 3: Base64デコードを実行
                _logger.LogInformation("DecodeHost: Base64デコード試行: {PaddedBase64}", paddedBase64);
                var bytes = Convert.FromBase64String(paddedBase64);
                var decoded = System.Text.Encoding.UTF8.GetString(bytes);
                _logger.LogInformation("hostパラメータをデコード: {EncodedHost} -> {DecodedHost}", encodedHost, decoded);
                return decoded;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "hostパラメータのデコードに失敗: {EncodedHost}, Error: {Error}", encodedHost, ex.Message);
                
                // 🆕 フォールバック: URLデコードのみを試行（Base64デコードが不要な場合）
                try
                {
                    var urlDecoded = Uri.UnescapeDataString(encodedHost);
                    _logger.LogInformation("hostパラメータをURLデコードのみで処理: {EncodedHost} -> {DecodedHost}", encodedHost, urlDecoded);
                    return urlDecoded;
                }
                catch (Exception ex2)
                {
                    _logger.LogWarning(ex2, "hostパラメータのURLデコードも失敗: {EncodedHost}", encodedHost);
                    return null;
                }
            }
        }

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

        #endregion

        #region Private Methods - Session & Error Handling

        /// <summary>
        /// OAuth認証成功後のセッションCookieを設定する
        /// </summary>
        /// <param name="storeId">ストアID</param>
        /// <param name="shop">ショップドメイン</param>
        private async Task SetOAuthSessionCookie(int storeId, string shop)
        {
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

            // 開発環境判定
            var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();

            // Cookie 設定
            // - ngrok(フロント) → localhost(バック) のようなクロスサイト fetch では SameSite=Lax だと Cookie が送信されず 401 になる
            // - そのため「フロントBaseUrlのHost」と「このリクエストHost」が異なる場合は SameSite=None にする
            var frontendBaseUrl = await GetDefaultFrontendUrlAsync();
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
            _logger.LogInformation("OAuth session cookie set. StoreId: {StoreId}, Shop: {Shop}, Secure: {Secure}, SameSite: {SameSite}, IsDevelopment: {IsDevelopment}",
                storeId, shop, sessionCookieOptions.Secure, sessionCookieOptions.SameSite, isDevelopment);
        }

        /// <summary>
        /// OAuthエラーを処理する
        /// </summary>
        private async Task<IActionResult> HandleOAuthError(Exception ex, string shop, string operation)
        {
            _logger.LogError(ex, "OAuth {Operation} error occurred. Shop: {Shop}", operation, shop);

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
            var frontendUrl = await GetDefaultFrontendUrlAsync();
            return Redirect($"{frontendUrl}/shopify/error?message=Authentication%20failed");
        }

        #endregion

        #region Internal Classes

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

        #endregion
    }
}
