# 401エラー解決手順（Azure開発環境使用）

## 作成日
2025-12-29
更新日: 2025-12-29

## 問題
Shopifyのiframeからアプリにアクセスした際、401 Unauthorizedエラーが発生する。

## 原因
クライアントサイド（ブラウザ）から`localhost:7088`にアクセスしようとしているが、Shopifyのiframeからは`localhost`にアクセスできない。

## 解決方法

### 方針変更（2025-12-29）
バックエンドはAzure開発環境にデプロイし、フロントエンドのみローカル（またはngrok）で動作させる。

### Step 1: 環境変数の設定

**ファイル**: `frontend/.env.local`（存在しない場合は作成）

```env
# バックエンドURL（Azure開発環境）
NEXT_PUBLIC_BACKEND_URL=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net

# フロントエンドURL（Shopify埋め込みアプリの場合のみngrokが必要）
# オプション1: ngrokを使用（Shopify埋め込みアプリの場合）
NEXT_PUBLIC_SHOPIFY_APP_URL=https://your-frontend-ngrok-url.ngrok-free.dev

# オプション2: ローカルのみ（直接アクセスの場合）
# NEXT_PUBLIC_SHOPIFY_APP_URL=http://localhost:3000

# その他の設定
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_SHOPIFY_API_KEY=2d7e0e1f5da14eb9d299aa746738e44b
NEXT_PUBLIC_DISABLE_FEATURE_GATES=true
```

**重要**: 
- `NEXT_PUBLIC_BACKEND_URL`は、Azure開発環境のURLを設定してください
- `NEXT_PUBLIC_SHOPIFY_APP_URL`は、Shopify埋め込みアプリとして動作させる場合のみngrok URLを設定してください

### Step 3: Next.js開発サーバーの再起動

環境変数を変更した場合は、**必ずNext.js開発サーバーを再起動**してください。

```powershell
# 現在のサーバーを停止（Ctrl+C）
# その後、再起動
cd frontend
npm run dev
```

### Step 4: ブラウザのキャッシュクリア

ブラウザの開発者ツールで以下を実行：
1. ハードリロード: `Ctrl+Shift+R` (Windows) または `Cmd+Shift+R` (Mac)
2. または、開発者ツールの「ネットワーク」タブで「キャッシュを無効にする」にチェックを入れてリロード

### Step 5: 動作確認

1. ブラウザのコンソールを開く
2. `🔍 Environment Check:` のログを確認
3. 以下のログが表示されることを確認：
   ```
   ✅ Using NEXT_PUBLIC_BACKEND_URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
   ```

## トラブルシューティング

### 問題1: まだ401エラーが発生する

**確認事項**:
1. `frontend/.env.local`に`NEXT_PUBLIC_BACKEND_URL`が正しく設定されているか（Azure開発環境のURL）
2. Next.js開発サーバーを再起動したか
3. ブラウザのキャッシュをクリアしたか
4. フロントエンド用ngrokトンネルが起動しているか（Shopify埋め込みアプリの場合のみ）

**デバッグ方法**:
ブラウザのコンソールで以下を確認：
```javascript
console.log('NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
```

**注意**: バックエンドのCORS設定にフロントエンドのURLが含まれていることを確認してください。

### 問題2: 環境変数が読み込まれない

**原因**: Next.jsは環境変数をビルド時に読み込むため、変更後は再起動が必要です。

**解決方法**:
1. Next.js開発サーバーを停止
2. `frontend/.env.local`を確認
3. Next.js開発サーバーを再起動

### 問題3: ngrok URLが変わった

**原因**: ngrok無料版は再起動するたびにURLが変わります。

**解決方法**:
1. フロントエンド用ngrokトンネルで新しいURLを確認（Shopify埋め込みアプリの場合のみ）
2. `frontend/.env.local`の`NEXT_PUBLIC_SHOPIFY_APP_URL`を更新（必要に応じて）
3. Next.js開発サーバーを再起動
4. `ShopifyApps`テーブルの`AppUrl`と`RedirectUri`を更新（必要に応じて）

**注意**: `NEXT_PUBLIC_BACKEND_URL`はAzure開発環境のURLのため、変更不要です。

## 参考

- [ngrok ローカルテスト設定手順](./ngrok-ローカルテスト設定手順.md)
