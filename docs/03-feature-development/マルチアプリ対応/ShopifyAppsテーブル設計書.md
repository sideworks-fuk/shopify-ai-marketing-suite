# ShopifyAppsテーブル設計書

## 概要

Shopifyアプリの情報を一元管理するための`ShopifyApps`テーブルを追加し、ストアとアプリの関係を管理する。

---

## 問題点（現在の設計）

### 現在の設計の問題

1. **重複データ**: 同じShopifyアプリ（公開アプリ）を使う複数のストアがある場合、各ストアに同じAPI Key/Secretを保存することになる
2. **管理の複雑さ**: アプリ情報（名前、説明、App URLなど）を管理できない
3. **更新の困難さ**: API Key/Secretを変更する場合、すべてのストアを更新する必要がある

### 現在の`Store`テーブル構造

```csharp
public class Store
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? Domain { get; set; }
    public string? ApiKey { get; set; }      // ← ストアごとに保存
    public string? ApiSecret { get; set; }   // ← ストアごとに保存
    public string? AccessToken { get; set; }
    // ...
}
```

---

## 解決策

### 新しい設計

1. **`ShopifyApps`テーブルを作成**: Shopifyアプリの情報を一元管理
2. **`Stores`テーブルに`ShopifyAppId`を追加**: ストアがどのアプリを使っているかを参照
3. **アプリごとのAPI Key/Secretを`ShopifyApps`テーブルに保存**: 重複を削減

---

## データベーススキーマ設計

### 1. ShopifyAppsテーブル（新規作成）

```sql
CREATE TABLE [dbo].[ShopifyApps] (
    [Id] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL,                    -- アプリ名（例: "EC Ranger"）
    [DisplayName] NVARCHAR(200) NULL,                 -- 表示名（例: "EC Ranger - 公開アプリ"）
    [AppType] NVARCHAR(50) NOT NULL,                  -- アプリタイプ（"Public" / "Custom"）
    [ApiKey] NVARCHAR(255) NOT NULL,                  -- Shopify API Key
    [ApiSecret] NVARCHAR(255) NOT NULL,                -- Shopify API Secret（暗号化推奨）
    [AppUrl] NVARCHAR(500) NULL,                       -- App URL（例: "https://ec-ranger-frontend-public.azurestaticapps.net"）
    [RedirectUri] NVARCHAR(500) NULL,                  -- OAuth Redirect URI
    [Scopes] NVARCHAR(500) NULL,                      -- 要求するスコープ（例: "read_orders,read_products"）
    [Description] NVARCHAR(1000) NULL,                 -- アプリの説明
    [IsActive] BIT NOT NULL DEFAULT 1,                -- 有効/無効フラグ
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- インデックス
    INDEX IX_ShopifyApps_ApiKey ([ApiKey]),
    INDEX IX_ShopifyApps_AppType ([AppType]),
    INDEX IX_ShopifyApps_IsActive ([IsActive])
);
```

### 2. Storesテーブルの変更

```sql
-- ShopifyAppIdカラムを追加
ALTER TABLE [dbo].[Stores]
ADD [ShopifyAppId] INT NULL;

-- 外部キー制約を追加
ALTER TABLE [dbo].[Stores]
ADD CONSTRAINT FK_Stores_ShopifyApps 
    FOREIGN KEY ([ShopifyAppId]) 
    REFERENCES [dbo].[ShopifyApps]([Id]);

-- インデックスを追加
CREATE INDEX IX_Stores_ShopifyAppId ON [dbo].[Stores]([ShopifyAppId]);

-- 既存のApiKey/ApiSecretカラムは後方互換性のため残す（非推奨）
-- 将来的に削除する予定
```

---

## エンティティモデル

### 1. ShopifyAppエンティティ（新規作成）

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// Shopifyアプリエンティティ（マルチアプリ対応）
    /// </summary>
    public class ShopifyApp
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(200)]
        public string? DisplayName { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string AppType { get; set; } = "Public"; // "Public" or "Custom"
        
        [Required]
        [MaxLength(255)]
        public string ApiKey { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(255)]
        public string ApiSecret { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? AppUrl { get; set; }
        
        [MaxLength(500)]
        public string? RedirectUri { get; set; }
        
        [MaxLength(500)]
        public string? Scopes { get; set; }
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // ナビゲーションプロパティ
        public virtual ICollection<Store> Stores { get; set; } = new List<Store>();
    }
}
```

### 2. Storeエンティティの変更

```csharp
public class Store
{
    // 既存のプロパティ...
    
    // 新規追加: ShopifyAppId（外部キー）
    public int? ShopifyAppId { get; set; }
    
    // 既存のApiKey/ApiSecretは後方互換性のため残す（非推奨）
    [MaxLength(255)]
    [Obsolete("Use ShopifyApp.ApiKey instead")]
    public string? ApiKey { get; set; }
    
    [MaxLength(255)]
    [Obsolete("Use ShopifyApp.ApiSecret instead")]
    public string? ApiSecret { get; set; }
    
    // ナビゲーションプロパティ
    public virtual ShopifyApp? ShopifyApp { get; set; }
    
    // 既存のナビゲーションプロパティ...
}
```

---

## データ取得ロジックの変更

### GetShopifyCredentialsAsyncメソッドの修正

```csharp
/// <summary>
/// ストアドメインに基づいてShopify Credentialsを取得する
/// 優先順位: 1. ShopifyAppテーブル 2. Store.ApiKey/ApiSecret（後方互換性） 3. 環境変数
/// </summary>
private async Task<(string ApiKey, string ApiSecret)> GetShopifyCredentialsAsync(string shopDomain)
{
    try
    {
        // 1. データベースからストア情報を取得（ShopifyAppを含む）
        var store = await _context.Stores
            .Include(s => s.ShopifyApp)
            .FirstOrDefaultAsync(s => s.Domain == shopDomain);
        
        // 2. ShopifyAppから取得（優先）
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
            _logger.LogInformation("StoreテーブルからCredentialsを取得（後方互換性）. Shop: {Shop}", shopDomain);
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
        _logger.LogError(ex, "Credentials取得中にエラーが発生. Shop: {Shop}", shopDomain);
        throw;
    }
}
```

### Installメソッドの修正

```csharp
[HttpGet("install")]
[AllowAnonymous]
public async Task<IActionResult> Install(
    [FromQuery] string shop,
    [FromQuery] string? apiKey = null)
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
            // ShopifyAppテーブルから対応するアプリを検索
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
                // フォールバック: 環境変数から取得
                finalApiKey = apiKey;
                finalApiSecret = GetApiSecretByApiKey(apiKey);
                
                if (string.IsNullOrEmpty(finalApiSecret))
                {
                    _logger.LogError("API Keyに対応するSecretが見つかりません. Shop: {Shop}, ApiKey: {ApiKey}", shop, apiKey);
                    return StatusCode(500, new { error = "API Secret not found for the provided API Key" });
                }
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

### SaveOrUpdateStoreメソッドの修正

```csharp
private async Task SaveOrUpdateStore(
    string shopDomain, 
    string accessToken, 
    string? apiKey = null, 
    string? apiSecret = null,
    int? shopifyAppId = null)
{
    try
    {
        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.Domain == shopDomain);

        if (store == null)
        {
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
        store.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        _logger.LogInformation("ストア情報を保存しました. Shop: {Shop}, ShopifyAppId: {ShopifyAppId}", 
            shopDomain, store.ShopifyAppId);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "ストア情報の保存中にエラーが発生. Shop: {Shop}", shopDomain);
        throw;
    }
}
```

---

## DbContextの修正

### ShopifyDbContext.csの修正

`ShopifyApps`テーブルを追加するため、`ShopifyDbContext`を修正します。

**ファイル**: `backend/ShopifyAnalyticsApi/Data/ShopifyDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using ShopifyAnalyticsApi.Models;

namespace ShopifyAnalyticsApi.Data
{
    public class ShopifyDbContext : DbContext
    {
        public ShopifyDbContext(DbContextOptions<ShopifyDbContext> options) : base(options)
        {
        }

        // ... 既存のDbSets ...
        public DbSet<Store> Stores { get; set; }
        
        // 追加: ShopifyAppsテーブル
        public DbSet<ShopifyApp> ShopifyApps { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ... 既存の設定 ...

            // ShopifyAppエンティティの設定
            modelBuilder.Entity<ShopifyApp>(entity =>
            {
                entity.ToTable("ShopifyApps");
                
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                
                entity.Property(e => e.DisplayName)
                    .HasMaxLength(200);
                
                entity.Property(e => e.AppType)
                    .IsRequired()
                    .HasMaxLength(50);
                
                entity.Property(e => e.ApiKey)
                    .IsRequired()
                    .HasMaxLength(255);
                
                entity.Property(e => e.ApiSecret)
                    .IsRequired()
                    .HasMaxLength(255);
                
                entity.Property(e => e.AppUrl)
                    .HasMaxLength(500);
                
                entity.Property(e => e.RedirectUri)
                    .HasMaxLength(500);
                
                entity.Property(e => e.Scopes)
                    .HasMaxLength(500);
                
                entity.Property(e => e.Description)
                    .HasMaxLength(1000);
                
                // インデックス設定
                entity.HasIndex(e => e.ApiKey)
                    .HasDatabaseName("IX_ShopifyApps_ApiKey");
                
                entity.HasIndex(e => e.AppType)
                    .HasDatabaseName("IX_ShopifyApps_AppType");
                
                entity.HasIndex(e => e.IsActive)
                    .HasDatabaseName("IX_ShopifyApps_IsActive");
            });
            
            // StoreとShopifyAppのリレーション設定
            modelBuilder.Entity<Store>()
                .HasOne(s => s.ShopifyApp)
                .WithMany(a => a.Stores)
                .HasForeignKey(s => s.ShopifyAppId)
                .OnDelete(DeleteBehavior.SetNull); // ShopifyApp削除時はNULLに設定
        }
    }
}
```

---

## Callbackメソッドの完全な修正コード

### ShopifyAuthController.csのCallbackメソッド

**ファイル**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs`

```csharp
[HttpGet("callback")]
[AllowAnonymous]
public async Task<IActionResult> Callback([FromQuery] ShopifyCallbackRequest request)
{
    try
    {
        // バリデーション
        if (string.IsNullOrWhiteSpace(request.Code) || 
            string.IsNullOrWhiteSpace(request.Shop) || 
            string.IsNullOrWhiteSpace(request.State))
        {
            _logger.LogWarning("OAuthコールバック: 必須パラメータが不足. Code: {Code}, Shop: {Shop}, State: {State}", 
                request.Code, request.Shop, request.State);
            return BadRequest(new { error = "Missing required parameters" });
        }

        // stateの検証
        var cacheKey = $"{StateCacheKeyPrefix}{request.State}";
        var stateDataJson = _cache.Get<string>(cacheKey);
        
        if (string.IsNullOrEmpty(stateDataJson))
        {
            _logger.LogWarning("OAuthコールバック: 無効なstate. Shop: {Shop}, State: {State}", 
                request.Shop, request.State);
            return BadRequest(new { error = "Invalid state parameter" });
        }

        // stateからAPI Key/Secret/ShopifyAppIdを取得
        var stateData = JsonSerializer.Deserialize<StateData>(stateDataJson);
        if (stateData == null || string.IsNullOrEmpty(stateData.apiKey))
        {
            _logger.LogError("OAuthコールバック: stateデータの解析に失敗. Shop: {Shop}", request.Shop);
            return StatusCode(500, new { error = "Failed to parse state data" });
        }

        // アクセストークンを取得
        var accessToken = await ExchangeCodeForAccessTokenWithRetry(
            request.Code, 
            request.Shop, 
            stateData.apiKey, 
            stateData.apiSecret);

        // ストア情報を保存/更新（ShopifyAppIdを含む）
        await SaveOrUpdateStore(
            request.Shop, 
            accessToken, 
            stateData.apiKey, 
            stateData.apiSecret,
            stateData.shopifyAppId); // ShopifyAppIdを渡す

        // stateを削除（セキュリティのため）
        _cache.Remove(cacheKey);

        _logger.LogInformation("OAuth認証が完了しました. Shop: {Shop}, ShopifyAppId: {ShopifyAppId}", 
            request.Shop, stateData.shopifyAppId);

        // フロントエンドにリダイレクト
        var redirectUrl = $"{GetShopifyAppUrl(stateData.apiKey)}/dashboard";
        return Redirect(redirectUrl);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "OAuthコールバック処理中にエラーが発生. Shop: {Shop}", request.Shop);
        return StatusCode(500, new { error = "Internal server error during OAuth callback" });
    }
}

// StateDataクラス（コントローラー内のprivate class）
private class StateData
{
    public string shop { get; set; } = string.Empty;
    public string apiKey { get; set; } = string.Empty;
    public string? apiSecret { get; set; }
    public int? shopifyAppId { get; set; }
}
```

**注意**: `GetShopifyAppUrl`メソッドは、`apiKey`から対応するApp URLを取得するヘルパーメソッドです。
`ShopifyApps`テーブルから取得するか、環境変数から取得する実装が必要です。

### GetShopifyAppUrlメソッドの実装

**ファイル**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs`

```csharp
/// <summary>
/// API KeyからApp URLを取得
/// </summary>
private async Task<string> GetShopifyAppUrl(string apiKey)
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
```

**実装のポイント**:
- `ShopifyApps`テーブルから`apiKey`で検索し、`IsActive = true`のアプリの`AppUrl`を取得
- 見つからない場合は環境変数から取得（フォールバック）
- それでも見つからない場合はデフォルトURLを返す

---

## マイグレーション手順

### 1. EF Core Migrationの作成

```powershell
cd backend/ShopifyAnalyticsApi
dotnet ef migrations add AddShopifyAppsTable
```

### 2. マイグレーションスクリプトの確認

```powershell
dotnet ef migrations script
```

### 3. 初期データの投入

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

### 4. 既存ストアの移行

```sql
-- 既存のストアにShopifyAppIdを設定（公開アプリを使用している場合）
UPDATE [dbo].[Stores]
SET [ShopifyAppId] = (SELECT TOP 1 [Id] FROM [dbo].[ShopifyApps] WHERE [AppType] = 'Public')
WHERE [ShopifyAppId] IS NULL
  AND [ApiKey] IS NOT NULL
  AND [ApiKey] = (SELECT TOP 1 [ApiKey] FROM [dbo].[ShopifyApps] WHERE [AppType] = 'Public');
```

---

## インフラストラクチャ設定（複数のStatic Web Appsリソース）

### 概要

各Shopifyアプリ（公開/カスタム）ごとに**別々のAzure Static Web Appsリソース**を作成し、異なるサブドメイン（App URL）を設定する必要があります。

### 1. Azure Static Web Appsリソースの作成

#### 1.1 公開アプリ用Static Web Apps

**リソース名**: `ec-ranger-frontend-public`（例）

**設定項目**:
- **App URL**: `https://ec-ranger-frontend-public.azurestaticapps.net`（自動生成）
- **環境変数**:
  - `NEXT_PUBLIC_SHOPIFY_API_KEY`: 公開アプリのAPI Key
  - `NEXT_PUBLIC_API_URL`: バックエンドAPI URL（共有）
  - `NEXT_PUBLIC_SHOPIFY_APP_URL`: `https://ec-ranger-frontend-public.azurestaticapps.net`

#### 1.2 カスタムアプリ用Static Web Apps

**リソース名**: `ec-ranger-frontend-custom`（例）

**設定項目**:
- **App URL**: `https://ec-ranger-frontend-custom.azurestaticapps.net`（自動生成）
- **環境変数**:
  - `NEXT_PUBLIC_SHOPIFY_API_KEY`: カスタムアプリのAPI Key
  - `NEXT_PUBLIC_API_URL`: バックエンドAPI URL（共有）
  - `NEXT_PUBLIC_SHOPIFY_APP_URL`: `https://ec-ranger-frontend-custom.azurestaticapps.net`

### 2. Shopify Partnersダッシュボードでの設定

#### 2.1 公開アプリの設定

1. [Shopify Partners Dashboard](https://partners.shopify.com) にログイン
2. 公開アプリを選択
3. **App setup** → **App URL** に設定:
   ```
   https://ec-ranger-frontend-public.azurestaticapps.net
   ```
4. **Allowed redirection URL(s)** に設定:
   ```
   https://ec-ranger-frontend-public.azurestaticapps.net/api/shopify/callback
   ```

#### 2.2 カスタムアプリの設定

1. カスタムアプリを選択
2. **App setup** → **App URL** に設定:
   ```
   https://ec-ranger-frontend-custom.azurestaticapps.net
   ```
3. **Allowed redirection URL(s)** に設定:
   ```
   https://ec-ranger-frontend-custom.azurestaticapps.net/api/shopify/callback
   ```

### 3. GitHub Actionsワークフローの設定

#### 3.1 公開アプリ用ワークフロー

**ファイル**: `.github/workflows/frontend_deploy_public.yml`（例）

```yaml
name: Frontend Deploy - Public App

on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.SHOPIFY_API_KEY_PUBLIC }}
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
          NEXT_PUBLIC_SHOPIFY_APP_URL: ${{ vars.SHOPIFY_APP_URL_PUBLIC }}
        run: npm run build
      
      - name: Deploy to Azure Static Web Apps (Public)
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_PUBLIC }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: 'frontend'
          output_location: 'out'
          deployment_environment: ''
        env:
          NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.SHOPIFY_API_KEY_PUBLIC }}
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
          NEXT_PUBLIC_SHOPIFY_APP_URL: ${{ vars.SHOPIFY_APP_URL_PUBLIC }}
```

#### 3.2 カスタムアプリ用ワークフロー

**ファイル**: `.github/workflows/frontend_deploy_custom.yml`（例）

```yaml
name: Frontend Deploy - Custom App

on:
  push:
    branches: [ develop ]
    paths:
      - 'frontend/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.SHOPIFY_API_KEY_CUSTOM }}
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
          NEXT_PUBLIC_SHOPIFY_APP_URL: ${{ vars.SHOPIFY_APP_URL_CUSTOM }}
        run: npm run build
      
      - name: Deploy to Azure Static Web Apps (Custom)
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_CUSTOM }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: 'frontend'
          output_location: 'out'
          deployment_environment: ''
        env:
          NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.SHOPIFY_API_KEY_CUSTOM }}
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
          NEXT_PUBLIC_SHOPIFY_APP_URL: ${{ vars.SHOPIFY_APP_URL_CUSTOM }}
```

### 4. GitHub Variables/Secretsの設定

#### 4.1 GitHub Variables（Repository Variables）

| Variable名 | 公開アプリ用 | カスタムアプリ用 | 説明 |
|-----------|------------|----------------|------|
| `SHOPIFY_API_KEY_PUBLIC` | ✅ | - | 公開アプリのAPI Key |
| `SHOPIFY_API_KEY_CUSTOM` | - | ✅ | カスタムアプリのAPI Key |
| `SHOPIFY_APP_URL_PUBLIC` | ✅ | - | 公開アプリのApp URL |
| `SHOPIFY_APP_URL_CUSTOM` | - | ✅ | カスタムアプリのApp URL |
| `API_URL` | ✅ | ✅ | バックエンドAPI URL（共有） |

#### 4.2 GitHub Secrets（Repository Secrets）

| Secret名 | 公開アプリ用 | カスタムアプリ用 | 説明 |
|---------|------------|----------------|------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PUBLIC` | ✅ | - | 公開アプリ用Static Web Appsのデプロイトークン |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_CUSTOM` | - | ✅ | カスタムアプリ用Static Web Appsのデプロイトークン |

**デプロイトークンの取得方法**:
1. Azure PortalでStatic Web Appsリソースを開く
2. **Manage deployment token** をクリック
3. トークンをコピーしてGitHub Secretsに設定

### 5. ShopifyAppsテーブルへのApp URL設定

初期データ投入時に、実際のApp URLを設定する:

```sql
-- 公開アプリの登録（実際のApp URLを設定）
INSERT INTO [dbo].[ShopifyApps] 
    ([Name], [DisplayName], [AppType], [ApiKey], [ApiSecret], [AppUrl], [RedirectUri], [IsActive], [CreatedAt], [UpdatedAt])
VALUES 
    ('EC Ranger', 'EC Ranger - 公開アプリ', 'Public', 
     '[YOUR_PUBLIC_APP_API_KEY]', '[YOUR_PUBLIC_APP_API_SECRET]', 
     'https://ec-ranger-frontend-public.azurestaticapps.net',  -- 実際のApp URL
     'https://ec-ranger-frontend-public.azurestaticapps.net/api/shopify/callback',  -- Redirect URI
     1, GETUTCDATE(), GETUTCDATE());

-- カスタムアプリの登録（実際のApp URLを設定）
INSERT INTO [dbo].[ShopifyApps] 
    ([Name], [DisplayName], [AppType], [ApiKey], [ApiSecret], [AppUrl], [RedirectUri], [IsActive], [CreatedAt], [UpdatedAt])
VALUES 
    ('EC Ranger Demo', 'EC Ranger - カスタムアプリ', 'Custom', 
     '[YOUR_CUSTOM_APP_API_KEY]', '[YOUR_CUSTOM_APP_API_SECRET]', 
     'https://ec-ranger-frontend-custom.azurestaticapps.net',  -- 実際のApp URL
     'https://ec-ranger-frontend-custom.azurestaticapps.net/api/shopify/callback',  -- Redirect URI
     1, GETUTCDATE(), GETUTCDATE());
```

### 6. コスト考慮事項

**追加コスト**:
- Static Web Apps: 2リソース（公開アプリ用 + カスタムアプリ用）
- 無料プラン: 各リソースで100GB/月の帯域幅まで無料
- Standardプラン: 必要に応じてアップグレード

**コスト最適化**:
- 開発環境では1つのStatic Web Appsリソースを共有することも可能（環境変数で切り替え）
- 本番環境では分離を推奨（セキュリティと独立性のため）

---

## メリット

1. ✅ **重複の削減**: 同じアプリを使う複数のストアが、同じAPI Key/Secretを共有
2. ✅ **一元管理**: アプリ情報（名前、説明、App URLなど）を一元管理
3. ✅ **更新の容易さ**: API Key/Secretを変更する場合、1箇所の更新で済む
4. ✅ **拡張性**: アプリごとの設定（スコープ、リダイレクトURIなど）を管理可能
5. ✅ **後方互換性**: 既存の`Store.ApiKey`/`ApiSecret`は残すため、既存データとの互換性を維持

---

## 注意点

1. ⚠️ **複数のStatic Web Appsリソースが必要**: 公開アプリとカスタムアプリで別々のリソースを作成する必要がある
2. ⚠️ **異なるサブドメイン（App URL）の設定**: 各アプリごとに異なるApp URLをShopify Partnersダッシュボードで設定する必要がある
3. ⚠️ **マイグレーションの順序**: 既存データの移行を慎重に行う
4. ⚠️ **後方互換性**: 既存の`Store.ApiKey`/`ApiSecret`は非推奨だが、しばらく残す
5. ⚠️ **セキュリティ**: `ApiSecret`は暗号化して保存することを推奨（Phase 2で実装予定）
6. ⚠️ **GitHub Actionsワークフローの分離**: 各アプリごとに別々のワークフローを作成するか、条件分岐で処理を分ける必要がある

---

## 実装順序

1. ✅ 設計書の作成（本ドキュメント）
2. [ ] **インフラストラクチャの準備**
   - [ ] 公開アプリ用Static Web Appsリソースの作成
   - [ ] カスタムアプリ用Static Web Appsリソースの作成
   - [ ] 各リソースのApp URLを確認・記録
   - [ ] Shopify PartnersダッシュボードでApp URLを設定
3. [ ] **GitHub Actionsワークフローの設定**
   - [ ] 公開アプリ用ワークフローの作成/修正
   - [ ] カスタムアプリ用ワークフローの作成/修正
   - [ ] GitHub Variables/Secretsの設定
4. [ ] **データベース実装**
   - [ ] EF Core Migrationの作成
   - [ ] エンティティモデルの追加・修正
   - [ ] マイグレーションの実行
5. [ ] **初期データの投入**
   - [ ] 公開アプリの登録（実際のApp URLを設定）
   - [ ] カスタムアプリの登録（実際のApp URLを設定）
6. [ ] **コード実装**
   - [ ] データ取得ロジックの修正
   - [ ] `GetShopifyCredentialsAsync`の修正（ShopifyAppsテーブル優先）
   - [ ] `SaveOrUpdateStore`の修正（ShopifyAppIdの設定）
7. [ ] **既存ストアの移行**
   - [ ] 既存ストアにShopifyAppIdを設定
8. [ ] **テスト**
   - [ ] 公開アプリでのインストールテスト
   - [ ] カスタムアプリでのインストールテスト
   - [ ] App URLの動作確認

---

## 関連ドキュメント

- `マルチアプリ対応設計書.md` - 全体設計
- `インストール時のAPI Key判定方法.md` - インストールフロー
- `実装方針決定書.md` - 実装方針

