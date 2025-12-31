-- ============================================================
-- ShopifyAppsテーブル 本番環境3環境の登録・更新スクリプト
-- ============================================================
-- 作成日: 2025-12-31
-- 作成者: 福田＋AI Assistant
-- 目的: 本番環境フロントエンド3環境のShopify Client IDを登録・更新
-- ============================================================

-- ============================================================
-- 1. Production1: EC Ranger（公開アプリ）
-- ============================================================
-- 既存レコードがある場合は更新、ない場合は新規登録
IF EXISTS (SELECT 1 FROM ShopifyApps WHERE ApiKey = 'b95377afd35e5c8f4b28d286d3ff3491')
BEGIN
    UPDATE ShopifyApps
    SET
        Name = 'EC Ranger',
        DisplayName = 'EC Ranger',
        AppType = 'Public',
        AppUrl = 'https://ec-ranger.access-net.co.jp',
        RedirectUri = 'https://ec-ranger.access-net.co.jp/auth/callback',
        IsActive = 1,
        UpdatedAt = GETUTCDATE()
    WHERE ApiKey = 'b95377afd35e5c8f4b28d286d3ff3491';
    
    PRINT 'Production1 (EC Ranger) を更新しました。';
END
ELSE
BEGIN
    INSERT INTO ShopifyApps (
        Name,
        DisplayName,
        AppType,
        ApiKey,
        ApiSecret,
        AppUrl,
        RedirectUri,
        Scopes,
        Description,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        'EC Ranger',
        'EC Ranger',
        'Public',
        'b95377afd35e5c8f4b28d286d3ff3491',
        '[GitHub Secrets: SHOPIFY_API_SECRET_PRODUCTION から取得]', -- TODO: 実際のSecretに置き換える
        'https://ec-ranger.access-net.co.jp',
        'https://ec-ranger.access-net.co.jp/auth/callback',
        'read_orders,read_products,read_customers',
        'Production1: EC Ranger（公開アプリ）',
        1,
        GETUTCDATE(),
        GETUTCDATE()
    );
    
    PRINT 'Production1 (EC Ranger) を新規登録しました。';
END

-- ============================================================
-- 2. Production2: EC Ranger-xn-fbkq6e5da0fpb（カスタムアプリ）
-- ============================================================
IF EXISTS (SELECT 1 FROM ShopifyApps WHERE ApiKey = '706a757915dedce54806c0a179bee05d')
BEGIN
    UPDATE ShopifyApps
    SET
        Name = 'EC Ranger-xn-fbkq6e5da0fpb',
        DisplayName = 'EC Ranger-xn-fbkq6e5da0fpb',
        AppType = 'Custom',
        AppUrl = 'https://black-flower-004e1de00.2.azurestaticapps.net',
        RedirectUri = 'https://black-flower-004e1de00.2.azurestaticapps.net/auth/callback',
        IsActive = 1,
        UpdatedAt = GETUTCDATE()
    WHERE ApiKey = '706a757915dedce54806c0a179bee05d';
    
    PRINT 'Production2 (EC Ranger-xn-fbkq6e5da0fpb) を更新しました。';
END
ELSE
BEGIN
    INSERT INTO ShopifyApps (
        Name,
        DisplayName,
        AppType,
        ApiKey,
        ApiSecret,
        AppUrl,
        RedirectUri,
        Scopes,
        Description,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        'EC Ranger-xn-fbkq6e5da0fpb',
        'EC Ranger-xn-fbkq6e5da0fpb',
        'Custom',
        '706a757915dedce54806c0a179bee05d',
        '[GitHub Secrets: SHOPIFY_API_SECRET_PRODUCTION_2 から取得]', -- TODO: 実際のSecretに置き換える
        'https://black-flower-004e1de00.2.azurestaticapps.net',
        'https://black-flower-004e1de00.2.azurestaticapps.net/auth/callback',
        'read_orders,read_products,read_customers',
        'Production2: EC Ranger-xn-fbkq6e5da0fpb（カスタムアプリ）',
        1,
        GETUTCDATE(),
        GETUTCDATE()
    );
    
    PRINT 'Production2 (EC Ranger-xn-fbkq6e5da0fpb) を新規登録しました。';
END

-- ============================================================
-- 3. Production3: EC Ranger-demo（カスタムアプリ）
-- ============================================================
IF EXISTS (SELECT 1 FROM ShopifyApps WHERE ApiKey = '23f81e22074df1b71fb0a5a495778f49')
BEGIN
    UPDATE ShopifyApps
    SET
        Name = 'EC Ranger-demo',
        DisplayName = 'EC Ranger-demo',
        AppType = 'Custom',
        AppUrl = 'https://ashy-plant-01b5c4100.1.azurestaticapps.net',
        RedirectUri = 'https://ashy-plant-01b5c4100.1.azurestaticapps.net/auth/callback',
        IsActive = 1,
        UpdatedAt = GETUTCDATE()
    WHERE ApiKey = '23f81e22074df1b71fb0a5a495778f49';
    
    PRINT 'Production3 (EC Ranger-demo) を更新しました。';
END
ELSE
BEGIN
    INSERT INTO ShopifyApps (
        Name,
        DisplayName,
        AppType,
        ApiKey,
        ApiSecret,
        AppUrl,
        RedirectUri,
        Scopes,
        Description,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES (
        'EC Ranger-demo',
        'EC Ranger-demo',
        'Custom',
        '23f81e22074df1b71fb0a5a495778f49',
        '[GitHub Secrets: SHOPIFY_API_SECRET_PRODUCTION_3 から取得]', -- TODO: 実際のSecretに置き換える
        'https://ashy-plant-01b5c4100.1.azurestaticapps.net',
        'https://ashy-plant-01b5c4100.1.azurestaticapps.net/auth/callback',
        'read_orders,read_products,read_customers',
        'Production3: EC Ranger-demo（カスタムアプリ）',
        1,
        GETUTCDATE(),
        GETUTCDATE()
    );
    
    PRINT 'Production3 (EC Ranger-demo) を新規登録しました。';
END

-- ============================================================
-- 4. 登録結果の確認
-- ============================================================
SELECT 
    Id,
    Name,
    DisplayName,
    AppType,
    ApiKey,
    AppUrl,
    RedirectUri,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM ShopifyApps
WHERE ApiKey IN (
    'b95377afd35e5c8f4b28d286d3ff3491',  -- Production1: EC Ranger
    '706a757915dedce54806c0a179bee05d',  -- Production2: EC Ranger-xn-fbkq6e5da0fpb
    '23f81e22074df1b71fb0a5a495778f49'   -- Production3: EC Ranger-demo
)
ORDER BY 
    CASE ApiKey
        WHEN 'b95377afd35e5c8f4b28d286d3ff3491' THEN 1  -- Production1
        WHEN '706a757915dedce54806c0a179bee05d' THEN 2  -- Production2
        WHEN '23f81e22074df1b71fb0a5a495778f49' THEN 3   -- Production3
        ELSE 4
    END;

PRINT '============================================================';
PRINT 'ShopifyAppsテーブルの更新が完了しました。';
PRINT '============================================================';
PRINT '';
PRINT '【重要】ApiSecretは手動で更新してください：';
PRINT '  - Production1: GitHub Secrets の SHOPIFY_API_SECRET_PRODUCTION';
PRINT '  - Production2: GitHub Secrets の SHOPIFY_API_SECRET_PRODUCTION_2';
PRINT '  - Production3: GitHub Secrets の SHOPIFY_API_SECRET_PRODUCTION_3';
PRINT '';
