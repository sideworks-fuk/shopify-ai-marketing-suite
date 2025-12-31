# Production3 GitHub Secrets 設定手順

## 作成日: 2025-12-31

## 概要

本ドキュメントは、Production3環境用のGitHub SecretsとVariablesの設定手順を記載します。

## 前提条件

- GitHub リポジトリへの管理者権限
- Azure Portal へのアクセス権限
- Shopify Partners Dashboard へのアクセス権限

## 必要な Secrets/Variables

### 1. Azure Static Web Apps デプロイトークン

#### 取得方法

1. **Azure Portal にログイン**
   - https://portal.azure.com

2. **Static Web Apps リソース（ec-ranger-frontend-prod-3）を選択**

3. **「管理」→「デプロイトークン」を開く**

4. **「デプロイトークン」をコピー**

#### GitHub Secrets への設定

1. **GitHub リポジトリにアクセス**
   - https://github.com/[組織名]/shopify-ai-marketing-suite

2. **「Settings」→「Secrets and variables」→「Actions」を開く**

3. **「New repository secret」をクリック**

4. **以下を入力**:
   - **Name**: `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3`
   - **Secret**: [コピーしたデプロイトークン]

5. **「Add secret」をクリック**

### 2. Shopify API Key

#### 取得方法

1. **Shopify Partners Dashboard にログイン**
   - https://partners.shopify.com

2. **対象のアプリを選択**

3. **「App setup」→「Client credentials」を開く**

4. **「Client ID」をコピー**（Production3用のアプリがある場合）

#### GitHub Secrets への設定

1. **GitHub リポジトリにアクセス**

2. **「Settings」→「Secrets and variables」→「Actions」を開く**

3. **「New repository secret」をクリック**

4. **以下を入力**:
   - **Name**: `SHOPIFY_API_KEY_PRODUCTION_3`
   - **Secret**: [Shopify API Key（Client ID）]

5. **「Add secret」をクリック**

### 3. GitHub Environment Variables（オプション）

Secrets の代わりに、Environment Variables として設定することも可能です。

#### 設定方法

1. **GitHub リポジトリにアクセス**

2. **「Settings」→「Environments」→「ec-ranger-prod」を開く**

3. **「Variables」タブを選択**

4. **「Add variable」をクリック**

5. **以下を追加**:
   - **Name**: `SHOPIFY_API_KEY_PRODUCTION_3`
   - **Value**: [Shopify API Key]

6. **「Add variable」をクリック**

## 設定一覧

### Repository Secrets

| Secret名 | 説明 | 取得元 |
|---------|------|--------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` | Azure Static Web Apps デプロイトークン | Azure Portal → Static Web Apps → 管理 → デプロイトークン |
| `SHOPIFY_API_KEY_PRODUCTION_3` | Shopify API Key（Client ID） | Shopify Partners Dashboard |

### Environment Variables（オプション）

| Variable名 | 説明 | 取得元 |
|-----------|------|--------|
| `SHOPIFY_API_KEY_PRODUCTION_3` | Shopify API Key（Client ID） | Shopify Partners Dashboard |

## ワークフローでの参照方法

### Secrets の参照

```yaml
env:
  AZURE_STATIC_WEB_APPS_API_TOKEN_SECRET_PROD3: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3 }}
  PROD3_SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY_PRODUCTION_3 || vars.SHOPIFY_API_KEY_PRODUCTION_3 }}
```

### Variables の参照

```yaml
env:
  PROD3_SHOPIFY_API_KEY: ${{ vars.SHOPIFY_API_KEY_PRODUCTION_3 }}
```

## 確認方法

### Secrets の確認

1. **GitHub リポジトリにアクセス**

2. **「Settings」→「Secrets and variables」→「Actions」を開く**

3. **「Repository secrets」タブで以下を確認**:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` が存在するか
   - `SHOPIFY_API_KEY_PRODUCTION_3` が存在するか

### Variables の確認

1. **GitHub リポジトリにアクセス**

2. **「Settings」→「Environments」→「ec-ranger-prod」を開く**

3. **「Variables」タブで以下を確認**:
   - `SHOPIFY_API_KEY_PRODUCTION_3` が存在するか

## トラブルシューティング

### Secret が見つからないエラー

**症状**: ワークフロー実行時に `Context access might be invalid` 警告が表示される

**原因**: Secret が設定されていない、または名前が間違っている

**対処法**:
1. GitHub → Settings → Secrets and variables → Actions で Secret が正しく設定されているか確認
2. ワークフローファイルの Secret 名が正しいか確認

### デプロイが失敗する

**症状**: デプロイステップで 401 Unauthorized エラーが発生

**原因**: デプロイトークンが無効、または権限が不足している

**対処法**:
1. Azure Portal → Static Web Apps → 管理 → デプロイトークンを再生成
2. GitHub Secrets の `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` を更新

## セキュリティ注意事項

1. **Secrets は絶対にコミットしない**
   - `.gitignore` に `.env*` を追加
   - コード内に直接記述しない

2. **定期的なローテーション**
   - デプロイトークンは定期的に再生成
   - API Key は必要に応じて更新

3. **最小権限の原則**
   - 必要な権限のみを付与
   - 不要な Secrets は削除

## 関連ドキュメント

- [Production3 Static Web Apps セットアップ手順](./production3-static-web-app-setup.md)
- [本番環境構成サマリー](../production-environment-summary.md)
- [GitHub Secrets命名規則](../github-secrets-naming-convention.md)
- [GitHub Actions ワークフロー設定](../../../../.github/workflows/production_frontend.yml)

---

作成者: 福田＋AI Assistant
作成日: 2025-12-31
