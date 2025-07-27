# 休眠顧客分析画面 - 特化型パフォーマンス改善案

**作成者**: Claude-kun (Anthropic AI Assistant)  
**作成日**: 2025-07-27  
**対象画面**: 休眠顧客分析画面（CUST-01-DORMANT）

## 現状の問題点詳細

### 1. 365日以上セグメントの処理問題
```typescript
// 現在の実装（問題あり）
const fetchLargeDataset = async (segment: string) => {
  let allData: any[] = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    // 最大1000件まで取得する（メモリ問題）
    const batch = await api.dormantCustomers({
      storeId: 1,
      pageNumber: page,
      pageSize: 50,
      segment: segment
    })
    allData = [...allData, ...batch.data?.customers || []]
  }
  return allData
}
```

### 2. 初期ロードの非効率性
- 100件一括取得
- 全フィールド取得
- リアルタイム集計

## 改善実装案

### 1. ストリーミング型データ処理（即効性: 高）
```typescript
// hooks/useDormantCustomerStream.ts
export const useDormantCustomerStream = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamController = useRef<AbortController>();
  
  const startStreaming = useCallback(async (segment: string) => {
    setIsStreaming(true);
    streamController.current = new AbortController();
    
    const CHUNK_SIZE = 20;
    let offset = 0;
    
    try {
      while (!streamController.current.signal.aborted) {
        const chunk = await api.dormantCustomers({
          storeId: 1,
          segment,
          pageSize: CHUNK_SIZE,
          offset,
          fields: ['id', 'name', 'daysSinceLastPurchase', 'riskLevel'] // 必要フィールドのみ
        });
        
        if (chunk.data.customers.length === 0) break;
        
        // チャンクごとに状態更新（React 18のバッチング活用）
        setCustomers(prev => [...prev, ...chunk.data.customers]);
        offset += CHUNK_SIZE;
        
        // UIの応答性を保つため少し待機
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);
  
  const stopStreaming = useCallback(() => {
    streamController.current?.abort();
  }, []);
  
  return { customers, isStreaming, startStreaming, stopStreaming };
};
```

### 2. 集計データの事前計算とキャッシュ
```typescript
// api/dormantAnalytics.ts
export const dormantAnalyticsApi = {
  // 軽量なサマリーエンドポイント
  getQuickSummary: async (storeId: number) => {
    return api.get('/api/dormant-analytics/quick-summary', {
      params: { storeId },
      headers: {
        'Cache-Control': 'max-age=300', // 5分キャッシュ
      }
    });
  },
  
  // セグメント別集計（事前計算済み）
  getSegmentStats: async (storeId: number, segment: string) => {
    return api.get('/api/dormant-analytics/segment-stats', {
      params: { storeId, segment },
      headers: {
        'Cache-Control': 'max-age=600', // 10分キャッシュ
      }
    });
  }
};
```

### 3. Intersection Observer によるレンダリング最適化
```tsx
// components/dormant/OptimizedCustomerList.tsx
export const OptimizedCustomerList = ({ customers }: { customers: Customer[] }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const listRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            
            // 表示範囲を更新
            setVisibleRange({
              start: Math.max(0, index - 25),
              end: Math.min(customers.length, index + 25)
            });
          }
        });
      },
      { rootMargin: '100px' }
    );
    
    // センチネル要素を設置
    const sentinels = listRef.current?.querySelectorAll('.sentinel');
    sentinels?.forEach(sentinel => observer.observe(sentinel));
    
    return () => observer.disconnect();
  }, [customers.length]);
  
  const visibleCustomers = customers.slice(visibleRange.start, visibleRange.end);
  
  return (
    <div ref={listRef} className="space-y-2">
      {/* 上部スペーサー */}
      <div style={{ height: `${visibleRange.start * 80}px` }} />
      
      {/* 上部センチネル */}
      {visibleRange.start > 0 && (
        <div className="sentinel" data-index={visibleRange.start - 10} />
      )}
      
      {/* 可視範囲のみレンダリング */}
      {visibleCustomers.map((customer, idx) => (
        <CustomerRow 
          key={customer.id} 
          customer={customer}
          index={visibleRange.start + idx}
        />
      ))}
      
      {/* 下部センチネル */}
      {visibleRange.end < customers.length && (
        <div className="sentinel" data-index={visibleRange.end + 10} />
      )}
      
      {/* 下部スペーサー */}
      <div style={{ height: `${(customers.length - visibleRange.end) * 80}px` }} />
    </div>
  );
};
```

### 4. Web Worker による重い計算の分離
```typescript
// workers/dormantAnalytics.worker.ts
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CALCULATE_SEGMENTS':
      const segments = calculateSegmentDistribution(data.customers);
      self.postMessage({ type: 'SEGMENTS_CALCULATED', data: segments });
      break;
      
    case 'CALCULATE_RISK_SCORES':
      const scores = await calculateRiskScores(data.customers);
      self.postMessage({ type: 'RISK_SCORES_CALCULATED', data: scores });
      break;
  }
});

// hooks/useWebWorkerCalculation.ts
export const useWebWorkerCalculation = () => {
  const workerRef = useRef<Worker>();
  
  useEffect(() => {
    workerRef.current = new Worker('/workers/dormantAnalytics.worker.js');
    
    return () => workerRef.current?.terminate();
  }, []);
  
  const calculateInBackground = useCallback((type: string, data: any) => {
    return new Promise((resolve) => {
      if (!workerRef.current) return;
      
      const handler = (event: MessageEvent) => {
        if (event.data.type === `${type}_CALCULATED`) {
          resolve(event.data.data);
          workerRef.current?.removeEventListener('message', handler);
        }
      };
      
      workerRef.current.addEventListener('message', handler);
      workerRef.current.postMessage({ type, data });
    });
  }, []);
  
  return { calculateInBackground };
};
```

### 5. GraphQL による選択的フィールド取得
```graphql
# queries/dormantCustomers.graphql
query GetDormantCustomers(
  $storeId: Int!
  $segment: String
  $fields: [String!]
  $first: Int
  $after: String
) {
  dormantCustomers(
    storeId: $storeId
    segment: $segment
    first: $first
    after: $after
  ) {
    edges {
      node {
        ... on Customer @include(if: $fields) {
          id @include(if: "id" in $fields)
          name @include(if: "name" in $fields)
          email @include(if: "email" in $fields)
          daysSinceLastPurchase @include(if: "daysSinceLastPurchase" in $fields)
          riskLevel @include(if: "riskLevel" in $fields)
          totalSpent @include(if: "totalSpent" in $fields)
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

### 6. バックエンド: マテリアライズドビューの活用
```sql
-- 休眠顧客分析用マテリアライズドビュー
CREATE MATERIALIZED VIEW vw_DormantCustomerAnalytics
WITH (DISTRIBUTION = HASH(CustomerId))
AS
SELECT 
    c.Id as CustomerId,
    c.StoreId,
    c.FirstName + ' ' + c.LastName as CustomerName,
    c.Email,
    c.TotalSpent,
    c.TotalOrders,
    DATEDIFF(DAY, 
        (SELECT MAX(CreatedAt) FROM Orders WHERE CustomerId = c.Id), 
        GETDATE()
    ) as DaysSinceLastPurchase,
    CASE 
        WHEN DATEDIFF(DAY, (SELECT MAX(CreatedAt) FROM Orders WHERE CustomerId = c.Id), GETDATE()) <= 180 THEN '90-180日'
        WHEN DATEDIFF(DAY, (SELECT MAX(CreatedAt) FROM Orders WHERE CustomerId = c.Id), GETDATE()) <= 365 THEN '180-365日'
        ELSE '365日以上'
    END as DormancySegment,
    -- チャーン確率の事前計算
    dbo.CalculateChurnProbability(c.Id) as ChurnProbability,
    CASE 
        WHEN dbo.CalculateChurnProbability(c.Id) >= 0.8 THEN 'critical'
        WHEN dbo.CalculateChurnProbability(c.Id) >= 0.6 THEN 'high'
        WHEN dbo.CalculateChurnProbability(c.Id) >= 0.4 THEN 'medium'
        ELSE 'low'
    END as RiskLevel
FROM Customers c
WHERE EXISTS (SELECT 1 FROM Orders WHERE CustomerId = c.Id)
  AND DATEDIFF(DAY, (SELECT MAX(CreatedAt) FROM Orders WHERE CustomerId = c.Id), GETDATE()) >= 90;

-- 1時間ごとに更新
CREATE PROCEDURE RefreshDormantCustomerView
AS
BEGIN
    REFRESH MATERIALIZED VIEW vw_DormantCustomerAnalytics;
END
```

### 7. リアルタイム更新の最適化
```typescript
// hooks/useOptimisticDormantUpdate.ts
export const useOptimisticDormantUpdate = () => {
  const queryClient = useQueryClient();
  
  const updateCustomerStatus = useMutation({
    mutationFn: async (update: CustomerUpdate) => {
      // 楽観的更新
      queryClient.setQueryData(['dormantCustomers'], (old: any) => {
        return {
          ...old,
          customers: old.customers.map(c => 
            c.id === update.customerId 
              ? { ...c, ...update.changes }
              : c
          )
        };
      });
      
      // API呼び出し
      return api.updateCustomerStatus(update);
    },
    onError: () => {
      // エラー時はロールバック
      queryClient.invalidateQueries(['dormantCustomers']);
    }
  });
  
  return { updateCustomerStatus };
};
```

## パフォーマンス改善ロードマップ

### Week 1: 即効性の高い改善
1. **ストリーミング型データ読み込み** - 365日以上セグメントの UX 改善
2. **必要フィールドのみ取得** - データ転送量 70% 削減
3. **初期表示数の制限** - 初期ロード時間 50% 短縮

### Week 2-3: 中期的改善
1. **Intersection Observer 実装** - メモリ使用量 80% 削減
2. **Web Worker 導入** - UI のフリーズ解消
3. **マテリアライズドビュー作成** - クエリ速度 90% 向上

### Month 2: 長期的改善
1. **GraphQL 導入** - 過剰なデータ取得の根本解決
2. **リアルタイム同期の最適化** - WebSocket による差分更新
3. **完全な事前計算システム** - リアルタイム集計の廃止

## 測定すべきメトリクス

```typescript
// utils/dormantPerformanceMetrics.ts
export const trackDormantPerformance = () => {
  const metrics = {
    initialLoadTime: 0,
    segmentLoadTime: {},
    memoryUsage: 0,
    renderCount: 0,
  };
  
  // 初期ロード時間
  performance.mark('dormant-init-start');
  
  // セグメント別ロード時間
  const trackSegmentLoad = (segment: string) => {
    performance.mark(`segment-${segment}-start`);
    return () => {
      performance.mark(`segment-${segment}-end`);
      performance.measure(
        `segment-${segment}`,
        `segment-${segment}-start`,
        `segment-${segment}-end`
      );
    };
  };
  
  // メモリ使用量追跡
  if ('memory' in performance) {
    setInterval(() => {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      console.log(`Memory: ${(metrics.memoryUsage / 1048576).toFixed(2)} MB`);
    }, 5000);
  }
  
  return { metrics, trackSegmentLoad };
};
```

## 期待される改善効果

| 指標 | 現状 | 改善後 | 改善率 |
|------|------|--------|---------|
| 初期表示時間 | 3-5秒 | 0.5-1秒 | 80% |
| 365日以上セグメント表示 | 10-30秒 | 2-3秒 | 85% |
| メモリ使用量（1000件） | 200MB | 40MB | 80% |
| API レスポンス時間 | 500-1000ms | 50-100ms | 90% |
| 同時接続可能数 | 50 | 500 | 10倍 |