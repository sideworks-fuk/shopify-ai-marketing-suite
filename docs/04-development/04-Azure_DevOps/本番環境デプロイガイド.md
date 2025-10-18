# Azure本番環境構築ガイド（統合版）
## EC Ranger - Shopify AI Marketing Suite

作成日: 2025年8月12日  
作成者: Kenji（プロジェクトマネージャー）  
対象者: 福田様（本番環境構築担当）

---

## 📋 はじめに

このドキュメントは、EC RangerのAzure本番環境構築に必要なすべての情報を統合したガイドです。
分散していた情報を整理し、効率的な構築作業を支援します。

---

## 🎯 構築方針

### 環境構成
- **開発環境**: 構築済み・稼働中
- **ステージング環境**: 構築済み・稼働中
- **本番環境**: これから構築（本ガイドの対象）

### 基本原則
1. **新規サブスクリプション作成**: アクセスネット専用
2. **完全分離**: 既存システム（Fedex案件等）との分離
3. **段階的構築**: リスクを最小化
4. **セキュリティ重視**: Azure Key Vault、Managed Identity活用

---

## 🏗️ Azure リソース構成

### 推奨構成と月額コスト

| コンポーネント | リソース名 | SKU/プラン | 月額コスト目安 |
|--------------|-----------|-----------|---------------|
| **データベース** | ec-ranger-db-prod | Standard S1 (50 DTU) | ¥6,000 |
| **フロントエンド** | ec-ranger-frontend-prod | Static Web Apps Standard | ¥1,200 |
| **バックエンド** | ec-ranger-api-prod | App Service Standard S1 | ¥12,000 |
| **シークレット管理** | ec-ranger-vault-prod | Key Vault Standard | ¥200 |
| **監視** | ec-ranger-insights-prod | Application Insights | ¥2,500 |
| **ストレージ** | ecrangerstorageprod | Standard LRS | ¥500 |
| **合計** | - | - | **約¥22,400/月** |

---

## 📝 構築手順

### 1. 事前準備

#### 必要なツール
```bash
# Azure CLI
az --version  # 2.50.0以上推奨

# .NET SDK
dotnet --version  # 8.0以上

# Node.js
node --version  # 18.0以上

# Git
git --version
```

#### Azureサブスクリプション作成
```bash
# ログイン
az login

# サブスクリプション作成（管理ポータルから実施）
# 名前: AccessNet-ECRanger-Production

# サブスクリプション切り替え
az account set --subscription "AccessNet-ECRanger-Production"
```

### 2. リソースグループ作成

```bash
# リソースグループ作成
az group create \
  --name ec-ranger-prod-rg \
  --location japaneast \
  --tags Environment=Production Project=ECRanger Owner=AccessNet
```

### 3. データベース（Azure SQL Database）

#### 3.1 SQL Server作成
```bash
# SQL Server作成
az sql server create \
  --name ec-ranger-sql-prod \
  --resource-group ec-ranger-prod-rg \
  --location japaneast \
  --admin-user ecrangeradmin \
  --admin-password 'YourSecurePassword123!'
```

#### 3.2 データベース作成
```bash
# データベース作成
az sql db create \
  --name ECRangerDB \
  --server ec-ranger-sql-prod \
  --resource-group ec-ranger-prod-rg \
  --edition Standard \
  --service-objective S1 \
  --max-size 250GB
```

#### 3.3 ファイアウォール設定
```bash
# Azure サービスからのアクセス許可
az sql server firewall-rule create \
  --server ec-ranger-sql-prod \
  --resource-group ec-ranger-prod-rg \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 開発用IP許可（必要に応じて）
az sql server firewall-rule create \
  --server ec-ranger-sql-prod \
  --resource-group ec-ranger-prod-rg \
  --name AllowOfficeIP \
  --start-ip-address YOUR_OFFICE_IP \
  --end-ip-address YOUR_OFFICE_IP
```

#### 3.4 接続文字列
```
Server=tcp:ec-ranger-sql-prod.database.windows.net,1433;
Initial Catalog=ECRangerDB;
Persist Security Info=False;
User ID=ecrangeradmin;
Password=YourSecurePassword123!;
MultipleActiveResultSets=False;
Encrypt=True;
TrustServerCertificate=False;
Connection Timeout=30;
```

### 4. バックエンド（Azure App Service）

#### 4.1 App Service Plan作成
```bash
az appservice plan create \
  --name ec-ranger-asp-prod \
  --resource-group ec-ranger-prod-rg \
  --location japaneast \
  --sku S1 \
  --is-linux false
```

#### 4.2 Web App作成
```bash
az webapp create \
  --name ec-ranger-api-prod \
  --resource-group ec-ranger-prod-rg \
  --plan ec-ranger-asp-prod \
  --runtime "DOTNET|8.0"
```

#### 4.3 環境変数設定
```bash
# データベース接続
az webapp config connection-string set \
  --name ec-ranger-api-prod \
  --resource-group ec-ranger-prod-rg \
  --connection-string-type SQLServer \
  --settings DefaultConnection="YOUR_CONNECTION_STRING"

# アプリケーション設定
az webapp config appsettings set \
  --name ec-ranger-api-prod \
  --resource-group ec-ranger-prod-rg \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    ShopifyOptions__ApiKey=YOUR_SHOPIFY_API_KEY \
    ShopifyOptions__ApiSecret=YOUR_SHOPIFY_API_SECRET \
    ShopifyOptions__AppUrl=https://ec-ranger-api-prod.azurewebsites.net \
    ShopifyOptions__FrontendUrl=https://ec-ranger.jp \
    JwtSettings__SecretKey=YOUR_JWT_SECRET \
    JwtSettings__Issuer=https://ec-ranger-api-prod.azurewebsites.net \
    JwtSettings__Audience=ec-ranger-frontend
```

### 5. フロントエンド（Azure Static Web Apps）

#### 5.1 Static Web Apps作成
```bash
az staticwebapp create \
  --name ec-ranger-frontend-prod \
  --resource-group ec-ranger-prod-rg \
  --location eastasia \
  --sku Standard \
  --source https://github.com/yourusername/shopify-ai-marketing-suite \
  --branch main \
  --app-location "/frontend" \
  --api-location "" \
  --output-location ".next"
```

#### 5.2 環境変数設定
Static Web Apps の設定画面から以下を設定：
```
NEXT_PUBLIC_BACKEND_URL=https://ec-ranger-api-prod.azurewebsites.net
NEXT_PUBLIC_SHOPIFY_API_KEY=YOUR_SHOPIFY_API_KEY
NEXT_PUBLIC_APP_URL=https://ec-ranger.jp
```

### 6. Azure Key Vault設定

#### 6.1 Key Vault作成
```bash
az keyvault create \
  --name ec-ranger-vault-prod \
  --resource-group ec-ranger-prod-rg \
  --location japaneast \
  --sku standard
```

#### 6.2 シークレット登録
```bash
# データベース接続文字列
az keyvault secret set \
  --vault-name ec-ranger-vault-prod \
  --name DatabaseConnection \
  --value "YOUR_CONNECTION_STRING"

# Shopify API Secret
az keyvault secret set \
  --vault-name ec-ranger-vault-prod \
  --name ShopifyApiSecret \
  --value "YOUR_SHOPIFY_API_SECRET"

# JWT Secret
az keyvault secret set \
  --vault-name ec-ranger-vault-prod \
  --name JwtSecretKey \
  --value "YOUR_JWT_SECRET"
```

### 7. Application Insights設定

```bash
# Application Insights作成
az monitor app-insights component create \
  --app ec-ranger-insights-prod \
  --location japaneast \
  --resource-group ec-ranger-prod-rg \
  --application-type web

# App Serviceに統合
az webapp config appsettings set \
  --name ec-ranger-api-prod \
  --resource-group ec-ranger-prod-rg \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="YOUR_INSIGHTS_CONNECTION_STRING"
```

---

## 🚀 デプロイメント

### GitHub Actions設定

#### 1. Secrets設定
GitHubリポジトリの Settings → Secrets → Actions に以下を登録：

| Secret名 | 値 |
|---------|---|
| AZURE_STATIC_WEB_APPS_API_TOKEN_PROD | Static Web Appsのトークン |
| AZURE_WEBAPP_PUBLISH_PROFILE_PROD | App Serviceの発行プロファイル |
| DATABASE_CONNECTION_STRING_PROD | 本番DBの接続文字列 |

#### 2. ワークフロー設定
`.github/workflows/production-deploy.yml` を作成（既存のファイルを参考に）

---

## ✅ 本番切り替えチェックリスト

### 切り替え前確認
- [ ] すべてのAzureリソースが作成済み
- [ ] データベースマイグレーション完了
- [ ] 環境変数設定完了
- [ ] SSL証明書設定完了
- [ ] DNSレコード設定準備完了
- [ ] バックアップ取得完了

### Shopify設定更新
- [ ] App URL更新: `https://ec-ranger.jp`
- [ ] Allowed redirection URLs更新
- [ ] Webhook URL更新
- [ ] GDPR webhook URLs更新

### 動作確認
- [ ] OAuth認証フロー
- [ ] データ同期機能
- [ ] ダッシュボード表示
- [ ] 分析機能
- [ ] エラーログ確認

---

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 1. CORS エラー
```bash
az webapp cors add \
  --name ec-ranger-api-prod \
  --resource-group ec-ranger-prod-rg \
  --allowed-origins https://ec-ranger.jp
```

#### 2. データベース接続エラー
- ファイアウォール設定確認
- 接続文字列の確認
- SQL Server認証が有効か確認

#### 3. 環境変数が反映されない
```bash
# App Service再起動
az webapp restart \
  --name ec-ranger-api-prod \
  --resource-group ec-ranger-prod-rg
```

---

## 📞 サポート連絡先

問題が発生した場合：
1. Kenjiに連絡（プロジェクトマネージャー）
2. Takashiに連絡（バックエンド技術サポート）
3. Yukiに連絡（フロントエンド技術サポート）

---

## 📚 参考資料

- [Azure SQL Database ドキュメント](https://docs.microsoft.com/azure/sql-database/)
- [Azure App Service ドキュメント](https://docs.microsoft.com/azure/app-service/)
- [Azure Static Web Apps ドキュメント](https://docs.microsoft.com/azure/static-web-apps/)
- [Shopify App Requirements](https://shopify.dev/apps/requirements)

---

**最終更新**: 2025年8月12日 14:00  
**次回レビュー**: 本番環境構築完了後