# 手動同期とHangFire定期同期ジョブの違いと問題点

**作成日**: 2026-01-03  
**目的**: 手動同期とHangFire定期同期ジョブの違いを整理し、設定前のジョブ登録問題を特定

---

## 📋 概要

### 1. 手動同期（Manual Sync）

**エンドポイント**:
- `POST /api/sync/initial` - 初期同期開始
- `POST /api/sync/trigger` - 手動同期開始

**特徴**:
- ユーザーがボタンをクリックしたときに実行される
- `Enqueue()` で即座に実行されるワンタイムジョブ
- 実行後は自動的に削除される
- 初期設定完了前でも実行可能

**実装場所**:
- `SyncController.StartInitialSync()` - 初期同期
- `SyncController.TriggerSync()` - 手動同期

**実行フロー**:
```
ユーザーがボタンをクリック
  ↓
SyncController がリクエストを受信
  ↓
SyncStatus レコードを作成（status: "pending"）
  ↓
HangFire に Enqueue() でジョブを登録（即座に実行）
  ↓
ShopifyDataSyncService.StartInitialSync() が実行される
  ↓
初期同期完了後、InitialSetupCompleted = true に設定
```

---

### 2. HangFire定期同期ジョブ（Recurring Sync Jobs）

**登録タイミング**:
- アプリケーション起動時（`Program.cs` Line 500-514）

**特徴**:
- `RecurringJob.AddOrUpdate()` で登録される定期実行ジョブ
- 設定されたスケジュール（例: 6時間ごと）で自動実行される
- アプリケーションが起動している限り継続的に実行される
- 各ストアごとに個別のジョブIDで登録される

**実装場所**:
- `Program.cs` Line 500-514 - アプリ起動時の登録
- `ShopifyProductSyncJob.RegisterRecurringJobs()` - 商品同期ジョブ登録
- `ShopifyCustomerSyncJob.RegisterRecurringJobs()` - 顧客同期ジョブ登録
- `ShopifyOrderSyncJob.RegisterRecurringJobs()` - 注文同期ジョブ登録

**実行フロー**:
```
アプリケーション起動
  ↓
Program.cs で RegisterRecurringJobs() を呼び出し
  ↓
各ジョブクラスの RegisterRecurringJobs() が実行される
  ↓
データベースから全ストアを取得
  ↓
各ストアごとに RecurringJob.AddOrUpdate() でジョブを登録
  ↓
設定されたスケジュール（例: 6時間ごと）で自動実行
```

---

## 🔍 現在の実装確認

### Program.cs での登録処理

```csharp
// Line 500-514
// データ同期の定期ジョブを自動登録
try
{
    using (var scope = app.Services.CreateScope())
    {
        ShopifyProductSyncJob.RegisterRecurringJobs(scope.ServiceProvider);
        ShopifyCustomerSyncJob.RegisterRecurringJobs(scope.ServiceProvider);
        ShopifyOrderSyncJob.RegisterRecurringJobs(scope.ServiceProvider);
        Log.Information("All recurring sync jobs registered successfully");
    }
}
catch (Exception ex)
{
    Log.Error(ex, "Failed to register recurring sync jobs");
}
```

**問題点**: `InitialSetupCompleted` フラグをチェックせずに全ストアのジョブを登録している可能性がある

---

### RegisterRecurringJobs() メソッドの実装確認が必要

各ジョブクラスの `RegisterRecurringJobs()` メソッドで以下を確認する必要があります：

1. **ストアのフィルタリング**:
   - `InitialSetupCompleted = true` のストアのみを対象にしているか
   - `IsActive = true` のストアのみを対象にしているか
   - `AccessToken` が存在するストアのみを対象にしているか

2. **ジョブIDの命名規則**:
   - ストアごとに一意のジョブIDが設定されているか
   - 例: `sync-products-store-{storeId}`

3. **スケジュール設定**:
   - どのようなスケジュール（例: 6時間ごと）で実行されるか

---

## ⚠️ 想定される問題

### 問題1: 初期設定前のストアにも定期ジョブが登録される

**症状**:
- アプリケーション起動時に、`InitialSetupCompleted = false` のストアにも定期ジョブが登録される
- 初期設定が完了していないストアで定期同期が実行されようとする
- エラーが発生する可能性がある

**影響範囲**:
- 新規インストールされたストア
- 初期設定が完了していないストア

**確認方法**:
```sql
-- 初期設定が完了していないストアを確認
SELECT Id, Domain, Name, InitialSetupCompleted, IsActive, 
       CASE WHEN AccessToken IS NOT NULL AND LEN(AccessToken) > 0 THEN 'あり' ELSE 'なし' END as HasAccessToken
FROM Stores
WHERE InitialSetupCompleted = 0 OR InitialSetupCompleted IS NULL;
```

---

### 問題2: 初期設定完了後に定期ジョブが登録されない

**症状**:
- 初期設定完了後（`InitialSetupCompleted = true`）でも、定期ジョブが登録されない
- 手動同期のみが実行され、定期同期が実行されない

**原因**:
- `RegisterRecurringJobs()` がアプリ起動時のみ実行される
- 初期設定完了時に定期ジョブを登録する処理がない

**影響範囲**:
- 初期設定を完了したストア

**確認方法**:
```sql
-- 初期設定が完了しているが、定期ジョブが登録されていない可能性があるストア
SELECT Id, Domain, Name, InitialSetupCompleted, LastSyncDate
FROM Stores
WHERE InitialSetupCompleted = 1
  AND LastSyncDate IS NOT NULL
  AND LastSyncDate < DATEADD(HOUR, -6, GETUTCDATE());
```

---

## 🔧 修正方針

### 方針1: RegisterRecurringJobs() で InitialSetupCompleted をチェック

**修正内容**:
- `RegisterRecurringJobs()` メソッド内で、`InitialSetupCompleted = true` のストアのみを対象にする
- `IsActive = true` のストアのみを対象にする
- `AccessToken` が存在するストアのみを対象にする

**修正例**:
```csharp
public static void RegisterRecurringJobs(IServiceProvider serviceProvider)
{
    using var scope = serviceProvider.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<ShopifyProductSyncJob>>();
    
    // ✅ 初期設定完了済みのストアのみを対象
    var stores = context.Stores
        .Where(s => s.IsActive == true 
                 && s.InitialSetupCompleted == true 
                 && !string.IsNullOrEmpty(s.AccessToken))
        .ToList();
    
    foreach (var store in stores)
    {
        var jobId = $"sync-products-store-{store.Id}";
        RecurringJob.AddOrUpdate<ShopifyProductSyncJob>(
            jobId,
            job => job.SyncProducts(store.Id, null),
            "0 */6 * * *"); // 6時間ごと
        
        logger.LogInformation("Recurring job registered: {JobId} for store {StoreId}", jobId, store.Id);
    }
}
```

---

### 方針2: 初期設定完了時に定期ジョブを登録

**修正内容**:
- `ShopifyDataSyncService.StartInitialSync()` で初期同期完了後、定期ジョブを登録する
- または、`InitialSetupCompleted = true` に設定した後に、定期ジョブを登録する

**修正例**:
```csharp
// ShopifyDataSyncService.StartInitialSync() の完了処理
store.InitialSetupCompleted = true;
store.LastSyncDate = DateTime.UtcNow;
store.UpdatedAt = DateTime.UtcNow;
await _context.SaveChangesAsync();

// ✅ 初期設定完了後、定期ジョブを登録
using (var scope = _serviceProvider.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    
    // 商品同期ジョブ
    recurringJobManager.AddOrUpdate<ShopifyProductSyncJob>(
        $"sync-products-store-{store.Id}",
        job => job.SyncProducts(store.Id, null),
        "0 */6 * * *");
    
    // 顧客同期ジョブ
    recurringJobManager.AddOrUpdate<ShopifyCustomerSyncJob>(
        $"sync-customers-store-{store.Id}",
        job => job.SyncCustomers(store.Id, null),
        "0 */6 * * *");
    
    // 注文同期ジョブ
    recurringJobManager.AddOrUpdate<ShopifyOrderSyncJob>(
        $"sync-orders-store-{store.Id}",
        job => job.SyncOrders(store.Id, null),
        "0 */6 * * *");
}
```

---

## 📊 比較表

| 項目 | 手動同期 | HangFire定期同期ジョブ |
|------|---------|----------------------|
| **実行タイミング** | ユーザーがボタンをクリックしたとき | 設定されたスケジュール（例: 6時間ごと） |
| **登録方法** | `Enqueue()` | `RecurringJob.AddOrUpdate()` |
| **実行回数** | 1回のみ | 継続的に実行される |
| **ジョブの削除** | 実行後自動削除 | 明示的に削除するまで残る |
| **初期設定前の実行** | 可能（初期同期として） | ❌ 不可（問題の原因） |
| **初期設定後の実行** | 可能（手動同期として） | ✅ 可能（定期同期として） |
| **対象ストア** | 現在のストアのみ | 全ストア（条件付き） |
| **ジョブID** | 自動生成 | `sync-{type}-store-{storeId}` |

---

## 🧪 確認手順

### Step 1: RegisterRecurringJobs() の実装を確認

各ジョブクラスの `RegisterRecurringJobs()` メソッドを確認：

```bash
# ファイルを確認
backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs
backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs
backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs
```

**確認ポイント**:
- [ ] `InitialSetupCompleted = true` のストアのみを対象にしているか
- [ ] `IsActive = true` のストアのみを対象にしているか
- [ ] `AccessToken` が存在するストアのみを対象にしているか

---

### Step 2: HangFireダッシュボードで登録済みジョブを確認

**URL**: `https://{backend-url}/hangfire`

**確認ポイント**:
- [ ] 初期設定が完了していないストアのジョブが登録されていないか
- [ ] 初期設定が完了しているストアのジョブが登録されているか
- [ ] ジョブIDが正しく設定されているか（例: `sync-products-store-{storeId}`）

---

### Step 3: データベースでストアの状態を確認

```sql
-- 初期設定が完了していないストア
SELECT Id, Domain, Name, InitialSetupCompleted, IsActive, 
       CASE WHEN AccessToken IS NOT NULL AND LEN(AccessToken) > 0 THEN 'あり' ELSE 'なし' END as HasAccessToken
FROM Stores
WHERE InitialSetupCompleted = 0 OR InitialSetupCompleted IS NULL;

-- 初期設定が完了しているストア
SELECT Id, Domain, Name, InitialSetupCompleted, IsActive, LastSyncDate,
       CASE WHEN AccessToken IS NOT NULL AND LEN(AccessToken) > 0 THEN 'あり' ELSE 'なし' END as HasAccessToken
FROM Stores
WHERE InitialSetupCompleted = 1;
```

---

## 📝 修正チェックリスト

- [ ] `ShopifyProductSyncJob.RegisterRecurringJobs()` で `InitialSetupCompleted` をチェック
- [ ] `ShopifyCustomerSyncJob.RegisterRecurringJobs()` で `InitialSetupCompleted` をチェック
- [ ] `ShopifyOrderSyncJob.RegisterRecurringJobs()` で `InitialSetupCompleted` をチェック
- [ ] 初期設定完了時に定期ジョブを登録する処理を追加（オプション）
- [ ] テスト: 初期設定前のストアにジョブが登録されないことを確認
- [ ] テスト: 初期設定完了後にジョブが登録されることを確認
- [ ] ドキュメント更新

---

## 🔗 関連ファイル

- `backend/ShopifyAnalyticsApi/Program.cs` - アプリ起動時のジョブ登録
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyProductSyncJob.cs` - 商品同期ジョブ
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyCustomerSyncJob.cs` - 顧客同期ジョブ
- `backend/ShopifyAnalyticsApi/Jobs/ShopifyOrderSyncJob.cs` - 注文同期ジョブ
- `backend/ShopifyAnalyticsApi/Controllers/SyncController.cs` - 手動同期エンドポイント
- `backend/ShopifyAnalyticsApi/Services/ShopifyDataSyncService.cs` - 同期サービス

---

**更新履歴**:
- 2026-01-03: 初版作成
