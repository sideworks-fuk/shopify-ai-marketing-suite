# 404エラー - OAuthコールバック未実行 ログ分析結果

## 作成日
2025-12-28

## 目的
バックエンドログを分析し、OAuthコールバックが呼ばれない原因を特定する。

---

## ✅ 確認済み事項

### 1. `redirect_uri`の生成

**ログ**:
```
[09:45:49 INF] Redirect URI generated: BackendUrl=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net, RedirectUri=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

**分析結果**:
- ✅ `redirect_uri`が正しく生成されている
- ✅ Redirect URLsの3番目と完全一致している
- ✅ HTTPSを使用している
- ✅ `/api/shopify/callback`で終わっている

---

### 2. OAuth `redirect_uri`の決定

**ログ**:
```
[09:45:49 INF] OAuth redirect_uri決定. Shop: xn-fbkq6e5da0fpb.myshopify.com, ApiKey: 2d7e0e1f5da14eb9d299aa746738e44b, RedirectUri: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

**分析結果**:
- ✅ `redirect_uri`が正しく決定されている
- ✅ Shopドメインが正しい
- ✅ API Keyが正しい

---

## ✅ 追加で確認できた事項

### 1. `Generated OAuth authorization URL`

**ログ**:
```
[09:45:49 INF] Generated OAuth authorization URL: https://xn-fbkq6e5da0fpb.myshopify.com/admin/oauth/authorize?client_id=2d7e0e1f5da14eb9d299aa746738e44b&scope=read_all_orders,read_orders,read_products,read_customers&redirect_uri=https%3A%2F%2Fshopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net%2Fapi%2Fshopify%2Fcallback&state=uQvuIKZcQVQ9wYC7r27XOK2AdNuUIfvz
```

**分析結果**:
- ✅ OAuth URLが正しく生成されている
- ✅ `client_id`が正しい（`2d7e0e1f5da14eb9d299aa746738e44b`）
- ✅ `scope`が正しい（`read_all_orders,read_orders,read_products,read_customers`）
- ✅ `redirect_uri`が正しくエンコードされている
- ✅ `state`が生成されている

**デコード後の`redirect_uri`**:
```
https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

**確認結果**:
- ✅ `redirect_uri`がRedirect URLsの3番目と完全一致している
- ✅ OAuth URLの生成は正常に完了している

---

## ❌ 見つからないログ

---

### 2. `/api/shopify/callback`へのリクエスト

**期待されるログ**:
```
[INF] OAuth callback received. Shop: {Shop}, State: {State}
```

**問題**:
- このログが見当たらない
- OAuthコールバックが呼ばれていない

---

## 🔍 考えられる原因

### 原因1: `/api/shopify/install`のリダイレクトが失敗している（最優先）

**症状**: 
- OAuth URLは生成されているが、Shopify認証画面へのリダイレクトが発生していない

**確認方法**:
1. ブラウザのネットワークタブでリクエストを確認
2. `/api/shopify/install`へのリクエストのステータスコードを確認
3. レスポンスヘッダーの`Location`を確認

**考えられる問題**:
- `/api/shopify/install`がエラーを返している
- リダイレクトが失敗している
- ブラウザがリダイレクトをブロックしている
- CORSエラーが発生している

---

### 原因2: Shopify認証画面が表示されていない

**症状**: 
- `/api/shopify/install`へのリダイレクトは成功しているが、Shopify認証画面が表示されていない

**確認方法**:
1. ブラウザでShopify認証画面が表示されているか確認
2. 認証画面のURLを確認
3. エラーメッセージが表示されていないか確認

**考えられる問題**:
- Shopify認証画面でエラーが発生している
- 認証画面へのリダイレクトが失敗している
- ブラウザが認証画面をブロックしている

---

### 原因3: ユーザーが認証を完了していない

**症状**: 
- Shopify認証画面が表示されているが、ユーザーが認証を完了していない

**確認方法**:
1. Shopify認証画面が表示されているか確認
2. ユーザーが「インストール」ボタンをクリックしているか確認
3. 認証完了後のリダイレクトが発生しているか確認

**考えられる問題**:
- ユーザーが認証を完了していない
- Shopify認証画面でエラーが発生している
- 認証完了後のリダイレクトが失敗している

---

### 原因4: OAuth URLの`redirect_uri`が一致していない（可能性は低い）

**症状**: 
- OAuth URLの`redirect_uri`がRedirect URLsと一致していない

**確認方法**:
1. `Generated OAuth authorization URL`のログを確認
2. URLをデコードして`redirect_uri`パラメータを抽出
3. Redirect URLsと完全一致しているか確認

**分析結果**:
- `redirect_uri`は正しく生成されているため、この原因の可能性は低い
- ただし、OAuth URLの生成ログがないため、実際のOAuth URLを確認できない

---

## 📋 次の確認事項

### 1. `/api/shopify/install`のレスポンスを確認（最優先）

**目的**: `/api/shopify/install`が正しくリダイレクトしているか確認

**確認方法**:
1. ブラウザのネットワークタブでリクエストを確認
2. `/api/shopify/install`へのリクエストのステータスコードを確認
3. レスポンスヘッダーの`Location`を確認

**期待されるレスポンス**:
- ステータスコード: `302 Found`
- `Location`ヘッダー: Shopify認証画面のURL（OAuth URL）

**確認ポイント**:
- [ ] `/api/shopify/install`へのリクエストが成功しているか
- [ ] ステータスコードが`302`か
- [ ] `Location`ヘッダーが正しいOAuth URLを指しているか
- [ ] リダイレクトが発生しているか

---

### 2. OAuth URLの`redirect_uri`パラメータを確認（確認済み）

**目的**: OAuth URLに含まれる`redirect_uri`パラメータを確認

**確認結果**:
- ✅ OAuth URLが正しく生成されている
- ✅ `redirect_uri`パラメータが正しくエンコードされている
- ✅ デコード後の`redirect_uri`がRedirect URLsと完全一致している

**デコード後の`redirect_uri`**:
```
https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/callback
```

---

### 3. Shopify認証画面の表示を確認

**目的**: Shopify認証画面が表示されているか確認

**確認方法**:
1. ブラウザでShopify認証画面が表示されているか確認
2. 認証画面のURLを確認
3. エラーメッセージが表示されていないか確認

**確認ポイント**:
- [ ] Shopify認証画面が表示されているか
- [ ] 認証画面のURLが正しいか
- [ ] エラーメッセージが表示されていないか
- [ ] ユーザーが認証を完了できる状態か

---

## 🚨 推奨対応

### 対応1: OAuth URLの生成ログを追加（デバッグ用）

**目的**: OAuth URLの生成過程を詳細にログ出力する

**実施内容**:
`BuildOAuthUrlAsync`メソッドに詳細なログを追加：
```csharp
_logger.LogInformation("Building OAuth URL. Shop: {Shop}, ApiKey: {ApiKey}", shop, finalApiKey);
// ... 処理 ...
_logger.LogInformation("Generated OAuth authorization URL: {AuthUrl}", authUrl);
```

---

### 対応2: `/api/shopify/install`のレスポンスを確認

**目的**: `/api/shopify/install`が正しくリダイレクトしているか確認

**実施内容**:
1. ブラウザのネットワークタブでリクエストを確認
2. レスポンスヘッダーを確認
3. エラーが発生していないか確認

---

### 対応3: Shopify認証画面の表示を確認

**目的**: Shopify認証画面が表示されているか確認

**実施内容**:
1. ブラウザでShopify認証画面が表示されているか確認
2. 認証画面のURLを確認
3. エラーメッセージが表示されていないか確認

---

## 📊 ログ分析サマリー

### ✅ 正常に動作している部分
- `redirect_uri`の生成
- OAuth `redirect_uri`の決定
- Redirect URLsとの一致
- OAuth URLの生成
- OAuth URLの`redirect_uri`パラメータ

### ❌ 問題がある部分
- OAuthコールバックが呼ばれていない
- `/api/shopify/install`のレスポンスが確認できていない
- Shopify認証画面の表示が確認できていない

### 🔍 次の調査ステップ
1. `/api/shopify/install`のレスポンスを確認（最優先）
2. Shopify認証画面の表示を確認
3. ユーザーが認証を完了しているか確認

---

## 参考資料

- [OAuthコールバック未実行調査](./404エラー-OAuthコールバック未実行調査.md)
- [OAuthコールバック未実行-確認事項](./404エラー-OAuthコールバック未実行-確認事項.md)
- [接続開始エラー調査](./404エラー-接続開始エラー調査.md)

---

## 更新履歴

- 2025-12-28: 初版作成（ログ分析結果）
