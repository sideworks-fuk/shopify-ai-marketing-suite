-- FinancialStatusカラム追加スクリプト（改善版）
-- 実行日時: 2025-07-25
-- タイムアウト回避のためバッチ処理を採用

-- 1. FinancialStatusカラムを追加
ALTER TABLE Orders 
ADD FinancialStatus nvarchar(50) NOT NULL DEFAULT 'pending';

-- 2. 既存データのFinancialStatusを設定（バッチ処理）
DECLARE @BatchSize INT = 1000
DECLARE @Offset INT = 0
DECLARE @TotalRows INT = (SELECT COUNT(*) FROM Orders)
DECLARE @ProcessedRows INT = 0

PRINT 'Total rows to process: ' + CAST(@TotalRows AS VARCHAR(10))

WHILE @Offset < @TotalRows
BEGIN
    UPDATE TOP(@BatchSize) Orders 
    SET FinancialStatus = CASE 
        WHEN Status = 'completed' THEN 'paid'
        WHEN Status = 'cancelled' THEN 'refunded'
        ELSE 'pending'
    END
    WHERE Id IN (
        SELECT Id FROM Orders 
        ORDER BY Id 
        OFFSET @Offset ROWS 
        FETCH NEXT @BatchSize ROWS ONLY
    )
    
    SET @ProcessedRows = @ProcessedRows + @@ROWCOUNT
    SET @Offset = @Offset + @BatchSize
    
    PRINT 'Processed rows: ' + CAST(@ProcessedRows AS VARCHAR(10)) + ' / ' + CAST(@TotalRows AS VARCHAR(10))
    
    -- バッチ間で少し待機（ロック競合を回避）
    WAITFOR DELAY '00:00:00.100'
END

PRINT 'Data update completed successfully!'

-- 3. 確認クエリ
SELECT 
    Id,
    OrderNumber,
    Status,
    FinancialStatus,
    CreatedAt
FROM Orders
ORDER BY Id; 