# 404エラー - hostパラメータデコード失敗 調査

## 作成日
2025-12-28

## 目的
`host`パラメータのデコード失敗により、`BuildRedirectUrlAsync`が正しく実行されていない問題を調査する。

---

## 問題の概要

### 症状
1. ✅ OAuthコールバックは実行されている（`/api/shopify/callback`）
2. ✅ 認証は成功している（`StoreId: 19`）
3. ❌ `host`パラメータのデコードに失敗している
4. ❌ `Built embedded app URL`のログが見つからない
5. ❌ フロントエンドで「ストアIDの取得に失敗しました」エラーが表示される

### バックエンドログのエラー
```
[12:22:32 WRN] hostパラメータのデコードに失敗: YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUveG4tZmJrcTZlNWRhMGZwYg
System.FormatException: The input is not a valid Base-64 string as it contains a non-base 64 character, more than two padding characters, or an illegal character among the padding characters.
```

---

## 根本原因の分析

### 問題1: `host`パラメータのデコード失敗

**原因**:
- `DecodeHost`メソッドでBase64デコードに失敗している
- `host`パラメータが正しくエンコードされていない、または破損している可能性

**影響**:
- `BuildRedirectUrlAsync`の埋め込みアプリの分岐（`if (!string.IsNullOrWhiteSpace(decodedHost))`）に入らない
- そのため、`Built embedded app URL`のログが出力されない
- リダイレクトURLが正しく生成されない

---

## 確認すべきログ

### 1. OAuthコールバックの実行確認

**検索キーワード**: `OAuth callback received`

**期待されるログ**:
```
[INF] OAuth callback received. Shop: {Shop}, State: {State}
```

**確認ポイント**:
- [ ] OAuthコールバックが実行されているか
- [ ] `shop`パラメータが正しく取得できているか
- [ ] `state`パラメータが正しく取得できているか

---

### 2. `ProcessOAuthSuccessAsync`の実行確認

**検索キーワード**: `ProcessOAuthSuccessAsync` または `OAuth認証成功後の共通処理`

**期待されるログ**:
- ストア保存のログ
- Webhook登録のログ
- トライアル付与のログ

**確認ポイント**:
- [ ] `ProcessOAuthSuccessAsync`が実行されているか
- [ ] `storeId`が正しく生成されているか（ログでは`StoreId: 19`が確認済み）

---

### 3. `BuildRedirectUrlAsync`の実行確認

**検索キーワード**: `BuildRedirectUrlAsync`

**期待されるログ**:
```
[INF] BuildRedirectUrlAsync: hostParam={HostParam}, decodedHost={DecodedHost}
[INF] BuildRedirectUrlAsync: apiKey={ApiKey}, appUrl={AppUrl}
[INF] Built embedded app URL (direct to /auth/success): {RedirectUrl}
```

**確認ポイント**:
- [ ] `BuildRedirectUrlAsync`が呼ばれているか
- [ ] `hostParam`が正しく取得できているか
- [ ] `decodedHost`が正しく取得できているか
- [ ] `Built embedded app URL`のログが出力されているか

---

### 4. `DecodeHost`のエラー確認

**検索キーワード**: `hostパラメータのデコードに失敗` または `DecodeHost`

**確認ポイント**:
- [ ] `DecodeHost`が実行されているか
- [ ] エラーメッセージの詳細
- [ ] `host`パラメータの値（`YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUveG4tZmJrcTZlNWRhMGZwYg`）

---

### 5. リダイレクトURLの生成確認

**検索キーワード**: `Built embedded app URL` または `Built non-embedded app URL`

**期待されるログ**:
```
[INF] Built embedded app URL (direct to /auth/success): {RedirectUrl}
```

**確認ポイント**:
- [ ] リダイレクトURLが生成されているか
- [ ] リダイレクトURLに`storeId`が含まれているか
- [ ] リダイレクトURLに`success=true`が含まれているか

---

### 6. `EncryptToken`のエラー確認

**検索キーワード**: `Error occurred during token encryption`

**確認ポイント**:
- [ ] `EncryptToken`が実行されているか
- [ ] エラーメッセージの詳細
- [ ] Base64エンコードエラーの原因

---

## 問題の特定

### 現在の状況
1. ✅ OAuthコールバックは実行されている
2. ✅ 認証は成功している（`StoreId: 19`）
3. ❌ `host`パラメータのデコードに失敗している
4. ❌ `BuildRedirectUrlAsync`の埋め込みアプリの分岐に入っていない
5. ❌ `Built embedded app URL`のログが出力されていない

### 推測される原因
`host`パラメータのデコードに失敗しているため、`BuildRedirectUrlAsync`の埋め込みアプリの分岐（`if (!string.IsNullOrWhiteSpace(decodedHost))`）に入らず、フォールバック処理が実行されている可能性があります。

---

## 次のステップ

### 1. `DecodeHost`メソッドの確認

**確認事項**:
- `DecodeHost`メソッドの実装を確認
- Base64デコードの処理を確認
- エラーハンドリングを確認

### 2. `host`パラメータの値の確認

**確認事項**:
- `host`パラメータの実際の値
- Base64エンコードが正しく行われているか
- URLエンコードの問題がないか

### 3. `BuildRedirectUrlAsync`のフォールバック処理の確認

**確認事項**:
- フォールバック処理が実行されているか
- フォールバック処理で生成されるリダイレクトURL
- フォールバック処理のログ

---

## 参考資料

- [ExitIframeログ分析結果](./404エラー-ExitIframeログ分析結果.md)
- [OAuthコールバック未実行-ログ分析結果](./404エラー-OAuthコールバック未実行-ログ分析結果.md)
- [無限ループとOAuthコールバック未実行-調査](./404エラー-無限ループとOAuthコールバック未実行-調査.md)

---

## 更新履歴

- 2025-12-28: 初版作成（hostパラメータデコード失敗の調査）
