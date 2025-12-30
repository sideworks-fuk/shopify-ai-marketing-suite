# OAuth redirect_uri 検証手順

## 作成日
2025-12-29

## 目的
Shopify認証後に `/api/shopify/install` にリクエストが来る問題を特定するための検証手順

---

## 📋 検証用設定まとめ

### Allowed redirection URL(s)（3つ登録済み）

| URL | 用途 |
|-----|------|
| `https://shopifyapp-backend-develop-....azurewebsites.net/api/shopify/callback` | `UseFrontendProxy: false` 用 |
| `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net/api/shopify/callback` | `UseFrontendProxy: true` (Azure) 用 |
| `https://unsavagely-repressive-terrance.ngrok-free.dev/api/shopify/callback` | `UseFrontendProxy: true` (ngrok) 用 |

### App URL設定

| 環境 | App URL |
|------|---------|
| Development | `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net` |

**⚠️ 重要**: App URLは `/install` ではなく `/`（ルート）に設定すること

---

## 🧪 検証パターン

### パターン1: `UseFrontendProxy: false`

**設定**:
- `appsettings.Development.json`: `"UseFrontendProxy": false`

**期待されるフロー**:
```
1. フロントエンド → バックエンド /api/shopify/install
2. バックエンド → Shopify OAuth URL（redirect_uri = バックエンド直接）
3. Shopify認証後 → バックエンド /api/shopify/callback 直接
4. バックエンド → フロントエンド /auth/success にリダイレクト
```

**確認ポイント**:
- [ ] バックエンドログ: `GetRedirectUriAsync: Redirect URI generated (backend direct)`
- [ ] `redirect_uri` が `https://shopifyapp-backend-develop-....azurewebsites.net/api/shopify/callback` になっているか
- [ ] Shopify認証後に `/api/shopify/callback` にリクエストが来ているか（`/api/shopify/install` ではない）

### パターン2: `UseFrontendProxy: true`

**設定**:
- `appsettings.LocalDevelopment.json`: `"UseFrontendProxy": true`

**期待されるフロー**:
```
1. フロントエンド → バックエンド /api/shopify/install
2. バックエンド → Shopify OAuth URL（redirect_uri = フロントエンドプロキシ）
3. Shopify認証後 → フロントエンド /api/shopify/callback（プロキシ）
4. フロントエンド → バックエンド /api/shopify/callback に転送
5. バックエンド → フロントエンド /auth/success にリダイレクト
```

**確認ポイント**:
- [ ] バックエンドログ: `GetRedirectUriAsync: Redirect URI generated (frontend proxy)`
- [ ] `redirect_uri` が `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net/api/shopify/callback` になっているか
- [ ] Shopify認証後にフロントエンド `/api/shopify/callback` にリクエストが来ているか

---

## 🔍 問題特定のための確認手順

### Step 1: Shopify Partners Dashboard の設定確認

1. **Allowed redirection URL(s)** を確認
   - [ ] `/api/shopify/callback` が含まれているか
   - [ ] `/api/shopify/install` が含まれていないか（含まれている場合は削除）
   - [ ] バックエンドURLが正しく設定されているか

2. **App URL** を確認
   - [ ] App URLが `/install` ではなく `/`（ルート）に設定されているか
   - [ ] 例: `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`

### Step 2: バックエンドログで `redirect_uri` を確認

**確認するログメッセージ**:
```
GetRedirectUriAsync: Final decision - useFrontendProxy={UseFrontendProxy}
GetRedirectUriAsync: Redirect URI generated (backend direct): BackendUrl={BackendUrl}, RedirectUri={RedirectUri}
または
GetRedirectUriAsync: Redirect URI generated (frontend proxy): FrontendUrl={FrontendUrl}, RedirectUri={RedirectUri}
```

**期待される値**（`UseFrontendProxy: false` の場合）:
```
RedirectUri=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

**期待される値**（`UseFrontendProxy: true` の場合）:
```
RedirectUri=https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net/api/shopify/callback
```

### Step 3: OAuth URL の `redirect_uri` パラメータを確認

**確認するログメッセージ**:
```
Generated OAuth authorization URL: {AuthUrl}
```

**OAuth URLの例**:
```
https://{shop}/admin/oauth/authorize?client_id={apiKey}&scope={scopes}&redirect_uri={redirectUri}&state={state}
```

**確認ポイント**:
- [ ] `redirect_uri` パラメータをURLデコードして確認
- [ ] 期待される `redirect_uri` と一致しているか
- [ ] `/api/shopify/install` になっていないか

### Step 4: DevTools Network タブでリクエストフローを確認

1. **インストール開始時**:
   - [ ] `GET /api/shopify/install?shop=...` が呼ばれているか
   - [ ] レスポンスが `302 Redirect` で、Shopify OAuth URLにリダイレクトされているか

2. **Shopify認証後**:
   - [ ] どのURLにリクエストが来ているか
   - [ ] `/api/shopify/callback` に来ているか（期待値）
   - [ ] `/api/shopify/install` に来ていないか（問題）

---

## 🚨 問題が発生している場合の確認事項

### 問題: Shopify認証後に `/api/shopify/install` にリクエストが来る

**考えられる原因**:

1. **Shopify Partners Dashboard の設定が間違っている**
   - 「Allowed redirection URL(s)」に `/api/shopify/install` が含まれている
   - 「App URL」が `/install` に設定されている

2. **OAuth URL生成時の `redirect_uri` が間違っている**
   - `GetRedirectUriAsync()` が `/api/shopify/install` を返している
   - バックエンドログで確認

3. **Shopifyのインストールリンク（`/oauth/install_custom_app`）を使用している**
   - カスタムアプリのインストールリンクには `redirect_uri` パラメータが含まれない
   - Shopify Partners Dashboard の「Redirect URLs」が使用される

**確認手順**:

1. Shopify Partners Dashboard の設定を確認
2. バックエンドログで `GetRedirectUriAsync` の出力を確認
3. OAuth URL の `redirect_uri` パラメータを確認
4. DevTools Network タブで実際のリクエストフローを確認

---

## 📝 検証結果の記録

検証時に以下の情報を記録してください：

- [ ] 使用した設定（`UseFrontendProxy: true/false`）
- [ ] バックエンドログの `redirect_uri` の値
- [ ] OAuth URL の `redirect_uri` パラメータの値
- [ ] DevTools Network タブで観察されたリクエストフロー
- [ ] Shopify Partners Dashboard の設定内容

---

## 参考リンク

- [Shopify OAuth Getting Started](https://shopify.dev/apps/auth/oauth/getting-started)
- [カスタム配布設定ガイド](../03-feature-development/マルチアプリ対応/カスタム配布設定ガイド.md)
