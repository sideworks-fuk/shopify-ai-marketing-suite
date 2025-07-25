# GitHub Environments設定ガイド

## 概要
GitHub Environmentsを使用して環境別にSecretsを管理し、適切な環境変数を設定する方法について説明します。

## GitHub Environmentsの利点

### 1. 環境分離
- 各環境（main、staging、develop）で独立したSecrets管理
- 環境別の保護ルール設定
- デプロイ履歴の環境別管理

### 2. セキュリティ強化
- 環境別のアクセス制御
- 承認フローの設定
- 機密情報の環境別管理

## 環境設定

### main環境
**用途**: 本番環境へのデプロイ
**ブランチ**: `main`
**Azure App Service**: `shopifyapp-backend-production`
**Secrets設定**:
```
API_URL = https://shopifyapp-backend-production.japanwest-01.azurewebsites.net
AZUREAPPSERVICE_PUBLISHPROFILE_MAIN = [Azure Portalから取得]
```

### staging環境
**用途**: ステージング環境へのデプロイ
**ブランチ**: `staging`
**Azure App Service**: `shopifyapp-backend-staging`
**Secrets設定**:
```
API_URL = https://shopifyapp-backend-staging.japanwest-01.azurewebsites.net
AZUREAPPSERVICE_PUBLISHPROFILE_STAGING = [Azure Portalから取得]
```

### develop環境
**用途**: 開発環境へのデプロイ
**ブランチ**: `develop`
**Azure App Service**: `shopifyapp-backend-develop`
**Secrets設定**:
```
API_URL = https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP = [Azure Portalから取得]
```

## 設定手順

### 1. 環境の作成・編集

1. **GitHubリポジトリにアクセス**
   ```
   https://github.com/[username]/shopify-ai-marketing-suite/settings/environments
   ```

2. **既存環境の編集**
   - Production環境をクリック
   - "Secrets and variables" → "Variables"タブ
   - 必要なSecretsを追加

3. **環境別の保護ルール設定**
   - "Protection rules"セクション
   - "Required reviewers"を設定（本番環境のみ推奨）
   - "Wait timer"を設定（必要に応じて）

### 2. ワークフローファイルの設定

#### フロントエンド用
```yaml
jobs:
  deploy-main:
    runs-on: ubuntu-latest
    environment: main  # 環境名を指定
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'main')
    
    steps:
    # ... ビルドステップ
    - name: Build application
      env:
        NEXT_PUBLIC_BUILD_ENVIRONMENT: main
        NEXT_PUBLIC_DEPLOY_ENVIRONMENT: main
        NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}  # 環境別Secrets
        NEXT_PUBLIC_DEBUG_API: ${{ secrets.DEBUG_API }}
      run: npm run build
```

#### バックエンド用
```yaml
jobs:
  deploy-main:
    runs-on: windows-latest
    needs: build
    environment: main  # 環境名を指定
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'main')
    
    steps:
    # ... デプロイステップ
    - name: Deploy to Azure Web App (main)
      uses: azure/webapps-deploy@v3
      with:
        app-name: 'shopifyapp-backend-production'
        publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE_MAIN }}
        package: .
```

## 環境別の動作

### ブランチ別の自動切り替え

| ブランチ/イベント | 環境 | デプロイ先 | API接続先 |
|------------------|------|-----------|----------|
| `main` | Production | 本番環境 | 本番API |
| `staging` | Staging | ステージング環境 | ステージングAPI |
| `develop` | Development | 開発環境 | 開発API |

### 環境変数の自動設定

#### フロントエンド用
```yaml
# mainブランチ → Production環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: main
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: main
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-production.japanwest-01.azurewebsites.net

# stagingブランチ → Staging環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: staging
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-staging.japanwest-01.azurewebsites.net

# developブランチ → Development環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: develop
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: develop
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
```

#### バックエンド用
```yaml
# mainブランチ → main環境
ASPNETCORE_ENVIRONMENT: Production
app-name: shopifyapp-backend-production
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_MAIN

# stagingブランチ → staging環境
ASPNETCORE_ENVIRONMENT: Staging
app-name: shopifyapp-backend-staging
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_STAGING

# developブランチ → develop環境
ASPNETCORE_ENVIRONMENT: Development
app-name: shopifyapp-backend-develop
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP
```

## 保護ルールの設定

### main環境の保護ルール
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

### develop環境の保護ルール
```
✅ Required reviewers: なし（自動デプロイ）
✅ Wait timer: なし
✅ Deployment branches: developブランチのみ
```

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
- main環境（本番）は必ず承認フローを設定
- staging環境（ステージング）は自動デプロイ
- develop環境（開発）は自動デプロイ
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