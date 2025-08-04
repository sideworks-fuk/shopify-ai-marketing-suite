# Shopifyカスタムアプリ開発・インストールガイド

## 目次

1. [前提条件](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E5%89%8D%E6%8F%90%E6%9D%A1%E4%BB%B6)
2. [Shopifyアプリの概念理解](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#shopify%E3%82%A2%E3%83%97%E3%83%AA%E3%81%AE%E6%A6%82%E5%BF%B5%E7%90%86%E8%A7%A3)
3. [開発環境のセットアップ](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E9%96%8B%E7%99%BA%E7%92%B0%E5%A2%83%E3%81%AE%E3%82%BB%E3%83%83%E3%83%88%E3%82%A2%E3%83%83%E3%83%97)
4. [Shopify Partnerアカウントと開発ストアの作成](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#shopify-partner%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88%E3%81%A8%E9%96%8B%E7%99%BA%E3%82%B9%E3%83%88%E3%82%A2%E3%81%AE%E4%BD%9C%E6%88%90)
5. [カスタムアプリの作成](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E3%82%AB%E3%82%B9%E3%82%BF%E3%83%A0%E3%82%A2%E3%83%97%E3%83%AA%E3%81%AE%E4%BD%9C%E6%88%90)
6. [アプリケーションの開発](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E9%96%8B%E7%99%BA)
    - [バックエンド (ASP.NET Core)](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E3%83%90%E3%83%83%E3%82%AF%E3%82%A8%E3%83%B3%E3%83%89-aspnet-core)
    - [フロントエンド (Next.js)](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E3%83%95%E3%83%AD%E3%83%B3%E3%83%88%E3%82%A8%E3%83%B3%E3%83%89-nextjs)
7. [Vercelとの連携](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#vercel%E3%81%A8%E3%81%AE%E9%80%A3%E6%90%BA)
8. [開発ストアでのテスト](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E9%96%8B%E7%99%BA%E3%82%B9%E3%83%88%E3%82%A2%E3%81%A7%E3%81%AE%E3%83%86%E3%82%B9%E3%83%88)
9. [カスタムアプリのインストール](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E3%82%AB%E3%82%B9%E3%82%BF%E3%83%A0%E3%82%A2%E3%83%97%E3%83%AA%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB)
10. [公開アプリへの移行手順](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E5%85%AC%E9%96%8B%E3%82%A2%E3%83%97%E3%83%AA%E3%81%B8%E3%81%AE%E7%A7%BB%E8%A1%8C%E6%89%8B%E9%A0%86)
11. [トラブルシューティング](https://claude.ai/chat/ad30cc4f-33ca-429a-974e-35ee34fafc59#%E3%83%88%E3%83%A9%E3%83%96%E3%83%AB%E3%82%B7%E3%83%A5%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0)

## 前提条件

- Node.js (最新LTS版)
- .NET 8 SDK
- Git
- Azure開発環境
- Shopify Partnerアカウント
- Vercelアカウント

## Shopifyアプリの概念理解

### カスタムアプリと公開アプリの違い

**カスタムアプリ**:

- 特定の1つのShopifyストア専用に開発されるアプリ
- Shopify App Storeには掲載されない
- 審査プロセスがない
- 開発と導入が比較的簡単

**公開アプリ**:

- 複数のShopifyストアにインストール可能
- Shopify App Storeに掲載可能
- Shopifyの審査プロセスが必要
- より厳格なセキュリティ要件がある

### Shopifyアプリのアーキテクチャ

Shopifyアプリは主に以下のコンポーネントで構成されます：

1. **フロントエンド**: Shopify管理画面に埋め込まれるUI部分（Embedded App）
2. **バックエンド**: APIエンドポイント、データ処理、認証処理
3. **Webhooks**: ストアでのイベント（注文作成など）に応じた処理

### 認証フロー

Shopifyアプリでは主にOAuth 2.0ベースの認証フローを使用します：

1. インストール時の認証（初回のみ）
2. セッション管理（継続的なAPI呼び出し）

## 開発環境のセットアップ

### Node.jsのインストール

```bash
# Nodeのバージョン確認
node -v

# npmのバージョン確認
npm -v

```

### .NET SDKのインストール

```bash
# .NETのバージョン確認
dotnet --version

```

### Shopify CLIのインストール

```bash
npm install -g @shopify/cli @shopify/app

```

## Shopify Partnerアカウントと開発ストアの作成

### Shopify Partnerアカウントの作成

1. [Shopify Partners](https://www.shopify.com/partners)にアクセス
2. 「Join for free」ボタンをクリック
3. 必要情報を入力してアカウントを作成

### 開発ストアの作成

1. Shopify Partnersダッシュボードにログイン
2. 「Stores」タブをクリック
3. 「Add store」ボタンをクリック
4. 「Development store」を選択
5. 必要情報を入力して開発ストアを作成

## カスタムアプリの作成

### Shopify管理画面でのアプリ作成

1. 開発ストアの管理画面にログイン
2. 「設定」メニューをクリック
3. 「アプリと販売チャネル」をクリック
4. 「アプリを開発」ボタンをクリック
5. 「アプリを作成」を選択
6. アプリ名と開発者URLを入力

### APIキーと権限の設定

1. 作成したアプリの詳細画面で「Configuration」タブを選択
2. 「Admin API access scopes」セクションで必要な権限を追加
    - 初期設定として最低限: `read_products`, `write_products`
3. 「API 資格情報」タブでAPIキーとAPIシークレットを確認
    1. 「アプリをインストール」ボタンをクリック
    2. 「インストール」ボタンをクリック
    3. 「アクセストークン」を確認。コピーして保管する。YOUR_ACCESS_TOKEN_HERE
    4. 「**APIキーとシークレットキー」を確認。**コピーして保管する。
        1. YOUR_API_KEY_HERE
        2. YOUR_API_SECRET_HERE

### Webhookの設定（必要に応じて）

1. 「Webhooks」タブを選択
2. 必要なWebhookイベントを登録（例：`orders/create`）
3. Webhook URLを設定（あなたのバックエンドサーバーのエンドポイント）

## アプリケーションの開発

### バックエンド (ASP.NET Core)

### プロジェクトの作成

```bash
# WebAPIプロジェクトの作成
dotnet new webapi -n ShopifyApp.API

# 必要なパッケージの追加
cd ShopifyApp.API
dotnet add package ShopifySharp
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer

```

### 基本的なディレクトリ構成

```
ShopifyApp.API/
├── Controllers/
│   ├── AuthController.cs
│   └── ProductsController.cs
├── Models/
│   └── ShopifySettings.cs
├── Services/
│   ├── ShopifyService.cs
│   └── WebhookService.cs
├── Program.cs
└── appsettings.json

```

### 認証コントローラーのサンプル実装

```csharp
// Controllers/AuthController.cs
using Microsoft.AspNetCore.Mvc;
using ShopifySharp;
using ShopifySharp.Auth;
using ShopifyApp.API.Models;

namespace ShopifyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ShopifySettings _settings;

        public AuthController(ShopifySettings settings)
        {
            _settings = settings;
        }

        [HttpGet("callback")]
        public async Task<IActionResult> Callback([FromQuery] string shop, [FromQuery] string code)
        {
            // OAuth認証の完了処理
            var accessToken = await AuthorizationService.GetAccessToken(
                _settings.ApiKey,
                _settings.ApiSecret,
                code);

            // アクセストークンを保存するロジック
            // ...

            return Ok("Authentication successful");
        }
    }
}

```

### Shopify設定クラスの実装

```csharp
// Models/ShopifySettings.cs
namespace ShopifyApp.API.Models
{
    public class ShopifySettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string ApiSecret { get; set; } = string.Empty;
        public string RedirectUri { get; set; } = string.Empty;
        public string[] Scopes { get; set; } = Array.Empty<string>();
    }
}

```

### プログラムクラスでの設定

```csharp
// Program.cs
using ShopifyApp.API.Models;

var builder = WebApplication.CreateBuilder(args);

// Shopify設定の追加
builder.Services.Configure<ShopifySettings>(builder.Configuration.GetSection("Shopify"));

// コントローラーの追加
builder.Services.AddControllers();

// CORSの設定
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("https://yourapp.vercel.app")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// ミドルウェアの設定
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();

```

### appsettings.jsonの設定

```json
{
  "Shopify": {
    "ApiKey": "your_api_key",
    "ApiSecret": "your_api_secret",
    "RedirectUri": "https://yourapp.vercel.app/api/auth/callback",
    "Scopes": [ "read_products", "write_products" ]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}

```

### フロントエンド (Next.js)

### プロジェクトの作成

```bash
npx create-next-app@latest shopify-app-frontend
cd shopify-app-frontend
npm install @shopify/app-bridge @shopify/app-bridge-react @shopify/polaris

```

### ディレクトリ構成

```
shopify-app-frontend/
├── components/
│   ├── AppBridgeProvider.js
│   ├── ProductList.js
│   └── Layout.js
├── pages/
│   ├── _app.js
│   ├── index.js
│   └── api/
│       └── auth/
│           └── callback.js
├── public/
├── styles/
├── next.config.js
└── package.json

```

### AppBridgeProviderの実装

```jsx
// components/AppBridgeProvider.js
import { Provider } from '@shopify/app-bridge-react';
import { useRouter } from 'next/router';

export function AppBridgeProvider({ children }) {
  const router = useRouter();

  // URLからショップドメイン取得
  const shopOrigin = router.query.shop;

  // AppBridge設定
  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY,
    host: router.query.host,
    forceRedirect: true
  };

  // ショップドメインがない場合は何も表示しない
  if (!shopOrigin) {
    return null;
  }

  return (
    <Provider config={config}>
      {children}
    </Provider>
  );
}

```

### _app.jsの実装

```jsx
// pages/_app.js
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import { AppBridgeProvider } from '../components/AppBridgeProvider';

function MyApp({ Component, pageProps }) {
  return (
    <AppProvider i18n={{}}>
      <AppBridgeProvider>
        <Component {...pageProps} />
      </AppBridgeProvider>
    </AppProvider>
  );
}

export default MyApp;

```

### トップページの実装

```jsx
// pages/index.js
import { Page, Card, Layout } from '@shopify/polaris';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ここでバックエンドAPIからデータを取得
    // 例: fetchProducts();
    setLoading(false);
  }, []);

  return (
    <Page title="Shopifyカスタムアプリ">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <p>アプリが正常に動作しています。</p>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

```

### 環境変数の設定

```
// .env.local
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key
NEXT_PUBLIC_API_URL=https://your-backend-url.azurewebsites.net

```

## Vercelとの連携

### Vercelプロジェクトのセットアップ

1. Vercelダッシュボードにログイン
2. 「New Project」をクリック
3. GitHubからリポジトリをインポート
4. 環境変数を設定（NEXT_PUBLIC_SHOPIFY_API_KEY, NEXT_PUBLIC_API_URL）
5. デプロイ設定を確認し「Deploy」をクリック

### 環境変数の設定

Vercelプロジェクト設定で以下の環境変数を追加：

- `NEXT_PUBLIC_SHOPIFY_API_KEY`: ShopifyアプリのAPIキー
- `NEXT_PUBLIC_API_URL`: バックエンドAPIのURL
- `SHOPIFY_API_SECRET`: APIシークレット（本番環境では暗号化）

## 開発ストアでのテスト

### カスタムアプリURLの設定

Shopifyパートナーダッシュボードで作成したカスタムアプリの設定を開き：

1. 「App URL」をVercelにデプロイしたフロントエンドのURLに設定
2. 「Allowed redirection URL(s)」に認証コールバックURLを追加
    - 例: `https://yourapp.vercel.app/api/auth/callback`

### バックエンドのデプロイ

1. Azure App Serviceにバックエンドをデプロイ
2. 環境変数またはアプリケーション設定でShopify API情報を設定

## カスタムアプリのインストール

### アプリのインストールURL生成

カスタムアプリの詳細画面から：

1. 「Configuration」タブを選択
2. 「Install app」ボタンをクリック
3. 画面の指示に従ってアプリをインストール

### 認証とインストールプロセス

1. 「Install app」ボタンをクリックすると認証画面が表示される
2. 必要な権限を確認して「Install app」をクリック
3. 認証が完了するとアプリのフロントエンドにリダイレクトされる

### インストール後の確認

1. Shopify管理画面の「Apps」メニューでアプリが表示されていることを確認
2. アプリをクリックして正常に動作することを確認

## 公開アプリへの移行手順

カスタムアプリとして開発・テストが完了したら、公開アプリへの移行を検討できます。

### 公開アプリの作成

1. Shopify Partnersダッシュボードで「Apps」→「Create app」をクリック
2. 「Public app」を選択してアプリ情報を入力
3. APIキーとシークレットを取得

### アプリコードの更新

1. 認証処理を公開アプリ用に更新
2. Webhookエンドポイントを更新
3. セキュリティ強化（HMAC検証など）

### App Store提出前の準備

1. プライバシーポリシーの作成
2. 利用規約の作成
3. サポート情報の追加
4. アプリのスクリーンショットと説明文の準備

## トラブルシューティング

### よくある問題と解決策

1. **認証エラー**
    - APIキーとシークレットが正しいか確認
    - リダイレクトURLが正確に設定されているか確認
2. **CORSエラー**
    - バックエンドのCORS設定を確認
    - 許可されているドメインにフロントエンドURLが含まれているか確認
3. **Webhook通知が届かない**
    - Webhook URLが公開アクセス可能か確認
    - HTTPS証明書が有効か確認
4. **APIレート制限**
    - API呼び出しの最適化
    - キャッシュの導入