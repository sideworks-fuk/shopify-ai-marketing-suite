# ローカルバックエンド開発者モード - クイックスタート

**作成日**: 2026-01-03  
**目的**: データ同期ボタンの動作確認をローカルバックエンドで行うための最短手順

## 🚀 クイックスタート（5分）

### Step 1: バックエンドの起動

```powershell
cd backend/ShopifyAnalyticsApi
dotnet run
```

**確認**: `http://localhost:5168` または `https://localhost:7088` で起動していることを確認

### Step 2: フロントエンドの環境変数設定

`frontend/.env.local` を作成：

```env
NEXT_PUBLIC_DEVELOPER_MODE=true
NEXT_PUBLIC_BACKEND_URL=http://localhost:5168
NEXT_PUBLIC_ENVIRONMENT=development
```

### Step 3: フロントエンドの起動

```powershell
cd frontend
npm run dev
```

### Step 4: 開発者認証でログイン

1. ブラウザで `http://localhost:3000/dev/login` にアクセス
2. パスワード: `dev2026` を入力
3. 「ログイン」ボタンをクリック
4. 自動的に `/setup/initial` にリダイレクトされます

### Step 5: データ同期ボタンの動作確認

1. `/setup/initial` ページで「同期を開始」ボタンをクリック
2. Console タブでログを確認
3. Network タブで `POST /api/sync/initial` リクエストを確認

## ✅ 確認ポイント

### Console ログで確認すべき項目

```
🔧 [AuthProvider] 開発者モード: ローカルバックエンドに直接接続
🔐 [AuthProvider] 開発者トークンを使用
📤 POST /api/sync/initial 送信準備完了
📥 [APIClient.request] fetch完了 (status: 200)
```

### Network タブで確認すべき項目

- **リクエストURL**: `http://localhost:5168/api/sync/initial`
- **ステータスコード**: `200 OK`
- **リクエストヘッダー**: `Authorization: Bearer ...` が含まれている
- **レスポンス**: `{ syncId: ..., jobId: ..., status: "started" }`

## 🔧 トラブルシューティング

### 問題1: 401 Unauthorized エラー

**原因**: 開発者トークンが設定されていない、または期限切れ

**対処法**:
1. `/dev/login` で再度ログイン
2. Console で `localStorage.getItem('developerToken')` を確認

### 問題2: CORSエラー

**原因**: バックエンドのCORS設定に `http://localhost:3000` が含まれていない

**対処法**:
1. `backend/ShopifyAnalyticsApi/appsettings.Development.json` を確認
2. `Cors:AllowedOrigins` に `http://localhost:3000` が含まれているか確認

### 問題3: バックエンドに接続できない

**原因**: バックエンドが起動していない、またはポート番号が違う

**対処法**:
1. バックエンドが起動しているか確認
2. `NEXT_PUBLIC_BACKEND_URL` のポート番号を確認（5168 または 7088）

## 📚 詳細情報

詳細な設定手順は以下を参照：
- `docs/05-development/08-デバッグ・トラブル/01-problem-analysis/2026-01/local-backend-dev-mode-setup.md`

---

**更新履歴**:
- 2026-01-03: 初版作成
