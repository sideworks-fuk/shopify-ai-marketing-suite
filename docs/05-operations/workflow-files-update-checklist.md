# ワークフローファイル修正チェックリスト

## 修正完了項目

### ✅ バックエンドワークフロー（backend-deploy-with-environments.yml）

#### 環境名の修正
- [x] `Production` → `main`
- [x] `Staging` → `staging`
- [x] `Development` → `develop`

#### Secrets名の修正
- [x] `AZUREAPPSERVICE_PUBLISHPROFILE_PRODUCTION` → `AZUREAPPSERVICE_PUBLISHPROFILE_MAIN`
- [x] `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING` → `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING`（変更なし）
- [x] `AZUREAPPSERVICE_PUBLISHPROFILE_C60B318531324C8F9CC369407A7D3DF7` → `AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP`

#### デプロイステップ名の修正
- [x] `Deploy to Azure Web App (Production)` → `Deploy to Azure Web App (main)`
- [x] `Deploy to Azure Web App (Staging)` → `Deploy to Azure Web App (staging)`
- [x] `Deploy to Azure Web App (Development)` → `Deploy to Azure Web App (develop)`

### ✅ フロントエンドワークフロー（frontend-deploy-with-environments.yml）

#### 環境名の修正
- [x] `Production` → `main`
- [x] `Staging` → `staging`
- [x] `Development` → `develop`

## 統一された環境名マッピング

| ブランチ名 | 環境名 | 用途 | Azure App Service |
|-----------|--------|------|------------------|
| `main` | `main` | 本番環境 | `shopifyapp-backend-production` |
| `staging` | `staging` | ステージング環境 | `shopifyapp-backend-staging` |
| `develop` | `develop` | 開発環境 | `shopifyapp-backend-develop` |

## 必要なGitHub設定

### 1. GitHub Environmentsの作成
以下の環境をGitHubリポジトリのSettings → Environmentsで作成：

- [ ] `main`環境
- [ ] `staging`環境
- [ ] `develop`環境

### 2. Repository Secretsの更新
以下のSecretsをGitHubリポジトリのSettings → Secrets and variables → Actionsで設定：

- [ ] `AZUREAPPSERVICE_PUBLISHPROFILE_MAIN`
- [ ] `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING`
- [ ] `AZUREAPPSERVICE_PUBLISHPROFILE_DEVELOP`

### 3. 環境別Secretsの設定
各環境で以下のSecretsを設定：

#### main環境
- [ ] `API_URL` = `https://shopifyapp-backend-production.japanwest-01.azurewebsites.net`

#### staging環境
- [ ] `API_URL` = `https://shopifyapp-backend-staging.japanwest-01.azurewebsites.net`

#### develop環境
- [ ] `API_URL` = `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`

## 保護ルールの設定

### main環境（本番）
- [ ] Required reviewers: 1人以上
- [ ] Wait timer: 5分
- [ ] Deployment branches: mainブランチのみ

### staging環境（ステージング）
- [ ] Required reviewers: なし（自動デプロイ）
- [ ] Wait timer: なし
- [ ] Deployment branches: stagingブランチのみ

### develop環境（開発）
- [ ] Required reviewers: なし（自動デプロイ）
- [ ] Wait timer: なし
- [ ] Deployment branches: developブランチのみ

## 動作確認項目

### 1. 自動デプロイの確認
- [ ] mainブランチへのプッシュでmain環境にデプロイ
- [ ] stagingブランチへのプッシュでstaging環境にデプロイ
- [ ] developブランチへのプッシュでdevelop環境にデプロイ

### 2. 手動デプロイの確認
- [ ] workflow_dispatchでmain環境へのデプロイ
- [ ] workflow_dispatchでstaging環境へのデプロイ
- [ ] workflow_dispatchでdevelop環境へのデプロイ

### 3. 環境変数の確認
- [ ] 各環境で正しいAPI_URLが設定されているか
- [ ] バックエンドで正しいpublish profileが使用されているか

## 注意事項

- **既存のSecrets**: 古いSecrets名は削除する前に新しいSecretsが正常に動作することを確認
- **ダウンタイム**: 設定変更中はデプロイを一時停止
- **テスト**: 各環境での動作確認を必ず実施
- **ドキュメント**: チーム全体で新しい設定を共有

## トラブルシューティング

### よくある問題
1. **環境が見つからない**: GitHub Environmentsで環境名が正確に設定されているか確認
2. **Secretsが読み込まれない**: Secrets名がワークフローファイルと一致しているか確認
3. **デプロイが失敗する**: publish profileが正しく設定されているか確認
4. **環境変数が適用されない**: 環境別のSecretsが正しく設定されているか確認 