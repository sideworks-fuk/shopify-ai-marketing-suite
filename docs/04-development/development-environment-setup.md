# 開発環境セットアップ手順書

## 前提条件

### 必要なソフトウェア
- **OS**: Windows 10/11, macOS, またはLinux
- **.NET SDK 8.0以上**: [ダウンロード](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Visual Studio 2022**または**VS Code** + C#拡張機能
- **Docker Desktop**: [ダウンロード](https://www.docker.com/products/docker-desktop)
- **Git**: バージョン管理用
- **Node.js 18以上**: フロントエンド開発用（既存）

### 推奨ツール
- **pgAdmin 4**または**DBeaver**: PostgreSQL管理
- **Postman**: API テスト
- **Azure Data Studio**: SQL Server互換ツール（オプション）

## セットアップ手順

### 1. プロジェクトのクローン

```bash
# 既存のプロジェクトディレクトリに移動
cd shopify-analytics-app

# バックエンドフォルダ作成
mkdir backend
cd backend
```

### 2. .NET ソリューション作成

```bash
# ソリューションファイル作成
dotnet new sln -n ShopifyAnalytics

# プロジェクト作成
dotnet new webapi -n ShopifyAnalytics.API -f net8.0
dotnet new classlib -n ShopifyAnalytics.Core -f net8.0
dotnet new classlib -n ShopifyAnalytics.Data -f net8.0
dotnet new xunit -n ShopifyAnalytics.Tests -f net8.0

# ソリューションにプロジェクト追加
dotnet sln add ShopifyAnalytics.API/ShopifyAnalytics.API.csproj
dotnet sln add ShopifyAnalytics.Core/ShopifyAnalytics.Core.csproj
dotnet sln add ShopifyAnalytics.Data/ShopifyAnalytics.Data.csproj
dotnet sln add ShopifyAnalytics.Tests/ShopifyAnalytics.Tests.csproj

# プロジェクト参照設定
cd ShopifyAnalytics.API
dotnet add reference ../ShopifyAnalytics.Core/ShopifyAnalytics.Core.csproj
dotnet add reference ../ShopifyAnalytics.Data/ShopifyAnalytics.Data.csproj

cd ../ShopifyAnalytics.Data
dotnet add reference ../ShopifyAnalytics.Core/ShopifyAnalytics.Core.csproj

cd ../ShopifyAnalytics.Tests
dotnet add reference ../ShopifyAnalytics.API/ShopifyAnalytics.API.csproj
```

### 3. 必要なNuGetパッケージインストール

```bash
# APIプロジェクトに移動
cd ../ShopifyAnalytics.API

# Entity Framework Core関連
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.0
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.0
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.0.0

# API関連
dotnet add package Swashbuckle.AspNetCore --version 6.5.0
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.0

# ログ関連
dotnet add package Serilog.AspNetCore --version 8.0.0
dotnet add package Serilog.Sinks.Console --version 5.0.0
dotnet add package Serilog.Sinks.File --version 5.0.0

# HTTP関連
dotnet add package Polly --version 8.2.0
dotnet add package Polly.Extensions.Http --version 3.0.0

# Dataプロジェクトに移動
cd ../ShopifyAnalytics.Data
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.0
dotnet add package Microsoft.EntityFrameworkCore --version 8.0.0
```

### 4. Docker環境構築

プロジェクトルートに`docker-compose.yml`作成:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: shopify_analytics_db
    environment:
      POSTGRES_USER: shopify_user
      POSTGRES_PASSWORD: shopify_pass
      POSTGRES_DB: shopify_analytics_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shopify_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: shopify_analytics_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@shopify.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### 5. 初期設定ファイル作成

#### appsettings.Development.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=shopify_analytics_dev;Username=shopify_user;Password=shopify_pass"
  },
  "Shopify": {
    "AdminApiUrl": "https://your-store.myshopify.com/admin/api/2024-01/graphql.json",
    "AccessToken": "your-access-token-here",
    "ApiVersion": "2024-01",
    "RateLimit": {
      "MaxRetries": 3,
      "BaseDelayMs": 1000
    }
  },
  "Jwt": {
    "Key": "your-super-secret-key-for-development-only",
    "Issuer": "ShopifyAnalytics",
    "Audience": "ShopifyAnalyticsUsers",
    "ExpireMinutes": 60
  }
}
```

#### .env.example
```bash
# Shopify設定
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopify_analytics_dev
DB_USER=shopify_user
DB_PASSWORD=shopify_pass

# JWT設定
JWT_SECRET=your-super-secret-key-for-development-only
JWT_EXPIRE_MINUTES=60

# 環境設定
ASPNETCORE_ENVIRONMENT=Development
```

### 6. 開発環境起動手順

```bash
# 1. Docker起動
docker-compose up -d

# 2. データベース接続確認
docker exec -it shopify_analytics_db psql -U shopify_user -d shopify_analytics_dev

# 3. プロジェクトビルド
cd backend
dotnet build

# 4. EF Coreツールインストール（初回のみ）
dotnet tool install --global dotnet-ef

# 5. マイグレーション作成（初回のみ）
cd ShopifyAnalytics.API
dotnet ef migrations add InitialCreate -p ../ShopifyAnalytics.Data -s .

# 6. マイグレーション適用
dotnet ef database update

# 7. API起動
dotnet run

# 8. Swagger UI確認
# ブラウザで https://localhost:5001/swagger を開く
```

### 7. VS Code設定（推奨）

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET Core Launch (web)",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${workspaceFolder}/backend/ShopifyAnalytics.API/bin/Debug/net8.0/ShopifyAnalytics.API.dll",
      "args": [],
      "cwd": "${workspaceFolder}/backend/ShopifyAnalytics.API",
      "stopAtEntry": false,
      "serverReadyAction": {
        "action": "openExternally",
        "pattern": "\\bNow listening on:\\s+(https?://\\S+)"
      },
      "env": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  ]
}
```

`.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "command": "dotnet",
      "type": "process",
      "args": [
        "build",
        "${workspaceFolder}/backend/ShopifyAnalytics.sln",
        "/property:GenerateFullPaths=true",
        "/consoleloggerparameters:NoSummary"
      ],
      "problemMatcher": "$msCompile"
    },
    {
      "label": "watch",
      "command": "dotnet",
      "type": "process",
      "args": [
        "watch",
        "run",
        "--project",
        "${workspaceFolder}/backend/ShopifyAnalytics.API/ShopifyAnalytics.API.csproj"
      ],
      "problemMatcher": "$msCompile"
    }
  ]
}
```

## トラブルシューティング

### PostgreSQL接続エラー
```bash
# コンテナログ確認
docker logs shopify_analytics_db

# PostgreSQL再起動
docker-compose restart postgres
```

### Entity Framework エラー
```bash
# EF Coreツール更新
dotnet tool update --global dotnet-ef

# マイグレーション削除
dotnet ef migrations remove

# データベース削除
dotnet ef database drop
```

### ポート競合
```bash
# 使用中のポート確認（Windows）
netstat -ano | findstr :5432

# 使用中のポート確認（Mac/Linux）
lsof -i :5432
```

## 次のステップ

1. **Shopifyアクセストークン取得**
   - Shopify Partners管理画面からプライベートアプリ作成
   - 必要なスコープ: `read_products`, `read_orders`, `read_customers`

2. **SSL証明書設定**（本番環境用）
   - Let's Encrypt設定
   - Nginx リバースプロキシ設定

3. **CI/CD パイプライン構築**
   - GitHub Actions設定
   - Azure DevOps Pipeline設定

## 参考リンク

- [.NET 8 ドキュメント](https://docs.microsoft.com/ja-jp/dotnet/core/whats-new/dotnet-8)
- [Entity Framework Core](https://docs.microsoft.com/ja-jp/ef/core/)
- [Shopify Admin API](https://shopify.dev/api/admin-graphql)
- [PostgreSQL ドキュメント](https://www.postgresql.org/docs/)