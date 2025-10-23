# パフォーマンス改善 - 即座に実装可能なガイド

**作成者**: Claude (Anthropic)  
**作成日**: 2025-07-27  
**目的**: 開発者がすぐに実装できるパフォーマンス改善策の提供

## 🚀 今すぐ実装できる改善（1-2日で完了）

### 1. 前年同月比【商品】画面の即効改善

#### Step 1: スケルトンローダーの追加（30分）
```tsx
// YearOverYearProductAnalysis.tsx の冒頭に追加
import { TableSkeleton } from '@/components/ui/PerformanceOptimized';

// 初期化中の全画面ローディング部分を置き換え（706行目付近）
if (!initialized) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            前年同月比【商品】分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={10} columns={13} />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Step 2: 初期表示制限の実装（1時間）
```tsx
// 858行目のメインデータテーブル部分を修正
import { IncrementalDataLoader } from '@/components/ui/PerformanceOptimized';

// <Card> の中身を以下に置き換え
<CardContent>
  <IncrementalDataLoader
    data={filteredAndSortedData}
    initialCount={30} // 初期は30件のみ表示
    incrementSize={30}
    renderItem={(product) => (
      <div className="border-b hover:bg-gray-50 transition-colors">
        {/* 既存のテーブル行レンダリング */}
      </div>
    )}
    className="overflow-x-auto"
  />
</CardContent>
```

#### Step 3: 重い計算のメモ化（2時間）
```tsx
// 411行目付近、データ変換関数をメモ化
const convertApiDataToProductYearData = useMemo(() => {
  return (apiData: YearOverYearProductData[], currentYear: number): ProductYearData[] => {
    console.time('Data Conversion');
    const result = apiData.map((product, index) => {
      // 既存の変換ロジック
    });
    console.timeEnd('Data Conversion');
    return result;
  };
}, []); // 依存配列は空（関数自体は不変）

// フィルタリング関数もメモ化（555行目付近）
const filteredAndSortedData = useMemo(() => {
  console.time('Filtering and Sorting');
  
  // 早期リターンで処理を軽減
  if (!data || data.length === 0) return [];
  
  const filtered = data.filter((product) => {
    // 検索フィルタ（最も軽い処理を先に）
    if (appliedFilters.searchTerm && 
        !product.productName.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase())) {
      return false;
    }
    
    // 以降の既存フィルタロジック
  });
  
  console.timeEnd('Filtering and Sorting');
  return filtered;
}, [data, appliedFilters, sortBy, viewMode]);
```

### 2. 休眠顧客分析画面の即効改善

#### Step 1: 初期ロード数の削減（30分）
```tsx
// DormantCustomerAnalysis.tsx の 110行目付近を修正
const [customersResponse, summaryResponse] = await Promise.all([
  api.dormantCustomers({
    storeId: 1,
    pageSize: 30, // 100から30に削減
    sortBy: 'RiskLevel', // リスクレベル順に変更
    descending: true // 高リスクから表示
  }),
  api.dormantSummary(1)
]);
```

#### Step 2: プログレス表示の追加（1時間）
```tsx
// 352行目付近、fetchLargeDataset関数に追加
import { ProgressiveLoader } from '@/components/ui/PerformanceOptimized';

// isProcessing状態の時に表示
{isProcessing && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <ProgressiveLoader
      current={performanceMetrics.totalLoaded}
      total={summaryData?.totalDormantCustomers || 1000}
      message={processingMessage}
      subMessage={`${performanceMetrics.lastLoadTime.toFixed(0)}ms/batch`}
    />
    <button
      onClick={cancelProcessing}
      className="absolute top-4 right-4 text-white hover:text-gray-300"
    >
      キャンセル
    </button>
  </div>
)}
```

#### Step 3: 仮想スクロールの実装（2時間）
```tsx
// DormantCustomerList.tsx を修正
import { VirtualizedList } from '@/components/ui/PerformanceOptimized';

export const DormantCustomerList = ({ customers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>休眠顧客リスト</CardTitle>
      </CardHeader>
      <CardContent>
        <VirtualizedList
          items={customers}
          itemHeight={80}
          containerHeight={600}
          renderItem={(customer) => (
            <CustomerRow customer={customer} />
          )}
          overscan={3}
        />
      </CardContent>
    </Card>
  );
};
```

### 3. 共通改善: デバウンスの実装（1時間）

```tsx
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// 使用例: フィルター入力
const searchTerm = useDebounce(filters.searchTerm, 300);

useEffect(() => {
  if (searchTerm) {
    fetchYearOverYearData();
  }
}, [searchTerm]); // searchTermの変更時のみ実行
```

## 📊 パフォーマンス測定コード

```tsx
// utils/measurePerformance.ts
export const measureComponentPerformance = (componentName: string) => {
  const measures: Record<string, number> = {};
  
  return {
    start: (label: string) => {
      performance.mark(`${componentName}-${label}-start`);
    },
    
    end: (label: string) => {
      performance.mark(`${componentName}-${label}-end`);
      performance.measure(
        `${componentName}-${label}`,
        `${componentName}-${label}-start`,
        `${componentName}-${label}-end`
      );
      
      const measure = performance.getEntriesByName(`${componentName}-${label}`)[0];
      measures[label] = measure.duration;
      
      console.log(`⚡ [${componentName}] ${label}: ${measure.duration.toFixed(2)}ms`);
    },
    
    getReport: () => {
      const total = Object.values(measures).reduce((sum, val) => sum + val, 0);
      return {
        measures,
        total,
        average: total / Object.keys(measures).length
      };
    }
  };
};

// 使用例
const perf = measureComponentPerformance('YearOverYearAnalysis');

perf.start('data-fetch');
const data = await fetchData();
perf.end('data-fetch');

perf.start('render');
// レンダリング処理
perf.end('render');

console.log(perf.getReport());
```

## 🎯 実装チェックリスト

### Day 1（4-6時間）
- [ ] スケルトンローダー実装（両画面）
- [ ] 初期表示データ制限（前年同月比：30件、休眠顧客：30件）
- [ ] プログレス表示追加

### Day 2（4-6時間）  
- [ ] メモ化実装（useMemo活用）
- [ ] 仮想スクロール実装（大量データ対応）
- [ ] デバウンス実装（フィルター最適化）

### 測定・検証（2時間）
- [ ] パフォーマンス測定コード追加
- [ ] 改善前後の比較測定
- [ ] ユーザーテスト実施

## 期待される即効果

| 項目 | 改善前 | 改善後 | 改善率 |
|------|--------|---------|---------|
| 初期表示 | 3-5秒 | 1-2秒 | 60% |
| 大量データ表示 | 10秒以上 | 2-3秒 | 70% |
| メモリ使用量 | 200MB+ | 80MB | 60% |
| 体感速度 | 遅い | 快適 | - |

## トラブルシューティング

### Q: スケルトンローダーが表示されない
```tsx
// 非同期処理の前に必ずローディング状態を設定
setIsLoading(true); // これを忘れずに！
try {
  const data = await fetchData();
} finally {
  setIsLoading(false);
}
```

### Q: メモ化が効いていない
```tsx
// 依存配列を正しく設定
const memoizedValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]); // dataが変わった時のみ再計算

// ❌ 間違い：毎回新しいオブジェクトを作成
const filters = { ...defaultFilters, ...userFilters };

// ✅ 正解：参照が変わらないように
const filters = useMemo(() => ({
  ...defaultFilters,
  ...userFilters
}), [userFilters]);
```

### Q: 仮想スクロールがカクつく
```tsx
// アイテムの高さを固定に
const ITEM_HEIGHT = 80; // 固定値を使用

// React.memoでアイテムコンポーネントを最適化
const CustomerRow = React.memo(({ customer }) => {
  return <div>...</div>;
}, (prev, next) => prev.customer.id === next.customer.id);
```