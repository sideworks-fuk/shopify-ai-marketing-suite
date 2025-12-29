# 404エラー - 無限ループとOAuthコールバック未実行 調査

## 作成日
2025-12-28

## 目的
無限ループが解消されていない問題と、バックエンドのログに「Built embedded app URL」が見つからない問題を調査する。

---

## 問題の概要

### 症状
1. ❌ 無限ループが解消されていない
   - `[AuthSuccess] useEffect実行開始`が繰り返し実行されている
   - `storeId: null`の状態で処理がスキップされているが、`useEffect`自体が繰り返し実行されている

2. ❌ バックエンドのログに「Built embedded app URL」が見つからない
   - OAuthコールバックが実行されていない可能性がある

---

## 根本原因の分析

### 問題1: 無限ループ

**原因**:
- `useEffect`の依存配列に`searchParams`が含まれているため、`searchParams`オブジェクトが変更されるたびに`useEffect`が再実行される
- `searchParams?.toString()`を依存配列に含めても、`searchParams`オブジェクト自体が変更される可能性がある

**解決策**:
- 依存配列を空にして、マウント時のみ実行する
- `searchParams`は`useEffect`内で取得する（依存配列に含めない）

---

### 問題2: OAuthコールバック未実行

**原因の可能性**:
1. OAuthコールバックが実行されていない
2. ログが出力されていない
3. 別のパスでリダイレクトされている

**確認事項**:
1. バックエンドのログで`OAuth callback received`が出力されているか
2. バックエンドのログで`ProcessOAuthSuccessAsync`が実行されているか
3. バックエンドのログで`BuildRedirectUrlAsync`が呼ばれているか

---

## バックエンドのコード確認

### OAuthコールバックエンドポイント

**エンドポイント**: `[HttpGet("callback")]` - `/api/shopify/callback`

**処理フロー**:
1. `OAuth callback received`ログ出力（line 264）
2. パラメータ検証
3. State検証
4. HMAC検証
5. アクセストークン取得
6. `ProcessOAuthSuccessAsync`実行（line 341）
7. `BuildRedirectUrlAsync`実行（line 355）
8. `Built embedded app URL (direct to /auth/success)`ログ出力（line 1885）
9. リダイレクト

---

## 修正内容

### 1. 無限ループを防ぐ修正

**変更点**:
- 依存配列を空にして、マウント時のみ実行
- `searchParams`は`useEffect`内で取得する（依存配列に含めない）

**理由**:
- `searchParams`オブジェクトが変更されるたびに`useEffect`が再実行されるのを防ぐ

---

## 確認事項

### フロントエンドの確認
- [ ] `useEffect`が1回のみ実行されているか
- [ ] 無限ループが解消されているか
- [ ] `storeId`が正しく取得できているか

### バックエンドのログ確認
- [ ] `OAuth callback received`のログがあるか
- [ ] `ProcessOAuthSuccessAsync`が実行されているか
- [ ] `Built embedded app URL (direct to /auth/success)`のログがあるか
- [ ] リダイレクトURLに`storeId`が含まれているか

---

## 次のステップ

1. フロントエンドの修正をデプロイして、無限ループが解消されているか確認
2. バックエンドのログを確認して、OAuthコールバックが実行されているか確認
3. OAuthコールバックが実行されていない場合、原因を調査

---

## 参考資料

- [ExitIframeログ分析結果](./404エラー-ExitIframeログ分析結果.md)
- [OAuthコールバック未実行-ログ分析結果](./404エラー-OAuthコールバック未実行-ログ分析結果.md)
- [処理中画面で止まる問題調査](./404エラー-処理中画面で止まる問題調査.md)

---

## 更新履歴

- 2025-12-28: 初版作成（無限ループとOAuthコールバック未実行の調査）
