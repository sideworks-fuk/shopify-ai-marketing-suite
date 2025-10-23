-- =============================================
-- 作成日: 2025-10-20
-- 作成者: 福田 + AI Assistant
-- 目的: FeatureLimitsテーブルの機能IDを正しいものに修正
-- 影響: 機能制限システムの動作修正、既存データの更新
-- =============================================

-- 機能IDの修正
-- データベースとコードの機能IDを統一

-- 1. year_over_year → yoy_comparison に更新
UPDATE FeatureLimits 
SET FeatureId = 'yoy_comparison' 
WHERE FeatureId = 'year_over_year';

-- 2. purchase_count → purchase_frequency に更新
UPDATE FeatureLimits 
SET FeatureId = 'purchase_frequency' 
WHERE FeatureId = 'purchase_count';

-- 3. 不明な機能を削除
DELETE FROM FeatureLimits 
WHERE FeatureId IN ('monthly_sales', 'analytics');

-- 4. 修正結果の確認
SELECT 
    Id,
    PlanType,
    FeatureId,
    DailyLimit,
    MonthlyLimit,
    'Updated' AS Status
FROM FeatureLimits
ORDER BY Id;

-- =============================================
-- 実行確認
-- =============================================
SELECT 'FeatureLimits ID Fix Migration Completed' AS Status;
