# GitHub Environments設定ガイド

## 概要
GitHub Environmentsを使用して環境別にSecretsを管理し、適切な環境変数を設定する方法について説明します。

## GitHub Environmentsの利点

### 1. 環境分離
- 各環境（production、staging、development）で独立したSecrets管理
- 環境別の保護ルール設定
- デプロイ履歴の環境別管理

### 2. セキュリティ強化
- 環境別のアクセス制御
- 承認フローの設定
- 機密情報の環境別管理

## 環境設定

### production環境
**用途**: 本番環境へのデプロイ
**ブランチ**: `main`
**Azure App Service**: `shopifyapp-backend-production`
**Secrets設定**:
```
AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00 = [Azure Static Web Apps API Token]
AZUREAPPSERVICE_PUBLISHPROFILE_PRODUCTION = [Azure Portalから取得]
```

### staging環境
**用途**: ステージング環境へのデプロイ
**ブランチ**: `staging`
**Azure App Service**: `shopifyapp-backend-staging`
**Secrets設定**:
```
AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00 = [Azure Static Web Apps API Token]
AZUREAPPSERVICE_PUBLISHPROFILE_STAGING = [Azure Portalから取得]
```

### development環境
**用途**: 開発環境へのデプロイ
**ブランチ**: `develop`
**Azure App Service**: `shopifyapp-backend-develop`
**Secrets設定**:
```
AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00 = [Azure Static Web Apps API Token]
AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP = [Azure Portalから取得]
```

## 設定手順

### 1. 環境の作成・編集

1. **GitHubリポジトリにアクセス**
   ```
   https://github.com/[username]/shopify-ai-marketing-suite/settings/environments
   ```

2. **環境の作成**
   - "New environment" をクリック
   - 環境名を入力（production, staging, development）
   - "Configure environment" をクリック

3. **Secretsの設定**
   - "Secrets and variables" → "Secrets"タブ
   - "New repository secret" をクリック
   - 必要なSecretsを追加

4. **環境別の保護ルール設定**
   - "Protection rules"セクション
   - "Required reviewers"を設定（production環境のみ推奨）
   - "Wait timer"を設定（必要に応じて）

### 2. ワークフローファイルの設定

#### フロントエンド用
```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production  # 環境名を指定
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production')
    
    steps:
    # ... ビルドステップ
    - name: Build application
      env:
        NODE_ENV: production
        NEXT_PUBLIC_BUILD_ENVIRONMENT: production
        NEXT_PUBLIC_DEPLOY_ENVIRONMENT: production
        NEXT_PUBLIC_APP_ENVIRONMENT: production
      run: npm run build
```

#### バックエンド用
```yaml
jobs:
  deploy-production:
    runs-on: windows-latest
    needs: build
    environment: production  # 環境名を指定
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'production')
    
    steps:
    # ... デプロイステップ
    - name: Deploy to Azure Web App (production)
      uses: azure/webapps-deploy@v3
      with:
        app-name: 'shopifyapp-backend-production'
        publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE_PRODUCTION }}
        package: .
```

## 環境別の動作

### ブランチ別の自動切り替え

| ブランチ/イベント | 環境 | デプロイ先 | API接続先 |
|------------------|------|-----------|----------|
| `main` | production | 本番環境 | 本番API |
| `staging` | staging | ステージング環境 | ステージングAPI |
| `develop` | development | 開発環境 | 開発API |

### 環境変数の自動設定

#### フロントエンド用
```yaml
# mainブランチ → production環境
NODE_ENV: production
NEXT_PUBLIC_BUILD_ENVIRONMENT: production
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: production
NEXT_PUBLIC_APP_ENVIRONMENT: production

# stagingブランチ → staging環境
NODE_ENV: staging
NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: staging
NEXT_PUBLIC_APP_ENVIRONMENT: staging

# developブランチ → development環境
NODE_ENV: development
NEXT_PUBLIC_BUILD_ENVIRONMENT: development
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: development
NEXT_PUBLIC_APP_ENVIRONMENT: development
```

#### バックエンド用
```yaml
# mainブランチ → production環境
ASPNETCORE_ENVIRONMENT: Production
app-name: shopifyapp-backend-production
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_PRODUCTION

# stagingブランチ → staging環境
ASPNETCORE_ENVIRONMENT: Staging
app-name: shopifyapp-backend-staging
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_STAGING

# developブランチ → development環境
ASPNETCORE_ENVIRONMENT: Development
app-name: shopifyapp-backend-develop
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP
```

## 保護ルールの設定

### production環境の保護ルール
```
✅ Required reviewers: 1人以上
✅ Wait timer: 5分
✅ Deployment branches: mainブランチのみ
```

### staging環境の保護ルール
```
✅ Required reviewers: なし（自動デプロイ）
✅ Wait timer: なし
✅ Deployment branches: stagingブランチのみ
```

### development環境の保護ルール
```
✅ Required reviewers: なし（自動デプロイ）
✅ Wait timer: なし
✅ Deployment branches: developブランチのみ
```

## 必要なSecrets一覧

### 共通Secrets
| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` | Azure Static Web Apps API Token | Azure Portal → Static Web Apps → API Token |

### 環境別Secrets
| 環境 | Secret名 | 説明 | 取得方法 |
|------|----------|------|----------|
| production | `AZUREAPPSERVICE_PUBLISHPROFILE_PRODUCTION` | 本番環境のPublish Profile | Azure Portal → App Service → Get publish profile |
| staging | `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING` | ステージング環境のPublish Profile | Azure Portal → App Service → Get publish profile |
| development | `AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP` | 開発環境のPublish Profile | Azure Portal → App Service → Get publish profile |

## トラブルシューティング

### よくある問題

1. **環境が見つからない**
   - 環境名が正確に一致しているか確認
   - 大文字小文字に注意

2. **Secretsが読み込まれない**
   - 環境別のSecretsが正しく設定されているか確認
   - 環境名がワークフローファイルと一致しているか確認

3. **デプロイが承認待ちになる**
   - 保護ルールの設定を確認
   - 承認者の設定を確認

## ベストプラクティス

### 1. 環境分離
- production環境（本番）は必ず承認フローを設定
- staging環境（ステージング）は自動デプロイ
- development環境（開発）は自動デプロイ
- 手動実行で任意のブランチから任意の環境にデプロイ可能

### 2. セキュリティ
- 機密情報は必ずSecretsで管理
- 環境別に異なるpublish profileを使用
- 定期的なSecretsのローテーション
- Azure App Serviceの接続文字列はKey Vaultで管理

### 3. 監視
- デプロイ履歴の定期的な確認
- 環境別のログ監視
- エラー通知の設定
- 環境別のパフォーマンス監視

### 4. 設定管理
- appsettings.jsonを環境別に分離
- ASPNETCORE_ENVIRONMENTで環境切り替え
- CORS設定を環境別に制限
- ログ出力を環境別に設定 