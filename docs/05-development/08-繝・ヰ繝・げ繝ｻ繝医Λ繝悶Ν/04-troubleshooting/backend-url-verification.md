# バックエンドURL確認手順

## 問題
フロントエンドからバックエンドAPIへの接続で `DNS_PROBE_FINISHED_NXDOMAIN` エラーが発生。

## 原因の可能性
1. Azure Static Web Appsの環境変数 `NEXT_PUBLIC_API_URL` が誤っている
2. ワークフローファイルのURLが誤っている
3. 実際のApp ServiceのURLが異なる

## 確認手順

### 1. 実際のApp Service URLを確認

Azure Portal → App Service → `ec-ranger-backend-prod` → 概要

**正しいURLを確認してください：**
```
https://ec-ranger-backend-prod-XXXXXXXX.japanwest-01.azurewebsites.net
```

### 2. Azure Static Web Appsの環境変数を確認・修正

Azure Portal → Static Web Apps → `white-island-08e0a6300` → 構成 → アプリケーション設定

**`NEXT_PUBLIC_API_URL` を確認：**

現在の値が間違っている場合：
```
❌ 誤り: https://ec-ranger-backend-prod-ghf3bbargbc4hfgh.japanwest-01.azurewebsites.net
```

正しい値に修正（上記1で確認したURLを使用）：
```
✅ 正しい: https://ec-ranger-backend-prod-XXXXXXXX.japanwest-01.azurewebsites.net
```

### 3. GitHub Actionsワークフローファイルを確認・修正

以下のファイルを確認し、URLを修正：

1. `.github/workflows/production_frontend.yml` (63行目)
2. `.github/workflows/production_deploy_all.yml` (155行目)
3. `.github/workflows/production_backend.yml` (23行目)

### 4. 再デプロイ

環境変数を修正した後：

1. Azure Static Web Appsの環境変数を保存（自動再起動）
2. 必要に応じて、GitHub Actionsでフロントエンドを再デプロイ

## 確認用コマンド

ブラウザのコンソールで以下を実行して、現在のAPI URLを確認：

```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
// または
console.log('Config:', window.location.origin);
```

## 関連ドキュメント
- `production-environment-summary.md` - 本番環境構成サマリー
- `azure-app-service-env-setup.md` - App Service環境変数設定
- `production_frontend.yml` - フロントエンドデプロイワークフロー

