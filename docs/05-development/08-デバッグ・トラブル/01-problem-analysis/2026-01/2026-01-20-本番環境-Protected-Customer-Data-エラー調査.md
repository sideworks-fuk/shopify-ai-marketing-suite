# 本番環境 Protected Customer Data エラー調査

## エラー概要

**発生環境**: Production  
**StoreId**: 18  
**エラー内容**: Protected Customer Data へのアクセスが承認されていない

## エラーログ詳細

### SyncStatuses (ID: 22)
- **Status**: `completed` (部分的な成功)
- **エラーメッセージ**:
  - 顧客データ同期がスキップされました: Protected Customer Data未承認
  - 注文データ同期がスキップされました: Protected Customer Data未承認

### SyncStates
- **ID 470 (Customers)**: `Failed` - `Failed to fetch customers: Forbidden`
- **ID 471 (Products)**: `Completed` - 正常完了
- **ID 472 (Orders)**: `Failed` - `Failed to fetch orders: Protected customer data. Forbidden`

## 原因

Shopifyの **Protected Customer Data** へのアクセスが承認されていないため、顧客データと注文データ（顧客情報を含む）の取得が拒否されています。

## 調査手順

### 1. ストア情報の確認

```sql
-- StoreId 18 のストア情報を確認
SELECT 
    Id,
    Name,
    Domain,
    ShopifyAppId,
    InitialSetupCompleted,
    LastSyncDate,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM Stores
WHERE Id = 18;

-- 関連するShopifyApps情報を確認
SELECT 
    s.Id AS StoreId,
    s.Name AS StoreName,
    s.Domain,
    s.ShopifyAppId,
    sa.Id AS ShopifyAppId_Detail,
    sa.Name AS AppName,
    sa.ApiKey,
    sa.RedirectUri,
    sa.AppUrl,
    sa.UpdatedAt AS AppUpdatedAt
FROM Stores s
LEFT JOIN ShopifyApps sa ON s.ShopifyAppId = sa.Id
WHERE s.Id = 18;
```

### 2. Shopify Partners管理画面での確認

**確認手順**:
1. https://partners.shopify.com/ にログイン
2. **Apps** → **EC Ranger** を選択
3. **App setup** → **Protected customer data** を確認
4. 承認状況を確認：
   - ✅ **Approved**: 承認済み
   - ❌ **Pending**: 承認待ち
   - ❌ **Not requested**: 未申請

**確認項目**:
- Protected Customer Data へのアクセスが承認されているか
- 承認されている場合、承認日時はいつか
- 申請日時はいつか

### 3. エラーログの詳細確認

本番環境のApplication Insightsまたはログファイルで以下を確認：

**確認キーワード**:
- `Failed to fetch customers: Forbidden`
- `Failed to fetch orders: Protected customer data`
- `StoreId=18`
- `Protected customer data`

**Application Insights Kusto クエリ例**:
```kusto
traces
| where message contains "Protected customer data"
    or message contains "Failed to fetch customers"
    or message contains "Failed to fetch orders"
| where customDimensions.StoreId == "18"
| order by timestamp desc
| project timestamp, message, customDimensions
```

### 4. 同期範囲の確認

```sql
-- StoreId 18 の同期範囲設定を確認
SELECT 
    Id,
    StoreId,
    DataType,
    StartDate,
    EndDate,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM SyncRangeSettings
WHERE StoreId = 18;

-- SyncStates の詳細を確認
SELECT 
    Id,
    StoreId,
    DataType,
    Status,
    StartDate,
    EndDate,
    ProcessedRecords,
    TotalRecords,
    ErrorMessage,
    ProgressPercentage,
    CreatedAt,
    UpdatedAt
FROM SyncStates
WHERE StoreId = 18
ORDER BY StartDate DESC;
```

## 対応方法

### 方法1: Protected Customer Data へのアクセス申請（推奨）

**申請手順**:
1. Shopify Partners管理画面にアクセス
2. **Apps** → **EC Ranger** → **App setup** → **Protected customer data**
3. **Request access** ボタンをクリック
4. アクセスの目的を説明
5. 承認を待つ（通常1-3営業日）

**申請理由の例**:
```
顧客データ分析機能を提供するために、顧客情報へのアクセスが必要です。
以下の機能で使用します：
- 顧客分析・レポート機能
- 注文データと顧客データの関連付け
- 休眠顧客分析機能
```

### 方法2: 一時的な回避策（承認待ち中）

Protected Customer Data へのアクセスが承認されるまでの間、以下の対応が可能：

1. **顧客データ同期をスキップ**
   - `/sync/initial` に `SkipCustomers: true` を指定
   - または、`ShopifyDataSyncService` が自動的にスキップ（現在の実装）

2. **注文データ同期の問題**
   - 注文データにも顧客情報が含まれるため、Protected Customer Data の承認が必要
   - 承認待ち中は注文データ同期も失敗する

3. **商品データのみ同期**
   - 商品データは Protected Customer Data ではないため、正常に同期可能
   - 確認済み: `SyncStates ID 471 (Products)` は `Completed`

### 方法3: 承認状況の確認SQL

```sql
-- StoreId 18 に関連するすべての同期ステータスを確認
SELECT 
    ss.Id,
    ss.StoreId,
    ss.SyncType,
    ss.EntityType,
    ss.Status,
    ss.StartDate,
    ss.EndDate,
    ss.ErrorMessage,
    ss.ProcessedRecords,
    ss.TotalRecords,
    ss.CurrentTask,
    ss.UpdatedAt,
    s.Name AS StoreName,
    s.Domain
FROM SyncStatuses ss
INNER JOIN Stores s ON ss.StoreId = s.Id
WHERE ss.StoreId = 18
ORDER BY ss.StartDate DESC;

-- 最新の同期ステータス（各データタイプ）
SELECT 
    DataType,
    Status,
    StartDate,
    EndDate,
    ErrorMessage,
    DATEDIFF(MINUTE, StartDate, EndDate) AS DurationMinutes
FROM (
    SELECT 
        DataType,
        Status,
        StartDate,
        EndDate,
        ErrorMessage,
        ROW_NUMBER() OVER (PARTITION BY DataType ORDER BY StartDate DESC) AS rn
    FROM SyncStates
    WHERE StoreId = 18
) AS Latest
WHERE rn = 1
ORDER BY DataType;
```

## 期待される結果

### Protected Customer Data 承認後

- ✅ 顧客データ同期: 正常完了
- ✅ 注文データ同期: 正常完了
- ✅ 商品データ同期: 正常完了（既に正常動作中）

### 現在の状態（承認待ち中）

- ❌ 顧客データ同期: 失敗（スキップ）
- ❌ 注文データ同期: 失敗（Protected Customer Data未承認）
- ✅ 商品データ同期: 正常完了

## 次のステップ

1. ✅ **StoreId 18 のストア情報を確認**（上記SQL実行）
2. ✅ **Shopify Partners管理画面で承認状況を確認**
3. ⏳ **Protected Customer Data へのアクセス申請**（未承認の場合）
4. ⏳ **承認後に再同期を実行** (`/sync/initial` または `/sync/trigger`)

## 参考リンク

- [Shopify Protected Customer Data Documentation](https://shopify.dev/docs/apps/launch/protected-customer-data)
- [Shopify Partners Dashboard](https://partners.shopify.com/)
- Application Insights: https://portal.azure.com/

## 関連ドキュメント

- `docs/05-development/08-デバッグ・トラブル/01-problem-analysis/2026-01/2026-01-19-データ同期失敗-Protected-Customer-Dataエラー.md`
- `docs/05-development/08-デバッグ・トラブル/01-problem-analysis/2026-01/2026-01-19-データ同期-注文データForbiddenエラー対応.md`

---
作成日: 2026-01-20
作成者: AI Assistant
