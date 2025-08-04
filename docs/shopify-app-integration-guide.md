# Shopifyアプリ統合ガイド - 管理画面とアンインストール機能

## 1. Shopify管理ダッシュボードへのリンク追加

### はい、可能です！複数の方法があります：

### 方法1: App Bridge Navigation（推奨）
```javascript
import { NavigationMenu } from '@shopify/app-bridge-react';

// アプリ内でナビゲーションメニューを追加
<NavigationMenu
  navigationLinks={[
    {
      label: 'AI Marketing Suite',
      destination: '/dashboard',
    },
    {
      label: '休眠顧客分析',
      destination: '/customer-analysis/dormant',
    },
  ]}
/>
```

### 方法2: Admin Links Extension
`shopify.app.toml`に設定：
```toml
[[extensions]]
type = "admin_link"
name = "AI Marketing Suite"
handle = "ai-marketing-suite"

[[extensions.targeting]]
target = "admin.nav-menu.marketing-section"
```

### 方法3: App Proxy（カスタムページ）
```toml
[app_proxy]
url = "https://your-app.com/proxy"
subpath = "apps/ai-marketing"
prefix = "tools"
```

これにより、`https://store.myshopify.com/tools/ai-marketing`でアクセス可能。

### 方法4: Web Pixel Extension（マーケティング活動）
マーケティング > アクティビティに表示：
```toml
[[extensions]]
type = "web_pixel"
name = "AI Marketing Analytics"
```

## 2. アンインストール機能について

### アンインストール機能は必須ではありませんが、実装すべきです

### 理由：
1. **GDPR準拠**: ユーザーデータの削除が必要
2. **アプリ審査**: Shopifyの審査で推奨される
3. **ユーザー体験**: クリーンなアンインストールが可能

### 実装方法：

#### Webhook設定（必須）
```javascript
// backend/ShopifyAnalyticsApi/Controllers/WebhookController.cs
[HttpPost("app/uninstalled")]
public async Task<IActionResult> HandleAppUninstalled([FromBody] ShopifyWebhook webhook)
{
    // 1. Webhookの検証
    if (!VerifyWebhook(Request))
        return Unauthorized();
    
    // 2. ストアの特定
    var shop = webhook.Shop;
    
    // 3. データ削除処理
    await _storeService.DeleteStoreData(shop);
    
    // 4. アクセストークンの無効化
    await _tokenService.RevokeTokens(shop);
    
    // 5. ログ記録
    _logger.LogInformation($"App uninstalled from {shop}");
    
    return Ok();
}
```

#### Webhookの登録
```javascript
// インストール時にWebhookを登録
const webhook = {
  webhook: {
    topic: 'app/uninstalled',
    address: 'https://your-app.com/api/webhooks/app/uninstalled',
    format: 'json'
  }
};

await shopify.webhook.create(webhook);
```

#### データ削除ポリシー
```csharp
public async Task DeleteStoreData(string shopDomain)
{
    // 1. 顧客個人情報の削除（GDPR準拠）
    await _dbContext.Customers
        .Where(c => c.Store.ShopifyDomain == shopDomain)
        .ExecuteDeleteAsync();
    
    // 2. 注文データの匿名化または削除
    await _dbContext.Orders
        .Where(o => o.Store.ShopifyDomain == shopDomain)
        .ExecuteUpdateAsync(o => o.SetProperty(
            p => p.CustomerEmail, 
            p => "deleted@example.com"
        ));
    
    // 3. ストア設定の削除
    await _dbContext.Stores
        .Where(s => s.ShopifyDomain == shopDomain)
        .ExecuteDeleteAsync();
}
```

## 3. 推奨実装

### アプリ内リンク
1. **メインナビゲーション**: App Bridge Navigationを使用
2. **クイックアクション**: ダッシュボードウィジェット
3. **レポート**: マーケティング > レポートセクション

### アンインストール処理
1. **Webhook登録**: `app/uninstalled`を必ず登録
2. **データ保持ポリシー**: 30日間保持後に完全削除
3. **再インストール対応**: 過去データの復元オプション

## 4. 実装チェックリスト

### 管理画面統合
- [ ] App Bridge Navigation実装
- [ ] Admin Links Extension設定
- [ ] マーケティングセクションへの統合
- [ ] モバイルアプリ対応

### アンインストール機能
- [ ] Webhook登録処理
- [ ] データ削除処理
- [ ] GDPR準拠の確認
- [ ] 再インストール時の処理

## 5. 次のステップ

1. **App Bridge Navigation**の実装（最優先）
2. **アンインストールWebhook**の実装
3. **データ削除ポリシー**の策定
4. **Shopifyアプリ審査**の準備