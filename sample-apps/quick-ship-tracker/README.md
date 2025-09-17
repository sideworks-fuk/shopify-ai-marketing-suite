# Quick Ship Tracker - Shopify Sample App

## 🚀 概要
Quick Ship TrackerはShopifyアプリ申請テスト用のサンプルアプリケーションです。店舗の注文配送管理を効率化し、リアルタイムの配送追跡機能を提供します。

## ✨ 主要機能

### 必須機能（Shopify申請要件）
- ✅ **OAuth認証**: Shopify標準のOAuthフロー実装
- ✅ **GDPR Webhooks**: 必須3つのWebhook対応
  - customers/redact
  - shop/redact
  - customers/data_request
- ✅ **課金システム**: Shopify Billing API統合

### アプリ機能
- 📦 **注文管理**: Shopify注文データの取得・表示
- 🚚 **配送追跡**: 配送状況のリアルタイム更新
- 📊 **ダッシュボード**: 配送状況の統計表示
- 💳 **プラン管理**: 無料/有料プランの切り替え

## 技術スタック

### バックエンド
- **言語**: C# (.NET 8)
- **フレームワーク**: ASP.NET Core Web API
- **データベース**: SQLite
- **認証**: JWT + Shopify OAuth

### フロントエンド
- **フレームワーク**: Next.js 14
- **UIライブラリ**: Shopify Polaris
- **状態管理**: React Context API
- **スタイリング**: Polaris Tokens

## プロジェクト構造
```
quick-ship-tracker/
├── backend/
│   ├── QuickShipTracker.Api/       # Web APIプロジェクト
│   ├── QuickShipTracker.Core/      # ビジネスロジック
│   └── QuickShipTracker.Data/      # データアクセス層
├── frontend/
│   ├── pages/                      # Next.jsページ
│   ├── components/                 # Reactコンポーネント
│   └── services/                   # APIクライアント
└── docs/
    ├── implementation-plan.md       # 実装計画
    └── api-specification.md        # API仕様書
```

## 📋 前提条件

### 必要なアカウント
- ✅ Shopifyパートナーアカウント
- ✅ 開発ストア（テスト用）
- ✅ Azure アカウント（デプロイ用）

### 開発環境
- .NET 8 SDK
- Node.js 18+ & npm
- Git
- Visual Studio Code または Visual Studio

## 🛠️ セットアップ手順

### 1. Shopifyアプリ登録
1. [Shopifyパートナーダッシュボード](https://partners.shopify.com)にログイン
2. 「アプリ」→「すべてのアプリ」→「アプリを作成」
3. アプリ名: `Quick Ship Tracker`
4. アプリURL: `https://[your-app].azurewebsites.net`
5. リダイレクトURL: `https://[your-app].azurewebsites.net/auth/callback`

### 2. バックエンド起動
```bash
cd sample-apps/quick-ship-tracker/backend/QuickShipTracker.Api

# 依存関係のインストール
dotnet restore

# データベース作成（初回のみ）
dotnet ef database update

# 開発サーバー起動
dotnet run
# → https://localhost:5001 で起動
# → Swagger UI: https://localhost:5001/swagger
```

### 3. フロントエンド起動
```bash
cd sample-apps/quick-ship-tracker/frontend

# 依存関係のインストール
npm install --legacy-peer-deps

# 開発サーバー起動
npm run dev
# → http://localhost:3000 で起動
```

## ⚙️ 環境変数設定

### バックエンド (appsettings.json または .env)
```json
{
  "Shopify": {
    "ApiKey": "your_shopify_api_key",
    "ApiSecret": "your_shopify_api_secret",
    "Scopes": "read_orders,write_orders,read_products",
    "AppUrl": "https://your-app.azurewebsites.net"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=quickship.db"
  },
  "Jwt": {
    "Secret": "your-jwt-secret-min-32-chars",
    "Issuer": "QuickShipTracker",
    "Audience": "QuickShipTrackerUsers"
  }
}
```

### フロントエンド (.env.local)
```env
# API設定
NEXT_PUBLIC_API_URL=https://localhost:5001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Shopify設定
SHOPIFY_APP_KEY=your_shopify_api_key
SHOPIFY_APP_HOST=your-app.myshopify.com
```

## 🚀 Azure デプロイ

### デプロイ手順
1. **Azure App Service作成**
   ```bash
   az webapp create --name quick-ship-tracker --resource-group shopify-apps --plan shopify-plan
   ```

2. **環境変数設定**
   ```bash
   az webapp config appsettings set --name quick-ship-tracker --resource-group shopify-apps --settings SHOPIFY_API_KEY="your_key"
   ```

3. **デプロイ実行**
   ```bash
   # バックエンド
   cd backend
   dotnet publish -c Release
   az webapp deploy --name quick-ship-tracker --src-path ./bin/Release/net8.0/publish

   # フロントエンド
   cd frontend
   npm run build
   az webapp deploy --name quick-ship-tracker-frontend --src-path ./.next
   ```

## 🧪 テスト実行

### ローカルテスト
```bash
# バックエンドユニットテスト
cd backend
dotnet test

# フロントエンドテスト
cd frontend
npm test
npm run test:e2e  # E2Eテスト
```

### Shopifyアプリテスト
1. 開発ストアでアプリをインストール
2. OAuth認証フローの確認
3. 注文データの取得・表示確認
4. 配送追跡機能の動作確認
5. 課金フローのテスト（テストモード）

## 📝 Shopify申請チェックリスト

### 必須要件
- [ ] OAuth 2.0認証実装
- [ ] GDPR必須Webhooks実装
- [ ] SSL/HTTPS対応
- [ ] プライバシーポリシーページ
- [ ] 利用規約ページ
- [ ] アプリアンインストール時のデータ削除処理

### 推奨要件
- [ ] Shopify Polaris使用
- [ ] レスポンシブデザイン
- [ ] 多言語対応（最低英語）
- [ ] エラーハンドリング
- [ ] ローディング状態の表示

## 🔧 トラブルシューティング

### よくある問題

**Q: dotnet runでポートエラーが出る**
```bash
# ポートを変更して起動
dotnet run --urls="https://localhost:5002"
```

**Q: npm installでエラーが出る**
```bash
# キャッシュクリアして再インストール
npm cache clean --force
npm install --legacy-peer-deps
```

**Q: Shopify認証でリダイレクトエラー**
- Shopifyアプリ設定のURLを確認
- ngrokやローカルトンネルツールの使用を検討

## 📚 関連ドキュメント

- [Shopify App開発ガイド](https://shopify.dev/docs/apps)
- [Shopify Polaris](https://polaris.shopify.com/)
- [実装計画書](./docs/implementation-plan.md)
- [API仕様書](./docs/api-specification.md)

## 📞 サポート

- 技術的な質問: Issueを作成してください
- Shopifyパートナーサポート: partners@shopify.com
- 開発チーム: ai-team/conversations/to_kenji.md

## 📄 ライセンス
MIT License - 詳細は[LICENSE](./LICENSE)ファイルを参照