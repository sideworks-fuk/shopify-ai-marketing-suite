# GitHub Secrets 削除対象チェック結果

## 作成日: 2025-12-31

## 確認結果

現在使用中のワークフローファイル（4つ）で、削除対象のSecretは**使用されていません**。

### 確認したワークフローファイル
- ✅ `.github/workflows/develop_backend_fixed.yml`
- ✅ `.github/workflows/develop_frontend.yml`
- ✅ `.github/workflows/production_backend.yml`
- ✅ `.github/workflows/production_frontend.yml`

### 削除対象のSecretと使用状況

| Secret名 | 現在使用中のワークフロー | backup/draft内の使用 | 削除可否 |
|---------|----------------------|-------------------|---------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_ISLAND_08E0A6300` | ❌ 使用なし | ✅ `backup/azure-static-web-apps-white-island-08e0a6300.yml` | ✅ 削除可能 |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` | ❌ 使用なし | ✅ `backup/production_deploy_all.yml` | ✅ 削除可能 |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` | ❌ 使用なし | ✅ `backup/`, `draft/` 内の複数ファイル | ✅ 削除可能 |
| `AZUREAPPSERVICE_PUBLISHPROFILE` | ❌ 使用なし | ✅ `backup/develop_backend2.yml` | ✅ 削除可能 |
| `AZUREAPPSERVICE_PUBLISHPROFILE_C60B318531324C8F9CC369407A7D3DF7` | ❌ 使用なし | ✅ `backup/` 内の複数ファイル | ✅ 削除可能 |
| `AZUREAPPSERVICE_PUBLISHPROFILE_SHOPIFYTESTAPI` | ❌ 使用なし | ❌ 使用なし | ✅ 削除可能 |

## 注意事項

### backup/draft ディレクトリ内のファイル
削除対象のSecretは `backup/` や `draft/` ディレクトリ内のファイルで使用されていますが、これらは：
- バックアップファイル（過去のワークフロー）
- ドラフトファイル（未使用のワークフロー）

のため、削除対象のSecretを削除しても影響はありません。

### 現在使用中のSecret

#### Static Web Apps デプロイトークン
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` - Production1用
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2` - Production2用
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` - Production3用
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` - 開発環境用

#### App Service 発行プロファイル
- ✅ `AZURE_WEBAPP_PUBLISH_PROFILE_DEVELOP` - 開発環境用
- ✅ `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION` - 本番環境用

## 削除手順

1. **動作確認**
   - 新しいSecret名で正常に動作することを確認済み

2. **Secretの削除**
   - GitHub → Settings → Secrets and variables → Actions
   - 各Secretの削除アイコン（ゴミ箱）をクリック
   - 削除を確認

3. **削除対象のSecret（6つ）**
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_WHITE_ISLAND_08E0A6300`
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION`
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00`
   - `AZUREAPPSERVICE_PUBLISHPROFILE`
   - `AZUREAPPSERVICE_PUBLISHPROFILE_C60B318531324C8F9CC369407A7D3DF7`
   - `AZUREAPPSERVICE_PUBLISHPROFILE_SHOPIFYTESTAPI`

## 結論

✅ **すべての削除対象Secretは安全に削除可能です。**

現在使用中のワークフローファイルでは使用されておらず、backup/draft内のファイルでのみ使用されています。

## 削除完了（2025-12-31）

✅ **削除対象のSecret（6つ）はすべて削除が完了しました。**

現在残っているSecretは、すべて現在使用中のワークフローファイルで使用されているSecretのみです：
- `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT`
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1`
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2`
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3`
- `AZURE_WEBAPP_PUBLISH_PROFILE_DEVELOP`
- `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`

---

作成者: 福田＋AI Assistant
作成日: 2025-12-31
