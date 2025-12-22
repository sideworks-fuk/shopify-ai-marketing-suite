-- =============================================
-- 注文データの日付更新スクリプト
-- 目的: StoreId = 1の注文データ（Id 77761以降）を15万件、
--       2024年1月～2025年12月のランダムな日付に更新
-- 作成日: 2025-12-18
-- 注意: 本番環境では実行前に必ずバックアップを取得すること
-- =============================================

-- トランザクション開始
BEGIN TRANSACTION;

-- 更新対象の確認（実行前に確認用）
SELECT COUNT(*) AS TargetCount
FROM dbo.Orders
WHERE StoreId = 1 
  AND Id >= 77761;

-- 更新前のサンプルデータ確認（TOP 10）
SELECT TOP 10 
    Id, 
    OrderNumber, 
    CustomerId, 
    CreatedAt, 
    UpdatedAt,
    YEAR(CreatedAt) AS CurrentYear,
    MONTH(CreatedAt) AS CurrentMonth
FROM dbo.Orders
WHERE StoreId = 1 
  AND Id >= 77761
ORDER BY Id;

-- メイン更新処理
-- 15万件をランダムな2024-2025年の日付に更新
WITH OrdersToUpdate AS (
    SELECT TOP 150000
        Id,
        CreatedAt,
        UpdatedAt,
        -- 2024年1月1日（開始日）
        CAST('2024-01-01' AS DATETIME) AS StartDate,
        -- 2025年12月31日（終了日）
        CAST('2025-12-31 23:59:59' AS DATETIME) AS EndDate,
        -- ランダム値生成用
        ROW_NUMBER() OVER (ORDER BY NEWID()) AS RandomOrder
    FROM dbo.Orders
    WHERE StoreId = 1 
      AND Id >= 77761
    ORDER BY Id
)
UPDATE o
SET 
    -- ランダムな日付を生成（2024-01-01 から 2025-12-31 の間）
    CreatedAt = DATEADD(
        SECOND,
        ABS(CHECKSUM(NEWID())) % DATEDIFF(SECOND, u.StartDate, u.EndDate),
        u.StartDate
    ),
    -- UpdatedAtはCreatedAtと同じか、少し後の日付に設定
    UpdatedAt = DATEADD(
        SECOND,
        ABS(CHECKSUM(NEWID())) % DATEDIFF(SECOND, u.StartDate, u.EndDate),
        u.StartDate
    )
FROM dbo.Orders o
INNER JOIN OrdersToUpdate u ON o.Id = u.Id;

-- 更新結果の確認
PRINT '更新件数: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 更新後のデータ分布確認
SELECT 
    YEAR(CreatedAt) AS OrderYear,
    MONTH(CreatedAt) AS OrderMonth,
    COUNT(*) AS OrderCount
FROM dbo.Orders
WHERE StoreId = 1 
  AND Id >= 77761
GROUP BY YEAR(CreatedAt), MONTH(CreatedAt)
ORDER BY OrderYear, OrderMonth;

-- 年別の集計
SELECT 
    YEAR(CreatedAt) AS OrderYear,
    COUNT(*) AS TotalOrders,
    MIN(CreatedAt) AS FirstOrder,
    MAX(CreatedAt) AS LastOrder
FROM dbo.Orders
WHERE StoreId = 1 
  AND Id >= 77761
GROUP BY YEAR(CreatedAt)
ORDER BY OrderYear;

-- 更新後のサンプルデータ確認（TOP 10）
SELECT TOP 10 
    Id, 
    OrderNumber, 
    CustomerId, 
    CreatedAt, 
    UpdatedAt,
    YEAR(CreatedAt) AS UpdatedYear,
    MONTH(CreatedAt) AS UpdatedMonth
FROM dbo.Orders
WHERE StoreId = 1 
  AND Id >= 77761
ORDER BY Id;

-- コミットまたはロールバック
-- 実行結果を確認してから、以下のいずれかを実行：
-- COMMIT TRANSACTION;  -- 変更を確定する場合
-- ROLLBACK TRANSACTION;  -- 変更を取り消す場合

-- =============================================
-- 月別に均等に分散させたい場合の代替クエリ
-- =============================================
/*
WITH OrdersToUpdateEvenly AS (
    SELECT 
        Id,
        CreatedAt,
        UpdatedAt,
        -- 24ヶ月（2024年1月～2025年12月）に均等分散
        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum,
        COUNT(*) OVER () AS TotalRows
    FROM dbo.Orders
    WHERE StoreId = 1 
      AND Id >= 77761
),
MonthlyDistribution AS (
    SELECT 
        Id,
        -- 各月に均等に分配
        DATEADD(
            MONTH,
            (RowNum - 1) * 24 / TotalRows,  -- 0-23の月オフセット
            '2024-01-01'
        ) AS BaseMonth
    FROM OrdersToUpdateEvenly
)
UPDATE o
SET 
    -- 各月内でランダムな日時を設定
    CreatedAt = DATEADD(
        SECOND,
        ABS(CHECKSUM(NEWID())) % (28 * 24 * 60 * 60),  -- 月内のランダムな秒数
        m.BaseMonth
    ),
    UpdatedAt = DATEADD(
        HOUR,
        ABS(CHECKSUM(NEWID())) % 24,  -- CreatedAtから最大24時間後
        CreatedAt
    )
FROM dbo.Orders o
INNER JOIN MonthlyDistribution m ON o.Id = m.Id;
*/

-- =============================================
-- より現実的な分布パターン（2024年から徐々に増加）
-- =============================================
/*
WITH OrdersToUpdateRealistic AS (
    SELECT TOP 150000
        Id,
        CreatedAt,
        UpdatedAt,
        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum,
        COUNT(*) OVER () AS TotalRows
    FROM dbo.Orders
    WHERE StoreId = 1 
      AND Id >= 77761
    ORDER BY Id
)
UPDATE o
SET 
    -- 指数関数的に増加するパターン（新しいほど注文が多い）
    CreatedAt = DATEADD(
        DAY,
        CAST(
            POWER(CAST(RowNum AS FLOAT) / TotalRows, 2) * 730  -- 2年間（730日）
            AS INT
        ),
        '2024-01-01'
    ),
    UpdatedAt = DATEADD(
        MINUTE,
        ABS(CHECKSUM(NEWID())) % 1440,  -- 最大24時間後
        CreatedAt
    )
FROM dbo.Orders o
INNER JOIN OrdersToUpdateRealistic u ON o.Id = u.Id;
*/



