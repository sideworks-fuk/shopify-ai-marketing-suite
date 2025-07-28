# Shopify OAuth 2.0 実装ガイド
**作成日**: 2025年7月28日  
**作成者**: ケンジ

## 1. 概要
Shopifyストアとの認証連携を実装するための技術ガイド。

## 2. 前提条件
- Shopify Partner アカウント
- HTTPS対応のコールバックURL
- .NET 8.0 / Next.js 14

## 3. 実装手順

### 3.1 バックエンド実装

#### 必要なNuGetパッケージ
```xml
<PackageReference Include="ShopifySharp" Version="6.14.0" />
```

#### 認証コントローラー
```csharp
// Controllers/AuthController.cs
[ApiController]
[Route("api/auth/shopify")]
public class ShopifyAuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ShopifyDbContext _context;
    
    [HttpGet("install")]
    public IActionResult Install(string shop)
    {
        var apiKey = _configuration["Shopify:ApiKey"];
        var scopes = "read_orders,read_products,read_customers";
        var redirectUri = $"{Request.Scheme}://{Request.Host}/api/auth/shopify/callback";
        var state = Guid.NewGuid().ToString();
        
        // Stateをセッションに保存（CSRF対策）
        HttpContext.Session.SetString("shopify_state", state);
        
        var authUrl = $"https://{shop}/admin/oauth/authorize?" +
            $"client_id={apiKey}&" +
            $"scope={scopes}&" +
            $"redirect_uri={Uri.EscapeDataString(redirectUri)}&" +
            $"state={state}";
            
        return Redirect(authUrl);
    }
    
    [HttpGet("callback")]
    public async Task<IActionResult> Callback(string code, string shop, string state)
    {
        // State検証
        var savedState = HttpContext.Session.GetString("shopify_state");
        if (state != savedState)
        {
            return BadRequest("Invalid state parameter");
        }
        
        // アクセストークン取得
        var apiKey = _configuration["Shopify:ApiKey"];
        var apiSecret = _configuration["Shopify:ApiSecret"];
        
        var tokenUrl = $"https://{shop}/admin/oauth/access_token";
        var client = new HttpClient();
        
        var content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("client_id", apiKey),
            new KeyValuePair<string, string>("client_secret", apiSecret),
            new KeyValuePair<string, string>("code", code)
        });
        
        var response = await client.PostAsync(tokenUrl, content);
        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(json);
        
        // トークンをDBに保存
        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.Domain == shop);
            
        if (store == null)
        {
            store = new Store
            {
                Name = shop.Replace(".myshopify.com", ""),
                Domain = shop,
                CreatedAt = DateTime.UtcNow
            };
            _context.Stores.Add(store);
        }
        
        store.Settings = JsonSerializer.Serialize(new 
        {
            AccessToken = tokenResponse.AccessToken,
            Scope = tokenResponse.Scope
        });
        store.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        // フロントエンドへリダイレクト
        return Redirect($"{_configuration["Frontend:Url"]}/auth/success?shop={shop}");
    }
}
```

#### セキュリティ設定
```csharp
// Program.cs
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("ShopifyOAuth",
        builder => builder
            .WithOrigins("https://*.myshopify.com")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});
```

### 3.2 フロントエンド実装

#### インストールページ
```typescript
// app/install/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InstallPage() {
  const [shopDomain, setShopDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // バックエンドの認証エンドポイントへリダイレクト
      const shop = shopDomain.includes('.myshopify.com') 
        ? shopDomain 
        : `${shopDomain}.myshopify.com`;
        
      window.location.href = 
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/shopify/install?shop=${shop}`;
    } catch (error) {
      console.error('Installation error:', error);
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-center">
            Shopify AI Marketing Suite
          </h2>
          <p className="mt-2 text-center text-gray-600">
            ストアと連携して分析を開始
          </p>
        </div>
        
        <form onSubmit={handleInstall} className="mt-8 space-y-6">
          <div>
            <label htmlFor="shop-domain" className="block text-sm font-medium">
              ストアドメイン
            </label>
            <div className="mt-1 flex">
              <input
                id="shop-domain"
                name="shop-domain"
                type="text"
                required
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-l-md"
                placeholder="your-store"
              />
              <span className="inline-flex items-center px-3 border border-l-0 rounded-r-md bg-gray-50">
                .myshopify.com
              </span>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'インストール中...' : 'アプリをインストール'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

#### 認証成功ページ
```typescript
// app/auth/success/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/contexts/StoreContext';

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshStores } = useStore();
  
  useEffect(() => {
    const shop = searchParams.get('shop');
    if (shop) {
      // ストア情報を更新
      refreshStores().then(() => {
        // ダッシュボードへリダイレクト
        router.push('/dashboard');
      });
    }
  }, [searchParams, router, refreshStores]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">認証成功！</h2>
        <p>ダッシュボードへリダイレクトしています...</p>
      </div>
    </div>
  );
}
```

### 3.3 Webhook設定
```csharp
// Services/ShopifyWebhookService.cs
public class ShopifyWebhookService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    
    public async Task RegisterWebhooks(string shopDomain, string accessToken)
    {
        var webhooks = new[]
        {
            new { topic = "orders/create", address = $"{_configuration["Api:BaseUrl"]}/api/webhooks/orders/create" },
            new { topic = "orders/updated", address = $"{_configuration["Api:BaseUrl"]}/api/webhooks/orders/updated" },
            new { topic = "customers/create", address = $"{_configuration["Api:BaseUrl"]}/api/webhooks/customers/create" },
            new { topic = "customers/update", address = $"{_configuration["Api:BaseUrl"]}/api/webhooks/customers/update" }
        };
        
        foreach (var webhook in webhooks)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, 
                $"https://{shopDomain}/admin/api/2024-01/webhooks.json");
            request.Headers.Add("X-Shopify-Access-Token", accessToken);
            
            var content = JsonSerializer.Serialize(new 
            {
                webhook = new 
                {
                    topic = webhook.topic,
                    address = webhook.address,
                    format = "json"
                }
            });
            
            request.Content = new StringContent(content, Encoding.UTF8, "application/json");
            await _httpClient.SendAsync(request);
        }
    }
}
```

## 4. セキュリティ考慮事項

### 4.1 HMAC検証
```csharp
public bool VerifyWebhookRequest(string requestBody, string hmacHeader)
{
    var secret = _configuration["Shopify:WebhookSecret"];
    var encoding = new UTF8Encoding();
    var keyBytes = encoding.GetBytes(secret);
    
    using (var hmac = new HMACSHA256(keyBytes))
    {
        var hash = hmac.ComputeHash(encoding.GetBytes(requestBody));
        var computedHmac = Convert.ToBase64String(hash);
        return hmacHeader == computedHmac;
    }
}
```

### 4.2 レート制限対応
```csharp
public class ShopifyRateLimitHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);
        
        if (response.Headers.TryGetValues("X-Shopify-Shop-Api-Call-Limit", out var values))
        {
            var limit = values.First();
            var parts = limit.Split('/');
            var current = int.Parse(parts[0]);
            var max = int.Parse(parts[1]);
            
            if (current >= max * 0.8) // 80%に達したら待機
            {
                await Task.Delay(1000, cancellationToken);
            }
        }
        
        return response;
    }
}
```

## 5. テスト方法

### 5.1 開発ストアの作成
1. Shopify Partnersダッシュボードにログイン
2. 「ストア」→「開発ストアを作成」
3. テスト用のストアを作成

### 5.2 ngrokでのローカルテスト
```bash
# ngrokでローカルをHTTPS公開
ngrok http 5000

# 環境変数を設定
export SHOPIFY_CALLBACK_URL=https://xxx.ngrok.io/api/auth/shopify/callback
```

## 6. トラブルシューティング

### よくあるエラー
1. **Invalid redirect_uri**: HTTPSでない、または登録されていないURL
2. **Invalid scope**: 存在しないスコープを要求
3. **Invalid state**: CSRF攻撃の可能性

### デバッグ方法
```csharp
// 詳細ログを有効化
builder.Services.AddLogging(config =>
{
    config.AddConsole();
    config.AddDebug();
    config.SetMinimumLevel(LogLevel.Debug);
});
```