# ローカル開発環境設定手順（Azure開発環境使用）

## 作成日
2025-12-29
更新日: 2025-12-29

## 目的
バックエンドをAzure開発環境にデプロイし、フロントエンド（ローカル）から接続する設定手順。

## 方針変更（2025-12-29）
- バックエンド: Azure開発環境にデプロイ（`https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`）
- フロントエンド: ローカル（`localhost:3000`）またはngrok（Shopify埋め込みアプリの場合のみ）

---

## ⚠️ 重要な注意事項

### GitHub Actions環境変数とローカル環境変数の違い

**GitHub Actions環境変数**:
- Azure Static Web Appsにデプロイされる際に使用される
- `localhost`は使用できない（デプロイ先でアクセスできないため）
- 本番環境やステージング環境で使用される

**ローカル環境変数** (`.env.local`):
- ローカル開発環境でのみ使用される
- `localhost`を使用できる
- GitHub Actionsには影響しない

### 推奨アプローチ

ngrokを使ったローカルテストの場合、**GitHub Actionsの環境変数を変更するのではなく、ローカルの`.env.local`ファイルを設定することを推奨**します。

---

## 📋 設定手順

### Step 1: ngrokトンネルの起動

#### 方法1: ngrok設定ファイルを使用（推奨）

プロジェクトルートに`ngrok.yml`ファイルを作成し、以下の内容を設定：

```yaml
version: "3"
agent:
    authtoken: YOUR_AUTH_TOKEN
tunnels:
  frontend:
    proto: http
    addr: 3000
  backend:
    proto: http
    addr: 7088
  demo:
    proto: http
    addr: 5168
```

**起動方法**:
```powershell
# すべてのトンネルを同時に起動
ngrok start --all

# または、個別に起動（警告ページをスキップするオプション付き）
ngrok start frontend --host-header=rewrite
ngrok start backend
```

ngrok起動後、以下のようなURLが表示されます：
```
Forwarding: https://your-frontend.ngrok-free.dev -> http://localhost:3000
Forwarding: https://your-backend.ngrok-free.dev -> http://localhost:7088
```

#### 方法2: 個別に起動（従来の方法）

##### バックエンド用（ポート7088）
```powershell
ngrok http 7088
```

##### フロントエンド用（ポート3000）
```powershell
# 別のターミナルで実行
# 警告ページをスキップするために --host-header オプションを追加
ngrok http 3000 --host-header=rewrite
```

**または、より詳細な設定**:
```powershell
# 警告ページを完全にスキップ（推奨）
ngrok http 3000 --host-header=rewrite --request-header-add="ngrok-skip-browser-warning: true"
```

**重要**: 
- `--host-header=rewrite`オプションを使用することで、ngrokの警告ページをスキップし、チャンク読み込みエラーを防ぐことができます
- フロントエンドとバックエンドの両方をngrok URLにすることで、SSL証明書エラーを回避できます

### Step 2: フロントエンド環境変数の設定

**ファイル**: `frontend/.env.local`（存在しない場合は作成）

```env
# バックエンドURL（Azure開発環境）
NEXT_PUBLIC_BACKEND_URL=https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net

# フロントエンドURL（Shopify埋め込みアプリの場合のみngrok URLを設定）
# オプション1: ngrokを使用（Shopify埋め込みアプリの場合）
NEXT_PUBLIC_SHOPIFY_APP_URL=https://your-frontend-ngrok-url.ngrok-free.dev

# オプション2: ローカルのみ（直接アクセスの場合）
# NEXT_PUBLIC_SHOPIFY_APP_URL=http://localhost:3000

# その他の設定
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_SHOPIFY_API_KEY=2d7e0e1f5da14eb9d299aa746738e44b
NEXT_PUBLIC_USE_HTTPS=true
NEXT_PUBLIC_DISABLE_FEATURE_GATES=true
```

**重要**: 
- `NEXT_PUBLIC_BACKEND_URL`は、Azure開発環境のURLを設定してください
- `NEXT_PUBLIC_SHOPIFY_APP_URL`は、Shopify埋め込みアプリとして動作させる場合のみngrok URLを設定してください

### Step 3: バックエンド環境変数の設定

**注意**: バックエンドはAzure開発環境にデプロイされているため、ローカルでのバックエンド起動は不要です。

**Azure開発環境**:
- バックエンドは `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net` で動作します
- フロントエンドからバックエンドAPIへの呼び出しは、`NEXT_PUBLIC_BACKEND_URL`で設定されたURLを使用します

**環境変数（オプション）**:
バックエンドの環境変数として設定する場合：

```powershell
# PowerShell
$env:SHOPIFY_APPURL = "https://unsavagely-repressive-terrance.ngrok-free.dev"
$env:SHOPIFY_BACKEND_BASEURL = "https://unsavagely-repressive-terrance.ngrok-free.dev"
```

ただし、`ShopifyApps`テーブルが優先されるため、テーブルの更新が推奨されます。

### Step 4: データベースの設定（必須）

`ShopifyApps`テーブルの`AppUrl`を更新：

```sql
-- Id: 6 のレコードを更新
UPDATE [dbo].[ShopifyApps]
SET 
    [AppUrl] = 'https://unsavagely-repressive-terrance.ngrok-free.dev',
    [RedirectUri] = 'https://unsavagely-repressive-terrance.ngrok-free.dev/api/shopify/callback',
    [UpdatedAt] = GETUTCDATE()
WHERE [Id] = 6
  AND [ApiKey] = '706a757915dedce54806c0a179bee05d'
  AND [IsActive] = 1;
```

**重要**: `appsettings.Development.json`は現在使用されていないため、`ShopifyApps`テーブルの更新が必須です。

### Step 5: Shopify Partners Dashboardの設定

1. **App URL**: `https://your-frontend.ngrok-free.dev`
2. **Allowed redirection URL(s)**:
   - `https://unsavagely-repressive-terrance.ngrok-free.dev/api/shopify/callback`
   - `https://your-frontend.ngrok-free.dev/auth/success`

---

## 🔄 GitHub Actions環境変数の変更（必要な場合）

**注意**: 通常はローカルの`.env.local`ファイルで設定することを推奨しますが、GitHub Actionsのdevelop環境の環境変数を変更する場合は以下の手順を実行してください。

### 変更内容

1. **`NEXT_PUBLIC_API_URL`**:
   - 変更前: `https://shopifyapp-backend-develop-a0e6fec4ath6fzaa.japanwest-01.azurewebsites.net`
   - 変更後: `https://unsavagely-repressive-terrance.ngrok-free.dev`

2. **`NEXT_PUBLIC_SHOPIFY_APP_URL`**:
   - 変更前: `https://brave-sea-038f17a00-development.eastasia.1.azurestaticapps.net`
   - 変更後: `https://unsavagely-repressive-terrance.ngrok-free.dev`
   - **注意**: フロントエンド用のngrok URLを設定します。

### 変更手順

1. GitHubリポジトリにアクセス
2. Settings → Environments → `development`を選択
3. Environment variablesセクションで以下を更新：
   - `NEXT_PUBLIC_API_URL`: `https://unsavagely-repressive-terrance.ngrok-free.dev`
   - `NEXT_PUBLIC_SHOPIFY_APP_URL`: `https://unsavagely-repressive-terrance.ngrok-free.dev`

---

## 🧪 テスト手順

### 1. ローカルサーバーの起動

#### バックエンド
```powershell
cd backend/ShopifyAnalyticsApi
dotnet run
```

#### フロントエンド
```powershell
cd frontend
npm run dev
```

### 2. ngrokトンネルの起動

#### バックエンド用
```powershell
ngrok http 7088
```

#### フロントエンド用（別ターミナル）
```powershell
ngrok http 3000
```

### 3. インストールフローのテスト

1. ブラウザで `https://your-frontend.ngrok-free.dev/install?shop=your-dev-store.myshopify.com` にアクセス
2. 「接続を開始」ボタンをクリック
3. Shopify OAuth認証画面で権限を承認
4. `/auth/success`ページにリダイレクトされることを確認
5. ストア情報がデータベースに保存されることを確認

---

## 🔍 トラブルシューティング

### 問題1: CORSエラーが発生する

**原因**: バックエンドのCORS設定にngrok URLが含まれていない

**解決方法**: `appsettings.Development.json`の`Cors:AllowedOrigins`にngrok URLを追加：

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://your-frontend.ngrok-free.dev",
      "https://unsavagely-repressive-terrance.ngrok-free.dev"
    ]
  }
}
```

### 問題2: Invalid callback URL エラー

**原因**: Shopify Partners DashboardのAllowed redirection URLsにngrok URLが登録されていない

**解決方法**: Shopify Partners DashboardでAllowed redirection URLsを更新

### 問題3: ngrok URLが変わった

**原因**: ngrok無料版は再起動するたびにURLが変わる

**解決方法**: 
- ngrok有料版を使用して固定ドメインを設定
- または、URLが変わるたびに設定を更新

---

## 📝 設定確認チェックリスト

- [x] ngrok設定ファイル（`ngrok.yml`）が作成されている ✅
- [x] `ngrok start --all`でフロントエンドとバックエンドのトンネルが起動している ✅
- [x] `frontend/.env.local`に`NEXT_PUBLIC_BACKEND_URL`が設定されている（バックエンド用ngrok URL） ✅
- [x] `frontend/.env.local`に`NEXT_PUBLIC_API_URL`が設定されている（フォールバック用） ✅
- [x] `frontend/.env.local`に`NEXT_PUBLIC_SHOPIFY_APP_URL`が設定されている（フロントエンド用ngrok URL） ✅
- [x] `ShopifyApps`テーブルの`AppUrl`が更新されている（Id: 6） ✅
- [x] `ShopifyApps`テーブルの`RedirectUri`が更新されている（Id: 6） ✅
- [x] バックエンド設定（AllowedOrigins）にngrok URLが追加されている ✅
- [x] Shopify Partners DashboardのApp URLが更新されている ✅
- [x] Shopify Partners DashboardのAllowed redirection URLsが更新されている ✅
- [ ] **バックエンド環境変数`SHOPIFY_USE_FRONTEND_PROXY`が設定されている** ⚠️
- [ ] **バックエンド環境変数`SHOPIFY_FRONTEND_BASEURL`が設定されている** ⚠️

**注意**: バックエンド環境変数の設定が必要です。バックエンド起動前に以下を実行してください：
```powershell
$env:SHOPIFY_USE_FRONTEND_PROXY = "true"
$env:SHOPIFY_FRONTEND_BASEURL = "https://your-frontend-ngrok-url.ngrok-free.dev"
```

---

## 📚 関連ドキュメント

- [ngrok設定ガイド](./ngrok設定ガイド.md)
- [ngrok-ローカルテスト-SQL更新](./ngrok-ローカルテスト-SQL更新.md)
- [インストール機能設計書](../../03-feature-development/インストールフロー改善機能/インストール機能設計書.md)
- [インストール機能-トラブルシューティング](../../03-feature-development/インストールフロー改善機能/インストール機能-トラブルシューティング.md)

---

## 📝 更新履歴

- 2025-12-29: 初版作成
  - ngrokローカルテスト設定手順を追加
  - GitHub Actions環境変数とローカル環境変数の違いを明記
  - 設定確認チェックリストを追加
