# ec-ranger-prod Environment 変数設定

## Environment Secrets（設定済み）✅
- `SHOPIFY_API_KEY_PRODUCTION`
- `SHOPIFY_API_SECRET_PRODUCTION`

## Environment Variables（追加必要）

### 1. `NEXT_PUBLIC_API_URL` 🔴
**値**: `https://ec-ranger-backend-prod-ghf3bbargbc4hfgh.japanwest-01.azurewebsites.net`
**説明**: バックエンドAPIのURL

### 2. `NEXT_PUBLIC_SHOPIFY_APP_URL` 🔴
**値**: `https://white-island-08e0a6300-2.azurestaticapps.net`
**説明**: フロントエンドのURL

### 3. `NEXT_PUBLIC_DISABLE_FEATURE_GATES` 🟡
**値**: `false`
**説明**: 本番環境では機能制限を無効化

### 4. `NEXT_PUBLIC_USE_HTTPS` 🟡
**値**: `true`
**説明**: HTTPS使用設定

### 5. `NEXT_PUBLIC_ENVIRONMENT` 🟡
**値**: `production`
**説明**: 環境識別子

## 不要な変数
- `NEXT_PUBLIC_DEV_PASSWORD` - 開発環境専用、本番では不要

## GitHub Actions ワークフローでの参照

```yaml
# production_frontend.yml で使用
env:
  NEXT_PUBLIC_ENVIRONMENT: 'production'
  NEXT_PUBLIC_API_URL: '${{ vars.NEXT_PUBLIC_API_URL }}'
  NEXT_PUBLIC_SHOPIFY_API_KEY: '${{ vars.SHOPIFY_API_KEY_PRODUCTION }}'
  NEXT_PUBLIC_SHOPIFY_APP_URL: '${{ vars.NEXT_PUBLIC_SHOPIFY_APP_URL }}'
  NEXT_PUBLIC_USE_HTTPS: '${{ vars.NEXT_PUBLIC_USE_HTTPS }}'
  NEXT_PUBLIC_DISABLE_FEATURE_GATES: '${{ vars.NEXT_PUBLIC_DISABLE_FEATURE_GATES }}'
```

## 設定手順

1. GitHub → Settings → Environments → ec-ranger-prod
2. 「Add environment variable」をクリック
3. 上記の変数を一つずつ追加
4. 値は正確にコピー＆ペースト

---
作成日: 2025-12-22
