-- Storesテーブルに動的ストア選択用のカラムを追加
-- 実行日: 2025-01-27

-- 1. 新しいカラムを追加
ALTER TABLE Stores ADD Description NVARCHAR(500) NULL;
ALTER TABLE Stores ADD DataType NVARCHAR(50) NOT NULL DEFAULT 'production';
ALTER TABLE Stores ADD IsActive BIT NOT NULL DEFAULT 1;
ALTER TABLE Stores ADD Settings NVARCHAR(MAX) NULL;

-- 2. 既存データの更新
UPDATE Stores 
SET Description = N'実データを使用したメイン分析環境', 
    DataType = 'production',
    IsActive = 1
WHERE Id = 1;

-- 3. テストストアとデモストアを追加
INSERT INTO Stores (Name, Description, DataType, IsActive, CreatedAt, UpdatedAt)
VALUES 
    (N'テストストア', N'2020-2025年のテストデータ環境', 'test', 1, GETUTCDATE(), GETUTCDATE()),
    (N'デモストア', N'デモンストレーション用環境', 'test', 1, GETUTCDATE(), GETUTCDATE());

-- 4. 確認クエリ
SELECT Id, Name, Description, DataType, IsActive FROM Stores ORDER BY Id;