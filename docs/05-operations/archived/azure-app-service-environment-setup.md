# Azure App Service環境分離設定ガイド

## 概要
Azure App Serviceで環境別の設定を管理し、適切な環境変数を設定する方法について説明します。

## 環境別の設定ファイル

### 1. appsettings.json（基本設定）
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:shopify-test-server.database.windows.net,1433;Initial Catalog=shopify-test-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyTest2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  },
  "ApplicationInsights": {
    "ConnectionString": "",
    "InstrumentationKey": ""
  },
  "PerformanceMonitoring": {
    "SlowOperationThresholdMs": 1000,
    "CriticalOperationThresholdMs": 5000
  },
  "DormancyThresholdDays": 90,
  "Cors": {
    "AllowedOrigins": [
      "https://brave-sea-038f17a00.1.azurestaticapps.net",
      "https://localhost:3000",
      "http://localhost:3000"
    ]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning",
      "ShopifyTestApi": "Information"
    }
  },
  "AllowedHosts": "*"
}
```

### 2. appsettings.Production.json（本番環境）
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:shopify-production-server.database.windows.net,1433;Initial Catalog=shopify-production-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyProduction2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://shopify-ai-marketing-suite.vercel.app",
      "https://shopify-ai-marketing-suite-git-main.vercel.app",
      "https://shopify-ai-marketing-suite-git-staging.vercel.app"
    ]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning",
      "ShopifyTestApi": "Information"
    }
  }
}
```

### 3. appsettings.Staging.json（ステージング環境）
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:shopify-staging-server.database.windows.net,1433;Initial Catalog=shopify-staging-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyStaging2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://shopify-ai-marketing-suite-git-staging.vercel.app",
      "https://shopify-ai-marketing-suite-git-develop.vercel.app",
      "https://localhost:3000",
      "http://localhost:3000"
    ]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning",
      "ShopifyTestApi": "Information"
    }
  }
}
```

### 4. appsettings.Development.json（開発環境）
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:shopify-test-server.database.windows.net,1433;Initial Catalog=shopify-test-db;Persist Security Info=False;User ID=sqladmin;Password=ShopifyTest2025!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://brave-sea-038f17a00.1.azurestaticapps.net",
      "https://localhost:3000",
      "http://localhost:3000"
    ]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information",
      "Microsoft.EntityFrameworkCore": "Information",
      "ShopifyTestApi": "Debug"
    }
  }
}
```

## Azure App Serviceでの環境変数設定

### 1. Production環境（shopifyapp-backend-production）

**Azure Portal設定**:
1. Azure Portal → App Service → shopifyapp-backend-production
2. Settings → Configuration → Application settings

**環境変数設定**:
```
ASPNETCORE_ENVIRONMENT = Production
ASPNETCORE_URLS = https://+:443;http://+:80
WEBSITE_RUN_FROM_PACKAGE = 1
```

### 2. Staging環境（shopifyapp-backend-staging）

**Azure Portal設定**:
1. Azure Portal → App Service → shopifyapp-backend-staging
2. Settings → Configuration → Application settings

**環境変数設定**:
```
ASPNETCORE_ENVIRONMENT = Staging
ASPNETCORE_URLS = https://+:443;http://+:80
WEBSITE_RUN_FROM_PACKAGE = 1
```

### 3. Development環境（shopifyapp-backend-develop）

**Azure Portal設定**:
1. Azure Portal → App Service → shopifyapp-backend-develop
2. Settings → Configuration → Application settings

**環境変数設定**:
```
ASPNETCORE_ENVIRONMENT = Development
ASPNETCORE_URLS = https://+:443;http://+:80
WEBSITE_RUN_FROM_PACKAGE = 1
```

## 環境別の動作

### 設定ファイルの読み込み順序

1. **appsettings.json**（基本設定）
2. **appsettings.{Environment}.json**（環境別設定）
3. **環境変数**（Azure App Service設定）
4. **コマンドライン引数**

### 環境別の特徴

| 環境 | ASPNETCORE_ENVIRONMENT | データベース | ログレベル | CORS設定 |
|------|----------------------|------------|----------|----------|
| Production | Production | shopify-production-db | Information | 本番フロントエンドのみ |
| Staging | Staging | shopify-staging-db | Information | ステージング・開発フロントエンド |
| Development | Development | shopify-test-db | Debug | ローカル開発環境 |

## セキュリティ設定

### 1. 接続文字列の管理
- 本番環境の接続文字列はAzure Key Vaultで管理
- ステージング・開発環境はApp Service設定で管理

### 2. CORS設定
- 各環境で許可するオリジンを制限
- 本番環境は本番フロントエンドのみ許可

### 3. ログ設定
- 本番環境：Application Insights使用
- ステージング・開発環境：ファイルログ使用

## デプロイ設定

### GitHub Actionsでの環境変数設定

```yaml
- name: Deploy to Azure Web App (Production)
  uses: azure/webapps-deploy@v3
  with:
    app-name: 'shopifyapp-backend-production'
    publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE_PRODUCTION }}
    package: .
  env:
    ASPNETCORE_ENVIRONMENT: Production
```

## トラブルシューティング

### よくある問題

1. **環境変数が読み込まれない**
   - ASPNETCORE_ENVIRONMENTが正しく設定されているか確認
   - App Service設定で環境変数が保存されているか確認

2. **設定ファイルが適用されない**
   - ファイル名が正確か確認（appsettings.Production.json等）
   - デプロイ時にファイルが含まれているか確認

3. **CORSエラーが発生**
   - 各環境のCORS設定を確認
   - フロントエンドのURLが許可リストに含まれているか確認

## ベストプラクティス

### 1. 環境分離
- 各環境で独立したデータベースを使用
- 環境別のログ設定
- 環境別のCORS設定

### 2. セキュリティ
- 本番環境の接続文字列はKey Vaultで管理
- 環境別のアクセス制御
- 定期的なセキュリティ監査

### 3. 監視
- 環境別のログ監視
- パフォーマンス監視
- エラー通知の設定 