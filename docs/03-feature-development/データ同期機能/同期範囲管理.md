# データ同期範囲管理仕様書

**作成日:** 2025年8月12日  
**作成者:** Kenji（AIプロジェクトマネージャー）  
**バージョン:** 1.0.0

## 1. 概要

Shopifyデータ同期において、データ取得範囲の管理と進捗状況の詳細な追跡を実現する仕様を定義します。

## 2. ビジネス要件

### 2.1 なぜデータ範囲管理が必要か

1. **パフォーマンス最適化**
   - 全期間のデータ取得は時間がかかる
   - 不要な古いデータの取得を避ける

2. **段階的なデータ移行**
   - まず直近1年から始めて、必要に応じて拡張
   - リスクを最小化

3. **コスト管理**
   - API呼び出し回数の削減
   - ストレージコストの最適化

4. **ユーザビリティ**
   - ユーザーが必要な期間を選択
   - 進捗の可視化

## 3. データベース設計

### 3.1 同期範囲管理テーブル

```sql
-- 同期範囲設定テーブル
CREATE TABLE SyncRangeSettings (
    SettingId INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    DataType NVARCHAR(50) NOT NULL, -- 'Products', 'Customers', 'Orders'
    StartDate DATETIME2 NOT NULL,    -- データ取得開始日
    EndDate DATETIME2 NOT NULL,      -- データ取得終了日
    YearsBack INT NOT NULL DEFAULT 3, -- 何年前まで遡るか
    IncludeArchived BIT DEFAULT 0,   -- アーカイブ済みデータを含むか
    IsActive BIT DEFAULT 1,          -- この設定が有効か
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(100),         -- 設定を作成したユーザー
    
    CONSTRAINT FK_SyncRangeSettings_Store FOREIGN KEY (StoreId) 
        REFERENCES Stores(StoreId),
    INDEX IX_SyncRangeSettings_StoreId_DataType (StoreId, DataType)
);

-- 同期進捗詳細テーブル
CREATE TABLE SyncProgressDetails (
    ProgressId INT PRIMARY KEY IDENTITY(1,1),
    SyncStateId INT NOT NULL,        -- SyncStatesテーブルへの参照
    DataType NVARCHAR(50) NOT NULL,
    
    -- 進捗情報
    CurrentPage NVARCHAR(MAX),       -- 現在処理中のページ/カーソル
    CurrentBatch INT DEFAULT 0,      -- 現在のバッチ番号
    TotalBatches INT NULL,           -- 総バッチ数（推定）
    
    -- 時間情報
    BatchStartedAt DATETIME2,        -- 現在のバッチ開始時刻
    LastUpdateAt DATETIME2 DEFAULT GETUTCDATE(),
    EstimatedCompletionTime DATETIME2 NULL, -- 完了予定時刻
    
    -- パフォーマンス指標
    RecordsPerSecond FLOAT,          -- 処理速度
    AverageResponseTime INT,         -- 平均API応答時間（ミリ秒）
    
    -- データ統計
    RecordsInDateRange INT,          -- 指定期間内のレコード数
    RecordsSkipped INT DEFAULT 0,    -- スキップされたレコード数
    RecordsWithErrors INT DEFAULT 0, -- エラーがあったレコード数
    
    CONSTRAINT FK_SyncProgressDetails_SyncState FOREIGN KEY (SyncStateId) 
        REFERENCES SyncStates(SyncStateId) ON DELETE CASCADE,
    INDEX IX_SyncProgressDetails_SyncStateId (SyncStateId)
);

-- 同期チェックポイントテーブル（中断・再開用）
CREATE TABLE SyncCheckpoints (
    CheckpointId INT PRIMARY KEY IDENTITY(1,1),
    StoreId INT NOT NULL,
    DataType NVARCHAR(50) NOT NULL,
    
    -- チェックポイント情報
    LastSuccessfulCursor NVARCHAR(MAX), -- 最後に成功したカーソル位置
    LastProcessedDate DATETIME2,        -- 最後に処理したデータの日付
    RecordsProcessedSoFar INT,          -- これまでに処理したレコード数
    
    -- 範囲情報
    SyncStartDate DATETIME2,             -- 同期対象の開始日
    SyncEndDate DATETIME2,               -- 同期対象の終了日
    
    -- ステータス
    CanResume BIT DEFAULT 1,            -- 再開可能かどうか
    ExpiresAt DATETIME2,                 -- チェックポイントの有効期限
    
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_SyncCheckpoints_Store FOREIGN KEY (StoreId) 
        REFERENCES Stores(StoreId),
    INDEX IX_SyncCheckpoints_StoreId_DataType (StoreId, DataType),
    INDEX IX_SyncCheckpoints_ExpiresAt (ExpiresAt)
);
```

## 4. 実装仕様

### 4.1 同期範囲の決定ロジック

```csharp
public class SyncRangeManager
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<SyncRangeManager> _logger;
    
    public async Task<DateRange> DetermineSyncRange(
        int storeId, 
        string dataType,
        InitialSyncOptions options = null)
    {
        // 1. 既存の設定を確認
        var existingSettings = await _context.SyncRangeSettings
            .Where(s => s.StoreId == storeId && 
                       s.DataType == dataType && 
                       s.IsActive)
            .FirstOrDefaultAsync();
        
        if (existingSettings != null)
        {
            return new DateRange
            {
                Start = existingSettings.StartDate,
                End = existingSettings.EndDate
            };
        }
        
        // 2. オプションから範囲を決定
        options ??= new InitialSyncOptions();
        var endDate = options.EndDate ?? DateTime.UtcNow;
        var startDate = options.StartDate ?? 
            endDate.AddYears(-options.MaxYearsBack);
        
        // 3. 設定を保存
        var newSettings = new SyncRangeSettings
        {
            StoreId = storeId,
            DataType = dataType,
            StartDate = startDate,
            EndDate = endDate,
            YearsBack = options.MaxYearsBack,
            IncludeArchived = options.IncludeArchived
        };
        
        _context.SyncRangeSettings.Add(newSettings);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation(
            "同期範囲設定 StoreId={StoreId} DataType={DataType} " +
            "Range={StartDate:yyyy-MM-dd}〜{EndDate:yyyy-MM-dd}",
            storeId, dataType, startDate, endDate);
        
        return new DateRange { Start = startDate, End = endDate };
    }
}
```

### 4.2 進捗追跡の実装

```csharp
public class SyncProgressTracker
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<SyncProgressTracker> _logger;
    private readonly Dictionary<int, ProgressCalculator> _calculators;
    
    public async Task UpdateProgress(
        int syncStateId,
        string dataType,
        int recordsProcessed,
        string currentCursor = null)
    {
        var progressDetail = await _context.SyncProgressDetails
            .FirstOrDefaultAsync(p => p.SyncStateId == syncStateId);
        
        if (progressDetail == null)
        {
            progressDetail = new SyncProgressDetails
            {
                SyncStateId = syncStateId,
                DataType = dataType
            };
            _context.SyncProgressDetails.Add(progressDetail);
        }
        
        // 進捗情報を更新
        progressDetail.CurrentPage = currentCursor;
        progressDetail.LastUpdateAt = DateTime.UtcNow;
        
        // パフォーマンス指標を計算
        if (progressDetail.BatchStartedAt != null)
        {
            var elapsed = DateTime.UtcNow - progressDetail.BatchStartedAt.Value;
            progressDetail.RecordsPerSecond = 
                recordsProcessed / elapsed.TotalSeconds;
            
            // 完了予定時刻を推定
            var syncState = await _context.SyncStates
                .FindAsync(syncStateId);
            
            if (syncState?.TotalRecords > 0)
            {
                var remainingRecords = syncState.TotalRecords.Value - 
                                     syncState.RecordsProcessed;
                var estimatedSeconds = remainingRecords / 
                                     progressDetail.RecordsPerSecond;
                progressDetail.EstimatedCompletionTime = 
                    DateTime.UtcNow.AddSeconds(estimatedSeconds);
            }
        }
        
        await _context.SaveChangesAsync();
        
        // リアルタイム通知（SignalR経由）
        await NotifyProgress(syncStateId, progressDetail);
    }
    
    public async Task<SyncProgressInfo> GetDetailedProgress(
        int storeId, 
        string dataType)
    {
        var syncState = await _context.SyncStates
            .Where(s => s.StoreId == storeId && 
                       s.DataType == dataType &&
                       s.Status == "Running")
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync();
        
        if (syncState == null)
            return null;
        
        var progressDetail = await _context.SyncProgressDetails
            .FirstOrDefaultAsync(p => p.SyncStateId == syncState.SyncStateId);
        
        var checkpoint = await _context.SyncCheckpoints
            .Where(c => c.StoreId == storeId && c.DataType == dataType)
            .OrderByDescending(c => c.UpdatedAt)
            .FirstOrDefaultAsync();
        
        return new SyncProgressInfo
        {
            Status = syncState.Status,
            RecordsProcessed = syncState.RecordsProcessed,
            TotalRecords = syncState.TotalRecords,
            ProgressPercentage = syncState.TotalRecords > 0 
                ? (float)syncState.RecordsProcessed / syncState.TotalRecords * 100 
                : 0,
            CurrentCursor = progressDetail?.CurrentPage,
            RecordsPerSecond = progressDetail?.RecordsPerSecond ?? 0,
            EstimatedCompletionTime = progressDetail?.EstimatedCompletionTime,
            DataRange = new
            {
                StartDate = syncState.DataStartDate,
                EndDate = syncState.DataEndDate,
                RecordsInRange = progressDetail?.RecordsInDateRange ?? 0
            },
            CanResume = checkpoint?.CanResume ?? false,
            LastCheckpoint = checkpoint?.LastProcessedDate
        };
    }
}
```

### 4.3 チェックポイント管理

```csharp
public class CheckpointManager
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<CheckpointManager> _logger;
    
    public async Task SaveCheckpoint(
        int storeId,
        string dataType,
        string cursor,
        int recordsProcessed,
        DateRange syncRange)
    {
        var checkpoint = await _context.SyncCheckpoints
            .FirstOrDefaultAsync(c => c.StoreId == storeId && 
                                     c.DataType == dataType);
        
        if (checkpoint == null)
        {
            checkpoint = new SyncCheckpoints
            {
                StoreId = storeId,
                DataType = dataType
            };
            _context.SyncCheckpoints.Add(checkpoint);
        }
        
        checkpoint.LastSuccessfulCursor = cursor;
        checkpoint.LastProcessedDate = DateTime.UtcNow;
        checkpoint.RecordsProcessedSoFar = recordsProcessed;
        checkpoint.SyncStartDate = syncRange.Start;
        checkpoint.SyncEndDate = syncRange.End;
        checkpoint.ExpiresAt = DateTime.UtcNow.AddDays(7); // 7日間有効
        checkpoint.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        _logger.LogDebug(
            "チェックポイント保存 StoreId={StoreId} DataType={DataType} " +
            "Records={Records} Cursor={Cursor}",
            storeId, dataType, recordsProcessed, cursor?.Substring(0, 20));
    }
    
    public async Task<ResumeInfo> GetResumeInfo(
        int storeId,
        string dataType)
    {
        var checkpoint = await _context.SyncCheckpoints
            .Where(c => c.StoreId == storeId && 
                       c.DataType == dataType &&
                       c.CanResume &&
                       c.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(c => c.UpdatedAt)
            .FirstOrDefaultAsync();
        
        if (checkpoint == null)
            return null;
        
        return new ResumeInfo
        {
            CanResume = true,
            LastCursor = checkpoint.LastSuccessfulCursor,
            RecordsAlreadyProcessed = checkpoint.RecordsProcessedSoFar,
            SyncRange = new DateRange
            {
                Start = checkpoint.SyncStartDate,
                End = checkpoint.SyncEndDate
            },
            LastProcessedDate = checkpoint.LastProcessedDate
        };
    }
    
    public async Task ClearCheckpoint(int storeId, string dataType)
    {
        var checkpoints = await _context.SyncCheckpoints
            .Where(c => c.StoreId == storeId && c.DataType == dataType)
            .ToListAsync();
        
        _context.SyncCheckpoints.RemoveRange(checkpoints);
        await _context.SaveChangesAsync();
    }
}
```

## 5. UI実装ガイド

### 5.1 同期範囲選択コンポーネント

```typescript
// components/sync/SyncRangeSelector.tsx
import { useState } from 'react';
import { Calendar, Clock, Database } from 'lucide-react';

interface SyncRangeProps {
  onRangeSelected: (range: SyncRange) => void;
  estimatedRecords?: RecordEstimates;
}

interface RecordEstimates {
  products: number;
  customers: number;
  orders: number;
  totalSizeGB: number;
}

export function SyncRangeSelector({ onRangeSelected, estimatedRecords }: SyncRangeProps) {
  const [preset, setPreset] = useState<string>('3years');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  
  const presets = [
    { value: '1year', label: '過去1年', years: 1 },
    { value: '2years', label: '過去2年', years: 2 },
    { value: '3years', label: '過去3年（推奨）', years: 3 },
    { value: '5years', label: '過去5年', years: 5 },
    { value: 'all', label: '全期間', years: null },
    { value: 'custom', label: 'カスタム期間', years: null }
  ];
  
  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      const preset = presets.find(p => p.value === value);
      if (preset?.years) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - preset.years);
        onRangeSelected({ startDate, endDate, preset: value });
      }
    }
  };
  
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">データ取得範囲の選択</h3>
        </div>
        
        <RadioGroup value={preset} onValueChange={handlePresetChange}>
          {presets.map((p) => (
            <div key={p.value} className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value={p.value} id={p.value} />
              <Label htmlFor={p.value} className="flex-1 cursor-pointer">
                <span>{p.label}</span>
                {p.value === '3years' && (
                  <Badge variant="outline" className="ml-2">推奨</Badge>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
        
        {preset === 'custom' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <DateRangePicker
              onChange={setCustomRange}
              maxDate={new Date()}
            />
          </div>
        )}
        
        {estimatedRecords && (
          <Alert className="mt-4">
            <Database className="w-4 h-4" />
            <AlertTitle>推定データ量</AlertTitle>
            <AlertDescription>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                <div>商品: {estimatedRecords.products.toLocaleString()}件</div>
                <div>顧客: {estimatedRecords.customers.toLocaleString()}件</div>
                <div>注文: {estimatedRecords.orders.toLocaleString()}件</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                推定サイズ: {estimatedRecords.totalSizeGB.toFixed(2)} GB
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">初回同期のヒント</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• まず過去1-3年のデータから始めることを推奨</li>
              <li>• 必要に応じて後から過去データを追加取得可能</li>
              <li>• 大量データの場合、夜間実行を推奨</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

### 5.2 詳細進捗表示コンポーネント

```typescript
// components/sync/DetailedProgress.tsx
export function DetailedProgress({ storeId }: { storeId: string }) {
  const { data: progress, loading } = useApi(
    () => syncApi.getDetailedProgress(storeId),
    [storeId]
  );
  
  if (loading) return <Skeleton className="h-48" />;
  if (!progress) return null;
  
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">同期進捗詳細</h3>
          {progress.canResume && (
            <Badge variant="outline" className="bg-green-50">
              再開可能
            </Badge>
          )}
        </div>
        
        {/* 全体進捗 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>全体進捗</span>
            <span className="font-medium">
              {progress.progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress.progressPercentage} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {progress.recordsProcessed.toLocaleString()} / 
              {progress.totalRecords?.toLocaleString() || '計算中...'}
            </span>
            <span>
              {progress.recordsPerSecond.toFixed(1)} レコード/秒
            </span>
          </div>
        </div>
        
        {/* データ範囲 */}
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-sm font-medium mb-1">取得範囲</div>
          <div className="text-xs text-gray-600">
            {formatDate(progress.dataRange.startDate)} 〜 
            {formatDate(progress.dataRange.endDate)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            範囲内レコード数: {progress.dataRange.recordsInRange.toLocaleString()}件
          </div>
        </div>
        
        {/* 完了予定時刻 */}
        {progress.estimatedCompletionTime && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              完了予定: {formatTime(progress.estimatedCompletionTime)}
              （残り{formatDuration(getTimeRemaining(progress.estimatedCompletionTime))}）
            </span>
          </div>
        )}
        
        {/* 最終チェックポイント */}
        {progress.lastCheckpoint && (
          <div className="text-xs text-gray-500">
            最終チェックポイント: {formatTime(progress.lastCheckpoint)}
          </div>
        )}
      </div>
    </Card>
  );
}
```

## 6. 運用ガイドライン

### 6.1 推奨される同期範囲

| ストア規模 | 推奨初回同期範囲 | 理由 |
|----------|--------------|------|
| 小規模（<1万件） | 全期間 | データ量が少ないため問題なし |
| 中規模（1-10万件） | 過去3年 | バランスが良い |
| 大規模（>10万件） | 過去1年 | まず最新データから |

### 6.2 チェックポイント戦略

- **保存頻度**: 1000レコードごと、または5分ごと
- **有効期限**: 7日間（それ以降は最初から）
- **自動クリーンアップ**: 完了後24時間で削除

### 6.3 エラー時の対応

1. **一時的エラー**: チェックポイントから自動再開
2. **永続的エラー**: 管理者に通知、手動介入要
3. **データ不整合**: ロールバック機能提供

## 7. パフォーマンス考慮事項

### 7.1 インデックス戦略

```sql
-- 頻繁にアクセスされるクエリ用のインデックス
CREATE INDEX IX_SyncStates_StoreId_Status_DataType 
    ON SyncStates(StoreId, Status, DataType) 
    INCLUDE (RecordsProcessed, TotalRecords);

CREATE INDEX IX_SyncProgressDetails_LastUpdateAt 
    ON SyncProgressDetails(LastUpdateAt DESC) 
    WHERE EstimatedCompletionTime IS NOT NULL;
```

### 7.2 クリーンアップジョブ

```csharp
// 定期的な古いデータのクリーンアップ
RecurringJob.AddOrUpdate<CleanupJob>(
    "cleanup-old-sync-data",
    job => job.Execute(),
    Cron.Daily(2)); // 毎日午前2時

public class CleanupJob
{
    public async Task Execute()
    {
        // 30日以上前の完了した同期履歴を削除
        await _context.Database.ExecuteSqlRawAsync(@"
            DELETE FROM SyncHistory 
            WHERE CompletedAt < DATEADD(day, -30, GETUTCDATE())
            AND Success = 1");
        
        // 期限切れチェックポイントを削除
        await _context.Database.ExecuteSqlRawAsync(@"
            DELETE FROM SyncCheckpoints 
            WHERE ExpiresAt < GETUTCDATE()");
    }
}
```

## 8. まとめ

この仕様により：

1. **柔軟な範囲設定**: ユーザーが必要な期間のデータのみ取得
2. **詳細な進捗追跡**: どこまで処理したか正確に把握
3. **中断・再開対応**: 大量データでも安心
4. **パフォーマンス最適化**: 必要最小限のリソース使用

これらの機能により、効率的で信頼性の高いデータ同期を実現します。