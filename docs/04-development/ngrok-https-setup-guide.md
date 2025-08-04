# ngrokを使用したHTTPS環境構築ガイド

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

### 4. ngrokトンネルの開始

#### フロントエンド用
```bash
ngrok http 3000
```

#### バックエンド用（別ターミナル）
```bash
ngrok http 5000
```

### 5. HTTPS URLの確認

ngrok起動後、以下のような情報が表示されます：
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

この `https://abc123.ngrok.io` がHTTPS URLです。

## Shopify OAuth設定での使用

### 1. Shopifyアプリ設定の更新

Shopifyパートナーダッシュボードで：
- **App URL**: `https://your-frontend.ngrok.io`
- **Allowed redirection URL(s)**: 
  - `https://your-frontend.ngrok.io/api/auth/callback`
  - `https://your-backend.ngrok.io/api/shopify/callback`

### 2. 環境変数の設定

#### フロントエンド (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend.ngrok.io
NEXT_PUBLIC_APP_URL=https://your-frontend.ngrok.io
SHOPIFY_APP_URL=https://your-frontend.ngrok.io
```

#### バックエンド (appsettings.Development.json)
```json
{
  "Shopify": {
    "AppUrl": "https://your-frontend.ngrok.io",
    "RedirectUri": "https://your-backend.ngrok.io/api/shopify/callback"
  }
}
```

## 便利な設定

### 1. カスタムサブドメイン（有料プラン）
```bash
ngrok http 3000 --subdomain=my-shopify-app
# https://my-shopify-app.ngrok.io で固定URL
```

### 2. 設定ファイルの使用

`ngrok.yml`を作成：
```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  frontend:
    proto: http
    addr: 3000
    host_header: "localhost:3000"
  backend:
    proto: http
    addr: 5000
    host_header: "localhost:5000"
```

起動：
```bash
ngrok start --all
```

### 3. Basic認証の追加
```bash
ngrok http 3000 --auth="username:password"
```

## トラブルシューティング

### 1. CORSエラー
バックエンドのCORS設定にngrok URLを追加：
```csharp
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

### 2. セッション切れ
無料版ngrokは8時間でセッション切れ。再起動が必要。

### 3. リクエスト制限
無料版は40リクエスト/分の制限あり。

## セキュリティ注意事項

1. **本番環境では使用しない**
2. **機密情報を含むアプリの公開に注意**
3. **Basic認証の使用を推奨**
4. **使用後は必ずトンネルを停止**

## スクリプト例

開発環境を一括起動するスクリプト：

### start-dev.sh (Linux/Mac)
```bash
#!/bin/bash

# バックエンド起動
cd backend/ShopifyAnalyticsApi
dotnet run &
BACKEND_PID=$!

# フロントエンド起動
cd ../../frontend
npm run dev &
FRONTEND_PID=$!

# 少し待つ
sleep 5

# ngrok起動
ngrok start --all &
NGROK_PID=$!

echo "Started:"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "ngrok PID: $NGROK_PID"

# 終了時の処理
trap "kill $BACKEND_PID $FRONTEND_PID $NGROK_PID" EXIT

wait
```

### start-dev.ps1 (Windows)
```powershell
# バックエンド起動
Start-Process -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory "backend\ShopifyAnalyticsApi"

# フロントエンド起動
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "frontend"

# 少し待つ
Start-Sleep -Seconds 5

# ngrok起動
Start-Process -FilePath "ngrok" -ArgumentList "start --all"

Write-Host "開発環境を起動しました"
Write-Host "ngrokのURLを確認して環境変数を更新してください"
```

## まとめ

ngrokを使用することで、ローカル開発環境でもShopify OAuthなどのHTTPS必須機能をテストできます。ただし、セキュリティには十分注意し、開発目的のみで使用してください。

---
作成日: 2025-08-01
更新日: 2025-08-01