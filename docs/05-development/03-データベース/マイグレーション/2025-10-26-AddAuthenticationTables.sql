-- 作成日: 2025-10-26
-- 作成者: Takashi (福田+AI)
-- 目的: 認証モード制御機能のためのテーブル追加
-- 影響: 新規テーブル2つ追加（DemoSessions, AuthenticationLogs）
-- 機能: デモモード認証とセキュリティ監査ログの管理

-- ======================================
-- 1. DemoSessions テーブル作成
-- ======================================
-- デモモード認証のセッション情報を管理
-- 分散環境対応のため、Redis + Database の両方で管理
CREATE TABLE DemoSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId NVARCHAR(255) NOT NULL UNIQUE,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL,
    LastAccessedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedBy NVARCHAR(255) NULL,
    
    -- インデックス
    INDEX IX_DemoSessions_SessionId (SessionId),
    INDEX IX_DemoSessions_ExpiresAt (ExpiresAt)
);
GO

-- ======================================
-- 2. AuthenticationLogs テーブル作成
-- ======================================
-- すべての認証試行を記録（セキュリティ監査用）
-- ブルートフォース攻撃検知とコンプライアンス対応
CREATE TABLE AuthenticationLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId NVARCHAR(255) NULL,
    AuthMode NVARCHAR(50) NOT NULL,          -- 'oauth', 'demo', 'dev'
    Success BIT NOT NULL,
    FailureReason NVARCHAR(255) NULL,
    IpAddress NVARCHAR(45) NULL,             -- IPv6対応（最大45文字）
    UserAgent NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- インデックス
    INDEX IX_AuthenticationLogs_CreatedAt (CreatedAt),
    INDEX IX_AuthenticationLogs_AuthMode (AuthMode)
);
GO

-- ======================================
-- 3. 初期データ確認用クエリ
-- ======================================
-- テーブル作成確認
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) AS ColumnCount
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_NAME IN ('DemoSessions', 'AuthenticationLogs')
ORDER BY TABLE_NAME;
GO

-- インデックス確認
SELECT 
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE OBJECT_NAME(i.object_id) IN ('DemoSessions', 'AuthenticationLogs')
ORDER BY TableName, IndexName, ic.key_ordinal;
GO

-- ======================================
-- ロールバック用スクリプト
-- ======================================
-- 本番環境でロールバックが必要な場合は以下を実行
-- （コメントアウトしています）

/*
-- AuthenticationLogs テーブル削除
DROP TABLE IF EXISTS AuthenticationLogs;
GO

-- DemoSessions テーブル削除
DROP TABLE IF EXISTS DemoSessions;
GO
*/

