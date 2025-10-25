# Shopify アプリ統合ガイド

## 概要
Shopify AI Marketing SuiteのShopifyアプリ統合について、段階的な実装方法を説明します。

---

## 1. 実装方針

### フェーズ1：最小実装（基本）
- Shopify管理画面にアプリへのリンクを1つ追加
- CSPヘッダーでiframe埋め込みを許可
- 既存の認証システムを活用

### フェーズ2：将来の拡張（完全統合）
- NavigationMenuで複数画面へのリンク
- App Bridge完全統合
- セッショントークン実装

---

## 2. バックエンド実装

### 2.1 CSPヘッダー追加（最小実装）

```csharp
// Program.cs に追加
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("Content-Security-Policy", 
        "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
    await next();
});
```

### 2.2 埋め込みアプリ設定エンドポイント

```csharp
// Controllers/EmbeddedAppController.cs
[ApiController]
[Route("api/[controller]")]
public class EmbeddedAppController : ControllerBase
{
    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        var config = new
        {
            apiKey = _configuration["Shopify:ApiKey"],
            host = Request.Headers["X-Shopify-Shop-Domain"].FirstOrDefault(),
            forceRedirect = true,
            storeId = GetCurrentStoreId(),
            features = new
            {
                dormantAnalysis = true,
                yearOverYear = true,
                purchaseCount = true,
                monthlyStats = true
            },
            navigation = new
            {
                items = new[]
                {
                    new { label = "ダッシュボード", destination = "/" },
                    new { label = "休眠顧客分析", destination = "/customer-analysis/dormant" },
                    new { label = "前年同月比", destination = "/product-analysis/year-over-year" },
                    new { label = "購入回数分析", destination = "/purchase-analysis/count" }
                }
            }
        };

        return Ok(config);
    }
}
```

---

## 3. フロントエンド実装

### 3.1 埋め込み判定とスタイル調整

```typescript
// utils/shopify-embed.ts
export function getShopifyEmbedContext() {
  if (typeof window === 'undefined') {
    return { isEmbedded: false, shop: null, host: null };
  }
  
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop');
  const host = params.get('host');
  const embedded = params.get('embedded');
  
  const isEmbedded = (
    embedded === '1' || 
    window !== window.parent ||
    !!shop
  );
  
  return { isEmbedded, shop, host };
}

export function applyEmbeddedStyles() {
  if (typeof window === 'undefined') return;
  
  const { isEmbedded } = getShopifyEmbedContext();
  
  if (isEmbedded) {
    // 埋め込み時のスタイル調整
    document.body.style.paddingTop = '0';
    document.body.style.marginTop = '0';
    
    // ヘッダーを非表示
    const header = document.querySelector('header');
    if (header) {
      header.style.display = 'none';
    }
    
    console.log('🎯 Shopify embedded app mode activated');
  }
}
```

### 3.2 埋め込みアプリページ

```typescript
// app/shopify/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getShopifyEmbedContext, applyEmbeddedStyles } from '@/utils/shopify-embed';

export default function ShopifyEmbeddedApp() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const { isEmbedded, shop, host } = getShopifyEmbedContext();
    
    console.log('Shopify Embedded App Loaded:', {
      shop,
      host,
      isEmbedded,
      url: window.location.href
    });
    
    if (isEmbedded) {
      applyEmbeddedStyles();
    }
    
    fetchConfig();
  }, []);
  
  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/embeddedapp/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Shopify-Shop-Domain': new URLSearchParams(window.location.search).get('shop') || ''
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch config');
      
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err.message);
      console.error('Config fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">アプリを読み込み中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Shopify AI Marketing Suite
          </h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    エラーが発生しました
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {config && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  アプリ設定
                </h2>
                <div className="bg-gray-50 rounded-md p-4">
                  <pre className="text-sm text-gray-700 overflow-auto">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  利用可能な機能
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {config.features && Object.entries(config.features).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {value ? '✅' : '❌'}
                      </span>
                      <span className="text-sm text-gray-700">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  ナビゲーション
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {config.navigation?.items?.map((item, index) => (
                    <a
                      key={index}
                      href={item.destination}
                      className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="text-sm font-medium text-blue-900">
                        {item.label}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {item.destination}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Shopify管理ダッシュボードへのリンク追加

### 4.1 App Bridge Navigation（推奨）

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
    {
      label: '前年同月比',
      destination: '/product-analysis/year-over-year',
    },
    {
      label: '購入回数分析',
      destination: '/purchase-analysis/count',
    },
  ]}
/>
```

### 4.2 Admin Links Extension

`shopify.app.toml`に設定：

```toml
[[extensions]]
type = "admin_link"
name = "ai-marketing-suite"

[extensions.settings]
url = "https://your-app-domain.com"
```

### 4.3 手動リンク追加

開発ストアの管理画面で：
1. 「設定」→「通知」
2. 「アプリ」セクションにカスタムリンクを追加

---

## 5. アンインストール機能

### 5.1 Webhook設定

```csharp
// Controllers/WebhookController.cs
[HttpPost("webhook/app/uninstalled")]
public async Task<IActionResult> HandleAppUninstalled([FromBody] AppUninstalledPayload payload)
{
    try
    {
        // HMAC検証
        if (!VerifyWebhookSignature(Request, payload))
        {
            return Unauthorized();
        }

        // ストアデータの削除
        await _storeService.DeleteStoreAsync(payload.Domain);
        
        _logger.LogInformation("App uninstalled for shop: {Domain}", payload.Domain);
        
        return Ok();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error handling app uninstall for shop: {Domain}", payload.Domain);
        return StatusCode(500);
    }
}
```

### 5.2 データ削除処理

```csharp
public async Task DeleteStoreAsync(string shopDomain)
{
    var store = await _context.Stores
        .FirstOrDefaultAsync(s => s.Domain == shopDomain);
        
    if (store != null)
    {
        // 関連データを削除
        await _context.Customers
            .Where(c => c.StoreId == store.Id)
            .ExecuteDeleteAsync();
            
        await _context.Orders
            .Where(o => o.StoreId == store.Id)
            .ExecuteDeleteAsync();
            
        // ストア自体を削除
        _context.Stores.Remove(store);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Store data deleted for: {Domain}", shopDomain);
    }
}
```

---

## 6. セキュリティ考慮事項

### 6.1 HMAC検証

```csharp
private bool VerifyWebhookSignature(HttpRequest request, object payload)
{
    var hmacHeader = request.Headers["X-Shopify-Hmac-Sha256"].FirstOrDefault();
    if (string.IsNullOrEmpty(hmacHeader))
        return false;

    var body = JsonSerializer.Serialize(payload);
    var computedHmac = Convert.ToHexString(
        new HMACSHA256(Encoding.UTF8.GetBytes(_apiSecret))
            .ComputeHash(Encoding.UTF8.GetBytes(body)));

    return computedHmac.Equals(hmacHeader, StringComparison.OrdinalIgnoreCase);
}
```

### 6.2 CORS設定

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("ShopifyPolicy", policy =>
    {
        policy.WithOrigins("https://*.myshopify.com", "https://admin.shopify.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

app.UseCors("ShopifyPolicy");
```

---

## 7. テスト方法

### 7.1 ローカルテスト

```bash
# 埋め込みモードでテスト
http://localhost:3000/shopify?embedded=1&host=example.myshopify.com

# 通常モードでテスト
http://localhost:3000/shopify?shop=example.myshopify.com
```

### 7.2 開発ストアでのテスト

1. Shopify Partnersダッシュボードでアプリ設定
2. 開発ストアにアプリをインストール
3. 管理画面からアプリにアクセス
4. 埋め込み表示を確認

---

## 8. トラブルシューティング

### 8.1 よくある問題

| 問題 | 原因 | 解決策 |
|------|------|--------|
| **CSPエラー** | frame-ancestors設定不足 | CSPヘッダーを追加 |
| **CORSエラー** | オリジン設定不足 | CORS設定にShopifyドメインを追加 |
| **認証エラー** | トークン無効 | 認証フローを確認 |
| **埋め込み表示されない** | URLパラメータ不足 | shop, hostパラメータを確認 |

### 8.2 デバッグ方法

```javascript
// ブラウザコンソールで実行
console.log('Shopify context:', {
  isEmbedded: window !== window.parent,
  url: window.location.href,
  params: new URLSearchParams(window.location.search).toString()
});
```

---

## 9. 次のステップ

### 9.1 フェーズ2の実装
- App Bridge完全統合
- セッショントークン認証
- リアルタイム通知
- モーダルダイアログ

### 9.2 パフォーマンス最適化
- キャッシュ戦略
- 画像最適化
- バンドルサイズ削減

---

## 関連ドキュメント

- [Shopify App Bridge テストガイド](../test-guides/Shopify-App-Bridge-テストガイド.md)
- [Shopify アプリ認証・認可設計](../Shopify のアプリ認証・認可設計.md)
- [認証モード一覧](../../04-development/09-認証・セキュリティ/認証モード一覧.md)

---

## 更新履歴

| 日付 | 内容 | 担当者 |
|------|------|--------|
| 2025-10-25 | シンプル版と統合版を統合、日本語ファイル名に変更 | Kenji |

---

**最終更新**: 2025年10月25日 21:00
**次回レビュー**: 2025年11月1日（週次）
