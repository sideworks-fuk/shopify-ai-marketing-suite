# 404エラー - OAuthコールバック未実行調査

## 作成日
2025-12-28

## 目的
OAuthコールバック（`/api/shopify/callback`）が呼ばれない原因を調査する。

---

## 問題の概要

### ログ分析結果

**✅ 成功している処理**:
- OAuth Install Started - Shop: `xn-fbkq6e5da0fpb.myshopify.com`
- OAuth scopes: `read_all_orders,read_orders,read_products,read_customers` ← `read_all_orders`が含まれている！
- Generated OAuth authorization URL: `https://xn-fbkq6e5da0fpb.myshopify.com/admin/oauth/authorize?...`

**❌ 見つからないログ**:
- `/api/shopify/callback` ← OAuthコールバックのログがない！
- `Built embedded app URL (direct to /auth/success)` ← 修正後のログがない

---

## 問題の特定

### 問題1: OAuthコールバックが呼ばれていない

**症状**:
- バックエンドログに`/api/shopify/callback`へのリクエストが一切記録されていない

**考えられる原因**:
1. **Shopify認証画面が表示されていない**
   - ExitIframeページからバックエンドの`/api/shopify/install`へのリダイレクトが失敗している
   - バックエンドの`/api/shopify/install`がエラーを返している

2. **Shopify認証画面でエラーが発生している**
   - ユーザーが認証を完了していない
   - Shopify認証画面でエラーが発生している

3. **コールバックURLへのリダイレクトが失敗している**
   - OAuth URLに含まれる`redirect_uri`パラメータが正しくない
   - Shopify Partner DashboardのRedirect URLsに`/api/shopify/callback`が登録されていない
   - `redirect_uri`がShopify Partner DashboardのRedirect URLsと一致していない

4. **バックエンドの修正がデプロイされていない**
   - 修正後のログメッセージ `Built embedded app URL (direct to /auth/success)` が見当たらない

---

## 調査手順

### ステップ1: OAuth URLの`redirect_uri`パラメータを確認

**目的**: OAuth URLに含まれる`redirect_uri`が正しいか確認

**確認方法**:
1. バックエンドログの「Generated OAuth authorization URL」を確認
2. URLをデコードして`redirect_uri`パラメータを抽出
3. 期待される`redirect_uri`と比較

**期待される`redirect_uri`**:
```
https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

**確認ポイント**:
- [ ] `redirect_uri`が正しいバックエンドURLを指しているか
- [ ] `redirect_uri`が`/api/shopify/callback`で終わっているか
- [ ] `redirect_uri`がHTTPSを使用しているか

---

### ステップ2: Shopify Partner DashboardのRedirect URLsを確認

**目的**: Shopify Partner Dashboardに正しいRedirect URLsが登録されているか確認

**確認方法**:
1. Shopify Partner Dashboardにログイン
2. アプリ設定の「Redirect URLs」セクションを確認
3. 以下のURLが登録されているか確認：
   ```
   https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
   ```

**確認ポイント**:
- [ ] バックエンドの`/api/shopify/callback`が登録されているか
- [ ] URLが完全一致しているか（末尾のスラッシュ、プロトコルなど）
- [ ] 他のRedirect URLsが正しく設定されているか

---

### ステップ3: バックエンドのデプロイ状況を確認

**目的**: 修正がデプロイされているか確認

**確認方法**:
1. GitHub Actionsのデプロイ履歴を確認
2. 最新のコミットがデプロイされているか確認
3. バックエンドのログに修正後のログメッセージが含まれているか確認

**確認ポイント**:
- [ ] 最新のコミットがデプロイされているか
- [ ] デプロイが成功しているか
- [ ] バックエンドが正常に起動しているか

---

### ステップ4: Shopify認証画面の表示を確認

**目的**: Shopify認証画面が表示されているか確認

**確認方法**:
1. ブラウザのネットワークタブでリクエストを確認
2. `/api/shopify/install`へのリクエストが成功しているか確認
3. Shopify認証画面へのリダイレクトが発生しているか確認

**確認ポイント**:
- [ ] `/api/shopify/install`へのリクエストが成功しているか
- [ ] Shopify認証画面へのリダイレクトが発生しているか
- [ ] Shopify認証画面が表示されているか

---

## 考えられる原因と解決策

### 原因1: Redirect URLsが登録されていない

**症状**: 
- OAuthコールバックが呼ばれない
- Shopify認証画面でエラーが発生する可能性

**解決策**:
1. Shopify Partner Dashboardにログイン
2. アプリ設定の「Redirect URLs」セクションを開く
3. 以下のURLを追加：
   ```
   https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
   ```

---

### 原因2: `redirect_uri`が一致していない

**症状**: 
- OAuthコールバックが呼ばれない
- Shopify認証画面でエラーが発生する可能性

**解決策**:
1. OAuth URLの`redirect_uri`パラメータを確認
2. Shopify Partner DashboardのRedirect URLsと完全一致しているか確認
3. 不一致の場合は、`GetRedirectUri()`メソッドを修正

---

### 原因3: バックエンドがデプロイされていない

**症状**: 
- 修正後のログメッセージが見当たらない

**解決策**:
1. GitHub Actionsでデプロイを実行
2. デプロイが成功しているか確認
3. バックエンドが正常に起動しているか確認

---

### 原因4: ExitIframeページからのリダイレクトが失敗している

**症状**: 
- `/api/shopify/install`へのリクエストが発生していない

**解決策**:
1. ExitIframeページのログを確認
2. リダイレクト先のURLが正しいか確認
3. ネットワークタブでリクエストを確認

---

## 確認チェックリスト

### OAuth URLの確認
- [ ] OAuth URLが生成されているか
- [ ] `redirect_uri`パラメータが正しいか
- [ ] `redirect_uri`がHTTPSを使用しているか

### Shopify Partner Dashboardの確認
- [ ] Redirect URLsに`/api/shopify/callback`が登録されているか
- [ ] URLが完全一致しているか
- [ ] 他のRedirect URLsが正しく設定されているか

### バックエンドの確認
- [ ] 最新のコミットがデプロイされているか
- [ ] バックエンドが正常に起動しているか
- [ ] ログにエラーがないか

### フロントエンドの確認
- [ ] ExitIframeページからリダイレクトが発生しているか
- [ ] `/api/shopify/install`へのリクエストが成功しているか
- [ ] Shopify認証画面が表示されているか

---

## 参考資料

- [接続開始エラー調査](./404エラー-接続開始エラー調査.md)
- [ExitIframe二重呼び出し問題](./404エラー-ExitIframe二重呼び出し問題.md)
- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)

---

## 更新履歴

- 2025-12-28: 初版作成（OAuthコールバック未実行調査）
