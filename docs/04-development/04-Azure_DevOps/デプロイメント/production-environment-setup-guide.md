# 本番環境構築・設定ガイド

**作成日**: 2025年8月12日  
**作成者**: Takashi（バックエンドエンジニア）  
**対象**: Shopify AIマーケティングスイート 本番環境  

## 概要

本ドキュメントは、Shopify AIマーケティングスイートの本番環境構築手順と設定方法をまとめたものです。

## アーキテクチャ構成

### リソース構成
```
Azure Resource Group: shopify-production-rg
├── App Service: shopify-backend-prod
├── Static Web App: shopify-frontend-prod  
├── SQL Database: shopify-prod-db
├── Key Vault: shopify-keyvault-prod
├── Application Insights: shopify-insights-prod
└── Storage Account: shopifystorageprod
```

## 1. Azure リソース作成

### Resource Group
```bash
az group create \
  --name shopify-production-rg \
  --location "East Asia"
```

### SQL Database
```bash
az sql server create \
  --name shopify-prod-server \
  --resource-group shopify-production-rg \
  --location "East Asia" \
  --admin-user sqladmin \
  --admin-password [SECURE_PASSWORD]

az sql db create \
  --resource-group shopify-production-rg \
  --server shopify-prod-server \
  --name shopify-prod-db \
  --service-objective S0 \
  --backup-storage-redundancy Zone
```

### App Service
```bash
az appservice plan create \
  --name shopify-prod-plan \
  --resource-group shopify-production-rg \
  --sku B1 \
  --is-linux

az webapp create \
  --name shopify-backend-prod \
  --resource-group shopify-production-rg \
  --plan shopify-prod-plan \
  --runtime "DOTNETCORE:8.0"
```

### Key Vault
```bash
az keyvault create \
  --name shopify-keyvault-prod \
  --resource-group shopify-production-rg \
  --location "East Asia" \
  --sku standard
```

### Application Insights
```bash
az monitor app-insights component create \
  --app shopify-insights-prod \
  --location "East Asia" \
  --resource-group shopify-production-rg \
  --application-type web
```

## 2. 環境変数設定

### 必須環境変数

#### App Service Application Settings
```bash
az webapp config appsettings set \
  --resource-group shopify-production-rg \
  --name shopify-backend-prod \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    WEBSITE_HTTPLOGGING_RETENTION_DAYS=7 \
    WEBSITE_TIME_ZONE="Tokyo Standard Time" \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
```

#### 接続文字列
```bash
az webapp config connection-string set \
  --resource-group shopify-production-rg \
  --name shopify-backend-prod \
  --connection-string-type SQLAzure \
  --settings DefaultConnection="Server=tcp:shopify-prod-server.database.windows.net,1433;Initial Catalog=shopify-prod-db;Persist Security Info=False;User ID=sqladmin;Password=[PASSWORD];MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
```

### Key Vault シークレット設定

```bash
# Shopify API認証情報
az keyvault secret set \
  --vault-name shopify-keyvault-prod \
  --name "Shopify--ApiKey" \
  --value "[SHOPIFY_API_KEY]"

az keyvault secret set \
  --vault-name shopify-keyvault-prod \
  --name "Shopify--ApiSecret" \
  --value "[SHOPIFY_API_SECRET]"

az keyvault secret set \
  --vault-name shopify-keyvault-prod \
  --name "Shopify--WebhookSecret" \
  --value "[WEBHOOK_SECRET]"

# JWT設定
az keyvault secret set \
  --vault-name shopify-keyvault-prod \
  --name "Jwt--Key" \
  --value "[GENERATED_JWT_SECRET_256BIT]"

# Application Insights
az keyvault secret set \
  --vault-name shopify-keyvault-prod \
  --name "ApplicationInsights--ConnectionString" \
  --value "[APPINSIGHTS_CONNECTION_STRING]"
```

### Managed Identity設定

```bash
# Managed Identityを有効化
az webapp identity assign \
  --resource-group shopify-production-rg \
  --name shopify-backend-prod

# Key Vaultアクセス権限付与
az keyvault set-policy \
  --name shopify-keyvault-prod \
  --object-id [WEBAPP_PRINCIPAL_ID] \
  --secret-permissions get list
```

## 3. アプリケーション設定ファイル

### appsettings.Production.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "ApplicationInsights": {
    "ConnectionString": ""
  },
  "Shopify": {
    "ApiKey": "",
    "ApiSecret": "",
    "WebhookSecret": "",
    "Scopes": "read_orders,read_products,read_customers,write_products",
    "RateLimit": {
      "MaxRetries": 3,
      "RetryDelaySeconds": 2,
      "MaxRequestsPerSecond": 2
    },
    "Frontend": {
      "BaseUrl": "https://shopify-frontend-prod.azurestaticapps.net"
    }
  },
  "Jwt": {
    "Key": "",
    "Issuer": "shopify-ai-suite",
    "Audience": "shopify-stores",
    "ExpiryMinutes": 60
  },
  "HangFire": {
    "DashboardPath": "/hangfire",
    "RequireAuth": true,
    "Workers": 2,
    "Queues": ["default", "sync", "critical"]
  },
  "Cors": {
    "AllowedOrigins": [
      "https://shopify-frontend-prod.azurestaticapps.net",
      "https://*.myshopify.com"
    ]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning",
      "Hangfire": "Warning"
    }
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "System": "Warning",
        "Hangfire": "Warning"
      }
    },
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "ApplicationInsights",
        "Args": {
          "connectionString": "",
          "telemetryConverter": "Serilog.Sinks.ApplicationInsights.TelemetryConverters.TraceTelemetryConverter, Serilog.Sinks.ApplicationInsights"
        }
      }
    ]
  },
  "PerformanceMonitoring": {
    "SlowOperationThresholdMs": 5000,
    "CriticalOperationThresholdMs": 10000
  },
  "DormancyThresholdDays": 90
}
```

## 4. データベース設定

### マイグレーション実行

```bash
# 本番データベースにマイグレーション適用
dotnet ef database update \
  --connection "Server=tcp:shopify-prod-server.database.windows.net,1433;Initial Catalog=shopify-prod-db;User ID=sqladmin;Password=[PASSWORD];Encrypt=True;" \
  --project ShopifyAnalyticsApi \
  --startup-project ShopifyAnalyticsApi
```

### 手動マイグレーション実行

```sql
-- 2025-08-02-EmergencyIndexes.sql
-- 2025-08-05-AddInitialSetupFeature.sql
-- 順次実行
```

### データベース設定最適化

```sql
-- 接続プール設定
ALTER DATABASE [shopify-prod-db] SET AUTO_CLOSE OFF;
ALTER DATABASE [shopify-prod-db] SET AUTO_SHRINK OFF;

-- パフォーマンスレベル設定（必要に応じて）
ALTER DATABASE [shopify-prod-db] MODIFY (SERVICE_OBJECTIVE = 'S1');
```

## 5. セキュリティ設定

### ファイアウォール設定

```bash
# Azure Servicesからのアクセス許可
az sql server firewall-rule create \
  --resource-group shopify-production-rg \
  --server shopify-prod-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 必要に応じて特定IPアドレスからのアクセス許可
az sql server firewall-rule create \
  --resource-group shopify-production-rg \
  --server shopify-prod-server \
  --name AllowManagementAccess \
  --start-ip-address [YOUR_IP] \
  --end-ip-address [YOUR_IP]
```

### HTTPS設定

```bash
# HTTPS強制
az webapp config set \
  --resource-group shopify-production-rg \
  --name shopify-backend-prod \
  --https-only true

# カスタムドメイン設定（オプション）
az webapp config hostname add \
  --resource-group shopify-production-rg \
  --webapp-name shopify-backend-prod \
  --hostname api.yourdomain.com
```

## 6. デプロイ設定

### GitHub Actions設定

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '8.0.x'
    
    - name: Restore dependencies
      run: dotnet restore backend/ShopifyAnalyticsApi
    
    - name: Build
      run: dotnet build backend/ShopifyAnalyticsApi --no-restore --configuration Release
    
    - name: Test
      run: dotnet test backend/ShopifyAnalyticsApi.Tests --no-build --configuration Release
    
    - name: Publish
      run: dotnet publish backend/ShopifyAnalyticsApi --no-build --configuration Release --output ./publish
    
    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: shopify-backend-prod
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: ./publish
```

### ヘルスチェック設定

```bash
# App Service ヘルスチェック
az webapp config set \
  --resource-group shopify-production-rg \
  --name shopify-backend-prod \
  --health-check-path "/health"
```

## 7. 監視・アラート設定

### Application Insights設定

```bash
# パフォーマンスカウンター有効化
az webapp config appsettings set \
  --resource-group shopify-production-rg \
  --name shopify-backend-prod \
  --settings \
    APPINSIGHTS_PROFILERFEATURE_VERSION=1.0.0 \
    APPINSIGHTS_SNAPSHOTFEATURE_VERSION=1.0.0
```

### アラートルール設定

```bash
# 高CPU使用率アラート
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group shopify-production-rg \
  --scopes "/subscriptions/[SUBSCRIPTION_ID]/resourceGroups/shopify-production-rg/providers/Microsoft.Web/sites/shopify-backend-prod" \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m

# 高エラー率アラート
az monitor metrics alert create \
  --name "High Error Rate" \
  --resource-group shopify-production-rg \
  --scopes "/subscriptions/[SUBSCRIPTION_ID]/resourceGroups/shopify-production-rg/providers/Microsoft.Web/sites/shopify-backend-prod" \
  --condition "avg Http5xx > 5" \
  --window-size 5m \
  --evaluation-frequency 1m
```

## 8. バックアップ設定

### データベースバックアップ

```bash
# 自動バックアップ設定（既定で有効）
az sql db show \
  --resource-group shopify-production-rg \
  --server shopify-prod-server \
  --name shopify-prod-db \
  --query "earliestRestoreDate"
```

### App Service バックアップ

```bash
# Storage Account作成（バックアップ用）
az storage account create \
  --name shopifybackupstorage \
  --resource-group shopify-production-rg \
  --sku Standard_LRS

# 自動バックアップ設定
az webapp config backup update \
  --resource-group shopify-production-rg \
  --webapp-name shopify-backend-prod \
  --container-url "https://shopifybackupstorage.blob.core.windows.net/backups" \
  --frequency 1 \
  --frequency-unit Day \
  --retain-one true \
  --retention-period-in-days 30
```

## 9. コスト最適化

### 段階的スケーリング計画

| フェーズ | App Service | SQL Database | 月額概算 |
|---------|-------------|--------------|----------|
| **初期** | B1 (Basic) | S0 (10 DTU) | $70-80 |
| **成長期** | S1 (Standard) | S1 (20 DTU) | $120-140 |
| **拡張期** | P1v2 (Premium) | S2 (50 DTU) | $200-250 |

### 自動スケーリング設定

```bash
# CPU使用率ベースの自動スケーリング
az monitor autoscale create \
  --resource-group shopify-production-rg \
  --resource "/subscriptions/[SUBSCRIPTION_ID]/resourceGroups/shopify-production-rg/providers/Microsoft.Web/serverfarms/shopify-prod-plan" \
  --name "shopify-autoscale" \
  --min-count 1 \
  --max-count 3 \
  --count 1

# スケールアップルール
az monitor autoscale rule create \
  --resource-group shopify-production-rg \
  --autoscale-name "shopify-autoscale" \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1

# スケールダウンルール  
az monitor autoscale rule create \
  --resource-group shopify-production-rg \
  --autoscale-name "shopify-autoscale" \
  --condition "Percentage CPU < 30 avg 10m" \
  --scale in 1
```

## 10. 運用チェックリスト

### デプロイ前チェック
- [ ] すべてのシークレットがKey Vaultに格納済み
- [ ] データベースマイグレーション実行済み
- [ ] ヘルスチェックエンドポイント動作確認
- [ ] Shopify App設定更新（本番URL）
- [ ] CORS設定確認
- [ ] SSL証明書設定済み

### デプロイ後チェック
- [ ] アプリケーション起動確認
- [ ] データベース接続確認
- [ ] Shopify OAuth認証フロー確認
- [ ] データ同期機能動作確認
- [ ] HangFire Dashboard動作確認
- [ ] Application Insights データ取得確認

### セキュリティチェック
- [ ] 不要なファイアウォールルール削除
- [ ] Key Vaultアクセス権限最小化
- [ ] Application Insightsでの機密データ除外設定
- [ ] ログレベル本番用に調整

## 11. 障害対応

### ロールバック手順

```bash
# 前バージョンへのロールバック
az webapp deployment slot swap \
  --resource-group shopify-production-rg \
  --name shopify-backend-prod \
  --slot staging \
  --target-slot production
```

### データベース復旧

```bash
# ポイントインタイム復旧
az sql db restore \
  --resource-group shopify-production-rg \
  --server shopify-prod-server \
  --name shopify-prod-db-restored \
  --source-database shopify-prod-db \
  --time "2025-08-12T10:00:00"
```

## サポート連絡先

- **技術責任者**: Takashi (takashi@company.com)
- **プロジェクト管理**: Kenji (kenji@company.com)  
- **Azure技術サポート**: [Azureサポートプラン]
- **緊急連絡**: [緊急連絡先]

---

**ドキュメント更新**: 2025年8月12日  
**次回レビュー**: 本番デプロイ後1週間  
**承認者**: 福田様