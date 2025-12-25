# Webhook 401エラー問題

## 問題概要

Shopify Partners Dashboardのログで、`app/uninstalled`のWebhookが401エラーになっている。

## 発生日時

2025-12-25

## エラーメッセージ

- Shopify Partners Dashboardのログ: `app/uninstalled` Webhookが401エラー
- ストア: `xn-fbkq6e5da0fpb.myshopify.com`

## 原因分析

### 根本原因

**マルチアプリ対応で、Webhook Secretがアプリごとに異なる可能性があるのに、固定の設定値を使用していた**

1. **現在の実装の問題点**:
   - `VerifyWebhookRequest`メソッドが固定の`_configuration["Shopify:WebhookSecret"]`を使用
   - マルチアプリ対応の場合、各アプリごとに異なるWebhook Secretが設定されている可能性がある
   - Webhookリクエストからどのアプリからのリクエストかを特定できていない

2. **ShopifyのWebhook Secretについて**:
   - Webhook Secretは通常、Shopify Partners Dashboardでアプリごとに設定される
   - カスタムアプリの場合は、ApiSecretと同じ場合もある
   - マルチアプリ対応の場合、各アプリごとに異なるWebhook Secretが設定されている可能性がある

## 対応方法

### 実装内容

`VerifyWebhookRequest`メソッドをマルチアプリ対応に修正：

1. **Webhookリクエストからストアドメインを取得**
   - `X-Shopify-Shop-Domain`ヘッダーからストアドメインを取得

2. **ストアからShopifyAppを特定**
   - ストアドメインからStoresテーブルを検索
   - 関連するShopifyAppを取得

3. **ShopifyAppからWebhookSecretを取得**
   - ShopifyAppのApiSecretを使用（Webhook Secretは通常ApiSecretと同じ）
   - フォールバック: 設定ファイルから取得

### 修正後のコード

```csharp
private async Task<bool> VerifyWebhookRequest()
{
    // ... HMACヘッダーの取得 ...
    
    // マルチアプリ対応: ストアドメインからShopifyAppを特定してWebhookSecretを取得
    string? secret = null;
    
    // X-Shopify-Shop-Domainヘッダーからストアドメインを取得
    if (Request.Headers.TryGetValue("X-Shopify-Shop-Domain", out var shopDomainHeader))
    {
        var shopDomain = shopDomainHeader.ToString();
        if (!string.IsNullOrWhiteSpace(shopDomain))
        {
            // ストアからShopifyAppを取得
            var store = await _context.Stores
                .Include(s => s.ShopifyApp)
                .FirstOrDefaultAsync(s => s.Domain == shopDomain);
            
            if (store?.ShopifyApp != null && store.ShopifyApp.IsActive)
            {
                // ShopifyAppのApiSecretを使用
                secret = store.ShopifyApp.ApiSecret;
            }
        }
    }
    
    // フォールバック: 設定ファイルから取得
    if (string.IsNullOrWhiteSpace(secret))
    {
        secret = _configuration["Shopify:WebhookSecret"];
    }
    
    // ... HMAC検証 ...
}
```

## 確認方法

### 1. バックエンドログで確認

修正後、以下のログが出力されることを確認：

```
Webhook SecretをShopifyAppから取得. Shop: {Shop}, App: {App}
```

または

```
Webhook Secretを設定ファイルから取得
```

### 2. Shopify Partners Dashboardで確認

Webhookのステータスが401から200に変わることを確認。

### 3. テスト方法

1. アプリをアンインストール
2. Shopify Partners Dashboardのログで、`app/uninstalled` Webhookが200になることを確認
3. バックエンドログで、HMAC検証が成功することを確認

## 注意点

### Webhook Secretの設定

- **Shopify Partners Dashboard**: 各アプリごとにWebhook Secretが設定されている場合、その値を使用する必要がある
- **現在の実装**: ShopifyAppのApiSecretを使用（Webhook SecretがApiSecretと同じ場合）
- **将来的な改善**: ShopifyAppテーブルに`WebhookSecret`カラムを追加し、明示的に管理する

### フォールバック処理

- ストアドメインからShopifyAppを特定できない場合、設定ファイルの`Shopify:WebhookSecret`を使用
- これにより、既存の単一アプリ構成との互換性を維持

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs` - Webhook処理
- `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs` - ShopifyAppモデル

## 更新履歴

- 2025-12-25: 初版作成
- 2025-12-25: マルチアプリ対応の修正を実装
