# UseFrontendProxy設定確認手順

## 問題
`UseFrontendProxy: false`に設定しているにもかかわらず、OAuth認証の`redirect_uri`がフロントエンドURLになっている。

## 確認手順

### 1. バックエンドの設定ファイルを確認

#### `appsettings.Development.json`
```json
{
  "Shopify": {
    "UseFrontendProxy": false
  }
}
```

#### Azure App Serviceの環境変数
Azure Portalで以下を確認：
- `SHOPIFY_USE_FRONTEND_PROXY`が設定されていないこと（または`false`であること）

### 2. バックエンドのログを確認

`/api/shopify/install`エンドポイントにアクセスした際のログで以下を確認：

```
GetRedirectUriAsync: Final decision - useFrontendProxy=false, apiKey=...
GetRedirectUriAsync: Redirect URI generated (backend direct): BackendUrl=..., RedirectUri=...
OAuth redirect_uri決定. Shop: ..., RedirectUri: ...
```

**期待されるログ**:
- `useFrontendProxy=false`
- `Redirect URI generated (backend direct)`
- `RedirectUri`がバックエンドURL（例: `https://shopifyapp-backend-develop-xxx.azurewebsites.net/api/shopify/callback`）

**問題がある場合のログ**:
- `useFrontendProxy=true`
- `Redirect URI generated (frontend proxy)`
- `RedirectUri`がフロントエンドURL（例: `https://xxx.ngrok-free.dev/api/shopify/callback`）

### 3. データベースの`ShopifyApps`テーブルを確認

`UseFrontendProxy: false`の場合、データベースの`AppUrl`は無視されるべきですが、念のため確認：

```sql
SELECT Id, ApiKey, AppUrl, RedirectUri, IsActive
FROM ShopifyApps
WHERE IsActive = 1
```

### 4. 環境変数の優先順位を確認

`GetRedirectUriAsync`の判定ロジック：
1. **環境変数** `SHOPIFY_USE_FRONTEND_PROXY`（最優先）
2. **設定ファイル** `Shopify:UseFrontendProxy`
3. **デフォルト** `false`（バックエンド直接）

### 5. トラブルシューティング

#### 問題: 環境変数が設定されている
**解決策**: Azure App Serviceの環境変数から`SHOPIFY_USE_FRONTEND_PROXY`を削除するか、`false`に設定

#### 問題: 設定ファイルの値が正しく読み込まれていない
**解決策**: 
1. `appsettings.Development.json`の`Shopify:UseFrontendProxy`が`false`であることを確認
2. バックエンドを再起動
3. ログで`GetRedirectUriAsync: Using config Shopify:UseFrontendProxy=false, useFrontendProxy=false`が出力されることを確認

#### 問題: ログが出力されない
**解決策**: 
1. バックエンドのログレベルを`Information`以上に設定
2. Application Insightsでログを確認
3. バックエンドのコンソールログを確認

## 関連ファイル
- `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` (67-202行目: `GetRedirectUriAsync`メソッド)
- `backend/ShopifyAnalyticsApi/appsettings.Development.json`
- `docs/05-development/01-環境構築/Azure開発環境-バックエンド接続設定.md`
