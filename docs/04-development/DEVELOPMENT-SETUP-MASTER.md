# 開発環境セットアップ マスターガイド

## 📋 概要

このガイドでは、Shopify AI Marketing Suiteの**フロントエンド（Next.js）**と**バックエンド（.NET 8）**の統合開発環境構築手順を説明します。

## 🔧 前提条件

### 必須ソフトウェア
- **OS**: Windows 10/11, macOS, Linux
- **Node.js**: v18.0.0以上 - [ダウンロード](https://nodejs.org/)
- **npm**: v9.0.0以上（Node.jsに含まれる）
- **.NET SDK**: 8.0以上 - [ダウンロード](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Git**: バージョン管理用
- **Docker Desktop**: データベース環境用 - [ダウンロード](https://www.docker.com/products/docker-desktop)

### 推奨ツール
- **Visual Studio 2022** または **VS Code** + C#拡張機能
- **PowerShell**: 5.1以上（Windows標準搭載）
- **pgAdmin 4** または **DBeaver**: データベース管理
- **Postman**: API テスト用

## 🗂️ プロジェクト構成

```
shopify-ai-marketing-suite/
├── frontend/                    # Next.js フロントエンド
│   ├── src/
│   ├── package.json
│   └── next.config.js
├── backend/                     # .NET 8 バックエンド
│   ├── ShopifyTestApi/         # Web API プロジェクト
│   ├── Models/
│   ├── Services/
│   └── Controllers/
├── data/                       # CSVデータファイル
├── docs/                       # ドキュメント
└── docker-compose.yml          # 開発用DB環境
```

## 🚀 セットアップ手順

### Step 1: リポジトリのクローン

```bash
git clone https://github.com/sideworks-fuk/shopify-ai-marketing-suite.git
cd shopify-ai-marketing-suite
```

### Step 2: フロントエンド環境構築

#### 2.1 依存関係のインストール
```bash
cd frontend
npm install
```

#### 2.2 環境変数の設定

**PowerShell使用の場合:**
```powershell
@"
# Shopify API
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,read_orders,read_customers

# フロントエンド設定
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_SHOP_DOMAIN=your-shop.myshopify.com
NEXT_PUBLIC_ACCESS_TOKEN=your-access-token

# NextAuth.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**手動作成の場合:**
`.env.local`ファイルを作成し、上記内容をコピー&ペースト

#### 2.3 フロントエンド起動テスト
```bash
npm run dev
```
→ http://localhost:3000 で動作確認

### Step 3: バックエンド環境構築

#### 3.1 .NET プロジェクトの確認
```bash
cd ../backend/ShopifyTestApi
dotnet restore
dotnet build
```

#### 3.2 データベース環境の構築

**Docker Compose起動:**
```bash
# プロジェクトルートに戻る
cd ../../

# データベースコンテナ起動
docker-compose up -d
```

**データベース接続確認:**
```bash
docker exec -it shopify-ai-marketing-suite-sqlserver-1 /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourPassword123"
```

#### 3.3 バックエンドAPI起動
```bash
cd backend/ShopifyTestApi
dotnet run
```
→ https://localhost:7000/swagger で Swagger UI 確認

### Step 4: 統合動作確認

#### 4.1 API接続テスト
1. フロントエンド: http://localhost:3000
2. `/dev-bookmarks` → 「購入回数APIテスト」アクセス
3. API接続テストを実行して動作確認

#### 4.2 データ連携確認
1. バックエンドが起動している状態で
2. フロントエンドから各分析画面にアクセス
3. モックデータが正常に表示されることを確認

## 🔧 個別環境設定

### Shopify API設定

#### Partners アカウントでの設定
1. [Shopify Partners](https://partners.shopify.com/)にログイン
2. 「Apps」→「Create app」
3. **開発環境URL設定:**
   - App URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/api/auth/callback`
4. **必要なスコープ:** `read_products`, `read_orders`, `read_customers`
5. API キーとシークレットを環境変数に設定

#### 開発ストア作成
1. Partners管理画面で「Development store」作成
2. 作成したアプリをストアにインストール
3. アクセストークンを取得

### Azure OpenAI設定（オプション）

#### リソース作成
1. [Azure Portal](https://portal.azure.com/)にログイン
2. 「Azure OpenAI」リソースを作成
3. GPT-4モデルをデプロイ
4. キーとエンドポイントを取得

#### 環境変数追加
```bash
# .env.local に追加
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

### データベース詳細設定

#### 手動データベース作成（必要に応じて）
```sql
-- SQL Server Management Studio または Azure Data Studio で実行
CREATE DATABASE ShopifyAnalytics;
USE ShopifyAnalytics;

-- テーブル作成は EF Core マイグレーションで自動実行
```

#### Entity Framework マイグレーション
```bash
cd backend/ShopifyTestApi

# マイグレーション作成（新しいモデル追加時）
dotnet ef migrations add NewMigrationName

# データベース更新
dotnet ef database update
```

## 🧪 テスト環境設定

### フロントエンドテスト
```bash
cd frontend

# Jest テストライブラリインストール
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom

# テスト実行
npm test
```

### バックエンドテスト
```bash
cd backend/ShopifyTestApi

# テストプロジェクト実行
dotnet test
```

### API統合テスト
```bash
# HTTP ファイルを使用（VS Code REST Client拡張機能）
# ファイル: backend/ShopifyTestApi/ShopifyTestApi.http
```

## 🚨 トラブルシューティング

### Windows固有の問題

#### パスの長さ制限
```powershell
# 管理者権限のPowerShellで実行
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```

#### ポート競合
```powershell
# 使用中のポート確認
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# プロセス終了
taskkill /F /PID <PID>

# 代替ポートで起動
$env:PORT = 3001
npm run dev
```

####環境変数の問題
```powershell
# 一時的な設定
$env:VARIABLE_NAME = "value"

# 永続的な設定（ユーザーレベル）
[Environment]::SetEnvironmentVariable("VARIABLE_NAME", "value", "User")
```

### Docker関連の問題

#### データベース接続エラー
```bash
# コンテナ状態確認
docker ps
docker logs [container_name]

# データベース再起動
docker-compose restart
```

#### ポート競合（Docker）
```bash
# 使用中のポート確認
docker port [container_name]

# 別ポートで起動
# docker-compose.yml でポート番号変更
```

### .NET関連の問題

#### NuGet復元エラー
```bash
# キャッシュクリア
dotnet nuget locals all --clear

# 復元再実行
dotnet restore --force
```

#### Entity Framework エラー
```bash
# EF Core ツール更新
dotnet tool update --global dotnet-ef

# マイグレーション削除
dotnet ef migrations remove

# データベースリセット
dotnet ef database drop
dotnet ef database update
```

### Node.js関連の問題

#### ENOENT エラー
```javascript
// パス区切り文字の統一
const path = 'src/components/example.tsx'; // ✅ 正しい
// const path = 'src\\components\\example.tsx'; // ❌ 避ける
```

#### 依存関係エラー
```bash
# node_modules削除
rm -rf node_modules package-lock.json

# 再インストール
npm install
```

## 🔄 開発ワークフロー

### 日常的な開発手順
1. **朝の起動ルーチン:**
   ```bash
   # 1. Docker起動
   docker-compose up -d
   
   # 2. バックエンド起動
   cd backend/ShopifyTestApi && dotnet run &
   
   # 3. フロントエンド起動
   cd frontend && npm run dev
   ```

2. **コード変更後:**
   ```bash
   # フロントエンド: 自動リロード（Hot Reload）
   # バックエンド: dotnet watch run で自動再起動
   ```

3. **終日終了時:**
   ```bash
   # Docker停止
   docker-compose down
   ```

### データ管理

#### モックデータの場所
- **フロントエンド**: `src/data/mock/customerData.ts`
- **切り替え**: `NEXT_PUBLIC_USE_MOCK=true/false`

#### 実データテスト
1. Shopify 開発ストアにサンプルデータ追加
2. 環境変数で実APIに切り替え
3. API接続テスト画面で動作確認

## 📚 参考リンク

### 技術ドキュメント
- [Next.js 14 ドキュメント](https://nextjs.org/docs)
- [.NET 8 ドキュメント](https://docs.microsoft.com/ja-jp/dotnet/core/whats-new/dotnet-8)
- [Entity Framework Core](https://docs.microsoft.com/ja-jp/ef/core/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### API リファレンス
- [Shopify Admin API](https://shopify.dev/api/admin-graphql)
- [Shopify REST API](https://shopify.dev/api/admin-rest)

### 開発ツール
- [Docker ドキュメント](https://docs.docker.com/)
- [VS Code 拡張機能](https://marketplace.visualstudio.com/vscode)

## 📝 補足情報

### モックデータとデータ層
- **統合DataService**: モック/API自動切り替え
- **エラーハンドリング**: 統一されたエラー処理
- **UI統一**: shadcn/ui + Tailwind CSS

### セキュリティ考慮事項
- 環境変数でのシークレット管理
- `.env.local`をGitignoreに追加済み
- CORS設定の適切な構成

---

**最終更新:** 2025年1月26日  
**統合者:** レイ（Claude Code AI）  
**バージョン:** 1.0.0 - 統合版