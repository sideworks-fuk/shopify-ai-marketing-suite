# Azure JWT認証 クイックセットアップガイド

## 必須設定項目

### 1. Azure App Service（バックエンド）の設定

**Azure Portal** → **App Service** → **構成** → **アプリケーション設定**

以下の環境変数を追加：

```bash
# JWT設定（必須）
Jwt__Key=your-very-long-secret-key-at-least-32-characters
Jwt__Issuer=ShopifyAnalyticsApi
Jwt__Audience=ShopifyAnalyticsApi
Jwt__ExpirationMinutes=60

# 接続文字列（既に設定済みの場合はスキップ）
ConnectionStrings__DefaultConnection=your-connection-string
```

**重要**: 
- `Jwt__Key`は32文字以上のランダムな文字列にしてください
- Azure App Serviceでは、`:`の代わりに`__`（アンダースコア2つ）を使用します

### 2. CORS設定の確認

**Azure Portal** → **App Service** → **CORS**

- フロントエンドのURLを追加済みであることを確認
- 「資格情報を含むアクセスを許可する」にチェック

### 3. 設定後の手順

1. **App Serviceを再起動**
   - Azure Portal → App Service → 概要 → 「再起動」

2. **フロントエンドでログイン**
   - https://YOUR-FRONTEND-URL/api-test にアクセス
   - 「ログイン」ボタンをクリック
   - テストユーザー情報でログイン

### 4. トラブルシューティング

401エラーが続く場合：

1. **App Service のログを確認**
   ```bash
   az webapp log tail --name YOUR-APP-SERVICE-NAME --resource-group YOUR-RG
   ```

2. **環境変数が正しく設定されているか確認**
   - App Service → 高度なツール → Kudu → Environment

3. **JWT秘密鍵の生成方法**
   ```bash
   # PowerShellの場合
   [System.Web.Security.Membership]::GeneratePassword(32,8)
   
   # Bashの場合
   openssl rand -base64 32
   ```

### 5. テストユーザー情報

デフォルトのテストユーザー：
- Email: test@example.com
- Password: Test123!

※ 本番環境では必ず変更してください