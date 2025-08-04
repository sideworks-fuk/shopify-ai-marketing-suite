# Frontend パフォーマンス最適化計画

## 📊 現状パフォーマンス分析

### バンドルサイズ分析
```
frontend/out/ ディレクトリ: 44MB
├── static/chunks/vendors.js: 大容量
├── app/layout.css: スタイル統合済み
└── webpack キャッシュ: 多数のホットアップデートファイル
```

### 主要パフォーマンス指標

| 指標 | 現在値 | 目標値 | 優先度 |
|------|--------|--------|--------|
| **バンドルサイズ** | 44MB | <15MB | 🔴 高 |
| **初期読み込み時間** | 未計測 | <3秒 | 🔴 高 |
| **メモ化使用率** | 11% (7/62) | >60% | 🟡 中 |
| **画像最適化** | 無効 | 有効 | 🟡 中 |
| **コード分割** | 部分的 | 完全実装 | 🟡 中 |

---

## 🚀 最適化戦略

### Phase 1: 緊急対応（1週間以内）

#### 1.1 Next.js設定の修正

**現在の問題設定**:
```javascript
// next.config.js
typescript: {
  ignoreBuildErrors: true, // ❌ 品質リスク
},
eslint: {
  ignoreDuringBuilds: true, // ❌ 最適化阻害
},
images: {
  unoptimized: true, // ❌ パフォーマンス低下
}
```

**最適化設定**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ 型チェックを有効化
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // ✅ 画像最適化（Azure Static Web Apps対応）
  images: {
    unoptimized: false,
    domains: ['shopifytestapi20250720173320-aed5bhc0cferg2hm.japanwest-01.azurewebsites.net'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // ✅ パフォーマンス最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // ✅ バンドル分析
  webpack: (config, { dev, isServer }) => {
    // バンドル分析の有効化
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      )
    }
    
    // プロダクションビルドの最適化
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            },
          },
        },
      }
    }
    
    return config
  },
  
  // ✅ 実験的機能でのパフォーマンス向上
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      'recharts',
    ],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
}

module.exports = nextConfig
```

#### 1.2 package.json の最適化

**分析スクリプト追加**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "analyze": "ANALYZE=true npm run build",
    "build:prod": "NODE_ENV=production npm run build",
    "type-check": "tsc --noEmit"
  }
}
```

### Phase 2: コンポーネント最適化（2週間以内）

#### 2.1 重複コンポーネントの統合

**現在の問題**: Year-over-Year系コンポーネント7種類（合計6,000行超）

**統合後の設計**:
```typescript
// ✅ 統合されたConfigurable Component
interface YearOverYearConfig {
  variant: 'detailed' | 'enhanced' | 'improved' | 'minimal' | 'simple'
  displayMode: 'table' | 'chart' | 'hybrid'
  dataProcessing: 'full' | 'optimized' | 'minimal'
}

const YearOverYearAnalysis = React.memo<YearOverYearProps>(({ 
  config, 
  data, 
  onDataChange 
}) => {
  // 設定に基づいた動的レンダリング
  const renderComponent = useMemo(() => {
    switch (config.variant) {
      case 'minimal':
        return <MinimalView data={data} />
      case 'detailed':
        return <DetailedView data={data} />
      default:
        return <StandardView data={data} />
    }
  }, [config.variant, data])
  
  return renderComponent
})

// 推定削減効果: 6,000行 → 1,500行 (75%削減)
```

#### 2.2 メモ化の戦略的実装

**現在の使用率**: 11% (7/62ファイル)  
**目標使用率**: 60%以上

**高優先度コンポーネント**:
```typescript
// ✅ 高頻度レンダリングコンポーネント
const KPICard = React.memo<KPICardProps>(({ 
  title, 
  value, 
  change, 
  trend 
}) => {
  const formattedValue = useMemo(() => 
    formatNumber(value), [value]
  )
  
  const trendColor = useMemo(() => 
    getTrendColor(trend), [trend]
  )
  
  return (
    <Card className={cn("p-4", trendColor)}>
      <h3>{title}</h3>
      <p>{formattedValue}</p>
      <span>{change}</span>
    </Card>
  )
}, (prevProps, nextProps) => {
  // カスタム比較関数
  return (
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.trend === nextProps.trend
  )
})

// ✅ データ処理の重いコンポーネント
const CustomerAnalysisChart = React.memo<CustomerAnalysisProps>(({ 
  customers, 
  dateRange,
  filters 
}) => {
  const processedData = useMemo(() => {
    return expensiveDataProcessing(customers, filters)
  }, [customers, filters])
  
  const chartConfig = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
  }), [])
  
  return <Chart data={processedData} options={chartConfig} />
})
```

#### 2.3 コールバック最適化

```typescript
// ✅ useCallback の戦略的使用
const CustomerTable = React.memo(() => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    )
  }, [])
  
  const handleBulkAction = useCallback((action: string) => {
    // バルクアクションの処理
    performBulkAction(action, selectedIds)
  }, [selectedIds])
  
  return (
    <div>
      {customers.map(customer => (
        <CustomerRow
          key={customer.id}
          customer={customer}
          onSelect={handleSelectCustomer}
          isSelected={selectedIds.includes(customer.id)}
        />
      ))}
    </div>
  )
})
```

### Phase 3: データフェッチング最適化（3週間以内）

#### 3.1 React Query導入

**現在の問題**: キャッシュ機能未実装、重複リクエスト

**最適化実装**:
```typescript
// ✅ React Query の導入
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// キャッシュ戦略の実装
export const useCustomerData = (filters: CustomerFilters) => {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => fetchCustomers(filters),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    cacheTime: 10 * 60 * 1000, // 10分間保持
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // エラーの種類に応じてリトライ戦略を調整
      if (error.status === 404) return false
      return failureCount < 3
    },
  })
}

// 並列データフェッチング
export const useDashboardData = (dateRange: DateRange) => {
  const customersQuery = useQuery({
    queryKey: ['customers', dateRange],
    queryFn: () => fetchCustomers({ dateRange }),
  })
  
  const ordersQuery = useQuery({
    queryKey: ['orders', dateRange],
    queryFn: () => fetchOrders({ dateRange }),
    enabled: !!dateRange, // dateRangeが存在する場合のみ実行
  })
  
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 30 * 60 * 1000, // 30分間キャッシュ（商品データは変更頻度が低い）
  })
  
  return {
    customers: customersQuery.data,
    orders: ordersQuery.data,
    products: productsQuery.data,
    isLoading: customersQuery.isLoading || ordersQuery.isLoading || productsQuery.isLoading,
    error: customersQuery.error || ordersQuery.error || productsQuery.error,
  }
}

// ミューテーションの最適化
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (updatedCustomer) => {
      // 関連するクエリを更新
      queryClient.setQueryData(
        ['customer', updatedCustomer.id],
        updatedCustomer
      )
      
      // 顧客リストを無効化して再フェッチ
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      // エラーハンドリング
      showErrorToast('顧客情報の更新に失敗しました')
    },
  })
}
```

#### 3.2 仮想化による大量データ対応

```typescript
// ✅ React Virtual による大量データ最適化
import { useVirtualizer } from '@tanstack/react-virtual'

const VirtualizedCustomerList = ({ customers }: { customers: Customer[] }) => {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // 各行の推定高さ
    overscan: 10, // バッファ行数
  })
  
  return (
    <div ref={parentRef} className="h-400 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <CustomerRow customer={customers[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Phase 4: アセット最適化（4週間以内）

#### 4.1 動的インポートとコード分割

```typescript
// ✅ 動的インポートの実装
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// 重いコンポーネントの遅延読み込み
const YearOverYearAnalysis = dynamic(
  () => import('../components/dashboards/YearOverYearAnalysis'),
  {
    loading: () => <AnalysisLoadingSkeleton />,
    ssr: false, // クライアントサイドのみで読み込み
  }
)

const RechartsComponents = dynamic(
  () => import('recharts'),
  { ssr: false }
)

// ルートレベルでの動的インポート
const CustomerDashboard = dynamic(
  () => import('../components/dashboards/CustomerDashboard'),
  {
    loading: () => <DashboardSkeleton />,
  }
)

// 条件付きコンポーネント読み込み
const AdminPanel = dynamic(
  () => import('../components/admin/AdminPanel'),
  {
    loading: () => <div>管理画面を読み込み中...</div>,
    ssr: false,
  }
)

export default function Dashboard() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  return (
    <div>
      <BasicDashboard />
      {showAdvanced && (
        <Suspense fallback={<div>高度な機能を読み込み中...</div>}>
          <YearOverYearAnalysis />
        </Suspense>
      )}
    </div>
  )
}
```

#### 4.2 画像最適化戦略

```typescript
// ✅ Next.js Image コンポーネントの活用
import Image from 'next/image'

const OptimizedProductImage = ({ 
  product, 
  priority = false 
}: { 
  product: Product
  priority?: boolean 
}) => {
  return (
    <Image
      src={product.imageUrl}
      alt={product.name}
      width={300}
      height={200}
      priority={priority} // Above-the-fold画像のみtrue
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..." // 小さなblur画像
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={85} // 品質調整
      loading="lazy" // 遅延読み込み
    />
  )
}

// SVGアイコンの最適化
const OptimizedIcon = ({ name, size = 24 }: { name: string, size?: number }) => {
  const IconComponent = useMemo(() => {
    return dynamic(() => import(`lucide-react`).then(mod => ({ default: mod[name] })))
  }, [name])
  
  return <IconComponent size={size} />
}
```

### Phase 5: ビルド最適化（5週間以内）

#### 5.1 Webpack設定の最適化

```javascript
// ✅ 高度なWebpack最適化
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // プロダクションビルドの最適化
    if (!dev) {
      // Tree shaking の強化
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      
      // 重複排除
      config.plugins.push(
        new webpack.optimize.DedupePlugin()
      )
      
      // gzip圧縮の有効化
      const CompressionPlugin = require('compression-webpack-plugin')
      config.plugins.push(
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        })
      )
    }
    
    // CSS最適化
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss)$/,
        chunks: 'all',
        enforce: true,
      }
    }
    
    return config
  },
})
```

#### 5.2 CSS最適化

```typescript
// ✅ Tailwind CSS の最適化
// tailwind.config.ts
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // カスタムカラーのみ定義
      colors: {
        analytics: {
          positive: "#10B981",
          negative: "#EF4444",
          neutral: "#6B7280",
          highlight: "#3B82F6",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  // 未使用のスタイルを除去
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
  },
}
```

---

## 📊 パフォーマンス監視計画

### 監視指標

```typescript
// ✅ Web Vitals の監視
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export function reportWebVitals(metric: any) {
  // 開発環境での監視
  if (process.env.NODE_ENV === 'development') {
    console.log(metric)
  }
  
  // 本番環境での分析ツール送信
  if (process.env.NODE_ENV === 'production') {
    // Google Analytics 4 への送信
    gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }
}

// アプリケーション内でのパフォーマンス測定
export const performanceMonitor = {
  measureComponentRender: (componentName: string) => {
    const start = performance.now()
    return () => {
      const end = performance.now()
      console.log(`${componentName} rendered in ${end - start}ms`)
    }
  },
  
  measureDataFetch: async (fetchName: string, fetchFn: () => Promise<any>) => {
    const start = performance.now()
    try {
      const result = await fetchFn()
      const end = performance.now()
      console.log(`${fetchName} completed in ${end - start}ms`)
      return result
    } catch (error) {
      const end = performance.now()
      console.error(`${fetchName} failed after ${end - start}ms:`, error)
      throw error
    }
  },
}
```

### 継続的な最適化

```json
// package.json - パフォーマンス分析スクリプト
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "lighthouse": "lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html",
    "bundle-size": "npm run build && ls -lah .next/static/chunks/",
    "perf-test": "npm run build && npm run start & sleep 5 && npm run lighthouse && pkill -f 'npm run start'"
  }
}
```

---

## 🎯 成功指標と目標値

| 指標 | 現在値 | 目標値 | 期限 |
|------|--------|--------|------|
| **バンドルサイズ** | 44MB | <15MB | 4週間 |
| **First Contentful Paint** | 未計測 | <1.5秒 | 4週間 |
| **Largest Contentful Paint** | 未計測 | <2.5秒 | 4週間 |
| **Cumulative Layout Shift** | 未計測 | <0.1 | 4週間 |
| **Time to Interactive** | 未計測 | <3秒 | 4週間 |
| **メモ化カバレッジ** | 11% | >60% | 2週間 |

## 📋 実装チェックリスト

### Phase 1: 緊急対応
- [ ] Next.js設定の最適化
- [ ] TypeScript/ESLintエラー修正
- [ ] Console.log除去設定
- [ ] バンドル分析の実装

### Phase 2: コンポーネント最適化
- [ ] 重複コンポーネント統合
- [ ] React.memo実装拡大
- [ ] useCallback/useMemo最適化
- [ ] 不要な再レンダリング修正

### Phase 3: データフェッチング最適化
- [ ] React Query導入
- [ ] キャッシュ戦略実装
- [ ] 並列リクエスト最適化
- [ ] 仮想化実装（大量データ対応）

### Phase 4: アセット最適化
- [ ] 動的インポート実装
- [ ] 画像最適化
- [ ] SVGアイコン最適化
- [ ] コード分割実装

### Phase 5: ビルド最適化
- [ ] Webpack設定最適化
- [ ] CSS最適化
- [ ] gzip圧縮設定
- [ ] Tree shaking最適化

---

**最終更新日**: 2025年7月24日  
**次回パフォーマンス監査予定**: 2025年8月24日