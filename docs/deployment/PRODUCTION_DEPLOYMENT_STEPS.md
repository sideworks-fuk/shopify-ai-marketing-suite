# 🚀 本番環境デプロイ手順書

## 最終更新: 2025-12-22

## 📊 現在の環境構成

### Frontend (Azure Static Web Apps)
- **リソース名**: brave-sea-038f17a00
- **URL**: https://brave-sea-038f17a00.1.azurestaticapps.net
- **リージョン**: East Asia

### Backend (Azure App Service)
- **開発/ステージング**: ShopifyTestApi20250720173320
  - URL: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
- **本番**: shopifyapp-backend-develop
  - URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net

### Database (Azure SQL Database)
- **サーバー**: shopify-test-server.database.windows.net
- **データベース**: shopify-test-db
- **プラン**: Basic/S1

---

## 🔧 ステップ1: Azure Portal での環境変数設定

### 1.1 Backend (App Service) の環境変数設定

1. **Azure Portal にログイン**
   ```
   https://portal.azure.com
   ```

2. **App Service を選択**
   - 本番用: `shopifyapp-backend-develop`

3. **[構成] > [アプリケーション設定] を開く**

4. **以下の環境変数を追加/更新**:

```bash
# === 基本設定 ===
ASPNETCORE_ENVIRONMENT=Production

# === Shopify API設定 ===
# ⚠️ 以下は実際のAPIキーに置き換える必要があります
Shopify__ApiKey=[Shopify Partnersで取得したClient ID]
Shopify__ApiSecret=[Shopify Partnersで取得したClient Secret]
Shopify__WebhookSecret=[Shopify Webhookシークレット]
Shopify__EncryptionKey=bGFzZGZqYXNkZmphc2RmamFzZGZqYXNkZmphc2Rm
Shopify__Scopes=read_orders,read_products,read_customers
Shopify__Frontend__BaseUrl=https://brave-sea-038f17a00.1.azurestaticapps.net

# === フロントエンドURL設定 ===
Frontend__BaseUrl=https://brave-sea-038f17a00.1.azurestaticapps.net

# === JWT認証設定 ===
Jwt__Key=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025
Jwt__Issuer=ec-ranger
Jwt__Audience=shopify-stores
Jwt__ExpiryMinutes=1440

# === 認証設定 ===
Authentication__Mode=AllAllowed
Authentication__Secret=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025
Authentication__Issuer=ec-ranger
Authentication__Audience=shopify-stores

# === デモモード設定 ===
Demo__Enabled=true
Demo__Password=demo2025
Demo__PasswordHash=$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

# === 開発者モード（本番では無効） ===
Developer__Enabled=false

# === データベース接続文字列 ===
ConnectionStrings__DefaultConnection=Server=tcp:shopify-test-server.database.windows.net,1433;Initial Catalog=shopify-test-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyTest2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

5. **[保存] をクリック**

6. **App Service を再起動**

### 1.2 Frontend (Static Web Apps) の環境変数設定

1. **Static Web Apps を選択**
   - リソース名: `brave-sea-038f17a00`

2. **[構成] > [アプリケーション設定] を開く**

3. **以下の環境変数を追加/更新**:

```bash
# === 基本設定 ===
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=EC Ranger

# === URL設定 ===
NEXT_PUBLIC_FRONTEND_URL=https://brave-sea-038f17a00.1.azurestaticapps.net
NEXT_PUBLIC_BACKEND_URL=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net

# === Shopify設定 ===
# ⚠️ 以下は実際のAPIキーに置き換える必要があります
NEXT_PUBLIC_SHOPIFY_API_KEY=[Shopify Partnersで取得したClient ID]

# === その他設定 ===
NEXT_PUBLIC_USE_HTTPS=true
```

4. **[保存] をクリック**

---

## 🚀 ステップ2: GitHub Actions でのデプロイ

### 2.1 コードの準備

1. **最新コードを確認**
   ```bash
   git pull origin develop
   git status
   ```

2. **本番用設定ファイルを確認**
   - `backend/ShopifyAnalyticsApi/appsettings.Production.json`
   - `frontend/.env.production`

### 2.2 GitHub Actions でデプロイ実行

1. **GitHub リポジトリにアクセス**
   ```
   https://github.com/[your-username]/shopify-ai-marketing-suite/actions
   ```

2. **"Deploy All (Frontend & Backend)" ワークフローを選択**

3. **[Run workflow] をクリック**

4. **以下のパラメータを設定**:
   - **デプロイ環境**: `production`
   - **フロントエンドをデプロイ**: ✅
   - **バックエンドをデプロイ**: ✅
   - **デプロイメッセージ**: "本番環境初期デプロイ - Shopifyアプリインストール機能"

5. **[Run workflow] ボタンをクリック**

6. **デプロイの進行状況を監視**
   - 通常5-10分で完了します

---

## ✅ ステップ3: デプロイ後の確認

### 3.1 基本動作確認

1. **Frontend の確認**
   ```
   https://brave-sea-038f17a00.1.azurestaticapps.net
   ```
   - ページが表示されることを確認

2. **Backend API の確認**
   ```
   https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/health
   ```
   - 200 OK が返ることを確認

3. **インストールページの確認**
   ```
   https://brave-sea-038f17a00.1.azurestaticapps.net/install
   ```
   - インストールページが表示されることを確認

### 3.2 ログの確認

#### Azure Portal でのログ確認

1. **App Service のログ**
   - App Service > 診断とソリューション > アプリケーションログ

2. **Static Web Apps のログ**
   - Static Web Apps > 監視 > ログ

#### Application Insights（設定済みの場合）

1. **Application Insights を開く**
2. **ライブメトリック** で リアルタイム監視
3. **失敗** タブでエラーを確認

---

## 🔍 トラブルシューティング

### 問題: 500 Internal Server Error

**解決策**:
1. App Service のログを確認
2. 環境変数が正しく設定されているか確認
3. データベース接続文字列を確認

### 問題: CORS エラー

**解決策**:
1. Backend の CORS 設定で Frontend URL が許可されているか確認
2. 環境変数の `Cors__AllowedOrigins` を確認

### 問題: 認証エラー

**解決策**:
1. Shopify API キーが正しく設定されているか確認
2. JWT 設定が Frontend/Backend で一致しているか確認

### 問題: デプロイが失敗する

**解決策**:
1. GitHub Actions のログを確認
2. Azure のサービスクォータを確認
3. Publish Profile が最新か確認

---

## 📝 チェックリスト

### デプロイ前
- [ ] Shopify Partners で本番用APIキーを取得
- [ ] Azure Portal で環境変数を設定
- [ ] データベースのバックアップを取得
- [ ] 最新コードがGitHubにプッシュされている

### デプロイ中
- [ ] GitHub Actions でデプロイを実行
- [ ] デプロイログを監視
- [ ] エラーがないことを確認

### デプロイ後
- [ ] Frontend が正常に表示される
- [ ] Backend API が応答する
- [ ] インストールページが動作する
- [ ] ログにエラーがない
- [ ] Shopify アプリインストールのテスト

---

## 📞 緊急連絡先

問題が発生した場合:
1. Azure Portal のログを確認
2. GitHub Actions のログを確認
3. このドキュメントのトラブルシューティングを参照

---

## 📚 関連ドキュメント

- [Shopifyアプリセットアップ手順](./URGENT_SHOPIFY_APP_SETUP.md)
- [環境設定ガイド](../05-development/01-環境構築/環境設定統合ガイド.md)
- [Azureインフラ構成](../05-development/02-インフラストラクチャ/Azureアーキテクチャ/Azureインフラ構成とコスト.md)
