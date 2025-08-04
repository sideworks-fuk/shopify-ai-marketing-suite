# フロントエンドAPI利用状況

## 画面別API利用マップ

### 🖥️ 実装済み画面

#### 休眠顧客【顧客】
- **パス**: `/customers/dormant`
- **メインコンポーネント**: `DormantCustomerAnalysis.tsx`
- **ページコンポーネント**: `page.tsx (customers/dormant)`
- **使用API**:
  - ✅ `GET /api/customer/dormant` - 休眠顧客一覧
  - ✅ `GET /api/customer/dormant/summary` - 休眠顧客サマリー
  - ⚠️ `GET /api/customer/dormant/detailed-segments` - 期間別セグメント（エラー多発）

**API呼び出しパターン:**
```typescript
// DormantCustomerAnalysis.tsx
const [customersResponse, summaryResponse] = await Promise.all([
  api.dormantCustomers({
    storeId: 1,
    pageSize: 100,
    sortBy: 'DaysSinceLastPurchase',
    descending: false
  }),
  api.dormantSummary(1)
])

// page.tsx (dormant)
const response = await api.dormantCustomers({
  storeId: 1,
  segment,
  pageSize: 200, // 大量データ取得
  sortBy: 'DaysSinceLastPurchase',
  descending: true
})
```

#### 前年同月比【商品】
- **パス**: `/sales/year-over-year`
- **コンポーネント**: `YearOverYearProductAnalysis.tsx`
- **使用API**:
  - ✅ `GET /api/analytics/year-over-year` - 前年同月比分析
  - ✅ `GET /api/analytics/product-types` - 商品タイプ一覧

**API呼び出しパターン:**
```typescript
// YearOverYearProductAnalysis.tsx
const response = await fetch(`/api/analytics/year-over-year?${params}`)
```

#### 購入回数詳細【購買】
- **パス**: `/purchase/frequency-detail`
- **コンポーネント**: `PurchaseFrequencyDetailAnalysis.tsx`
- **使用API**:
  - ✅ `GET /api/purchase/count-analysis` - 購入回数分析
  - ✅ `GET /api/purchase/count-summary` - 購入回数サマリー
  - ✅ `GET /api/purchase/count-trends` - 購入回数トレンド

### 🚧 部分実装画面

#### 月別売上統計【売上】
- **パス**: `/sales/monthly-stats`
- **コンポーネント**: `MonthlyStatsAnalysis.tsx`
- **実装状況**: バックエンドAPI実装済み、フロントエンド接続作業中
- **使用予定API**:
  - 🚧 `GET /api/analytics/monthly-sales` - 月別売上統計
  - ❌ `GET /api/analytics/monthly-sales/summary` - 月別売上サマリー（未実装）

### 📊 APIクライアント利用状況

#### 統一APIクライアント (`src/lib/api-client.ts`)

**休眠顧客関連:**
```typescript
// 利用頻度: 高
dormantCustomers: (params) => apiClient.get<any>(url)      // ✅ 頻繁利用
dormantSummary: (storeId) => apiClient.get<any>(url)       // ✅ 頻繁利用
dormantDetailedSegments: (storeId) => apiClient.get<any>(url) // ⚠️ エラー多発
```

**顧客関連:**
```typescript
// 利用頻度: 中
customerDashboard: () => apiClient.get<any>(url)          // ✅ 時々利用
customerSegments: () => apiClient.get<any>(url)           // ✅ 時々利用
customerDetails: () => apiClient.get<any>(url)            // ✅ 時々利用
customerDetail: (id) => apiClient.get<any>(url)           // ✅ 時々利用
customerTop: () => apiClient.get<any>(url)                // ✅ 時々利用
```

**月別売上関連:**
```typescript
// 利用頻度: 低（開発中）
monthlySales: (params) => apiClient.get<any>(url)         // 🚧 実装中
monthlySalesSummary: (params) => apiClient.get<any>(url)  // 🚧 実装中
monthlySalesCategories: (params) => apiClient.get<any>(url) // 🚧 実装中
monthlySalesTrends: (storeId, year) => apiClient.get<any>(url) // 🚧 実装中
```

**システム関連:**
```typescript
// 利用頻度: 低（テスト用）
health: () => apiClient.get<any>(url)                     // ✅ テスト時のみ
customerTest: () => apiClient.get<any>(url)               // ✅ テスト時のみ
```

#### レガシーサービス層 (`src/lib/data-service.ts`)

**段階的移行中:**
```typescript
// ⚠️ 非推奨 - api-client.ts への移行対象
export class DataService {
  async getAnalyticsData(): Promise<AnalyticsData> // モックデータ
  async getDormantCustomers(): Promise<DormantCustomer[]> // 未使用
  // その他レガシーメソッド
}
```

### 🔌 直接fetch/axios利用

#### YearOverYearProductAnalysis.tsx
```typescript
// 直接fetch利用（統一APIクライアント移行推奨）
const response = await fetch(`/api/analytics/year-over-year?${searchParams}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
})
```

#### その他のコンポーネント
- 大部分は統一APIクライアント（`api-client.ts`）経由
- 一部の古いコンポーネントで直接fetch利用

### 📈 利用統計（推定）

| API | 日次呼び出し数 | 画面 | 利用パターン |
|-----|---------------|------|-------------|
| `/api/customer/dormant` | 150-200回 | 休眠顧客分析 | ページング、フィルタリング |
| `/api/customer/dormant/summary` | 50-70回 | 休眠顧客分析 | 初期表示、更新 |
| `/api/analytics/year-over-year` | 30-50回 | 前年同月比 | 条件変更時 |
| `/api/purchase/count-analysis` | 20-30回 | 購入回数分析 | フィルタ変更時 |
| `/api/customer/dashboard` | 100-150回 | 各種ダッシュボード | モックデータ |

### 🚨 問題のあるAPI利用パターン

#### 1. 高頻度な重いAPI呼び出し
```typescript
// ❌ 問題: フィルタ変更のたびに重いAPIを呼び出し
useEffect(() => {
  api.dormantCustomers({ storeId: 1, pageSize: 200 })
}, [filters]) // フィルタ変更のたび
```

**改善案:**
```typescript
// ✅ 改善: 初回は大量取得、以降はクライアントサイドフィルタ
const [allData, setAllData] = useState([])
const filteredData = useMemo(() => 
  allData.filter(item => matchesFilter(item, filters))
, [allData, filters])
```

#### 2. エラーハンドリング不備
```typescript
// ❌ 問題: エラーハンドリングなし
const data = await api.dormantDetailedSegments(1)
```

**改善案:**
```typescript
// ✅ 改善: 統一エラーハンドラー使用
try {
  const data = await api.dormantDetailedSegments(1)
} catch (error) {
  await handleApiError(error, '/api/customer/dormant/detailed-segments', 'GET', {
    context: 'DormantSegmentFetch',
    severity: 'warning',
    fallback: { enabled: true, useMockData: true }
  })
}
```

#### 3. 不要な並列呼び出し
```typescript
// ❌ 問題: 依存関係のない並列呼び出し
const summary = await api.dormantSummary(1)
const details = await api.dormantDetailedSegments(1) // summaryと独立

// ✅ 改善: Promise.allで並列化
const [summary, details] = await Promise.all([
  api.dormantSummary(1),
  api.dormantDetailedSegments(1)
])
```

## 🔄 移行・改善計画

### Phase 1: 緊急対応（1-2日）
1. `dormantDetailedSegments` API のエラーハンドリング強化
2. 月別売上統計APIの接続完了

### Phase 2: 最適化（1週間）
1. レガシー `data-service.ts` の段階的廃止
2. 直接fetch利用箇所の統一APIクライアント移行
3. 統一エラーハンドラーの全面適用

### Phase 3: パフォーマンス向上（2週間）
1. API呼び出し頻度の最適化
2. キャッシュ戦略の実装
3. ページング戦略の見直し

## 📚 開発者向けガイドライン

### ✅ 推奨パターン
```typescript
// 統一APIクライアント使用
import { api } from "@/lib/api-client"

// エラーハンドリング付き
try {
  const response = await api.dormantCustomers(params)
  // 成功処理
} catch (error) {
  await handleApiError(error, endpoint, method, options)
}
```

### ❌ 非推奨パターン
```typescript
// 直接fetch使用
const response = await fetch('/api/endpoint')

// エラーハンドリングなし
const data = await api.someEndpoint()
```

---

**最終更新**: 2025-07-26  
**更新者**: AIアシスタントケンジ