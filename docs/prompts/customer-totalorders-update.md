# Customer.TotalOrdersアップデート指示

## 問題の概要
CustomersテーブルのTotalOrdersカラムが0になっており、顧客の実際の注文数を反映していない。

## アップデート方法

### 1. SQLでの一括更新（推奨）

```sql
-- Store 2の顧客のTotalOrdersを実際の注文数で更新
UPDATE c
SET 
    c.TotalOrders = ISNULL(o.OrderCount, 0),
    c.OrdersCount = ISNULL(o.OrderCount, 0),  -- 互換性のため両方更新
    c.TotalSpent = ISNULL(o.TotalAmount, 0),
    c.UpdatedAt = GETDATE()
FROM Customers c
LEFT JOIN (
    SELECT 
        CustomerId,
        COUNT(DISTINCT Id) as OrderCount,
        SUM(TotalPrice) as TotalAmount
    FROM Orders
    WHERE StoreId = 2
    GROUP BY CustomerId
) o ON c.Id = o.CustomerId
WHERE c.StoreId = 2;

-- 更新結果の確認
SELECT 
    Id,
    FirstName,
    LastName,
    Email,
    TotalOrders,
    TotalSpent,
    CustomerSegment
FROM Customers
WHERE StoreId = 2
ORDER BY TotalOrders DESC;
```

### 2. 顧客セグメントの再計算

```sql
-- CustomerSegmentも実際のデータに基づいて更新
UPDATE Customers
SET CustomerSegment = 
    CASE 
        WHEN TotalOrders >= 10 OR TotalSpent >= 100000 THEN 'VIP顧客'
        WHEN TotalOrders >= 2 THEN 'リピーター'
        ELSE '新規顧客'
    END
WHERE StoreId = 2;
```

### 3. 全ストアに対する更新（必要に応じて）

```sql
-- すべてのストアの顧客統計を更新
UPDATE c
SET 
    c.TotalOrders = ISNULL(o.OrderCount, 0),
    c.OrdersCount = ISNULL(o.OrderCount, 0),
    c.TotalSpent = ISNULL(o.TotalAmount, 0),
    c.CustomerSegment = 
        CASE 
            WHEN ISNULL(o.OrderCount, 0) >= 10 OR ISNULL(o.TotalAmount, 0) >= 100000 THEN 'VIP顧客'
            WHEN ISNULL(o.OrderCount, 0) >= 2 THEN 'リピーター'
            ELSE '新規顧客'
        END,
    c.UpdatedAt = GETDATE()
FROM Customers c
LEFT JOIN (
    SELECT 
        o.CustomerId,
        o.StoreId,
        COUNT(DISTINCT o.Id) as OrderCount,
        SUM(o.TotalPrice) as TotalAmount
    FROM Orders o
    GROUP BY o.CustomerId, o.StoreId
) o ON c.Id = o.CustomerId AND c.StoreId = o.StoreId;
```

## C#での実装（APIエンドポイント追加）

```csharp
// Controllers/DatabaseController.cs に追加

[HttpPost("update-customer-stats")]
public async Task<IActionResult> UpdateCustomerStatistics([FromQuery] int? storeId = null)
{
    try
    {
        var sql = @"
            UPDATE c
            SET 
                c.TotalOrders = ISNULL(o.OrderCount, 0),
                c.OrdersCount = ISNULL(o.OrderCount, 0),
                c.TotalSpent = ISNULL(o.TotalAmount, 0),
                c.CustomerSegment = 
                    CASE 
                        WHEN ISNULL(o.OrderCount, 0) >= 10 OR ISNULL(o.TotalAmount, 0) >= 100000 THEN 'VIP顧客'
                        WHEN ISNULL(o.OrderCount, 0) >= 2 THEN 'リピーター'
                        ELSE '新規顧客'
                    END,
                c.UpdatedAt = GETDATE()
            FROM Customers c
            LEFT JOIN (
                SELECT 
                    o.CustomerId,
                    o.StoreId,
                    COUNT(DISTINCT o.Id) as OrderCount,
                    SUM(o.TotalPrice) as TotalAmount
                FROM Orders o
                {0}
                GROUP BY o.CustomerId, o.StoreId
            ) o ON c.Id = o.CustomerId AND c.StoreId = o.StoreId
            {1}";

        var whereClause = storeId.HasValue ? $"WHERE o.StoreId = {storeId}" : "";
        var customerWhereClause = storeId.HasValue ? $"WHERE c.StoreId = {storeId}" : "";
        
        var finalSql = string.Format(sql, whereClause, customerWhereClause);
        
        var rowsAffected = await _context.Database.ExecuteSqlRawAsync(finalSql);
        
        _logger.LogInformation($"Updated {rowsAffected} customer records");
        
        // 更新結果のサマリーを取得
        var summary = await _context.Customers
            .Where(c => !storeId.HasValue || c.StoreId == storeId)
            .GroupBy(c => c.CustomerSegment)
            .Select(g => new 
            {
                Segment = g.Key,
                Count = g.Count()
            })
            .ToListAsync();
        
        return Ok(new
        {
            success = true,
            rowsAffected = rowsAffected,
            summary = summary,
            message = $"顧客統計を更新しました（{rowsAffected}件）"
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "顧客統計更新エラー");
        return StatusCode(500, new { success = false, message = "更新中にエラーが発生しました" });
    }
}
```

## 前年同月比分析への影響

Customer.TotalOrdersは顧客分析画面で使用されるフィールドで、前年同月比【商品】分析には影響しません。

前年同月比分析は以下のテーブルを使用：
- Orders（注文日、合計金額）
- OrderItems（商品明細、数量、金額）

したがって、Customer.TotalOrdersの更新は独立して実施可能です。

## 実行タイミング

1. **即時実行可能** - 前年同月比分析に影響なし
2. **定期実行推奨** - 日次バッチやAzure Functionsで定期更新
3. **トリガー設定** - 注文作成/更新時に自動更新

## 確認コマンド

```bash
# APIエンドポイントから実行
curl -X POST "https://your-api.azurewebsites.net/api/database/update-customer-stats?storeId=2"
```