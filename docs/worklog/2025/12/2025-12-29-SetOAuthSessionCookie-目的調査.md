# 作業ログ: SetOAuthSessionCookieの目的調査

## 作業情報
- 開始日時: 2025-12-29 17:00:00
- 完了日時: 2025-12-29 17:15:00
- 所要時間: 15分
- 担当: 福田＋AI Assistant

## 作業概要
`SetOAuthSessionCookie`メソッドの目的と実際の使用状況を調査しました。

## 調査結果

### 1. SetOAuthSessionCookieの目的

**コメントより**:
```csharp
// OAuth認証成功後、セッションCookieを設定（埋め込みアプリでない場合の認証に使用）
// Cookie名: oauth_session
// 値: storeIdとshopドメインを含むJSON（暗号化推奨だが、開発環境では簡易実装）
```

**想定される用途**:
- **スタンドアロンアプリ**（埋め込みアプリでない場合）の認証に使用
- Authorizationヘッダーがない場合のフォールバック認証

### 2. 実際の使用状況

#### 2.1 バックエンドでの使用

`AuthModeMiddleware`で`oauth_session` Cookieを読み取っています：

```csharp
// OAuth認証成功後のセッションCookieを確認（埋め込みアプリでない場合の認証）
// これはAuthorizationヘッダーがない場合のフォールバックとして機能
var oauthSessionCookie = context.Request.Cookies["oauth_session"];

if (!string.IsNullOrEmpty(oauthSessionCookie))
{
    // CookieからstoreIdとshopを取得して認証結果を設定
    var sessionData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(oauthSessionCookie);
    if (sessionData.TryGetProperty("storeId", out var storeIdElement) && 
        sessionData.TryGetProperty("shop", out var shopElement))
    {
        var storeId = storeIdElement.GetInt32();
        var shop = shopElement.GetString();
        
        // 認証結果を設定
        authResult = new AuthenticationResult
        {
            IsValid = true,
            StoreId = storeId,
            ShopDomain = shop,
            AuthMode = "OAuthSession"
        };
    }
}
```

**認証の優先順位**:
1. **OAuthセッションCookie**（優先）
2. Authorizationヘッダー（Shopify App Bridgeセッショントークン）
3. デモトークン
4. 開発者トークン（開発環境のみ）

#### 2.2 フロントエンドでの使用

`AuthProvider`のコメントより：
```typescript
// スタンドアロンアプリの場合
// OAuth認証成功後は、バックエンドがCookieベースの認証を使用する想定
// デモトークンがある場合は使用、ない場合はOAuth認証成功フラグを確認
if (oauthAuthenticated === 'true') {
  // OAuth認証成功後: Cookieベースの認証を使用（Authorizationヘッダーは不要）
  client = new ApiClient(); // getShopifyTokenなし = Cookieベース認証
  setAuthMode('shopify')
  console.log('🔗 OAuth認証済み: Cookieベース認証を使用')
}
```

**フロントエンドの実装**:
- フロントエンドは`credentials: 'include'`を使用してCookieを送信している
- しかし、**現在の実装では主にShopify埋め込みアプリとして動作している**
- 埋め込みアプリの場合は、App Bridgeのセッショントークンを使用している

### 3. 問題点

#### 3.1 クロスサイトCookieの問題

**現在の構成**:
- フロントエンド: `https://unsavagely-repressive-terrance.ngrok-free.dev`（ngrok経由）
- バックエンド: `https://localhost:7088`

**問題**:
1. **バックエンドでCookieをセットしても、フロントエンド（別ドメイン）からは読み取れない**
2. フロントエンドからバックエンドAPIを呼び出す際に、このCookieが送信されるかどうかは、SameSite設定とドメインの関係による
3. `SameSite=None`の場合は`Secure=true`が必須だが、`localhost`ではHTTPSが必須

#### 3.2 実際の使用状況

**現在の実装では**:
- フロントエンドは主に**Shopify埋め込みアプリ**として動作している
- 埋め込みアプリの場合は、**App Bridgeのセッショントークン**を使用している
- スタンドアロンアプリの場合のみ、Cookieベースの認証を使用する想定だが、**実際には使用されていない可能性が高い**

### 4. 結論

#### 4.1 SetOAuthSessionCookieの目的

`SetOAuthSessionCookie`は、**スタンドアロンアプリ（埋め込みアプリでない場合）の認証に使用される想定**で実装されています。

**想定されるシナリオ**:
1. ユーザーがブラウザで直接アプリにアクセス（埋め込みアプリではない）
2. OAuth認証を完了
3. バックエンドが`oauth_session` Cookieをセット
4. 以降のAPIリクエストで、このCookieを使用して認証

#### 4.2 現在の実装での問題

**問題点**:
1. **現在の実装では、フロントエンドは主にShopify埋め込みアプリとして動作している**
2. 埋め込みアプリの場合は、App Bridgeのセッショントークンを使用しているため、Cookieは使用されていない
3. スタンドアロンアプリの場合でも、フロントエンドとバックエンドが別ドメインの場合、Cookieが正しく送信されない可能性がある

#### 4.3 推奨される対応

**オプション1: Cookieを削除する（推奨）**
- 現在の実装では、埋め込みアプリが主流のため、Cookieは使用されていない
- スタンドアロンアプリのサポートが必要な場合は、別途検討する

**オプション2: Cookieの実装を改善する**
- フロントエンドとバックエンドが同じドメインになるように構成する
- または、Cookieの代わりにJWTトークンを使用する

**オプション3: スタンドアロンアプリのサポートを追加する**
- スタンドアロンアプリの場合、OAuth認証成功後にJWTトークンを発行する
- フロントエンドでJWTトークンを保存し、APIリクエスト時にAuthorizationヘッダーに含める

## 関連ファイル
- `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` (SetOAuthSessionCookie)
- `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs` (oauth_session Cookieの読み取り)
- `frontend/src/components/providers/AuthProvider.tsx` (Cookieベース認証の想定)
