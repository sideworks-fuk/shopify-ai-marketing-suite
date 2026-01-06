# ローカルバックエンド開発者モード設定ガイド

**作成日**: 2026-01-03  
**目的**: Shopify埋め込みアプリではなく、開発者モードでローカルのバックエンドを直接呼び出してデータ同期ボタンの動作確認を行う

## 📋 概要

開発環境でローカルバックエンドを直接呼び出すための設定手順を記載します。

## 🔧 設定手順

### Step 1: バックエンドの起動

1. バックエンドプロジェクトを起動
```powershell
cd backend/ShopifyAnalyticsApi
dotnet run
```

2. バックエンドが起動していることを確認
   - 通常は `https://localhost:7088` または `http://localhost:5168` で起動
   - ブラウザで `https://localhost:7088/api/health` にアクセスして確認

### Step 2: フロントエンドの環境変数設定

`frontend/.env.local` ファイルを作成または編集：

```env
# ローカルバックエンドURL
NEXT_PUBLIC_BACKEND_URL=http://localhost:5168
# または HTTPS の場合
# NEXT_PUBLIC_BACKEND_URL=https://localhost:7088

# 環境設定
NEXT_PUBLIC_ENVIRONMENT=development

# 開発者モード用の設定（オプション）
NEXT_PUBLIC_DEBUG_MODE=true
```

**注意**: 
- HTTPS (`https://localhost:7088`) を使用する場合、SSL証明書のエラーが表示される可能性があります
- HTTP (`http://localhost:5168`) を使用する場合は、CORS設定を確認してください

### Step 3: 開発者認証でログイン

#### 方法1: 開発者認証ページを使用（推奨・実装済み）

1. ブラウザで `/dev/login` にアクセス
   ```
   http://localhost:3000/dev/login
   ```

2. パスワードを入力（デフォルト: `dev2026`）

3. 「ログイン」ボタンをクリック

4. 自動的に `/setup/initial` にリダイレクトされます

**注意**: 開発者認証APIは `password` のみでログインします（`username` は不要）

#### 方法2: 開発者認証APIを直接使用

1. PowerShellで開発者認証エンドポイントにアクセス
```powershell
$body = @{
    password = "dev2026"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5168/api/developer/login" -Method POST -Body $body -ContentType "application/json"
$response.token
```

2. ブラウザのConsoleでトークンを保存
```javascript
localStorage.setItem('developerToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
localStorage.setItem('oauth_authenticated', 'true');
localStorage.setItem('currentStoreId', '1');
```

#### 方法3: デモ認証を使用

1. デモ認証エンドポイントにアクセス
```powershell
$body = @{
    password = "dev2026"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5168/api/demo/login" -Method POST -Body $body -ContentType "application/json"
$response.token
```

2. ブラウザのConsoleでトークンを保存
```javascript
localStorage.setItem('demoToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

### Step 4: 開発者モードの有効化

`frontend/.env.local` に以下を追加：

```env
# 開発者モード（ローカルバックエンド直接接続）
NEXT_PUBLIC_DEVELOPER_MODE=true
NEXT_PUBLIC_BACKEND_URL=http://localhost:5168
```

**注意**: 
- `NEXT_PUBLIC_DEVELOPER_MODE=true` を設定すると、Shopify埋め込みアプリではなくローカルバックエンドに直接接続します
- この設定は開発環境でのみ使用してください

### Step 5: フロントエンドの再起動

環境変数を変更した場合は、フロントエンドを再起動してください：

```powershell
# フロントエンドを停止（Ctrl+C）
# 再度起動
cd frontend
npm run dev
```

### Step 6: 認証状態の確認

ブラウザのConsoleで以下を確認：

```javascript
// 開発者トークンの確認
console.log('developerToken:', localStorage.getItem('developerToken'));

// 認証状態の確認
console.log('oauth_authenticated:', localStorage.getItem('oauth_authenticated'));

// ストアIDの確認
console.log('currentStoreId:', localStorage.getItem('currentStoreId'));
```

## ✅ 実装完了

### 2026-01-03: 開発者モードの実装

**実施内容**:
1. ✅ `AuthProvider` に開発者モード対応を追加
   - `NEXT_PUBLIC_DEVELOPER_MODE=true` の場合、ローカルバックエンドに直接接続
   - 開発者トークンまたはデモトークンを使用

2. ✅ 開発者認証ページを作成
   - `/dev/login` ページを実装
   - 開発者認証でログイン可能
   - トークンを `localStorage` に保存

3. ✅ 環境変数サンプルを更新
   - `frontend/env.sample` に開発者モード設定を追加

**変更ファイル**:
- `frontend/src/components/providers/AuthProvider.tsx` - 開発者モード対応
- `frontend/src/app/dev/login/page.tsx` - 開発者認証ページ（新規）
- `frontend/env.sample` - 環境変数サンプル更新

## 📝 バックエンドの認証設定確認

### appsettings.Development.json の確認

```json
{
  "Authentication": {
    "Mode": "DemoAllowed"
  },
  "Developer": {
    "Enabled": true,
    "PasswordHash": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  }
}
```

**注意**: パスワードハッシュは `dev2026` のハッシュです。

### CORS設定の確認

`appsettings.Development.json` で `http://localhost:3000` が許可されていることを確認：

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://localhost:3000"
    ]
  }
}
```

## 🧪 動作確認手順

### 1. バックエンドの起動確認

```powershell
# バックエンドを起動
cd backend/ShopifyAnalyticsApi
dotnet run

# 別のターミナルでヘルスチェック
Invoke-RestMethod -Uri "http://localhost:5168/api/health"
```

### 2. 開発者認証の確認

```powershell
# 開発者認証でログイン
$body = @{
    username = "developer"
    password = "dev2026"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5168/api/developer/login" -Method POST -Body $body -ContentType "application/json"
$response.token
```

### 3. フロントエンドの設定確認

1. `frontend/.env.local` に `NEXT_PUBLIC_BACKEND_URL=http://localhost:5168` を設定
2. フロントエンドを起動
```powershell
cd frontend
npm run dev
```

3. ブラウザのConsoleで以下を確認：
```javascript
// 環境変数の確認
console.log('NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);

// 開発者トークンの確認
console.log('developerToken:', localStorage.getItem('developerToken'));
```

### 4. データ同期ボタンの動作確認

1. `/setup/initial` ページにアクセス
2. Console タブを開く
3. 「同期を開始」ボタンをクリック
4. 以下のログを確認：
   - `📤 POST /api/sync/initial 送信準備完了`
   - `📤 [APIClient.request] リクエスト送信`
   - `📥 [APIClient.request] fetch完了` (ステータス: 200)

## 🔍 トラブルシューティング

### 問題1: CORSエラー

**症状**: `Access-Control-Allow-Origin` エラーが発生

**対処法**:
1. `appsettings.Development.json` の `Cors:AllowedOrigins` に `http://localhost:3000` が含まれているか確認
2. `Program.cs` のCORS設定を確認

### 問題2: 401 Unauthorized エラー

**症状**: 認証エラーが発生

**対処法**:
1. 開発者トークンまたはデモトークンが正しく設定されているか確認
2. `localStorage.getItem('developerToken')` または `localStorage.getItem('demoToken')` を確認
3. トークンの有効期限を確認（通常は60分）

### 問題3: SSL証明書エラー（HTTPS使用時）

**症状**: `NET::ERR_CERT_AUTHORITY_INVALID` エラー

**対処法**:
1. HTTP (`http://localhost:5168`) を使用する
2. または、ブラウザで証明書を受け入れる（開発環境のみ）

### 問題4: バックエンドに接続できない

**症状**: `Failed to fetch` または `Network error`

**対処法**:
1. バックエンドが起動しているか確認
2. `NEXT_PUBLIC_BACKEND_URL` が正しく設定されているか確認
3. ポート番号が正しいか確認（5168 または 7088）

## 📚 関連ファイル

- `backend/ShopifyAnalyticsApi/Controllers/DeveloperAuthController.cs` - 開発者認証コントローラー
- `backend/ShopifyAnalyticsApi/Middleware/AuthModeMiddleware.cs` - 認証ミドルウェア
- `frontend/src/components/providers/AuthProvider.tsx` - 認証プロバイダー
- `frontend/src/lib/api-client.ts` - APIクライアント
- `frontend/env.sample` - 環境変数サンプル

## ✅ 実装完了状況

### 完了した実装

1. ✅ **開発者認証ページの実装**
   - `/dev/login` ページを作成済み
   - 開発者認証でログイン可能

2. ✅ **AuthProvider の修正**
   - 開発者トークンをサポート
   - ローカルバックエンドURLを直接指定可能

3. ✅ **環境変数サンプルの更新**
   - `frontend/env.sample` に開発者モード設定を追加

## 🧪 動作確認手順（更新版）

### 1. バックエンドの起動

```powershell
cd backend/ShopifyAnalyticsApi
dotnet run
```

バックエンドが `http://localhost:5168` または `https://localhost:7088` で起動することを確認

### 2. フロントエンドの環境変数設定

`frontend/.env.local` を作成または編集：

```env
NEXT_PUBLIC_DEVELOPER_MODE=true
NEXT_PUBLIC_BACKEND_URL=http://localhost:5168
NEXT_PUBLIC_ENVIRONMENT=development
```

### 3. フロントエンドの起動

```powershell
cd frontend
npm run dev
```

### 4. 開発者認証でログイン

1. ブラウザで `http://localhost:3000/dev/login` にアクセス
2. パスワード `dev2026` を入力
3. 「ログイン」ボタンをクリック
4. `/setup/initial` に自動リダイレクトされることを確認

### 5. データ同期ボタンの動作確認

1. `/setup/initial` ページで「同期を開始」ボタンをクリック
2. Console タブで以下のログを確認：
   - `🔧 [AuthProvider] 開発者モード: ローカルバックエンドに直接接続`
   - `🔐 [AuthProvider] 開発者トークンを使用`
   - `📤 POST /api/sync/initial 送信準備完了`
   - `📥 [APIClient.request] fetch完了` (ステータス: 200)
3. Network タブで `POST /api/sync/initial` リクエストが送信されていることを確認
4. 同期進捗画面 (`/setup/syncing`) にリダイレクトされることを確認

---

**更新履歴**:
- 2026-01-03: 初版作成
