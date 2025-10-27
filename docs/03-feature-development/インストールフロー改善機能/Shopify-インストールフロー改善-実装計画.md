# Shopify アプリインストールフロー改善機能 実装計画書

## 概要

本ドキュメントは、Shopifyアプリインストールフロー改善機能の実装計画を定義します。段階的な実装アプローチにより、リスクを最小化しながら確実に機能を実装します。

---

## 🎯 実装目標

### 主要目標
1. 埋め込みアプリでの自動インストールフロー実装
2. インストール状態の自動検出と適切なフロー分岐
3. スコープ変更時の自動再認証フロー
4. App Bridgeを使用したトップレベルリダイレクト
5. 既存機能との互換性維持

### 成功基準
- すべての単体テストが合格
- すべての統合テストが合格
- E2Eテストが合格
- セキュリティテストが合格
- パフォーマンステストが合格
- 既存ユーザーへの影響なし

---

## 📅 実装スケジュール

### Phase 0: 準備・環境構築（1日）
**目標**: 開発環境の準備とブランチ作成

**タスク**:
- [ ] 開発ブランチの作成
- [ ] 依存パッケージの確認・更新
- [ ] 開発環境の動作確認
- [ ] データベースマイグレーションの準備

**成果物**:
- 開発ブランチ: `feature/install-flow-improvement`
- 環境構築ドキュメント

---

### Phase 1: バックエンド基盤実装（2-3日）

#### 1.1 データベーススキーマ拡張
**目標**: Storesテーブルにスコープ情報を追加

**タスク**:
- [ ] マイグレーションファイルの作成
- [ ] Storesテーブルに`Scopes`カラムを追加
- [ ] インデックスの追加
- [ ] Entityクラスの更新

**実装詳細**:

**マイグレーションファイル**: `Migrations/YYYYMMDDHHMMSS_AddScopesToStores.cs`
```csharp
using Microsoft.EntityFrameworkCore.Migrations;

public partial class AddScopesToStores : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Scopes",
            table: "Stores",
            type: "nvarchar(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Stores_Domain",
            table: "Stores",
            column: "Domain");

        migrationBuilder.CreateIndex(
            name: "IX_Stores_InstalledAt",
            table: "Stores",
            column: "InstalledAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Stores_Domain",
            table: "Stores");

        migrationBuilder.DropIndex(
            name: "IX_Stores_InstalledAt",
            table: "Stores");

        migrationBuilder.DropColumn(
            name: "Scopes",
            table: "Stores");
    }
}
```

**Entityクラス更新**: `Models/Store.cs`
```csharp
public class Store
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Domain { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string AccessToken { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Scopes { get; set; } // 新規追加
    
    [MaxLength(200)]
    public string? ShopName { get; set; }
    
    [MaxLength(200)]
    public string? Email { get; set; }
    
    public DateTime InstalledAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
}
```

**検証**:
- [ ] マイグレーションが正常に実行される
- [ ] 既存データに影響がない
- [ ] インデックスが作成される

---

#### 1.2 レート制限サービスの実装
**目標**: ショップ列挙攻撃を防止するレート制限機能

**タスク**:
- [ ] RateLimiterサービスの作成
- [ ] 分散キャッシュの設定
- [ ] レート制限ミドルウェアの実装
- [ ] 単体テストの作成

**実装詳細**:

**サービス**: `Services/RateLimiter.cs`
```csharp
public interface IRateLimiter
{
    Task<bool> CheckRateLimitAsync(string key, int maxRequests, TimeSpan window);
    Task<RateLimitInfo> GetRateLimitInfoAsync(string key);
}

public class RateLimitInfo
{
    public int CurrentCount { get; set; }
    public int MaxRequests { get; set; }
    public TimeSpan? ResetIn { get; set; }
}

public class RateLimiter : IRateLimiter
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RateLimiter> _logger;

    public RateLimiter(IDistributedCache cache, ILogger<RateLimiter> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> CheckRateLimitAsync(string key, int maxRequests, TimeSpan window)
    {
        var cacheKey = $"ratelimit_{key}";
        var currentCount = await GetCurrentCountAsync(cacheKey);

        if (currentCount >= maxRequests)
        {
            _logger.LogWarning("レート制限超過: {Key}, Count: {Count}, Max: {Max}", 
                key, currentCount, maxRequests);
            return false;
        }

        await IncrementCountAsync(cacheKey, window);
        return true;
    }

    public async Task<RateLimitInfo> GetRateLimitInfoAsync(string key)
    {
        var cacheKey = $"ratelimit_{key}";
        var currentCount = await GetCurrentCountAsync(cacheKey);
        
        // TTLを取得（実装は環境依存）
        return new RateLimitInfo
        {
            CurrentCount = currentCount,
            MaxRequests = 0, // 呼び出し元で設定
            ResetIn = null // 実装により取得可能
        };
    }

    private async Task<int> GetCurrentCountAsync(string key)
    {
        var value = await _cache.GetStringAsync(key);
        return value != null ? int.Parse(value) : 0;
    }

    private async Task IncrementCountAsync(string key, TimeSpan expiry)
    {
        var currentCount = await GetCurrentCountAsync(key);
        var newCount = currentCount + 1;
        
        await _cache.SetStringAsync(
            key, 
            newCount.ToString(), 
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry
            });
    }
}
```

**DI登録**: `Program.cs`
```csharp
// 分散キャッシュの設定
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "ShopifyApp_";
});

// レート制限サービスの登録
builder.Services.AddSingleton<IRateLimiter, RateLimiter>();
```

**検証**:
- [ ] レート制限が正常に機能する
- [ ] 制限超過時に適切なエラーを返す
- [ ] 単体テストが合格する

---

#### 1.3 インストール状態チェックAPIの実装
**目標**: ショップのインストール状態とスコープを確認するAPI

**タスク**:
- [ ] `/api/shopify/status` エンドポイントの実装
- [ ] スコープ検証ロジックの実装
- [ ] レート制限の統合
- [ ] 単体テストの作成

**実装詳細**:

**コントローラー**: `Controllers/ShopifyAuthController.cs`
```csharp
[HttpGet("status")]
[AllowAnonymous]
public async Task<IActionResult> GetInstallationStatus([FromQuery] string shop)
{
    try
    {
        // ショップドメインの検証
        if (string.IsNullOrWhiteSpace(shop) || !_oauthService.IsValidShopDomain(shop))
        {
            _logger.LogWarning("無効なショップドメイン: {Shop}", shop);
            return BadRequest(new { error = "Invalid shop domain" });
        }

        // レート制限チェック（ショップごと）
        var shopRateLimitKey = $"status_check_shop_{shop}";
        if (!await _rateLimiter.CheckRateLimitAsync(shopRateLimitKey, 10, TimeSpan.FromMinutes(1)))
        {
            _logger.LogWarning("レート制限超過（ショップ）: {Shop}", shop);
            return StatusCode(429, new { error = "Rate limit exceeded" });
        }

        // レート制限チェック（IPアドレス）
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var ipRateLimitKey = $"status_check_ip_{ipAddress}";
        if (!await _rateLimiter.CheckRateLimitAsync(ipRateLimitKey, 50, TimeSpan.FromMinutes(1)))
        {
            _logger.LogWarning("レート制限超過（IP）: {IP}", ipAddress);
            return StatusCode(429, new { error = "Rate limit exceeded" });
        }

        // データベースからストア情報を取得
        var store = await _context.Stores
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Domain == shop);

        if (store == null)
        {
            // 未インストール
            var installUrl = GenerateInstallUrl(shop, null);
            return Ok(new
            {
                installed = false,
                installUrl = installUrl,
                message = "App not installed for this shop"
            });
        }

        // インストール済み - スコープチェック
        var requiredScopes = GetRequiredScopes();
        var currentScopes = ParseScopes(store.Scopes);
        var missingScopes = requiredScopes.Except(currentScopes).ToList();

        if (missingScopes.Any())
        {
            // スコープ不足 - 再認証が必要
            var reauthUrl = GenerateInstallUrl(shop, requiredScopes);
            return Ok(new
            {
                installed = true,
                scopesValid = false,
                missingScopes = missingScopes,
                reauthUrl = reauthUrl,
                message = "App requires additional permissions"
            });
        }

        // すべて正常
        return Ok(new
        {
            installed = true,
            scopesValid = true,
            message = "App is properly installed"
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "インストール状態チェックエラー: {Shop}", shop);
        return StatusCode(500, new { error = "Internal server error" });
    }
}

private HashSet<string> GetRequiredScopes()
{
    var scopesString = _configuration["Shopify:Scopes"] ?? "read_orders,read_products,read_customers";
    return scopesString.Split(',')
        .Select(s => s.Trim())
        .Where(s => !string.IsNullOrWhiteSpace(s))
        .ToHashSet();
}

private HashSet<string> ParseScopes(string? scopesString)
{
    if (string.IsNullOrWhiteSpace(scopesString))
        return new HashSet<string>();
    
    return scopesString.Split(',')
        .Select(s => s.Trim())
        .Where(s => !string.IsNullOrWhiteSpace(s))
        .ToHashSet();
}

private string GenerateInstallUrl(string shop, HashSet<string>? scopes)
{
    var baseUrl = _configuration["Frontend:BaseUrl"];
    var scopesParam = scopes != null 
        ? string.Join(",", scopes) 
        : _configuration["Shopify:Scopes"];
    
    return $"{baseUrl}/api/shopify/install?shop={Uri.EscapeDataString(shop)}&scopes={Uri.EscapeDataString(scopesParam)}";
}
```

**検証**:
- [ ] 未インストールのショップで正しいレスポンスを返す
- [ ] インストール済みで正常なショップで正しいレスポンスを返す
- [ ] スコープ不足のショップで正しいレスポンスを返す
- [ ] レート制限が機能する
- [ ] 単体テストが合格する

---

#### 1.4 インストールエンドポイントの改修
**目標**: hostパラメータの受け取りと保持

**タスク**:
- [ ] `Install` メソッドの改修
- [ ] hostパラメータの検証ロジック追加
- [ ] OAuthStateDataクラスの作成
- [ ] 単体テストの更新

**実装詳細**:

**データクラス**: `Models/OAuthStateData.cs`
```csharp
public class OAuthStateData
{
    public string Shop { get; set; } = string.Empty;
    public string? Host { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

**コントローラー改修**: `Controllers/ShopifyAuthController.cs`
```csharp
[HttpGet("install")]
[AllowAnonymous]
public IActionResult Install(
    [FromQuery] string shop,
    [FromQuery] string? host = null,
    [FromQuery] string? scopes = null)
{
    try
    {
        // ショップドメインの検証
        if (string.IsNullOrWhiteSpace(shop) || !_oauthService.IsValidShopDomain(shop))
        {
            _logger.LogWarning("無効なショップドメイン: {Shop}", shop);
            return BadRequest(new { error = "Invalid shop domain" });
        }

        // hostパラメータの検証（存在する場合）
        if (!string.IsNullOrWhiteSpace(host) && !IsValidHostParameter(host))
        {
            _logger.LogWarning("無効なhostパラメータ: {Host}", host);
            return BadRequest(new { error = "Invalid host parameter" });
        }

        // レート制限チェック
        var rateLimitKey = $"install_{shop}";
        if (!_rateLimiter.CheckRateLimitAsync(rateLimitKey, 5, TimeSpan.FromMinutes(1)).Result)
        {
            _logger.LogWarning("レート制限超過: {Shop}", shop);
            return StatusCode(429, new { error = "Rate limit exceeded" });
        }

        // CSRF対策用のstateを生成
        var state = GenerateRandomString(32);
        var cacheKey = $"{StateCacheKeyPrefix}{state}";
        
        // stateとhostをキャッシュに保存（10分間有効）
        var stateData = new OAuthStateData
        {
            Shop = shop,
            Host = host,
            CreatedAt = DateTime.UtcNow
        };
        _cache.Set(cacheKey, stateData, TimeSpan.FromMinutes(StateExpirationMinutes));
        
        _logger.LogInformation("OAuth認証開始. Shop: {Shop}, State: {State}, Host: {Host}", 
            shop, state, host != null ? "present" : "null");

        // Shopify OAuth URLを構築
        var apiKey = GetShopifySetting("ApiKey");
        var scopesParam = scopes ?? GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
        var redirectUri = GetRedirectUri();

        var authUrl = $"https://{shop}/admin/oauth/authorize" +
            $"?client_id={apiKey}" +
            $"&scope={scopesParam}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
            $"&state={state}";

        // hostパラメータがある場合、Shopifyに渡す
        if (!string.IsNullOrWhiteSpace(host))
        {
            authUrl += $"&host={Uri.EscapeDataString(host)}";
        }

        // Shopifyの認証ページにリダイレクト
        return Redirect(authUrl);
    }
    catch (Exception ex)
    {
        return HandleOAuthError(ex, shop, "Install");
    }
}

private bool IsValidHostParameter(string host)
{
    try
    {
        // base64デコードを試みる
        var decoded = Convert.FromBase64String(host);
        var decodedString = Encoding.UTF8.GetString(decoded);
        
        // デコード後の文字列にショップドメインが含まれているか確認
        if (!decodedString.Contains(".myshopify.com"))
            return false;

        // 長さチェック
        if (host.Length > 500)
            return false;

        return true;
    }
    catch
    {
        return false;
    }
}
```

**検証**:
- [ ] hostパラメータなしで正常に動作する
- [ ] hostパラメータありで正常に動作する
- [ ] 不正なhostパラメータを拒否する
- [ ] stateとhostがキャッシュに保存される

---

#### 1.5 コールバックエンドポイントの改修
**目標**: hostパラメータの伝播とスコープの保存

**タスク**:
- [ ] `Callback` メソッドの改修
- [ ] スコープ保存ロジックの追加
- [ ] hostパラメータの伝播
- [ ] 単体テストの更新

**実装詳細**:

**コントローラー改修**: `Controllers/ShopifyAuthController.cs`
```csharp
[HttpGet("callback")]
[AllowAnonymous]
public async Task<IActionResult> Callback(
    [FromQuery] string code,
    [FromQuery] string shop,
    [FromQuery] string state,
    [FromQuery] string? host = null,
    [FromQuery] string? hmac = null,
    [FromQuery] string? timestamp = null)
{
    try
    {
        _logger.LogInformation("OAuthコールバック受信. Shop: {Shop}, State: {State}, Host: {Host}", 
            shop, state, host != null ? "present" : "null");

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
        if (!_cache.TryGetValue<OAuthStateData>(cacheKey, out var stateData) || 
            stateData.Shop != shop)
        {
            _logger.LogWarning("無効なstate. Shop: {Shop}, State: {State}", shop, state);
            return Unauthorized(new { error = "Invalid state parameter" });
        }

        // キャッシュからstateを削除（使い捨て）
        _cache.Remove(cacheKey);

        // hostパラメータの優先順位: クエリパラメータ > キャッシュ
        var finalHost = host ?? stateData.Host;

        // HMAC検証
        if (!string.IsNullOrWhiteSpace(hmac) && !string.IsNullOrWhiteSpace(timestamp))
        {
            var isDevelopment = _configuration["ASPNETCORE_ENVIRONMENT"] == "Development";
            var queryParams = HttpContext.Request.Query
                .Select(q => new KeyValuePair<string, StringValues>(q.Key, q.Value))
                .ToList();
            
            var isValidHmac = _oauthService.VerifyHmac(queryParams);
            
            if (!isValidHmac && !isDevelopment)
            {
                _logger.LogWarning("HMAC検証失敗. Shop: {Shop}", shop);
                return Unauthorized(new { error = "HMAC validation failed" });
            }
        }

        // アクセストークンを取得
        var accessToken = await ExchangeCodeForAccessTokenWithRetry(code, shop);
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            _logger.LogError("アクセストークン取得失敗. Shop: {Shop}", shop);
            return StatusCode(500, new { error = "Failed to obtain access token" });
        }

        // ストア情報を保存・更新（スコープも保存）
        await SaveOrUpdateStore(shop, accessToken);

        // Webhook登録
        await RegisterWebhooks(shop, accessToken);

        _logger.LogInformation("OAuth認証完了. Shop: {Shop}", shop);

        // 成功ページにリダイレクト（hostパラメータを保持）
        var frontendUrl = _configuration["Frontend:BaseUrl"];
        var successUrl = $"{frontendUrl}/auth/success?shop={Uri.EscapeDataString(shop)}";
        
        if (!string.IsNullOrWhiteSpace(finalHost))
        {
            successUrl += $"&host={Uri.EscapeDataString(finalHost)}";
        }

        return Redirect(successUrl);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "OAuthコールバック処理中にエラーが発生. Shop: {Shop}", shop);
        
        var frontendUrl = _configuration["Frontend:BaseUrl"];
        var errorUrl = $"{frontendUrl}/auth/error?message={Uri.EscapeDataString(ex.Message)}";
        return Redirect(errorUrl);
    }
}

private async Task SaveOrUpdateStore(string shop, string accessToken)
{
    // Shopify APIからストア情報を取得
    var shopInfo = await _shopifyService.GetShopInfoAsync(shop, accessToken);
    
    // アクセストークンからスコープを取得
    var scopes = await _shopifyService.GetTokenScopesAsync(shop, accessToken);
    
    var store = await _context.Stores.FirstOrDefaultAsync(s => s.Domain == shop);
    
    if (store == null)
    {
        // 新規インストール
        store = new Store
        {
            Domain = shop,
            AccessToken = accessToken,
            Scopes = string.Join(",", scopes),
            ShopName = shopInfo.Name,
            Email = shopInfo.Email,
            InstalledAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Stores.Add(store);
        _logger.LogInformation("新規ストア登録. Shop: {Shop}, Scopes: {Scopes}", shop, store.Scopes);
    }
    else
    {
        // 既存ストアの更新
        store.AccessToken = accessToken;
        store.Scopes = string.Join(",", scopes);
        store.ShopName = shopInfo.Name;
        store.Email = shopInfo.Email;
        store.UpdatedAt = DateTime.UtcNow;
        _logger.LogInformation("ストア情報更新. Shop: {Shop}, Scopes: {Scopes}", shop, store.Scopes);
    }
    
    await _context.SaveChangesAsync();
}
```

**Shopifyサービス拡張**: `Services/ShopifyService.cs`
```csharp
public async Task<List<string>> GetTokenScopesAsync(string shop, string accessToken)
{
    try
    {
        // Shopify APIを使用してトークンのスコープを取得
        var service = new AccessScopeService(shop, accessToken);
        var scopes = await service.ListAsync();
        
        return scopes.Select(s => s.Handle).ToList();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "スコープ取得エラー: {Shop}", shop);
        
        // フォールバック: 設定ファイルから取得
        var configScopes = _configuration["Shopify:Scopes"] ?? "";
        return configScopes.Split(',').Select(s => s.Trim()).ToList();
    }
}
```

**検証**:
- [ ] アクセストークンが正常に取得される
- [ ] スコープがデータベースに保存される
- [ ] hostパラメータが成功URLに含まれる
- [ ] Webhookが登録される

---

### Phase 2: フロントエンド実装（2-3日）

#### 2.1 App Bridgeプロバイダーの実装
**目標**: App Bridgeの初期化とセッショントークン管理

**タスク**:
- [ ] AppBridgeProviderコンポーネントの作成
- [ ] useAppBridgeフックの実装
- [ ] セッショントークン取得機能
- [ ] トップレベルリダイレクト機能

**実装詳細**:

**プロバイダー**: `frontend/src/components/providers/AppBridgeProvider.tsx`
```typescript
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { Redirect } from '@shopify/app-bridge/actions';

interface AppBridgeContextType {
  app: any | null;
  isEmbedded: boolean;
  getToken: () => Promise<string>;
  redirectToUrl: (url: string) => void;
  extractShopFromToken: (token: string) => string | null;
}

const AppBridgeContext = createContext<AppBridgeContextType | null>(null);

export function AppBridgeProvider({ children }: { children: ReactNode }) {
  const [app, setApp] = useState<any | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // URLパラメータからhostを取得
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host');

    if (host) {
      // 埋め込みアプリとして初期化
      const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
      
      if (!apiKey) {
        console.error('❌ NEXT_PUBLIC_SHOPIFY_API_KEY is not defined');
        return;
      }

      try {
        const appInstance = createApp({
          apiKey: apiKey,
          host: host,
        });

        setApp(appInstance);
        setIsEmbedded(true);
        
        console.log('✅ App Bridge初期化成功', { host });
      } catch (error) {
        console.error('❌ App Bridge初期化エラー:', error);
      }
    } else {
      console.log('ℹ️ 非埋め込みモード（hostパラメータなし）');
      setIsEmbedded(false);
    }
  }, []);

  const getToken = async (): Promise<string> => {
    if (!app) {
      throw new Error('App Bridge is not initialized');
    }

    try {
      const token = await getSessionToken(app);
      console.log('✅ セッショントークン取得成功');
      return token;
    } catch (error) {
      console.error('❌ セッショントークン取得エラー:', error);
      throw error;
    }
  };

  const redirectToUrl = (url: string) => {
    console.log('🔄 リダイレクト:', { url, isEmbedded });
    
    if (app && isEmbedded) {
      // 埋め込みアプリの場合、App Bridgeでトップレベルリダイレクト
      try {
        const redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, url);
        console.log('✅ App Bridge リダイレクト実行');
      } catch (error) {
        console.error('❌ App Bridge リダイレクトエラー:', error);
        // フォールバック
        window.top!.location.href = url;
      }
    } else {
      // 非埋め込みの場合、通常のリダイレクト
      window.location.href = url;
    }
  };

  const extractShopFromToken = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const dest = payload.dest;
      
      if (!dest) return null;
      
      // "https://my-store.myshopify.com" -> "my-store.myshopify.com"
      return dest.replace('https://', '').replace('http://', '');
    } catch (error) {
      console.error('❌ トークンからショップ抽出エラー:', error);
      return null;
    }
  };

  return (
    <AppBridgeContext.Provider value={{ 
      app, 
      isEmbedded, 
      getToken, 
      redirectToUrl,
      extractShopFromToken 
    }}>
      {children}
    </AppBridgeContext.Provider>
  );
}

export function useAppBridge() {
  const context = useContext(AppBridgeContext);
  if (!context) {
    throw new Error('useAppBridge must be used within AppBridgeProvider');
  }
  return context;
}
```

**ルートレイアウトへの統合**: `frontend/src/app/layout.tsx`
```typescript
import { AppBridgeProvider } from '@/components/providers/AppBridgeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <AppBridgeProvider>
          {children}
        </AppBridgeProvider>
      </body>
    </html>
  );
}
```

**検証**:
- [ ] hostパラメータがある場合、App Bridgeが初期化される
- [ ] セッショントークンが取得できる
- [ ] トップレベルリダイレクトが機能する
- [ ] 非埋め込みモードでも正常に動作する

---

#### 2.2 AuthGuardの改修
**目標**: 自動インストールチェックと自動リダイレクト

**タスク**:
- [ ] AuthGuardコンポーネントの改修
- [ ] インストール状態チェックAPIの統合
- [ ] 自動リダイレクトロジックの実装
- [ ] ローディング状態の実装

**実装詳細**:

**AuthGuard**: `frontend/src/components/auth/AuthGuard.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppBridge } from '@/components/providers/AppBridgeProvider';
import { getCurrentEnvironmentConfig } from '@/lib/config/environments';
import AuthenticationRequired from '@/components/errors/AuthenticationRequired';
import { Spinner, Frame } from '@shopify/polaris';

interface InstallationStatus {
  installed: boolean;
  scopesValid?: boolean;
  missingScopes?: string[];
  installUrl?: string;
  reauthUrl?: string;
  message: string;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { isEmbedded, getToken, redirectToUrl, extractShopFromToken } = useAppBridge();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [checkMessage, setCheckMessage] = useState('認証状態を確認中...');

  useEffect(() => {
    const checkInstallation = async () => {
      try {
        // 埋め込みアプリの場合
        if (isEmbedded) {
          console.log('🔍 埋め込みアプリ: インストール状態をチェック中...');
          setCheckMessage('Shopifyストアとの接続を確認中...');
          
          // App Bridgeセッショントークンを取得
          const sessionToken = await getToken();
          
          // セッショントークンからショップドメインを抽出
          const shop = extractShopFromToken(sessionToken);

          if (!shop) {
            console.error('❌ セッショントークンからショップドメインを抽出できません');
            setIsAuthenticated(false);
            setIsChecking(false);
            return;
          }

          console.log('🏪 ショップドメイン:', shop);
          setCheckMessage('インストール状態を確認中...');

          // インストール状態をチェック
          const config = getCurrentEnvironmentConfig();
          const statusResponse = await fetch(
            `${config.apiBaseUrl}/api/shopify/status?shop=${encodeURIComponent(shop)}`,
            {
              headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!statusResponse.ok) {
            console.error('❌ インストール状態チェックAPI エラー:', statusResponse.status);
            setIsAuthenticated(false);
            setIsChecking(false);
            return;
          }

          const status: InstallationStatus = await statusResponse.json();
          console.log('📊 インストール状態:', status);

          // 未インストールまたはスコープ不足の場合
          if (!status.installed) {
            console.log('🔄 インストールが必要');
            setCheckMessage('アプリをインストール中...');
            
            if (status.installUrl) {
              console.log('↪️ インストールURLにリダイレクト:', status.installUrl);
              
              // hostパラメータを追加
              const host = searchParams.get('host');
              const finalUrl = host 
                ? `${status.installUrl}&host=${encodeURIComponent(host)}`
                : status.installUrl;
              
              redirectToUrl(finalUrl);
            } else {
              console.error('❌ インストールURLが取得できません');
              setIsAuthenticated(false);
            }
            
            setIsChecking(false);
            return;
          }

          if (!status.scopesValid) {
            console.log('🔄 再認証が必要（スコープ不足）');
            setCheckMessage('追加の権限を要求中...');
            
            if (status.reauthUrl) {
              console.log('↪️ 再認証URLにリダイレクト:', status.reauthUrl);
              
              // hostパラメータを追加
              const host = searchParams.get('host');
              const finalUrl = host 
                ? `${status.reauthUrl}&host=${encodeURIComponent(host)}`
                : status.reauthUrl;
              
              redirectToUrl(finalUrl);
            } else {
              console.error('❌ 再認証URLが取得できません');
              setIsAuthenticated(false);
            }
            
            setIsChecking(false);
            return;
          }

          // インストール済みで正常
          console.log('✅ インストール済み・スコープ正常');
          setIsAuthenticated(true);
        } else {
          // 非埋め込みモード（デモモードなど）
          console.log('ℹ️ 非埋め込みモード: デモモードをチェック中...');
          setCheckMessage('認証情報を確認中...');
          
          const demoToken = localStorage.getItem('demo_token');
          if (demoToken) {
            console.log('✅ デモモード認証済み');
            setIsDemoMode(true);
            setIsAuthenticated(true);
          } else {
            console.log('❌ 認証されていません');
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('❌ インストールチェックエラー:', error);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkInstallation();
  }, [isEmbedded, getToken, redirectToUrl, extractShopFromToken, searchParams]);

  if (isChecking) {
    return (
      <Frame>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1rem'
        }}>
          <Spinner size="large" />
          <p>{checkMessage}</p>
        </div>
      </Frame>
    );
  }

  if (!isAuthenticated) {
    return <AuthenticationRequired />;
  }

  return (
    <>
      {isDemoMode && <DemoModeBanner />}
      {children}
    </>
  );
}

function DemoModeBanner() {
  return (
    <div style={{
      backgroundColor: '#FFF4E5',
      borderBottom: '1px solid #FFD79D',
      padding: '0.75rem',
      textAlign: 'center'
    }}>
      <strong>デモモード</strong> - 読み取り専用です
    </div>
  );
}
```

**検証**:
- [ ] 埋め込みアプリで自動的にインストールチェックが実行される
- [ ] 未インストールの場合、自動的にOAuthフローにリダイレクトされる
- [ ] スコープ不足の場合、自動的に再認証フローにリダイレクトされる
- [ ] インストール済みの場合、アプリが表示される
- [ ] デモモードが正常に動作する

---

#### 2.3 インストールページの改修
**目標**: 自動リダイレクトと手動フォームのフォールバック

**タスク**:
- [ ] インストールページの改修
- [ ] 自動リダイレクトロジックの実装
- [ ] 手動フォームのフォールバック実装
- [ ] UIの改善

**実装詳細**:

**インストールページ**: `frontend/src/app/install/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppBridge } from '@/components/providers/AppBridgeProvider';
import { getCurrentEnvironmentConfig } from '@/lib/config/environments';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  List,
  BlockStack,
  Box,
  Spinner,
  Frame,
} from '@shopify/polaris';

export default function InstallPage() {
  const searchParams = useSearchParams();
  const { isEmbedded, redirectToUrl } = useAppBridge();
  const [showManualForm, setShowManualForm] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const autoRedirect = async () => {
      // URLパラメータからshopまたはhostを取得
      const shop = searchParams.get('shop');
      const host = searchParams.get('host');

      // shopまたはhostがある場合は自動的にインストールフローを開始
      if (shop || host) {
        console.log('🚀 自動インストール開始:', { shop, host });
        setIsRedirecting(true);

        const shopDomain = shop || extractShopFromHost(host);
        if (shopDomain) {
          const config = getCurrentEnvironmentConfig();
          let installUrl = `${config.apiBaseUrl}/api/shopify/install?shop=${encodeURIComponent(shopDomain)}`;
          
          // hostパラメータがある場合、それも含める
          if (host) {
            installUrl += `&host=${encodeURIComponent(host)}`;
          }

          console.log('📍 リダイレクト先:', installUrl);

          // 少し遅延を入れてUXを向上
          setTimeout(() => {
            // 埋め込みアプリの場合、App Bridgeでトップレベルリダイレクト
            if (isEmbedded && host) {
              redirectToUrl(installUrl);
            } else {
              // 通常のリダイレクト
              window.location.href = installUrl;
            }
          }, 500);
          
          return;
        }
      }

      // shopもhostもない場合のみ手動フォームを表示
      console.log('ℹ️ 手動インストールフォームを表示');
      setShowManualForm(true);
    };

    autoRedirect();
  }, [searchParams, isEmbedded, redirectToUrl]);

  const handleInstall = async () => {
    setError('');

    if (!shopDomain.trim()) {
      setError('ストアドメインを入力してください');
      return;
    }

    if (!validateShopDomain(shopDomain)) {
      setError('有効なストアドメインを入力してください（例: my-store）');
      return;
    }

    setIsRedirecting(true);

    const fullDomain = shopDomain.includes('.myshopify.com') 
      ? shopDomain 
      : `${shopDomain}.myshopify.com`;

    const config = getCurrentEnvironmentConfig();
    const installUrl = `${config.apiBaseUrl}/api/shopify/install?shop=${encodeURIComponent(fullDomain)}`;
    
    setTimeout(() => {
      window.location.href = installUrl;
    }, 500);
  };

  const validateShopDomain = (domain: string): boolean => {
    // 英数字とハイフンのみ許可
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    return pattern.test(domain);
  };

  if (isRedirecting) {
    return (
      <Frame>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1rem'
        }}>
          <Spinner size="large" />
          <Text as="p" variant="bodyLg">Shopifyストアに接続中...</Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Shopifyの認証ページにリダイレクトしています
          </Text>
        </div>
      </Frame>
    );
  }

  if (!showManualForm) {
    return (
      <Frame>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}>
          <Spinner size="large" />
        </div>
      </Frame>
    );
  }

  // 手動フォームUI
  return (
    <div style={{ backgroundColor: '#F6F6F7', minHeight: '100vh' }}>
      <Box padding="800">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Page narrowWidth>
            <BlockStack gap="800">
              {/* ヘッダー */}
              <div style={{ textAlign: 'center' }}>
                <Box padding="400">
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    backgroundColor: '#008060',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                      <path d="M21 4H7a2 2 0 0 0-2 2v2.5h0v6h0V20l6-1.5 6 1.5v-5.5h0v-6h0V6a2 2 0 0 0-2-2m-1 11.5c0 .5-.5 1-1 1s-1-.5-1-1V15h-2v.5c0 .5-.5 1-1 1s-1-.5-1-1V15h-2v.5c0 .5-.5 1-1 1s-1-.5-1-1V15H8v.5c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v.5h2V9c0-.5.5-1 1-1s1 .5 1 1v6.5M4 6H3v14h1c.6 0 1-.4 1-1V7c0-.6-.4-1-1-1z"/>
                    </svg>
                  </div>
                </Box>
                <Text as="h1" variant="heading2xl">
                  EC Ranger
                </Text>
                <Box paddingBlockStart="200">
                  <Text as="p" variant="bodyLg" tone="subdued">
                    Shopifyストアの売上を最大化する分析ツール
                  </Text>
                </Box>
              </div>

              {/* 説明バナー */}
              <Banner tone="info">
                <p>
                  このページは通常、自動的にリダイレクトされます。
                  手動でインストールする場合は、以下にショップドメインを入力してください。
                </p>
              </Banner>

              {/* インストールフォーム */}
              <Card>
                <BlockStack gap="400">
                  <FormLayout>
                    <TextField
                      label="ストアドメイン"
                      type="text"
                      value={shopDomain}
                      onChange={setShopDomain}
                      placeholder="your-store"
                      suffix=".myshopify.com"
                      autoComplete="off"
                      error={error}
                      helpText="例: your-store-name（.myshopify.comは自動で追加されます）"
                    />
                  </FormLayout>

                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleInstall}
                    disabled={!shopDomain.trim()}
                  >
                    アプリをインストール
                  </Button>
                </BlockStack>
              </Card>

              {/* 機能説明 */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    このアプリでできること
                  </Text>
                  <List type="bullet">
                    <List.Item>売上データのAI分析</List.Item>
                    <List.Item>顧客行動の詳細な分析</List.Item>
                    <List.Item>商品パフォーマンスの可視化</List.Item>
                    <List.Item>マーケティング施策の最適化提案</List.Item>
                  </List>
                </BlockStack>
              </Card>

              {/* 必要な権限 */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    必要な権限
                  </Text>
                  <List type="bullet">
                    <List.Item>注文データの読み取り</List.Item>
                    <List.Item>商品データの読み取り</List.Item>
                    <List.Item>顧客データの読み取り</List.Item>
                  </List>
                  <Text as="p" variant="bodySm" tone="subdued">
                    これらの権限は分析機能を提供するために必要です。
                    データは安全に保護され、第三者と共有されることはありません。
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Page>
        </div>
      </Box>
    </div>
  );
}

function extractShopFromHost(host: string | null): string | null {
  if (!host) return null;
  try {
    const decoded = atob(host);
    const match = decoded.match(/([^/]+\.myshopify\.com)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
```

**検証**:
- [ ] shopパラメータがある場合、自動的にリダイレクトされる
- [ ] hostパラメータがある場合、自動的にリダイレクトされる
- [ ] パラメータがない場合、手動フォームが表示される
- [ ] 手動フォームが正常に動作する
- [ ] UIが適切に表示される

---

### Phase 3: 統合・テスト（2-3日）

#### 3.1 単体テストの作成
**目標**: すべてのコンポーネントの単体テスト

**タスク**:
- [ ] バックエンド単体テストの作成
- [ ] フロントエンド単体テストの作成
- [ ] テストカバレッジの確認

**バックエンドテスト例**: `Tests/Controllers/ShopifyAuthControllerTests.cs`
```csharp
[Fact]
public async Task GetInstallationStatus_UninstalledShop_ReturnsCorrectResponse()
{
    // Arrange
    var shop = "test-store.myshopify.com";
    
    // Act
    var result = await _controller.GetInstallationStatus(shop);
    
    // Assert
    var okResult = Assert.IsType<OkObjectResult>(result);
    var response = okResult.Value as dynamic;
    Assert.False(response.installed);
    Assert.NotNull(response.installUrl);
}

[Fact]
public async Task GetInstallationStatus_InstalledShopWithValidScopes_ReturnsCorrectResponse()
{
    // Arrange
    var shop = "test-store.myshopify.com";
    await SeedStore(shop, "read_orders,read_products,read_customers");
    
    // Act
    var result = await _controller.GetInstallationStatus(shop);
    
    // Assert
    var okResult = Assert.IsType<OkObjectResult>(result);
    var response = okResult.Value as dynamic;
    Assert.True(response.installed);
    Assert.True(response.scopesValid);
}

[Fact]
public async Task GetInstallationStatus_InstalledShopWithMissingScopes_ReturnsCorrectResponse()
{
    // Arrange
    var shop = "test-store.myshopify.com";
    await SeedStore(shop, "read_orders"); // 不足しているスコープ
    
    // Act
    var result = await _controller.GetInstallationStatus(shop);
    
    // Assert
    var okResult = Assert.IsType<OkObjectResult>(result);
    var response = okResult.Value as dynamic;
    Assert.True(response.installed);
    Assert.False(response.scopesValid);
    Assert.NotEmpty(response.missingScopes);
    Assert.NotNull(response.reauthUrl);
}
```

**フロントエンドテスト例**: `frontend/src/components/auth/__tests__/AuthGuard.test.tsx`
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from '../AuthGuard';
import { useAppBridge } from '@/components/providers/AppBridgeProvider';

jest.mock('@/components/providers/AppBridgeProvider');

describe('AuthGuard', () => {
  it('埋め込みアプリで未インストールの場合、リダイレクトする', async () => {
    const mockGetToken = jest.fn().mockResolvedValue('mock-token');
    const mockRedirectToUrl = jest.fn();
    
    (useAppBridge as jest.Mock).mockReturnValue({
      isEmbedded: true,
      getToken: mockGetToken,
      redirectToUrl: mockRedirectToUrl,
      extractShopFromToken: jest.fn().mockReturnValue('test-store.myshopify.com')
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        installed: false,
        installUrl: 'https://example.com/install'
      })
    });

    render(<AuthGuard><div>Content</div></AuthGuard>);

    await waitFor(() => {
      expect(mockRedirectToUrl).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com/install')
      );
    });
  });

  it('埋め込みアプリでインストール済みの場合、コンテンツを表示', async () => {
    const mockGetToken = jest.fn().mockResolvedValue('mock-token');
    
    (useAppBridge as jest.Mock).mockReturnValue({
      isEmbedded: true,
      getToken: mockGetToken,
      redirectToUrl: jest.fn(),
      extractShopFromToken: jest.fn().mockReturnValue('test-store.myshopify.com')
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        installed: true,
        scopesValid: true
      })
    });

    render(<AuthGuard><div>Content</div></AuthGuard>);

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
```

**検証**:
- [ ] すべての単体テストが合格
- [ ] テストカバレッジが80%以上

---

#### 3.2 統合テストの作成
**目標**: OAuthフロー全体の統合テスト

**タスク**:
- [ ] OAuthフロー統合テストの作成
- [ ] hostパラメータ伝播テストの作成
- [ ] レート制限テストの作成

**統合テスト例**: `Tests/Integration/OAuthFlowTests.cs`
```csharp
[Fact]
public async Task CompleteOAuthFlow_WithHostParameter_PreservesHost()
{
    // Arrange
    var shop = "test-store.myshopify.com";
    var host = "dGVzdC1zdG9yZS5teXNob3BpZnkuY29tL2FkbWlu"; // base64
    
    // Act - Step 1: Install
    var installResponse = await _client.GetAsync(
        $"/api/shopify/install?shop={shop}&host={host}");
    
    // Assert - Step 1
    Assert.Equal(HttpStatusCode.Redirect, installResponse.StatusCode);
    var redirectUrl = installResponse.Headers.Location?.ToString();
    Assert.Contains("host=", redirectUrl);
    
    // Extract state from redirect URL
    var state = ExtractStateFromUrl(redirectUrl);
    
    // Act - Step 2: Callback (mock Shopify response)
    var callbackResponse = await _client.GetAsync(
        $"/api/shopify/callback?code=mock-code&shop={shop}&state={state}&host={host}");
    
    // Assert - Step 2
    Assert.Equal(HttpStatusCode.Redirect, callbackResponse.StatusCode);
    var successUrl = callbackResponse.Headers.Location?.ToString();
    Assert.Contains("host=", successUrl);
    Assert.Contains(host, successUrl);
}
```

**検証**:
- [ ] すべての統合テストが合格
- [ ] OAuthフロー全体が正常に動作

---

#### 3.3 E2Eテストの作成
**目標**: 実際のユーザーフローのE2Eテスト

**タスク**:
- [ ] Playwrightテストの作成
- [ ] 埋め込みアプリシナリオのテスト
- [ ] 手動インストールシナリオのテスト

**E2Eテスト例**: `frontend/tests/e2e/install-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('インストールフロー', () => {
  test('shopパラメータ付きで自動リダイレクト', async ({ page }) => {
    // インストールページにアクセス
    await page.goto('/install?shop=test-store.myshopify.com');
    
    // ローディング表示を確認
    await expect(page.getByText('Shopifyストアに接続中')).toBeVisible();
    
    // リダイレクトを待つ
    await page.waitForURL(/.*shopify\.com.*/, { timeout: 5000 });
    
    // Shopify OAuthページにリダイレクトされたことを確認
    expect(page.url()).toContain('.myshopify.com');
  });

  test('パラメータなしで手動フォーム表示', async ({ page }) => {
    // インストールページにアクセス
    await page.goto('/install');
    
    // 手動フォームが表示されることを確認
    await expect(page.getByLabel('ストアドメイン')).toBeVisible();
    await expect(page.getByRole('button', { name: 'アプリをインストール' })).toBeVisible();
    
    // ショップドメインを入力
    await page.getByLabel('ストアドメイン').fill('test-store');
    
    // インストールボタンをクリック
    await page.getByRole('button', { name: 'アプリをインストール' }).click();
    
    // リダイレクトを待つ
    await page.waitForURL(/.*shopify\.com.*/, { timeout: 5000 });
  });
});
```

**検証**:
- [ ] すべてのE2Eテストが合格
- [ ] 実際のユーザーフローが正常に動作

---

### Phase 4: デプロイ・監視（継続）

#### 4.1 ステージング環境へのデプロイ
**目標**: ステージング環境での動作確認

**タスク**:
- [ ] データベースマイグレーションの実行
- [ ] バックエンドのデプロイ
- [ ] フロントエンドのデプロイ
- [ ] 環境変数の設定確認
- [ ] 動作確認

**デプロイ手順**:
1. データベースマイグレーション
   ```bash
   dotnet ef database update --project backend/ShopifyAnalyticsApi
   ```

2. バックエンドデプロイ
   ```bash
   cd backend/ShopifyAnalyticsApi
   dotnet publish -c Release
   # Azure App Serviceにデプロイ
   ```

3. フロントエンドデプロイ
   ```bash
   cd frontend
   npm run build
   # Azure Static Web Appsにデプロイ
   ```

**検証**:
- [ ] ステージング環境で正常に動作
- [ ] すべての機能が正常に動作
- [ ] パフォーマンスが許容範囲内

---

#### 4.2 本番環境へのデプロイ
**目標**: 本番環境への安全なデプロイ

**タスク**:
- [ ] デプロイ計画の作成
- [ ] ロールバック計画の作成
- [ ] データベースマイグレーションの実行
- [ ] バックエンドのデプロイ
- [ ] フロントエンドのデプロイ
- [ ] 動作確認
- [ ] モニタリング設定

**デプロイチェックリスト**:
- [ ] すべてのテストが合格
- [ ] ステージング環境で動作確認済み
- [ ] データベースバックアップ完了
- [ ] ロールバック手順の確認
- [ ] モニタリングアラート設定
- [ ] ドキュメント更新

**検証**:
- [ ] 本番環境で正常に動作
- [ ] 既存ユーザーへの影響なし
- [ ] パフォーマンスが許容範囲内

---

#### 4.3 モニタリングとフィードバック収集
**目標**: 継続的な監視と改善

**タスク**:
- [ ] Application Insightsの設定
- [ ] ログ監視の設定
- [ ] アラート設定
- [ ] ダッシュボード作成
- [ ] ユーザーフィードバックの収集

**監視項目**:
- インストール成功率
- インストール所要時間
- エラー発生率
- API レスポンスタイム
- レート制限発動回数

**検証**:
- [ ] モニタリングが正常に動作
- [ ] アラートが適切に設定されている
- [ ] ダッシュボードが有用な情報を提供

---

## 📊 進捗管理

### タスク管理
- GitHub Issuesを使用してタスクを管理
- 各Phaseごとにマイルストーンを作成
- 毎日の進捗を記録

### コミュニケーション
- 毎日のスタンドアップミーティング
- 週次の進捗レビュー
- 問題発生時の即座の報告

---

## 🚨 リスク管理

### 技術的リスク
| リスク | 影響 | 対策 |
|--------|------|------|
| App Bridge互換性問題 | 高 | 早期テスト、フォールバック実装 |
| レート制限の誤動作 | 中 | 十分なテスト、監視 |
| データマイグレーション失敗 | 高 | バックアップ、ロールバック計画 |

### スケジュールリスク
| リスク | 影響 | 対策 |
|--------|------|------|
| 実装遅延 | 中 | バッファ時間の確保 |
| テスト不足 | 高 | 自動テストの充実 |

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|-----------|---------|--------|
| 2025-10-25 | 1.0 | 初版作成 | Devin |
