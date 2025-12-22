# 本番環境構成サマリー

## 作成日: 2025-12-22

## Azure リソース構成

### 1. フロントエンド（Static Web Apps）
- **リソース名**: ec-ranger-frontend-prod
- **URL**: https://white-island-08e0a6300-2.azurestaticapps.net
- **リージョン**: Japan East
- **プラン**: Standard
- **デプロイ方法**: GitHub Actions

### 2. バックエンド（App Service）
- **リソース名**: ec-ranger-backend-prod
- **URL**: https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net
- **リージョン**: Japan West
- **プラン**: Free (F1) - ※後でBasic B1にアップグレード予定
- **ランタイム**: .NET 8.0
- **OS**: Windows

### 3. データベース（SQL Database）
- **サーバー名**: ec-ranger-sql-prod
- **データベース名**: ec-ranger-db-prod
- **リージョン**: Japan East
- **DTU**: Standard S1: 20 DTU
- **接続文字列形式**: `ec-ranger-sql-prod.database.windows.net`
- **認証**: SQL認証

## Shopify API認証情報

### API キー（Client ID）
```
be1fc09e2135be7cee3b9186ef8bfe80
```

### API シークレット（Client Secret）
```
[Azure Key Vault または GitHub Secrets に保存]
```

## 必要な環境変数設定

### バックエンド（App Service）
| 変数名 | 値 |
|--------|-----|
| ConnectionStrings__DefaultConnection | Server=ec-ranger-sql-prod.database.windows.net;Database=ec-ranger-db-prod;User Id=xxx;Password=xxx |
| Authentication__Shopify__ClientId | be1fc09e2135be7cee3b9186ef8bfe80 |
| Authentication__Shopify__ClientSecret | [GitHub Secrets: SHOPIFY_API_SECRET_PRODUCTION] |
| FrontendUrls__PrimaryUrl | https://white-island-08e0a6300-2.azurestaticapps.net |
| ASPNETCORE_ENVIRONMENT | Production |

### フロントエンド（Static Web Apps）
| 変数名 | 値 |
|--------|-----|
| NEXT_PUBLIC_API_URL | https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net |
| NEXT_PUBLIC_SHOPIFY_API_KEY | be1fc09e2135be7cee3b9186ef8bfe80 |
| NEXT_PUBLIC_SHOPIFY_APP_URL | https://white-island-08e0a6300-2.azurestaticapps.net |
| NEXT_PUBLIC_ENVIRONMENT | production |

## GitHub Secrets設定（必要）

| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION | App Service発行プロファイル | Azure Portal → App Service → 発行プロファイルの取得 |
| AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION | Static Web Appsトークン | Azure Portal → Static Web Apps → デプロイトークン |
| SHOPIFY_API_KEY_PRODUCTION | Shopify API Key | be1fc09e2135be7cee3b9186ef8bfe80 |
| SHOPIFY_API_SECRET_PRODUCTION | Shopify API Secret | [メモから取得] |

## ワークフロー設定状況

### 作成済みワークフロー
- ✅ `.github/workflows/production_backend.yml` - バックエンド単体デプロイ
- ✅ `.github/workflows/production_frontend.yml` - フロントエンド単体デプロイ
- ✅ `.github/workflows/production_deploy_all.yml` - 全体デプロイ

### URL更新状況
- ✅ 実際のAzure URLに更新完了

## 次のステップ

1. **App Serviceの環境変数設定**
   - Azure Portal → App Service → 構成で環境変数を設定

2. **Static Web Appsの環境変数設定**
   - Azure Portal → Static Web Apps → 構成で環境変数を設定

3. **GitHub Secrets設定**
   - 発行プロファイル取得・設定
   - デプロイトークン取得・設定

4. **データベースマイグレーション実行**
   - 開発環境のスキーマを本番環境に適用

5. **Shopify Partners設定**
   - アプリURLとコールバックURLの設定

6. **デプロイ実行**
   - GitHub Actions経由でデプロイ

7. **App Serviceプランアップグレード**
   - Free F1 → Basic B1へ（パフォーマンス向上のため）

## 注意事項

- App Serviceは現在Free (F1)プランのため、制限があります
  - カスタムドメイン使用不可
  - SSL証明書設定不可
  - 1日60分のCPU時間制限
- 本番運用前にBasic B1以上にアップグレードを推奨

---
作成者: 福田＋AI Assistant
作成日: 2025-12-22
