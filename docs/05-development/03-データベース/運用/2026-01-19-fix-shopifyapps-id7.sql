-- ============================================================
-- ShopifyAppsテーブル ID 7 修正スクリプト
-- ============================================================
-- 作成日: 2026-01-19
-- 作成者: 福田
-- 目的: EC Ranger (Publicアプリ) のApiSecretとRedirectUriを修正
-- ============================================================

-- ============================================================
-- ステップ1: 現在の状態を確認
-- ============================================================
SELECT 
    Id,
    Name,
    ApiKey,
    ApiSecret,
    AppUrl,
    RedirectUri,
    IsActive,
    UpdatedAt
FROM ShopifyApps
WHERE Id = 7;

-- ============================================================
-- ステップ2: ApiSecretとRedirectUriを更新
-- ============================================================
-- ⚠️ 注意: ApiSecretは実際のClient secretに置き換えてください
-- Shopify Partners管理画面で確認:
-- Apps → EC Ranger → App setup → Client credentials → Client secret

BEGIN TRANSACTION;

UPDATE ShopifyApps
SET 
    -- ⚠️ 重要: 以下の '実際のClient secretをここに設定' を
    -- Shopify Partners管理画面で取得した実際のClient secretに置き換えてください
    ApiSecret = '実際のClient secretをここに設定',  -- TODO: 実際のClient secretに置き換える
    RedirectUri = 'https://ec-ranger.access-net.co.jp/api/shopify/callback',
    UpdatedAt = SYSUTCDATETIME()
WHERE Id = 7
AND ApiKey = 'b95377afd35e5c8f4b28d286d3ff3491';

-- 更新件数を確認
IF @@ROWCOUNT = 0
BEGIN
    PRINT '⚠️ 警告: 更新対象のレコードが見つかりませんでした。';
    PRINT '   Id = 7 かつ ApiKey = b95377afd35e5c8f4b28d286d3ff3491 のレコードが存在するか確認してください。';
    ROLLBACK TRANSACTION;
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ 更新成功: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' 件のレコードを更新しました。';
END

-- ============================================================
-- ステップ3: 更新結果を確認
-- ============================================================
SELECT 
    Id,
    Name,
    ApiKey,
    -- ApiSecretは機密情報のため、最初と最後の4文字のみ表示
    CASE 
        WHEN LEN(ApiSecret) > 8 
        THEN LEFT(ApiSecret, 4) + '...' + RIGHT(ApiSecret, 4)
        ELSE '***'
    END AS ApiSecretPreview,
    AppUrl,
    RedirectUri,
    IsActive,
    UpdatedAt
FROM ShopifyApps
WHERE Id = 7;

-- ============================================================
-- ステップ4: コミット（問題がなければ実行）
-- ============================================================
-- 確認後、問題がなければ以下のコメントを外してコミットしてください
-- COMMIT TRANSACTION;

-- 問題がある場合は、以下のコメントを外してロールバックしてください
-- ROLLBACK TRANSACTION;

-- ============================================================
-- 補足: 全ShopifyAppsの状態を確認（参考用）
-- ============================================================
-- SELECT 
--     Id,
--     Name,
--     ApiKey,
--     CASE 
--         WHEN LEN(ApiSecret) > 8 
--         THEN LEFT(ApiSecret, 4) + '...' + RIGHT(ApiSecret, 4)
--         ELSE '***'
--     END AS ApiSecretPreview,
--     AppUrl,
--     RedirectUri,
--     IsActive,
--     UpdatedAt
-- FROM ShopifyApps
-- WHERE IsActive = 1
-- ORDER BY Id;
