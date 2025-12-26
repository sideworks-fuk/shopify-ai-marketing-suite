# Hangfireジョブ登録条件調査

**調査日**: 2025-12-25  
**目的**: 一部のストアの同期を停止するための登録条件の確認

## 調査結果

### 現在の登録条件

Hangfireジョブの登録は、アプリケーション起動時（`Program.cs`）に以下のメソッドで行われます：

```csharp
ShopifyProductSyncJob.RegisterRecurringJobs(scope.ServiceProvider);
ShopifyCustomerSyncJob.RegisterRecurringJobs(scope.ServiceProvider);
ShopifyOrderSyncJob.RegisterRecurringJobs(scope.ServiceProvider);
```

### 登録条件の詳細

#### 1. ストア単位の同期ジョブ

各`RegisterRecurringJobs`メソッドでは、以下の条件でジョブが登録されます：

**条件**: `Stores`テーブルの`IsActive = true`のストアのみ

**実装箇所**:
- `ShopifyCustomerSyncJob.RegisterRecurringJobs()` (line 375-377)
- `ShopifyOrderSyncJob.RegisterRecurringJobs()` (line 471-473)
- `ShopifyProductSyncJob.RegisterRecurringJobs()` (line 478-480)

**コード例**:
```csharp
var activeStores = context.Stores
    .Where(s => s.IsActive)
    .ToList();

foreach (var store in activeStores)
{
    RecurringJob.AddOrUpdate<ShopifyCustomerSyncJob>(
        $"sync-customers-store-{store.Id}",
        job => job.SyncCustomers(store.Id, null),
        "0 */2 * * *"); // 2時間ごと
}
```

**登録されるジョブ**:
- `sync-customers-store-{storeId}`: 2時間ごと（Customer）
- `sync-orders-store-{storeId}`: 3時間ごと（Order）
- `sync-products-store-{storeId}`: 1時間ごと（Product）

#### 2. 全ストア一括同期ジョブ

**条件**: なし（常に登録される）

**登録されるジョブ**:
- `sync-all-stores-customers-daily`: 1日1回（Customer）
- `sync-all-stores-orders-daily`: 1日1回（Order）
- `sync-all-stores-products-daily`: 1日1回（Product）

#### 3. GDPR処理ジョブ

**条件**: なし（常に登録される）

**登録されるジョブ**:
- `gdpr-process-pending`: 5分ごと

### Storeエンティティのフィールド

現在、`Store`エンティティには以下のフィールドがあります：

```csharp
public class Store
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? Domain { get; set; }
    public bool IsActive { get; set; } = true;  // ← 同期制御に使用
    public string? Settings { get; set; }  // JSON形式の追加設定
    // ... その他のフィールド
}
```

### 同期ジョブ実行時のチェック

各同期ジョブの実行時にも、`IsActive`チェックが行われます：

- `ShopifyCustomerSyncJob.SyncCustomers()` (line 63)
- `ShopifyOrderSyncJob.SyncOrders()` (line 63)
- `ShopifyProductSyncJob.SyncProducts()` (line 59)

**コード例**:
```csharp
if (!store.IsActive)
{
    _logger.LogInformation($"Store is not active: {store.Name}");
    return;
}
```

## 現在の同期停止方法

### 方法1: IsActive = false に設定（推奨）

**メリット**:
- 既存の機能で対応可能
- ストア全体を無効化できる

**デメリット**:
- 同期のみを停止したい場合には適さない（ストア自体が無効になる）

**実装方法**:
```sql
UPDATE Stores 
SET IsActive = 0 
WHERE Id = {storeId};
```

### 方法2: ジョブを手動で削除

Hangfire Dashboardから手動でジョブを削除できますが、アプリケーション再起動時に再登録されます。

## 今後の改善案

### 案1: IsSyncEnabled フィールドを追加

同期のみを制御するための専用フィールドを追加：

```csharp
public class Store
{
    // ... 既存のフィールド
    public bool IsSyncEnabled { get; set; } = true;  // 新規追加
}
```

**実装変更**:
- `RegisterRecurringJobs`メソッドの条件を`IsActive && IsSyncEnabled`に変更
- 各同期ジョブの実行時チェックも同様に変更

**メリット**:
- ストアは有効だが同期のみ停止できる
- より細かい制御が可能

**デメリット**:
- データベースマイグレーションが必要
- コード変更が必要

### 案2: Settings フィールド（JSON）を使用

既存の`Settings`フィールド（JSON）に同期設定を保存：

```json
{
  "sync": {
    "enabled": false,
    "customerSyncEnabled": true,
    "orderSyncEnabled": false,
    "productSyncEnabled": true
  }
}
```

**メリット**:
- マイグレーション不要
- より詳細な制御が可能（カテゴリごとに制御）

**デメリット**:
- JSONパースが必要
- コードが複雑になる

## 推奨対応

現時点では、**方法1（IsActive = false）**を使用して同期を停止することを推奨します。

より細かい制御が必要な場合は、**案1（IsSyncEnabledフィールドの追加）**を実装することを検討してください。

## 関連ファイル

- `backend/ShopifyAnalyticsApi/Program.cs` (line 490-492)
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs` (line 366-403)
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs` (line 462-499)
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs` (line 469-506)
- `backend/ShopifyAnalyticsApi/Models/DatabaseModels.cs` (line 9-82)
