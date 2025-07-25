# GitHub Actions環境変数設定ガイド

## 概要
GitHub Actionsでフロントエンドをデプロイする際の環境変数設定方法について説明します。

## 環境変数の種類

### 1. ビルド時環境変数（Build-time）
- `NEXT_PUBLIC_BUILD_ENVIRONMENT`: ビルド時の環境設定
- `NEXT_PUBLIC_API_URL`: APIのベースURL
- `NEXT_PUBLIC_DEBUG_API`: デバッグ用APIのベースURL
- `NODE_ENV`: Node.js環境設定

### 2. デプロイ時環境変数（Deploy-time）
- `VERCEL_TOKEN`: Vercel APIトークン
- `VERCEL_ORG_ID`: Vercel組織ID
- `VERCEL_PROJECT_ID`: VercelプロジェクトID
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: Azure Static Web Apps APIトークン

## 設定方法

### GitHub Secretsの設定

1. **GitHubリポジトリにアクセス**
   ```
   https://github.com/[username]/[repository]/settings/secrets/actions
   ```

2. **必要なSecretsを追加**
   | Secret名 | 値 | 説明 |
   |---------|-----|------|
   | `API_URL` | `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net` | 本番APIのベースURL |
   | `DEBUG_API` | `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net` | ステージングAPIのベースURL |
   | `VERCEL_TOKEN` | `your_vercel_token` | Vercel APIトークン |
   | `VERCEL_ORG_ID` | `your_org_id` | Vercel組織ID |
   | `VERCEL_PROJECT_ID` | `your_project_id` | VercelプロジェクトID |
   | `AZURE_STATIC_WEB_APPS_API_TOKEN` | `your_azure_token` | Azure Static Web Apps APIトークン |

### 環境別の設定例

#### 本番環境（mainブランチ）
```yaml
env:
  NEXT_PUBLIC_BUILD_ENVIRONMENT: production
  NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
  NEXT_PUBLIC_DEBUG_API: ${{ secrets.DEBUG_API }}
  NODE_ENV: production
```

#### ステージング環境（developブランチ）
```yaml
env:
  NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
  NEXT_PUBLIC_API_URL: ${{ secrets.DEBUG_API }}
  NEXT_PUBLIC_DEBUG_API: ${{ secrets.API_URL }}
  NODE_ENV: production
```

## ワークフロー設定例

### Vercelデプロイ用
```yaml
name: Frontend Deploy

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
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
        NEXT_PUBLIC_BUILD_ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
        NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
        NEXT_PUBLIC_DEBUG_API: ${{ secrets.DEBUG_API }}
        NODE_ENV: production
      run: npm run build

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./frontend
        vercel-args: '--prod'
```

### Azure Static Web Apps用
```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'frontend/**'

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - name: Checkout
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
          NEXT_PUBLIC_BUILD_ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
          NEXT_PUBLIC_DEBUG_API: ${{ secrets.DEBUG_API }}
          NODE_ENV: production
        run: npm run build

      - name: Deploy
        id: deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          app_location: "/frontend"
          api_location: ""
          output_location: "frontend/.next"
          skip_app_build: false
```

## トラブルシューティング

### よくある問題

1. **環境変数が設定されない**
   - GitHub Secretsが正しく設定されているか確認
   - ワークフローファイルの構文エラーを確認

2. **ビルド時に環境変数が読み込まれない**
   - `NEXT_PUBLIC_` プレフィックスが付いているか確認
   - ビルドステップで `env:` が正しく設定されているか確認

3. **デプロイが失敗する**
   - APIトークンが正しく設定されているか確認
   - プロジェクトIDが正しいか確認

## 注意事項

- **セキュリティ**: 機密情報は必ずGitHub Secretsを使用
- **環境分離**: 本番とステージングで異なる環境変数を使用
- **テスト**: プルリクエストでビルドテストを実行
- **ログ**: デプロイログで環境変数が正しく設定されているか確認 