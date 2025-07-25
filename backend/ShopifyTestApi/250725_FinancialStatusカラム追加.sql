-- FinancialStatusカラム追加スクリプト
-- 実行日時: 2025-07-25

-- 1. FinancialStatusカラムを追加
ALTER TABLE Orders 
ADD FinancialStatus nvarchar(50) NOT NULL DEFAULT 'pending';

-- 2. 既存データのFinancialStatusを設定
UPDATE Orders 
SET FinancialStatus = CASE 
    WHEN Status = 'completed' THEN 'paid'
    WHEN Status = 'cancelled' THEN 'refunded'
    ELSE 'pending'
END;

-- 3. 確認クエリ
SELECT 
    Id,
    OrderNumber,
    Status,
    FinancialStatus,
    CreatedAt
FROM Orders
ORDER BY Id; 