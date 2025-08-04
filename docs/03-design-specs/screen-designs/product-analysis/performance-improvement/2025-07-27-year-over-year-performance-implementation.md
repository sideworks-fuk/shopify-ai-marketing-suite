# 前年同月比【商品】画面 - パフォーマンス改善実装ガイド

**作成者**: AIアシスタント YUKI（技術アドバイザー）  
**作成日**: 2025-07-27  
**対象画面**: PROD-01-YOY（前年同月比【商品】分析画面）  
**優先度**: 🔴 最高（1000商品レンダリングの遅延問題）

## 🎯 本ドキュメントの目的

前年同月比【商品】画面の深刻なレンダリング遅延を解決し、ユーザー体験を劇的に改善します。

## 🚨 解決すべき問題

### 1. 1000商品レンダリングの遅延
- **現象**: 初期表示に5-8秒、スクロール時にカクつき
- **原因**: 24,000個のセル（1000商品×12ヶ月×2年）を一度にDOM化
- **影響**: ユーザーが待機時間にイライラ、操作性の低下

### 2. 1041行の巨大コンポーネント
- **現象**: コードの可読性・保守性が著しく低い
- **原因**: 単一コンポーネントに複数の責務が混在
- **影響**: バグ修正や機能追加が困難、再レンダリングの頻発

### 3. フィルタリング処理の非効率性
- **現象**: フィルタ変更時に1-2秒のラグ
- **原因**: 全データに対して複雑なフィルタリングを毎回実行
- **影響**: インタラクティブな操作感の喪失

## 💡 実装する改善策

### Step 1: 初期表示制限とスケルトンローダー（1時間）

#### 1. インポートの追加
```typescript
// YearOverYearProductAnalysis.tsx の冒頭に追加
import { 
  TableSkeleton,
  IncrementalDataLoader,
  VirtualizedList,
  usePerformanceTracker
} from '@/components/ui/PerformanceOptimized'
```

#### 2. 初期表示データの制限
```typescript
// 90行目付近、新しいステートを追加
const [displayCount, setDisplayCount] = useState(50) // 初期は50商品のみ
const [isLoadingMore, setIsLoadingMore] = useState(false)

// 556行目付近、フィルタリング後のデータを制限
const displayedData = useMemo(() => {
  return filteredAndSortedData.slice(0, displayCount)
}, [filteredAndSortedData, displayCount])

// パフォーマンストラッキング
const { renderCount } = usePerformanceTracker('YearOverYearProductAnalysis')
```

#### 3. スケルトンローダーの実装
```typescript
// 706行目付近、ローディング表示を改善
if (!initialized) {
  return (
    <div className="space-y-6">
      {/* フィルターセクションのスケルトン */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            前年同月比【商品】分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* フィルターのスケルトン */}
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            {/* テーブルのスケルトン */}
            <TableSkeleton rows={10} columns={13} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 2: 段階的データローディング（2時間）

#### 1. IncrementalDataLoaderの実装
```typescript
// 858行目付近、メインデータテーブルを置き換え
<Card className="mt-6">
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      <span>商品別売上データ（{displayedData.length}件）</span>
      <span className="text-sm text-gray-500">
        全{filteredAndSortedData.length}件中
      </span>
    </CardTitle>
  </CardHeader>
  <CardContent>
    <IncrementalDataLoader
      data={filteredAndSortedData}
      initialCount={50}
      incrementSize={50}
      renderItem={(product, index) => (
        <ProductTableRow
          key={product.productId}
          product={product}
          index={index}
          viewMode={viewMode}
          currentYear={currentYear}
          previousYear={previousYear}
        />
      )}
      className="overflow-x-auto"
    />
  </CardContent>
</Card>
```

#### 2. ProductTableRowコンポーネントの分離（新規作成）
```typescript
// components/ProductTableRow.tsx（新規ファイル）
import React from 'react'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export const ProductTableRow = React.memo(({ 
  product, 
  index, 
  viewMode,
  currentYear,
  previousYear 
}) => {
  const monthsToDisplay = viewMode === 'full' 
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : getActiveMonths(product)
  
  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="sticky left-0 bg-white p-4 font-medium">
        {product.productName}
      </td>
      
      {monthsToDisplay.map(month => {
        const current = product.currentYearData[month] || 0
        const previous = product.previousYearData[month] || 0
        const growth = calculateGrowth(current, previous)
        
        return (
          <React.Fragment key={month}>
            <td className="p-4 text-right">
              {formatCurrency(previous)}
            </td>
            <td className="p-4 text-right font-medium">
              {formatCurrency(current)}
              {growth !== null && (
                <div className={`text-xs ${
                  growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(growth)}
                </div>
              )}
            </td>
          </React.Fragment>
        )
      })}
      
      <td className="p-4 text-right font-bold">
        {formatCurrency(product.currentYearTotal)}
      </td>
      <td className="p-4 text-right">
        <span className={`font-bold ${
          product.yearOverYearGrowth >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatPercentage(product.yearOverYearGrowth)}
        </span>
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  // メモ化の条件：商品IDと表示モードが同じなら再レンダリングしない
  return (
    prevProps.product.productId === nextProps.product.productId &&
    prevProps.viewMode === nextProps.viewMode
  )
})

// ヘルパー関数
const getActiveMonths = (product) => {
  const months = new Set()
  Object.keys(product.currentYearData).forEach(m => months.add(parseInt(m)))
  Object.keys(product.previousYearData).forEach(m => months.add(parseInt(m)))
  return Array.from(months).sort((a, b) => a - b)
}

const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}
```

### Step 3: フィルタリング処理の最適化（1時間）

#### 1. デバウンス処理の追加
```typescript
// hooks/useDebounce.ts（新規作成）
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// YearOverYearProductAnalysis.tsx で使用
const debouncedSearchTerm = useDebounce(filters.searchTerm, 300)
const debouncedFilters = useDebounce(filters, 200)
```

#### 2. フィルタリング処理の最適化
```typescript
// 556行目付近、フィルタリング処理を改善
const filteredAndSortedData = useMemo(() => {
  console.time('Filtering and Sorting')
  
  // 早期リターン
  if (!data || data.length === 0) return []
  
  let filtered = data
  
  // 段階的フィルタリング（軽い処理から順に）
  // 1. 検索フィルタ（最も頻繁に使用される）
  if (debouncedSearchTerm) {
    const searchLower = debouncedSearchTerm.toLowerCase()
    filtered = filtered.filter(p => 
      p.productName.toLowerCase().includes(searchLower)
    )
  }
  
  // 2. カテゴリフィルタ（次に頻繁）
  if (debouncedFilters.category) {
    filtered = filtered.filter(p => p.category === debouncedFilters.category)
  }
  
  // 3. 数値フィルタ（計算が必要）
  if (debouncedFilters.growthRateMin !== null || debouncedFilters.growthRateMax !== null) {
    filtered = filtered.filter(p => {
      const rate = p.yearOverYearGrowth
      if (debouncedFilters.growthRateMin !== null && rate < debouncedFilters.growthRateMin) {
        return false
      }
      if (debouncedFilters.growthRateMax !== null && rate > debouncedFilters.growthRateMax) {
        return false
      }
      return true
    })
  }
  
  // 4. ソート処理（最後に一度だけ）
  if (sortBy.field) {
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[sortBy.field]
      let bVal = b[sortBy.field]
      
      if (typeof aVal === 'string') {
        return sortBy.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      return sortBy.direction === 'asc' 
        ? aVal - bVal
        : bVal - aVal
    })
  }
  
  console.timeEnd('Filtering and Sorting')
  console.log(`Filtered: ${filtered.length} / ${data.length} products`)
  
  return filtered
}, [data, debouncedSearchTerm, debouncedFilters, sortBy])
```

### Step 4: 仮想スクロールの実装（2時間）

#### 1. 大量データ表示の仮想化
```typescript
// VirtualizedProductTable.tsx（新規コンポーネント）
import { VirtualizedList } from '@/components/ui/PerformanceOptimized'

export const VirtualizedProductTable = ({ 
  products, 
  viewMode,
  currentYear,
  previousYear 
}) => {
  const ITEM_HEIGHT = 80 // 各行の高さ（ピクセル）
  const CONTAINER_HEIGHT = 600 // コンテナの高さ
  
  return (
    <div className="relative">
      {/* ヘッダーは固定 */}
      <div className="sticky top-0 bg-white z-10 border-b">
        <ProductTableHeader 
          viewMode={viewMode}
          currentYear={currentYear}
          previousYear={previousYear}
        />
      </div>
      
      {/* 仮想スクロール */}
      <VirtualizedList
        items={products}
        itemHeight={ITEM_HEIGHT}
        containerHeight={CONTAINER_HEIGHT}
        renderItem={(product, index) => (
          <ProductTableRow
            product={product}
            index={index}
            viewMode={viewMode}
            currentYear={currentYear}
            previousYear={previousYear}
          />
        )}
        overscan={5} // 表示領域外に5行分をプリレンダリング
      />
    </div>
  )
}
```

#### 2. メインコンポーネントでの使用
```typescript
// 1000商品以上の場合は仮想スクロールを使用
{filteredAndSortedData.length > 100 ? (
  <VirtualizedProductTable
    products={filteredAndSortedData}
    viewMode={viewMode}
    currentYear={currentYear}
    previousYear={previousYear}
  />
) : (
  // 100商品以下なら通常のテーブル
  <IncrementalDataLoader
    data={filteredAndSortedData}
    initialCount={50}
    incrementSize={50}
    renderItem={(product, index) => (
      <ProductTableRow {...props} />
    )}
  />
)}
```

### Step 5: パフォーマンス測定の実装（30分）

```typescript
// パフォーマンス測定の統合
import { usePerformance } from '@/utils/performanceMeasurement'

export const YearOverYearProductAnalysis = () => {
  const perf = usePerformance()
  
  // 初期ロード時間の測定
  useEffect(() => {
    perf.start('initial-data-fetch')
    fetchYearOverYearData().then(() => {
      perf.end('initial-data-fetch')
    })
  }, [])
  
  // フィルタリング時間の測定
  useEffect(() => {
    perf.start('filter-application')
    // フィルタリング処理
    perf.end('filter-application')
  }, [filters])
  
  // メモリ使用量の監視
  useEffect(() => {
    const memory = perf.measureMemory()
    if (memory && memory.used > 200) {
      console.warn('⚠️ 高メモリ使用量:', memory.used.toFixed(2), 'MB')
      console.log('表示中の商品数:', displayedData.length)
    }
  }, [displayedData])
  
  // コンポーネントアンマウント時にレポート出力
  useEffect(() => {
    return () => {
      perf.logReport()
    }
  }, [])
}
```

## 📊 期待される改善効果

### パフォーマンス指標
| 項目 | 改善前 | 改善後 | 改善率 |
|------|--------|--------|--------|
| 初期表示時間 | 5-8秒 | 1秒以下 | 85% |
| 1000商品レンダリング | 5-8秒 | 2秒（仮想化） | 70% |
| フィルタ適用 | 1-2秒 | 200ms | 80% |
| メモリ使用量 | 300-500MB | 100-150MB | 70% |
| スクロール性能 | カクつく | スムーズ | 100% |

### コード品質の改善
- コンポーネント行数: 1041行 → 300行以下（分割後）
- 責務の明確化: 6つの独立したコンポーネント
- 再利用性: ProductTableRowなどの共通コンポーネント化

## 🧪 テスト方法

### 1. レンダリング性能テスト
```javascript
// Chrome DevTools Console で実行
// React Developer Tools の Profiler を使用
1. Profiler タブを開く
2. Start profiling
3. 1000商品のデータを表示
4. Stop profiling
5. Commit duration を確認（目標: 100ms以下）
```

### 2. スクロール性能テスト
```javascript
// Performance タブで確認
1. Performance タブを開く
2. Record 開始
3. 高速スクロール実施
4. Record 停止
5. Dropped frames を確認（目標: 0%）
```

## 🚀 今後の改善案

### Phase 2（中期改善）
1. **Web Worker活用**
   - フィルタリング処理をバックグラウンドで実行
   - メインスレッドの負荷をさらに軽減

2. **サーバーサイドフィルタリング**
   - APIレベルでのフィルタリング実装
   - 転送データ量の削減

3. **プログレッシブエンハンスメント**
   - 基本機能を先に表示
   - 高度な機能を段階的に有効化

---

**作成者**: AIアシスタント YUKI  
**技術サポート**: プロジェクトチームまで  
**最終更新**: 2025-07-27