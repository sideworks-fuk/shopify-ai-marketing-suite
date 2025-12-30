using Microsoft.AspNetCore.Mvc;
using ShopifyAnalyticsApi.Attributes;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ShopifyAnalyticsApi.Controllers
{
    /// <summary>
    /// ShopifyAuthController - デバッグ・テスト用エンドポイント
    /// </summary>
    /// <remarks>
    /// このファイルはPartial classの一部です:
    /// - ShopifyAuthController.cs: メインのOAuthフロー
    /// - ShopifyAuthController.Debug.cs (このファイル): デバッグ・テスト用エンドポイント
    /// - ShopifyAuthController.Private.cs: Privateメソッドと内部クラス
    /// </remarks>
    public partial class ShopifyAuthController
    {
        #region Public Endpoints - Debug/Test (Developer Only)

        /// <summary>
        /// テスト用エンドポイント - OAuth設定の確認
        /// </summary>
        [HttpGet("test-config")]
        [RequireDeveloperAuth]
        public async Task<IActionResult> TestConfig()
        {
            try
            {
                var baseUrl = GetBaseUrl();
                var redirectUri = $"{baseUrl}/api/shopify/callback";
                var frontendUrl = await GetDefaultFrontendUrlAsync();
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

                return Ok(new
                {
                    message = "Shopify OAuth設定確認（ハイブリッド方式対応）",
                    config = config,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during configuration check");
                return StatusCode(500, new { error = "Configuration test failed" });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - ハイブリッド方式のテスト
        /// </summary>
        [HttpGet("test-hybrid-mode")]
        [RequireDeveloperAuth]
        public async Task<IActionResult> TestHybridMode([FromQuery] string shop = "fuk-dev1.myshopify.com")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
                {
                    return BadRequest(new { error = "Invalid shop domain" });
                }

                var apiKey = GetShopifySetting("ApiKey");
                var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
                var frontendUrl = await GetDefaultFrontendUrlAsync();
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
                _logger.LogError(ex, "Error occurred during hybrid mode test");
                return StatusCode(500, new { error = "Hybrid mode test failed" });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - OAuth URL生成テスト
        /// </summary>
        [HttpGet("test-oauth-url")]
        [RequireDeveloperAuth]
        public async Task<IActionResult> TestOAuthUrl([FromQuery] string shop = "fuk-dev1.myshopify.com")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
                {
                    return BadRequest(new { error = "Invalid shop domain" });
                }

                var apiKey = GetShopifySetting("ApiKey");
                var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
                var redirectUri = await GetRedirectUriAsync(apiKey); // ハイブリッド方式用のリダイレクトURI
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
                _logger.LogError(ex, "Error occurred during OAuth URL generation test");
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
                _logger.LogError(ex, "Error occurred while checking ShopifyApps table");
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
                _logger.LogError(ex, "Error occurred while checking approved scopes");
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
                _logger.LogError(ex, "Error occurred while checking Store table");
                return StatusCode(500, new { error = "Failed to query Store table", details = ex.Message });
            }
        }

        /// <summary>
        /// テスト用エンドポイント - 設定値確認テスト
        /// </summary>
        [HttpGet("test-settings")]
        [RequireDeveloperAuth]
        public async Task<IActionResult> TestSettings()
        {
            try
            {
                var settings = new
                {
                    // 環境変数
                    EnvironmentVariable = Environment.GetEnvironmentVariable("SHOPIFY_FRONTEND_BASEURL"),

                    // データベースから取得した値
                    DefaultFrontendUrl = await GetDefaultFrontendUrlAsync(),

                    // 実際に使用される値
                    ActualRedirectUri = await GetRedirectUriAsync(null),

                    // その他の設定
                    ApiKey = GetShopifySetting("ApiKey"),
                    ApiSecret = GetShopifySetting("ApiSecret"),
                    Scopes = GetShopifySetting("Scopes")
                };

                return Ok(settings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during settings test");
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
                _logger.LogError(ex, "Error occurred during encryption test");
                return StatusCode(500, new { error = "Encryption test failed", details = ex.Message });
            }
        }

        #endregion
    }
}
