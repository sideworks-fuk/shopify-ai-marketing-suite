# Shopify ECマーケティング分析アプリ

![Shopify ECマーケティング分析](https://placeholder.svg?height=200&width=600&query=Shopify+AI+Marketing+Analytics)

## 🔖 **クイックアクセス**
- [🚀 **ブックマークリンク集**](./docs/BOOKMARKS.md) - 全URLワンクリックアクセス
- [⚡ **クイックリファレンス**](./docs/QUICK-REFERENCE.md) - 開発者向け簡易ガイド
- [🧪 **本番API接続テスト**](https://brave-sea-038f17a00.1.azurestaticapps.net/api-test) - ライブ動作確認
- [🗄️ **Database API テスト**](https://brave-sea-038f17a00.1.azurestaticapps.net/database-test) - Azure SQL統合確認画面

## 概要

Shopifyストア運営者向けに、**AIを活用した購買データ分析とDM（ダイレクトメール）作成・郵送自動化**を実現するアプリケーションです。

Shopifyの注文・売上データをもとに、AIが最適な商品やターゲット顧客を自動で推薦し、販促DMの作成・発送までをワンストップで支援します。

### 主な機能

- **売上分析ダッシュボード**: 売上推移、商品別売上、前年比較などを可視化
- **顧客分析ダッシュボード**: 顧客セグメント、購入頻度、リピート率などを分析
- **AI分析インサイト**: トレンド予測、異常検知、推奨施策を自動生成
- **DM作成・郵送機能**: ターゲット顧客の抽出とDM作成・郵送の自動化（開発中）

## 技術スタック

- **フロントエンド**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **UI**: shadcn/ui, Recharts, Framer Motion
- **バックエンド**: Next.js API Routes, Azure Functions
- **AI**: Azure OpenAI
- **データ連携**: Shopify API
- **認証**: NextAuth.js

## クイックスタート

### 前提条件

- Node.js 18.0.0以上
- npm 9.0.0以上
- Shopify Partner アカウント
- Azure アカウント（OpenAI APIを利用する場合）

### インストール

\`\`\`powershell
# リポジトリのクローン
git clone https://github.com/sideworks-fuk/shopify-ai-marketing-suite.git
cd shopify-ai-marketing-suite

# 依存関係のインストール
npm install
npm install --legacy-peer-deps
npm update --legacy-peer-deps

# 開発サーバーの起動
npm run dev
\`\`\`

### 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

\`\`\`powershell
# PowerShellで.env.localファイルを作成する例
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
\`\`\`

## 開発ガイド

### プロジェクト構造

\`\`\`plaintext
src/
├── app/                  # Next.js App Router
│   ├── api/              # API Routes
│   ├── components/       # 共通コンポーネント
│   ├── layout.tsx        # ルートレイアウト
│   └── page.tsx          # ホームページ
├── components/           # コンポーネント
│   ├── dashboards/       # ダッシュボードコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   └── ui/               # UIコンポーネント (shadcn/ui)
├── contexts/             # Reactコンテキスト
├── lib/                  # ユーティリティ関数
└── types/                # TypeScript型定義
\`\`\`

### コーディング規約

- コンポーネントは機能ごとにディレクトリを分けて管理
- 状態管理はReact ContextとuseReducerを使用
- UIコンポーネントはshadcn/uiを活用
- データフェッチはServer Componentsを優先的に使用


### ブランチ戦略

- `main`: 本番環境用ブランチ
- `develop`: 開発環境用ブランチ
- `feature/*`: 機能開発用ブランチ
- `bugfix/*`: バグ修正用ブランチ


## デプロイガイド

### Vercelへのデプロイ

1. [Vercel](https://vercel.com)にアクセスし、GitHubアカウントでログイン
2. 「New Project」をクリック
3. リポジトリを選択
4. 環境変数を設定
5. 「Deploy」をクリック


### 環境変数（本番環境）

本番環境では、以下の環境変数を設定してください：

\`\`\`plaintext
# Shopify API
SHOPIFY_API_KEY=your_production_shopify_api_key
SHOPIFY_API_SECRET=your_production_shopify_api_secret
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_production_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_production_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_production_deployment_name

# NextAuth.js
NEXTAUTH_SECRET=your_production_nextauth_secret
NEXTAUTH_URL=https://your-production-domain.com
\`\`\`

## トラブルシューティング

### よくある問題

1. **Shopify APIの接続エラー**

1. Shopify API キーとシークレットが正しく設定されているか確認
2. スコープが適切に設定されているか確認



2. **Azure OpenAIの接続エラー**

1. API キーとエンドポイントが正しく設定されているか確認
2. デプロイメント名が正しいか確認



3. **ビルドエラー**

1. `npm run build`を実行して詳細なエラーメッセージを確認
2. 依存関係が最新かどうか確認（`npm update`）





## ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

## 連絡先

質問や提案がある場合は、[Issues](https://github.com/sideworks-fuk/shopify-ai-marketing-suite/issues)にてお問い合わせください。
