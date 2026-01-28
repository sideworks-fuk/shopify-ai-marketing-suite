-- ============================================
-- StoreId 18 休眠顧客デバッグ用SQLクエリ
-- ============================================

-- 1. 基本統計: StoreId 18の顧客データ概要
SELECT 
    N'全顧客数' as Metric,
    COUNT(*) as Count
FROM Customers 
WHERE StoreId = 18

UNION ALL

SELECT 
    N'注文履歴あり' as Metric,
    COUNT(*) as Count
FROM Customers 
WHERE StoreId = 18 AND TotalOrders > 0

UNION ALL

SELECT 
    N'LastOrderDate設定済み' as Metric,
    COUNT(*) as Count
FROM Customers 
WHERE StoreId = 18 
  AND TotalOrders > 0 
  AND LastOrderDate IS NOT NULL

UNION ALL

SELECT 
    N'90日以上前購入（休眠顧客）' as Metric,
    COUNT(*) as Count
FROM Customers 
WHERE StoreId = 18 
  AND TotalOrders > 0 
  AND LastOrderDate IS NOT NULL
  AND LastOrderDate < DATEADD(day, -90, GETUTCDATE());

-- 2. 詳細分析: 各条件で除外される顧客数
SELECT 
    N'条件1: TotalOrders = 0' as ExclusionReason,
    COUNT(*) as ExcludedCount
FROM Customers 
WHERE StoreId = 18 AND TotalOrders = 0

UNION ALL

SELECT 
    N'条件2: LastOrderDate IS NULL' as ExclusionReason,
    COUNT(*) as ExcludedCount
FROM Customers 
WHERE StoreId = 18 
  AND TotalOrders > 0 
  AND LastOrderDate IS NULL

UNION ALL

SELECT 
    N'条件3: 90日以内に購入' as ExclusionReason,
    COUNT(*) as ExcludedCount
FROM Customers 
WHERE StoreId = 18 
  AND TotalOrders > 0 
  AND LastOrderDate IS NOT NULL
  AND LastOrderDate >= DATEADD(day, -90, GETUTCDATE());

-- 3. LastOrderDateがnullだが注文データがある顧客（データ不整合）
SELECT 
    c.Id as CustomerId,
    c.FirstName + ' ' + c.LastName as DisplayName,
    c.Email,
    c.TotalOrders,
    c.LastOrderDate,
    MAX(o.ShopifyProcessedAt) as MaxOrderDate,
    DATEDIFF(day, MAX(o.ShopifyProcessedAt), GETUTCDATE()) as DaysSinceLastOrder
FROM Customers c
INNER JOIN Orders o ON o.CustomerId = c.Id
WHERE c.StoreId = 18 
  AND c.TotalOrders > 0
  AND c.LastOrderDate IS NULL
  AND o.ShopifyProcessedAt IS NOT NULL
GROUP BY c.Id, c.FirstName, c.LastName, c.Email, c.TotalOrders, c.LastOrderDate
ORDER BY MAX(o.ShopifyProcessedAt) DESC;

-- 4. 休眠顧客候補（LastOrderDate更新後に対象になる可能性がある顧客）
SELECT 
    c.Id as CustomerId,
    c.FirstName + ' ' + c.LastName as DisplayName,
    c.Email,
    c.TotalOrders,
    c.LastOrderDate,
    MAX(o.ShopifyProcessedAt) as MaxOrderDate,
    DATEDIFF(day, MAX(o.ShopifyProcessedAt), GETUTCDATE()) as DaysSinceLastOrder,
    CASE 
        WHEN DATEDIFF(day, MAX(o.ShopifyProcessedAt), GETUTCDATE()) >= 90 THEN N'休眠顧客候補'
        ELSE N'アクティブ顧客'
    END as Status
FROM Customers c
INNER JOIN Orders o ON o.CustomerId = c.Id
WHERE c.StoreId = 18 
  AND c.TotalOrders > 0
  AND o.ShopifyProcessedAt IS NOT NULL
GROUP BY c.Id, c.FirstName, c.LastName, c.Email, c.TotalOrders, c.LastOrderDate
HAVING MAX(o.ShopifyProcessedAt) IS NOT NULL
ORDER BY DATEDIFF(day, MAX(o.ShopifyProcessedAt), GETUTCDATE()) DESC;

-- 5. セグメント別の顧客数（LastOrderDate更新後）
-- 注: サブクエリを使用して集約関数の問題を回避
SELECT 
    Segment,
    COUNT(DISTINCT CustomerId) as CustomerCount
FROM (
    SELECT 
        c.Id as CustomerId,
        CASE 
            WHEN DATEDIFF(day, MAX(o.ShopifyProcessedAt), GETUTCDATE()) BETWEEN 90 AND 180 THEN N'90-180日'
            WHEN DATEDIFF(day, MAX(o.ShopifyProcessedAt), GETUTCDATE()) BETWEEN 181 AND 365 THEN N'180-365日'
            WHEN DATEDIFF(day, MAX(o.ShopifyProcessedAt), GETUTCDATE()) > 365 THEN N'365日以上'
            ELSE N'90日未満（アクティブ）'
        END as Segment
    FROM Customers c
    INNER JOIN Orders o ON o.CustomerId = c.Id
    WHERE c.StoreId = 18 
      AND c.TotalOrders > 0
      AND o.ShopifyProcessedAt IS NOT NULL
    GROUP BY c.Id
) as SegmentedCustomers
GROUP BY Segment
ORDER BY 
    CASE Segment
        WHEN N'90-180日' THEN 1
        WHEN N'180-365日' THEN 2
        WHEN N'365日以上' THEN 3
        ELSE 4
    END;

-- 6. LastOrderDateを更新するクエリ（データ不整合を修正）
-- ⚠️ 実行前に必ずバックアップを取ってください
-- 注意: このクエリは以下の2つのケースを修正します
--   1. LastOrderDateがNULLの場合
--   2. LastOrderDateが実際の注文日と異なる場合

-- ============================================
-- 6-1. StoreId 18のみを更新する場合
-- ============================================

-- まず、更新対象の顧客数を確認
SELECT 
    N'更新対象顧客数(StoreId=18)' as Metric,
    COUNT(*) as Count
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

-- 実際の更新クエリ（コメントアウト済み）
/*
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
*/

-- ============================================
-- 6-2. 全ストアを更新する場合
-- ============================================
-- ⚠️ 注意事項:
--   1. 大量のデータを更新するため、実行時間がかかる可能性があります
--   2. トランザクションログが大きくなる可能性があります
--   3. 実行前に必ずバックアップを取ってください
--   4. 本番環境では、まずストア単位で実行することを推奨します

-- 全ストアの更新対象顧客数を確認（ストア別）
SELECT 
    c.StoreId,
    COUNT(*) as UpdateTargetCount
FROM Customers c
WHERE c.TotalOrders > 0
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
  )
GROUP BY c.StoreId
ORDER BY c.StoreId;

-- 全ストアの更新対象顧客数の合計を確認
SELECT 
    N'全ストア更新対象顧客数' as Metric,
    COUNT(*) as Count
FROM Customers c
WHERE c.TotalOrders > 0
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

-- 全ストアの更新クエリ（コメントアウト済み）
-- ⚠️ 実行前に上記の確認クエリで更新対象件数を確認してください
/*
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
    
    SET @UpdatedCount = @@ROWCOUNT;
    PRINT N'更新件数: ' + CAST(@UpdatedCount AS NVARCHAR(10));
    
    -- バッチ間で少し待機（ロック競合を避ける）
    WAITFOR DELAY '00:00:01';
END
*/

-- 一括更新版（注意: 大量データの場合は時間がかかります）
/*
UPDATE c
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
*/

-- 7. LastOrderDateと実際の注文日の不整合確認
-- 重要: LastOrderDateが正しく更新されていない可能性を確認
SELECT 
    c.Id as CustomerId,
    c.FirstName + ' ' + c.LastName as DisplayName,
    c.TotalOrders,
    c.LastOrderDate as CustomerLastOrderDate,
    (SELECT MAX(o.ShopifyProcessedAt) 
     FROM Orders o 
     WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL) as ActualMaxOrderDate,
    DATEDIFF(day, 
        (SELECT MAX(o.ShopifyProcessedAt) 
         FROM Orders o 
         WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL), 
        GETUTCDATE()) as ActualDaysSinceLastOrder,
    CASE 
        WHEN c.LastOrderDate IS NULL THEN N'LastOrderDate未設定'
        WHEN c.LastOrderDate != (SELECT MAX(o.ShopifyProcessedAt) 
                                  FROM Orders o 
                                  WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL) 
        THEN N'LastOrderDate不整合'
        ELSE N'正常'
    END as Status
FROM Customers c
WHERE c.StoreId = 18 
  AND c.TotalOrders > 0
  AND EXISTS (
      SELECT 1 
      FROM Orders o 
      WHERE o.CustomerId = c.Id AND o.ShopifyProcessedAt IS NOT NULL
  )
ORDER BY ActualDaysSinceLastOrder DESC;

-- 8. 更新後の確認クエリ（LastOrderDate更新後）
-- 注: このクエリはLastOrderDateを使用しているため、更新前は0件になる可能性がある
SELECT 
    N'更新後の休眠顧客数(LastOrderDate使用)' as Metric,
    COUNT(*) as Count
FROM Customers 
WHERE StoreId = 18 
  AND TotalOrders > 0 
  AND LastOrderDate IS NOT NULL
  AND LastOrderDate < DATEADD(day, -90, GETUTCDATE());

-- 9. 実際の注文日から計算した休眠顧客数（LastOrderDateに依存しない）
-- 注: このクエリはOrdersテーブルから直接計算するため、より正確
SELECT 
    N'実際の休眠顧客数(Ordersテーブルから計算)' as Metric,
    COUNT(DISTINCT c.Id) as Count
FROM Customers c
INNER JOIN Orders o ON o.CustomerId = c.Id
WHERE c.StoreId = 18 
  AND c.TotalOrders > 0
  AND o.ShopifyProcessedAt IS NOT NULL
  AND o.ShopifyProcessedAt < DATEADD(day, -90, GETUTCDATE())
  AND o.ShopifyProcessedAt = (
      SELECT MAX(o2.ShopifyProcessedAt)
      FROM Orders o2
      WHERE o2.CustomerId = c.Id
        AND o2.ShopifyProcessedAt IS NOT NULL
  );

-- 10. 注文データの存在確認
SELECT 
    COUNT(DISTINCT o.CustomerId) as CustomersWithOrders,
    COUNT(*) as TotalOrders,
    MIN(o.ShopifyProcessedAt) as OldestOrder,
    MAX(o.ShopifyProcessedAt) as NewestOrder
FROM Orders o
INNER JOIN Customers c ON o.CustomerId = c.Id
WHERE c.StoreId = 18
  AND o.ShopifyProcessedAt IS NOT NULL;
