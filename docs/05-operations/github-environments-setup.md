# GitHub Environments設定ガイド

## 概要
GitHub Environmentsを使用して環境別にSecretsを管理し、適切な環境変数を設定する方法について説明します。

## GitHub Environmentsの利点

### 1. 環境分離
- 各環境（Production、Development、Preview）で独立したSecrets管理
- 環境別の保護ルール設定
- デプロイ履歴の環境別管理

### 2. セキュリティ強化
- 環境別のアクセス制御
- 承認フローの設定
- 機密情報の環境別管理

## 環境設定

### Production環境
**用途**: 本番環境へのデプロイ
**ブランチ**: `main`
**Secrets設定**:
```
API_URL = https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net
DEBUG_API = https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
VERCEL_TOKEN = your_production_vercel_token
VERCEL_ORG_ID = your_org_id
VERCEL_PROJECT_ID = your_production_project_id
```

### Development環境
**用途**: ステージング環境へのデプロイ
**ブランチ**: `develop`
**Secrets設定**:
```
API_URL = https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
DEBUG_API = https://localhost:7088
VERCEL_TOKEN = your_staging_vercel_token
VERCEL_ORG_ID = your_org_id
VERCEL_PROJECT_ID = your_staging_project_id
```

### Preview環境
**用途**: プルリクエスト時のプレビューデプロイ
**ブランチ**: 全ブランチ（PR時）
**Secrets設定**:
```
API_URL = https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
DEBUG_API = https://localhost:7088
VERCEL_TOKEN = your_preview_vercel_token
VERCEL_ORG_ID = your_org_id
VERCEL_PROJECT_ID = your_preview_project_id
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

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: Production  # 環境名を指定
    if: github.ref == 'refs/heads/main'
    
    steps:
    # ... ビルドステップ
    - name: Build application
      env:
        NEXT_PUBLIC_BUILD_ENVIRONMENT: production
        NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}  # 環境別Secrets
        NEXT_PUBLIC_DEBUG_API: ${{ secrets.DEBUG_API }}
      run: npm run build
```

## 環境別の動作

### ブランチ別の自動切り替え

| ブランチ/イベント | 環境 | デプロイ先 | API接続先 |
|------------------|------|-----------|----------|
| `main` | Production | 本番環境 | 本番API |
| `develop` | Development | ステージング環境 | ステージングAPI |
| プルリクエスト | Preview | プレビュー環境 | ステージングAPI |

### 環境変数の自動設定

```yaml
# mainブランチ → Production環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: production
NEXT_PUBLIC_API_URL: https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net

# developブランチ → Development環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: staging
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net

# プルリクエスト → Preview環境
NEXT_PUBLIC_BUILD_ENVIRONMENT: preview
NEXT_PUBLIC_API_URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
```

## 保護ルールの設定

### Production環境の保護ルール
```
✅ Required reviewers: 1人以上
✅ Wait timer: 5分
✅ Deployment branches: mainブランチのみ
```

### Development環境の保護ルール
```
✅ Required reviewers: なし（自動デプロイ）
✅ Wait timer: なし
✅ Deployment branches: developブランチのみ
```

### Preview環境の保護ルール
```
✅ Required reviewers: なし（自動デプロイ）
✅ Wait timer: なし
✅ Deployment branches: 全ブランチ
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
- 本番環境は必ず承認フローを設定
- ステージング環境は自動デプロイ
- プレビュー環境は軽量な設定

### 2. セキュリティ
- 機密情報は必ずSecretsで管理
- 環境別に異なるトークンを使用
- 定期的なSecretsのローテーション

### 3. 監視
- デプロイ履歴の定期的な確認
- 環境別のログ監視
- エラー通知の設定 