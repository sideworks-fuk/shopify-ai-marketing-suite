# GitHub手動デプロイガイド

## 概要
GitHub Actionsを使用して、GitHub画面上から手動でデプロイを実行する方法を説明します。

## デプロイ方法

### 1. GitHub画面上からの手動デプロイ

#### フロントエンド（Next.js）のデプロイ
1. **GitHubリポジトリにアクセス**
   - https://github.com/[ユーザー名]/shopify-ai-marketing-suite

2. **Actionsタブを開く**
   - リポジトリの「Actions」タブをクリック

3. **ワークフローを選択**
   - 左側のメニューから「Azure Static Web Apps CI/CD (Development)」を選択

4. **手動実行**
   - 「Run workflow」ボタンをクリック
   - 以下の設定を入力：
     - **Branch**: `develop`（デフォルト）
     - **Environment**: `development` または `staging`
     - **Force rebuild**: `false`（必要に応じて`true`）

5. **デプロイ実行**
   - 「Run workflow」ボタンをクリックしてデプロイを開始

#### バックエンド（.NET）のデプロイ
1. **Actionsタブでワークフローを選択**
   - 「Build and deploy ShopifyTestApi」を選択

2. **手動実行**
   - 「Run workflow」ボタンをクリック
   - 設定を入力：
     - **Environment**: `development`
     - **Force rebuild**: `false`

3. **デプロイ実行**
   - 「Run workflow」ボタンをクリック

### 2. デプロイ状況の確認

#### リアルタイム監視
- Actionsタブで実行中のワークフローをクリック
- 各ステップの実行状況を確認
- ログを確認してエラーがないかチェック

#### デプロイ完了後の確認
- **フロントエンド**: https://[your-static-web-app-url]
- **バックエンド**: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/

### 3. 自動デプロイの確認

#### フロントエンド
- `develop`ブランチに`frontend/**`の変更をプッシュすると自動デプロイ
- プルリクエスト作成時にも自動デプロイ

#### バックエンド
- `develop`ブランチに`backend/**`の変更をプッシュすると自動デプロイ

## トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイが失敗する場合
```bash
# ローカルでビルドテスト
cd frontend
npm install
npm run build

# バックエンドの場合
cd backend/ShopifyTestApi
dotnet build
dotnet publish
```

#### 2. 環境変数の問題
- GitHub Secretsの設定を確認
- Azure Static Web Appsのトークンが有効か確認

#### 3. パッケージの依存関係エラー
```bash
# フロントエンド
rm -rf node_modules package-lock.json
npm install

# バックエンド
dotnet restore --force
```

### デプロイログの確認方法

#### フロントエンドデプロイログ
```yaml
# 成功時のログ例
✅ デプロイ完了: https://your-app.azurestaticapps.net
🌐 環境: development
📦 ビルドID: 12345
```

#### バックエンドデプロイログ
```yaml
# 成功時のログ例
✅ バックエンドデプロイ完了
🌐 環境: development
🔗 URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/
👤 実行者: username
📅 実行日時: 2025-07-25 15:30:00
```

## セキュリティ考慮事項

### 1. アクセス権限
- デプロイ権限を持つユーザーのみが手動デプロイを実行可能
- 環境別の権限設定を推奨

### 2. シークレット管理
- Azure Static Web Apps API トークン
- Azure App Service 発行プロファイル
- その他の機密情報はGitHub Secretsで管理

### 3. 環境分離
- Development環境とStaging環境を分離
- 本番環境へのデプロイは慎重に実行

## ベストプラクティス

### 1. デプロイ前の確認
- ローカルでのビルドテスト
- コードレビューの完了
- テストの実行

### 2. デプロイ後の確認
- アプリケーションの動作確認
- ログの確認
- パフォーマンスの監視

### 3. ロールバック手順
- 前回のデプロイに戻す方法を事前に確認
- データベースのバックアップ

## 関連ファイル
- `.github/workflows/develop_frontend.yml`
- `.github/workflows/develop_backend.yml`
- `frontend/package.json`
- `backend/ShopifyTestApi/ShopifyTestApi.csproj`

---

**注意**: 本番環境へのデプロイは、十分なテストとレビューを経てから実行してください。 