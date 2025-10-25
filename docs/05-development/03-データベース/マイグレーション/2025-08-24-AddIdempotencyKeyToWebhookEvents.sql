-- 目的: WebhookEvents に IdempotencyKey を追加し、重複受信の冪等性を担保
-- 作成日: 2025-08-24
-- 作成者: ERIS

IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE object_id = OBJECT_ID('WebhookEvents') AND name = 'IdempotencyKey')
BEGIN
  ALTER TABLE WebhookEvents ADD IdempotencyKey NVARCHAR(255) NULL;
END

-- フィルタ付き一意インデックス（NULLは許容）
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes 
  WHERE name = 'UX_WebhookEvents_IdempotencyKey' AND object_id = OBJECT_ID('WebhookEvents'))
BEGIN
  CREATE UNIQUE INDEX UX_WebhookEvents_IdempotencyKey
    ON WebhookEvents(IdempotencyKey)
    WHERE IdempotencyKey IS NOT NULL;
END

