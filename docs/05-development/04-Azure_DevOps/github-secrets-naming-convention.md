# GitHub Secrets 命名規則

## 作成日: 2025-12-31

## 概要

GitHub Secretsの命名規則を統一し、環境とリソースの対応を明確にします。

## 命名規則

### Static Web Apps デプロイトークン

#### 本番環境（Production）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` - Production1 (ec-ranger-frontend-prod-1)
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2` - Production2 (ec-ranger-frontend-prod-2)
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` - Production3 (ec-ranger-frontend-prod-3)

#### 開発環境（Development）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` - 開発環境 (brave-sea-038f17a00)
  - **注意**: 開発環境リソース内の3種類の環境（development、staging、production）は、同じStatic Web Appsリソース内の環境のため、デプロイトークンは1つで共通です
  - 環境の切り替えは `deployment_environment` パラメータで行います

## 変更履歴

### 2025-12-31: 命名規則統一

**変更前:**
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` → Production1用
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2` → Production2用（変更なし）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` → Production3用（変更なし）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` → 開発環境用

**変更後:**
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` → Production1用
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2` → Production2用（変更なし）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` → Production3用（変更なし）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` → 開発環境用

## 移行手順 ✅ 完了（2025-12-31）

### 1. 新しいSecretの作成 ✅ 完了
1. GitHub → Settings → Secrets and variables → Actions
2. 「New repository secret」をクリック
3. 以下のSecretを作成：
   - ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1`（作成済み）
   - ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT`（作成済み）

### 2. ワークフローファイルの更新 ✅ 完了
- ✅ `.github/workflows/production_frontend.yml` - Production1のSecret名を更新済み
- ✅ `.github/workflows/develop_frontend.yml` - DevelopmentのSecret名を更新済み

### 3. 動作確認 ✅ 完了
- ✅ 各環境へのデプロイを実行して動作確認済み

### 4. 古いSecretの削除 ✅ 完了（2025-12-31）

以下のSecretは不要なため削除してください：

#### Static Web Apps デプロイトークン（古い命名規則）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` → `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` に変更済み
- `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` → `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` に変更済み
- `AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_ISLAND_08E0A6300` → 使用されていない（古いリソース名）

#### App Service 発行プロファイル（古い命名規則）
- `AZUREAPPSERVICE_PUBLISHPROFILE` → 使用されていない
- `AZUREAPPSERVICE_PUBLISHPROFILE_C60B318531324C8F9CC369407A7D3DF7` → 使用されていない
- `AZUREAPPSERVICE_PUBLISHPROFILE_SHOPIFYTESTAPI` → 使用されていない

**注意**: 削除前に、新しいSecret名で正常に動作することを確認してください。

## 環境マッピング

### 本番環境（Production）
| 環境 | リソース名 | Secret名 | アプリ名 |
|------|-----------|---------|---------|
| Production1 | ec-ranger-frontend-prod-1 | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` | EC Ranger |
| Production2 | ec-ranger-frontend-prod-2 | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2` | EC Ranger-xn-fbkq6e5da0fpb |
| Production3 | ec-ranger-frontend-prod-3 | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` | EC Ranger-demo |

### 開発環境（Development）
| 環境 | リソース名 | Secret名 | 備考 |
|------|-----------|---------|------|
| development | brave-sea-038f17a00 | `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` | 同じリソース内の環境 |
| staging | brave-sea-038f17a00 | `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` | 同じリソース内の環境 |
| production | brave-sea-038f17a00 | `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` | 同じリソース内の環境 |

**注意**: 開発環境（brave-sea-038f17a00）内の3種類の環境は、同じStatic Web Appsリソース内の環境のため、デプロイトークンは1つで共通です。環境の切り替えはワークフローの `deployment_environment` パラメータで行います。

## 現在使用中のSecret一覧 ✅ 整理完了（2025-12-31）

現在、GitHub Secretsには以下の6つのSecretのみが残っています（すべて現在使用中）：

### Static Web Apps デプロイトークン
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` - Production1用
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2` - Production2用
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` - Production3用
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` - 開発環境用（development/staging/production共通）

### App Service 発行プロファイル
- ✅ `AZURE_WEBAPP_PUBLISH_PROFILE_DEVELOP` - 開発環境用
- ✅ `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION` - 本番環境用

## 削除対象のSecret（不要）✅ 削除完了

以下のSecretは使用されていないため、削除を推奨していましたが、**2025-12-31に削除が完了しました**。

### Static Web Apps デプロイトークン（古い命名規則）
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` → 削除完了（`AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` に変更済み）
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` → 削除完了（`AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` に変更済み）
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_ISLAND_08E0A6300` → 削除完了（使用されていない）

### App Service 発行プロファイル（古い命名規則）
- ✅ `AZUREAPPSERVICE_PUBLISHPROFILE` → 削除完了
- ✅ `AZUREAPPSERVICE_PUBLISHPROFILE_C60B318531324C8F9CC369407A7D3DF7` → 削除完了
- ✅ `AZUREAPPSERVICE_PUBLISHPROFILE_SHOPIFYTESTAPI` → 削除完了

**削除確認**: 現在使用中のワークフローファイル（4つ）で削除対象のSecretは使用されていないことを確認済み。詳細は [GitHub Secrets 削除対象チェック結果](./github-secrets-cleanup-check.md) を参照してください。

---

作成者: 福田＋AI Assistant
作成日: 2025-12-31
