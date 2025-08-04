# Shopify AI Marketing Suite - Frontend

Shopify AI Marketing Suiteのフロントエンドアプリケーション

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (状態管理)

## セットアップ

### 必要な環境

- Node.js 18.x以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.local.example .env.local
```

### 開発サーバーの起動

```bash
# 開発サーバーを起動
npm run dev

# ビルド
npm run build

# 本番モードで起動
npm start
```

## HTTPS接続の設定

ローカル開発環境でHTTPSを使用する場合：

### 1. バックエンドの証明書を信頼する

```bash
cd ../backend/ShopifyAnalyticsApi
dotnet dev-certs https --trust
```

### 2. 環境変数を設定

```bash
# .env.localファイルを作成
cp .env.local.example .env.local

# .env.localを編集してHTTPS使用を有効化
NEXT_PUBLIC_USE_HTTPS=true
```

### 3. ブラウザで証明書を受け入れる

1. https://localhost:7088 にアクセス
2. 証明書の警告を受け入れる
3. フロントエンドを再起動

**注意**: デフォルトではHTTPを使用します（証明書問題を回避）。

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `NEXT_PUBLIC_USE_HTTPS` | ローカル開発でHTTPSを使用 | `false` |
| `NEXT_PUBLIC_API_URL` | APIのベースURL（明示的指定） | 自動検出 |
| `NEXT_PUBLIC_ENVIRONMENT` | 環境名 | `development` |
| `NEXT_PUBLIC_DEBUG_API` | 本番APIを使用（デバッグ） | `false` |

## 開発ツール

### デバッグページ

開発環境では以下のデバッグツールが利用可能です：

- `/dev-bookmarks` - 開発者用リンク集
- `/dev/backend-health-check` - バックエンド接続状態確認
- `/dev/auth-refresh-test` - JWT認証テスト
- `/dev/jwt-test` - JWTトークンデコードテスト

### トラブルシューティング

#### Failed to fetchエラー

1. バックエンドサーバーが起動していることを確認
   ```bash
   cd ../backend/ShopifyAnalyticsApi
   dotnet run
   ```

2. 右下に表示される接続エラー通知を確認

3. `/dev/backend-health-check`で詳細な接続テスト

#### HTTPS証明書エラー

1. 環境変数を確認（HTTPを使用する場合）
   ```bash
   NEXT_PUBLIC_USE_HTTPS=false
   ```

2. HTTPSを使用する場合は、上記「HTTPS接続の設定」を参照

## ディレクトリ構造

```
frontend/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # Reactコンポーネント
│   ├── lib/          # ユーティリティ・API関連
│   ├── stores/       # Zustand状態管理
│   ├── types/        # TypeScript型定義
│   └── styles/       # グローバルスタイル
├── public/           # 静的ファイル
└── .env.local.example # 環境変数サンプル
```

## ビルドとデプロイ

### ローカルビルド

```bash
# TypeScriptチェック
npm run type-check

# ビルド
npm run build

# ビルド結果の確認
npm run start
```

### Azure Static Web Appsへのデプロイ

GitHub Actionsで自動デプロイされます。`main`ブランチへのマージで本番環境に反映。

## 貢献

1. Featureブランチを作成
2. 変更をコミット
3. プルリクエストを作成

## ライセンス

Copyright (c) 2025 GEMiNX