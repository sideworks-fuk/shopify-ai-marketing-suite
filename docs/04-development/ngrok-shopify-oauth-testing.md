# ngrokを使用したShopify OAuth認証のローカルテスト手順

## 概要
Shopify OAuthをローカル環境でテストする際の具体的な手順です。ngrokを使用してHTTPS環境を構築し、OAuth認証フローを確認します。

## 事前準備

### 必要なもの
- Shopifyパートナーアカウント
- 開発ストア
- ngrokアカウント
- 動作するフロントエンド・バックエンドアプリ

## 手順

### 1. アプリケーションの起動

#### ターミナル1: バックエンド
```bash
cd backend/ShopifyAnalyticsApi
dotnet run
# http://localhost:5000 で起動
```

#### ターミナル2: フロントエンド
```bash
cd frontend
npm run dev
# http://localhost:3000 で起動
```

### 2. ngrokトンネルの作成

#### ターミナル3: バックエンド用ngrok
```bash
ngrok http 5000
# 例: https://backend-abc123.ngrok.io
```

#### ターミナル4: フロントエンド用ngrok
```bash
ngrok http 3000
# 例: https://frontend-xyz789.ngrok.io
```

### 3. Shopifyアプリ設定の更新

Shopifyパートナーダッシュボードで：

1. **App setup**ページへ移動
2. **URLs**セクションを更新：
   - **App URL**: `https://frontend-xyz789.ngrok.io/install`
   - **Allowed redirection URL(s)**:
     ```
     https://frontend-xyz789.ngrok.io/api/auth/callback
     https://backend-abc123.ngrok.io/api/shopify/callback
     ```

### 4. 環境変数の更新

#### frontend/.env.local
```env
# API設定
NEXT_PUBLIC_API_URL=https://backend-abc123.ngrok.io
NEXT_PUBLIC_APP_URL=https://frontend-xyz789.ngrok.io

# Shopify OAuth設定
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
```

#### backend/appsettings.Development.json
```json
{
  "Shopify": {
    "ClientId": "your_client_id",
    "ClientSecret": "your_client_secret",
    "AppUrl": "https://frontend-xyz789.ngrok.io",
    "RedirectUri": "https://backend-abc123.ngrok.io/api/shopify/callback",
    "Scopes": "read_customers,read_orders,read_products"
  },
  "Frontend": {
    "BaseUrl": "https://frontend-xyz789.ngrok.io"
  }
}
```

### 5. アプリケーションの再起動

環境変数を更新したら、両方のアプリを再起動：

```bash
# Ctrl+C で停止後、再度起動
dotnet run
npm run dev
```

### 6. OAuth認証フローのテスト

#### 方法1: Shopifyパートナーダッシュボードから
1. **Test your app**をクリック
2. 開発ストアを選択
3. **Install app**をクリック

#### 方法2: 直接URLアクセス
```
https://YOUR_STORE.myshopify.com/admin/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=read_customers,read_orders&redirect_uri=https://backend-abc123.ngrok.io/api/shopify/callback&state=nonce
```

### 7. 認証フローの確認ポイント

1. **インストールページ表示**
   - `https://frontend-xyz789.ngrok.io/install`が正しく表示されるか

2. **Shopifyへのリダイレクト**
   - Shopifyの認証画面が表示されるか
   - スコープが正しく表示されているか

3. **コールバック処理**
   - 認証後、正しくコールバックURLに戻るか
   - アクセストークンが取得できているか

4. **リダイレクト完了**
   - 最終的にアプリのダッシュボードに遷移するか

## デバッグ方法

### ブラウザの開発者ツール
1. **Network**タブでリクエストを確認
2. **Console**でエラーを確認
3. **Application** > **Cookies**でセッション確認

### バックエンドログ
```bash
# .NET のログレベルを詳細に
export ASPNETCORE_ENVIRONMENT=Development
export Logging__LogLevel__Default=Debug
```

### ngrokインスペクタ
```
http://localhost:4040
```
でリクエスト/レスポンスの詳細を確認

## よくある問題と解決策

### 1. Invalid redirect_uri エラー
- Shopifyアプリ設定のAllowed redirection URLsを確認
- URLが完全一致しているか確認（末尾の/も含む）

### 2. CORSエラー
```csharp
// Program.csでngrok URLを追加
.WithOrigins("https://frontend-xyz789.ngrok.io")
```

### 3. HMAC検証エラー
- Client SecretがフロントエンドとバックエンドDで一致しているか確認
- URLエンコーディングの問題がないか確認

### 4. セッションが保持されない
- SameSite Cookieの設定を確認
- HTTPSでないとセキュアCookieが動作しない

## テスト完了後のクリーンアップ

1. ngrokトンネルを停止（Ctrl+C）
2. Shopifyアプリ設定を元に戻す
3. 環境変数を元に戻す
4. テスト用のアクセストークンを無効化

## セキュリティ注意事項

- ngrok URLは公開されているため、機密データの扱いに注意
- テスト完了後は必ずトンネルを停止
- 本番用のClient Secret等は使用しない
- Basic認証やIPホワイトリストの使用を検討

---
作成日: 2025-08-01
更新日: 2025-08-01