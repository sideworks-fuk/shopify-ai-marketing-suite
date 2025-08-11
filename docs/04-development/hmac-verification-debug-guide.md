# Shopify HMAC検証エラー調査ガイド

## 問題の概要
`process-callback`エンドポイントでHMAC検証が失敗している。

## HMAC検証の仕組み

### Shopifyの HMAC生成ルール
Shopifyは以下の手順でHMACを生成します：

1. **クエリパラメータを辞書順にソート**
2. **hmacパラメータを除外**
3. **key=value&key=value形式で連結**
4. **HMAC-SHA256でハッシュを計算**

### 現在の実装の問題点

現在のコード（ShopifyAuthController.cs line 730-745）:
```csharp
private bool VerifyHmac(string code, string shop, string state, string timestamp, string hmac)
{
    var secret = GetShopifySetting("ApiSecret");
    if (string.IsNullOrWhiteSpace(secret))
        return false;

    // 問題: パラメータの順序が固定されている
    var queryString = $"code={code}&shop={shop}&state={state}&timestamp={timestamp}";
    
    // HMAC-SHA256を計算
    using var hmacSha256 = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var computedHash = hmacSha256.ComputeHash(Encoding.UTF8.GetBytes(queryString));
    var computedHmac = BitConverter.ToString(computedHash).Replace("-", "").ToLower();

    return computedHmac == hmac.ToLower();
}
```

## 修正案

```csharp
private bool VerifyHmac(string code, string shop, string state, string timestamp, string hmac)
{
    var secret = GetShopifySetting("ApiSecret");
    if (string.IsNullOrWhiteSpace(secret))
    {
        _logger.LogError("ApiSecretが設定されていません");
        return false;
    }

    // パラメータを辞書順にソート（Shopifyの仕様）
    var parameters = new SortedDictionary<string, string>
    {
        ["code"] = code,
        ["shop"] = shop,
        ["state"] = state,
        ["timestamp"] = timestamp
    };

    // hmacを除いたクエリ文字列を構築
    var queryString = string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}"));
    
    _logger.LogDebug("HMAC検証 - QueryString: {QueryString}", queryString);
    
    // HMAC-SHA256を計算
    using var hmacSha256 = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
    var computedHash = hmacSha256.ComputeHash(Encoding.UTF8.GetBytes(queryString));
    var computedHmac = BitConverter.ToString(computedHash).Replace("-", "").ToLower();

    _logger.LogDebug("HMAC検証 - 受信: {Received}, 計算: {Computed}", hmac, computedHmac);

    return computedHmac == hmac.ToLower();
}
```

## デバッグ手順

### 1. 設定の確認
```bash
# バックエンドのテストエンドポイントで設定を確認
curl https://localhost:7088/api/shopify/test-settings
```

### 2. ログレベルの変更
`appsettings.LocalDevelopment.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "ShopifyAnalyticsApi.Controllers.ShopifyAuthController": "Debug"
    }
  }
}
```

### 3. 開発環境での一時的な回避策

現在のコード（line 233-248）では開発環境でHMAC検証をスキップできます：
```csharp
var isDevelopment = _configuration["ASPNETCORE_ENVIRONMENT"] == "Development";

if (!isDevelopment && !VerifyHmac(request.Code, request.Shop, request.State, request.Timestamp, request.Hmac))
{
    _logger.LogWarning("HMAC検証失敗. Shop: {Shop}", request.Shop);
    return Unauthorized(new { error = "HMAC validation failed" });
}
```

### 4. 実際のShopifyコールバックパラメータの確認

フロントエンドで受信したパラメータをログ出力：
```javascript
// frontend/src/pages/api/shopify/callback.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Shopifyコールバック受信:', {
    query: req.query,
    url: req.url,
    headers: req.headers
  });
  // ...
}
```

## 追加の確認事項

### 1. URLエンコーディング
パラメータ値がURLエンコードされている場合、デコードが必要：
```csharp
var decodedCode = Uri.UnescapeDataString(code);
var decodedShop = Uri.UnescapeDataString(shop);
```

### 2. タイムスタンプの検証
Shopifyのタイムスタンプが期限切れの場合もエラーになる可能性：
```csharp
if (!string.IsNullOrEmpty(timestamp))
{
    var ts = long.Parse(timestamp);
    var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    if (Math.Abs(now - ts) > 86400) // 24時間以上の差
    {
        _logger.LogWarning("タイムスタンプが古すぎます");
        return false;
    }
}
```

## 環境変数とシークレットの確認

### 現在の設定値
- **クライアントID**: `2d7e0e1f5da14eb9d299aa746738e44b`
- **クライアントシークレット**: `be83457b1f63f4c9b20d3ea5e62b5ef0`

### 設定ファイルの確認箇所
1. `appsettings.LocalDevelopment.json` - Shopify:ApiSecret
2. 環境変数 `SHOPIFY_APISECRET`
3. Azure Key Vault（本番環境）

## 推奨される対応

1. **即座の対応**: 開発環境でHMAC検証を一時的にスキップ
2. **短期対応**: HMAC検証ロジックを修正（辞書順ソート）
3. **中期対応**: 詳細なログ出力を追加してデバッグ
4. **長期対応**: Shopify公式SDKの使用を検討

## 参考リンク
- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [HMAC Verification](https://shopify.dev/docs/apps/auth/oauth/getting-started#verify-the-installation-request)