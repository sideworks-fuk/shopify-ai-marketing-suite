# データベース開発環境戦略

## 📋 ドキュメント情報
- **作成日**: 2025年7月2日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: 開発環境DBの選択と移行戦略

---

## 🎯 推奨アプローチ：段階的移行

### Phase 1: ローカル開発（最初の1-2週間）
**初期開発とプロトタイピング**

#### 環境構築
```powershell
# SQL Server 2022 Developer Edition（無料）
# ダウンロード: https://www.microsoft.com/en-us/sql-server/sql-server-downloads

# Docker を使用する場合（推奨）
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" `
  -p 1433:1433 --name sql-dev `
  -d mcr.microsoft.com/mssql/server:2022-latest
```

#### 接続文字列（appsettings.Development.json）
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=ShopifySampleData;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True"
  }
}
```

### Phase 2: Azure開発DB（チーム開発開始時）
**共有開発環境**

#### Azure SQL Database設定
```
サービス: Azure SQL Database
価格レベル: Basic (5 DTU) 
月額費用: 約600円
ストレージ: 2GB（十分）
```

#### 接続文字列（appsettings.Azure.json）
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=tcp:shopify-dev.database.windows.net,1433;Initial Catalog=ShopifySampleData;Persist Security Info=False;User ID=devadmin;Password={your_password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  }
}
```

---

## 🛠️ ローカル開発環境セットアップ

### 1. SQL Server LocalDB（最も簡単）

```csharp
// 接続文字列
"Server=(localdb)\\mssqllocaldb;Database=ShopifySampleData;Trusted_Connection=True;"

// Visual Studio に含まれている
// 追加インストール不要
```

### 2. Docker版 SQL Server（推奨）

```yaml
# docker-compose.yml
version: '3.8'
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Passw0rd
      - MSSQL_PID=Developer
    ports:
      - "1433:1433"
    volumes:
      - sqldata:/var/opt/mssql
volumes:
  sqldata:
```

### 3. 初期スキーマ作成スクリプト

```sql
-- create-schema.sql
CREATE DATABASE ShopifySampleData;
GO

USE ShopifySampleData;
GO

-- テーブル作成（sample-db-architecture.md から）
CREATE TABLE SampleProducts (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    -- ... 省略
);

-- 他のテーブルも同様に作成
```

---

## 🔄 ローカル→Azure移行手順

### 1. データベースのエクスポート

```powershell
# SQL Server Management Studio (SSMS) を使用
# 1. ローカルDBに接続
# 2. データベースを右クリック
# 3. タスク → データ層アプリケーションのエクスポート
# 4. .bacpac ファイルとして保存
```

### 2. Azureへのインポート

```powershell
# Azure Portal から
# 1. SQL Database → データベースのインポート
# 2. .bacpac ファイルをアップロード
# 3. 価格レベルを選択（Basic推奨）
# 4. インポート実行
```

### 3. 接続文字列の切り替え

```csharp
// Program.cs での環境別設定
var builder = WebApplication.CreateBuilder(args);

// 環境に応じて設定ファイルを読み込み
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

// 環境変数で切り替え
// ASPNETCORE_ENVIRONMENT=Development → ローカル
// ASPNETCORE_ENVIRONMENT=Azure → Azure開発DB
```

---

## 📊 コスト比較

| 環境 | 初期費用 | 月額費用 | 適した用途 |
|------|---------|---------|-----------|
| LocalDB | ¥0 | ¥0 | 個人開発、初期開発 |
| Docker SQL | ¥0 | ¥0 | ローカルチーム開発 |
| Azure Basic | ¥0 | ¥600 | チーム開発、統合テスト |
| Azure S0 | ¥0 | ¥1,500 | パフォーマンステスト |

---

## 🎯 開発フェーズ別推奨

### Week 1-2: 初期開発
- **使用DB**: ローカル（LocalDB or Docker）
- **理由**: 高速な試行錯誤、スキーマ変更頻繁
- **作業内容**: 
  - テーブル設計
  - 匿名化ツール開発
  - 基本的なCRUD操作

### Week 3-4: 統合開発
- **使用DB**: Azure Basic
- **理由**: チーム共有、本番に近い環境
- **作業内容**:
  - Shopify連携テスト
  - パフォーマンス確認
  - 本番移行準備

---

## 🔧 便利な開発ツール

### 1. Azure Data Studio
- 無料
- クロスプラットフォーム
- ローカル/Azure両対応

### 2. SQL Server Management Studio (SSMS)
- Windows専用
- 高機能
- デバッグに最適

### 3. Visual Studio SQL Server Object Explorer
- Visual Studio統合
- Entity Framework連携
- デバッグ実行可能

---

## 💡 ベストプラクティス

### 1. 接続文字列の管理
```csharp
// User Secrets を使用（開発環境）
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=..."

// Azure Key Vault を使用（本番環境）
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());
```

### 2. マイグレーション管理
```csharp
// Entity Framework Core Migrations
dotnet ef migrations add InitialCreate
dotnet ef database update

// 環境別に実行
dotnet ef database update --connection "Server=..." --environment Development
```

### 3. シードデータ
```csharp
public class SampleDataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (!context.SampleProducts.Any())
        {
            // 開発用のテストデータを投入
            var products = GenerateSampleProducts();
            await context.SampleProducts.AddRangeAsync(products);
            await context.SaveChangesAsync();
        }
    }
}
```

---

## 📋 チェックリスト

### ローカル開発開始時
- [ ] SQL Server Developer Edition or Docker インストール
- [ ] SSMS or Azure Data Studio インストール
- [ ] 初期スキーマ作成スクリプト実行
- [ ] 接続文字列設定（appsettings.Development.json）
- [ ] Entity Framework マイグレーション設定

### Azure移行時
- [ ] Azure SQL Database 作成（Basic tier）
- [ ] ファイアウォール規則設定
- [ ] ローカルDBエクスポート（.bacpac）
- [ ] Azureへインポート
- [ ] 接続文字列更新（appsettings.Azure.json）
- [ ] チームメンバーへのアクセス権限付与

---

## 🎉 まとめ

**最初はローカルで始めて、必要に応じてAzureに移行**するのが最も効率的です。

1. **Week 1-2**: ローカル開発（Docker SQL推奨）
2. **Week 3以降**: Azure Basic（月600円）で共有開発
3. **本番準備**: Azure Standard（必要に応じてスケール）

この段階的アプローチにより、コストを抑えながら効率的な開発が可能です！ 