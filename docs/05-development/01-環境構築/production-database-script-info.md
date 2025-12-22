# 本番環境用データベーススクリプト情報

## クリーンアップ済みスクリプト

**元ファイル**: `docs/05-development/03-データベース/マイグレーション/2025-12-22-database_all.sql`

### 実施した変更:
1. ✅ CREATE DATABASE文を削除（Azureで作成済み）
2. ✅ データベース名を`ec-ranger-db-prod`に変更
3. ✅ `Orders_Backup_20251218`テーブルを削除
4. ✅ `TestTable`テーブルを削除
5. ✅ `TestTable`のデフォルト制約を削除

### Azure Portal クエリエディターで実行する手順:

1. **Azure Portal にログイン**
   - https://portal.azure.com

2. **SQL Database を開く**
   - リソースグループ: shopify-ai-marketing-suite
   - データベース: ec-ranger-db-prod

3. **クエリエディターを開く**
   - 左メニュー「クエリエディター（プレビュー）」
   - ログイン: sqladmin / [パスワード]

4. **スクリプトを実行**
   - `2025-12-22-database_all.sql`の内容をコピー
   - セクションごとに実行することを推奨

### 実行セクション

#### セクション1: スキーマとベーステーブル（1-600行）
- HangFireスキーマ
- EFMigrationsHistory
- 認証系テーブル
- ビジネステーブル（Customers, Orders, Products等）

#### セクション2: HangFireテーブル（601-850行）
- バックグラウンドジョブ管理用
- 必要ない場合はスキップ可能

#### セクション3: インデックス（851-1350行）
- パフォーマンス最適化用
- 各テーブルのインデックス定義

#### セクション4: デフォルト制約（1351-1500行）
- 各カラムのデフォルト値設定

#### セクション5: 外部キー制約（1501-1600行）
- テーブル間のリレーション定義

#### セクション6: ストアドプロシージャ（1601-1817行）
- sp_GetCurrentFeatureSelection
- sp_GetFeatureSelectionStatus
- sp_UpdateFeatureSelection

### 実行後の確認SQL

```sql
-- テーブル数の確認
SELECT 
    s.name AS SchemaName,
    COUNT(*) AS TableCount
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
GROUP BY s.name
ORDER BY s.name;

-- 主要テーブルの確認
SELECT name FROM sys.tables 
WHERE name IN ('Stores', 'Customers', 'Orders', 'Products', 'OrderItems')
ORDER BY name;

-- ストアドプロシージャの確認
SELECT name FROM sys.procedures 
WHERE schema_id = SCHEMA_ID('dbo')
ORDER BY name;
```

---
作成日: 2025-12-22
作成者: 福田＋AI Assistant
