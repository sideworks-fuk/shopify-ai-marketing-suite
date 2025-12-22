# Azure環境変数設定手順（EC Ranger-sample）

## 設定日: 2025-12-22

## 🔐 Shopify APIクレデンシャル（取得済み）

- **アプリ名**: EC Ranger-sample
- **Client ID**: be1fc09e2135be7cee3b9186ef8bfe80
- **Client Secret**: [メモから取得]

---

## 📋 Azure Portal 設定手順

### 1. Backend (App Service) の環境変数設定

#### 本番環境: shopifyapp-backend-develop

以下の環境変数を設定してください：

```plaintext
# Shopify API設定（実際の値を設定）
Shopify__ApiKey=be1fc09e2135be7cee3b9186ef8bfe80
Shopify__ApiSecret=[メモから取得]
Shopify__WebhookSecret=[後で設定]
Shopify__EncryptionKey=bGFzZGZqYXNkZmphc2RmamFzZGZqYXNkZmphc2Rm
Shopify__Scopes=read_orders,read_products,read_customers
Shopify__Frontend__BaseUrl=https://brave-sea-038f17a00.1.azurestaticapps.net

# フロントエンドURL
Frontend__BaseUrl=https://brave-sea-038f17a00.1.azurestaticapps.net

# JWT設定
Jwt__Key=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025
Jwt__Issuer=ec-ranger
Jwt__Audience=shopify-stores
Jwt__ExpiryMinutes=1440

# 認証設定
Authentication__Mode=AllAllowed
Authentication__Secret=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025

# 環境設定
ASPNETCORE_ENVIRONMENT=Production

# デモモード
Demo__Enabled=true
Demo__Password=demo2025
Demo__PasswordHash=$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

# 開発者モード（本番では無効）
Developer__Enabled=false
```

#### 開発/ステージング環境: ShopifyTestApi20250720173320

同じ値を設定（ASPNETCore_ENVIRONMENTのみDevelopmentに変更）

### 2. Frontend (Static Web Apps) の環境変数設定

#### リソース: brave-sea-038f17a00

```plaintext
# 基本設定
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=EC Ranger

# URL設定
NEXT_PUBLIC_FRONTEND_URL=https://brave-sea-038f17a00.1.azurestaticapps.net
NEXT_PUBLIC_BACKEND_URL=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net

# Shopify設定（実際の値を設定）
NEXT_PUBLIC_SHOPIFY_API_KEY=be1fc09e2135be7cee3b9186ef8bfe80

# HTTPS設定
NEXT_PUBLIC_USE_HTTPS=true
```

---

## 🔧 設定手順

### Azure Portal での設定方法

1. **Azure Portal にログイン**
   - https://portal.azure.com

2. **Backend (App Service) の設定**
   - リソースグループから `shopifyapp-backend-develop` を選択
   - 左メニュー「構成」→「アプリケーション設定」
   - 「新しいアプリケーション設定」をクリック
   - 上記の環境変数を一つずつ追加
   - すべて追加後、「保存」をクリック
   - App Service を再起動

3. **Frontend (Static Web Apps) の設定**
   - リソースグループから `brave-sea-038f17a00` を選択
   - 左メニュー「構成」→「アプリケーション設定」
   - 環境変数を追加
   - 「保存」をクリック

---

## ⚠️ 重要な注意事項

1. **Client Secret は絶対に公開しない**
2. **環境変数の名前は正確に入力**（大文字小文字、アンダースコア位置）
3. **保存後は必ず App Service を再起動**
4. **設定後、5分程度待ってから動作確認**

---

## ✅ 設定後の確認

### 1. Backend API の確認
```bash
curl https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/health
```

### 2. Frontend の確認
```
https://brave-sea-038f17a00.1.azurestaticapps.net/install
```

### 3. Shopify OAuth テスト
開発ストアでインストールURLをテスト：
```
https://brave-sea-038f17a00.1.azurestaticapps.net/install?shop=test-store.myshopify.com
```

---

## 📝 追加設定（Shopify Partners）

Shopify Partners ダッシュボードで以下を確認：

### Allowed redirection URLs
```
https://brave-sea-038f17a00.1.azurestaticapps.net/api/shopify/callback
https://brave-sea-038f17a00.1.azurestaticapps.net/auth/success
https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

### App URL
```
https://brave-sea-038f17a00.1.azurestaticapps.net
```

### Required Scopes
- read_orders
- read_products
- read_customers

---

## 🚀 次のステップ

1. ✅ Azure Portal で環境変数設定
2. ⏳ GitHub Actions でデプロイ実行
3. ⏳ 動作確認
4. ⏳ お客様へインストールURL提供
