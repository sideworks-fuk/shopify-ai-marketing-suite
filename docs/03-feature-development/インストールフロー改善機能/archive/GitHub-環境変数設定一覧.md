# GitHub 環境変数設定一覧

## 作成日
2025-12-26

## 概要

`develop_frontend.yml`で使用される環境変数の一覧と、GitHubに追加が必要な環境変数をまとめます。

---

## 📋 環境変数の分類

### 1. ✅ YML内で定義済み（追加不要）

以下の環境変数は`develop_frontend.yml`の`env`セクションで定義されています：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NODE_VERSION` | `'20.x'` | Node.jsバージョン |
| `APP_LOCATION` | `'/frontend'` | アプリケーションの場所 |
| `OUTPUT_LOCATION` | `'.next'` | ビルド成果物の場所 |
| `FRONTEND_BASE_URL` | `'https://brave-sea-038f17a00.1.azurestaticapps.net'` | フロントエンドのベースURL |

### 2. 🔐 GitHub Secrets（追加が必要）

以下のSecretsはGitHub Repository SecretsまたはEnvironment Secretsに設定する必要があります：

| Secret名 | 使用箇所 | 説明 |
|---------|---------|------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` | `env.AZURE_STATIC_WEB_APPS_API_TOKEN_SECRET` | Azure Static Web Appsのデプロイトークン |
| `NEXT_PUBLIC_DEV_PASSWORD` | `env.NEXT_PUBLIC_DEV_PASSWORD` | 開発環境用パスワード（環境別に設定可能） |

**注意**: `secrets.GITHUB_TOKEN`は自動提供されるため、設定不要です。

### 3. 📝 GitHub Environment Variables（追加が必要）

以下のVariablesは**各環境（`development`、`staging`、`production`）ごと**にGitHub Environment Variablesに設定する必要があります：

| Variable名 | 使用箇所 | 説明 | 設定例 |
|-----------|---------|------|--------|
| `NEXT_PUBLIC_API_URL` | `env.NEXT_PUBLIC_API_URL` | バックエンドAPIのURL | `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net` |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | `env.NEXT_PUBLIC_SHOPIFY_API_KEY` | Shopify API Key | `2d7e0e1f5da14eb9d299aa746738e44b` |
| `NEXT_PUBLIC_SHOPIFY_APP_URL` | `env.NEXT_PUBLIC_SHOPIFY_APP_URL` | Shopify App URL | `https://brave-sea-038f17a00-development.ea...` |
| `NEXT_PUBLIC_USE_HTTPS` | `env.NEXT_PUBLIC_USE_HTTPS` | HTTPS使用設定 | `true` |
| `NEXT_PUBLIC_DISABLE_FEATURE_GATES` | `env.NEXT_PUBLIC_DISABLE_FEATURE_GATES` | フィーチャーゲート無効化設定 | `false` |

### 4. 🔄 ステップ内で動的に生成（追加不要）

以下の値はワークフロー内のステップで動的に生成されるため、設定不要です：

| 変数名 | 生成元 | 説明 |
|--------|--------|------|
| `NEXT_PUBLIC_ENVIRONMENT` | `steps.env.outputs.next_public_environment` | 環境名（development/staging/production） |
| `deployment_environment` | `steps.env.outputs.deployment_environment` | Azure Static Web Appsのデプロイ環境名 |
| `frontend_url` | `steps.env.outputs.frontend_url` | フロントエンドのURL |

---

## 🎯 設定が必要な環境変数

### GitHub Repository Secrets

以下のSecretsを**Repository Secrets**に設定：

1. **`AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00`**
   - 取得方法: Azure Portal → Static Web Apps → 該当リソース → Deployment token
   - 説明: Azure Static Web Appsへのデプロイに必要なトークン

2. **`NEXT_PUBLIC_DEV_PASSWORD`**（オプション）
   - 説明: 開発環境用パスワード（必要に応じて設定）

### GitHub Environment Variables

以下のVariablesを**各環境（`development`、`staging`、`production`）ごと**に設定：

#### `development`環境

| Variable名 | 値の例 |
|-----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net` |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | `2d7e0e1f5da14eb9d299aa746738e44b` |
| `NEXT_PUBLIC_SHOPIFY_APP_URL` | `https://brave-sea-038f17a00-development.ea...` |
| `NEXT_PUBLIC_USE_HTTPS` | `true` |
| `NEXT_PUBLIC_DISABLE_FEATURE_GATES` | `true` |

#### `staging`環境

| Variable名 | 値の例 |
|-----------|--------|
| `NEXT_PUBLIC_API_URL` | ステージング環境のバックエンドURL |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | ステージング環境のShopify API Key |
| `NEXT_PUBLIC_SHOPIFY_APP_URL` | ステージング環境のShopify App URL |
| `NEXT_PUBLIC_USE_HTTPS` | `true` |
| `NEXT_PUBLIC_DISABLE_FEATURE_GATES` | `false` |

#### `production`環境

| Variable名 | 値の例 |
|-----------|--------|
| `NEXT_PUBLIC_API_URL` | 本番環境のバックエンドURL |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | 本番環境のShopify API Key |
| `NEXT_PUBLIC_SHOPIFY_APP_URL` | 本番環境のShopify App URL |
| `NEXT_PUBLIC_USE_HTTPS` | `true` |
| `NEXT_PUBLIC_DISABLE_FEATURE_GATES` | `false` |

---

## 📝 設定手順

### 1. GitHub Repository Secretsの設定

1. GitHubリポジトリの**Settings** → **Secrets and variables** → **Actions**に移動
2. **New repository secret**をクリック
3. 上記のSecretsを追加

### 2. GitHub Environment Variablesの設定

1. GitHubリポジトリの**Settings** → **Environments**に移動
2. 各環境（`development`、`staging`、`production`）を選択
3. **Add variable**をクリック
4. 上記のVariablesを追加

**重要**: 各環境で異なる値を設定してください。

---

## ✅ 確認チェックリスト

### Repository Secrets

- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00`が設定されている
- [ ] `NEXT_PUBLIC_DEV_PASSWORD`が設定されている（必要に応じて）

### Environment Variables（`development`環境）

- [ ] `NEXT_PUBLIC_API_URL`が設定されている
- [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY`が設定されている
- [ ] `NEXT_PUBLIC_SHOPIFY_APP_URL`が設定されている
- [ ] `NEXT_PUBLIC_USE_HTTPS`が設定されている
- [ ] `NEXT_PUBLIC_DISABLE_FEATURE_GATES`が設定されている

### Environment Variables（`staging`環境）

- [ ] `NEXT_PUBLIC_API_URL`が設定されている
- [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY`が設定されている
- [ ] `NEXT_PUBLIC_SHOPIFY_APP_URL`が設定されている
- [ ] `NEXT_PUBLIC_USE_HTTPS`が設定されている
- [ ] `NEXT_PUBLIC_DISABLE_FEATURE_GATES`が設定されている

### Environment Variables（`production`環境）

- [ ] `NEXT_PUBLIC_API_URL`が設定されている
- [ ] `NEXT_PUBLIC_SHOPIFY_API_KEY`が設定されている
- [ ] `NEXT_PUBLIC_SHOPIFY_APP_URL`が設定されている
- [ ] `NEXT_PUBLIC_USE_HTTPS`が設定されている
- [ ] `NEXT_PUBLIC_DISABLE_FEATURE_GATES`が設定されている

---

## 🔗 関連ドキュメント

- [GitHub-Actions-環境変数設定改善案.md](./GitHub-Actions-環境変数設定改善案.md)
- [Phase1-テスト手順.md](./Phase1-テスト手順.md)

---

## 📝 更新履歴

- 2025-12-26: 初版作成
