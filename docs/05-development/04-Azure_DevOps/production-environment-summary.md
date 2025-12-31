# 本番環境構成サマリー

## 作成日: 2025-12-22
## 最終更新: 2025-12-31

## Azure リソース構成

### 1. フロントエンド（Static Web Apps）

#### Production1: EC Ranger（公開アプリ）
- **リソース名**: ec-ranger-frontend-prod-1
- **アプリ名**: EC Ranger
- **URL**: https://white-island-08e0a6300.2.azurestaticapps.net
- **カスタムドメイン**: https://ec-ranger.access-net.co.jp
- **リージョン**: Japan East
- **プラン**: Standard
- **デプロイ方法**: GitHub Actions
- **種別**: 公開アプリ

#### Production2: EC Ranger-xn-fbkq6e5da0fpb（カスタムアプリ）
- **リソース名**: ec-ranger-frontend-prod-2
- **アプリ名**: EC Ranger-xn-fbkq6e5da0fpb
- **URL**: https://black-flower-004e1de00.2.azurestaticapps.net
- **リージョン**: Japan East
- **プラン**: Standard
- **デプロイ方法**: GitHub Actions
- **種別**: カスタムアプリ

#### Production3: EC Ranger-demo（カスタムアプリ）
- **リソース名**: ec-ranger-frontend-prod-3
- **アプリ名**: EC Ranger-demo
- **URL**: https://ashy-plant-01b5c4100.1.azurestaticapps.net
- **リージョン**: Japan East
- **プラン**: Standard
- **デプロイ方法**: GitHub Actions
- **種別**: カスタムアプリ

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
| Authentication__Shopify__ClientId | [各環境のShopify API Key] |
| Authentication__Shopify__ClientSecret | [GitHub Secrets: SHOPIFY_API_SECRET_PRODUCTION] |
| FrontendUrls__PrimaryUrl | https://ec-ranger.access-net.co.jp（Production1のカスタムドメイン） |
| ASPNETCORE_ENVIRONMENT | Production |

### フロントエンド（Static Web Apps）

#### Production1: EC Ranger（公開アプリ）
| 変数名 | 値 |
|--------|-----|
| NEXT_PUBLIC_API_URL | https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net |
| NEXT_PUBLIC_SHOPIFY_API_KEY | b95377afd35e5c8f4b28d286d3ff3491 |
| NEXT_PUBLIC_SHOPIFY_APP_URL | https://ec-ranger.access-net.co.jp |
| NEXT_PUBLIC_ENVIRONMENT | production |

#### Production2: EC Ranger-xn-fbkq6e5da0fpb
| 変数名 | 値 |
|--------|-----|
| NEXT_PUBLIC_API_URL | https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net |
| NEXT_PUBLIC_SHOPIFY_API_KEY | 706a757915dedce54806c0a179bee05d |
| NEXT_PUBLIC_SHOPIFY_APP_URL | https://black-flower-004e1de00.2.azurestaticapps.net |
| NEXT_PUBLIC_ENVIRONMENT | production |

#### Production3: EC Ranger-demo
| 変数名 | 値 |
|--------|-----|
| NEXT_PUBLIC_API_URL | https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net |
| NEXT_PUBLIC_SHOPIFY_API_KEY | 23f81e22074df1b71fb0a5a495778f49 |
| NEXT_PUBLIC_SHOPIFY_APP_URL | https://ashy-plant-01b5c4100.1.azurestaticapps.net |
| NEXT_PUBLIC_ENVIRONMENT | production |

## GitHub Secrets設定（必要）

### Production1: EC Ranger（公開アプリ）
| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION | App Service発行プロファイル | Azure Portal → App Service → 発行プロファイルの取得 |
| AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1 | Static Web Appsトークン（Production1） | Azure Portal → Static Web Apps → デプロイトークン |
| SHOPIFY_API_KEY_PRODUCTION | Shopify API Key（Production1） | b95377afd35e5c8f4b28d286d3ff3491 |
| SHOPIFY_API_SECRET_PRODUCTION | Shopify API Secret（Production1） | Shopify Partners Dashboard → EC Ranger → Secret |

### Production2: EC Ranger-xn-fbkq6e5da0fpb
| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2 | Static Web Appsトークン（Production2） | Azure Portal → Static Web Apps → デプロイトークン |
| SHOPIFY_API_KEY_PRODUCTION_2 | Shopify API Key（Production2） | 706a757915dedce54806c0a179bee05d |
| SHOPIFY_API_SECRET_PRODUCTION_2 | Shopify API Secret（Production2） | Shopify Partners Dashboard → EC Ranger-xn-fbkq6e5da0fpb → Secret |

### Production3: EC Ranger-demo
| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3 | Static Web Appsトークン（Production3） | Azure Portal → Static Web Apps → デプロイトークン |
| SHOPIFY_API_KEY_PRODUCTION_3 | Shopify API Key（Production3） | 23f81e22074df1b71fb0a5a495778f49 |
| SHOPIFY_API_SECRET_PRODUCTION_3 | Shopify API Secret（Production3） | Shopify Partners Dashboard → EC Ranger-demo → Secret |

**詳細**: 
- [Production3 GitHub Secrets設定手順](./Static_Web_Apps/production3-github-secrets-setup.md)
- [GitHub Secrets命名規則](./github-secrets-naming-convention.md)

## ワークフロー設定状況

### 作成済みワークフロー
- ✅ `.github/workflows/production_backend.yml` - バックエンド単体デプロイ
- ✅ `.github/workflows/production_frontend.yml` - フロントエンド単体デプロイ
- ✅ `.github/workflows/production_deploy_all.yml` - 全体デプロイ

### URL更新状況
- ✅ Production1: EC Ranger-xn-fbkq6e5da0fpb (black-flower) - 更新完了
- ✅ Production2: EC Ranger-demo (ashy-plant) - 更新完了
- ✅ Production3: EC Ranger (white-island) - 更新完了、カスタムドメイン設定済み

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

## 環境整理サマリー

3環境の整理内容については、以下のドキュメントを参照してください：

- [本番環境フロントエンド 環境整理サマリー](./production-environments-overview.md)

## ShopifyAppsテーブル登録

本番環境3環境のShopify Client IDをShopifyAppsテーブルに登録する必要があります。

### 登録スクリプト
- **2025-12-31-UpdateShopifyAppsProductionEnvironments.sql**
  - 場所: `docs/05-development/03-データベース/マイグレーション/2025-12-31-UpdateShopifyAppsProductionEnvironments.sql`
  - 内容: 3環境のClient IDを登録・更新（UPSERT処理）
  - **重要**: ApiSecretは手動で更新が必要（GitHub Secretsから取得）

### 登録内容
| 環境 | アプリ名 | Client ID | AppType | AppUrl |
|------|---------|-----------|---------|--------|
| Production1 | EC Ranger | b95377afd35e5c8f4b28d286d3ff3491 | Public | https://ec-ranger.access-net.co.jp |
| Production2 | EC Ranger-xn-fbkq6e5da0fpb | 706a757915dedce54806c0a179bee05d | Custom | https://black-flower-004e1de00.2.azurestaticapps.net |
| Production3 | EC Ranger-demo | 23f81e22074df1b71fb0a5a495778f49 | Custom | https://ashy-plant-01b5c4100.1.azurestaticapps.net |

詳細は [データベースマイグレーション管理](../03-データベース/マイグレーション/database-migration-tracking.md) を参照してください。

## Production3 セットアップ手順

Production3環境のセットアップについては、以下のドキュメントを参照してください：

1. [Production3 Static Web Apps セットアップ手順](./Static_Web_Apps/production3-static-web-app-setup.md)
2. [Production3 GitHub Secrets設定手順](./Static_Web_Apps/production3-github-secrets-setup.md)

---
作成者: 福田＋AI Assistant
作成日: 2025-12-22
最終更新: 2025-12-31