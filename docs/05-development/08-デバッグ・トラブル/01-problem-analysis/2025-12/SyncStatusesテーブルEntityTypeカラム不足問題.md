# SyncStatusesテーブルEntityTypeカラム不足問題

## 問題の概要

### 発生状況
- **日時**: 2025-12-25
- **環境**: 本番環境（Production）
- **症状**: 初期同期（`/api/sync/initial`）実行時、`SyncStatuses`テーブルの`EntityType`カラムが存在しないエラーが発生

### エラーログ
```
[08:43:36 ERR] Failed executing DbCommand
SELECT TOP(1) [s].[Id], [s].[CreatedAt], [s].[CurrentTask], [s].[EndDate], [s].[EntityType], ...
FROM [SyncStatuses] AS [s]
WHERE [s].[StoreId] = @__ToString_0 AND [s].[Status] = N'running'

Microsoft.Data.SqlClient.SqlException (0x80131904): Invalid column name 'EntityType'.
```

## 原因分析

### 1. データベーススキーマの不整合

**エンティティモデル** (`SyncStatus`) には以下のプロパティが定義されている：
- `EntityType` (string?, MaxLength: 50) - 'Product', 'Customer', 'Order', 'All'

**EF Coreマイグレーション** (`20251222151634_AddShopifyAppsTable.cs`) では、このカラムが含まれている：
```csharp
EntityType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
```

**しかし、本番環境のデータベース**には、このカラムが存在しない。

### 2. マイグレーション適用状況

**古いマイグレーション** (`2025-08-05-AddInitialSetupFeature.sql`) では、`SyncStatuses`テーブルが作成されたが、`EntityType`カラムは含まれていない。

**最新のマイグレーション** (`20251222151634_AddShopifyAppsTable`) では、`EntityType`カラムが含まれているが、本番環境に適用されていない。

### 3. エラー発生フロー

1. **初期同期API** (`/api/sync/initial`) が呼び出される
2. `SyncController.StartInitialSync` が実行される
3. 既存の同期中ステータスをチェック（66-68行目）
4. **`SyncStatuses`テーブルからデータを取得しようとする**
5. **カラム不足によりSQLエラーが発生**

## 解決策

### 本番環境へのマイグレーション適用

**マイグレーションスクリプト**: `2025-12-25-FIX-AddEntityTypeToSyncStatuses.sql`

このスクリプトを本番環境に適用することで、`SyncStatuses`テーブルに不足している`EntityType`カラムが追加される。

**適用手順**:
1. 本番環境のデータベースバックアップを取得
2. `2025-12-25-FIX-AddEntityTypeToSyncStatuses.sql` を実行
3. マイグレーション追跡ドキュメントを更新

**確認クエリ**（適用後）:
```sql
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SyncStatuses'
    AND COLUMN_NAME = 'EntityType';
```

## 確認事項

### 1. 本番環境のデータベーススキーマ確認

以下のクエリで、`SyncStatuses`テーブルのカラムを確認：

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SyncStatuses'
ORDER BY ORDINAL_POSITION;
```

### 2. マイグレーション適用状況の確認

```sql
SELECT * FROM __EFMigrationsHistory
ORDER BY MigrationId DESC;
```

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Models/SyncStatus.cs` - エンティティモデル定義
- `backend/ShopifyAnalyticsApi/Migrations/20251222151634_AddShopifyAppsTable.cs` - EF Coreマイグレーション
- `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs` - コントローラー実装
- `docs/05-development/03-データベース/マイグレーション/2025-12-25-FIX-AddEntityTypeToSyncStatuses.sql` - マイグレーションスクリプト
- `docs/05-development/03-データベース/マイグレーション/database-migration-tracking.md` - マイグレーション追跡

## 関連する問題

### SyncRangeSettingsテーブルが存在しない問題

`EntityType`カラムを追加した後、`SyncRangeSettings`テーブルが存在しないというエラーが発生しました。

**対応**: `2025-12-25-FIX-CreateSyncManagementTables.sql` を適用してください。このスクリプトは、同期管理関連のすべてのテーブル（SyncRangeSettings, SyncProgressDetails, SyncStates, SyncHistories）を作成します。

## 更新履歴

- 2025-12-25: 初版作成（福田 + AI Assistant）
- 2025-12-25: SyncRangeSettingsテーブル不足問題への対応を追加
