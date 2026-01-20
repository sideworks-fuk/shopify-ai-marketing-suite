-- 作成日: 2026-01-15
-- 作成者: 福田＋AI Assistant
-- 目的: StoreId 17 の機能ロック解除（有料プラン扱いに設定）
-- 影響: StoreSubscriptions の状態更新（データ更新のみ、スキーマ変更なし）

-- === 変更対象の設定 ===
DECLARE @StoreId INT = 17;
DECLARE @PaidPlanName NVARCHAR(100) = 'Professional';

-- === 事前確認 ===
SELECT TOP 5 * 
FROM SubscriptionPlans
ORDER BY Id;

SELECT TOP 5 *
FROM StoreSubscriptions
WHERE StoreId = @StoreId
ORDER BY CreatedAt DESC;

-- === 有料プランIDの取得 ===
DECLARE @PlanId INT;
SELECT TOP 1 @PlanId = Id
FROM SubscriptionPlans
WHERE Name = @PaidPlanName AND IsActive = 1;

IF @PlanId IS NULL
BEGIN
    RAISERROR('有効なプランが見つかりません。@PaidPlanName を確認してください。', 16, 1);
    RETURN;
END

-- === 既存サブスクリプションの更新（存在しない場合は追加） ===
IF EXISTS (SELECT 1 FROM StoreSubscriptions WHERE StoreId = @StoreId)
BEGIN
    UPDATE StoreSubscriptions
    SET
        PlanId = @PlanId,
        Status = 'active',
        TrialEndsAt = NULL,
        ActivatedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE Id = (
        SELECT TOP 1 Id
        FROM StoreSubscriptions
        WHERE StoreId = @StoreId
        ORDER BY CreatedAt DESC
    );
END
ELSE
BEGIN
    INSERT INTO StoreSubscriptions
    (
        StoreId,
        PlanId,
        Status,
        TrialEndsAt,
        CurrentPeriodEnd,
        ActivatedAt,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        @StoreId,
        @PlanId,
        'active',
        NULL,
        DATEADD(DAY, 30, SYSUTCDATETIME()),
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
END

-- === PlanName カラムが存在する場合のみ補完 ===
IF COL_LENGTH('dbo.StoreSubscriptions', 'PlanName') IS NOT NULL
BEGIN
    UPDATE StoreSubscriptions
    SET PlanName = @PaidPlanName
    WHERE StoreId = @StoreId
      AND (PlanName IS NULL OR PlanName = '');
END

-- === 事後確認 ===
SELECT TOP 5 *
FROM StoreSubscriptions
WHERE StoreId = @StoreId
ORDER BY CreatedAt DESC;

-- 注意:
-- - FeatureAccessMiddleware はキャッシュを最大5分保持します。
--   反映が遅い場合はAPI再起動、もしくは5分経過後に再確認してください。
