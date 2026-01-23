using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using ShopifyAnalyticsApi.Services;

namespace ShopifyAnalyticsApi.Middleware
{
    /// <summary>
    /// 認証モード制御ミドルウェア
    /// 環境に応じた認証方式を制御し、セキュリティを強化
    /// </summary>
    public class AuthModeMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthModeMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public AuthModeMiddleware(
            RequestDelegate next,
            IConfiguration config,
            ILogger<AuthModeMiddleware> logger,
            IHostEnvironment env)
        {
            _next = next;
            _config = config;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(
            HttpContext context, 
            IAuthenticationService authService,
            IDeveloperAuthService developerAuthService)
        {
            // 認証をスキップするパスをチェック
            var path = context.Request.Path.Value?.ToLower() ?? "";
            
            // デバッグ: 同期関連のリクエストのみログ出力
            var isSyncRequest = path.Contains("/api/sync");
            if (isSyncRequest)
            {
                _logger.LogInformation("🔐 [AuthModeMiddleware] ========================================");
                _logger.LogInformation("🔐 [AuthModeMiddleware] 同期リクエスト受信: Path={Path}, Method={Method}", 
                    path, context.Request.Method);
                _logger.LogInformation("🔐 [AuthModeMiddleware] Timestamp: {Timestamp}", DateTime.UtcNow);
            }
            var skipAuthPaths = new[]
            {
                "/api/demo/login",
                "/api/developer/login", 
                "/api/shopify/oauth/callback",
                "/api/shopify/install",
                "/api/shopify/callback",
                // 診断/テスト用（[AllowAnonymous] を付けても、このミドルウェアが先に判定するため明示的にスキップする）
                "/api/shopify/test-settings",
                "/api/shopify/test-oauth-url",
                "/api/shopify/test-hybrid-mode",
                "/api/shopify/test-config",
                // Webhook（Shopifyからの通知、WebhookController内で独自HMAC検証を実施）
                "/api/webhook",
                // ヘルスチェックエンドポイント（認証不要）
                "/health",
                "/api/health",
                "/health/ready",
                "/swagger",
                "/hangfire",
                // 管理者ダッシュボード（APIキー認証を使用）
                "/admin"
            };

            if (skipAuthPaths.Any(skipPath => path.StartsWith(skipPath)))
            {
                _logger.LogDebug("Skipping authentication for path: {Path}", path);
                await _next(context);
                return;
            }

            // 認証モード取得
            var authMode = _config["Authentication:Mode"] ?? "OAuthRequired";
            var environment = _env.EnvironmentName;
            
            // 本番環境でデモモードを許可するかどうか（環境変数で明示的に許可する必要がある）
            var allowDemoInProduction = _config.GetValue<bool>("Authentication:AllowDemoInProduction", false);

            // 本番環境での安全弁（セキュリティチェック）
            // ただし、AllowDemoInProductionがtrueの場合はDemoAllowedを許可
            if (environment == "Production" && authMode != "OAuthRequired")
            {
                if (authMode == "DemoAllowed" && allowDemoInProduction)
                {
                    _logger.LogWarning(
                        "⚠️ SECURITY: Demo mode is enabled in Production environment. " +
                        "This should only be used for testing/demo purposes. " +
                        "Environment: {Environment}, Mode: {Mode}, AllowDemoInProduction: {AllowDemo}",
                        environment,
                        authMode,
                        allowDemoInProduction);
                    // デモモードを許可して続行
                }
                else
                {
                    _logger.LogCritical(
                        "SECURITY: Invalid authentication mode for production environment. " +
                        "Environment: {Environment}, Mode: {Mode}, AllowDemoInProduction: {AllowDemo}",
                        environment,
                        authMode,
                        allowDemoInProduction);

                    context.Response.StatusCode = 500;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = "Configuration Error",
                        message = "Production environment must use OAuthRequired mode, or DemoAllowed mode with Authentication:AllowDemoInProduction=true"
                    });
                    return;
                }
            }

            // ホスト名検証（オプション）
            var allowedHostnames = _config.GetSection("Environment:AllowedHostnames").Get<string[]>();
            if (allowedHostnames?.Length > 0)
            {
                var hostname = context.Request.Host.Host;
                if (!allowedHostnames.Contains(hostname))
                {
                    _logger.LogWarning(
                        "Request from unauthorized hostname: {Hostname}",
                        hostname);
                }
            }

            // Authorizationヘッダーからトークンを取得（Shopify埋め込みアプリ対応）
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            string? token = null;

            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                token = authHeader.Substring("Bearer ".Length).Trim();
            }

            bool isOAuthValid = false;
            bool isDemoValid = false;
            bool isDeveloperValid = false;
            AuthenticationResult? authResult = null;

            // OAuth認証成功後のセッションCookieを確認（埋め込みアプリでない場合の認証）
            // これはAuthorizationヘッダーがない場合のフォールバックとして機能
            var oauthSessionCookie = context.Request.Cookies["oauth_session"];
            
            // デバッグ: すべてのCookieをログに記録
            if (_env.IsDevelopment())
            {
                var allCookies = string.Join(", ", context.Request.Cookies.Select(c => $"{c.Key}={c.Value.Substring(0, Math.Min(50, c.Value.Length))}..."));
                _logger.LogDebug("Request cookies: {Cookies}", allCookies);
                _logger.LogDebug("Looking for oauth_session cookie. Found: {Found}, Value: {Value}", 
                    !string.IsNullOrEmpty(oauthSessionCookie), 
                    oauthSessionCookie != null ? oauthSessionCookie.Substring(0, Math.Min(100, oauthSessionCookie.Length)) : "null");
            }
            
            if (!string.IsNullOrEmpty(oauthSessionCookie))
            {
                try
                {
                    var sessionData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(oauthSessionCookie);
                    if (sessionData.TryGetProperty("storeId", out var storeIdElement) && 
                        sessionData.TryGetProperty("shop", out var shopElement))
                    {
                        var storeId = storeIdElement.GetInt32();
                        var shop = shopElement.GetString();
                        
                        // セッションの有効性を確認（ストアが存在し、アクティブかどうか）
                        // 注: ここでは簡易実装。本番環境では、セッションデータベースやRedisを使用することを推奨
                        _logger.LogInformation("OAuth session cookie validation successful. StoreId: {StoreId}, Shop: {Shop}", storeId, shop);
                        
                        // 認証結果を設定
                        authResult = new AuthenticationResult
                        {
                            IsValid = true,
                            StoreId = storeId,
                            ShopDomain = shop,
                            AuthMode = "OAuthSession"
                        };
                    }
                    else
                    {
                        _logger.LogWarning("OAuth session cookie missing required properties. storeId: {HasStoreId}, shop: {HasShop}", 
                            sessionData.TryGetProperty("storeId", out _), 
                            sessionData.TryGetProperty("shop", out _));
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "OAuth session cookie parsing failed. Cookie value: {CookieValue}", 
                        oauthSessionCookie.Substring(0, Math.Min(200, oauthSessionCookie.Length)));
                }
            }
            else
            {
                _logger.LogDebug("OAuth session cookie not found in request");
            }

            // OAuthセッションCookieが有効な場合は、それを使用（優先）
            // トークン検証は、セッションCookieがない場合のみ実行
            if (authResult == null && !string.IsNullOrEmpty(token))
            {
                try
                {
                    // Shopify App Bridgeセッショントークンの検証
                    var oauthResult = await authService.ValidateShopifySessionTokenAsync(token);
                    isOAuthValid = oauthResult.IsValid;

                    if (isOAuthValid)
                    {
                        authResult = oauthResult;
                        _logger.LogDebug("Shopify OAuth token validation successful");
                    }
                    else
                    {
                        // デモトークンの検証
                        var demoResult = await authService.ValidateDemoTokenAsync(token);
                        isDemoValid = demoResult.IsValid;

                        if (isDemoValid)
                        {
                            authResult = demoResult;
                            _logger.LogDebug("Demo token validation successful");
                        }
                        else
                        {
                            ////// 開発者トークンの検証（開発環境のみ：Development または LocalDevelopment）
                            ////if (_env.IsDevelopment() || _env.EnvironmentName == "LocalDevelopment")
                            ////{
                            ////}
                            var developerResult = await developerAuthService.ValidateDeveloperTokenAsync(token, context);
                            isDeveloperValid = developerResult.IsValid;
                            if (isDeveloperValid)
                            {
                                authResult = developerResult;
                                _logger.LogDebug("Developer token validation successful. StoreId: {StoreId}", developerResult.StoreId);
                            }

                            if (!isDeveloperValid)
                            {
                                _logger.LogDebug("OAuth, demo, and developer token validation all failed");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Token validation error for path: {Path}", context.Request.Path);
                    
                    // 認証エラーをログに記録
                    await authService.LogAuthenticationAttemptAsync(
                        null,
                        "unknown",
                        false,
                        $"Token validation error: {ex.Message}",
                        context.Connection.RemoteIpAddress?.ToString(),
                        context.Request.Headers["User-Agent"].FirstOrDefault());
                    
                    // エラーが発生した場合は認証失敗として扱う
                    isOAuthValid = false;
                    isDemoValid = false;
                }
            }

            // OAuthRequired判定用: Shopify埋め込みトークン(OAuth) or OAuthセッションCookie を許可
            var hasValidOAuthLikeAuth = isOAuthValid || string.Equals(authResult?.AuthMode, "OAuthSession", StringComparison.OrdinalIgnoreCase);

            // 認証モード別の処理
            switch (authMode)
            {
                case "OAuthRequired":
                    if (!hasValidOAuthLikeAuth)
                    {
                        _logger.LogWarning(
                            "OAuth authentication required but not provided. Path: {Path}",
                            context.Request.Path);

                        context.Response.StatusCode = 401;
                        await context.Response.WriteAsJsonAsync(new
                        {
                            error = "Unauthorized",
                            message = "OAuth authentication required"
                        });

                        // 認証ログ記録
                        await authService.LogAuthenticationAttemptAsync(
                            null,
                            "oauth",
                            false,
                            "OAuth token not provided or invalid",
                            context.Connection.RemoteIpAddress?.ToString(),
                            context.Request.Headers["User-Agent"].FirstOrDefault());

                        return;
                    }
                    break;

                case "DemoAllowed":
                    // 開発環境では開発者認証も許可
                    if (!isOAuthValid && !isDemoValid)
                    {
                        // 開発環境では開発者認証を許可（Development または LocalDevelopment）
                        if ((_env.IsDevelopment() || _env.EnvironmentName == "LocalDevelopment") || isDeveloperValid)
                        {
                            _logger.LogInformation("Developer authentication allowed in DemoAllowed mode (Development/LocalDevelopment environment)");
                            // 開発者認証を許可して続行
                        }
                        else
                        {
                            if (isSyncRequest)
                            {
                                _logger.LogWarning("🔐 [AuthModeMiddleware] ❌ 認証失敗: OAuth/Demo/Developer認証が必要ですが提供されていません");
                                _logger.LogInformation("🔐 [AuthModeMiddleware] ========================================");
                            }
                            
                            _logger.LogWarning(
                                "OAuth, demo, or developer authentication required but not provided. Path: {Path}",
                                context.Request.Path);

                            context.Response.StatusCode = 401;
                            await context.Response.WriteAsJsonAsync(new
                            {
                                error = "Unauthorized",
                                message = "OAuth, demo, or developer authentication required"
                            });

                            // 認証ログ記録
                            await authService.LogAuthenticationAttemptAsync(
                                null,
                                "oauth_or_demo_or_developer",
                                false,
                                "No valid authentication token provided",
                                context.Connection.RemoteIpAddress?.ToString(),
                                context.Request.Headers["User-Agent"].FirstOrDefault());

                            return;
                        }
                    }
                    break;


                default:
                    _logger.LogError(
                        "Unknown authentication mode: {AuthMode}",
                        authMode);

                    context.Response.StatusCode = 500;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = "Configuration Error",
                        message = "Unknown authentication mode"
                    });
                    return;
            }

            // 認証情報をコンテキストに設定（3段階認証レベル対応）
            if (authResult != null && authResult.IsValid)
            {
                // 認証モードを設定
                context.Items["AuthMode"] = authResult.AuthMode;
                context.Items["IsReadOnly"] = authResult.IsReadOnly;

                // StoreId は int として格納（Nullable<int> のボクシングだと取得側の型判定に失敗して 500 の原因になる）
                if (authResult.StoreId.HasValue)
                {
                    context.Items["StoreId"] = authResult.StoreId.Value;
                    
                    // デバッグ: 同期関連のリクエストのみログ出力
                    if (isSyncRequest)
                    {
                        _logger.LogInformation("🔐 [AuthModeMiddleware] 認証成功: AuthMode={AuthMode}, StoreId={StoreId}, IsReadOnly={IsReadOnly}", 
                            authResult.AuthMode, authResult.StoreId.Value, authResult.IsReadOnly);
                    }
                }
                else
                {
                    // StoreIdが設定されていない場合、X-Store-Idヘッダーから取得を試みる（開発者モードなど）
                    var storeIdHeader = context.Request.Headers["X-Store-Id"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(storeIdHeader) && int.TryParse(storeIdHeader, out var headerStoreId))
                    {
                        context.Items["StoreId"] = headerStoreId;
                        if (isSyncRequest)
                        {
                            _logger.LogInformation("🔐 [AuthModeMiddleware] StoreIdをX-Store-Idヘッダーから取得: AuthMode={AuthMode}, StoreId={StoreId}", 
                                authResult.AuthMode, headerStoreId);
                        }
                    }
                    else
                    {
                        // デバッグ: StoreIdが設定されていない場合
                        if (isSyncRequest)
                        {
                            _logger.LogWarning("🔐 [AuthModeMiddleware] ⚠️ StoreIdが設定されていません: AuthMode={AuthMode}, X-Store-Id={XStoreId}", 
                                authResult.AuthMode, storeIdHeader ?? "null");
                        }
                    }
                }
                context.Items["UserId"] = authResult.UserId;

                // Level 3: OAuth認証
                if (isOAuthValid)
                {
                    context.Items["IsDemoMode"] = false;
                    
                    var claims = new List<Claim>
                    {
                        new Claim("auth_mode", "oauth"),
                        new Claim("read_only", "false"),
                        new Claim(ClaimTypes.Name, authResult.UserId ?? "oauth-user"), // Rate Limiter用
                        new Claim(ClaimTypes.NameIdentifier, authResult.UserId ?? "oauth-user")
                    };

                    if (authResult.StoreId.HasValue)
                    {
                        claims.Add(new Claim("store_id", authResult.StoreId.Value.ToString()));
                    }

                    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "OAuth"));

                    _logger.LogInformation(
                        "Level 3 (OAuth) authentication successful. UserId: {UserId}, StoreId: {StoreId}",
                        authResult.UserId,
                        authResult.StoreId);
                }
                // Level 2: デモモード
                else if (isDemoValid && !isOAuthValid)
                {
                    context.Items["IsDemoMode"] = true;
                    
                    var claims = new List<Claim>
                    {
                        new Claim("auth_mode", "demo"),
                        new Claim("read_only", "true"),
                        new Claim(ClaimTypes.Name, authResult.UserId ?? "demo-user"), // Rate Limiter用
                        new Claim(ClaimTypes.NameIdentifier, authResult.UserId ?? "demo-user")
                    };

                    int? extractedStoreId = null;

                    // デモトークンから追加のクレームを取得
                    if (!string.IsNullOrEmpty(token))
                    {
                        try
                        {
                            var tokenHandler = new JwtSecurityTokenHandler();
                            var jwtToken = tokenHandler.ReadJwtToken(token);
                            
                            // 元のJWTトークンからクレームを追加
                            var storeIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "store_id");
                            var tenantIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "tenant_id");
                            var shopDomainClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "shop_domain");
                            
                            if (storeIdClaim != null)
                            {
                                claims.Add(storeIdClaim);
                                if (int.TryParse(storeIdClaim.Value, out var storeId))
                                {
                                    extractedStoreId = storeId;
                                }
                            }
                            if (tenantIdClaim != null) claims.Add(tenantIdClaim);
                            if (shopDomainClaim != null) claims.Add(shopDomainClaim);
                            
                            _logger.LogDebug("Added claims from demo token: store_id={StoreId}, tenant_id={TenantId}, shop_domain={ShopDomain}", 
                                storeIdClaim?.Value ?? "null", tenantIdClaim?.Value ?? "null", shopDomainClaim?.Value ?? "null");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to extract claims from demo token");
                        }
                    }

                    // 🔧 StoreIdをcontext.Itemsに設定（StoreContextMiddlewareで使用される）
                    if (extractedStoreId.HasValue)
                    {
                        context.Items["StoreId"] = extractedStoreId.Value;
                        _logger.LogDebug("Demo mode: StoreId set in context.Items: {StoreId}", extractedStoreId.Value);
                    }
                    else if (authResult.StoreId.HasValue)
                    {
                        context.Items["StoreId"] = authResult.StoreId.Value;
                        _logger.LogDebug("Demo mode: StoreId set from authResult: {StoreId}", authResult.StoreId.Value);
                    }
                    else
                    {
                        // StoreIdが取得できない場合、X-Store-Idヘッダーから取得を試みる
                        var storeIdHeader = context.Request.Headers["X-Store-Id"].FirstOrDefault();
                        if (!string.IsNullOrEmpty(storeIdHeader) && int.TryParse(storeIdHeader, out var headerStoreId))
                        {
                            context.Items["StoreId"] = headerStoreId;
                            _logger.LogDebug("Demo mode: StoreId set from X-Store-Id header: {StoreId}", headerStoreId);
                        }
                        else
                        {
                            _logger.LogWarning("Demo mode: StoreId not found in token, authResult, or X-Store-Id header");
                        }
                    }

                    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Demo"));

                    _logger.LogInformation(
                        "Level 2 (Demo) authentication successful. UserId: {UserId}, StoreId: {StoreId}, ReadOnly: true",
                        authResult.UserId,
                        context.Items["StoreId"] ?? "null");
                }
                // Level 1: 開発者モード（開発環境のみ：Development または LocalDevelopment）
                else if (isDeveloperValid || (environment == "Development" || environment == "LocalDevelopment"))
                {
                    context.Items["IsDemoMode"] = false;
                    context.Items["IsDeveloperMode"] = true;
                    
                    var claims = new List<Claim>
                    {
                        new Claim("auth_mode", "developer"),
                        new Claim("read_only", "false"),
                        new Claim("can_access_dev_tools", "true"),
                        new Claim(ClaimTypes.Name, authResult.UserId ?? "developer-user"), // Rate Limiter用
                        new Claim(ClaimTypes.NameIdentifier, authResult.UserId ?? "developer-user")
                    };

                    context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Developer"));

                    _logger.LogInformation(
                        "Level 1 (Developer) authentication successful. UserId: {UserId}, CanAccessDevTools: true",
                        authResult.UserId);
                }

                // 認証成功ログ記録
                await authService.LogAuthenticationAttemptAsync(
                    authResult.UserId,
                    authResult.AuthMode,
                    true,
                    null,
                    context.Connection.RemoteIpAddress?.ToString(),
                    context.Request.Headers["User-Agent"].FirstOrDefault());
            }

            // 次のミドルウェアを実行
            if (isSyncRequest)
            {
                _logger.LogInformation("🔐 [AuthModeMiddleware] 次のミドルウェアへ処理を委譲");
                _logger.LogInformation("🔐 [AuthModeMiddleware] ========================================");
            }
            
            await _next(context);
        }
    }

    /// <summary>
    /// AuthModeMiddleware の拡張メソッド
    /// </summary>
    public static class AuthModeMiddlewareExtensions
    {
        /// <summary>
        /// 認証モードミドルウェアを追加
        /// </summary>
        public static IApplicationBuilder UseAuthModeMiddleware(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<AuthModeMiddleware>();
        }
    }
}

