# 本番環境（JDO）Azureリソースセットアップ手順

## 作成日: 2025-12-22

## 📊 現在の環境構成

### 既存リソース（本番環境）
- **Static Web App**: `ec-ranger-frontend-prod` (East Asia)
  - URL: https://[まだ確認が必要]

### 開発環境の構成（参考）
- **Static Web App**: `shopify-ai-marketing-frontend`
- **App Service**: `ShopifyTestApi20250720173320` / `shopifyapp-backend-develop`
- **SQL Server**: `shopify-test-server`
- **SQL Database**: `shopify-test-db`

---

## 🚀 本番環境に追加するリソース

### 1. SQL Server の作成

#### Azure Portal での手順

1. **Azure Portal にログイン**
   - https://portal.azure.com

2. **「リソースの作成」をクリック**

3. **「SQL Server」を検索して選択**

4. **以下の設定で作成**:

```yaml
基本設定:
  サブスクリプション: [お使いのサブスクリプション]
  リソースグループ: ec-ranger-prod（既存のものを選択）
  
サーバーの詳細:
  サーバー名: ec-ranger-sql-prod
  場所: Japan West（または Japan East）
  
認証:
  認証方法: SQL認証を使用
  サーバー管理者ログイン: sqladmin
  パスワード: [強力なパスワードを生成]
  パスワードの確認: [同じパスワード]

ネットワーク:
  ファイアウォール規則:
    - Azureサービスからのアクセスを許可: はい
    - 現在のクライアントIPアドレスを追加: はい
```

5. **「確認および作成」→「作成」をクリック**

### 2. SQL Database の作成

1. **作成したSQL Serverを選択**

2. **「データベース」→「+ データベースの追加」をクリック**

3. **以下の設定で作成**:

```yaml
基本設定:
  データベース名: ec-ranger-db-prod
  
コンピューティングとストレージ:
  サービス層: Standard
  コンピューティング層: プロビジョニング済み
  パフォーマンスレベル: S1 (20 DTU)
  最大データサイズ: 250 GB
  
バックアップ:
  バックアップストレージの冗長性: ローカル冗長
```

4. **「確認および作成」→「作成」をクリック**

### 3. App Service の作成

1. **「リソースの作成」→「Web アプリ」を選択**

2. **以下の設定で作成**:

```yaml
基本設定:
  サブスクリプション: [お使いのサブスクリプション]
  リソースグループ: ec-ranger-prod（既存のものを選択）
  
インスタンスの詳細:
  名前: ec-ranger-backend-prod
  公開: コード
  ランタイムスタック: .NET 8 (LTS)
  オペレーティングシステム: Windows
  地域: Japan West（SQL Serverと同じリージョン）
  
Windowsプラン:
  新規作成: ec-ranger-asp-prod
  
価格プラン:
  SKUとサイズ: Basic B1（本番用、必要に応じて後でスケールアップ）
```

3. **「確認および作成」→「作成」をクリック**

---

## 🔧 リソース作成後の設定

### 1. SQL Database の接続文字列取得

1. **SQL Database（ec-ranger-db-prod）を選択**

2. **「接続文字列」メニューから ADO.NET の接続文字列をコピー**

3. **接続文字列の形式**:
```
Server=tcp:ec-ranger-sql-prod.database.windows.net,1433;Initial Catalog=ec-ranger-db-prod;Persist Security Info=False;User ID=sqladmin;Password={your_password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

### 2. App Service の環境変数設定

1. **App Service（ec-ranger-backend-prod）を選択**

2. **「構成」→「アプリケーション設定」を開く**

3. **以下の環境変数を追加**:

```plaintext
# データベース接続
ConnectionStrings__DefaultConnection=[上記で取得した接続文字列]

# 環境設定
ASPNETCORE_ENVIRONMENT=Production

# Shopify API設定
Shopify__ApiKey=be1fc09e2135be7cee3b9186ef8bfe80
Shopify__ApiSecret=[メモから取得]
Shopify__WebhookSecret=[後で設定]
Shopify__EncryptionKey=bGFzZGZqYXNkZmphc2RmamFzZGZqYXNkZmphc2Rm
Shopify__Scopes=read_orders,read_products,read_customers
Shopify__Frontend__BaseUrl=[Static Web AppのURL]

# フロントエンドURL
Frontend__BaseUrl=[Static Web AppのURL]

# JWT設定
Jwt__Key=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025
Jwt__Issuer=ec-ranger
Jwt__Audience=shopify-stores
Jwt__ExpiryMinutes=1440

# 認証設定
Authentication__Mode=AllAllowed
Authentication__Secret=production-secret-key-at-least-256-bits-long-for-jwt-signing-2025

# デモモード
Demo__Enabled=true
Demo__Password=demo2025
Demo__PasswordHash=$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

# 開発者モード
Developer__Enabled=false

# CORS設定
Cors__AllowedOrigins=[Static Web AppのURL]
```

### 3. Static Web App の環境変数更新

1. **Static Web App（ec-ranger-frontend-prod）を選択**

2. **「構成」→「アプリケーション設定」を開く**

3. **以下の環境変数を追加/更新**:

```plaintext
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_APP_NAME=EC Ranger
NEXT_PUBLIC_FRONTEND_URL=[このStatic Web AppのURL]
NEXT_PUBLIC_BACKEND_URL=https://ec-ranger-backend-prod.azurewebsites.net
NEXT_PUBLIC_SHOPIFY_API_KEY=be1fc09e2135be7cee3b9186ef8bfe80
NEXT_PUBLIC_USE_HTTPS=true
```

---

## 📊 コスト見積もり（月額）

| リソース | プラン | 月額費用（概算） |
|---------|--------|-----------------|
| SQL Database | Standard S1 | ¥4,000-5,000 |
| App Service | Basic B1 | ¥2,000-3,000 |
| Static Web App | Standard | ¥1,200 |
| **合計** | | **¥7,200-9,200** |

---

## ✅ チェックリスト

### リソース作成
- [ ] SQL Server (ec-ranger-sql-prod) 作成
- [ ] SQL Database (ec-ranger-db-prod) 作成
- [ ] App Service (ec-ranger-backend-prod) 作成
- [ ] App Service Plan (ec-ranger-asp-prod) 作成

### 設定
- [ ] SQL Database の接続文字列取得
- [ ] App Service の環境変数設定
- [ ] Static Web App の環境変数更新
- [ ] ファイアウォール規則の設定
- [ ] CORS設定の確認

### デプロイ準備
- [ ] GitHub Actions のシークレット更新
- [ ] デプロイメントスロットの設定（オプション）
- [ ] Application Insights の設定（推奨）

---

## 🚨 重要な注意事項

1. **SQL Server のパスワード**
   - 強力なパスワードを使用（最低8文字、大文字小文字、数字、特殊文字を含む）
   - Azure Key Vault での管理を推奨

2. **ファイアウォール設定**
   - 初期設定では Azure サービスからのアクセスのみ許可
   - 必要に応じて特定のIPアドレスを追加

3. **バックアップ**
   - SQL Database は自動バックアップが有効
   - 保持期間の確認と調整

4. **スケーリング**
   - 初期はBasic/Standardプランで開始
   - 負荷に応じてスケールアップ

---

## 📝 次のステップ

1. ✅ Azureリソースの作成
2. ⏳ 環境変数の設定
3. ⏳ データベースの初期化（マイグレーション実行）
4. ⏳ GitHub Actions でのデプロイ設定
5. ⏳ 動作確認とテスト

---

## 🔗 関連ドキュメント

- [Azure環境変数設定](./azure-env-variables-setup.md)
- [本番環境デプロイ手順](./PRODUCTION_DEPLOYMENT_STEPS.md)
- [Azureインフラ構成とコスト](../05-development/02-インフラストラクチャ/Azureアーキテクチャ/Azureインフラ構成とコスト.md)
