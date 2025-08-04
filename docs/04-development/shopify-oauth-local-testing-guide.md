# Shopify OAuth ローカルテストガイド

## 概要
Shopify OAuthをローカル環境でテストするための手順書です。

## 前提条件

1. **Shopify Partners アカウント**
   - https://partners.shopify.com でアカウント作成

2. **ngrok インストール**
   ```bash
   # macOS
   brew install ngrok
   
   # Windows (Chocolatey)
   choco install ngrok
   
   # または直接ダウンロード
   # https://ngrok.com/download
   ```

3. **開発ストア作成**
   - Shopify Partnersダッシュボードで開発ストアを作成

## セットアップ手順

### 1. ngrokでローカル環境を公開

```bash
# バックエンドAPIを公開（ポート7088）
ngrok http 7088

# 出力例:
# Forwarding  https://abc123.ngrok.io -> http://localhost:7088
```

### 2. Shopifyアプリ設定

1. Shopify Partnersダッシュボードにログイン
2. "Apps" → "Create app" → "Create app manually"
3. アプリ情報を入力：
   - App name: Shopify AI Marketing Suite (Dev)
   - App URL: `https://[your-ngrok-url].ngrok.io`
   - Allowed redirection URL(s): 
     ```
     https://[your-ngrok-url].ngrok.io/api/shopify/callback
     http://localhost:3000/shopify/success
     ```

### 3. 環境設定

`appsettings.Development.json`を更新：

```json
{
  "Shopify": {
    "ApiKey": "[Shopify App API Key]",
    "ApiSecret": "[Shopify App API Secret]",
    "WebhookSecret": "[Webhook Secret (後で設定)]",
    "Scopes": "read_orders,read_products,read_customers"
  },
  "Frontend": {
    "BaseUrl": "http://localhost:3000"
  }
}
```

### 4. データベースマイグレーション実行

```bash
# SQLファイルを実行
sqlcmd -S [server] -d [database] -i Migrations/AddShopifyAuthFields.sql
```

## テスト手順

### 1. アプリケーション起動

```bash
# バックエンド起動
cd backend/ShopifyAnalyticsApi
dotnet run

# フロントエンド起動（別ターミナル）
cd frontend
npm run dev
```

### 2. インストールフロー確認

1. ブラウザで以下にアクセス：
   ```
   https://[your-ngrok-url].ngrok.io/api/shopify/install?shop=[your-shop].myshopify.com
   ```

2. Shopifyログイン画面が表示される
3. アプリの権限を承認
4. `http://localhost:3000/shopify/success`にリダイレクトされる

### 3. Webhook動作確認

Shopify Admin APIでWebhookをトリガー：

```bash
# アンインストールWebhookテスト
curl -X POST https://[your-ngrok-url].ngrok.io/api/webhook/uninstalled \
  -H "X-Shopify-Hmac-SHA256: [computed-hmac]" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "fuk-dev1.myshopify.com",
    "id": 12345678
  }'
```

## トラブルシューティング

### 401 Unauthorized エラー

1. **HMAC署名の確認**
   - Webhook Secretが正しく設定されているか確認
   - appsettings.jsonの値とShopifyアプリ設定が一致しているか確認

2. **State検証エラー**
   - キャッシュが有効になっているか確認
   - 10分以内にコールバックが実行されているか確認

### SSL証明書エラー

ngrokのHTTPS URLを使用していることを確認

### リダイレクトループ

- Allowed redirection URLsが正しく設定されているか確認
- フロントエンドのURLが正しいか確認

## 開発のヒント

### 1. ログ確認

```bash
# ASP.NET Coreログ
tail -f logs/shopify-oauth-*.log

# ngrokリクエストログ
# http://localhost:4040 でWeb UIを確認
```

### 2. デバッグ用エンドポイント

```csharp
// デバッグ用：トークン情報確認
[HttpGet("debug/token/{storeId}")]
[Authorize]
public async Task<IActionResult> GetTokenInfo(int storeId)
{
    // 開発環境のみ有効
}
```

### 3. テストデータクリーンアップ

```sql
-- テストストアデータを削除
DELETE FROM WebhookEvents WHERE StoreId IN (SELECT Id FROM Stores WHERE Domain LIKE '%test%');
DELETE FROM Stores WHERE Domain LIKE '%test%';
```

## セキュリティ注意事項

1. **本番環境では絶対にngrokを使用しない**
2. **APIキー・シークレットをソースコードにコミットしない**
3. **開発環境でもHTTPSを使用する**
4. **定期的にアクセストークンをローテーションする**

## 次のステップ

1. **Pollyでリトライロジック実装**
   - Shopify APIレート制限対策

2. **Azure Service Bus統合**
   - Webhook処理の非同期化

3. **Azure Key Vault統合**
   - トークンの安全な保存