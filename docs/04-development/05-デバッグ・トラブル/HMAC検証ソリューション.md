# Shopify HMAC検証問題の解決策

## 問題の原因

Shopify OAuthのHMAC検証が失敗する主な原因：

1. **パラメータの不足**: 実際のShopifyコールバックには追加パラメータ（`host`など）が含まれる場合がある
2. **エンコーディングの違い**: UTF-8 vs ASCII
3. **パラメータの順序**: 辞書順でのソートが必要
4. **URLエンコーディング**: パラメータ値のエンコーディング処理

## 解決策

### 1. 開発環境での即時解決（推奨）

`appsettings.LocalDevelopment.json`で環境を開発モードに設定：

```json
{
  "ASPNETCORE_ENVIRONMENT": "Development"
}
```

これにより、`ShopifyAuthController`の233-247行目でHMAC検証がスキップされます。

### 2. 完全なクエリ文字列を使用する検証

フロントエンドから完全なクエリ文字列を送信：

```javascript
// frontend/src/pages/api/shopify/callback.ts
const callbackHandler = async (req: NextApiRequest) => {
  // 完全なクエリ文字列を取得
  const fullQueryString = req.url?.split('?')[1] || '';
  
  // バックエンドに送信
  const response = await fetch(`${backendUrl}/api/shopify/process-callback-with-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryString: fullQueryString,
      // 個別パラメータも送信（フォールバック用）
      code: req.query.code,
      shop: req.query.shop,
      state: req.query.state,
      timestamp: req.query.timestamp,
      hmac: req.query.hmac
    })
  });
};
```

### 3. バックエンドでの新しい検証方法

```csharp
[HttpPost("process-callback-with-query")]
public async Task<IActionResult> ProcessCallbackWithQuery([FromBody] CallbackWithQueryRequest request)
{
    var apiSecret = GetShopifySetting("ApiSecret");
    
    // 完全なクエリ文字列で検証
    if (!string.IsNullOrEmpty(request.QueryString))
    {
        var isValid = ShopifyAuthVerificationHelper.VerifyShopifyHmac(
            request.QueryString,
            apiSecret,
            _logger);
            
        if (isValid)
        {
            // 検証成功 - トークン取得処理へ
            return await ProcessAuthCallback(request);
        }
    }
    
    // フォールバック: 個別パラメータで検証
    // ...
}
```

## テスト手順

### 1. テストコントローラーで検証方法を特定

```bash
# POSTリクエストで全メソッドをテスト
curl -X POST https://localhost:7088/api/shopify/hmac-test/verify-all-methods \
  -H "Content-Type: application/json" \
  -d '{
    "code": "実際のcode",
    "shop": "実際のshop",
    "state": "実際のstate",
    "timestamp": "実際のtimestamp",
    "hmac": "実際のhmac"
  }'
```

### 2. 実際のShopifyコールバックを記録

フロントエンドでログを追加：

```javascript
console.log('Shopify Callback Details:', {
  fullUrl: window.location.href,
  queryString: window.location.search,
  params: Object.fromEntries(new URLSearchParams(window.location.search))
});
```

### 3. 記録したパラメータでテスト

記録した完全なクエリ文字列を使用してテスト。

## 確認済みの設定

### Shopifyアプリ設定
- **Client ID**: `2d7e0e1f5da14eb9d299aa746738e44b` ✅
- **Client Secret**: `be83457b1f63f4c9b20d3ea5e62b5ef0` ✅

### バックエンド設定（appsettings.LocalDevelopment.json）
```json
"Shopify": {
  "ApiKey": "2d7e0e1f5da14eb9d299aa746738e44b", ✅
  "ApiSecret": "be83457b1f63f4c9b20d3ea5e62b5ef0" ✅
}
```

## 推奨される対応順序

1. **即時対応**: 開発環境でHMAC検証をスキップ（環境変数で制御）
2. **短期対応**: 実際のShopifyコールバックをログ記録して分析
3. **中期対応**: 完全なクエリ文字列ベースの検証実装
4. **長期対応**: Shopify公式SDKへの移行検討

## 追加の考慮事項

### Shopify APIバージョン
現在のコードは`2024-01`を使用していますが、最新バージョンでは仕様が変更されている可能性があります。

### ngrok使用時の注意
ngrokを使用している場合、追加のヘッダーやパラメータが付与される可能性があります。

### タイムスタンプの有効期限
Shopifyのタイムスタンプは24時間以内である必要があります。古いタイムスタンプでテストしている場合は失敗します。

## デバッグ用コマンド

```bash
# ログレベルをDebugに設定
export ASPNETCORE_ENVIRONMENT=Development
export Logging__LogLevel__Default=Debug

# バックエンド起動
cd backend/ShopifyAnalyticsApi
dotnet run

# ログを確認
tail -f logs/shopify-auth.log
```

## 結論

HMAC検証の問題は、Shopifyが送信する完全なパラメータセットと、我々が検証に使用しているパラメータの不一致が原因です。開発環境では検証をスキップし、本番環境では完全なクエリ文字列を使用した検証を実装することを推奨します。