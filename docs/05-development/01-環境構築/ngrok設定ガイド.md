# ngrokを使用したローカル開発環境HTTPS設定ガイド（統合版）

## 概要
ローカル開発環境でShopify OAuth認証をテストするには、HTTPS環境が必要です。ngrokを使用することで、簡単にローカル環境をHTTPSで公開できます。

## 前提条件
- ngrokアカウント（無料版でOK）
- Node.js/npm または .NET環境
- ローカルで動作するアプリケーション

## セットアップ手順

### 1. ngrokのインストール

#### Windows (Chocolatey)
```bash
choco install ngrok
```

#### macOS (Homebrew)
```bash
brew install ngrok
```

#### 直接ダウンロード
[ngrok公式サイト](https://ngrok.com/download)からダウンロード

### 2. ngrokアカウントの設定

1. [ngrok](https://ngrok.com/)でアカウント作成
2. ダッシュボードからAuth Tokenを取得
3. トークンを設定:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 3. ローカルサーバーの起動

#### フロントエンド (Next.js)
```bash
cd frontend
npm run dev
# デフォルトで http://localhost:3000 で起動
```

#### バックエンド (.NET)
```bash
cd backend/ShopifyAnalyticsApi
dotnet run
# デフォルトで http://localhost:5000 で起動
```

### 4. ngrokトンネルの起動

#### フロントエンド用
```bash
ngrok http 3000
```

#### バックエンド用（別ターミナルで）
```bash
ngrok http 5000
```

### 5. HTTPS URLの確認
ngrok起動後、以下のような情報が表示されます：
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```
この`https://abc123.ngrok.io`がHTTPS URLです。

## Shopify OAuth認証テスト設定

### 1. Shopify Appの設定更新

Shopify Partner Dashboardで以下を更新：

#### App URLs
- **App URL**: `https://your-frontend.ngrok.io`
- **Allowed redirection URL(s)**: 
  - `https://your-frontend.ngrok.io/api/shopify/callback`
  - `https://your-frontend.ngrok.io/auth/callback`
  - `https://your-frontend.ngrok.io/auth/success`

### 2. 環境変数の設定

#### フロントエンド (.env.local)
```env
NEXT_PUBLIC_SHOPIFY_APP_URL=https://your-frontend.ngrok.io
NEXT_PUBLIC_BACKEND_URL=https://your-backend.ngrok.io
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
```

#### バックエンド (appsettings.Development.json)
```json
{
  "Frontend": {
    "BaseUrl": "https://your-frontend.ngrok.io"
  },
  "Shopify": {
    "ApiKey": "your_api_key",
    "ApiSecret": "your_api_secret"
  }
}
```

### 3. OAuth認証フローのテスト

#### インストールフローの確認
1. **インストール開始**
   ```
   https://your-frontend.ngrok.io/install?shop=your-dev-store.myshopify.com
   ```

2. **Shopify認証画面**
   - Shopifyの認証画面にリダイレクト
   - アプリの権限を確認して承認

3. **コールバック処理**
   - `https://your-frontend.ngrok.io/api/shopify/callback`にリダイレクト
   - 認証コードを使用してアクセストークンを取得

4. **完了**
   - `/auth/success`ページにリダイレクト
   - ストア情報がデータベースに保存される

## トラブルシューティング

### 1. Invalid callback URL エラー
**原因**: Shopify AppのCallback URLが正しく設定されていない
**解決方法**: 
- Partner DashboardでAllowed redirection URLsを確認
- ngrokのURLが変わった場合は更新が必要

### 2. CORS エラー
**原因**: バックエンドのCORS設定が不適切
**解決方法**:
```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNgrok",
        builder => builder
            .WithOrigins("https://your-frontend.ngrok.io")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});
```

### 3. Mixed Content エラー
**原因**: HTTPSページからHTTPリソースを読み込もうとしている
**解決方法**: 
- すべてのAPI呼び出しがHTTPSを使用していることを確認
- 環境変数のURLがすべてHTTPSであることを確認

### 4. ngrok セッションタイムアウト
**原因**: 無料版のngrokは8時間でセッション切断
**解決方法**: 
- ngrokを再起動
- 新しいURLでShopify App設定を更新

## 実装サンプル

### フロントエンド - OAuth開始
```typescript
// /app/install/page.tsx
const handleInstall = async () => {
  const shop = shopDomain.trim();
  const redirectUri = `${process.env.NEXT_PUBLIC_SHOPIFY_APP_URL}/api/shopify/callback`;
  const installUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/shopify/install?shop=${shop}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = installUrl;
};
```

### バックエンド - OAuth処理
```csharp
// ShopifyAuthController.cs
[HttpGet("install")]
public IActionResult Install(string shop, string redirect_uri)
{
    var state = GenerateRandomState();
    var authUrl = $"https://{shop}/admin/oauth/authorize?" +
        $"client_id={_shopifySettings.ApiKey}&" +
        $"scope={_shopifySettings.Scopes}&" +
        $"redirect_uri={redirect_uri}&" +
        $"state={state}";
    
    return Redirect(authUrl);
}
```

## ベストプラクティス

### 1. 環境変数の管理
- 本番用の値を誤ってコミットしないよう注意
- `.env.local.example`ファイルでテンプレートを提供

### 2. セキュリティ
- stateパラメータを使用してCSRF攻撃を防ぐ
- アクセストークンは暗号化して保存
- HTTPS通信を強制

### 3. 開発効率
- ngrok設定をスクリプト化:
```bash
#!/bin/bash
# start-ngrok.sh
echo "Starting ngrok tunnels..."
ngrok http 3000 --domain=your-custom.ngrok.io &
ngrok http 5000 --domain=your-backend.ngrok.io &
```

### 4. チーム開発
- ngrok URLを共有する際はAuth Tokenを含めない
- 各開発者が独自のngrokアカウントを使用

## まとめ
ngrokを使用することで、ローカル開発環境でShopify OAuthを含む完全な認証フローをテストできます。設定は複雑に見えますが、一度セットアップすれば効率的な開発が可能になります。

## 関連ドキュメント
- [Shopify OAuth認証実装ガイド](./shopify-oauth-local-testing-guide.md)
- [環境設定統合ガイド](./environment-configuration-unified-guide.md)
- [開発環境セットアップマスター](./DEVELOPMENT-SETUP-MASTER.md)