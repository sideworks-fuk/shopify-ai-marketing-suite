# Takashiへの作業指示（同期範囲管理機能追加）
**日付:** 2025年8月12日（月）22:45  
**差出人:** Kenji

## 📢 重要：新しい設計仕様書を作成しました！

データ同期範囲管理の詳細設計を完了しました。
明日の実装で参照してください。

### 📚 新規設計ドキュメント
1. **データ同期設計仕様書（更新）**
   - `/docs/04-development/data-sync-design-specification.md`
   - セクション11：UI要件追加
   - データ取得範囲設定機能を追加

2. **同期範囲管理仕様書（新規）**
   - `/docs/04-development/sync-range-management.md`
   - データベース設計
   - チェックポイント管理
   - 進捗詳細追跡

## 🆕 明日追加で実装するテーブル

### 1. SyncRangeSettings（同期範囲設定）
```sql
CREATE TABLE SyncRangeSettings (
    SettingId INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    DataType NVARCHAR(50) NOT NULL,
    StartDate DATETIME2 NOT NULL,    -- データ取得開始日
    EndDate DATETIME2 NOT NULL,      -- データ取得終了日
    YearsBack INT NOT NULL DEFAULT 3, -- 何年前まで遡るか
    IncludeArchived BIT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(100),
    
    CONSTRAINT FK_SyncRangeSettings_Store FOREIGN KEY (StoreId) 
        REFERENCES Stores(StoreId)
);
```

### 2. SyncProgressDetails（進捗詳細）
```sql
CREATE TABLE SyncProgressDetails (
    ProgressId INT PRIMARY KEY IDENTITY(1,1),
    SyncStateId INT NOT NULL,
    DataType NVARCHAR(50) NOT NULL,
    CurrentPage NVARCHAR(MAX),       -- 現在のカーソル位置
    CurrentBatch INT DEFAULT 0,
    TotalBatches INT NULL,
    BatchStartedAt DATETIME2,
    LastUpdateAt DATETIME2 DEFAULT GETUTCDATE(),
    EstimatedCompletionTime DATETIME2 NULL,
    RecordsPerSecond FLOAT,          -- 処理速度
    AverageResponseTime INT,         -- API応答時間
    RecordsInDateRange INT,          -- 指定期間内のレコード数
    RecordsSkipped INT DEFAULT 0,
    RecordsWithErrors INT DEFAULT 0,
    
    CONSTRAINT FK_SyncProgressDetails_SyncState FOREIGN KEY (SyncStateId) 
        REFERENCES SyncStates(SyncStateId) ON DELETE CASCADE
);
```

### 3. SyncCheckpoints（チェックポイント）
```sql
CREATE TABLE SyncCheckpoints (
    CheckpointId INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    DataType NVARCHAR(50) NOT NULL,
    LastSuccessfulCursor NVARCHAR(MAX),
    LastProcessedDate DATETIME2,
    RecordsProcessedSoFar INT,
    SyncStartDate DATETIME2,
    SyncEndDate DATETIME2,
    CanResume BIT DEFAULT 1,
    ExpiresAt DATETIME2,              -- 有効期限（7日後）
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_SyncCheckpoints_Store FOREIGN KEY (StoreId) 
        REFERENCES Stores(StoreId)
);
```

## 📝 InitialSyncJobの実装更新

### 同期範囲オプションの追加
```csharp
public class InitialSyncOptions
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int MaxYearsBack { get; set; } = 3; // デフォルト3年
    public bool IncludeArchived { get; set; } = false;
}

public class InitialSyncJob : BaseSyncJob
{
    private readonly CheckpointManager _checkpointManager;
    private readonly SyncRangeManager _rangeManager;
    private readonly SyncProgressTracker _progressTracker;
    
    public async Task Execute(int storeId, InitialSyncOptions options = null)
    {
        options ??= new InitialSyncOptions();
        
        // 1. 同期範囲を決定
        var dateRange = await _rangeManager.DetermineSyncRange(
            storeId, "Products", options);
        
        // 2. 再開可能かチェック
        var resumeInfo = await _checkpointManager.GetResumeInfo(
            storeId, "Products");
        
        var startCursor = resumeInfo?.LastCursor;
        var recordsProcessed = resumeInfo?.RecordsAlreadyProcessed ?? 0;
        
        // 3. 同期実行（チェックポイント保存付き）
        await SyncProductsWithCheckpoints(
            storeId, 
            dateRange, 
            startCursor, 
            recordsProcessed);
    }
    
    private async Task SyncProductsWithCheckpoints(
        int storeId,
        DateRange range,
        string startCursor,
        int startingRecords)
    {
        var cursor = startCursor;
        var totalProcessed = startingRecords;
        
        while (true)
        {
            try
            {
                // APIコール
                var result = await _shopifyApi.GetProducts(
                    storeId, 
                    cursor,
                    range.Start,
                    range.End);
                
                // データ保存
                await SaveProducts(result.Products);
                totalProcessed += result.Products.Count;
                
                // 進捗更新
                await _progressTracker.UpdateProgress(
                    syncStateId,
                    "Products",
                    totalProcessed,
                    result.NextPageCursor);
                
                // チェックポイント保存（1000件ごと）
                if (totalProcessed % 1000 == 0)
                {
                    await _checkpointManager.SaveCheckpoint(
                        storeId,
                        "Products",
                        result.NextPageCursor,
                        totalProcessed,
                        range);
                }
                
                if (string.IsNullOrEmpty(result.NextPageCursor))
                    break;
                    
                cursor = result.NextPageCursor;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, 
                    "同期エラー発生。チェックポイントから再開可能。" +
                    "StoreId={StoreId} Cursor={Cursor}",
                    storeId, cursor);
                throw;
            }
        }
        
        // 完了後、チェックポイントをクリア
        await _checkpointManager.ClearCheckpoint(storeId, "Products");
    }
}
```

## 🔧 新規クラスの作成

### 1. SyncRangeManager.cs
- 同期範囲の決定ロジック
- 設定の保存と取得

### 2. CheckpointManager.cs
- チェックポイントの保存
- 再開情報の取得
- 期限切れデータのクリーンアップ

### 3. SyncProgressTracker.cs
- 詳細な進捗追跡
- パフォーマンス指標の計算
- 完了予定時刻の推定

## ✅ 実装チェックリスト（明日）

### データベース
- [ ] 3つの新規テーブル作成マイグレーション
- [ ] インデックスの追加
- [ ] SyncStatesテーブルの更新（カラム追加）

### 初回同期の拡張
- [ ] InitialSyncOptionsクラス作成
- [ ] 日付範囲でのフィルタリング実装
- [ ] Shopify APIへの日付パラメータ追加

### チェックポイント機能
- [ ] CheckpointManagerクラス実装
- [ ] 1000件ごとの自動保存
- [ ] 再開ロジックの実装

### 進捗追跡
- [ ] SyncProgressTrackerクラス実装
- [ ] 処理速度の計算
- [ ] 完了予定時刻の推定

### API更新
- [ ] 同期開始時の範囲指定オプション追加
- [ ] 詳細進捗取得エンドポイント追加
- [ ] チェックポイント状態確認エンドポイント

## 💡 実装のポイント

1. **パフォーマンス考慮**
   - チェックポイント保存は非同期で
   - バッチ処理でDB書き込み最適化

2. **エラー処理**
   - 一時的エラーは自動リトライ
   - 永続的エラーはチェックポイント保持

3. **ユーザビリティ**
   - 進捗をリアルタイムで更新
   - 中断時も安心できるUI表示

## 📅 スケジュール調整

### 8月13日（火）の優先順位
1. **9:00-10:00**: 新規テーブル作成
2. **10:00-12:00**: InitialSyncJob拡張（範囲指定対応）
3. **13:00-14:30**: CheckpointManager実装
4. **14:30-16:00**: SyncProgressTracker実装
5. **16:00-17:00**: テスト作成
6. **17:00-18:00**: Yukiとの連携確認

---

設計仕様書を必ず確認して、仕様通りに実装をお願いします！
特にチェックポイント機能は、大量データ処理で重要になります。

頑張ってください！

Kenji