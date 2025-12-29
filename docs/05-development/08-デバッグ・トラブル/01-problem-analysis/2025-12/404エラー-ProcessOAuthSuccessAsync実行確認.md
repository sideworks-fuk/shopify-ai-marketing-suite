# 404エラー - ProcessOAuthSuccessAsync実行確認

## 作成日
2025-12-28

## 目的
`ProcessOAuthSuccessAsync`が正常に完了しているか、エラーが発生していないかを確認する。

---

## 問題の概要

### 現在の状況
1. ✅ OAuthコールバックは実行されている（`OAuth callback received`）
2. ✅ HMAC検証は成功している
3. ❌ `ProcessOAuthSuccessAsync`の完了ログが見つからない
4. ❌ `BuildRedirectUrlAsync`のログが見つからない
5. ❌ `Built embedded app URL`のログが見つからない

### 推測される問題
`ProcessOAuthSuccessAsync`または`SetOAuthSessionCookie`でエラーが発生し、`BuildRedirectUrlAsync`に到達していない可能性があります。

---

## 確認すべきログ（優先順位順）

### 1. `ProcessOAuthSuccessAsync`の完了ログ（最優先）

**検索キーワード**: `OAuth authentication success processing completed`

**期待されるログ**:
```
[INF] OAuth authentication success processing completed. Shop: {Shop}, StoreId: {StoreId}, ShopifyAppId: {ShopifyAppId}
```

**確認ポイント**:
- [ ] `ProcessOAuthSuccessAsync`が正常に完了しているか
- [ ] `StoreId`が正しく生成されているか（ログでは`StoreId: 19`が確認済み）

**見つからない場合**:
- `ProcessOAuthSuccessAsync`でエラーが発生している可能性がある
- `SaveOrUpdateStore`、`RegisterWebhooks`、または`EnsureTrialSubscriptionAsync`でエラーが発生している可能性がある

---

### 2. `SaveOrUpdateStore`の実行確認

**検索キーワード**: `SaveOrUpdateStore` または `ストア保存` または `Store created` または `Store updated`

**期待されるログ**:
- ストア保存のログ
- ストア更新のログ

**確認ポイント**:
- [ ] `SaveOrUpdateStore`が実行されているか
- [ ] ストアが正しく保存されているか

---

### 3. `SetOAuthSessionCookie`の実行確認

**検索キーワード**: `SetOAuthSessionCookie` または `セッションCookie` または `Error occurred during token encryption`

**期待されるログ**:
- セッションCookie設定のログ
- トークン暗号化のログ

**確認ポイント**:
- [ ] `SetOAuthSessionCookie`が実行されているか
- [ ] トークン暗号化でエラーが発生していないか（現在は`Error occurred during token encryption`が発生）

**重要**: 現在、`EncryptToken`でBase64エンコードエラーが発生しています。これが`SetOAuthSessionCookie`でエラーを引き起こしている可能性があります。

---

### 4. エラーハンドリングの確認

**検索キーワード**: `Error occurred during OAuth callback processing`

**期待されるログ**:
```
[ERR] Error occurred during OAuth callback processing. Shop: {Shop}
System.Exception: ...
```

**確認ポイント**:
- [ ] catchブロックでエラーがキャッチされているか
- [ ] エラーメッセージの詳細

---

### 5. `BuildRedirectUrlAsync`の実行確認

**検索キーワード**: `BuildRedirectUrlAsync`

**期待されるログ**:
```
[INF] BuildRedirectUrlAsync: hostParam={HostParam}, decodedHost={DecodedHost}
```

**確認ポイント**:
- [ ] `BuildRedirectUrlAsync`が呼ばれているか
- [ ] `hostParam`が正しく取得できているか

---

## 現在のログ分析

### 確認済みのログ
- ✅ `OAuth callback received. Shop: xn-fbkq6e5da0fpb.myshopify.com, State: Uw5NhUor9hBM9UbgZykVNPqFYvoRsHqw`
- ✅ `HMAC検証成功（ShopifySharpライブラリ）`
- ✅ `host: YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUveG4tZmJrcTZlNWRhMGZwYg`
- ✅ `Level 3 (OAuth) authentication successful. UserId: null, StoreId: 19`（別のリクエスト）

### 見つからないログ
- ❌ `OAuth authentication success processing completed` - **確認が必要**
- ❌ `BuildRedirectUrlAsync` - **確認が必要**
- ❌ `Built embedded app URL` - **確認が必要**
- ❌ `Using fallback URL due to host parameter decode failure` - **確認が必要**

---

## 推測される問題

### 問題1: `ProcessOAuthSuccessAsync`でエラーが発生

**原因**:
- `SaveOrUpdateStore`でエラーが発生している可能性
- `RegisterWebhooks`でエラーが発生している可能性
- `EnsureTrialSubscriptionAsync`でエラーが発生している可能性

**影響**:
- `ProcessOAuthSuccessAsync`が完了しない
- `BuildRedirectUrlAsync`が呼ばれない
- リダイレクトURLが生成されない

### 問題2: `SetOAuthSessionCookie`でエラーが発生

**原因**:
- `EncryptToken`でBase64エンコードエラーが発生している（確認済み）
- これが`SetOAuthSessionCookie`でエラーを引き起こしている可能性

**影響**:
- `SetOAuthSessionCookie`が完了しない
- `BuildRedirectUrlAsync`が呼ばれない
- リダイレクトURLが生成されない

---

## 次のステップ

### 1. バックエンドログの確認

以下のログを検索して、存在するか確認してください：

1. `OAuth authentication success processing completed`
2. `Error occurred during OAuth callback processing`
3. `SaveOrUpdateStore`関連のログ
4. `SetOAuthSessionCookie`関連のログ
5. `BuildRedirectUrlAsync`

### 2. `EncryptToken`エラーの調査

**確認事項**:
- `EncryptToken`で使用されている`key`パラメータの値
- Base64エンコードエラーの原因
- フォールバック処理（Base64エンコード）が正しく動作しているか

### 3. `DecodeHost`エラーの調査

**確認事項**:
- `host`パラメータの実際の値（`YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUveG4tZmJrcTZlNWRhMGZwYg`）
- Base64デコードエラーの原因
- URLエンコードの問題がないか

---

## 参考資料

- [確認すべきバックエンドログ一覧](./404エラー-確認すべきバックエンドログ一覧.md)
- [hostパラメータデコード失敗-調査](./404エラー-hostパラメータデコード失敗-調査.md)
- [ExitIframeログ分析結果](./404エラー-ExitIframeログ分析結果.md)

---

## 更新履歴

- 2025-12-28: 初版作成（ProcessOAuthSuccessAsync実行確認）
