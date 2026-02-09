-- ============================================================
-- データ同期再処理後: テストフラグ（IsTest）が集計に反映されているか確認
-- ============================================================
-- 作成日: 2026-01-29
-- 用途: **データ同期ダッシュボード**で参照する集計と、Orders.IsTest の対応状況を確認。
--       同期再処理後に IsTest が付与されているか、本注文のみの件数と比較する。
-- 前提: マイグレーション 2026-01-28-AddIsTestToOrders 適用済み。同期で test 取得済み想定。
-- ============================================================
-- 使い方: @StoreId に対象ストアを指定。全ストア確認時はセクション1の「-- 全ストア」側を使用。
-- ============================================================

-- 対象ストア（必要な場合に変更）
DECLARE @StoreId INT = 1;

-- ============================================================
-- 1. Orders.IsTest の反映状況（ストア別）
-- ============================================================
-- データ同期ダッシュボードの GET /api/sync/status は
-- orderCount = COUNT(Orders) で IsTest を絞っていない（全件）。
-- 分析（前年同月比・購入回数・休眠顧客）は本注文（IsTest=0）のみ対象。
-- ============================================================

PRINT '========================================';
PRINT '1. Orders.IsTest 内訳（ストア別）';
PRINT '========================================';

-- 対象ストアのみ
SELECT
    o.StoreId,
    s.Name AS StoreName,
    COUNT(*) AS OrdersTotal,
    SUM(CASE WHEN o.IsTest = 0 THEN 1 ELSE 0 END) AS Orders_本注文,
    SUM(CASE WHEN o.IsTest = 1 THEN 1 ELSE 0 END) AS Orders_テスト,
    CAST(SUM(CASE WHEN o.IsTest = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) AS テスト割合_pct
FROM Orders o
LEFT JOIN Stores s ON s.Id = o.StoreId
WHERE o.StoreId = @StoreId
GROUP BY o.StoreId, s.Name;

-- 全ストアで確認する場合（上をコメントアウトし、こちらを利用）
/*
SELECT
    o.StoreId,
    s.Name AS StoreName,
    COUNT(*) AS OrdersTotal,
    SUM(CASE WHEN o.IsTest = 0 THEN 1 ELSE 0 END) AS Orders_本注文,
    SUM(CASE WHEN o.IsTest = 1 THEN 1 ELSE 0 END) AS Orders_テスト,
    CAST(SUM(CASE WHEN o.IsTest = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) AS テスト割合_pct
FROM Orders o
LEFT JOIN Stores s ON s.Id = o.StoreId
GROUP BY o.StoreId, s.Name
ORDER BY o.StoreId;
*/

PRINT '';

-- ============================================================
-- 2. データ同期ダッシュボードで使う集計との対応
-- ============================================================
-- ダッシュボード: products.count, customers.count, orders.count
-- orders.count は全件。本注文のみの件数と比較する。
-- ============================================================

PRINT '========================================';
PRINT '2. ダッシュボード集計 vs 本注文のみ（StoreId=' + CAST(@StoreId AS NVARCHAR(10)) + '）';
PRINT '========================================';

SELECT
    (SELECT COUNT(*) FROM Products WHERE StoreId = @StoreId AND IsActive = 1) AS Products_ダッシュボード,
    (SELECT COUNT(*) FROM Customers WHERE StoreId = @StoreId) AS Customers_ダッシュボード,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = @StoreId) AS Orders_ダッシュボード_全件,
    (SELECT COUNT(*) FROM Orders WHERE StoreId = @StoreId AND IsTest = 0) AS Orders_本注文のみ_分析で使用;

PRINT '';
PRINT '※ ダッシュボードの orders.count は全件。分析（前年同月比等）は本注文のみ。';
PRINT '';

-- ============================================================
-- 3. 直近の同期履歴と Orders 件数
-- ============================================================
-- SyncStatuses の ProcessedRecords / TotalRecords は初期同期では
-- C+P+O 合計。手動の注文のみ同期では注文件数。
-- 参考として直近の Order 同期と実Orders件数を並べる。
-- ============================================================

PRINT '========================================';
PRINT '3. 直近の同期履歴（Order / All）と Orders 件数';
PRINT '========================================';

SELECT TOP 5
    ss.Id,
    ss.StoreId,
    ss.EntityType,
    ss.SyncType,
    ss.Status,
    ss.ProcessedRecords,
    ss.TotalRecords,
    ss.StartDate,
    ss.EndDate,
    (SELECT COUNT(*) FROM Orders o WHERE o.StoreId = ss.StoreId) AS Orders実件数_全件,
    (SELECT COUNT(*) FROM Orders o WHERE o.StoreId = ss.StoreId AND o.IsTest = 0) AS Orders実件数_本注文のみ
FROM SyncStatuses ss
WHERE ss.StoreId = @StoreId
  AND (ss.EntityType IN (N'Order', N'Orders') OR ss.EntityType = N'All')
ORDER BY ss.StartDate DESC;

PRINT '';

-- ============================================================
-- 4. IsTest 未反映の可能性チェック（全件 IsTest=0 かつ 同期後）
-- ============================================================
-- 再同期後にまだ IsTest=1 が一件もないストアは、
-- テスト注文が存在しないか、同期で test が取れていない可能性。
-- ============================================================

PRINT '========================================';
PRINT '4. テスト注文の有無（IsTest=1 がいるか）';
PRINT '========================================';

IF (SELECT COUNT(*) FROM Orders WHERE StoreId = @StoreId AND IsTest = 1) > 0
    PRINT '✅ テスト注文（IsTest=1）が存在します。同期で test フラグは反映されています。';
ELSE
    PRINT 'ℹ️ テスト注文（IsTest=1）は 0 件。テスト注文が無いストアか、再同期で test が取得できていない可能性があります。';

PRINT '';
PRINT '========================================';
PRINT '確認完了';
PRINT '========================================';
PRINT '確認ポイント:';
PRINT '  1. Orders本注文 / Ordersテスト の内訳が想定どおりか';
PRINT '  2. ダッシュボードの orders.count（全件）と分析で使う本注文のみの差を把握';
PRINT '  3. 直近同期の ProcessedRecords と Orders実件数 の対応（EntityType=Order 時は近い値になる想定）';
PRINT '  4. 再同期後に IsTest=1 が増えているか（テスト注文があるストアでは増える想定）';
PRINT '';
