# 休眠顧客分析画面 - パフォーマンス改善提案書

> **📅 作成日**: 2025年7月27日  
> **👤 作成者**: 福田さん + レイ（Claude Code）+ ケンジ  
> **🎯 対象画面**: 休眠顧客分析画面（CUST-01-DORMANT）専用  
> **🔄 ステータス**: 実装推奨（画面特化版）

---

## 📋 休眠顧客分析画面の固有問題

### 現状の深刻な課題
| 測定項目 | 現状値 | 問題の影響 |
|---------|--------|-----------|
| **365日以上セグメント** | 10-30秒 | 画面完全フリーズ |
| 初期表示時間 | 3-5秒 | ユーザー離脱リスク |
| メモリ使用量（1000件） | 200-500MB | ブラウザクラッシュ |
| API レスポンス | 2-5秒 | タイムアウト頻発 |

### 技術的ボトルネック
```typescript
// 問題1: 365日以上セグメントの全件取得
const fetchLargeDataset = async (segment: string) => {
  let allData: any[] = []
  let page = 1
  while (hasMore) {
    // 最大1000件まで一気に取得（メモリ問題）
    const batch = await api.dormantCustomers({pageSize: 50})
    allData = [...allData, ...batch.data?.customers || []]
  }
}

// 問題2: 初期ロードで100件一括取得
pageSize: 100  // 重すぎる初期ロード

// 問題3: 全フィールドを取得
// 必要最小限フィールドに絞れていない
```

---

## ⚡ 休眠顧客分析専用の改善案

### Phase 1: 365日以上セグメント対応（最優先）

#### 1. ストリーミング型データ処理
```typescript
// hooks/useDormantCustomerStream.ts
export const useDormantCustomerStream = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const streamController = useRef<AbortController>();
  
  const startStreaming = useCallback(async (segment: string) => {
    streamController.current = new AbortController();
    const CHUNK_SIZE = 20; // 小さなチャンクで段階的表示
    
    try {
      let offset = 0;
      while (!streamController.current.signal.aborted) {
        const chunk = await api.dormantCustomers({
          segment,
          pageSize: CHUNK_SIZE,
          offset,
          fields: ['id', 'name', 'daysSinceLastPurchase', 'riskLevel'] // 必須のみ
        });
        
        if (chunk.data.customers.length === 0) break;
        
        // チャンクごとに状態更新（即座に表示）
        setCustomers(prev => [...prev, ...chunk.data.customers]);
        setProgress(prev => ({ ...prev, current: prev.current + chunk.data.customers.length }));
        
        offset += CHUNK_SIZE;
        // UIの応答性を保つため待機
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('Streaming error:', error);
    }
  }, []);
  
  return { customers, progress, startStreaming, stopStreaming: () => streamController.current?.abort() };
};
```

**期待効果**: 365日以上セグメントでもフリーズなし、プログレッシブ表示

#### 2. 休眠顧客専用スケルトンローダー
```tsx
// components/dormant/DormantCustomerSkeleton.tsx
export const DormantCustomerSkeleton = () => (
  <div className="space-y-6">
    {/* KPIカードのスケルトン */}
    <div className="grid grid-cols-4 gap-4">
      {['90-180日', '180-365日', '365日以上', '総計'].map((label, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2">{label}</div>
              <div className="h-8 bg-gray-300 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* 顧客リストのスケルトン */}
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-100 rounded w-48"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
```

#### 3. 休眠顧客専用プログレスバー
```tsx
// components/dormant/DormantStreamingProgress.tsx
export const DormantStreamingProgress = ({ 
  current, 
  total, 
  segment, 
  onCancel 
}: {
  current: number;
  total: number;
  segment: string;
  onCancel: () => void;
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <Card className="w-96 p-6">
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">休眠顧客データ読み込み中</h3>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>セグメント: {segment}</span>
                <span>{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
              <div className="text-xs text-gray-500">
                {current.toLocaleString()} / {total.toLocaleString()} 件読み込み完了
              </div>
            </div>
            
            {segment === '365日以上' && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                ⚠️ 大量データのため時間がかかります。キャンセルも可能です。
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

### Phase 2: バックエンド最適化（休眠顧客特化）

#### 1. 休眠顧客専用インデックス
```sql
-- 休眠顧客分析に特化したインデックス
CREATE NONCLUSTERED INDEX IX_DormantCustomer_StoreId_LastOrderDate 
ON Customers(StoreId) 
INCLUDE (Id, Name, Email, TotalSpent, TotalOrders)
WHERE TotalOrders > 0;

-- 最終注文日の高速検索
CREATE NONCLUSTERED INDEX IX_Orders_CustomerId_CreatedAt_ForDormant
ON Orders(CustomerId, CreatedAt DESC) 
INCLUDE (TotalPrice, Id);

-- セグメント分布の高速計算用
CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt_StoreId_ForSegment
ON Orders(CreatedAt, StoreId) 
INCLUDE (CustomerId, TotalPrice);
```

#### 2. 休眠顧客専用ビュー
```sql
-- 休眠顧客分析専用のインデックス付きビュー
CREATE VIEW vw_DormantCustomerAnalysis
WITH SCHEMABINDING AS
SELECT 
    c.Id,
    c.StoreId,
    c.Name,
    c.Email,
    c.TotalSpent,
    c.TotalOrders,
    DATEDIFF(DAY, 
        (SELECT MAX(CreatedAt) FROM dbo.Orders WHERE CustomerId = c.Id), 
        GETDATE()
    ) as DaysSinceLastPurchase,
    CASE 
        WHEN DATEDIFF(DAY, (SELECT MAX(CreatedAt) FROM dbo.Orders WHERE CustomerId = c.Id), GETDATE()) <= 180 THEN '90-180日'
        WHEN DATEDIFF(DAY, (SELECT MAX(CreatedAt) FROM dbo.Orders WHERE CustomerId = c.Id), GETDATE()) <= 365 THEN '180-365日'
        ELSE '365日以上'
    END as DormancySegment
FROM dbo.Customers c
WHERE c.TotalOrders > 0
  AND EXISTS (SELECT 1 FROM dbo.Orders WHERE CustomerId = c.Id);

-- インデックス作成
CREATE UNIQUE CLUSTERED INDEX IX_DormantView_Id 
ON vw_DormantCustomerAnalysis(Id);

CREATE NONCLUSTERED INDEX IX_DormantView_Segment_Store
ON vw_DormantCustomerAnalysis(StoreId, DormancySegment) 
INCLUDE (DaysSinceLastPurchase, TotalSpent);
```

#### 3. 休眠顧客API最適化
```csharp
// DormantCustomerService.cs の休眠顧客特化メソッド
public async Task<ApiResponse<DormantCustomerAnalysisDto>> GetDormantCustomersOptimized(
    DormantCustomerRequest request)
{
    // セグメント別に最適化された処理
    var query = request.Segment switch
    {
        "365日以上" => BuildLargeDatasetQuery(request), // 特別処理
        _ => BuildStandardQuery(request)
    };
    
    // 必要最小限のフィールドのみ射影
    var customers = await query
        .Select(c => new DormantCustomerDto
        {
            Id = c.Id,
            Name = c.Name,
            Email = c.Email,
            DaysSinceLastPurchase = c.DaysSinceLastPurchase,
            RiskLevel = CalculateRiskLevel(c.DaysSinceLastPurchase, c.TotalSpent),
            TotalSpent = c.TotalSpent
            // 詳細情報は別途取得（オンデマンド）
        })
        .Skip((request.PageNumber - 1) * request.PageSize.Value)
        .Take(request.PageSize.Value)
        .ToListAsync();
    
    return ApiResponse<DormantCustomerAnalysisDto>.Success(new DormantCustomerAnalysisDto
    {
        Customers = customers,
        TotalCount = await GetSegmentCount(request.StoreId, request.Segment),
        SegmentSummary = await GetCachedSegmentSummary(request.StoreId)
    });
}

private IQueryable<DormantCustomerViewDto> BuildLargeDatasetQuery(DormantCustomerRequest request)
{
    // 365日以上セグメント専用の最適化クエリ
    return _context.vw_DormantCustomerAnalysis
        .Where(c => c.StoreId == request.StoreId && c.DormancySegment == "365日以上")
        .OrderByDescending(c => c.DaysSinceLastPurchase) // 最もリスクの高い顧客から
        .Take(1000); // 安全な上限設定
}
```

### Phase 3: 休眠顧客専用の高度な最適化

#### 1. 休眠顧客専用キャッシュ戦略
```csharp
// DormantCustomerCacheService.cs
public class DormantCustomerCacheService
{
    private readonly IDistributedCache _cache;
    private readonly string CACHE_KEY_PREFIX = "dormant_customers";
    
    public async Task<DormantSummaryDto> GetCachedSummary(int storeId)
    {
        var cacheKey = $"{CACHE_KEY_PREFIX}_summary_{storeId}_{DateTime.Today:yyyyMMdd}";
        
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
            return JsonSerializer.Deserialize<DormantSummaryDto>(cached);
        
        var summary = await CalculateDormantSummary(storeId);
        
        await _cache.SetStringAsync(
            cacheKey, 
            JsonSerializer.Serialize(summary),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6) // 6時間キャッシュ
            });
        
        return summary;
    }
    
    public async Task<List<DormantCustomerDto>> GetCachedSegmentData(
        int storeId, 
        string segment, 
        int pageNumber, 
        int pageSize)
    {
        var cacheKey = $"{CACHE_KEY_PREFIX}_{storeId}_{segment}_{pageNumber}_{pageSize}";
        
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
            return JsonSerializer.Deserialize<List<DormantCustomerDto>>(cached);
        
        var data = await GetSegmentData(storeId, segment, pageNumber, pageSize);
        
        // セグメント別にキャッシュ期間を調整
        var expiration = segment switch
        {
            "365日以上" => TimeSpan.FromHours(12), // 長期間キャッシュ
            "180-365日" => TimeSpan.FromHours(6),
            _ => TimeSpan.FromHours(2)
        };
        
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(data), 
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = expiration });
        
        return data;
    }
}
```

#### 2. Web Worker による重い計算の分離
```typescript
// workers/dormantAnalytics.worker.ts
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CALCULATE_RISK_DISTRIBUTION':
      const riskDistribution = calculateRiskDistribution(data.customers);
      self.postMessage({ type: 'RISK_DISTRIBUTION_CALCULATED', data: riskDistribution });
      break;
      
    case 'CALCULATE_REVENUE_AT_RISK':
      const revenueAtRisk = calculateRevenueAtRisk(data.customers);
      self.postMessage({ type: 'REVENUE_AT_RISK_CALCULATED', data: revenueAtRisk });
      break;
      
    case 'SEGMENT_CUSTOMERS':
      const segments = segmentCustomersByRisk(data.customers);
      self.postMessage({ type: 'CUSTOMERS_SEGMENTED', data: segments });
      break;
  }
});

function calculateRiskDistribution(customers) {
  // 重い計算処理をWeb Workerで実行
  const distribution = {
    critical: customers.filter(c => c.daysSinceLastPurchase > 730).length,
    high: customers.filter(c => c.daysSinceLastPurchase > 545 && c.daysSinceLastPurchase <= 730).length,
    medium: customers.filter(c => c.daysSinceLastPurchase > 365 && c.daysSinceLastPurchase <= 545).length,
    low: customers.filter(c => c.daysSinceLastPurchase <= 365).length
  };
  
  return distribution;
}
```

---

## 📊 休眠顧客分析特有の成功指標

### 測定すべき専用メトリクス
```typescript
// utils/dormantCustomerMetrics.ts
export const trackDormantSpecificMetrics = () => {
  const metrics = {
    segmentLoadTimes: {
      '90-180日': 0,
      '180-365日': 0,
      '365日以上': 0
    },
    streamingPerformance: {
      chunksLoaded: 0,
      averageChunkTime: 0,
      totalStreamTime: 0
    },
    userInteractions: {
      segmentSwitches: 0,
      detailViews: 0,
      exportActions: 0
    }
  };
  
  const trackSegmentLoad = (segment: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      metrics.segmentLoadTimes[segment] = duration;
      
      // 365日以上セグメントの特別監視
      if (segment === '365日以上' && duration > 5000) {
        console.warn(`⚠️ 365日以上セグメントが${duration}ms: 最適化が必要`);
      }
    };
  };
  
  const trackChunkLoad = (chunkSize: number, duration: number) => {
    metrics.streamingPerformance.chunksLoaded++;
    metrics.streamingPerformance.averageChunkTime = 
      (metrics.streamingPerformance.averageChunkTime + duration) / 2;
  };
  
  return { metrics, trackSegmentLoad, trackChunkLoad };
};
```

### 専用の成功基準

| 指標 | 現状 | 1週間後 | 1ヶ月後 | 備考 |
|------|------|---------|---------|------|
| **365日以上セグメント** | 30秒+フリーズ | 10秒 | 3秒 | 最重要指標 |
| 初期KPI表示 | 3-5秒 | 1秒 | 0.5秒 | ユーザー体験向上 |
| メモリ使用量（1000件） | 500MB | 200MB | 100MB | 安定性向上 |
| ストリーミング処理 | 未実装 | 実装完了 | 最適化完了 | 新機能 |

---

## 🚀 実装計画（休眠顧客特化）

### Week 1: 緊急対応
- [x] ストリーミング処理実装（365日以上対応）
- [ ] 専用スケルトンローダー実装  
- [ ] プログレスバー実装
- [ ] 初期ページサイズ削減（100→30）

### Week 2-3: 最適化
- [ ] インデックス付きビュー作成
- [ ] 専用APIエンドポイント実装
- [ ] キャッシュ戦略実装

### Month 2: 高度な最適化
- [ ] Web Worker実装
- [ ] 専用Redis設定
- [ ] リアルタイム更新（SignalR）

---

**休眠顧客分析専用改善完了** ✅  
*次は前年同月比【商品】画面の専用改善案を作成*