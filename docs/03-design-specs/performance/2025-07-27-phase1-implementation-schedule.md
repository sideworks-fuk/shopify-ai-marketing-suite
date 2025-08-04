# パフォーマンス改善実装計画 2025年7月27日

**作成者**: AIアシスタント YUKI（技術アドバイザー）  
**作成日**: 2025-07-27  
**対象画面**: 休眠顧客分析画面、前年同月比【商品】画面  
**ステータス**: 実装開始

## 📋 エグゼクティブサマリー

本ドキュメントは、Shopify AI Marketing Suiteの主要画面におけるパフォーマンス問題を解決するための具体的な実装計画です。

### 主要な問題
1. **休眠顧客分析画面**: 365日以上セグメントでのフリーズ（30秒以上）
2. **前年同月比画面**: 1000商品レンダリング時の遅延（5-8秒）

### 改善目標
- 初期表示時間: 3-5秒 → 1-2秒（60%改善）
- メモリ使用量: 200-500MB → 100-200MB（50%削減）
- ユーザー体感速度: 80%向上

## 🚨 緊急度の高い問題

### 1. 休眠顧客分析画面のフリーズ問題

#### 問題の詳細
- **場所**: `DormantCustomerAnalysis.tsx` 406-466行
- **原因**: 365日以上セグメントで最大1000件のデータを同期的に処理
- **影響**: UIが完全にフリーズし、ユーザー操作不能

#### 根本原因
```typescript
// 問題のあるコード
const fetchLargeDataset = useCallback(async (segment: string) => {
  while (hasMore) {
    const batch = await api.dormantCustomers({ pageSize: 50 })
    allData = [...allData, ...newCustomers] // メモリ増大
  }
}, [])
```

### 2. 前年同月比画面のレンダリング遅延

#### 問題の詳細
- **場所**: `YearOverYearProductAnalysis.tsx` 925-978行
- **原因**: 24,000個のセル（1000商品×12ヶ月×2年）を一度にレンダリング
- **影響**: 初期表示に5-8秒、スクロールがカクつく

#### 根本原因
- 1041行の巨大な単一コンポーネント
- 仮想化なしで全データをDOM化
- 重いフィルタリング処理（556-616行）

## 🎯 Phase 1: Quick Wins（今週実装）

### Day 1-2: スケルトンローダーと初期表示制限

#### 休眠顧客分析画面の改善
```typescript
// 1. スケルトンローダーの実装
import { TableSkeleton } from '@/components/ui/PerformanceOptimized'

// 既存のローディング表示を置き換え
if (isLoading) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>休眠顧客分析</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={20} columns={8} />
        </CardContent>
      </Card>
    </div>
  )
}

// 2. 初期表示を30件に制限
const [initialLoadComplete, setInitialLoadComplete] = useState(false)

useEffect(() => {
  const loadInitialData = async () => {
    const response = await api.dormantCustomers({
      storeId: 1,
      pageSize: 30, // 100から30に削減
      sortBy: 'RiskLevel',
      descending: true
    })
    setDormantData(response.data.customers)
    setInitialLoadComplete(true)
  }
  loadInitialData()
}, [])
```

#### 前年同月比画面の改善
```typescript
// 1. 初期表示制限の実装
const INITIAL_DISPLAY_COUNT = 50
const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT)

// フィルタリング後のデータを制限
const displayedData = useMemo(() => {
  return filteredAndSortedData.slice(0, displayCount)
}, [filteredAndSortedData, displayCount])

// 2. 段階的ローディングボタン
{displayCount < filteredAndSortedData.length && (
  <div className="text-center py-4">
    <button
      onClick={() => setDisplayCount(prev => prev + 50)}
      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
    >
      さらに表示（残り {filteredAndSortedData.length - displayCount} 件）
    </button>
  </div>
)}
```

### Day 3-4: ストリーミング処理とプログレス表示

#### 休眠顧客分析のストリーミング実装
```typescript
import { ProgressiveLoader } from '@/components/ui/PerformanceOptimized'

// fetchLargeDatasetを非同期ストリーミングに変更
const streamLargeDataset = useCallback(async (segment: string) => {
  setIsProcessing(true)
  setProcessingMessage('データを読み込んでいます...')
  
  const CHUNK_SIZE = 20
  let loaded = 0
  let hasMore = true
  let pageNumber = 1
  
  try {
    while (hasMore) {
      const response = await api.dormantCustomers({
        storeId: 1,
        pageNumber,
        pageSize: CHUNK_SIZE,
        segment
      })
      
      // 既存データに追加（Reactの再レンダリングを最小化）
      setDormantData(prev => {
        const newData = [...prev]
        response.data.customers.forEach(customer => {
          if (!newData.find(c => c.id === customer.id)) {
            newData.push(customer)
          }
        })
        return newData
      })
      
      loaded += response.data.customers.length
      setPerformanceMetrics(prev => ({
        ...prev,
        totalLoaded: loaded
      }))
      
      hasMore = response.data.hasNextPage
      pageNumber++
      
      // UIの応答性を保つために短い遅延を入れる
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  } finally {
    setIsProcessing(false)
  }
}, [])

// プログレス表示の追加
{isProcessing && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
    <ProgressiveLoader
      current={performanceMetrics.totalLoaded}
      total={summaryData?.totalDormantCustomers || 1000}
      message={processingMessage}
      subMessage="データをストリーミング中..."
    />
  </div>
)}
```

### Day 5: メモ化とパフォーマンス測定

#### 共通のパフォーマンス測定実装
```typescript
import { usePerformance } from '@/utils/performanceMeasurement'

// 各コンポーネントで使用
export const DormantCustomerAnalysis = () => {
  const perf = usePerformance()
  
  useEffect(() => {
    perf.start('initial-load')
    loadInitialData().then(() => {
      perf.end('initial-load')
      perf.logReport()
    })
  }, [])
  
  // メモリ使用量の監視
  useEffect(() => {
    const memory = perf.measureMemory()
    if (memory && memory.used > 150) {
      console.warn('⚠️ High memory usage:', memory.used, 'MB')
    }
  }, [dormantData.length])
}
```

#### フィルタリング処理のメモ化
```typescript
// 前年同月比画面のフィルタリング最適化
const filteredAndSortedData = useMemo(() => {
  console.time('Filtering')
  
  if (!data || data.length === 0) return []
  
  // 早期リターンで処理を軽減
  let filtered = data
  
  // 検索フィルタ（最も軽い処理を先に）
  if (appliedFilters.searchTerm) {
    const searchLower = appliedFilters.searchTerm.toLowerCase()
    filtered = filtered.filter(p => 
      p.productName.toLowerCase().includes(searchLower)
    )
  }
  
  // 成長率フィルタ
  if (appliedFilters.growthRateMin !== null || appliedFilters.growthRateMax !== null) {
    filtered = filtered.filter(p => {
      const rate = p.yearOverYearGrowth
      if (appliedFilters.growthRateMin !== null && rate < appliedFilters.growthRateMin) return false
      if (appliedFilters.growthRateMax !== null && rate > appliedFilters.growthRateMax) return false
      return true
    })
  }
  
  console.timeEnd('Filtering')
  return filtered
}, [data, appliedFilters, sortBy, viewMode])
```

## 📊 期待される成果

### 測定可能な改善
| 指標 | 現状 | Phase 1後 | 改善率 |
|------|------|-----------|--------|
| 初期表示時間 | 3-5秒 | 1-2秒 | 60% |
| 365日セグメント読込 | 30秒+フリーズ | 3秒（ストリーミング） | 90% |
| 1000商品表示 | 5-8秒 | 2秒（段階表示） | 70% |
| メモリ使用量 | 200-500MB | 100-200MB | 50% |

### ユーザー体験の改善
- フリーズの完全解消
- スムーズなスクロール
- 即座のフィードバック（スケルトンローダー）
- 中断可能な処理（キャンセルボタン）

## 🚀 実装チェックリスト

### 月曜日（7/29）
- [ ] 休眠顧客：スケルトンローダー実装
- [ ] 前年同月比：スケルトンローダー実装
- [ ] 両画面：初期表示制限の実装

### 火曜日（7/30）
- [ ] 休眠顧客：ストリーミング処理の実装
- [ ] 前年同月比：段階的ローディングの実装

### 水曜日（7/31）
- [ ] 休眠顧客：プログレス表示の追加
- [ ] 前年同月比：メモ化の実装

### 木曜日（8/1）
- [ ] パフォーマンス測定の組み込み
- [ ] テストとデバッグ

### 金曜日（8/2）
- [ ] パフォーマンス測定レポート作成
- [ ] Phase 2の計画策定

## 📝 次のステップ（Phase 2）

### 中期改善（2-4週間）
1. **仮想スクロール実装**
   - react-windowまたはreact-virtualizeの導入
   - メモリ使用量80%削減

2. **バックエンド最適化**
   - SQLクエリの最適化
   - インデックスの追加
   - キャッシュ層の実装

3. **コンポーネント分割**
   - 前年同月比画面を6つのコンポーネントに分割
   - 責務の明確化と保守性向上

## 📚 関連ドキュメント

### 詳細な実装ガイド
- [休眠顧客分析画面の改善実装](./screen-designs/customer-analysis/performance-improvement/2025-07-27-dormant-customer-performance-implementation.md)
- [前年同月比画面の改善実装](./screen-designs/product-analysis/performance-improvement/2025-07-27-year-over-year-performance-implementation.md)

### 参考資料
- [パフォーマンス改善マスタープラン](./PERFORMANCE-MASTER-PLAN.md)
- [即座に実装可能なガイド](./performance-quick-implementation-guide.md)

---

**作成者**: AIアシスタント YUKI  
**技術サポート**: プロジェクトチームまで  
**最終更新**: 2025-07-27