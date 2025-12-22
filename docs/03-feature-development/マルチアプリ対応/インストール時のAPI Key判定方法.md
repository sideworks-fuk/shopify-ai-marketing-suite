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

### 方針: フロントエンドからAPI Keyを渡す + ShopifyAppsテーブル優先

フロントエンドは `NEXT_PUBLIC_SHOPIFY_API_KEY` を持っているため、それをバックエンドに渡すことで、どのShopifyアプリ（公開/カスタム）を使っているかを判断できる。

**重要**: `ShopifyApps`テーブルから取得を優先し、存在しない場合は環境変数から取得（フォールバック）する。

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
        int? shopifyAppId = null;
        
        if (!string.IsNullOrEmpty(apiKey))
        {
            // フロントエンドからAPI Keyが渡された場合
            _logger.LogInformation("フロントエンドからAPI Keyを受け取りました. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
            
            // ShopifyAppテーブルから対応するアプリを検索（優先）
            var shopifyApp = await _context.ShopifyApps
                .FirstOrDefaultAsync(a => a.ApiKey == apiKey && a.IsActive);
            
            if (shopifyApp != null)
            {
                finalApiKey = shopifyApp.ApiKey;
                finalApiSecret = shopifyApp.ApiSecret;
                shopifyAppId = shopifyApp.Id;
                _logger.LogInformation("ShopifyAppテーブルからCredentialsを取得. Shop: {Shop}, App: {AppName}", 
                    shop, shopifyApp.Name);
            }
            else
            {
                // フォールバック: 環境変数から取得（後方互換性）
                finalApiKey = apiKey;
                finalApiSecret = await GetApiSecretByApiKeyAsync(apiKey);
                
                if (string.IsNullOrEmpty(finalApiSecret))
                {
                    _logger.LogError("API Keyに対応するSecretが見つかりません. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
                    return StatusCode(500, new { error = "API Secret not found for the provided API Key" });
                }
                
                _logger.LogInformation("環境変数からCredentialsを取得（フォールバック）. Shop: {Shop}", shop);
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
        
        // stateとAPI Key/Secret/ShopifyAppIdをキャッシュに保存（10分間有効）
        var stateData = new { shop, apiKey = finalApiKey, apiSecret = finalApiSecret, shopifyAppId };
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

#### 2.2 GetApiSecretByApiKeyAsyncメソッドの追加

**変更箇所**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs`

```csharp
/// <summary>
/// API Keyから対応するSecretを取得（ShopifyAppsテーブル優先、フォールバックは環境変数）
/// </summary>
private async Task<string?> GetApiSecretByApiKeyAsync(string apiKey)
{
    try
    {
        // 1. ShopifyAppsテーブルから取得（優先）
        var shopifyApp = await _context.ShopifyApps
            .FirstOrDefaultAsync(a => a.ApiKey == apiKey && a.IsActive);
        
        if (shopifyApp != null)
        {
            _logger.LogInformation("ShopifyAppテーブルからSecretを取得. ApiKey: {ApiKey}, App: {AppName}", 
                apiKey, shopifyApp.Name);
            return shopifyApp.ApiSecret;
        }
        
        // 2. フォールバック: 環境変数から取得（後方互換性）
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
            _logger.LogInformation("環境変数から公開アプリ用のCredentialsを取得. ApiKey: {ApiKey}", apiKey);
            return publicAppApiSecret;
        }
        
        if (!string.IsNullOrEmpty(customAppApiKey) && customAppApiKey == apiKey)
        {
            _logger.LogInformation("環境変数からカスタムアプリ用のCredentialsを取得. ApiKey: {ApiKey}", apiKey);
            return customAppApiSecret;
        }
        
        if (!string.IsNullOrEmpty(defaultApiKey) && defaultApiKey == apiKey)
        {
            _logger.LogInformation("環境変数からデフォルトCredentialsを取得. ApiKey: {ApiKey}", apiKey);
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
// Callbackメソッドで、stateからAPI Key/Secret/ShopifyAppIdを取得
var stateDataJson = _cache.Get<string>(cacheKey);
if (!string.IsNullOrEmpty(stateDataJson))
{
    var stateData = JsonSerializer.Deserialize<StateData>(stateDataJson);
    // stateDataからapiKey、apiSecret、shopifyAppIdを取得
    
    // アクセストークンを取得
    var accessToken = await ExchangeCodeForAccessTokenWithRetry(request.Code, request.Shop);
    
    // ストア情報を保存（ShopifyAppIdも含む）
    await SaveOrUpdateStore(
        request.Shop, 
        accessToken, 
        stateData.apiKey, 
        stateData.apiSecret,
        stateData.shopifyAppId);  // ShopifyAppIdを渡す
}

// StateDataクラス（匿名型の代わり）
private class StateData
{
    public string shop { get; set; } = string.Empty;
    public string apiKey { get; set; } = string.Empty;
    public string? apiSecret { get; set; }
    public int? shopifyAppId { get; set; }
}
```

---

### 3. データベースと環境変数の設定

#### 3.1 ShopifyAppsテーブルへの初期データ投入（必須）

**重要**: `ShopifyApps`テーブルに初期データを投入する必要があります。

```sql
-- 公開アプリの登録
INSERT INTO [dbo].[ShopifyApps] 
    ([Name], [DisplayName], [AppType], [ApiKey], [ApiSecret], [AppUrl], [IsActive], [CreatedAt], [UpdatedAt])
VALUES 
    ('EC Ranger', 'EC Ranger - 公開アプリ', 'Public', 
     '[YOUR_PUBLIC_APP_API_KEY]', '[YOUR_PUBLIC_APP_API_SECRET]', 
     'https://ec-ranger-frontend-public.azurestaticapps.net', 
     1, GETUTCDATE(), GETUTCDATE());

-- カスタムアプリの登録
INSERT INTO [dbo].[ShopifyApps] 
    ([Name], [DisplayName], [AppType], [ApiKey], [ApiSecret], [AppUrl], [IsActive], [CreatedAt], [UpdatedAt])
VALUES 
    ('EC Ranger Demo', 'EC Ranger - カスタムアプリ', 'Custom', 
     '[YOUR_CUSTOM_APP_API_KEY]', '[YOUR_CUSTOM_APP_API_SECRET]', 
     'https://ec-ranger-frontend-custom.azurestaticapps.net', 
     1, GETUTCDATE(), GETUTCDATE());
```

#### 3.2 バックエンド環境変数（フォールバック用・後方互換性）

**注意**: `ShopifyApps`テーブルが優先されますが、後方互換性のため環境変数も設定しておくことを推奨します。

```bash
# 公開アプリ用（フォールバック）
Shopify__PublicApp__ApiKey=YOUR_PUBLIC_APP_API_KEY
Shopify__PublicApp__ApiSecret=YOUR_PUBLIC_APP_API_SECRET

# カスタムアプリ用（フォールバック）
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
  │   ├─ ShopifyAppsテーブルから取得を試みる（優先）
  │   │   ├─ 見つかった場合: ApiSecretとShopifyAppIdを取得
  │   │   └─ 見つからない場合: GetApiSecretByApiKeyAsync(apiKey) で環境変数から取得（フォールバック）
  │   └─ stateにapiKey、apiSecret、shopifyAppIdを保存
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
  ├─ stateからAPI Key/Secret/ShopifyAppIdを取得
  └─ ExchangeCodeForAccessToken(code, shop, apiKey, apiSecret)
  ↓
バックエンド: SaveOrUpdateStore(shop, accessToken, apiKey, apiSecret, shopifyAppId)
  └─ データベースに保存（初回インストール時）
      ├─ ShopifyAppIdを設定（優先）
      └─ ApiKey/ApiSecretは後方互換性のため保存（ShopifyAppIdが設定されていない場合のみ）
```

---

## メリット

1. ✅ **初回インストール時の問題を解決**: フロントエンドからAPI Keyを渡すことで、どのアプリを使っているか判断可能
2. ✅ **ShopifyAppsテーブル優先**: アプリ情報を一元管理し、重複を削減
3. ✅ **既存ロジックとの互換性**: API Keyが渡されていない場合は既存のロジックを使用
4. ✅ **柔軟性**: 複数のShopifyアプリ（公開/カスタム）に対応可能
5. ✅ **後方互換性**: 環境変数からの取得もサポート（フォールバック）
6. ✅ **セキュリティ**: API Keyは公開情報のため、クエリパラメータで渡しても問題なし

---

## 注意点

1. ⚠️ **ShopifyAppsテーブルの初期データ投入が必須**: マイグレーション実行後、必ず初期データを投入する
2. ⚠️ **API Keyは公開情報**: Shopify API Keyは公開情報のため、クエリパラメータで渡しても問題なし
3. ⚠️ **API Secretは非公開**: API Secretは絶対にクエリパラメータで渡さない
4. ⚠️ **環境変数はフォールバック**: `ShopifyApps`テーブルが優先されるが、後方互換性のため環境変数も設定しておくことを推奨
5. ⚠️ **ShopifyAppIdの保存**: `SaveOrUpdateStore`で`shopifyAppId`を設定することで、ストアとアプリの関係を管理

---

## 実装順序

1. ✅ 設計書の作成（本ドキュメント）
2. [ ] **ShopifyAppsテーブルの実装（必須）**
   - [ ] `ShopifyApp`エンティティの作成
   - [ ] `Store`エンティティに`ShopifyAppId`を追加
   - [ ] EF Core Migrationの作成
   - [ ] マイグレーションの実行
   - [ ] 初期データの投入（公開アプリ/カスタムアプリ）
3. [ ] バックエンドの修正
   - [ ] `GetApiSecretByApiKeyAsync`メソッドの追加（ShopifyAppsテーブル優先）
   - [ ] `Install`メソッドの修正（`shopifyAppId`をstateに保存）
   - [ ] `Callback`メソッドの修正（stateから`shopifyAppId`を取得）
   - [ ] `SaveOrUpdateStore`メソッドの修正（`shopifyAppId`パラメータの追加）
4. [ ] フロントエンドの修正
   - [ ] `install/page.tsx`の修正
   - [ ] `AuthenticationRequired.tsx`の修正
5. [ ] 環境変数の設定（フォールバック用・後方互換性）
   - [ ] バックエンド（Azure App Service）
   - [ ] フロントエンド（Azure Static Web Apps）
6. [ ] テスト
   - [ ] 公開アプリでのインストールテスト
   - [ ] カスタムアプリでのインストールテスト
   - [ ] 既存ストアでの動作確認
   - [ ] ShopifyAppsテーブルからの取得確認
   - [ ] 環境変数フォールバックの確認

---

## 関連ドキュメント

- `ShopifyAppsテーブル設計書.md` - ShopifyAppsテーブルの設計（必須参照）
- `マルチアプリ対応設計書.md` - 全体設計
- `実装方針決定書.md` - 実装方針
- `公開アプリとカスタムアプリの構成パターン.md` - パターン比較

