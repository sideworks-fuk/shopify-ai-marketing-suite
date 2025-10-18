# バックエンド接続セットアップガイド

## 概要
フロントエンドからバックエンドAPIへの接続を正しく設定するためのガイドです。

## 重要な変更（2025-08-11）
環境変数`NEXT_PUBLIC_BACKEND_URL`が最優先で使用されるようになりました。

## セットアップ手順

### 1. 環境変数の設定

#### Option A: HTTPS接続（推奨）

1. `.env.local`ファイルに以下を設定：
```env
NEXT_PUBLIC_USE_HTTPS=true
NEXT_PUBLIC_BACKEND_URL=https://localhost:7088
```

2. バックエンドで証明書を設定：
```bash
cd backend/ShopifyAnalyticsApi
dotnet dev-certs https --trust
```

3. バックエンドをHTTPSで起動：
```bash
dotnet run --urls "https://localhost:7088"
```

4. ブラウザで https://localhost:7088 にアクセスして証明書を受け入れる

#### Option B: HTTP接続（証明書エラー回避）

1. `.env.local`ファイルに以下を設定：
```env
NEXT_PUBLIC_USE_HTTPS=false
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

2. バックエンドをHTTPで起動：
```bash
cd backend/ShopifyAnalyticsApi
dotnet run --urls "http://localhost:5000"
```

### 2. フロントエンドの起動

```bash
cd frontend
npm run dev
```

**重要**: 環境変数を変更した場合は、Next.jsの開発サーバーを再起動する必要があります。

### 3. 接続確認

1. ブラウザで http://localhost:3000 にアクセス
2. `/dev/backend-health-check` ページで接続テスト
3. コンソールログで以下を確認：
   - `✅ Using NEXT_PUBLIC_BACKEND_URL: [設定したURL]`

## トラブルシューティング

### エラー: "バックエンドサーバーに接続できません"

#### 原因1: 環境変数が反映されていない
- **解決策**: Next.jsサーバーを再起動
  ```bash
  # Ctrl+C で停止後
  npm run dev
  ```

#### 原因2: HTTPSの証明書エラー
- **解決策**: 
  1. ブラウザで https://localhost:7088 にアクセス
  2. 「詳細設定」→「localhost:7088 にアクセスする（安全ではありません）」をクリック
  3. フロントエンドページをリロード

#### 原因3: バックエンドが起動していない
- **解決策**: バックエンドを起動
  ```bash
  cd backend/ShopifyAnalyticsApi
  dotnet run
  ```

#### 原因4: ポートが競合している
- **解決策**: 使用中のポートを確認
  ```bash
  # Windows
  netstat -ano | findstr :7088
  netstat -ano | findstr :5000
  
  # Mac/Linux
  lsof -i :7088
  lsof -i :5000
  ```

### デバッグ方法

1. ブラウザの開発者ツールでコンソールログを確認
2. Network タブでAPIリクエストの詳細を確認
3. `/dev/backend-health-check` で詳細なテストを実施

## 環境変数の優先順位

1. `NEXT_PUBLIC_BACKEND_URL` - 最優先
2. `NEXT_PUBLIC_API_URL` - 2番目
3. `NEXT_PUBLIC_USE_HTTPS` + デフォルトURL - 3番目
4. ハードコーディングされたデフォルト値 - 最後

## 関連ファイル

- `/frontend/.env.local` - 環境変数設定
- `/frontend/src/lib/api-config.ts` - API URL設定ロジック
- `/frontend/src/lib/api-client.ts` - APIクライアント
- `/frontend/src/components/common/BackendConnectionStatus.tsx` - 接続状態表示

## 参考リンク

- [.NET HTTPS開発証明書](https://docs.microsoft.com/ja-jp/aspnet/core/security/enforcing-ssl)
- [Next.js環境変数](https://nextjs.org/docs/basic-features/environment-variables)

---
最終更新: 2025-08-11