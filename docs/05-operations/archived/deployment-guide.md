# デプロイ手順 (Windows/PowerShell)

このドキュメントでは、Shopify ECマーケティング分析アプリを本番環境にデプロイするための手順を説明します。

## 目次

1. [デプロイ前の準備](#デプロイ前の準備)
2. [Vercelへのデプロイ](#vercelへのデプロイ)
3. [Shopify App Storeへの公開](#shopify-app-storeへの公開)
4. [Azure OpenAIリソースの本番設定](#azure-openaiリソースの本番設定)
5. [デプロイ後のテスト](#デプロイ後のテスト)
6. [自動デプロイの設定](#自動デプロイの設定)
7. [ロールバック手順](#ロールバック手順)
8. [トラブルシューティング](#トラブルシューティング)

## デプロイ前の準備

### 1. 本番環境用ブランチの準備

\`\`\`powershell
# developブランチの最新変更を取得
git checkout develop
git pull origin develop

# mainブランチをアップデート
git checkout main
git pull origin main
git merge develop

# コンフリクトがあれば解決後、コミット
git add .
git commit -m "Merge develop into main for deployment"
\`\`\`

### 2. ビルドテスト

\`\`\`powershell
# 依存関係の更新
npm ci

# ビルドテスト
npm run build

# テストの実行
npm test
\`\`\`

### 3. 環境変数の準備

本番環境用の環境変数を`.env.production`ファイルに準備します：

\`\`\`powershell
@"
# Shopify API
SHOPIFY_API_KEY=your_production_shopify_api_key
SHOPIFY_API_SECRET=your_production_shopify_api_secret
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_production_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_production_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_production_deployment_name

# NextAuth.js
NEXTAUTH_SECRET=your_production_nextauth_secret
NEXTAUTH_URL=https://your-production-domain.com
"@ | Out-File -FilePath .env.production -Encoding utf8
\`\`\`

## Vercelへのデプロイ

### 1. Vercelアカウントの準備

1. [Vercel](https://vercel.com)にアクセスし、GitHubアカウントでログイン
2. 必要に応じて新しいチームを作成


### 2. Vercel CLIのインストール（オプション）

\`\`\`powershell
# Vercel CLIのインストール
npm install -g vercel

# ログイン
vercel login
\`\`\`

### 3. GitHubリポジトリからのデプロイ

#### A. Vercelダッシュボードからデプロイ（推奨）

1. Vercelダッシュボードで「New Project」をクリック
2. GitHubリポジトリをインポート
3. プロジェクト名を設定
4. フレームワークプリセットとして「Next.js」を選択
5. 環境変数を設定（`.env.production`の内容）
6. 「Deploy」をクリック


#### B. Vercel CLIからデプロイ

\`\`\`powershell
# プロジェクトディレクトリで実行
vercel --prod
\`\`\`

### 4. カスタムドメインの設定（オプション）

1. Vercelプロジェクトダッシュボードで「Domains」タブを選択
2. 「Add」をクリックして新しいドメインを追加
3. DNSレコードを設定（指示に従ってください）
4. SSL証明書の発行を確認


## Shopify App Storeへの公開

### 1. Shopify Appの本番設定

1. [Shopify Partners](https://partners.shopify.com/)にログイン
2. 「Apps」→ アプリを選択
3. 「App setup」タブで以下を設定：

1. App URL: `https://your-production-domain.com`
2. Allowed redirection URL(s): `https://your-production-domain.com/api/auth/callback`



4. 「Distribution」タブで必要な情報を入力：

1. アプリ名
2. 説明
3. アプリのカテゴリ
4. 価格プラン
5. スクリーンショット
6. プライバシーポリシーURL
7. サポート連絡先





### 2. アプリ審査の準備

1. アプリのテスト手順を作成
2. テスト用のShopifyストアを準備
3. 審査担当者用のアクセス情報を準備


### 3. アプリの提出

1. すべての必須情報が入力されていることを確認
2. 「Submit for review」をクリック
3. 審査結果を待つ（通常1〜5営業日）


## Azure OpenAIリソースの本番設定

### 1. スケーリングの設定

1. [Azure Portal](https://portal.azure.com/)にアクセス
2. Azure OpenAIリソースを選択
3. 「スケール」タブで適切な設定を行う：

1. トークンレート制限の調整
2. リージョンの選択





### 2. モニタリングの設定

1. 「監視」タブでアラートを設定：

1. APIリクエスト数
2. エラー率
3. レイテンシ



2. Azure Application Insightsとの連携（オプション）


### 3. コスト管理

1. 予算アラートの設定
2. 使用量の定期的な確認スケジュールの設定


## デプロイ後のテスト

### 1. 機能テスト

\`\`\`powershell
# テスト用のPowerShellスクリプト
$baseUrl = "https://your-production-domain.com"

# ヘルスチェック
$health = Invoke-RestMethod -Uri "$baseUrl/api/health"
Write-Host "Health check: $($health.status)"

# 認証テスト
$auth = Invoke-RestMethod -Uri "$baseUrl/api/auth/session" -SessionVariable session
Write-Host "Auth check: $($auth.status)"

# その他の機能テスト
# ...
\`\`\`

### 2. パフォーマンステスト

1. [PageSpeed Insights](https://pagespeed.web.dev/)でパフォーマンスを確認
2. [WebPageTest](https://www.webpagetest.org/)で詳細なパフォーマンス分析


### 3. セキュリティテスト

1. [OWASP ZAP](https://www.zaproxy.org/)を使用した脆弱性スキャン
2. [SSL Labs](https://www.ssllabs.com/ssltest/)でSSL設定を確認


## 自動デプロイの設定

### 1. GitHub Actionsの設定

`.github/workflows/deploy.yml`ファイルを作成：

\`\`\`yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

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
        
      - name: Run tests
        run: npm test
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
\`\`\`

### 2. Vercelとの連携設定

1. Vercelダッシュボードで「Git Integration」を設定
2. 自動デプロイの設定を確認
3. プレビューデプロイメントの設定


## ロールバック手順

### 1. Vercelでのロールバック

1. Vercelダッシュボードで「Deployments」タブを選択
2. 以前の安定したデプロイメントを見つける
3. 「...」メニューから「Promote to Production」を選択


### 2. 手動ロールバック

\`\`\`powershell
# 以前のコミットに戻る
git checkout main
git reset --hard <previous-stable-commit-hash>
git push -f origin main

# または特定のタグにロールバック
git checkout tags/v1.0.0
git checkout -b rollback-branch
git push origin rollback-branch:main -f
\`\`\`

## トラブルシューティング

### 1. デプロイ失敗

#### 症状: Vercelデプロイが失敗する

**解決策:**

1. Vercelのデプロイログを確認
2. ビルドエラーを修正
3. 環境変数が正しく設定されているか確認


\`\`\`powershell
# ローカルでビルドテスト
npm run build
\`\`\`

### 2. API接続エラー

#### 症状: Shopify APIへの接続が失敗する

**解決策:**

1. Shopify API認証情報を確認
2. リダイレクトURLが正しく設定されているか確認
3. スコープが適切に設定されているか確認


\`\`\`powershell
# APIエンドポイントのテスト
$response = Invoke-RestMethod -Uri "https://your-production-domain.com/api/shopify/test" -ErrorAction SilentlyContinue
if ($response) {
    Write-Host "API connection successful"
} else {
    Write-Host "API connection failed"
}
\`\`\`

### 3. パフォーマンス問題

#### 症状: アプリの読み込みが遅い

**解決策:**

1. Vercelの分析ダッシュボードを確認
2. 画像の最適化
3. 不要なJavaScriptの削減
4. キャッシュ戦略の見直し


### 4. 環境変数の問題

#### 症状: 環境変数が読み込まれない

**解決策:**

1. Vercelダッシュボードで環境変数を確認
2. 変数名のスペルミスを確認
3. 必要に応じて再デプロイ


\`\`\`powershell
# Vercel CLIで環境変数を確認
vercel env ls
\`\`\`

## 定期的なメンテナンス

### 1. 依存関係の更新

\`\`\`powershell
# 依存関係の更新確認
npm outdated

# 依存関係の更新
npm update

# または特定のパッケージを更新
npm update next react react-dom
\`\`\`

### 2. セキュリティスキャン

\`\`\`powershell
# npm監査
npm audit

# 脆弱性の修正
npm audit fix
\`\`\`

### 3. パフォーマンスモニタリング

1. Vercelの分析ダッシュボードを定期的に確認
2. Google Analytics（設定している場合）でユーザー行動を分析
3. エラー率とレイテンシを監視


## 付録: デプロイチェックリスト

- すべてのテストが成功している
- 本番環境用の環境変数が設定されている
- ビルドが成功している
- Shopify App設定が更新されている
- Azure OpenAIリソースが適切に設定されている
- セキュリティスキャンが完了している
- パフォーマンステストが完了している
- ロールバック計画が準備されている
- 監視とアラートが設定されている
