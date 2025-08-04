# ビルド時環境変数設定ガイド

## 概要

ビルド時に環境変数を設定することで、デプロイ後のアプリケーションの動作環境を制御できます。これにより、開発・ステージング・本番環境で適切なAPIエンドポイントが自動的に選択されます。

## 対応環境変数

### 1. NEXT_PUBLIC_BUILD_ENVIRONMENT（最優先）
ビルド時に設定され、アプリケーションの動作環境を決定します。

```bash
# 開発環境
NEXT_PUBLIC_BUILD_ENVIRONMENT=development

# ステージング環境
NEXT_PUBLIC_BUILD_ENVIRONMENT=staging

# 本番環境
NEXT_PUBLIC_BUILD_ENVIRONMENT=production
```

### 2. NEXT_PUBLIC_DEPLOY_ENVIRONMENT（第2優先）
デプロイ環境を指定します。

```bash
NEXT_PUBLIC_DEPLOY_ENVIRONMENT=staging
```

### 3. NEXT_PUBLIC_APP_ENVIRONMENT（第3優先）
アプリケーション環境を指定します。

```bash
NEXT_PUBLIC_APP_ENVIRONMENT=production
```

### 4. NEXT_PUBLIC_ENVIRONMENT（第4優先）
実行時の環境変数です。

```bash
NEXT_PUBLIC_ENVIRONMENT=development
```

## 設定の優先順位

1. **NEXT_PUBLIC_BUILD_ENVIRONMENT** (最優先)
   - ビルド時に設定され、デプロイ後に変更不可
   - デプロイ環境ごとに固定値

2. **NEXT_PUBLIC_DEPLOY_ENVIRONMENT** (第2優先)
   - デプロイ時に設定
   - ビルド時環境変数が未設定の場合に使用

3. **NEXT_PUBLIC_APP_ENVIRONMENT** (第3優先)
   - アプリケーション環境の指定
   - 上記2つが未設定の場合に使用

4. **NEXT_PUBLIC_ENVIRONMENT** (第4優先)
   - 実行時の環境変数
   - 上記3つが未設定の場合に使用

5. **NODE_ENV** (自動判定)
   - `production` → 本番環境
   - `development` → 開発環境

6. **デフォルト** (フォールバック)
   - 開発環境

## デプロイ環境別設定例

### 開発環境
```bash
# .env.local
NEXT_PUBLIC_BUILD_ENVIRONMENT=development
NODE_ENV=development
```

### ステージング環境
```bash
# デプロイ時に設定
NEXT_PUBLIC_BUILD_ENVIRONMENT=staging
NODE_ENV=production
```

### 本番環境
```bash
# デプロイ時に設定
NEXT_PUBLIC_BUILD_ENVIRONMENT=production
NODE_ENV=production
```

## CI/CDでの設定例

### GitHub Actions
```yaml
name: Deploy to Staging
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build for staging
        env:
          NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
          NODE_ENV: production
        run: npm run build
        
      - name: Deploy to staging
        run: # デプロイコマンド
```

### Vercel
```json
// vercel.json
{
  "env": {
    "NEXT_PUBLIC_BUILD_ENVIRONMENT": "production"
  }
}
```

### Azure Static Web Apps
```yaml
# .github/workflows/azure-static-web-apps.yml
- name: Build And Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    app_location: "/frontend"
    api_location: "/backend"
    app_build_command: "npm run build"
    deployment_environment: production
    env:
      NEXT_PUBLIC_BUILD_ENVIRONMENT: production
```

## 環境変数の確認方法

### 1. ブラウザでの確認
1. アプリケーションにアクセス
2. `/settings/environment` ページに移動
3. 「ビルド時環境変数」セクションで確認

### 2. 開発者ツールでの確認
ブラウザの開発者ツールのコンソールで以下の情報を確認：

```
🔍 Environment Check:
  - Current Environment: production
  - NODE_ENV: production
  - Build Environment: production
  - Deploy Environment: staging
  - App Environment: production
  - Is Build Time Set: true
  - API Base URL: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
  - Environment Name: 本番環境
  - Is Production: true
```

## 注意事項

### セキュリティ
- ビルド時の環境変数はクライアントサイドに露出します
- 機密情報は含めないでください
- APIキーなどの機密情報はサーバーサイドで管理してください

### パフォーマンス
- ビルド時の環境変数はビルド時に固定されます
- 実行時に変更することはできません
- 環境切り替えが必要な場合は、ローカルストレージを使用してください

### デプロイ
- 各デプロイ環境で適切な環境変数を設定してください
- 本番環境では必ず `NEXT_PUBLIC_BUILD_ENVIRONMENT=production` を設定してください
- ステージング環境では `NEXT_PUBLIC_BUILD_ENVIRONMENT=staging` を設定してください

## トラブルシューティング

### 環境変数が反映されない
1. ビルド時に環境変数が正しく設定されているか確認
2. デプロイ後にキャッシュをクリア
3. 環境変数の優先順位を確認

### 本番環境で開発環境のAPIに接続している
1. `NEXT_PUBLIC_BUILD_ENVIRONMENT=production` が設定されているか確認
2. ビルドログで環境変数が正しく読み込まれているか確認
3. デプロイ設定を確認

### ステージング環境での問題
1. ステージング環境用のAPIエンドポイントが正しく設定されているか確認
2. ステージング環境のビルド設定を確認
3. デプロイ設定でステージング環境が正しく指定されているか確認 