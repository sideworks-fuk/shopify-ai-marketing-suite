# 本番環境データベース設定手順（2025-12-22 最新DDL使用）

## 開発環境から取得した最新DDL

**ファイル**: `docs/05-development/03-データベース/マイグレーション/2025-12-22-database_all.sql`
- **取得日時**: 2025-12-22 13:23:31
- **テーブル数**: 約30テーブル（HangFireスキーマ含む）
- **サイズ**: 1,905行

## 📋 実行前チェックリスト

- [ ] Azure Portal にログイン済み
- [ ] SQL Database (ec-ranger-db-prod) にアクセス可能
- [ ] SQL認証情報を準備（sqladmin / パスワード）

## 🔧 実行手順

### 方法1: Azure Portal クエリエディター（推奨）

#### Step 1: Azure Portal にログイン
1. **Azure Portal**: https://portal.azure.com
2. **リソースグループ**: shopify-ai-marketing-suite
3. **SQL Database**: `ec-ranger-db-prod` を選択

#### Step 2: クエリエディターを開く
1. 左メニュー「**クエリエディター（プレビュー）**」をクリック
2. **認証**:
   - 認証タイプ: SQL認証
   - ログイン: `sqladmin`
   - パスワード: [設定したパスワード]
3. 「OK」をクリックして接続

#### Step 3: データベース名を変更
1. スクリプトの **2行目** を確認:
```sql
CREATE DATABASE [shopify-test-db]  -- この行は削除またはコメントアウト
```

2. **19行目** を変更:
```sql
-- 変更前
USE [YourDatabaseName]

-- 変更後（不要なので削除またはコメントアウト）
-- USE [ec-ranger-db-prod]  
```

3. **1903行目** も同様に変更:
```sql
-- 変更前
ALTER DATABASE [shopify-test-db] SET  READ_WRITE

-- 変更後
ALTER DATABASE [ec-ranger-db-prod] SET  READ_WRITE
```

#### Step 4: HangFireスキーマの確認
```sql
-- HangFireスキーマが必要か確認
-- 必要ない場合は728行目以降のHangFireテーブル作成部分をスキップ
```

#### Step 5: スクリプト実行

**重要**: 大きなスクリプトなので、セクションごとに実行することを推奨

1. **既存オブジェクトの確認**:
```sql
-- 既存のテーブルを確認
SELECT TABLE_SCHEMA, TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME;
```

2. **メインテーブル作成（53-727行）**:
   - EFMigrationsHistory
   - AuthenticationLogs
   - Customers
   - Orders
   - Products
   - Stores
   - その他のビジネステーブル

3. **HangFireテーブル作成（728-910行）**:
   - バックグラウンドジョブ用（必要な場合のみ）

4. **インデックス作成（911-1433行）**:
   - パフォーマンス最適化用

5. **デフォルト制約（1434-1588行）**:
   - カラムのデフォルト値設定

6. **外部キー制約（1589-1697行）**:
   - テーブル間の関係性定義

7. **ストアドプロシージャ（1698-1902行）**:
   - sp_GetCurrentFeatureSelection
   - sp_GetFeatureSelectionStatus
   - sp_UpdateFeatureSelection

### 方法2: SQL Server Management Studio (SSMS)

1. **SSMS で接続**:
```
サーバー: ec-ranger-sql-prod.database.windows.net
認証: SQL Server認証
ユーザー: sqladmin
パスワード: [設定したパスワード]
データベース: ec-ranger-db-prod
```

2. **スクリプトファイルを開く**:
   - ファイル → 開く → `2025-12-22-database_all.sql`

3. **データベース名を変更**（上記と同様）

4. **実行**:
   - F5 キーまたは「実行」ボタン

### 方法3: Azure Data Studio

1. **接続を追加**
2. **新しいクエリ**を開く
3. **スクリプトを貼り付け**
4. **実行**

## ✅ 実行後の確認

### テーブル数の確認
```sql
SELECT COUNT(*) AS TableCount 
FROM sys.tables
WHERE schema_id = SCHEMA_ID('dbo');
-- 期待値: 約25-28テーブル

-- HangFireスキーマも含める場合
SELECT 
    s.name AS SchemaName,
    COUNT(*) AS TableCount
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
GROUP BY s.name;
```

### 主要テーブルの確認
```sql
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    p.rows AS RowCount
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0,1)
  AND t.name IN ('Stores', 'Customers', 'Orders', 'Products', 
                 'OrderItems', 'DemoSessions', 'AuthenticationLogs')
ORDER BY s.name, t.name;
```

### ストアドプロシージャの確認
```sql
SELECT 
    name AS ProcedureName,
    create_date,
    modify_date
FROM sys.procedures
WHERE schema_id = SCHEMA_ID('dbo')
ORDER BY name;
-- 期待値: 3つのストアドプロシージャ
```

### インデックスの確認
```sql
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.type > 0
  AND t.schema_id = SCHEMA_ID('dbo')
ORDER BY t.name, i.index_id;
```

## ⚠️ 注意事項

1. **データベース名の変更を忘れずに**
   - `shopify-test-db` → `ec-ranger-db-prod`

2. **HangFireスキーマ**
   - バックグラウンドジョブを使用しない場合は省略可能

3. **Orders_Backup_20251218 テーブル**
   - バックアップテーブルなので本番では不要（469-492行）
   - 実行前に削除推奨

4. **TestTable**
   - テストテーブルなので本番では不要（669-683行）
   - 実行前に削除推奨

5. **デフォルトテナント**
   - スクリプト内でdefault-tenantが自動作成される（82-86行）

## 🔥 トラブルシューティング

### エラー: "Table already exists"
- テーブルが既に存在する場合はスキップされる
- 完全にクリーンな状態から始める場合は、既存オブジェクトを削除

### エラー: "Login failed"
- SQL認証が有効か確認
- ファイアウォールルールを確認
- パスワードをリセット

### エラー: "Timeout"
- セクションごとに分割して実行
- クエリタイムアウトを延長

## 📝 実行後のタスク

1. **マイグレーション記録の更新**
   - `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md` を更新

2. **接続テスト**
   - バックエンドアプリケーションから接続確認

3. **初期データ投入**（必要に応じて）
   - マスターデータの投入
   - テストデータの作成

---
作成日: 2025-12-22
作成者: 福田＋AI Assistant
