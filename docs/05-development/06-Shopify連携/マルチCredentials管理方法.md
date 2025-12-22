# マルチCredentials管理方法

## 質問
アプリ側のCredentialsを環境変数で持っているが、複数持てるようにするということか？

## 回答

**環境変数で複数持つ方法と、データベースで管理する方法の2つがあります。**  
**推奨はデータベースベースの管理です。**

## 現在の実装

### 環境変数での管理（1つのCredentialsのみ）

```bash
# Azure App Service 環境変数
Shopify__ApiKey=[YOUR_SHOPIFY_API_KEY]
Shopify__ApiSecret=[YOUR_SHOPIFY_API_SECRET]
```

コード内での取得：
```csharp
var apiKey = GetShopifySetting("ApiKey"); // 設定ファイル/環境変数から1つ取得
```

## 方法1: 環境変数で複数のCredentialsを管理（非推奨）

### 実装方法

環境変数を配列形式で定義：

```bash
# 公開アプリ用
<<<<<<< HEAD
<<<<<<< HEAD
Shopify__PublicApp__ApiKey=[YOUR_PUBLIC_APP_API_KEY]
Shopify__PublicApp__ApiSecret=[YOUR_PUBLIC_APP_API_SECRET]

# カスタムアプリ用
Shopify__CustomApp__ApiKey=[YOUR_CUSTOM_APP_API_KEY]
Shopify__CustomApp__ApiSecret=[YOUR_CUSTOM_APP_API_SECRET]
=======
Shopify__PublicApp__ApiKey=YOUR_PUBLIC_APP_API_KEY
Shopify__PublicApp__ApiSecret=YOUR_PUBLIC_APP_API_SECRET

# カスタムアプリ用
Shopify__CustomApp__ApiKey=YOUR_CUSTOM_APP_API_KEY
Shopify__CustomApp__ApiSecret=YOUR_CUSTOM_APP_API_SECRET
>>>>>>> 368c771 (fix : ドキュメント)
=======
Shopify__PublicApp__ApiKey=[YOUR_PUBLIC_APP_API_KEY]
Shopify__PublicApp__ApiSecret=[YOUR_PUBLIC_APP_API_SECRET]

# カスタムアプリ用
Shopify__CustomApp__ApiKey=[YOUR_CUSTOM_APP_API_KEY]
Shopify__CustomApp__ApiSecret=[YOUR_CUSTOM_APP_API_SECRET]
>>>>>>> 9dcc1a4 (fix : ドキュメント)
```

### デメリット
- ❌ アプリが増えるたびに環境変数を追加する必要がある
- ❌ どのストアがどのアプリを使うかのマッピングが複雑
- ❌ 環境変数の管理が煩雑になる
- ❌ 動的な追加・削除ができない

## 方法2: データベースで管理（推奨）

### 実装方法

`Store` テーブルの `ApiKey` と `ApiSecret` フィールドを活用：

```sql
-- ストア作成時に、対応するShopifyアプリのCredentialsを保存
UPDATE Stores 
<<<<<<< HEAD
<<<<<<< HEAD
SET ApiKey = '[YOUR_SHOPIFY_API_KEY_1]',
    ApiSecret = '[YOUR_SHOPIFY_API_SECRET_1]'
=======
SET ApiKey = 'YOUR_SHOPIFY_API_KEY_1',
    ApiSecret = 'YOUR_SHOPIFY_API_SECRET_1'
>>>>>>> 368c771 (fix : ドキュメント)
=======
SET ApiKey = '[YOUR_SHOPIFY_API_KEY_1]',
    ApiSecret = '[YOUR_SHOPIFY_API_SECRET_1]'
>>>>>>> 9dcc1a4 (fix : ドキュメント)
WHERE Domain = 'store1.myshopify.com';

-- 別のストアには別のCredentialsを設定
UPDATE Stores 
<<<<<<< HEAD
<<<<<<< HEAD
SET ApiKey = '[YOUR_SHOPIFY_API_KEY_2]',
    ApiSecret = '[YOUR_SHOPIFY_API_SECRET_2]'
=======
SET ApiKey = 'YOUR_SHOPIFY_API_KEY_2',
    ApiSecret = 'YOUR_SHOPIFY_API_SECRET_2'
>>>>>>> 368c771 (fix : ドキュメント)
=======
SET ApiKey = '[YOUR_SHOPIFY_API_KEY_2]',
    ApiSecret = '[YOUR_SHOPIFY_API_SECRET_2]'
>>>>>>> 9dcc1a4 (fix : ドキュメント)
WHERE Domain = 'store2.myshopify.com';
```

### コード修正例

`ShopifyAuthController.cs` の `GetShopifySetting()` を拡張：

```csharp
// 現在の実装
private string GetShopifySetting(string key, string defaultValue = "")
{
    // 環境変数 → 設定ファイルの順で検索
    return _configuration[$"Shopify:{key}"] ?? defaultValue;
}

// 修正後: ストア固有のCredentialsを優先
private async Task<(string ApiKey, string ApiSecret)> GetShopifyCredentialsAsync(string shopDomain)
{
    // 1. データベースからストア情報を取得
    var store = await _context.Stores
        .FirstOrDefaultAsync(s => s.Domain == shopDomain);
    
    // 2. ストア固有のCredentialsがあれば使用
    if (store != null && 
        !string.IsNullOrEmpty(store.ApiKey) && 
        !string.IsNullOrEmpty(store.ApiSecret))
    {
        _logger.LogInformation("Using store-specific credentials for {Shop}", shopDomain);
        return (store.ApiKey, store.ApiSecret);
    }
    
    // 3. フォールバック: 環境変数/設定ファイルから取得
    var apiKey = GetShopifySetting("ApiKey");
    var apiSecret = GetShopifySetting("ApiSecret");
    
    _logger.LogInformation("Using default credentials from configuration for {Shop}", shopDomain);
    return (apiKey, apiSecret);
}
```

### メリット
- ✅ ストアごとに異なるCredentialsを柔軟に設定可能
- ✅ 動的な追加・削除が可能
- ✅ 環境変数の管理が不要（デフォルト値のみ環境変数で設定）
- ✅ スケーラブル（アプリが増えても対応可能）

## 実装手順

### ステップ1: OAuth認証フローの修正

`ShopifyAuthController.cs` の `Install` メソッドを修正：

```csharp
[HttpGet("install")]
[AllowAnonymous]
public async Task<IActionResult> Install([FromQuery] string shop)
{
    try
    {
        // ショップドメインの検証
        if (string.IsNullOrWhiteSpace(shop) || !IsValidShopDomain(shop))
        {
            return BadRequest(new { error = "Invalid shop domain" });
        }

        // ストア固有のCredentialsを取得
        var (apiKey, apiSecret) = await GetShopifyCredentialsAsync(shop);
        
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("API Key not found for shop: {Shop}", shop);
            return StatusCode(500, new { error = "API Key not configured" });
        }

        // CSRF対策用のstateを生成
        var state = GenerateRandomString(32);
        var cacheKey = $"{StateCacheKeyPrefix}{state}";
        _cache.Set(cacheKey, shop, TimeSpan.FromMinutes(StateExpirationMinutes));

        // Shopify OAuth URLを構築
        var scopes = GetShopifySetting("Scopes", "read_orders,read_products,read_customers");
        var redirectUri = GetRedirectUri();

        var authUrl = $"https://{shop}/admin/oauth/authorize" +
            $"?client_id={apiKey}" +
            $"&scope={scopes}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
            $"&state={state}";

        return Redirect(authUrl);
    }
    catch (Exception ex)
    {
        return HandleOAuthError(ex, shop, "Install");
    }
}
```

### ステップ2: コールバック処理の修正

`ExchangeCodeForAccessTokenWithRetry` メソッドも修正：

```csharp
private async Task<string?> ExchangeCodeForAccessTokenWithRetry(
    string code, 
    string shop, 
    int maxRetries = 3)
{
    // ストア固有のCredentialsを取得
    var (apiKey, apiSecret) = await GetShopifyCredentialsAsync(shop);
    
    // アクセストークン取得処理...
}
```

### ステップ3: ストア作成時のCredentials設定

OAuth認証完了時に、使用したAPI Key/Secretをストア情報に保存：

```csharp
private async Task SaveOrUpdateStore(string shop, string accessToken)
{
    var store = await _context.Stores
        .FirstOrDefaultAsync(s => s.Domain == shop);
    
    if (store == null)
    {
        // 新規ストア作成
        store = new Store
        {
            Domain = shop,
            Name = shop,
            AccessToken = accessToken,
            // 使用したAPI Key/Secretを保存（オプション）
            // ApiKey = apiKey,
            // ApiSecret = apiSecret,
            CreatedAt = DateTime.UtcNow
        };
        _context.Stores.Add(store);
    }
    else
    {
        // 既存ストア更新
        store.AccessToken = accessToken;
        store.UpdatedAt = DateTime.UtcNow;
    }
    
    await _context.SaveChangesAsync();
}
```

## 推奨アプローチ

### ハイブリッド方式（推奨）

1. **デフォルトCredentials**: 環境変数で設定（フォールバック用）
   ```bash
<<<<<<< HEAD
<<<<<<< HEAD
   Shopify__ApiKey=[YOUR_DEFAULT_SHOPIFY_API_KEY]
   Shopify__ApiSecret=[YOUR_DEFAULT_SHOPIFY_API_SECRET]
=======
   Shopify__ApiKey=YOUR_DEFAULT_SHOPIFY_API_KEY
   Shopify__ApiSecret=YOUR_DEFAULT_SHOPIFY_API_SECRET
>>>>>>> 368c771 (fix : ドキュメント)
=======
   Shopify__ApiKey=[YOUR_DEFAULT_SHOPIFY_API_KEY]
   Shopify__ApiSecret=[YOUR_DEFAULT_SHOPIFY_API_SECRET]
>>>>>>> 9dcc1a4 (fix : ドキュメント)
   ```

2. **ストア固有Credentials**: データベースで管理
   - ストア作成時に、対応するShopifyアプリのCredentialsを設定
   - データベースに保存されていない場合は、デフォルトCredentialsを使用

### メリット
- ✅ 既存のストアはデフォルトCredentialsで動作（後方互換性）
- ✅ 新しいストアは個別のCredentialsを設定可能
- ✅ 段階的な移行が可能

## まとめ

| 項目 | 環境変数（複数） | データベース管理 |
|------|----------------|-----------------|
| 実装難易度 | 中 | 中 |
| 管理のしやすさ | 低（環境変数が増える） | 高（データベースで一元管理） |
| スケーラビリティ | 低（環境変数の数に制限） | 高（無制限） |
| 動的な追加 | 不可（再デプロイ必要） | 可能（SQLで更新） |
| 推奨度 | ⭐⭐ | ⭐⭐⭐⭐⭐ |

**結論**: データベースベースの管理を推奨します。環境変数はデフォルト値（フォールバック）としてのみ使用します。

## 関連ドキュメント
- `マルチアプリ対応アーキテクチャ.md` - 全体アーキテクチャ
- `アプリインストールガイド.md` - OAuth認証フローの詳細

