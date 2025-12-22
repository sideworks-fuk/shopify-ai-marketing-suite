# GitHub Secrets 設定チェックリスト

## 設定日: 2025-12-22

## 必須 Secrets

### 1. Backend発行プロファイル ⬜
**Name**: `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION`
```
Status: [ ] 設定済み
確認方法: Settings → Secrets → リストに表示される
```

### 2. Shopify API Secret ⬜
**Name**: `SHOPIFY_API_SECRET_PRODUCTION`
```
Status: [ ] 設定済み
値: [メモから取得]
```

### 3. Shopify API Key ⬜
**Name**: `SHOPIFY_API_KEY_PRODUCTION`
```
Status: [ ] 設定済み
値: be1fc09e2135be7cee3b9186ef8bfe80
Note: Secretsまたは Variables として設定可能
```

### 4. Static Web Apps トークン ⬜
**オプション1**: 既存のトークンを使用
- `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00` を workflow で直接参照

**オプション2**: 新規作成
- **Name**: `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION`
- 既存のトークン値をコピー

## ワークフロー修正が必要な場合

もし既存のStatic Web Appsトークンを使用する場合、以下を修正：

```yaml
# production_frontend.yml
env:
  AZURE_STATIC_WEB_APPS_API_TOKEN_SECRET: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_SEA_038F17A00 }}
```

## 設定後の確認

1. GitHub → Settings → Secrets and variables → Actions
2. 以下が表示されることを確認：
   - `AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION` ✅
   - `SHOPIFY_API_SECRET_PRODUCTION` ✅
   - `SHOPIFY_API_KEY_PRODUCTION` ✅

## セキュリティ注意事項

- ✅ 発行プロファイルファイルは削除済み（docs/ec-ranger-backend-prod.PublishSettings）
- Secretsは一度設定すると値を確認できません（***で表示）
- 更新する場合は「Update」をクリック

## 次のステップ

GitHub Secrets設定完了後：
1. Azure App Service環境変数設定
2. Azure Static Web Apps環境変数設定
3. データベーステーブル作成
4. Shopify Partners設定
5. GitHub Actionsデプロイ実行

---
作成者: 福田＋AI Assistant
