# Shopify OAuth 代替アプローチ提案

## 🔴 現在の問題状況

HMACの検証が継続的に失敗しており、根本的なアプローチの見直しが必要です。

## 🎯 提案する代替アプローチ

### 1. Shopify公式SDKの使用

**ShopifySharp** - .NET用の成熟したShopify SDK
```bash
dotnet add package ShopifySharp
```

```csharp
// ShopifySharpを使用したOAuth実装
using ShopifySharp;

public class ShopifyOAuthService
{
    private readonly string _apiKey;
    private readonly string _apiSecret;
    
    public bool VerifyRequest(Dictionary<string, string> queryParams)
    {
        return AuthorizationService.IsAuthenticRequest(queryParams, _apiSecret);
    }
    
    public async Task<string> GetAccessToken(string code, string shopDomain)
    {
        return await AuthorizationService.Authorize(code, shopDomain, _apiKey, _apiSecret);
    }
}
```

### 2. Shopify Session Token（推奨）

最新のShopifyアプリはSession Tokenを使用することが推奨されています。

```javascript
// フロントエンド（App Bridge）
import { getSessionToken } from '@shopify/app-bridge-utils';

const token = await getSessionToken(app);
// このトークンをバックエンドに送信

```

```csharp
// バックエンド
public async Task<bool> VerifySessionToken(string token)
{
    // JWT検証
    var handler = new JwtSecurityTokenHandler();
    var validationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = $"https://{shopDomain}",
        ValidateAudience = true,
        ValidAudience = _apiKey,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_apiSecret))
    };
    
    var principal = handler.ValidateToken(token, validationParameters, out var validatedToken);
    return principal != null;
}
```

### 3. Shopify CLI v3での開発

```bash
# Shopify CLIを使用した開発
npm install -g @shopify/cli@latest
shopify app generate node
```

これにより、正しい認証フローが自動的に実装されます。

## 🔍 現在の実装の問題点の可能性

### 1. リダイレクトURLの不一致
```
Shopify Partners設定: https://example.com/callback
実際のコールバック: https://localhost:7088/api/shopify/callback
```

### 2. Embedded App vs Standalone App
- Embedded App: Shopify管理画面内で動作
- Standalone App: 独立したWebアプリ
- **認証フローが異なる**

### 3. APIバージョンの不一致
```
現在使用: 2024-01
最新: 2025-01
```

## 📋 即座に試すべき検証手順

### ステップ1: 最小限のテスト実装

```python
# test_shopify_hmac.py
import shopify
shopify.Session.setup(api_key="your_key", secret="your_secret")

# Shopifyのサンプルデータでテスト
params = {
    'code': 'test',
    'shop': 'test.myshopify.com',
    'state': 'test',
    'timestamp': '1234567890'
}

# Shopify公式ライブラリでHMAC生成
hmac = shopify.Session.calculate_hmac(params)
print(f"Generated HMAC: {hmac}")
```

### ステップ2: リクエストの完全キャプチャ

```csharp
// すべてのヘッダーとボディをログ
public IActionResult DebugCallback()
{
    var headers = Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString());
    var query = Request.Query.ToDictionary(q => q.Key, q => q.Value.ToString());
    var body = new StreamReader(Request.Body).ReadToEndAsync().Result;
    
    _logger.LogInformation("Headers: {Headers}", JsonSerializer.Serialize(headers));
    _logger.LogInformation("Query: {Query}", JsonSerializer.Serialize(query));
    _logger.LogInformation("Body: {Body}", body);
    
    return Ok();
}
```

## 🚀 推奨される即時対応

### オプション1: ShopifySharp導入（最速）
1. NuGetでShopifySharpをインストール
2. 既存の認証ロジックを置き換え
3. 公式ライブラリの検証メソッドを使用

### オプション2: フロントエンド主導の認証
1. フロントエンドで完全な認証を処理
2. アクセストークンのみバックエンドに送信
3. バックエンドはトークンの検証のみ

### オプション3: 新規アプリ作成
1. Shopify Partnersで新しいアプリを作成
2. 新しい認証情報で再実装
3. 正しい設定を最初から確認

## 🔧 デバッグ用コード

```csharp
// 完全なデバッグ用HMAC検証
public class HmacDebugService
{
    public void DebugHmac(string queryString, string providedHmac, string secret)
    {
        // 1. 元のクエリ文字列
        Console.WriteLine($"Original: {queryString}");
        
        // 2. パラメータ分解
        var parsed = HttpUtility.ParseQueryString(queryString);
        foreach (string key in parsed.AllKeys)
        {
            Console.WriteLine($"  {key} = {parsed[key]}");
        }
        
        // 3. hmac除外
        parsed.Remove("hmac");
        
        // 4. 再構築（複数の方法）
        var method1 = string.Join("&", parsed.AllKeys.Select(k => $"{k}={parsed[k]}"));
        var method2 = string.Join("&", parsed.AllKeys.OrderBy(k => k).Select(k => $"{k}={parsed[k]}"));
        
        // 5. 各方法でHMAC計算
        foreach (var (method, query) in new[] { ("Original Order", method1), ("Sorted", method2) })
        {
            var hmac = ComputeHmac(query, secret);
            Console.WriteLine($"{method}: {hmac}");
            Console.WriteLine($"  Match: {hmac == providedHmac}");
        }
    }
    
    private string ComputeHmac(string message, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
```

## 📞 エスカレーション先

1. **Shopify Developer Forum**
   - https://community.shopify.dev/
   - OAuth/HMAC関連の質問

2. **Shopify Partner Support**
   - Partners Dashboard → Support
   - 技術的な問題として報告

3. **ShopifySharp GitHub**
   - https://github.com/nozzlegear/ShopifySharp
   - Issue作成して質問

---

**重要**: この問題はリリースブロッカーです。上記のアプローチを順番に試し、24時間以内に解決しない場合は、ShopifySharpへの移行を強く推奨します。