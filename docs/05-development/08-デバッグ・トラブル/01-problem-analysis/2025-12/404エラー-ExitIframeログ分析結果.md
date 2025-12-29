# 404エラー - ExitIframeログ分析結果

## 作成日
2025-12-28

## 目的
ExitIframeページのコンソールログとネットワークタブの情報を分析し、OAuthコールバックが呼ばれない原因を特定する。

---

## 📊 ExitIframeページのログ分析

### ✅ 1回目のExitIframeページ呼び出し（正常）

**ログの流れ**:
1. ✅ 埋め込みアプリモード: ExitIframeページにリダイレクト
2. ✅ ExitIframeページURL: `/auth/exit-iframe?redirectUri=...`
3. ✅ ExitIframeページへのリダイレクトを実行しました
4. ✅ [ExitIframe] iframe脱出処理を開始
5. ✅ [ExitIframe] リダイレクト先: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/install?shop=...&apiKey=...`
6. ✅ [ExitIframe] redirectUriの種類: 外部URL
7. ✅ [ExitIframe] 外部URLを検出: 直接リダイレクトを実行
8. ✅ [ExitIframe] window.location.hrefに設定: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/install?shop=...&apiKey=...`
9. ✅ [ExitIframe] 外部URLへのリダイレクトを実行しました

**分析結果**:
- ✅ ExitIframeページが正しく呼ばれている
- ✅ `redirectUri`パラメータが正しく取得できている
- ✅ 外部URLへのリダイレクトが実行されている
- ✅ バックエンドの`/api/shopify/install`へのリダイレクトが発生している

---

### ❌ 2回目のExitIframeページ呼び出し（問題）

**ログの流れ**:
1. ❌ [ExitIframe] App Bridgeが利用できません
2. ❌ [ExitIframe] redirectUriパラメータがありません

**分析結果**:
- ❌ ExitIframeページが2回目に呼ばれている
- ❌ App Bridgeが利用できない（既にiframeから脱出しているため）
- ❌ `redirectUri`パラメータが取得できていない

**原因**:
- OAuthコールバック後、バックエンドの`BuildRedirectUrlAsync`がExitIframeページへのURLを構築してリダイレクトしている
- しかし、この時点では既にiframeから脱出しているため、App Bridgeが利用できない
- また、`redirectUri`パラメータも失われている可能性がある

**解決策**:
- 既に修正済み: `BuildRedirectUrlAsync`を修正し、OAuthコールバック後は直接`/auth/success`にリダイレクトするように変更
- ただし、修正がデプロイされていない可能性がある

---

## 📊 ネットワークタブの分析

### バックエンド `/api/shopify/install`へのリクエスト

**リクエスト情報**:
- **URL**: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net/api/shopify/install?shop=xn-fbkq6e5da0fpb.myshopify.com&apiKey=2d7e0e1f5da14eb9d299aa746738e44b`
- **ステータス**: エラーまたはキャンセル（赤いXマーク）
- **リクエストヘッダー**:
  - `Sec-Fetch-Dest: iframe` ← **重要**: iframe内からのリクエスト
  - `Sec-Fetch-Mode: navigate`
  - `Sec-Fetch-Site: cross-site`
  - `Referer: https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net/`

**分析結果**:
- ✅ バックエンドへのリクエストは発生している
- ❌ リクエストが失敗している（エラーまたはキャンセル）
- ⚠️ `Sec-Fetch-Dest: iframe`が含まれているため、iframe内からのリクエストであることが確認できる

**考えられる原因**:
1. **リクエストがキャンセルされた**
   - ページ遷移によりリクエストがキャンセルされた
   - タイムアウトによりリクエストがキャンセルされた

2. **CORSエラーが発生している**
   - バックエンドのCORS設定が正しくない
   - iframe内からのリクエストがブロックされている

3. **バックエンドがエラーを返している**
   - バックエンドがエラーレスポンスを返している
   - リクエストが正常に処理されていない

---

## 🔍 次の確認事項

### 1. バックエンドのレスポンスを確認（最優先）

**目的**: バックエンドがどのようなレスポンスを返しているか確認

**確認方法**:
1. ネットワークタブで`/api/shopify/install`のリクエストを選択
2. 「Response」タブを確認
3. 「Preview」タブを確認
4. ステータスコードを確認

**期待されるレスポンス**:
- ステータスコード: `302 Found`
- `Location`ヘッダー: Shopify認証画面のURL（OAuth URL）

**確認ポイント**:
- [ ] ステータスコードが`302`か
- [ ] `Location`ヘッダーが正しいOAuth URLを指しているか
- [ ] エラーメッセージが含まれていないか
- [ ] レスポンスボディが空か

---

### 2. バックエンドログを確認

**目的**: バックエンドがリクエストを受信しているか確認

**確認方法**:
1. バックエンドログで`/api/shopify/install`へのリクエストを確認
2. エラーログがないか確認
3. OAuth URLの生成ログを確認

**期待されるログ**:
```
[INF] ===== OAuth Install Started ===== Shop: xn-fbkq6e5da0fpb.myshopify.com, ApiKey: 2d7e0e1f...
[INF] Generated OAuth authorization URL: https://...
```

**確認ポイント**:
- [ ] バックエンドログにリクエストが記録されているか
- [ ] エラーログがないか
- [ ] OAuth URLの生成ログがあるか

---

### 3. CORS設定を確認

**目的**: バックエンドのCORS設定が正しいか確認

**確認方法**:
1. バックエンドのCORS設定を確認
2. `appsettings.Development.json`のCORS設定を確認
3. ネットワークタブでCORSエラーがないか確認

**確認ポイント**:
- [ ] CORS設定が正しいか
- [ ] フロントエンドのURLが`AllowedOrigins`に含まれているか
- [ ] CORSエラーが発生していないか

---

## 🚨 考えられる原因と解決策

### 原因1: バックエンドのレスポンスが正しくない（最優先）

**症状**: 
- バックエンドへのリクエストは発生しているが、レスポンスが正しくない

**考えられる問題**:
- バックエンドがエラーレスポンスを返している
- リダイレクトが失敗している
- ステータスコードが`302`以外

**解決策**:
1. バックエンドのレスポンスを確認
2. エラーログを確認
3. 必要に応じて、バックエンドの処理を修正

---

### 原因2: CORSエラーが発生している

**症状**: 
- iframe内からのリクエストがCORSエラーでブロックされている

**解決策**:
1. バックエンドのCORS設定を確認
2. フロントエンドのURLが`AllowedOrigins`に含まれているか確認
3. 必要に応じて、CORS設定を修正

---

### 原因3: リクエストがキャンセルされた

**症状**: 
- リクエストが開始されたが、キャンセルされた

**考えられる問題**:
- ページ遷移によりリクエストがキャンセルされた
- タイムアウトによりリクエストがキャンセルされた

**解決策**:
1. リクエストのタイミングを確認
2. ページ遷移のタイミングを確認
3. 必要に応じて、リクエストのタイミングを調整

---

## 📋 確認チェックリスト

### バックエンドのレスポンス
- [ ] ステータスコードが`302`か
- [ ] `Location`ヘッダーが正しいOAuth URLを指しているか
- [ ] エラーメッセージが含まれていないか
- [ ] レスポンスボディが空か

### バックエンドログ
- [ ] バックエンドログにリクエストが記録されているか
- [ ] エラーログがないか
- [ ] OAuth URLの生成ログがあるか

### CORS設定
- [ ] CORS設定が正しいか
- [ ] フロントエンドのURLが`AllowedOrigins`に含まれているか
- [ ] CORSエラーが発生していないか

---

## 📊 分析サマリー

### ✅ 正常に動作している部分
- ExitIframeページへのリダイレクト（1回目）
- 外部URLへのリダイレクト（1回目）
- バックエンドへのリクエストの発生

### ❌ 問題がある部分
- ExitIframeページの2回目の呼び出し
- バックエンドへのリクエストの失敗
- OAuthコールバックが呼ばれていない

### 🔍 次の調査ステップ
1. バックエンドのレスポンスを確認（最優先）
2. バックエンドログを確認
3. CORS設定を確認

---

## 参考資料

- [ネットワークタブ分析結果](./404エラー-ネットワークタブ分析結果.md)
- [OAuthコールバック未実行-ログ分析結果](./404エラー-OAuthコールバック未実行-ログ分析結果.md)
- [ExitIframe二重呼び出し問題](./404エラー-ExitIframe二重呼び出し問題.md)

---

## 更新履歴

- 2025-12-28: 初版作成（ExitIframeログ分析結果）
