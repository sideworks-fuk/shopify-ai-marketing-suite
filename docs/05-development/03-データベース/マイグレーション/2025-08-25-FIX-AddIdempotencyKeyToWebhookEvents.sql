-- 修正版: WebhookEvents に IdempotencyKey を追加
-- 作成日: 2025-08-25
-- 作成者: Kenji
-- 修正理由: インデックス作成時のエラーを回避

-- まず、カラムが存在しない場合のみ追加
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE object_id = OBJECT_ID('WebhookEvents') AND name = 'IdempotencyKey')
BEGIN
  ALTER TABLE WebhookEvents ADD IdempotencyKey NVARCHAR(255) NULL;
  PRINT 'IdempotencyKey column added to WebhookEvents table'
END
ELSE
BEGIN
  PRINT 'IdempotencyKey column already exists in WebhookEvents table'
END
GO

-- インデックスが存在しない場合のみ作成
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes 
  WHERE name = 'UX_WebhookEvents_IdempotencyKey' AND object_id = OBJECT_ID('WebhookEvents'))
BEGIN
  -- カラムが確実に存在することを確認してからインデックスを作成
  IF EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('WebhookEvents') AND name = 'IdempotencyKey')
  BEGIN
    CREATE UNIQUE INDEX UX_WebhookEvents_IdempotencyKey
      ON WebhookEvents(IdempotencyKey)
      WHERE IdempotencyKey IS NOT NULL;
    PRINT 'Unique index UX_WebhookEvents_IdempotencyKey created'
  END
END
ELSE
BEGIN
  PRINT 'Index UX_WebhookEvents_IdempotencyKey already exists'
END
GO

PRINT 'Migration completed successfully: IdempotencyKey added to WebhookEvents'