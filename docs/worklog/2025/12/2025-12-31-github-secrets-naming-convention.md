# 作業ログ: GitHub Secrets 命名規則の統一

## 作業情報
- 開始日時: 2025-12-31 17:35:00
- 完了日時: 2025-12-31 17:45:00
- 所要時間: 10分
- 担当: 福田＋AI Assistant

## 作業概要
GitHub Secretsのデプロイトークン名を統一し、環境とリソースの対応を明確にしました。

## 実施内容

### 1. 命名規則の策定
- 本番環境: `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_{番号}` 形式に統一
- 開発環境: `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` に統一

### 2. ワークフローファイルの更新
- `.github/workflows/production_frontend.yml`
  - Production1のSecret名を `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` → `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` に変更
  - コメントに命名規則を明記

- `.github/workflows/develop_frontend.yml`
  - DevelopmentのSecret名を `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` → `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` に変更
  - コメントに命名規則を明記

### 3. ドキュメントの作成・更新
- `docs/05-development/04-Azure_DevOps/github-secrets-naming-convention.md`（新規作成）
  - 命名規則の詳細
  - 環境マッピング表
  - 移行手順

- `docs/05-development/04-Azure_DevOps/production-environment-summary.md`
  - Production1のSecret名を更新
  - 命名規則ドキュメントへのリンクを追加

- `docs/05-development/04-Azure_DevOps/Static_Web_Apps/production3-github-secrets-setup.md`
  - 命名規則ドキュメントへのリンクを追加

## 成果物

### 更新ファイル
- `.github/workflows/production_frontend.yml`
- `.github/workflows/develop_frontend.yml`
- `docs/05-development/04-Azure_DevOps/production-environment-summary.md`
- `docs/05-development/04-Azure_DevOps/Static_Web_Apps/production3-github-secrets-setup.md`

### 新規作成ファイル
- `docs/05-development/04-Azure_DevOps/github-secrets-naming-convention.md`

## 命名規則

### Static Web Apps デプロイトークン

| 環境 | リソース名 | 旧Secret名 | 新Secret名 |
|------|-----------|-----------|-----------|
| Production1 | ec-ranger-frontend-prod-1 | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1` |
| Production2 | ec-ranger-frontend-prod-2 | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2` | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_2`（変更なし） |
| Production3 | ec-ranger-frontend-prod-3 | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3` | `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_3`（変更なし） |
| Development | brave-sea-038f17a00 | `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` | `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT` |

## 次のステップ

### 1. 新しいSecretの作成
1. GitHub → Settings → Secrets and variables → Actions
2. 「New repository secret」をクリック
3. 以下のSecretを作成：
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION_1`
     - 既存の `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` の値をコピー
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_DEVELOPMENT`
     - 既存の `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` の値をコピー

### 2. 動作確認
- Production1へのデプロイを実行して動作確認
- Development環境へのデプロイを実行して動作確認

### 3. 古いSecretの削除（動作確認後）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION`（Production1用の古い名前）
- `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00`（Development用の古い名前）

## 課題・注意点

### 重要事項
- **新しいSecretを作成してから動作確認**: 古いSecretを削除する前に、新しいSecretで動作確認を行ってください
- **移行期間**: 古いSecretと新しいSecretを一時的に併存させることを推奨します

### トラブルシューティング
- デプロイが失敗する場合: 新しいSecretが正しく作成されているか確認
- Secretが見つからないエラー: ワークフローファイルのSecret名が正しいか確認

## 関連ファイル
- `.github/workflows/production_frontend.yml`
- `.github/workflows/develop_frontend.yml`
- `docs/05-development/04-Azure_DevOps/github-secrets-naming-convention.md`
- `docs/05-development/04-Azure_DevOps/production-environment-summary.md`

---

作成者: 福田＋AI Assistant
作成日: 2025-12-31
