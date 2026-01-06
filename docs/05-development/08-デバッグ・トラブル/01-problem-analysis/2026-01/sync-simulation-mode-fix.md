# データ同期シミュレーションモード問題の修正

**作成日**: 2026-01-03  
**ステータス**: ✅ 修正完了

---

## 📋 問題の概要

### 症状
- 「データ同期が完了しました」と表示される
- しかし、実際にはデータが同期されていない
- ダッシュボードでデータが表示されない

### 根本原因

**`ShopifyDataSyncService.cs:111` のシミュレーションモード設定**

```csharp
var useSimulation = _configuration.GetValue<bool>("Shopify:UseSimulation", true);
                                                                           ^^^^
                                                               デフォルト値が true！
```

**問題点**:
1. `Shopify:UseSimulation` のデフォルト値が `true`
2. `appsettings.Staging.json` に `UseSimulation` が設定されていない
3. 設定ファイルに明示的に `false` が設定されていない限り、シミュレーションモードで動作
4. シミュレーションモードは進捗のみを更新し、**実際のデータは保存しない**

---

## 🔧 修正内容

### 修正1: `appsettings.Staging.json` に設定を追加 ✅

**ファイル**: `backend/ShopifyAnalyticsApi/appsettings.Staging.json`

**追加内容**:
```json
{
  "Shopify": {
    "UseSimulation": false,
    ...
  }
}
```

### 修正2: コードのデフォルト値を変更 ✅

**ファイル**: `backend/ShopifyAnalyticsApi/Services/ShopifyDataSyncService.cs`

**変更箇所**: Line 111

```csharp
// 変更前
var useSimulation = _configuration.GetValue<bool>("Shopify:UseSimulation", true);

// 変更後
var useSimulation = _configuration.GetValue<bool>("Shopify:UseSimulation", false);
```

**理由**:
- 本番環境では実際のデータ同期を実行するのがデフォルトであるべき
- シミュレーションモードは開発・テスト用の特別な機能として扱う

---

## 📊 シミュレーションモードの動作

### シミュレーションモード (`RunSimulatedSync`)

**動作**:
- 進捗のみを更新（`SyncStatus` テーブル）
- ランダムな数値を生成して進捗を表示
- **実際のデータは保存しない**（`Customers`, `Products`, `Orders` テーブルにデータが保存されない）

**コード**:
```csharp
private async Task RunSimulatedSync(Store store, SyncStatus syncStatus, DateTime? startDate)
{
    var random = new Random();
    
    // 顧客データ同期のシミュレーション
    syncStatus.CurrentTask = "顧客データ取得中（シミュレーション）";
    syncStatus.TotalRecords = random.Next(100, 500);
    // ← 実際のデータは保存されない
}
```

### 実際の同期モード (`RunInitialSyncWithJobs`)

**動作**:
- `_customerSyncJob.SyncCustomers()` を実行 → `Customers` テーブルにデータ保存
- `_productSyncJob.SyncProducts()` を実行 → `Products` テーブルにデータ保存
- `_orderSyncJob.SyncOrders()` を実行 → `Orders` テーブルにデータ保存

**コード**:
```csharp
// 実際のジョブクラスを使用して同期を実行
await _customerSyncJob.SyncCustomers(store.Id, syncOptions);
var customerCount = await _context.Customers.CountAsync(c => c.StoreId == store.Id);
// ← 実際のデータが保存される
```

---

## ⚠️ シミュレーションモードが有効になる条件

以下の**いずれか**の条件が満たされると、シミュレーションモードで動作します：

```csharp
if (useSimulation || string.IsNullOrEmpty(store.AccessToken))
{
    // シミュレーションモード
    await RunSimulatedSync(store, syncStatus, syncOptions.StartDate);
}
```

### 条件1: `UseSimulation = true`
- 設定ファイルで `"UseSimulation": true` が設定されている
- または、設定ファイルに `UseSimulation` がなく、デフォルト値が `true` の場合（修正前）

### 条件2: `store.AccessToken` が空
- ストアの `AccessToken` が設定されていない場合
- OAuth認証が完了していない場合

---

## 🔍 確認方法

### 1. 設定ファイルの確認

以下のファイルで `UseSimulation` の設定を確認：

```powershell
# Development
cat backend/ShopifyAnalyticsApi/appsettings.Development.json | Select-String "UseSimulation"

# Staging
cat backend/ShopifyAnalyticsApi/appsettings.Staging.json | Select-String "UseSimulation"

# Production
cat backend/ShopifyAnalyticsApi/appsettings.Production.json | Select-String "UseSimulation"
```

**期待される結果**:
- `Development`: `"UseSimulation": false` または未設定（デフォルト `false`）
- `Staging`: `"UseSimulation": false` ✅ 修正済み
- `Production`: `"UseSimulation": false`

### 2. AccessToken の確認

データベースで `AccessToken` が設定されているか確認：

```sql
SELECT Id, Domain, Name, 
       CASE WHEN AccessToken IS NOT NULL AND LEN(AccessToken) > 0 
            THEN 'あり' ELSE 'なし' END as HasAccessToken,
       LEN(AccessToken) as TokenLength
FROM Stores
WHERE IsActive = 1;
```

**期待される結果**:
- `HasAccessToken` が `'あり'` であること
- `TokenLength` が 0 より大きいこと

### 3. ログの確認

Application Insights またはログファイルで以下を確認：

**シミュレーションモードの場合**:
```
顧客データ取得中（シミュレーション）
注文データ取得中
商品データ取得中
```

**実際の同期モードの場合**:
```
Starting customer sync for store: {StoreName} (ID: {StoreId})
Synced {N} customers for store {StoreId}
Starting product sync for store: {StoreName} (ID: {StoreId})
Synced {N} products for store {StoreId}
Starting order sync for store: {StoreName} (ID: {StoreId})
Synced {N} orders for store {StoreId}
Total synced records: {N} for store {StoreId}
```

---

## 📝 修正後の動作フロー

### 正常フロー（修正後）

```
1. SyncController.StartInitialSync() 呼び出し
   ↓
2. SyncStatus を "pending" で作成
   ↓
3. HangFire ジョブ登録
   ↓
4. ShopifyDataSyncService.StartInitialSync() 実行
   ↓
5. RunInitialSyncWithJobs() 実行
   ↓
6. useSimulation = false（デフォルト値が false に変更）
   ↓
7. store.AccessToken が存在する
   ↓
8. RunInitialSyncWithJobs() の else ブロックを実行
   ↓
9. _customerSyncJob.SyncCustomers() → Customersテーブルにデータ保存
   ↓
10. _productSyncJob.SyncProducts() → Productsテーブルにデータ保存
   ↓
11. _orderSyncJob.SyncOrders() → Ordersテーブルにデータ保存
   ↓
12. SyncStatus を "completed" に更新
```

---

## ✅ 修正チェックリスト

- [x] `appsettings.Staging.json` に `"UseSimulation": false` を追加
- [x] `ShopifyDataSyncService.cs` のデフォルト値を `false` に変更
- [ ] Azure App Service を再起動（Staging環境）
- [ ] DBで `Stores.AccessToken` が存在することを確認
- [ ] 同期を再実行
- [ ] DBに Customers, Products, Orders が保存されることを確認
- [ ] ダッシュボードでデータが表示されることを確認
- [ ] Application Insights で正常ログを確認

---

## 🚀 次のステップ

### 即時対応

1. **Azure App Service を再起動**
   - Staging環境のバックエンドを再起動
   - 設定ファイルの変更を反映

2. **動作確認**
   - 新規ストアで同期を実行
   - DBにデータが保存されることを確認
   - Application Insights で正常ログを確認

### 恒久対策（完了済み）

1. ✅ **コード修正**
   - デフォルト値を `false` に変更
   - シミュレーションモードは明示的に有効化する必要がある

2. ✅ **設定ファイル修正**
   - `appsettings.Staging.json` に `UseSimulation: false` を追加

---

## 📚 関連ファイル

- `backend/ShopifyAnalyticsApi/Services/ShopifyDataSyncService.cs` - 同期サービス
- `backend/ShopifyAnalyticsApi/appsettings.Staging.json` - ステージング環境設定
- `backend/ShopifyAnalyticsApi/appsettings.Development.json` - 開発環境設定
- `backend/ShopifyAnalyticsApi/appsettings.Production.json` - 本番環境設定

---

**更新履歴**:
- 2026-01-03: 問題特定と修正完了
