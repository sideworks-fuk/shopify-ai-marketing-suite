# 404エラー - ExitIframe二重呼び出し問題

## 作成日
2025-12-28

## 目的
ExitIframeページが2回呼ばれ、2回目で`redirectUri`が取得できず、App Bridgeが利用できない問題を調査する。

---

## 問題の概要

### ログの流れ

1. ✅ ExitIframeページへのリダイレクトを実行
2. ✅ [ExitIframe] iframe脱出処理を開始
3. ✅ [ExitIframe] リダイレクト先: `https://shopifyapp-backend-develop-...`（取得成功）
4. ✅ [ExitIframe] 外部URLへのリダイレクトを実行しました
5. ❌ [ExitIframe] App Bridgeが利用できません（2回目）
6. ❌ [ExitIframe] redirectUriパラメータがありません（2回目）

### 問題の分析

**1回目のExitIframeページ呼び出し**:
- インストールページから`Redirect.toApp({ path: '/auth/exit-iframe?redirectUri=...' })`でリダイレクト
- `redirectUri`パラメータが正常に取得できた
- 外部URL（バックエンドの`/api/shopify/install`）にリダイレクト成功

**2回目のExitIframeページ呼び出し**:
- OAuth認証完了後、バックエンドの`BuildRedirectUrlAsync`がExitIframeページへのURLを構築してリダイレクト
- この時点で、既にiframeから脱出しているため、App Bridgeが利用できない
- `redirectUri`パラメータも失われている可能性

---

## 原因の特定

### 原因: OAuthコールバック後のリダイレクト処理の問題

**問題箇所**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` (1886行目)

**実装**:
```csharp
// 埋め込みアプリの場合、ExitIframePageを経由してリダイレクト
var exitIframeUrl = $"{appUrl.TrimEnd('/')}/auth/exit-iframe?redirectUri={Uri.EscapeDataString(finalRedirectUrl)}";
return exitIframeUrl;
```

**問題**:
- OAuthコールバック後（`/api/shopify/callback`）のリダイレクトで、ExitIframeページへのURLを構築している
- しかし、この時点では既にiframeから脱出しているため、ExitIframeページを経由する必要がない
- ExitIframeページが再度呼ばれると、App Bridgeが利用できず、`redirectUri`パラメータも失われる

---

## 処理フローの問題

### 現在の処理フロー

1. **インストールページ** (`/install`)
   - 「接続を開始」ボタンをクリック
   - `Redirect.toApp({ path: '/auth/exit-iframe?redirectUri=...' })`でリダイレクト

2. **ExitIframeページ（1回目）** (`/auth/exit-iframe`)
   - `redirectUri`パラメータを取得
   - 外部URL（`/api/shopify/install`）にリダイレクト

3. **バックエンド `/api/shopify/install`**
   - OAuth URLを構築
   - Shopifyの認証ページにリダイレクト

4. **Shopify認証ページ**
   - ユーザーが認証を完了
   - バックエンドの`/api/shopify/callback`にリダイレクト

5. **バックエンド `/api/shopify/callback`**
   - OAuth認証を処理
   - `BuildRedirectUrlAsync`でExitIframeページへのURLを構築
   - ExitIframeページにリダイレクト

6. **ExitIframeページ（2回目）** (`/auth/exit-iframe`)
   - ❌ App Bridgeが利用できない（既にiframeから脱出しているため）
   - ❌ `redirectUri`パラメータが取得できない

---

## 解決策

### 解決策1: OAuthコールバック後のリダイレクトを直接`/auth/success`にする（推奨）

**目的**: OAuthコールバック後は既にiframeから脱出しているため、ExitIframeページを経由せず、直接`/auth/success`にリダイレクトする

**実装箇所**: `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` (1850行目)

**修正内容**:
```csharp
private async Task<string> BuildRedirectUrlAsync(
    string shop,
    int storeId,
    string apiKey,
    string? hostParam,
    string? embeddedParam)
{
    // 埋め込みアプリの場合
    if (!string.IsNullOrWhiteSpace(hostParam))
    {
        var appUrl = await GetShopifyAppUrlAsync(apiKey);
        
        // OAuthコールバック後は既にiframeから脱出しているため、
        // ExitIframeページを経由せず、直接/auth/successにリダイレクト
        var finalRedirectUrl = $"{appUrl.TrimEnd('/')}/auth/success?shop={Uri.EscapeDataString(shop)}&storeId={storeId}&success=true&host={Uri.EscapeDataString(hostParam)}";
        if (!string.IsNullOrWhiteSpace(embeddedParam))
        {
            finalRedirectUrl += $"&embedded={Uri.EscapeDataString(embeddedParam)}";
        }
        
        _logger.LogInformation("Built embedded app URL (direct to /auth/success): {RedirectUrl}", finalRedirectUrl);
        return finalRedirectUrl;
    }
    // ...
}
```

**メリット**:
- ExitIframeページの二重呼び出しを防ぐ
- OAuthコールバック後は既にiframeから脱出しているため、ExitIframeページを経由する必要がない
- シンプルで明確な処理フロー

---

### 解決策2: ExitIframeページでApp Bridgeが利用できない場合の処理を追加

**目的**: ExitIframeページが2回目に呼ばれた場合でも、`redirectUri`パラメータがあれば直接リダイレクトする

**実装箇所**: `frontend/src/app/auth/exit-iframe/page.tsx`

**修正内容**:
```typescript
useEffect(() => {
  // App Bridgeが利用できない場合でも、redirectUriがあれば直接リダイレクト
  if (!redirectUri) {
    console.error('❌ [ExitIframe] redirectUriパラメータがありません');
    setError('リダイレクト先が指定されていません。');
    return;
  }

  // redirectUriが外部URLの場合は、App Bridgeがなくても直接リダイレクト
  if (redirectUri && (redirectUri.startsWith('http://') || redirectUri.startsWith('https://'))) {
    console.log('🌐 [ExitIframe] 外部URLを検出: 直接リダイレクトを実行（App Bridge不要）');
    window.location.href = redirectUri;
    return;
  }

  // App Bridgeが必要な場合（相対パスの場合）
  if (!app) {
    console.error('❌ [ExitIframe] App Bridgeが利用できません');
    setError('App Bridgeが利用できません。埋め込みアプリとして実行されていることを確認してください。');
    return;
  }

  // 相対パスの場合、App Bridgeを使用してリダイレクト
  app.dispatch(Redirect.toApp({ path: redirectUri }));
}, [app, redirectUri]);
```

**メリット**:
- 既存の処理フローを維持
- ExitIframeページが2回目に呼ばれた場合でも対応可能

**デメリット**:
- 根本原因（ExitIframeページの二重呼び出し）を解決していない

---

## 推奨対応

### 推奨: 解決策1（OAuthコールバック後のリダイレクトを直接`/auth/success`にする）

**理由**:
1. **根本原因の解決**: ExitIframeページの二重呼び出しを防ぐ
2. **処理フローの明確化**: OAuthコールバック後は既にiframeから脱出しているため、ExitIframeページを経由する必要がない
3. **シンプルな実装**: 不要な処理を削除できる

**実施手順**:
1. `BuildRedirectUrlAsync`メソッドを修正
2. 埋め込みアプリの場合でも、OAuthコールバック後は直接`/auth/success`にリダイレクト
3. 動作確認

---

## 調査手順

### ステップ1: バックエンドログの確認

**目的**: OAuthコールバックが正常に完了しているか確認

**確認方法**:
1. バックエンドのログを確認
2. `BuildRedirectUrlAsync`が呼ばれているか確認
3. 構築されたリダイレクトURLを確認
4. ExitIframeページへのURLが構築されているか確認

**確認ポイント**:
- [ ] OAuthコールバックが呼ばれているか
- [ ] `ProcessOAuthSuccessAsync()`が正常に実行されているか
- [ ] `BuildRedirectUrlAsync`がExitIframeページへのURLを構築しているか
- [ ] Storesテーブルにレコードが作成されているか

---

### ステップ2: 処理フローの確認

**目的**: ExitIframeページが2回呼ばれる理由を確認

**確認方法**:
1. ネットワークタブでリダイレクトの流れを確認
2. 各リダイレクトのURLを確認
3. ExitIframeページが2回呼ばれるタイミングを確認

**確認ポイント**:
- [ ] 1回目のExitIframeページ呼び出しのURL
- [ ] 2回目のExitIframeページ呼び出しのURL
- [ ] 2回目の呼び出しがどこから来ているか

---

## 参考資料

- [接続開始エラー調査](./404エラー-接続開始エラー調査.md)
- [動作確認結果](./404エラー-動作確認結果.md)
- [Shopify App Bridge Redirect Documentation](https://shopify.dev/docs/api/app-bridge-library/actions/navigation/redirect)

---

## 更新履歴

- 2025-12-28: 初版作成（ExitIframe二重呼び出し問題の調査）
