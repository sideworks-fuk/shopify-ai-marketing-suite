# 🔧 技術的負債改善ガイド

## 📋 目次

1. [重複ファイル解消手順](#重複ファイル解消手順)
2. [大規模コンポーネント分割手順](#大規模コンポーネント分割手順)
3. [ハードコードデータ分離手順](#ハードコードデータ分離手順)
4. [パフォーマンス最適化手順](#パフォーマンス最適化手順)
5. [ベストプラクティス](#ベストプラクティス)

---

## 🔴 重複ファイル解消手順

### 問題概要
以下のファイルが重複配置されている状況：
```
components/ui/button.tsx           ⚠️ src/components/ui/button.tsx
components/ui/use-toast.ts        ⚠️ hooks/use-toast.ts
components/ui/[その他多数]        ⚠️ src/components/ui/[対応ファイル]
```

### ステップ1: 重複ファイルの詳細調査

```powershell
# 重複ファイルの完全リストを作成
Get-ChildItem -Path ".\components\ui\" -Name | Out-File -FilePath "components-ui-list.txt"
Get-ChildItem -Path ".\src\components\ui\" -Name | Out-File -FilePath "src-components-ui-list.txt"

# 差分を確認
Compare-Object (Get-Content "components-ui-list.txt") (Get-Content "src-components-ui-list.txt")
```

### ステップ2: インポートパスの調査

```powershell
# src/components/ui を参照しているファイルを検索
Select-String -Path ".\src\**\*.tsx", ".\src\**\*.ts" -Pattern "from.*[\"'].*src/components/ui"
```

### ステップ3: インポートパスの統一

**対象ファイル例**: `src/components/layout/MainLayout.tsx`

```typescript
// 修正前
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

// 修正後
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

### ステップ4: src/components/ui ディレクトリの削除

```powershell
# バックアップ作成
Copy-Item -Path ".\src\components\ui" -Destination ".\backup\src-components-ui-backup" -Recurse

# 削除実行（慎重に）
Remove-Item -Path ".\src\components\ui" -Recurse -Force
```

### ステップ5: ビルドテスト

```powershell
npm run build
```

**エラーが発生した場合**:
1. エラーメッセージから未修正のインポートパスを特定
2. 該当ファイルのインポートパスを修正
3. 再度ビルドテスト

---

## 🟡 大規模コンポーネント分割手順

### CustomerDashboard.tsx 分割例

#### 現在の構造分析
```typescript
// CustomerDashboard.tsx (1,075行)
- KPI表示セクション        (行数: ~200)
- 顧客セグメント分析       (行数: ~300)
- RFM分析                 (行数: ~250)
- データテーブル           (行数: ~200)
- ユーティリティ関数       (行数: ~125)
```

#### 分割計画
```
src/components/dashboards/customer/
├── CustomerDashboard.tsx          # メインコンポーネント (100-150行)
├── CustomerKPISection.tsx         # KPI表示 (150-200行)
├── CustomerSegmentAnalysis.tsx    # セグメント分析 (200-250行)
├── CustomerRFMAnalysis.tsx        # RFM分析 (200-250行)
├── CustomerDataTable.tsx          # データテーブル (150-200行)
└── hooks/
    ├── useCustomerData.ts         # データフック (50-100行)
    ├── useCustomerSegments.ts     # セグメントフック (50-100行)
    └── useRFMCalculation.ts       # RFM計算フック (75-125行)
```

#### 実装手順

**ステップ1: ディレクトリ作成**
```powershell
New-Item -Path ".\src\components\dashboards\customer" -ItemType Directory
New-Item -Path ".\src\components\dashboards\customer\hooks" -ItemType Directory
```

**ステップ2: カスタムフックの抽出**

`useCustomerData.ts`:
```typescript
import { useState, useEffect } from 'react'
import type { ShopifyCustomer } from '@/lib/shopify'

export const useCustomerData = (period: string) => {
  const [customers, setCustomers] = useState<ShopifyCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // データ取得ロジック
  }, [period])

  return { customers, loading, error }
}
```

**ステップ3: サブコンポーネントの作成**

`CustomerKPISection.tsx`:
```typescript
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ShopifyCustomer } from '@/lib/shopify'

interface CustomerKPISectionProps {
  customers: ShopifyCustomer[]
  loading: boolean
}

export const CustomerKPISection: React.FC<CustomerKPISectionProps> = ({ 
  customers, 
  loading 
}) => {
  // KPI 計算ロジック
  const totalCustomers = customers.length
  const newCustomers = customers.filter(c => c.orders_count === 1).length
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* KPI カードの実装 */}
    </div>
  )
}
```

**ステップ4: メインコンポーネントの簡素化**

`CustomerDashboard.tsx`:
```typescript
import React from 'react'
import { useCustomerData } from './hooks/useCustomerData'
import { CustomerKPISection } from './CustomerKPISection'
import { CustomerSegmentAnalysis } from './CustomerSegmentAnalysis'
import { CustomerRFMAnalysis } from './CustomerRFMAnalysis'
import { CustomerDataTable } from './CustomerDataTable'

export const CustomerDashboard: React.FC = () => {
  const { customers, loading, error } = useCustomerData('current_month')

  if (error) return <div>エラー: {error}</div>

  return (
    <div className="space-y-6">
      <CustomerKPISection customers={customers} loading={loading} />
      <CustomerSegmentAnalysis customers={customers} loading={loading} />
      <CustomerRFMAnalysis customers={customers} loading={loading} />
      <CustomerDataTable customers={customers} loading={loading} />
    </div>
  )
}
```

---

## 🟡 ハードコードデータ分離手順

### ステップ1: モックデータディレクトリの作成

```powershell
New-Item -Path ".\src\data" -ItemType Directory
New-Item -Path ".\src\data\mock" -ItemType Directory
```

### ステップ2: モックデータファイルの作成

`src/data/mock/sales-data.ts`:
```typescript
import type { ShopifyOrder, ShopifyProduct } from '@/lib/shopify'

export const mockKPIData = {
  totalSales: { current: 2450000, previous: 2180000, change: 12.4 },
  totalOrders: { current: 1234, previous: 1156, change: 6.7 },
  averageOrderValue: { current: 1986, previous: 1886, change: 5.3 },
  totalProducts: { current: 89, previous: 85, change: 4.7 },
} as const

export const mockMonthlyComparison = [
  { month: "1月", current: 1250000, previous: 1100000 },
  { month: "2月", current: 1320000, previous: 1180000 },
  // ...
] as const

export const mockProductRanking = [
  { name: "商品A", sales: 450000, orders: 156, growth: 23.5 },
  { name: "商品B", sales: 380000, orders: 134, growth: 18.2 },
  // ...
] as const
```

### ステップ3: データプロバイダーの作成

`src/lib/data-provider.ts`:
```typescript
import { mockKPIData, mockMonthlyComparison } from '@/data/mock/sales-data'
import { DataService } from './data-service'

export class DataProvider {
  private static isDevelopment = process.env.NODE_ENV === 'development'
  private static dataService = new DataService(
    process.env.SHOPIFY_SHOP_DOMAIN || '',
    process.env.SHOPIFY_ACCESS_TOKEN || ''
  )

  static async getKPIData() {
    if (this.isDevelopment) {
      return mockKPIData
    }
    return this.dataService.getAnalyticsData()
  }

  static async getMonthlyComparison() {
    if (this.isDevelopment) {
      return mockMonthlyComparison
    }
    return this.dataService.getMonthlyComparisonData()
  }
}
```

### ステップ4: コンポーネントでの使用

```typescript
// 修正前
const kpiData = {
  totalSales: { current: 2450000, previous: 2180000, change: 12.4 },
  // ハードコード...
}

// 修正後
import { DataProvider } from '@/lib/data-provider'

const [kpiData, setKpiData] = useState(null)

useEffect(() => {
  DataProvider.getKPIData().then(setKpiData)
}, [])
```

---

## 🟢 パフォーマンス最適化手順

### React.memo の適用

**対象コンポーネントの特定**:
```typescript
// 頻繁に再レンダリングされるコンポーネント
- KPICard
- ChartComponent  
- DataTableRow
```

**実装例**:
```typescript
// 修正前
export const KPICard = ({ title, value, change, icon }) => {
  // 実装
}

// 修正後
import React from 'react'

interface KPICardProps {
  title: string
  value: number
  change: number
  icon: React.ComponentType
}

export const KPICard = React.memo<KPICardProps>(({ title, value, change, icon }) => {
  // 実装
})

KPICard.displayName = 'KPICard'
```

### useMemo / useCallback の適用

```typescript
const ExpensiveComponent = ({ data, filters, onFilterChange }) => {
  // 重い計算のメモ化
  const processedData = useMemo(() => {
    return data.filter(item => 
      filters.every(filter => filter.apply(item))
    ).sort((a, b) => b.value - a.value)
  }, [data, filters])

  // イベントハンドラーのメモ化
  const handleFilterChange = useCallback((newFilter) => {
    onFilterChange(prevFilters => [...prevFilters, newFilter])
  }, [onFilterChange])

  return (
    <div>
      {processedData.map(item => (
        <DataRow 
          key={item.id} 
          data={item} 
          onFilterChange={handleFilterChange} 
        />
      ))}
    </div>
  )
}
```

### 動的インポートの追加

```typescript
// 修正前
import YearOverYearProductAnalysis from './YearOverYearProductAnalysis'

// 修正後
import dynamic from 'next/dynamic'

const YearOverYearProductAnalysis = dynamic(
  () => import('./YearOverYearProductAnalysis'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">年次分析を読み込み中...</span>
      </div>
    )
  }
)
```

---

## 📋 ベストプラクティス

### コンポーネント設計原則

1. **単一責任原則**: 1つのコンポーネントは1つの責任のみ
2. **適切なサイズ**: 200行以下を目安に
3. **型安全性**: 必ずTypeScriptの型定義を作成
4. **再利用性**: プロップスで外部から制御可能に

### ファイル命名規則

```
components/
├── ui/                    # 基盤UIコンポーネント
├── forms/                 # フォーム関連
├── dashboards/            # ダッシュボード機能
│   ├── sales/            # 売上分析関連
│   ├── customer/         # 顧客分析関連
│   └── shared/           # 共通コンポーネント
└── layout/               # レイアウト関連
```

### インポート順序

```typescript
// 1. React関連
import React, { useState, useEffect } from 'react'

// 2. 外部ライブラリ
import { BarChart, Bar, XAxis, YAxis } from 'recharts'

// 3. 内部ライブラリ・ユーティリティ
import { formatCurrency } from '@/lib/utils'

// 4. 型定義
import type { ShopifyOrder } from '@/lib/shopify'

// 5. 内部コンポーネント
import { Card, CardContent } from '@/components/ui/card'
import { KPICard } from './shared/KPICard'
```

### エラーハンドリングパターン

```typescript
const DataComponent = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await DataProvider.getData()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-800">エラー: {error}</p>
      </div>
    )
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return <DataDisplay data={data} />
}
```

### テスト戦略

```typescript
// KPICard.test.tsx
import { render, screen } from '@testing-library/react'
import { KPICard } from './KPICard'

describe('KPICard', () => {
  it('正しくタイトルと値を表示する', () => {
    render(
      <KPICard 
        title="売上" 
        value={1000000} 
        change={12.5} 
        icon={DollarSign} 
      />
    )

    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('¥1,000,000')).toBeInTheDocument()
    expect(screen.getByText('+12.5%')).toBeInTheDocument()
  })

  it('負の変化率を正しく表示する', () => {
    render(
      <KPICard 
        title="売上" 
        value={1000000} 
        change={-5.2} 
        icon={DollarSign} 
      />
    )

    expect(screen.getByText('-5.2%')).toBeInTheDocument()
  })
})
```

---

## 🚀 実行チェックリスト

### 重複ファイル解消完了チェック
- [ ] 重複ファイルリストの作成
- [ ] インポートパスの調査・修正
- [ ] 重複ディレクトリの削除
- [ ] ビルドテストの成功
- [ ] 本番環境でのテスト

### コンポーネント分割完了チェック
- [ ] 分割計画の策定
- [ ] カスタムフックの抽出
- [ ] サブコンポーネントの作成
- [ ] メインコンポーネントの簡素化
- [ ] 型定義の整備
- [ ] テストの作成

### データ分離完了チェック
- [ ] モックデータディレクトリの作成
- [ ] モックデータファイルの作成
- [ ] データプロバイダーの実装
- [ ] 環境変数の設定
- [ ] 開発/本番環境での動作確認

---

*最終更新: 2025年5月25日*
*作成者: AI Assistant*
*次回レビュー: 月次* 