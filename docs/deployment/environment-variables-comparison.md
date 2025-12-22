# 環境変数設定比較表

## 現状の環境変数設定状況

### フロントエンド (Static Web Apps)

#### 1. Azure Portal側の環境変数（画像から確認）
| 変数名 | 値の表示 | 説明 |
|--------|----------|------|
| NEXT_PUBLIC_API_URL | 値を表示する | バックエンドAPI URL |
| NEXT_PUBLIC_BACKEND_URL | 値を表示する | バックエンドURL（重複？） |
| NEXT_PUBLIC_BUILD_NUMBER | 値を表示する | ビルド番号 |
| NEXT_PUBLIC_DISABLE_FEATURE_GATES | 値を表示する | 機能フラグ |
| NEXT_PUBLIC_FRONTEND_URL | 値を表示する | フロントエンドURL |
| NEXT_PUBLIC_SHOPIFY_API_KEY | 値を表示する | Shopify API Key |
| SHOPIFY_API_SECRET | 値を表示する | Shopify API Secret |

#### 2. GitHub Environment Variables（画像から確認）
| 変数名 | 値 | 最終更新 |
|--------|-----|----------|
| NEXT_PUBLIC_API_URL | https://shopifytestapi20250720173320-aed5b... | 2 months ago |
| NEXT_PUBLIC_DEV_PASSWORD | dev2025 | 2 months ago |
| NEXT_PUBLIC_DISABLE_FEATURE_GATES | true | 2 months ago |
| NEXT_PUBLIC_SHOPIFY_API_KEY | 2d7e0e1f5da14eb9d299aa746738e44b | 2 months ago |
| NEXT_PUBLIC_SHOPIFY_APP_URL | https://brave-sea-038f17a00-staging.eastasia... | 2 months ago |
| NEXT_PUBLIC_USE_HTTPS | true | 2 months ago |

#### 3. GitHub Actions Workflow（develop_frontend.yml）
```yaml
env:
  NEXT_PUBLIC_ENVIRONMENT: ${{ steps.env.outputs.next_public_environment }}
  NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
  NEXT_PUBLIC_SHOPIFY_API_KEY: ${{ vars.NEXT_PUBLIC_SHOPIFY_API_KEY }}
  NEXT_PUBLIC_SHOPIFY_APP_URL: ${{ vars.NEXT_PUBLIC_SHOPIFY_APP_URL }}
  NEXT_PUBLIC_USE_HTTPS: ${{ vars.NEXT_PUBLIC_USE_HTTPS }}
  NEXT_PUBLIC_DISABLE_FEATURE_GATES: ${{ vars.NEXT_PUBLIC_DISABLE_FEATURE_GATES }}
  NEXT_PUBLIC_DEV_PASSWORD: ${{ secrets.NEXT_PUBLIC_DEV_PASSWORD }}
```

## 環境変数の重複と問題点

### 1. 重複している変数
- **NEXT_PUBLIC_API_URL** - Azure PortalとGitHub両方に存在
- **NEXT_PUBLIC_SHOPIFY_API_KEY** - Azure PortalとGitHub両方に存在
- **NEXT_PUBLIC_DISABLE_FEATURE_GATES** - Azure PortalとGitHub両方に存在

### 2. 不要または重複の可能性がある変数
- **NEXT_PUBLIC_BACKEND_URL** vs **NEXT_PUBLIC_API_URL** - 同じ目的？
- **NEXT_PUBLIC_FRONTEND_URL** vs **NEXT_PUBLIC_SHOPIFY_APP_URL** - 同じ目的？

### 3. Secretとして扱うべき変数
- **SHOPIFY_API_SECRET** - Azure Portalに表示されているが、Secretとして扱うべき

## 推奨される環境変数設定

### 本番環境用（Production）

#### Static Web Apps（フロントエンド）
| 変数名 | 設定場所 | 値 | 説明 |
|--------|----------|-----|------|
| NEXT_PUBLIC_API_URL | Azure Portal | https://ec-ranger-backend-prod-ghf3bbargbc4hfgh.japanwest-01.azurewebsites.net | バックエンドAPI URL |
| NEXT_PUBLIC_SHOPIFY_API_KEY | Azure Portal | be1fc09e2135be7cee3b9186ef8bfe80 | Shopify API Key（公開可） |
| NEXT_PUBLIC_SHOPIFY_APP_URL | Azure Portal | https://white-island-08e0a6300-2.azurestaticapps.net | アプリのURL |
| NEXT_PUBLIC_ENVIRONMENT | Azure Portal | production | 環境識別子 |
| NEXT_PUBLIC_DISABLE_FEATURE_GATES | Azure Portal | false | 機能フラグ（本番はfalse） |

#### App Service（バックエンド）
| 変数名 | 設定場所 | 値 | 説明 |
|--------|----------|-----|------|
| ConnectionStrings__DefaultConnection | Azure Portal | [接続文字列] | DB接続文字列 |
| Authentication__Shopify__ClientId | Azure Portal | be1fc09e2135be7cee3b9186ef8bfe80 | Shopify API Key |
| Authentication__Shopify__ClientSecret | Azure Portal | [シークレット] | Shopify API Secret |
| FrontendUrls__PrimaryUrl | Azure Portal | https://white-island-08e0a6300-2.azurestaticapps.net | フロントエンドURL |
| ASPNETCORE_ENVIRONMENT | Azure Portal | Production | ASP.NET環境 |

### GitHub Secrets/Variables（CI/CD用）

#### Secrets（機密情報）
| 名前 | 用途 |
|------|------|
| AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION | App Service発行プロファイル |
| AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION | Static Web Appsデプロイトークン |
| SHOPIFY_API_SECRET_PRODUCTION | Shopify API Secret |

#### Variables（公開可能）
| 名前 | 値 |
|------|-----|
| SHOPIFY_API_KEY_PRODUCTION | be1fc09e2135be7cee3b9186ef8bfe80 |

## 設定の優先順位

1. **Azure Portal設定** - 実行時の環境変数として最優先
2. **GitHub Actions環境変数** - ビルド時のみ使用
3. **コード内のデフォルト値** - フォールバック用

## クリーンアップ推奨事項

### 削除候補
1. **NEXT_PUBLIC_BACKEND_URL** - NEXT_PUBLIC_API_URLと重複
2. **NEXT_PUBLIC_FRONTEND_URL** - NEXT_PUBLIC_SHOPIFY_APP_URLで統一
3. **NEXT_PUBLIC_BUILD_NUMBER** - CI/CDで自動生成すべき
4. **NEXT_PUBLIC_DEV_PASSWORD** - 本番環境では不要

### 移行推奨
1. **SHOPIFY_API_SECRET** - Azure PortalからGitHub Secretsへ移行（セキュリティ向上）

## 次のステップ

1. **Azure Portal（本番環境）で設定すべき変数**
   - Static Web Apps: 5個の環境変数
   - App Service: 5個の環境変数

2. **GitHub Secretsで設定すべき変数**
   - 3個のシークレット
   - 1個の変数

3. **クリーンアップ**
   - 重複・不要な環境変数の削除
   - 命名規則の統一

---
作成日: 2025-12-22
作成者: 福田＋AI Assistant
