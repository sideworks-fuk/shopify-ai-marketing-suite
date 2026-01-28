# LastOrderDate 更新処理の調査結果

## 問題の概要

StoreId 18で休眠顧客が0件になる原因は、`LastOrderDate`フィールドが正しく更新されていないことです。

## 現在の実装状況

### 1. LastOrderDateを更新する処理の場所

#### ✅ 実装済み

1. **`ShopifyApiService.UpsertOrderAsync`** (881-890行目)
   ```csharp
   // 顧客の LastOrderDate を更新（非正規化フィールド）
   if (targetCustomer != null && orderDate.HasValue)
   {
       // 現在の LastOrderDate より新しい場合のみ更新
       if (!targetCustomer.LastOrderDate.HasValue || orderDate > targetCustomer.LastOrderDate)
       {
           targetCustomer.LastOrderDate = orderDate;
           targetCustomer.UpdatedAt = DateTime.UtcNow;
       }
   }
   ```
   - **問題**: このメソッドは`ShopifyOrderSyncJob`から**呼ばれていない**

2. **`CustomerDataMaintenanceService.UpdateCustomerTotalOrdersAsync`** (54-62行目)
   ```csharp
   customer.LastOrderDate = orderStats.LastOrderDate; // 最終購入日を更新
   ```
   - **問題**: 注文同期**完了後**にのみ実行される（554-566行目）
   - 同期中にエラーが発生した場合、更新されない可能性がある

#### ❌ 未実装

3. **`ShopifyOrderSyncJob.SaveOrUpdateOrdersBatch`** (404-511行目)
   - 注文を保存・更新しているが、**`LastOrderDate`の更新処理が含まれていない**
   - これが主な問題の原因

## 問題の詳細

### 現在の処理フロー

```
ShopifyOrderSyncJob.SyncOrders
  ↓
SaveOrUpdateOrdersBatch (注文を保存・更新)
  ↓
_context.SaveChangesAsync()
  ↓
[LastOrderDateの更新なし] ← 問題点
  ↓
同期完了後
  ↓
UpdateCustomerTotalOrdersAsync (顧客統計を更新)
  ↓
LastOrderDateを更新 ← ここで初めて更新される
```

### 問題点

1. **注文同期中に`LastOrderDate`が更新されない**
   - `SaveOrUpdateOrdersBatch`で注文を保存しても、顧客の`LastOrderDate`は更新されない
   - 同期完了後の`UpdateCustomerTotalOrdersAsync`まで待つ必要がある

2. **同期失敗時の不整合**
   - 同期が途中で失敗した場合、`UpdateCustomerTotalOrdersAsync`が実行されない
   - 注文は保存されているが、`LastOrderDate`は更新されない

3. **パフォーマンスの問題**
   - 同期完了後に全顧客を再計算するため、大量の顧客がいる場合に時間がかかる
   - 注文保存時に個別に更新する方が効率的

## 修正案

### 案1: SaveOrUpdateOrdersBatch内でLastOrderDateを更新（推奨）

`SaveOrUpdateOrdersBatch`メソッド内で、注文保存時に顧客の`LastOrderDate`を更新する処理を追加します。

**メリット:**
- 注文保存と同時に`LastOrderDate`が更新される
- 同期失敗時でも、保存済みの注文分は更新される
- パフォーマンスが良い（個別更新）

**デメリット:**
- コードの変更が必要

### 案2: 注文保存後にバッチでLastOrderDateを更新

`SaveOrUpdateOrdersBatch`の最後で、保存した注文に関連する顧客の`LastOrderDate`を一括更新します。

**メリット:**
- バッチ処理で効率的
- コードの変更が比較的少ない

**デメリット:**
- 同期失敗時は更新されない可能性がある

### 案3: トリガーまたはストアドプロシージャを使用

データベース側でトリガーを設定し、注文保存時に自動的に`LastOrderDate`を更新します。

**メリット:**
- アプリケーションコードの変更が不要
- 確実に更新される

**デメリット:**
- データベース依存
- デバッグが難しい

## 推奨される修正方法

**案1を推奨**します。理由：

1. **即座に反映される**: 注文保存と同時に`LastOrderDate`が更新される
2. **整合性が保たれる**: 同期失敗時でも、保存済みの注文分は更新される
3. **パフォーマンス**: 個別更新で効率的

## 実装例

```csharp
private async Task SaveOrUpdateOrdersBatch(int storeId, List<Order> orders)
{
    if (!orders.Any()) return;

    // ... 既存のコード ...

    // 顧客IDのリストを収集
    var customerIds = orders
        .Where(o => o.CustomerId.HasValue && o.CustomerId.Value > 0)
        .Select(o => o.CustomerId.Value)
        .Distinct()
        .ToList();

    // 注文を保存
    await _context.SaveChangesAsync();

    // LastOrderDateを更新
    if (customerIds.Any())
    {
        await UpdateCustomerLastOrderDatesAsync(storeId, customerIds);
    }
}

private async Task UpdateCustomerLastOrderDatesAsync(int storeId, List<int> customerIds)
{
    foreach (var customerId in customerIds)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == customerId && c.StoreId == storeId);
        
        if (customer != null)
        {
            var lastOrderDate = await _context.Orders
                .Where(o => o.CustomerId == customerId && o.ShopifyProcessedAt != null)
                .OrderByDescending(o => o.ShopifyProcessedAt)
                .Select(o => (DateTime?)o.ShopifyProcessedAt!.Value)
                .FirstOrDefaultAsync();

            if (lastOrderDate.HasValue)
            {
                customer.LastOrderDate = lastOrderDate;
                customer.UpdatedAt = DateTime.UtcNow;
            }
        }
    }

    await _context.SaveChangesAsync();
}
```

## 既存データの修正

SQLクエリで既存の不整合を修正：

```sql
-- クエリ6を実行してLastOrderDateを更新
UPDATE c
SET c.LastOrderDate = (
    SELECT MAX(o.ShopifyProcessedAt)
    FROM Orders o
    WHERE o.CustomerId = c.Id 
      AND o.ShopifyProcessedAt IS NOT NULL
),
c.UpdatedAt = GETUTCDATE()
FROM Customers c
WHERE c.StoreId = 18
  AND c.TotalOrders > 0
  AND EXISTS (
      SELECT 1 
      FROM Orders o 
      WHERE o.CustomerId = c.Id 
        AND o.ShopifyProcessedAt IS NOT NULL
  )
  AND (
      c.LastOrderDate IS NULL
      OR c.LastOrderDate != (
          SELECT MAX(o.ShopifyProcessedAt)
          FROM Orders o
          WHERE o.CustomerId = c.Id 
            AND o.ShopifyProcessedAt IS NOT NULL
      )
  );
```

## 確認方法

修正後、以下のクエリで確認：

```sql
-- 不整合がないことを確認
SELECT 
    COUNT(*) as InconsistentCount
FROM Customers c
WHERE c.StoreId = 18
  AND c.TotalOrders > 0
  AND EXISTS (
      SELECT 1 
      FROM Orders o 
      WHERE o.CustomerId = c.Id 
        AND o.ShopifyProcessedAt IS NOT NULL
  )
  AND (
      c.LastOrderDate IS NULL
      OR c.LastOrderDate != (
          SELECT MAX(o.ShopifyProcessedAt)
          FROM Orders o
          WHERE o.CustomerId = c.Id 
            AND o.ShopifyProcessedAt IS NOT NULL
      )
  );
```

結果が0件であれば、不整合は解消されています。

## 実装状況

✅ **Step 2: 案1を実装** - 完了
- `ShopifyOrderSyncJob.SaveOrUpdateOrdersBatch`に`LastOrderDate`更新処理を追加
- `UpdateCustomerLastOrderDatesAsync`メソッドを追加
- 注文保存時に自動的に顧客の`LastOrderDate`が更新されるようになりました

## 実装手順

### Step 1: 既存データの不整合を修正（SQLクエリ）✅ 完了

**まず、既存の不整合データを修正します。**

```sql
-- ============================================
-- オプション1: StoreId 18のみを更新する場合
-- ============================================
UPDATE c
SET c.LastOrderDate = (
    SELECT MAX(o.ShopifyProcessedAt)
    FROM Orders o
    WHERE o.CustomerId = c.Id 
      AND o.ShopifyProcessedAt IS NOT NULL
),
c.UpdatedAt = GETUTCDATE()
FROM Customers c
WHERE c.StoreId = 18
  AND c.TotalOrders > 0
  AND EXISTS (
      SELECT 1 
      FROM Orders o 
      WHERE o.CustomerId = c.Id 
        AND o.ShopifyProcessedAt IS NOT NULL
  )
  AND (
      c.LastOrderDate IS NULL
      OR c.LastOrderDate != (
          SELECT MAX(o.ShopifyProcessedAt)
          FROM Orders o
          WHERE o.CustomerId = c.Id 
            AND o.ShopifyProcessedAt IS NOT NULL
      )
  );

-- ============================================
-- オプション2: 全ストアを更新する場合
-- ============================================
-- ⚠️ 注意: 実行前に更新対象件数を確認してください
-- 大量のデータを更新するため、バッチ処理版を推奨します

-- 更新対象件数の確認（ストア別）
SELECT 
    c.StoreId,
    COUNT(*) as UpdateTargetCount
FROM Customers c
WHERE c.TotalOrders > 0
  AND EXISTS (
      SELECT 1 FROM Orders o 
      WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
  )
  AND (
      c.LastOrderDate IS NULL
      OR c.LastOrderDate != (
          SELECT MAX(o.ShopifyProcessedAt)
          FROM Orders o
          WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
      )
  )
GROUP BY c.StoreId
ORDER BY c.StoreId;

-- バッチ処理版（推奨）: 1000件ずつ更新
DECLARE @BatchSize INT = 1000;
DECLARE @UpdatedCount INT = 1;

WHILE @UpdatedCount > 0
BEGIN
    UPDATE TOP (@BatchSize) c
    SET c.LastOrderDate = (
        SELECT MAX(o.ShopifyProcessedAt)
        FROM Orders o
        WHERE o.CustomerId = c.Id 
          AND o.ShopifyProcessedAt IS NOT NULL
    ),
    c.UpdatedAt = GETUTCDATE()
    FROM Customers c
    WHERE c.TotalOrders > 0
      AND EXISTS (
          SELECT 1 FROM Orders o 
          WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
      )
      AND (
          c.LastOrderDate IS NULL
          OR c.LastOrderDate != (
              SELECT MAX(o.ShopifyProcessedAt)
              FROM Orders o
              WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
          )
      );
    
    SET @UpdatedCount = @@ROWCOUNT;
    PRINT N'更新件数: ' + CAST(@UpdatedCount AS NVARCHAR(10));
    
    -- バッチ間で少し待機（ロック競合を避ける）
    WAITFOR DELAY '00:00:01';
END
```

**確認:**
```sql
-- StoreId 18の不整合が解消されたことを確認（0件であることを確認）
SELECT COUNT(*) as InconsistentCount
FROM Customers c
WHERE c.StoreId = 18
  AND c.TotalOrders > 0
  AND EXISTS (
      SELECT 1 FROM Orders o 
      WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
  )
  AND (
      c.LastOrderDate IS NULL
      OR c.LastOrderDate != (
          SELECT MAX(o.ShopifyProcessedAt)
          FROM Orders o
          WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
      )
  );

-- 全ストアの不整合を確認する場合
SELECT 
    c.StoreId,
    COUNT(*) as InconsistentCount
FROM Customers c
WHERE c.TotalOrders > 0
  AND EXISTS (
      SELECT 1 FROM Orders o 
      WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
  )
  AND (
      c.LastOrderDate IS NULL
      OR c.LastOrderDate != (
          SELECT MAX(o.ShopifyProcessedAt)
          FROM Orders o
          WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
      )
  )
GROUP BY c.StoreId
ORDER BY c.StoreId;
```

### Step 2: 案1を実装（コード修正）✅ 完了

`ShopifyOrderSyncJob.SaveOrUpdateOrdersBatch`メソッドに`LastOrderDate`の更新処理を追加しました。

**実装内容:**
- `SaveOrUpdateOrdersBatch`メソッドの最後で`UpdateCustomerLastOrderDatesAsync`を呼び出し
- 注文に関連する顧客の`LastOrderDate`を自動更新
- エラーハンドリングとログ出力を追加

**実装後、アプリケーションを再デプロイします。**

### Step 3: データ同期の再実行（オプション）

**既存データをSQLで修正済みの場合:**
- **データ同期の再実行は必須ではありません**
- 既存の注文データは既に修正済みのため、新しい注文が同期される際に自動的に`LastOrderDate`が更新されます

**ただし、以下の場合は再実行を推奨:**
1. **実装の動作確認**: 新しいコードが正しく動作することを確認するため
2. **全ストアのデータ修正**: StoreId 18以外のストアも不整合がある場合
3. **最新データの反映**: Shopify側で新しい注文が追加されている場合

**再実行する場合:**
```
POST /api/sync/trigger
{
  "type": "orders",
  "storeId": 18
}
```

または、Hangfireダッシュボードから手動で注文同期ジョブを実行します。

### Step 4: 動作確認

1. **不整合チェック:**
   ```sql
   -- 不整合がないことを確認（0件であることを確認）
   SELECT COUNT(*) as InconsistentCount
   FROM Customers c
   WHERE c.StoreId = 18
     AND c.TotalOrders > 0
     AND EXISTS (
         SELECT 1 FROM Orders o 
         WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
     )
     AND (
         c.LastOrderDate IS NULL
         OR c.LastOrderDate != (
             SELECT MAX(o.ShopifyProcessedAt)
             FROM Orders o
             WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
         )
     );
   ```

2. **休眠顧客数の確認:**
   ```sql
   -- 休眠顧客数が正しく表示されることを確認
   SELECT COUNT(*) as DormantCustomerCount
   FROM Customers 
   WHERE StoreId = 18 
     AND TotalOrders > 0 
     AND LastOrderDate IS NOT NULL
     AND LastOrderDate < DATEADD(day, -90, GETUTCDATE());
   ```

3. **API動作確認:**
   ```
   GET /api/customer/dormant?storeId=18&pageSize=100
   ```
   休眠顧客が正しく返されることを確認します。

## まとめ

**推奨される手順:**
1. ✅ **Step 1: 既存データをSQLで修正**（必須）
2. ✅ **Step 2: 案1を実装**（必須）
3. ⚠️ **Step 3: データ同期の再実行**（オプション - 動作確認のため推奨）
4. ✅ **Step 4: 動作確認**（必須）

**注意:**
- 既存データをSQLで修正すれば、データ同期を再実行しなくても既存の休眠顧客は表示されます
- ただし、実装が正しく動作することを確認するため、一度は再実行することを推奨します
