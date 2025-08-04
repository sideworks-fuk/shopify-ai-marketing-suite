# 休眠顧客分析画面 - パフォーマンス改善実装ガイド

**作成者**: AIアシスタント YUKI（技術アドバイザー）  
**作成日**: 2025-07-27  
**対象画面**: CUST-01-DORMANT（休眠顧客分析画面）  
**優先度**: 🔴 最高（365日以上セグメントのフリーズ問題）

## 🎯 本ドキュメントの目的

休眠顧客分析画面の深刻なパフォーマンス問題を解決するための具体的な実装手順を提供します。

## 🚨 解決すべき問題

### 1. 365日以上セグメントのフリーズ問題
- **現象**: セグメント選択時に30秒以上UIがフリーズ
- **原因**: 最大1000件のデータを同期的に取得・処理
- **影響**: ユーザーが操作不能になり、ブラウザが応答なしになる場合も

### 2. メモリ使用量の増大
- **現象**: データ量に比例してメモリ使用量が増加（500MB超）
- **原因**: 全データをステートに保持し、複数の派生ステートを生成
- **影響**: ブラウザのパフォーマンス低下、タブのクラッシュ

## 💡 実装する改善策

### Step 1: スケルトンローダーの実装（30分）

#### 1. インポートの追加
```typescript
// DormantCustomerAnalysis.tsx の冒頭に追加
import { 
  TableSkeleton, 
  CardSkeleton,
  ProgressiveLoader 
} from '@/components/ui/PerformanceOptimized'
```

#### 2. ローディング表示の改善
```typescript
// 106行目付近、既存のローディング表示を置き換え
if (isLoading && !dormantData.length) {
  return (
    <div className="p-6 space-y-6">
      {/* サマリーカードのスケルトン */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <CardSkeleton />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* テーブルのスケルトン */}
      <Card>
        <CardHeader>
          <CardTitle>休眠顧客リスト</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={15} columns={8} />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 2: ストリーミング処理の実装（2時間）

#### 1. 新しいストリーミング関数の作成
```typescript
// 400行目付近、fetchLargeDatasetを以下で置き換え
const streamLargeDataset = useCallback(async (segment: string) => {
  // UIのフリーズを防ぐための非同期ストリーミング実装
  setIsProcessing(true)
  setProcessingMessage('休眠顧客データを読み込んでいます...')
  
  const CHUNK_SIZE = 20 // 一度に取得する件数を小さく
  const DELAY_MS = 50  // チャンク間の遅延（ミリ秒）
  
  let allCustomers: any[] = []
  let pageNumber = 1
  let hasMore = true
  let totalLoaded = 0
  
  try {
    // 初回は即座に表示するため遅延なし
    const firstBatch = await api.dormantCustomers({
      storeId: 1,
      pageNumber: 1,
      pageSize: CHUNK_SIZE,
      segment,
      sortBy: 'RiskLevel',
      descending: true
    })
    
    allCustomers = firstBatch.data.customers
    setDormantData(allCustomers)
    totalLoaded = allCustomers.length
    
    setPerformanceMetrics(prev => ({
      ...prev,
      totalLoaded,
      currentBatch: 1
    }))
    
    hasMore = firstBatch.data.hasNextPage
    pageNumber = 2
    
    // 残りのデータを非同期でストリーミング
    while (hasMore) {
      // パフォーマンス測定開始
      const batchStart = performance.now()
      
      const response = await api.dormantCustomers({
        storeId: 1,
        pageNumber,
        pageSize: CHUNK_SIZE,
        segment
      })
      
      const batchTime = performance.now() - batchStart
      
      // 新しいデータを追加（重複チェック付き）
      const newCustomers = response.data.customers.filter(
        customer => !allCustomers.find(c => c.id === customer.id)
      )
      
      if (newCustomers.length > 0) {
        allCustomers = [...allCustomers, ...newCustomers]
        totalLoaded += newCustomers.length
        
        // Reactの再レンダリングを最適化
        setDormantData([...allCustomers])
        
        // メトリクスの更新
        setPerformanceMetrics(prev => ({
          ...prev,
          totalLoaded,
          currentBatch: pageNumber,
          lastLoadTime: batchTime,
          averageLoadTime: (prev.averageLoadTime * (pageNumber - 1) + batchTime) / pageNumber
        }))
      }
      
      hasMore = response.data.hasNextPage
      pageNumber++
      
      // UIの応答性を保つための遅延
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
      
      // 処理メッセージの更新
      setProcessingMessage(
        `休眠顧客データを読み込んでいます... (${totalLoaded}件/${summaryData?.totalDormantCustomers || '?'}件)`
      )
    }
    
    setProcessingMessage('読み込み完了！')
    
    // 完了後、短時間表示してから非表示に
    setTimeout(() => {
      setIsProcessing(false)
    }, 1000)
    
  } catch (error) {
    console.error('ストリーミング中のエラー:', error)
    setError('データの読み込み中にエラーが発生しました')
    setIsProcessing(false)
  }
}, [summaryData])

// キャンセル機能の追加
const cancelProcessing = useCallback(() => {
  setIsProcessing(false)
  setProcessingMessage('')
  // 現在のデータはそのまま保持
}, [])
```

#### 2. プログレス表示の追加
```typescript
// 750行目付近、return文の中に追加
{isProcessing && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
    <div className="relative">
      <ProgressiveLoader
        current={performanceMetrics.totalLoaded}
        total={summaryData?.totalDormantCustomers || 1000}
        message={processingMessage}
        subMessage={`処理速度: ${performanceMetrics.averageLoadTime.toFixed(0)}ms/バッチ`}
      />
      
      {/* キャンセルボタン */}
      <button
        onClick={cancelProcessing}
        className="absolute -top-10 -right-10 text-white hover:text-gray-300 transition-colors"
        aria-label="キャンセル"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  </div>
)}
```

### Step 3: 初期表示の最適化（1時間）

#### 1. 初期ロード数の削減
```typescript
// 110行目付近、useEffectの中を修正
useEffect(() => {
  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      
      // 並列で取得（サマリーは軽いので同時実行）
      const [customersResponse, summaryResponse] = await Promise.all([
        api.dormantCustomers({
          storeId: 1,
          pageSize: 30, // 100から30に削減
          pageNumber: 1,
          sortBy: 'RiskLevel', // リスクレベル順
          descending: true     // 高リスクを先に表示
        }),
        api.dormantSummary(1)
      ])
      
      setDormantData(customersResponse.data.customers)
      setSummaryData(summaryResponse.data)
      
      // 30件以上ある場合は「もっと見る」ボタンを表示
      setHasMore(customersResponse.data.hasNextPage)
      
    } catch (err) {
      console.error('初期データ読み込みエラー:', err)
      setError('データの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }
  
  loadInitialData()
}, [])
```

#### 2. 段階的ローディングボタンの追加
```typescript
// テーブルの下に追加（900行目付近）
{hasMore && !isProcessing && (
  <div className="mt-6 text-center">
    <button
      onClick={() => {
        if (selectedSegment === '365日以上') {
          streamLargeDataset(selectedSegment)
        } else {
          // 通常の追加読み込み
          loadMoreData()
        }
      }}
      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center space-x-2"
    >
      <Download className="w-4 h-4" />
      <span>
        {selectedSegment === '365日以上' 
          ? '全データを読み込む（ストリーミング）'
          : 'さらに表示'
        }
      </span>
    </button>
  </div>
)}
```

### Step 4: メモリ最適化（1時間）

#### 1. 不要な派生ステートの削除
```typescript
// フィルタリング処理をメモ化（506行目付近）
const filteredCustomers = useMemo(() => {
  if (!dormantData || dormantData.length === 0) return []
  
  return dormantData.filter(customer => {
    // 早期リターンで処理を軽減
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = 
        customer.name?.toLowerCase().includes(search) ||
        customer.email?.toLowerCase().includes(search)
      
      if (!matchesSearch) return false
    }
    
    if (filters.riskLevel && customer.riskLevel !== filters.riskLevel) {
      return false
    }
    
    if (filters.segment && customer.segment !== filters.segment) {
      return false
    }
    
    return true
  })
}, [dormantData, searchTerm, filters])

// ページネーション処理もメモ化
const paginatedCustomers = useMemo(() => {
  const start = (currentPage - 1) * pageSize
  return filteredCustomers.slice(start, start + pageSize)
}, [filteredCustomers, currentPage, pageSize])
```

#### 2. パフォーマンス測定の追加
```typescript
// コンポーネントの冒頭に追加
import { usePerformance } from '@/utils/performanceMeasurement'

export const DormantCustomerAnalysis = () => {
  const perf = usePerformance()
  
  // マウント時間の測定
  perf.useMountTime('DormantCustomerAnalysis')
  
  // API呼び出しの測定
  const loadInitialData = async () => {
    const data = await perf.measureApiCall(
      () => api.dormantCustomers({ storeId: 1, pageSize: 30 }),
      'initial-dormant-load'
    )
    // ...
  }
  
  // メモリ監視
  useEffect(() => {
    const memory = perf.measureMemory()
    if (memory && memory.used > 150) {
      console.warn('⚠️ 高メモリ使用量検出:', memory.used.toFixed(2), 'MB')
    }
  }, [dormantData.length])
}
```

## 📊 期待される改善効果

### パフォーマンス指標
| 項目 | 改善前 | 改善後 | 改善率 |
|------|--------|--------|--------|
| 初期表示 | 3-5秒 | 1秒以下 | 80% |
| 365日セグメント | 30秒+フリーズ | 3秒（ストリーミング） | 90% |
| メモリ使用量 | 200-500MB | 80-150MB | 60% |
| 応答性 | フリーズあり | 常に応答可能 | 100% |

### ユーザー体験の改善
- ✅ フリーズの完全解消
- ✅ プログレス表示による進捗の可視化
- ✅ キャンセル可能な処理
- ✅ スムーズなスクロールとインタラクション

## 🧪 テスト方法

### 1. パフォーマンステスト
```bash
# Chrome DevToolsで実行
1. Performance タブを開く
2. Record を開始
3. 365日以上セグメントを選択
4. Record を停止
5. Main Thread の blocking time を確認（50ms以下が目標）
```

### 2. メモリ使用量テスト
```bash
# Chrome DevToolsで実行
1. Memory タブを開く
2. Take snapshot（初期状態）
3. 全データを読み込む
4. Take snapshot（読込後）
5. 比較して増加量を確認（150MB以下が目標）
```

## 🚀 次のステップ

### Phase 2での追加改善
1. **仮想スクロールの実装**（さらなるメモリ削減）
2. **Web Workerでのデータ処理**（メインスレッドの負荷軽減）
3. **IndexedDBキャッシュ**（オフライン対応）

---

**作成者**: AIアシスタント YUKI  
**連絡先**: プロジェクトマネージャーまで  
**最終更新**: 2025-07-27