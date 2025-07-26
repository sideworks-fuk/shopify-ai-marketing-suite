# Azure デプロイガイド

## 概要
フロントエンド（Next.js）をAzureにデプロイする2つの選択肢について説明します。

## オプション1: Azure Static Web Apps（推奨）

### メリット
- ✅ **無料枠**: 月500GB転送量まで無料
- ✅ **自動SSL**: HTTPSが自動設定
- ✅ **CDN**: グローバル配信で高速
- ✅ **プレビュー環境**: PR毎に自動デプロイ
- ✅ **Next.js最適化**: 自動最適化機能

### 設定手順

#### 1. Azure Portal での設定
```bash
# 1. Azure Portal で Static Web Apps を作成
# 2. GitHub リポジトリを接続
# 3. ビルド設定:
#    - App location: /frontend
#    - Output location: out
#    - Build command: npm run build
```

#### 2. GitHub シークレット設定
```bash
# リポジトリ Settings > Secrets and variables > Actions
AZURE_STATIC_WEB_APPS_API_TOKEN=<Azure Portal から取得>
```

#### 3. 自動デプロイ開始
- `main` ブランチにプッシュで自動デプロイ
- PRで自動プレビュー環境作成

### 設定変更方法

#### Azure Portal での変更（推奨）
1. **運用環境のブランチ変更**
   - Azure Portal → Static Web Apps → 環境
   - Production環境の分岐を`main`に変更

2. **ビルド設定の変更**
   - 設定 → 構成 → ビルド設定
   - アプリの場所、出力場所、ビルドコマンドを調整

#### GitHub Actions ワークフローでの変更
```yaml
# .github/workflows/azure-static-web-apps-brave-sea-038f17a00.yml
deployment_environment: ${{ steps.env.outputs.deployment_environment }}
app_build_command: "npm run build"
app_settings: |
  NODE_ENV=${{ steps.env.outputs.node_env }}
  NEXT_PUBLIC_BUILD_ENVIRONMENT=${{ steps.env.outputs.build_environment }}
  # その他の環境変数
```

#### Azure CLI での変更
```bash
# ビルド設定の変更
az staticwebapp update \
  --name shopify-ai-marketing-frontend \
  --resource-group <resource-group> \
  --build-property app-location=/frontend \
  --build-property output-location=out \
  --build-property app-build-command="npm run build"

# 環境変数の設定
az staticwebapp appsettings set \
  --name shopify-ai-marketing-frontend \
  --resource-group <resource-group> \
  --settings NODE_ENV=production
```

---

## オプション2: Azure App Service

### メリット
- ✅ **統合管理**: バックエンドと同じApp Service
- ✅ **高度な設定**: カスタムドメイン、スケーリング
- ✅ **企業向け**: VNet統合、プライベートエンドポイント

### 設定手順

#### 1. App Service の作成
```bash
# Azure CLI での作成例
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name myFrontendApp \
  --runtime "NODE|18-lts"
```

#### 2. デプロイ設定
```bash
# GitHub Actions 用の publish profile をダウンロード
# Azure Portal > App Service > Get publish profile
```

#### 3. GitHub シークレット設定
```bash
AZUREAPPSERVICE_PUBLISHPROFILE=<ダウンロードしたファイルの内容>
```

---

## 設定ファイル説明

### Static Web Apps 設定
- **ファイル**: `frontend/staticwebapp.config.json`
- **機能**: ルーティング、API プロキシ、ヘッダー設定

### GitHub Actions
- **Static Web Apps**: `.github/workflows/azure-static-web-apps-brave-sea-038f17a00.yml`
- **App Service**: `.github/workflows/azure-app-service.yml`

---

## API 接続設定

両方のオプションで、バックエンド API への接続は以下で設定済み：

```json
{
  "route": "/api/*",
  "rewrite": "https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net/api/{*}"
}
```

---

## 推奨設定

### 本番環境
**Azure Static Web Apps** を推奨
- コスト効率が良い
- パフォーマンスが高い
- 運用負荷が少ない

### 企業環境
**Azure App Service** を検討
- より高度なセキュリティ要件
- VNet 統合が必要
- 既存インフラとの統合

---

## 設定変更の優先順位

1. **Azure Portal**（最も簡単・直感的）
2. **GitHub Actions ワークフロー**（細かい制御・自動化）
3. **Azure CLI**（自動化・スクリプト化）
4. **ARM テンプレート**（インフラコード化・IaC）

---

## トラブルシューティング

### Azure Static Web Apps デプロイ環境の問題

#### 問題: プレビュー環境にデプロイされてしまう
**症状**: `main`ブランチでデプロイしたのに、プレビュー環境にデプロイされる

**原因**: `deployment_environment`パラメータの設定ミス

**解決方法**:
```yaml
# ❌ 間違った設定（プレビュー環境が作成される）
deployment_environment: Production

# ✅ 正しい設定（本番環境にデプロイ）
deployment_environment: ""  # 空にする
```

#### 問題: "No matching Static Web App environment was found"
**症状**: デプロイ時に環境が見つからないエラー

**原因**: 環境名の大文字小文字の不一致

**解決方法**:
```yaml
# Azure Portalの環境名と一致させる
# Azure Portal: Production → ワークフロー: Production
# Azure Portal: development → ワークフロー: development
```

#### 問題: 複数のURLが作成される
**症状**: 
- `https://app-name.1.azurestaticapps.net/` (本番環境)
- `https://app-name-production.1.azurestaticapps.net/` (プレビュー環境)

**原因**: `deployment_environment`に値を設定している

**解決方法**:
```yaml
# mainブランチの場合
if [ "${{ github.ref }}" = "refs/heads/main" ]; then
  echo "deployment_environment=" >> $GITHUB_OUTPUT  # 空にする
else
  echo "deployment_environment=development" >> $GITHUB_OUTPUT
fi
```

#### 問題: Azure Portalでブランチ設定を変更できない
**症状**: Azure Portalで運用環境の分岐を変更できない

**解決方法**:
1. **GitHub Actionsワークフローで強制指定**:
```yaml
deployment_environment: ${{ github.ref == 'refs/heads/main' && '' || 'development' }}
```

2. **新しいStatic Web Appsリソースを作成**:
```bash
az staticwebapp create \
  --name new-app-name \
  --resource-group <resource-group> \
  --source https://github.com/user/repo \
  --branch main \
  --app-location /frontend \
  --output-location out
```

#### 問題: デプロイ内容が反映されない
**症状**: GitHub Actionsでデプロイ成功だが、実際のサイトに反映されない

**原因**: 
1. キャッシュの問題
2. 環境変数が正しく設定されていない
3. デプロイ先環境の間違い

**解決方法**:
1. **キャッシュクリア**:
   - ブラウザのハードリフレッシュ（Ctrl+F5）
   - CDNキャッシュのクリア

2. **環境変数の確認**:
```yaml
app_settings: |
  NODE_ENV=${{ steps.env.outputs.node_env }}
  NEXT_PUBLIC_BUILD_ENVIRONMENT=${{ steps.env.outputs.build_environment }}
  NEXT_PUBLIC_DEPLOY_ENVIRONMENT=${{ steps.env.outputs.deploy_environment }}
  NEXT_PUBLIC_APP_ENVIRONMENT=${{ steps.env.outputs.app_environment }}
```

3. **デプロイ先環境の確認**:
```yaml
# デバッグ情報を追加
- name: Deploy Status
  run: |
    echo "🔧 デプロイ先環境: ${{ steps.env.outputs.deployment_environment == '' && 'Production (本番環境)' || format('Preview ({0})', steps.env.outputs.deployment_environment) }}"
```

#### Azure Static Web Apps環境の仕組み

**本番環境（Operational）**:
- 1つだけ存在
- 100%のトラフィックを受け取る
- `deployment_environment`を空または未指定

**プレビュー環境（Preview）**:
- 複数作成可能
- トラフィックを受け取らない
- `deployment_environment`に任意の名前を指定

**正しい設定例**:
```yaml
# mainブランチ → 本番環境
if [ "${{ github.ref }}" = "refs/heads/main" ]; then
  echo "deployment_environment=" >> $GITHUB_OUTPUT  # 空
  echo "environment_name=Production" >> $GITHUB_OUTPUT
else
  echo "deployment_environment=development" >> $GITHUB_OUTPUT  # プレビュー環境
  echo "environment_name=development" >> $GITHUB_OUTPUT
fi
```

### 一般的なデプロイ問題

#### 問題: ビルドエラー
**症状**: GitHub Actionsでビルドが失敗する

**解決方法**:
1. **Node.jsバージョンの確認**:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
```

2. **依存関係のインストール**:
```yaml
- name: Install dependencies
  run: |
    cd frontend
    npm ci
```

#### 問題: 環境変数が反映されない
**症状**: デプロイ後に環境変数が正しく設定されていない

**解決方法**:
1. **app_settingsの確認**:
```yaml
app_settings: |
  NODE_ENV=production
  NEXT_PUBLIC_API_URL=https://your-api-url.com
```

2. **ビルド時の環境変数設定**:
```yaml
- name: Build
  env:
    NODE_ENV: production
    NEXT_PUBLIC_BUILD_ENVIRONMENT: production
  run: npm run build
```

#### 問題: ルーティングエラー
**症状**: ページアクセス時に404エラーが発生

**解決方法**:
1. **staticwebapp.config.jsonの確認**:
```json
{
  "routes": [
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ]
}
```

2. **Next.jsの設定確認**:
```javascript
// next.config.js
module.exports = {
  trailingSlash: true,
  output: 'export'
}
```

---

## 次のステップ

1. **どちらかを選択**
2. **Azure リソース作成**
3. **GitHub Secrets 設定**
4. **main ブランチにプッシュしてテスト**

メニューテキストの変更も含まれているので、デプロイ成功後に確認できます！ 