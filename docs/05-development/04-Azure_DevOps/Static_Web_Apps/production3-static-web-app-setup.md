# Production3 Static Web Apps セットアップ手順

## 作成日: 2025-12-31

## 概要

本ドキュメントは、本番環境フロントエンドの3つ目の環境（Production3）として、Azure Static Web Apps リソースを作成・設定する手順を記載します。

## 前提条件

- Azure Portal へのアクセス権限
- リソースグループ `ec-ranger-prod` へのアクセス権限
- GitHub リポジトリへの Secrets 設定権限

## 手順

### 1. Azure Static Web Apps リソースの作成

#### 1.1 Azure Portal での作成

1. **Azure Portal にログイン**
   - https://portal.azure.com

2. **「リソースの作成」をクリック**

3. **「Static Web Apps」を検索して選択**

4. **「作成」をクリック**

5. **基本設定を入力**:

```yaml
基本設定:
  サブスクリプション: [お使いのサブスクリプション]
  リソースグループ: ec-ranger-prod（既存のものを選択）
  
インスタンスの詳細:
  名前: ec-ranger-frontend-prod-3
  プランの種類: Standard（本番環境のため）
  リージョン: East Asia（または Japan East）
  
デプロイの詳細:
  デプロイ方法: GitHub
  サインイン: [GitHubアカウントでサインイン]
  組織: [GitHub組織名]
  リポジトリ: shopify-ai-marketing-suite
  ブランチ: develop（または main）
  
ビルドの詳細:
  ビルドプリセット: Next.js
  アプリケーションの場所: /frontend
  API の場所: （空欄）
  出力場所: .next
```

6. **「確認および作成」→「作成」をクリック**

#### 1.2 リソース作成後の確認

1. **作成された Static Web Apps リソースを開く**

2. **「概要」タブで以下を確認**:
   - **URL**: `https://[リソース名]-[ランダム文字列].2.azurestaticapps.net`
   - このURLをメモしておく（後でワークフローに設定）

3. **「デプロイトークン」を取得**:
   - 「管理」→「デプロイトークン」を開く
   - 「デプロイトークン」をコピー
   - このトークンを GitHub Secrets に設定する（後述）

### 2. 環境変数の設定

#### 2.1 Azure Portal での設定

1. **Static Web Apps リソース（ec-ranger-frontend-prod-3）を選択**

2. **「構成」→「アプリケーション設定」を開く**

3. **以下の環境変数を追加**:

```plaintext
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_API_URL=https://ec-ranger-backend-prod-ghf3bbarghcwh4gn.japanwest-01.azurewebsites.net
NEXT_PUBLIC_SHOPIFY_API_KEY=[Production3用のShopify API Key]
NEXT_PUBLIC_USE_HTTPS=true
NEXT_PUBLIC_DISABLE_FEATURE_GATES=false
```

4. **「保存」をクリック**

### 3. GitHub Secrets の設定

#### 3.1 GitHub リポジトリに Secrets を追加

1. **GitHub リポジトリにアクセス**
   - https://github.com/[組織名]/shopify-ai-marketing-suite

2. **「Settings」→「Secrets and variables」→「Actions」を開く**

3. **以下の Secrets を追加**:

| Secret名 | 値 | 取得方法 |
|---------|-----|----------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` | [デプロイトークン] | Azure Portal → Static Web Apps → 管理 → デプロイトークン |
| `SHOPIFY_API_KEY_PRODUCTION_3` | [Shopify API Key] | Shopify Partners Dashboard |

#### 3.2 GitHub Environment の設定（オプション）

`ec-ranger-prod` Environment に Variables として設定することも可能です。

1. **「Settings」→「Environments」→「ec-ranger-prod」を開く**

2. **「Variables」タブで以下を追加**:

| Variable名 | 値 |
|-----------|-----|
| `SHOPIFY_API_KEY_PRODUCTION_3` | [Shopify API Key] |

### 4. ワークフローファイルの更新

#### 4.1 URL の更新

`.github/workflows/production_frontend.yml` の `PROD3_FRONTEND_URL` を実際のURLに更新:

```yaml
PROD3_FRONTEND_URL: 'https://[実際のURL].2.azurestaticapps.net'
```

### 5. 動作確認

#### 5.1 デプロイの実行

1. **GitHub Actions でワークフローを実行**
   - 「Actions」タブ → 「Production Frontend Deploy」を選択
   - 「Run workflow」をクリック
   - `target_environment` に `Production3` を選択
   - `confirm_production` に `YES - 本番環境にデプロイします` を選択
   - 「Run workflow」をクリック

2. **デプロイの完了を待つ**（約5-10分）

#### 5.2 ヘルスチェック

1. **ブラウザで Production3 のURLにアクセス**
   - `https://[Production3のURL]`

2. **期待される結果**:
   - 200 OK または 401 Unauthorized（認証が必要な場合）
   - アプリケーションが正常に表示される

## チェックリスト

### リソース作成
- [ ] Azure Static Web Apps リソース（ec-ranger-frontend-prod-3）作成
- [ ] リソースURLの確認とメモ

### 設定
- [ ] 環境変数の設定（Azure Portal）
- [ ] GitHub Secrets の設定
  - [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3`
  - [ ] `SHOPIFY_API_KEY_PRODUCTION_3`
- [ ] ワークフローファイルのURL更新

### デプロイ・確認
- [ ] GitHub Actions でのデプロイ実行
- [ ] デプロイの成功確認
- [ ] ヘルスチェックの実施
- [ ] アプリケーションの動作確認

## トラブルシューティング

### デプロイが失敗する場合

1. **デプロイトークンの確認**
   - Azure Portal → Static Web Apps → 管理 → デプロイトークンが正しく設定されているか確認

2. **GitHub Secrets の確認**
   - GitHub → Settings → Secrets and variables → Actions で Secrets が正しく設定されているか確認

3. **ワークフローログの確認**
   - GitHub Actions のログを確認してエラー内容を特定

### 環境変数が反映されない場合

1. **Azure Portal での設定確認**
   - 構成 → アプリケーション設定で環境変数が正しく設定されているか確認

2. **デプロイ後の再起動**
   - 環境変数変更後は再デプロイが必要な場合があります

## 関連ドキュメント

- [本番環境構成サマリー](../production-environment-summary.md)
- [GitHub Secrets設定手順](./production3-github-secrets-setup.md)
- [Azure Static Web Apps環境変数設定](../デプロイメント/azure-static-web-apps-environment-variables.md)

---

作成者: 福田＋AI Assistant
作成日: 2025-12-31
