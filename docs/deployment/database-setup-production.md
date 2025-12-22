# 本番環境データベース設定ガイド

## 作成日: 2025-12-22

## 利用可能なマイグレーションスクリプト

### 1. マスタースクリプト（推奨）
**ファイル**: `docs/05-development/03-データベース/マイグレーション/2025-09-04-MASTER-CreateDatabaseFromScratch.sql`
- 新規環境用の完全なDDLスクリプト
- すべてのテーブル、インデックス、ストアドプロシージャを含む

### 2. 追加マイグレーション（マスター実行後に必要）
以下の順番で実行：

1. **2025-10-20-FIX-FeatureLimits-IDs.sql**
   - 機能ID統一修正

2. **2025-10-23-ADD-MissingOrderAndCustomerColumns.sql**
   - Orders/Customersテーブルに不足カラム追加

3. **2025-10-26-AddAuthenticationTables.sql**
   - 認証テーブル追加（DemoSessions, AuthenticationLogs）

## 実行方法

### 方法1: Azure Portal クエリエディター（推奨）

1. **Azure Portal にログイン**
2. **SQL Database を開く**: `ec-ranger-db-prod`
3. **左メニュー「クエリエディター」を選択**
4. **ログイン**:
   - ユーザー名: `sqladmin`
   - パスワード: [設定したパスワード]

5. **スクリプト実行順序**:

#### Step 1: データベース確認
```sql
-- 現在のデータベースを確認
SELECT DB_NAME() AS CurrentDatabase;

-- 既存テーブルを確認
SELECT name FROM sys.tables ORDER BY name;
```

#### Step 2: マスタースクリプト実行
1. `2025-09-04-MASTER-CreateDatabaseFromScratch.sql` を開く
2. 19行目の `USE [YourDatabaseName]` を `USE [ec-ranger-db-prod]` に変更
3. セクションごとに実行（エラーがないことを確認）

#### Step 3: 追加マイグレーション実行
1. `2025-10-20-FIX-FeatureLimits-IDs.sql`
2. `2025-10-23-ADD-MissingOrderAndCustomerColumns.sql`
3. `2025-10-26-AddAuthenticationTables.sql`

### 方法2: SQL Server Management Studio (SSMS)

1. **SSMS で接続**:
   - サーバー: `ec-ranger-sql-prod.database.windows.net`
   - 認証: SQL Server認証
   - ユーザー: `sqladmin`
   - パスワード: [設定したパスワード]

2. **データベース選択**: `ec-ranger-db-prod`

3. **スクリプト実行**（同じ順序）

### 方法3: PowerShell から sqlcmd

```powershell
# sqlcmd をインストール（未インストールの場合）
winget install Microsoft.SQLServerCommandLineUtilities

# スクリプト実行
sqlcmd -S ec-ranger-sql-prod.database.windows.net `
       -d ec-ranger-db-prod `
       -U sqladmin `
       -P [パスワード] `
       -i "docs/05-development/03-データベース/マイグレーション/2025-09-04-MASTER-CreateDatabaseFromScratch.sql"
```

## 開発環境から最新DDL取得（確認用）

### SSMS で開発環境に接続
1. サーバー: `shopify-test-server.database.windows.net`
2. データベース: `shopify-test-db`
3. 「タスク」→「スクリプトの生成」
4. すべてのテーブル、インデックス、ストアドプロシージャを選択
5. スクリプトをファイルに保存

## 実行後の確認

### テーブル数の確認
```sql
SELECT COUNT(*) AS TableCount FROM sys.tables;
-- 期待値: 約20-25テーブル
```

### 主要テーブルの確認
```sql
SELECT name FROM sys.tables 
WHERE name IN ('Stores', 'Customers', 'Orders', 'Products', 'OrderItems', 'DemoSessions', 'AuthenticationLogs')
ORDER BY name;
```

### インデックスの確認
```sql
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.type > 0
ORDER BY t.name, i.name;
```

## トラブルシューティング

### エラー: "Table already exists"
- 既にテーブルが存在する場合はスキップされるので問題なし

### エラー: "Permission denied"
- ユーザー権限を確認
- ファイアウォール設定を確認

### エラー: "Connection timeout"
- IPアドレスがファイアウォールで許可されているか確認
- Azure Portal → SQL Server → ファイアウォール設定

## 注意事項

1. **バックアップ**: 本番環境では実行前にバックアップを取ることを推奨
2. **トランザクション**: 大きなスクリプトは部分的に実行し、各セクションを確認
3. **マイグレーション記録**: 実行後は `database-migration-tracking.md` を更新

---
作成者: 福田＋AI Assistant
