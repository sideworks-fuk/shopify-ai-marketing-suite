# インストール時のAPI Key判定方法

## 問題点

**初回インストール時**は、データベースにストア情報が存在しないため、どのAPI Key/Secretを使うべきか判断できない。

### 現在の実装の問題

```
[ユーザーがインストール開始]
  ↓
フロントエンド: /api/shopify/install?shop=store1.myshopify.com
  ↓
バックエンド: GetShopifyCredentialsAsync("store1.myshopify.com")
  ├─ データベースから取得を試みる
  └─ ❌ 初回インストール時は存在しない
  ↓
フォールバック: 設定ファイルから取得
  └─ ❌ どのAPI Key/Secretを使うべきか判断できない
```

---

## 解決策

### 方針: フロントエンドからAPI Keyを渡す

フロントエンドは `NEXT_PUBLIC_SHOPIFY_API_KEY` を持っているため、それをバックエンドに渡すことで、どのShopifyアプリ（公開/カスタム）を使っているかを判断できる。

---

## 実装方法

### 1. フロントエンドの修正

**変更箇所**: `frontend/src/app/install/page.tsx`

```typescript
// 修正前
const installUrl = `${config.apiBaseUrl}/api/shopify/install?shop=${encodeURIComponent(fullDomain)}&redirect_uri=${encodeURIComponent(`${window.location.origin}/api/shopify/callback`)}`;

// 修正後
const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const installUrl = `${config.apiBaseUrl}/api/shopify/install?shop=${encodeURIComponent(fullDomain)}&api_key=${encodeURIComponent(apiKey || '')}&redirect_uri=${encodeURIComponent(`${window.location.origin}/api/shopify/callback`)}`;
```

**変更箇所**: `frontend/src/components/errors/AuthenticationRequired.tsx`

```typescript
// 修正前
const shopifyAuthUrl = `/api/shopify/install?shop=${domain}`

// 修正後
const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;
const shopifyAuthUrl = `/api/shopify/install?shop=${domain}&api_key=${encodeURIComponent(apiKey || '')}`
```

---

### 2. バックエンドの修正

#### 2.1 Installメソッドの修正

**変更箇所**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs`

```csharp
[HttpGet("install")]
[AllowAnonymous]
public async Task<IActionResult> Install(
    [FromQuery] string shop,
    [FromQuery] string? apiKey = null)  // 追加: フロントエンドからAPI Keyを受け取る
{
    try
    {
        // ショップドメインの検証
        if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
        {
            _logger.LogWarning("無効なショップドメイン: {Shop}", shop);
            return BadRequest(new { error = "Invalid shop domain" });
        }

        // API Key/Secretの取得ロジック
        string finalApiKey;
        string? finalApiSecret;
        
        if (!string.IsNullOrEmpty(apiKey))
        {
            // フロントエンドからAPI Keyが渡された場合
            _logger.LogInformation("フロントエンドからAPI Keyを受け取りました. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
            
            // API Keyから対応するSecretを取得
            finalApiKey = apiKey;
            finalApiSecret = GetApiSecretByApiKey(apiKey);
            
            if (string.IsNullOrEmpty(finalApiSecret))
            {
                _logger.LogError("API Keyに対応するSecretが見つかりません. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
                return StatusCode(500, new { error = "API Secret not found for the provided API Key" });
            }
        }
        else
        {
            // フロントエンドからAPI Keyが渡されていない場合（既存のロジック）
            var (dbApiKey, dbApiSecret) = await GetShopifyCredentialsAsync(shop);
            finalApiKey = dbApiKey;
            finalApiSecret = dbApiSecret;
        }
        
        if (string.IsNullOrEmpty(finalApiKey))
        {
            _logger.LogError("API Keyが見つかりません. Shop: {Shop}", shop);
            return StatusCode(500, new { error = "API Key not configured" });
        }

        // CSRF対策用のstateを生成
        var state = GenerateRandomString(32);
        var cacheKey = $"{StateCacheKeyPrefix}{state}";
        
        // stateとAPI Key/Secretをキャッシュに保存（10分間有効）
        var stateData = new { shop, apiKey = finalApiKey, apiSecret = finalApiSecret };
        _cache.Set(cacheKey, JsonSerializer.Serialize(stateData), TimeSpan.FromMinutes(StateExpirationMinutes));
        
        _logger.LogInformation("OAuth認証開始. Shop: {Shop}, State: {State}, ApiKey: {ApiKey}", shop, state, finalApiKey);

        // Shopify OAuth URLを構築
        var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
        var redirectUri = GetRedirectUri();

        var authUrl = $"https://{shop}/admin/oauth/authorize" +
            $"?client_id={finalApiKey}" +
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
```

#### 2.2 GetApiSecretByApiKeyメソッドの追加

**変更箇所**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs`

```csharp
/// <summary>
/// API Keyから対応するSecretを取得
/// </summary>
private string? GetApiSecretByApiKey(string apiKey)
{
    try
    {
        // 環境変数から複数のAPI Key/Secretペアを取得
        // 公開アプリ用
        var publicAppApiKey = GetShopifySetting("PublicApp:ApiKey") ?? 
                             _configuration["Shopify:PublicApp:ApiKey"] ??
                             Environment.GetEnvironmentVariable("Shopify__PublicApp__ApiKey");
        var publicAppApiSecret = GetShopifySetting("PublicApp:ApiSecret") ?? 
                                _configuration["Shopify:PublicApp:ApiSecret"] ??
                                Environment.GetEnvironmentVariable("Shopify__PublicApp__ApiSecret");
        
        // カスタムアプリ用
        var customAppApiKey = GetShopifySetting("CustomApp:ApiKey") ?? 
                             _configuration["Shopify:CustomApp:ApiKey"] ??
                             Environment.GetEnvironmentVariable("Shopify__CustomApp__ApiKey");
        var customAppApiSecret = GetShopifySetting("CustomApp:ApiSecret") ?? 
                                _configuration["Shopify:CustomApp:ApiSecret"] ??
                                Environment.GetEnvironmentVariable("Shopify__CustomApp__ApiSecret");
        
        // デフォルト（既存の設定）
        var defaultApiKey = GetShopifySetting("ApiKey");
        var defaultApiSecret = GetShopifySetting("ApiSecret");
        
        // API Keyが一致するSecretを返す
        if (!string.IsNullOrEmpty(publicAppApiKey) && publicAppApiKey == apiKey)
        {
            _logger.LogInformation("公開アプリ用のCredentialsを使用. ApiKey: {ApiKey}", apiKey);
            return publicAppApiSecret;
        }
        
        if (!string.IsNullOrEmpty(customAppApiKey) && customAppApiKey == apiKey)
        {
            _logger.LogInformation("カスタムアプリ用のCredentialsを使用. ApiKey: {ApiKey}", apiKey);
            return customAppApiSecret;
        }
        
        if (!string.IsNullOrEmpty(defaultApiKey) && defaultApiKey == apiKey)
        {
            _logger.LogInformation("デフォルトCredentialsを使用. ApiKey: {ApiKey}", apiKey);
            return defaultApiSecret;
        }
        
        _logger.LogWarning("API Keyに対応するSecretが見つかりません. ApiKey: {ApiKey}", apiKey);
        return null;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "API Secret取得中にエラーが発生. ApiKey: {ApiKey}", apiKey);
        return null;
    }
}
```

#### 2.3 Callbackメソッドの修正

**変更箇所**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs`

```csharp
// Callbackメソッドで、stateからAPI Key/Secretを取得
var stateDataJson = _cache.Get<string>(cacheKey);
if (!string.IsNullOrEmpty(stateDataJson))
{
    var stateData = JsonSerializer.Deserialize<dynamic>(stateDataJson);
    // stateDataからapiKeyとapiSecretを取得して使用
}
```

---

### 3. 環境変数の設定

#### 3.1 バックエンド（Azure App Service）

```bash
# 公開アプリ用
Shopify__PublicApp__ApiKey=YOUR_PUBLIC_APP_API_KEY
Shopify__PublicApp__ApiSecret=YOUR_PUBLIC_APP_API_SECRET

# カスタムアプリ用
Shopify__CustomApp__ApiKey=YOUR_CUSTOM_APP_API_KEY
Shopify__CustomApp__ApiSecret=YOUR_CUSTOM_APP_API_SECRET

# デフォルト（既存の設定、後方互換性のため）
Shopify__ApiKey=YOUR_DEFAULT_API_KEY
Shopify__ApiSecret=YOUR_DEFAULT_API_SECRET
```

#### 3.2 フロントエンド（Azure Static Web Apps）

**公開アプリ用**:
```bash
NEXT_PUBLIC_SHOPIFY_API_KEY=YOUR_PUBLIC_APP_API_KEY
```

**カスタムアプリ用**:
```bash
NEXT_PUBLIC_SHOPIFY_API_KEY=YOUR_CUSTOM_APP_API_KEY
```

---

## フロー図

### 修正後のフロー

```
[ユーザーがインストール開始]
  ↓
フロントエンド: /api/shopify/install?shop=store1.myshopify.com&api_key=AAA
  ├─ NEXT_PUBLIC_SHOPIFY_API_KEY を取得
  └─ クエリパラメータとしてバックエンドに渡す
  ↓
バックエンド: Install(shop, apiKey)
  ├─ apiKeyが渡された場合
  │   ├─ GetApiSecretByApiKey(apiKey) でSecretを取得
  │   └─ 環境変数から対応するSecretを取得
  └─ apiKeyが渡されていない場合（既存ロジック）
      └─ GetShopifyCredentialsAsync(shop) でデータベースから取得
  ↓
Shopify OAuth URL構築（取得したAPI Keyを使用）
  ↓
[ユーザーがShopifyで認証]
  ↓
[OAuth認証完了]
  ↓
バックエンド: Callback(code, shop, state)
  ├─ stateからAPI Key/Secretを取得
  └─ ExchangeCodeForAccessToken(code, shop, apiKey, apiSecret)
  ↓
バックエンド: SaveOrUpdateStore(shop, accessToken, apiKey, apiSecret)
  └─ データベースに保存（初回インストール時）
```

---

## メリット

1. ✅ **初回インストール時の問題を解決**: フロントエンドからAPI Keyを渡すことで、どのアプリを使っているか判断可能
2. ✅ **既存ロジックとの互換性**: API Keyが渡されていない場合は既存のロジックを使用
3. ✅ **柔軟性**: 複数のShopifyアプリ（公開/カスタム）に対応可能
4. ✅ **セキュリティ**: API Keyは公開情報のため、クエリパラメータで渡しても問題なし

---

## 注意点

1. ⚠️ **API Keyは公開情報**: Shopify API Keyは公開情報のため、クエリパラメータで渡しても問題なし
2. ⚠️ **API Secretは非公開**: API Secretは絶対にクエリパラメータで渡さない
3. ⚠️ **環境変数の管理**: 各環境（開発/ステージング/本番）で適切に設定する必要がある

---

## 実装順序

1. ✅ 設計書の作成（本ドキュメント）
2. [ ] バックエンドの修正
   - [ ] `GetApiSecretByApiKey`メソッドの追加
   - [ ] `Install`メソッドの修正
   - [ ] `Callback`メソッドの修正（stateからAPI Key/Secretを取得）
3. [ ] フロントエンドの修正
   - [ ] `install/page.tsx`の修正
   - [ ] `AuthenticationRequired.tsx`の修正
4. [ ] 環境変数の設定
   - [ ] バックエンド（Azure App Service）
   - [ ] フロントエンド（Azure Static Web Apps）
5. [ ] テスト
   - [ ] 公開アプリでのインストールテスト
   - [ ] カスタムアプリでのインストールテスト
   - [ ] 既存ストアでの動作確認

---

## 関連ドキュメント

- `マルチアプリ対応設計書.md` - 全体設計
- `実装方針決定書.md` - 実装方針
- `公開アプリとカスタムアプリの構成パターン.md` - パターン比較

