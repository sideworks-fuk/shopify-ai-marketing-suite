# 環境名の命名規則と整理

## 概要
プロジェクト全体で環境名を統一し、分かりやすい命名規則を採用しています。

## 環境名の統一

### ブランチ名ベースの統一
| ブランチ名 | 環境名 | 用途 | Azure App Service |
|-----------|--------|------|------------------|
| `main` | `main` | 本番環境 | `shopifyapp-backend-production` |
| `staging` | `staging` | ステージング環境 | `shopifyapp-backend-staging` |
| `develop` | `develop` | 開発環境 | `shopifyapp-backend-develop` |

### 命名規則の利点
1. **一貫性**: ブランチ名と環境名が一致
2. **分かりやすさ**: 直感的な命名
3. **管理しやすさ**: 混乱を避けた統一された命名

## GitHub Environments設定

### 環境名の設定
```yaml
# GitHub Environmentsで作成する環境名
- main
- staging  
- develop
```

### Secrets名の統一
```yaml
# 各環境のSecrets名
AZUREAPPSERVICE_PUBLISHPROFILE_MAIN
AZUREAPPSERVICE_PUBLISHPROFILE_STAGING
AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP
```

## ワークフローファイルでの使用例

### フロントエンド用
```yaml
jobs:
  deploy-main:
    runs-on: ubuntu-latest
    environment: main  # 環境名
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'main')
    
    steps:
    - name: Build application
      env:
        NEXT_PUBLIC_BUILD_ENVIRONMENT: main
        NEXT_PUBLIC_DEPLOY_ENVIRONMENT: main
        NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
        NEXT_PUBLIC_DEBUG_API: ${{ secrets.DEBUG_API }}
      run: npm run build
```

### バックエンド用
```yaml
jobs:
  deploy-main:
    runs-on: windows-latest
    needs: build
    environment: main  # 環境名
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'main')
    
    steps:
    - name: Deploy to Azure Web App (main)
      uses: azure/webapps-deploy@v3
      with:
        app-name: 'shopifyapp-backend-production'
        publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE_MAIN }}
        package: .
```

## 手動実行時の環境選択

### workflow_dispatch設定
```yaml
workflow_dispatch:
  inputs:
    environment:
      description: 'Deploy to environment'
      required: true
      default: 'staging'
      type: choice
      options:
      - main
      - staging
      - develop
```

### 条件分岐
```yaml
# main環境へのデプロイ
if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'main')

# staging環境へのデプロイ
if: github.ref == 'refs/heads/staging' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'staging')

# develop環境へのデプロイ
if: github.ref == 'refs/heads/develop' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'develop')
```

## 保護ルールの設定

### main環境（本番）
```
✅ Required reviewers: 1人以上
✅ Wait timer: 5分
✅ Deployment branches: mainブランチのみ
```

### staging環境（ステージング）
```
✅ Required reviewers: なし（自動デプロイ）
✅ Wait timer: なし
✅ Deployment branches: stagingブランチのみ
```

### develop環境（開発）
```
✅ Required reviewers: なし（自動デプロイ）
✅ Wait timer: なし
✅ Deployment branches: developブランチのみ
```

## 環境変数の設定

### フロントエンド用環境変数
```yaml
# main環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: main
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: main
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-production.japanwest-01.azurewebsites.net

# staging環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: staging
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-staging.japanwest-01.azurewebsites.net

# develop環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: develop
NEXT_PUBLIC_DEPLOY_ENVIRONMENT: develop
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
```

### バックエンド用環境変数
```yaml
# main環境
ASPNETCORE_ENVIRONMENT: Production
app-name: shopifyapp-backend-production
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_MAIN

# staging環境
ASPNETCORE_ENVIRONMENT: Staging
app-name: shopifyapp-backend-staging
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_STAGING

# develop環境
ASPNETCORE_ENVIRONMENT: Development
app-name: shopifyapp-backend-develop
publish-profile: AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP
```

## ベストプラクティス

### 1. 命名の一貫性
- ブランチ名と環境名を一致させる
- Secrets名も環境名に合わせる
- ワークフローファイル内でも統一した命名を使用

### 2. 分かりやすさ
- 直感的な命名を採用
- 用途が明確になる命名
- 混乱を避けた簡潔な命名

### 3. 管理しやすさ
- 統一された命名規則
- ドキュメントでの明確な説明
- チーム全体での共有

## 移行手順

### 1. GitHub Environmentsの更新
1. GitHubリポジトリのSettings → Environments
2. 既存の環境名を新しい命名に変更
3. Secrets名も新しい命名に更新

### 2. ワークフローファイルの更新
1. 環境名の参照を更新
2. Secrets名の参照を更新
3. 条件分岐の環境名を更新

### 3. ドキュメントの更新
1. 環境名の説明を更新
2. 設定例を新しい命名に更新
3. チーム内での共有

## 注意事項

- **既存の設定**: 既存のSecretsやEnvironmentsがある場合は、段階的に移行
- **ダウンタイム**: 移行中はデプロイを一時停止
- **テスト**: 移行後は各環境での動作確認を実施
- **ドキュメント**: チーム全体で新しい命名規則を共有 