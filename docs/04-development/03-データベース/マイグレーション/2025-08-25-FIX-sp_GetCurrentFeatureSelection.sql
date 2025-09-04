-- 修正版: sp_GetCurrentFeatureSelectionストアドプロシージャ
-- 作成日: 2025-08-25
-- 作成者: Kenji
-- 修正理由: StoreSubscriptionsテーブルが存在しない場合のエラー回避

-- ========================================
-- ストアドプロシージャ: 機能選択の取得（簡易版）
-- ========================================
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetCurrentFeatureSelection')
    DROP PROCEDURE sp_GetCurrentFeatureSelection;
GO

CREATE PROCEDURE sp_GetCurrentFeatureSelection
    @StoreId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        ufs.Id,
        ufs.StoreId,
        ufs.SelectedFeatureId,
        ufs.LastChangeDate,
        ufs.NextChangeAvailableDate,
        CASE 
            WHEN ufs.NextChangeAvailableDate IS NULL OR ufs.NextChangeAvailableDate <= GETUTCDATE() 
            THEN 1 
            ELSE 0 
        END AS CanChangeToday
    FROM UserFeatureSelections ufs
    WHERE ufs.StoreId = @StoreId AND ufs.IsActive = 1
    ORDER BY ufs.CreatedAt DESC;
END
GO

PRINT 'sp_GetCurrentFeatureSelection procedure created successfully'