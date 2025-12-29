# 404エラー - OAuthコールバック未実行 確認事項

## 作成日
2025-12-28

## 目的
Redirect URLsが正しく登録されていることを確認したので、次の確認事項を整理する。

---

## ✅ 確認済み事項

### Shopify Partner DashboardのRedirect URLs
以下の3つのURLが正しく登録されています：
1. `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net/api/shopify/callback`
2. `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net/auth/success`
3. `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback`

---

## 🔍 次に確認すべき事項

### 1. バックエンドログで`redirect_uri`を確認（最優先）

**目的**: 実際に生成されている`redirect_uri`がRedirect URLsと一致しているか確認

**確認方法**:
1. バックエンドログを確認
2. 以下のログメッセージを探す：
   - `Redirect URI generated: BackendUrl={BackendUrl}, RedirectUri={RedirectUri}`
   - `OAuth redirect_uri決定. Shop: {Shop}, ApiKey: {ApiKey}, RedirectUri: {RedirectUri}`

**期待される値**:
```
RedirectUri=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

**確認ポイント**:
- [ ] `redirect_uri`が正しいバックエンドURLを指しているか
- [ ] `redirect_uri`が`/api/shopify/callback`で終わっているか
- [ ] `redirect_uri`がHTTPSを使用しているか
- [ ] `redirect_uri`がRedirect URLsの3番目と完全一致しているか

---

### 2. OAuth URLの`redirect_uri`パラメータを確認

**目的**: OAuth URLに含まれる`redirect_uri`パラメータを確認

**確認方法**:
1. バックエンドログの「Generated OAuth authorization URL」を確認
2. URLをデコードして`redirect_uri`パラメータを抽出
3. 期待される`redirect_uri`と比較

**期待されるOAuth URLの例**:
```
https://xn-fbkq6e5da0fpb.myshopify.com/admin/oauth/authorize?client_id=2d7e0e1f5da14eb9d299aa746738e44b&scope=read_all_orders,read_orders,read_products,read_customers&redirect_uri=https%3A%2F%2Fshopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net%2Fapi%2Fshopify%2Fcallback&state=...
```

**デコード後の`redirect_uri`**:
```
https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

**確認ポイント**:
- [ ] `redirect_uri`パラメータが存在するか
- [ ] `redirect_uri`が正しくエンコードされているか
- [ ] デコード後の`redirect_uri`がRedirect URLsの3番目と完全一致しているか

---

### 3. Shopify認証画面の表示を確認

**目的**: Shopify認証画面が表示されているか確認

**確認方法**:
1. ブラウザのネットワークタブでリクエストを確認
2. `/api/shopify/install`へのリクエストが成功しているか確認
3. Shopify認証画面へのリダイレクトが発生しているか確認
4. Shopify認証画面が表示されているか確認

**確認ポイント**:
- [ ] `/api/shopify/install`へのリクエストが成功しているか（ステータスコード302）
- [ ] Shopify認証画面へのリダイレクトが発生しているか
- [ ] Shopify認証画面が表示されているか
- [ ] ユーザーが認証を完了しているか

---

### 4. バックエンドの環境変数を確認

**目的**: `GetRedirectUri()`が正しいバックエンドURLを取得しているか確認

**確認方法**:
1. Azure App Serviceの環境変数を確認
2. `SHOPIFY_BACKEND_BASEURL`が設定されているか確認
3. `appsettings.Development.json`に`Backend:BaseUrl`が設定されているか確認

**`GetRedirectUri()`の優先順位**:
1. 環境変数 `SHOPIFY_BACKEND_BASEURL`
2. 設定ファイル `Backend:BaseUrl`
3. 現在のリクエストURLから取得（`GetBaseUrl()`）

**期待される値**:
```
SHOPIFY_BACKEND_BASEURL=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
```

または

```json
{
  "Backend": {
    "BaseUrl": "https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net"
  }
}
```

**確認ポイント**:
- [ ] `SHOPIFY_BACKEND_BASEURL`が設定されているか
- [ ] 設定値が正しいバックエンドURLを指しているか
- [ ] 末尾にスラッシュがないか

---

### 5. バックエンドのデプロイ状況を確認

**目的**: 修正がデプロイされているか確認

**確認方法**:
1. GitHub Actionsのデプロイ履歴を確認
2. 最新のコミットがデプロイされているか確認
3. バックエンドのログに修正後のログメッセージが含まれているか確認

**修正後のログメッセージ**:
```
Built embedded app URL (direct to /auth/success): {RedirectUrl}
```

**確認ポイント**:
- [ ] 最新のコミットがデプロイされているか
- [ ] デプロイが成功しているか
- [ ] バックエンドが正常に起動しているか
- [ ] 修正後のログメッセージが含まれているか

---

## 🚨 考えられる問題と解決策

### 問題1: `redirect_uri`が一致していない

**症状**: 
- OAuth URLの`redirect_uri`がRedirect URLsと一致していない

**解決策**:
1. バックエンドログで実際の`redirect_uri`を確認
2. Redirect URLsと完全一致しているか確認
3. 不一致の場合は、環境変数または設定ファイルを修正

---

### 問題2: Shopify認証画面が表示されていない

**症状**: 
- `/api/shopify/install`へのリクエストが失敗している
- Shopify認証画面へのリダイレクトが発生していない

**解決策**:
1. ネットワークタブでリクエストを確認
2. エラーメッセージを確認
3. バックエンドログでエラーを確認

---

### 問題3: バックエンドがデプロイされていない

**症状**: 
- 修正後のログメッセージが見当たらない

**解決策**:
1. GitHub Actionsでデプロイを実行
2. デプロイが成功しているか確認
3. バックエンドが正常に起動しているか確認

---

## 📋 確認チェックリスト

### バックエンドログの確認
- [ ] `Redirect URI generated`のログがあるか
- [ ] `OAuth redirect_uri決定`のログがあるか
- [ ] 生成された`redirect_uri`が正しいか
- [ ] `redirect_uri`がRedirect URLsと完全一致しているか

### OAuth URLの確認
- [ ] OAuth URLが生成されているか
- [ ] `redirect_uri`パラメータが含まれているか
- [ ] `redirect_uri`が正しくエンコードされているか
- [ ] デコード後の`redirect_uri`がRedirect URLsと完全一致しているか

### Shopify認証画面の確認
- [ ] `/api/shopify/install`へのリクエストが成功しているか
- [ ] Shopify認証画面へのリダイレクトが発生しているか
- [ ] Shopify認証画面が表示されているか
- [ ] ユーザーが認証を完了しているか

### バックエンドの環境変数の確認
- [ ] `SHOPIFY_BACKEND_BASEURL`が設定されているか
- [ ] 設定値が正しいバックエンドURLを指しているか
- [ ] 末尾にスラッシュがないか

### バックエンドのデプロイ状況の確認
- [ ] 最新のコミットがデプロイされているか
- [ ] デプロイが成功しているか
- [ ] バックエンドが正常に起動しているか
- [ ] 修正後のログメッセージが含まれているか

---

## 参考資料

- [OAuthコールバック未実行調査](./404エラー-OAuthコールバック未実行調査.md)
- [接続開始エラー調査](./404エラー-接続開始エラー調査.md)
- [ExitIframe二重呼び出し問題](./404エラー-ExitIframe二重呼び出し問題.md)

---

## 更新履歴

- 2025-12-28: 初版作成（確認事項の整理）
