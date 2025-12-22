# GitHub Actions 本番環境デプロイ設定ガイド

## 概要
本ドキュメントでは、本番環境用のGitHub Actionsワークフローの設定手順を説明します。

## ワークフローファイル一覧

### 本番環境専用ワークフロー
- `.github/workflows/production_backend.yml` - バックエンドのみデプロイ
- `.github/workflows/production_frontend.yml` - フロントエンドのみデプロイ
- `.github/workflows/production_deploy_all.yml` - フロントエンド＋バックエンド全体デプロイ

### 開発環境用ワークフロー（既存）
- `.github/workflows/develop_backend_fixed.yml` - 開発/ステージング環境向け
- `.github/workflows/develop_frontend.yml` - 開発/ステージング環境向け

## 必要なGitHub Secrets設定

### 1. バックエンド用Secrets

#### `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`
**取得方法**:
1. Azure Portalにログイン
2. App Service（shopifyapp-backend-prod）に移動
3. 「概要」→「発行プロファイルの取得」をクリック
4. ダウンロードしたファイルの内容をコピー
5. GitHubリポジトリの Settings → Secrets and variables → Actions
6. 「New repository secret」をクリック
7. Name: `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`
8. Value: コピーした内容を貼り付け

### 2. フロントエンド用Secrets

#### `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION`
**取得方法**:
1. Azure Portalにログイン
2. Static Web Apps（本番環境）に移動
3. 「設定」→「デプロイトークン」
4. トークンをコピー
5. GitHubリポジトリの Settings → Secrets and variables → Actions
6. 「New repository secret」をクリック
7. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION`
8. Value: コピーしたトークンを貼り付け

### 3. Shopify API認証情報

#### `SHOPIFY_API_KEY_PRODUCTION`
```
Value: be1fc09e2135be7cee3b9186ef8bfe80
```

#### `SHOPIFY_API_SECRET_PRODUCTION`
```
Value: [メモから取得]
```

## ワークフローの使用方法

### 1. 本番環境全体デプロイ
```
1. GitHubリポジトリの「Actions」タブを開く
2. 「Production Full Deploy (Frontend + Backend)」を選択
3. 「Run workflow」をクリック
4. 確認項目で「YES - 本番環境に全体デプロイします」を選択
5. デプロイメッセージを入力（任意）
6. 「Run workflow」を実行
```

### 2. バックエンドのみデプロイ
```
1. 「Actions」→「Production Backend Deploy」を選択
2. 「Run workflow」→「YES - 本番環境にデプロイします」を選択
3. 実行
```

### 3. フロントエンドのみデプロイ
```
1. 「Actions」→「Production Frontend Deploy」を選択
2. 「Run workflow」→「YES - 本番環境にデプロイします」を選択
3. 実行
```

## URLの更新が必要な箇所

現在、以下のURLはプレースホルダーです。実際のAzureリソース作成後に更新が必要です：

### バックエンド
- App Service名: `shopifyapp-backend-prod` → 実際の名前に更新
- URL: `https://shopifyapp-backend-prod.azurewebsites.net` → 実際のURLに更新

### フロントエンド
- Static Web App URL: `https://shopify-ai-marketing-suite-prod.azurestaticapps.net` → 実際のURLに更新

## 環境変数の確認

### バックエンド（App Service）
App Service の「構成」→「アプリケーション設定」で以下を確認：
- `ConnectionStrings__DefaultConnection` - データベース接続文字列
- `Authentication__Shopify__ClientId` - Shopify API Key
- `Authentication__Shopify__ClientSecret` - Shopify API Secret
- `FrontendUrls__PrimaryUrl` - フロントエンドURL

### フロントエンド（Static Web Apps）
Static Web Apps の「構成」→「アプリケーション設定」で以下を確認：
- `NEXT_PUBLIC_API_URL` - バックエンドAPI URL
- `NEXT_PUBLIC_SHOPIFY_API_KEY` - Shopify API Key
- `NEXT_PUBLIC_SHOPIFY_APP_URL` - アプリURL

## セキュリティ考慮事項

1. **本番環境の確認ステップ**
   - すべての本番環境ワークフローには確認ステップがあります
   - 誤って本番環境にデプロイすることを防ぎます

2. **環境の分離**
   - 本番環境と開発環境のワークフローは完全に分離
   - 異なるSecretsを使用

3. **デプロイ権限**
   - GitHub の environment protection rules を使用
   - 本番環境へのデプロイには承認が必要（設定推奨）

## トラブルシューティング

### デプロイが失敗する場合
1. GitHub Secretsが正しく設定されているか確認
2. Azure リソースが起動しているか確認
3. ワークフローのログを確認

### Health checkが失敗する場合
1. Azure Portal でアプリケーションの状態を確認
2. Application Insightsでエラーログを確認
3. 接続文字列と環境変数を再確認

## 次のステップ

1. GitHub Secretsの設定
2. Azure リソースの実際のURLで更新
3. テストデプロイの実行
4. 本番環境へのデプロイ実行

---
更新日: 2025-12-22
作成者: 福田＋AI Assistant
