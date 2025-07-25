# GitHub Actions環境変数設定ガイド

## 概要
GitHub Actionsでフロントエンドとバックエンドをデプロイする際の環境変数設定方法について説明します。

## 環境変数の種類

### 1. フロントエンド用環境変数（Build-time）
- `NEXT_PUBLIC_BUILD_ENVIRONMENT`: ビルド時の環境設定（main/staging/develop）
- `NEXT_PUBLIC_DEPLOY_ENVIRONMENT`: デプロイ時の環境設定
- `NEXT_PUBLIC_API_URL`: APIのベースURL
- `NODE_ENV`: Node.js環境設定

### 2. バックエンド用環境変数（Deploy-time）
- `ASPNETCORE_ENVIRONMENT`: .NET環境設定（Production/Staging/Development）
- `AZUREAPPSERVICE_PUBLISHPROFILE_PRODUCTION`: 本番環境のpublish profile
- `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING`: ステージング環境のpublish profile
- `AZUREAPPSERVICE_PUBLISHPROFILE_C60B318531324C8F9CC369407A7D3DF7`: 開発環境のpublish profile

## 設定方法

### GitHub Secretsの設定

1. **GitHubリポジトリにアクセス**
   ```
   https://github.com/[username]/shopify-ai-marketing-suite/settings/secrets/actions
   ```

2. **必要なSecretsを追加**
   | Secret名 | 値 | 説明 |
   |---------|-----|------|
   | `AZUREAPPSERVICE_PUBLISHPROFILE_MAIN` | `[Azure Portalから取得]` | main環境のpublish profile |
   | `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING` | `[Azure Portalから取得]` | staging環境のpublish profile |
   | `AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP` | `[Azure Portalから取得]` | develop環境のpublish profile |

### 環境別の設定例

#### 本番環境（mainブランチ）
```yaml
env:
  NEXT_PUBLIC_BUILD_ENVIRONMENT: main
  NEXT_PUBLIC_DEPLOY_ENVIRONMENT: main
  NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
  NODE_ENV: production
```

#### ステージング環境（stagingブランチ）
```yaml
env:
  NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
  NEXT_PUBLIC_DEPLOY_ENVIRONMENT: staging
  NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
  NODE_ENV: production
```

#### 開発環境（developブランチ）
```yaml
env:
  NEXT_PUBLIC_BUILD_ENVIRONMENT: develop
  NEXT_PUBLIC_DEPLOY_ENVIRONMENT: develop
  NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
  NODE_ENV: production
```

## ワークフロー設定例

### フロントエンド環境別デプロイ用
```yaml
name: Frontend Deploy with Environments

on:
  push:
    branches: [ main, staging, develop ]
    paths:
      - 'frontend/**'
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

jobs:
  deploy-main:
    runs-on: ubuntu-latest
    environment: Production
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'main')
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: ./frontend
      run: npm ci

    - name: Build application
      working-directory: ./frontend
      env:
        NEXT_PUBLIC_BUILD_ENVIRONMENT: main
        NEXT_PUBLIC_DEPLOY_ENVIRONMENT: main
        NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
        NEXT_PUBLIC_DEBUG_API: ${{ secrets.DEBUG_API }}
        NODE_ENV: production
      run: npm run build

    - name: Build completed
      run: echo "Build completed for main environment"
```

### バックエンド環境別デプロイ用
```yaml
name: Backend Deploy with Environments

on:
  push:
    branches: [ main, staging, develop ]
    paths:
      - 'backend/**'
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

jobs:
  build:
    runs-on: windows-latest
    permissions:
      contents: read
      actions: read
      deployments: write
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up .NET Core
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.x'

      - name: Build with dotnet
        run: |
          cd backend/ShopifyTestApi
          dotnet restore
          dotnet build --configuration Release

      - name: Publish with dotnet
        run: |
          cd backend/ShopifyTestApi
          dotnet publish -c Release -o ./publish

      - name: Upload artifact for deployment job
        uses: actions/upload-artifact@v4
        with:
          name: dotnet-app
          path: backend/ShopifyTestApi/publish

  deploy-main:
    runs-on: windows-latest
    needs: build
    if: github.ref == 'refs/heads/main' || (github.event_name == 'workflow_dispatch' && github.event.inputs.environment == 'main')
    environment: main
    
    steps:
      - name: Download artifact from build job
        uses: actions/download-artifact@v4
        with:
          name: dotnet-app

      - name: Deploy to Azure Web App (main)
        uses: azure/webapps-deploy@v3
        with:
          app-name: 'shopifyapp-backend-production'
          publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE_MAIN }}
          package: .
```

## トラブルシューティング

### よくある問題

1. **環境変数が設定されない**
   - GitHub Secretsが正しく設定されているか確認
   - ワークフローファイルの構文エラーを確認
   - GitHub Environmentsが正しく設定されているか確認

2. **ビルド時に環境変数が読み込まれない**
   - `NEXT_PUBLIC_` プレフィックスが付いているか確認
   - ビルドステップで `env:` が正しく設定されているか確認
   - 環境別の設定が正しく適用されているか確認

3. **デプロイが失敗する**
   - Azure App Serviceのpublish profileが正しく設定されているか確認
   - 環境名がワークフローファイルと一致しているか確認
   - ASPNETCORE_ENVIRONMENTが正しく設定されているか確認

4. **環境切り替えが動作しない**
   - ブランチ名と環境名が正しく対応しているか確認
   - 手動実行時の環境選択が正しく設定されているか確認

## 注意事項

- **セキュリティ**: 機密情報は必ずGitHub Secretsを使用
- **環境分離**: 各環境で独立した設定を使用
- **テスト**: プルリクエストでビルドテストを実行
- **ログ**: デプロイログで環境変数が正しく設定されているか確認
- **手動実行**: 任意のブランチから任意の環境にデプロイ可能 