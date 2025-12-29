# Azure開発環境 - バックエンド接続設定

## 作成日
2025-12-29

## 概要
バックエンドをAzure開発環境にデプロイし、フロントエンド（ローカル）から接続する設定手順。

## アーキテクチャ

```
フロントエンド（ローカル） → Azure開発環境（バックエンド）
- フロントエンド: localhost:3000 または ngrok（Shopify埋め込みアプリの場合）
- バックエンド: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
```

## 設定手順

### Step 1: フロントエンド環境変数の設定

**ファイル**: `frontend/.env.local`（存在しない場合は作成）

```env
# バックエンドURL（Azure開発環境）
NEXT_PUBLIC_BACKEND_URL=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net

# フロントエンドURL（Shopify埋め込みアプリの場合）
# オプション1: ngrokを使用（Shopify埋め込みアプリの場合）
NEXT_PUBLIC_SHOPIFY_APP_URL=https://your-frontend-ngrok-url.ngrok-free.dev

# オプション2: ローカルのみ（直接アクセスの場合）
# NEXT_PUBLIC_SHOPIFY_APP_URL=http://localhost:3000

# その他の設定
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_SHOPIFY_API_KEY=2d7e0e1f5da14eb9d299aa746738e44b
NEXT_PUBLIC_DISABLE_FEATURE_GATES=true
```

### Step 2: Next.js開発サーバーの起動

```powershell
cd frontend
npm run dev
```

### Step 3: Shopify埋め込みアプリの場合（オプション）

Shopify埋め込みアプリとして動作させる場合は、フロントエンド用のngrokトンネルを起動：

```powershell
# フロントエンド用ngrokトンネル（ポート3000）
ngrok http 3000 --host-header=rewrite
```

ngrok起動後、`NEXT_PUBLIC_SHOPIFY_APP_URL`を更新：

```env
NEXT_PUBLIC_SHOPIFY_APP_URL=https://your-frontend-ngrok-url.ngrok-free.dev
```

### Step 4: Shopify Partners Dashboardの設定

1. **App URL**: `NEXT_PUBLIC_SHOPIFY_APP_URL`で設定したURL
2. **Allowed redirection URLs**: 
   - `{NEXT_PUBLIC_SHOPIFY_APP_URL}/api/shopify/callback`

### Step 5: データベースの設定

`ShopifyApps`テーブルの`AppUrl`と`RedirectUri`を更新：

```sql
UPDATE [dbo].[ShopifyApps]
SET 
    [AppUrl] = 'https://your-frontend-ngrok-url.ngrok-free.dev', -- または http://localhost:3000
    [RedirectUri] = 'https://your-frontend-ngrok-url.ngrok-free.dev/api/shopify/callback', -- または http://localhost:3000/api/shopify/callback
    [UpdatedAt] = GETUTCDATE()
WHERE [Id] = 6
  AND [ApiKey] = 'your-api-key'
  AND [IsActive] = 1;
```

## 動作確認

1. ブラウザのコンソールを開く
2. `🔍 Environment Check:`のログを確認
3. 以下のログが表示されることを確認：
   ```
   ✅ Using NEXT_PUBLIC_BACKEND_URL: https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net
   ```

## トラブルシューティング

### 問題1: 401エラーが発生する

**原因**: バックエンドのCORS設定にフロントエンドのURLが含まれていない

**解決方法**: Azure開発環境のバックエンド設定（`appsettings.Development.json`）でCORS設定を確認：

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-frontend-ngrok-url.ngrok-free.dev"
    ]
  }
}
```

### 問題2: 環境変数が反映されない

**解決方法**: Next.js開発サーバーを再起動

```powershell
# Ctrl+C で停止後
npm run dev
```

### 問題3: Shopify埋め込みアプリで動作しない

**原因**: Shopifyのiframeからは`localhost`にアクセスできない

**解決方法**: フロントエンド用のngrokトンネルを使用

## 参考

- [環境設定マスターガイド](../../../docs/07-operations/04-環境管理/環境設定マスターガイド.md)
