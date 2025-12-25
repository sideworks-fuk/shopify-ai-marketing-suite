# 初期同期エラー: SyncCheckpointsテーブル不足とShopify権限エラー

## 問題の概要

### 発生状況
- **日時**: 2025-12-25
- **環境**: 本番環境（Production）
- **症状**: 初期同期実行時、以下の2つのエラーが発生

### エラー1: SyncCheckpointsテーブルが存在しない

```
Invalid object name 'SyncCheckpoints'.
```

### エラー2: Shopify API権限エラー

```
Failed to fetch customers: Forbidden
Error content: {"errors":"[API] This action requires merchant approval for read_customers scope."}
```

## 原因分析

### 1. SyncCheckpointsテーブルが存在しない

**エンティティモデル** (`SyncCheckpoint`) には以下のプロパティが定義されている：
- `CheckpointId`, `StoreId`, `DataType`, `LastSuccessfulCursor`, `LastProcessedDate`, `RecordsProcessedSoFar`, `SyncStartDate`, `SyncEndDate`, `CanResume`, `ExpiresAt`, `CreatedAt`, `UpdatedAt`

**EF Coreマイグレーション** (`20251222151634_AddShopifyAppsTable.cs`) では、このテーブルが含まれている（473-500行目）

**しかし、本番環境のデータベース**には、このテーブルが存在しない。

### 2. Shopify API権限エラー

**エラーメッセージ**: `[API] This action requires merchant approval for read_customers scope.`

**原因**:
- ShopifyアプリのOAuth認証時に、`read_customers` scopeが承認されていない
- または、Shopify Partners Dashboardでアプリのスコープ設定に`read_customers`が含まれていない

**現在の設定**:
- `appsettings.Production.json`: `"Scopes": "read_orders,read_products,read_customers"`
- OAuth認証時に`read_customers` scopeを要求しているが、ストアオーナーが承認していない可能性がある

## 解決策

### 1. SyncCheckpointsテーブルの作成

**マイグレーションスクリプト**: `2025-12-25-FIX-CreateSyncManagementTables.sql` を更新済み

このスクリプトを実行することで、`SyncCheckpoints`テーブルが作成されます。

**適用手順**:
1. 本番環境のデータベースバックアップを取得
2. `2025-12-25-FIX-CreateSyncManagementTables.sql` を実行（`SyncCheckpoints`テーブル作成処理が追加済み）
3. マイグレーション追跡ドキュメントを更新

**確認クエリ**（適用後）:
```sql
SELECT 
    TABLE_NAME,
    COUNT(*) AS COLUMN_COUNT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SyncCheckpoints'
GROUP BY TABLE_NAME;
```

### 2. Shopify API権限エラーの対応

#### 方法1: アプリを再インストール（推奨）

**手順**:
1. Shopify Adminでアプリをアンインストール
2. アプリを再インストール
3. OAuth認証時に、`read_customers` scopeを含むすべてのスコープを承認

**注意**: アンインストールすると、既存のデータが削除される可能性があります。

#### 方法2: Shopify Partners Dashboardでスコープを確認

**確認項目**:
1. Shopify Partners Dashboardにログイン
2. 該当するアプリ（`EC Ranger-demo` または `EC Ranger-xn-fbkq6e5da0fpb`）を選択
3. **「App setup」** → **「Client credentials」** を確認
4. **「Scopes」** セクションで、`read_customers` が含まれているか確認

**必要なスコープ**:
- `read_orders`
- `read_products`
- `read_customers`

#### 方法3: ストアオーナーに権限承認を依頼

**手順**:
1. Shopify Adminにログイン
2. **「設定」** → **「アプリと販売チャネル」** → **「開発用アプリ」**
3. 該当するアプリを選択
4. **「権限」** セクションで、`read_customers` が承認されているか確認
5. 承認されていない場合は、**「権限を更新」** をクリックして承認

## 確認事項

### 1. SyncCheckpointsテーブルの確認

```sql
-- SyncCheckpointsテーブルの存在確認
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SyncCheckpoints'
ORDER BY ORDINAL_POSITION;
```

### 2. Shopify OAuthスコープの確認

**データベースで確認**:
```sql
-- StoresテーブルでAccessTokenが設定されているか確認
SELECT 
    Id,
    Name,
    ShopDomain,
    AccessToken,
    Scopes,
    CreatedAt,
    UpdatedAt
FROM Stores
WHERE Id = 5;  -- 該当するStoreId
```

**ShopifyAppsテーブルで確認**:
```sql
-- ShopifyAppsテーブルでスコープ設定を確認
SELECT 
    Id,
    Name,
    DisplayName,
    ApiKey,
    Scopes,
    IsActive
FROM ShopifyApps
WHERE IsActive = 1;
```

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Models/SyncManagementModels.cs` - SyncCheckpointエンティティ定義
- `backend/ShopifyAnalyticsApi/Migrations/20251222151634_AddShopifyAppsTable.cs` - EF Coreマイグレーション
- `backend/ShopifyAnalyticsApi/Services/Sync/CheckpointManager.cs` - チェックポイント管理サービス
- `backend/ShopifyAnalyticsApi/Controllers/ShopifyAuthController.cs` - OAuth認証コントローラー
- `docs/05-development/03-データベース/マイグレーション/2025-12-25-FIX-CreateSyncManagementTables.sql` - マイグレーションスクリプト

## 更新履歴

- 2025-12-25: 初版作成（福田 + AI Assistant）
