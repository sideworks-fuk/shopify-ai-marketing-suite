# 作業ログ: SetOAuthSessionCookieと「処理中のままで止まる問題」の関係調査

## 作業情報
- 開始日時: 2025-12-29 17:15:00
- 完了日時: 2025-12-29 17:30:00
- 所要時間: 15分
- 担当: 福田＋AI Assistant

## 作業概要
`SetOAuthSessionCookie`と「処理中のままで止まる問題」の関係を調査しました。

## 調査結果

### 1. 「処理中のままで止まる問題」の原因

`/auth/success`ページで「処理中...」のまま進まない問題の原因は、以下の可能性があります：

1. **`refreshStores()`がタイムアウトしている**
2. **`storeId`の取得に失敗している**
3. **API呼び出しが401エラーで失敗している**

### 2. SetOAuthSessionCookieとの関係

#### 2.1 認証フローの確認

**OAuthコールバック処理の流れ**:
1. バックエンド: `/api/shopify/callback`でOAuth認証を処理
2. バックエンド: `SetOAuthSessionCookie()`で`oauth_session` Cookieをセット
3. バックエンド: `/auth/success`にリダイレクト
4. フロントエンド: `/auth/success`ページで`refreshStores()`を呼び出す
5. フロントエンド: `refreshStores()`内で`/api/store`を呼び出す（`credentials: 'include'`を使用）

#### 2.2 認証方式の確認

**埋め込みアプリの場合**:
- フロントエンドは**App Bridgeのセッショントークン**を使用
- `ApiClient`は`getShopifyToken`を使用してAuthorizationヘッダーにトークンを設定
- `SetOAuthSessionCookie`でセットしたCookieは**使用されない**（App Bridgeセッショントークンが優先される）

**スタンドアロンアプリの場合**:
- フロントエンドは**Cookieベース認証**を使用
- `oauth_authenticated === 'true'`の場合、`ApiClient`は`getShopifyToken`なしで初期化
- `SetOAuthSessionCookie`でセットしたCookieが**使用される**

#### 2.3 refreshStores()の実装

`refreshStores()`は`credentials: 'include'`を使用してAPIを呼び出しています：

```typescript
const response = await fetch(`${getApiUrl()}/api/store`, {
  credentials: 'include', // JWTトークンを送信
})
```

**問題点**:
- `credentials: 'include'`はCookieを送信するが、**埋め込みアプリの場合はApp Bridgeセッショントークンを使用している**
- しかし、`refreshStores()`は直接`fetch`を使用しているため、**Authorizationヘッダーが設定されていない**
- そのため、`/api/store`へのリクエストが401エラーで失敗する可能性がある

### 3. 問題の原因

#### 3.1 埋め込みアプリの場合

**現在の実装**:
- `refreshStores()`は直接`fetch`を使用しており、**Authorizationヘッダーが設定されていない**
- `credentials: 'include'`でCookieを送信するが、埋め込みアプリの場合は**App Bridgeセッショントークンが必要**
- `SetOAuthSessionCookie`でセットしたCookieは**使用されない**（App Bridgeセッショントークンが優先される）

**問題**:
- `refreshStores()`が401エラーで失敗する可能性がある
- タイムアウト（5秒）が発生する可能性がある
- 「処理中のままで止まる問題」の原因になる可能性がある

#### 3.2 スタンドアロンアプリの場合

**現在の実装**:
- `oauth_authenticated === 'true'`の場合、`ApiClient`はCookieベース認証を使用
- `SetOAuthSessionCookie`でセットしたCookieが**使用される**
- しかし、`refreshStores()`は直接`fetch`を使用しているため、**Cookieが正しく送信されない可能性がある**

**問題**:
- フロントエンドとバックエンドが別ドメインの場合、Cookieが正しく送信されない可能性がある
- `SameSite=None`の場合は`Secure=true`が必須だが、`localhost`ではHTTPSが必須

### 4. 結論

#### 4.1 SetOAuthSessionCookieと「処理中のままで止まる問題」の関係

**直接的な関係はないが、間接的な関係がある可能性がある**:

1. **埋め込みアプリの場合**:
   - `SetOAuthSessionCookie`でセットしたCookieは**使用されない**（App Bridgeセッショントークンが優先される）
   - しかし、`refreshStores()`が直接`fetch`を使用しているため、**Authorizationヘッダーが設定されていない**
   - そのため、`/api/store`へのリクエストが401エラーで失敗する可能性がある
   - **「処理中のままで止まる問題」の原因になる可能性がある**

2. **スタンドアロンアプリの場合**:
   - `SetOAuthSessionCookie`でセットしたCookieが**使用される**
   - しかし、フロントエンドとバックエンドが別ドメインの場合、Cookieが正しく送信されない可能性がある
   - そのため、`/api/store`へのリクエストが401エラーで失敗する可能性がある
   - **「処理中のままで止まる問題」の原因になる可能性がある**

#### 4.2 推奨される対応

**オプション1: refreshStores()を修正する（推奨）**
- `refreshStores()`で`ApiClient`を使用するように修正
- これにより、埋め込みアプリの場合はApp Bridgeセッショントークンが自動的に使用される
- スタンドアロンアプリの場合は、Cookieベース認証が使用される

**オプション2: SetOAuthSessionCookieを削除する**
- 現在の実装では、埋め込みアプリが主流のため、Cookieは使用されていない
- スタンドアロンアプリのサポートが必要な場合は、別途検討する

**オプション3: 認証方式を統一する**
- 埋め込みアプリとスタンドアロンアプリの両方で、JWTトークンを使用する
- Cookieベース認証を廃止する

## 関連ファイル
- `frontend/src/app/auth/success/page.tsx` (refreshStores()の呼び出し)
- `frontend/src/contexts/StoreContext.tsx` (refreshStores()の実装)
- `frontend/src/components/providers/AuthProvider.tsx` (認証方式の決定)
- `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` (SetOAuthSessionCookie)
- `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs` (oauth_session Cookieの読み取り)
