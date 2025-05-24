
# セットアップ手順 (Windows/PowerShell)

## 開発環境のセットアップ

### 前提条件

- [Node.js](https://nodejs.org/) (v18.0.0以上)
- [npm](https://www.npmjs.com/) (v9.0.0以上)
- [Git](https://git-scm.com/)
- PowerShell 5.1以上（Windows 10/11に標準搭載）

### 手順

1. **リポジトリのクローン**

```powershell
   git clone https://github.com/sideworks-fuk/shopify-ai-marketing-suite.git
   cd shopify-ai-marketing-suite
```

2. **依存関係のインストール**

```powershell
npm install
```


3. **環境変数の設定**

PowerShellで`.env.local`ファイルを作成します：

```powershell
@"
# Shopify API
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

# NextAuth.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
"@ | Out-File -FilePath .env.local -Encoding utf8
```

または、メモ帳などのテキストエディタで`.env.local`ファイルを作成し、上記の内容をコピー＆ペーストすることもできます。


4. **開発サーバーの起動**

```powershell
npm run dev
```


5. **ブラウザでアクセス**

[http://localhost:3000](http://localhost:3000) にアクセスして開発環境を確認します。




## Shopify APIの設定

### Shopify Appの作成

1. [Shopify Partners](https://partners.shopify.com/)にログイン
2. 「Apps」→「Create app」をクリック
3. アプリ名と説明を入力
4. App URLとRedirect URLを設定

1. App URL: `http://localhost:3000` (開発環境)
2. Redirect URL: `http://localhost:3000/api/auth/callback` (開発環境)



5. 必要なスコープを選択（read_products, read_orders, read_customers など）
6. API キーとシークレットを取得し、環境変数に設定


### Shopify開発ストアの設定

1. [Shopify Partners](https://partners.shopify.com/)で開発ストアを作成
2. 「Stores」→「Add store」→「Development store」を選択
3. 必要な情報を入力してストアを作成
4. 作成したアプリをこの開発ストアにインストール


## Azure OpenAIの設定

### Azure OpenAIリソースの作成

1. [Azure Portal](https://portal.azure.com/)にログイン
2. 「リソースの作成」→「AI + Machine Learning」→「Azure OpenAI」を選択
3. 必要な情報を入力してリソースを作成

1. サブスクリプション: 適切なサブスクリプションを選択
2. リソースグループ: 新規作成または既存のものを選択
3. リージョン: 利用可能なリージョンを選択
4. 名前: リソースの名前を入力
5. 価格レベル: 適切なプランを選択



4. 「確認と作成」→「作成」をクリック
5. リソースがデプロイされたら、「リソースに移動」をクリック


### モデルのデプロイ

1. 作成したAzure OpenAIリソースにアクセス
2. 「モデルのデプロイ」をクリック
3. 以下の情報を入力：

1. デプロイ名: 任意の名前（例: `gpt-4`）
2. モデル: 使用するモデルを選択（例: `GPT-4`）
3. モデルバージョン: 最新バージョンを選択
4. トークンレート制限: 必要に応じて調整



4. 「作成」をクリック


### APIキーとエンドポイントの取得

1. 「キーとエンドポイント」メニューを選択
2. 「キー1」または「キー2」をコピー
3. 「エンドポイント」をコピー
4. これらの値を環境変数に設定


## データベースの設定

### PostgreSQLデータベースの作成（オプション）

1. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)または[Supabase](https://supabase.com/)でデータベースを作成
2. 接続情報を取得し、環境変数に設定


```powershell
# PowerShellで環境変数を追加
$env:DATABASE_URL = "your_database_connection_string"

# または.env.localファイルに追加
Add-Content -Path .env.local -Value "DATABASE_URL=your_database_connection_string"
```

### Prismaの設定（オプション）

1. Prismaスキーマを初期化


```powershell
npx prisma init
```

2. `prisma/schema.prisma`ファイルを編集してデータモデルを定義
3. データベースマイグレーションを実行


```powershell
npx prisma migrate dev --name init
```

4. Prismaクライアントを生成


```powershell
npx prisma generate
```

## 認証の設定

### NextAuth.jsの設定

1. 環境変数に`NEXTAUTH_SECRET`と`NEXTAUTH_URL`を設定


```powershell
# PowerShellで環境変数を追加
$env:NEXTAUTH_SECRET = "your_random_secret_key"
$env:NEXTAUTH_URL = "http://localhost:3000"

# または.env.localファイルに追加
Add-Content -Path .env.local -Value "NEXTAUTH_SECRET=your_random_secret_key`nNEXTAUTH_URL=http://localhost:3000"
```

2. 認証プロバイダーの設定（例: Shopify）


```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import ShopifyProvider from 'next-auth/providers/shopify';

const handler = NextAuth({
  providers: [
    ShopifyProvider({
      clientId: process.env.SHOPIFY_API_KEY!,
      clientSecret: process.env.SHOPIFY_API_SECRET!,
      authorization: {
        params: {
          scope: process.env.SHOPIFY_SCOPES!,
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // セッションにカスタム情報を追加
      return session;
    },
    async jwt({ token, user, account }) {
      // JWTにカスタム情報を追加
      return token;
    },
  },
});

export { handler as GET, handler as POST };
```

## テスト環境の設定

### Jestの設定

1. Jestをインストール


```powershell
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

2. `jest.config.js`ファイルを作成


```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
};

module.exports = createJestConfig(customJestConfig);
```

3. `jest.setup.js`ファイルを作成


```javascript
import '@testing-library/jest-dom';
```

4. `package.json`にテストスクリプトを追加


```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

## トラブルシューティング

### Windows固有の問題

1. **パスの長さ制限**

Windowsではパスの長さに制限があります。この問題を解決するには：

```powershell
# PowerShellを管理者として実行し、以下のコマンドを実行
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```


2. **ENOENT エラー**

ファイルパスに関するエラーが発生した場合は、バックスラッシュではなくフォワードスラッシュを使用してみてください：

```javascript
// 悪い例
const path = 'src\\components\\example.tsx';

// 良い例
const path = 'src/components/example.tsx';
```


3. **環境変数の問題**

PowerShellでは環境変数の設定方法が異なります：

```powershell
# 一時的な環境変数の設定
$env:VARIABLE_NAME = "value"

# 永続的な環境変数の設定（ユーザーレベル）
[Environment]::SetEnvironmentVariable("VARIABLE_NAME", "value", "User")

# 永続的な環境変数の設定（システムレベル、管理者権限が必要）
[Environment]::SetEnvironmentVariable("VARIABLE_NAME", "value", "Machine")
```


4. **ポート競合**

ポート3000が既に使用されている場合：

```powershell
# 使用中のポートを確認
netstat -ano | findstr :3000

# プロセスを終了（PIDを指定）
taskkill /F /PID <PID>

# または別のポートで起動
$env:PORT = 3001
npm run dev
```
