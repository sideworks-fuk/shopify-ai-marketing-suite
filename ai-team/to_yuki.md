# Yukiへの作業指示
**日付:** 2025年8月12日（月）20:00  
**差出人:** Kenji

## 🚀 前倒し実装開始！

OAuth問題が解決したので、予定を前倒しして明日からダッシュボード実装を開始しましょう。

## 明日（8/13）の作業詳細

### 全日: ダッシュボード画面実装（9:00-18:00）

#### 1. ディレクトリ構造

```
frontend/src/app/(authenticated)/dashboard/
├── page.tsx              # メインページ
├── components/
│   ├── SummaryCard.tsx   # サマリーカード
│   ├── SalesChart.tsx    # 売上グラフ
│   ├── TopProducts.tsx   # 人気商品
│   └── RecentOrders.tsx  # 最近の注文
└── loading.tsx           # ローディング画面
```

#### 2. メインダッシュボード実装

**page.tsx:**
```tsx
'use client';

import { useEffect, useState } from 'react';
import { SummaryCard } from './components/SummaryCard';
import { SalesChart } from './components/SalesChart';
import { TopProducts } from './components/TopProducts';
import { RecentOrders } from './components/RecentOrders';
import { dashboardApi } from '@/lib/api/dashboard';
import { useMockData } from '@/hooks/useMockData';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isUsingMock } = useMockData();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const dashboardData = await dashboardApi.getSummary();
      setData(dashboardData);
    } catch (error) {
      console.error('Dashboard data loading failed:', error);
      // モックデータへフォールバック
      setData(mockDashboardData);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardSkeleton />;
  if (!data) return <ErrorMessage />;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        {isUsingMock && (
          <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded">
            モックデータ使用中
          </span>
        )}
      </div>
      
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard 
          title="本日の売上" 
          value={`¥${data.todaySales.toLocaleString()}`}
          trend={data.salesTrend}
          icon="currency"
        />
        <SummaryCard 
          title="注文数" 
          value={data.orderCount.toString()}
          trend={data.orderTrend}
          icon="shopping-cart"
        />
        <SummaryCard 
          title="顧客数" 
          value={data.customerCount.toString()}
          trend={data.customerTrend}
          icon="users"
        />
        <SummaryCard 
          title="商品数" 
          value={data.productCount.toString()}
          trend={data.productTrend}
          icon="package"
        />
      </div>
      
      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">売上推移</h2>
          <SalesChart data={data.salesData} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">人気商品TOP5</h2>
          <TopProducts products={data.topProducts} />
        </div>
      </div>
      
      {/* 最近の注文 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">最近の注文</h2>
        <RecentOrders orders={data.recentOrders} />
      </div>
    </div>
  );
}
```

#### 3. コンポーネント実装例

**SummaryCard.tsx:**
```tsx
interface SummaryCardProps {
  title: string;
  value: string;
  trend?: string;
  icon?: string;
}

export function SummaryCard({ title, value, trend, icon }: SummaryCardProps) {
  const trendColor = trend?.startsWith('+') ? 'text-green-600' : 'text-red-600';
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{title}</span>
        {icon && <Icon name={icon} className="text-gray-400" />}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {trend && (
        <div className={`text-sm ${trendColor}`}>
          {trend} 前日比
        </div>
      )}
    </div>
  );
}
```

#### 4. グラフ実装（Recharts使用）

**SalesChart.tsx:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesChartProps {
  data: Array<{
    date: string;
    amount: number;
  }>;
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
        />
        <YAxis 
          tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          formatter={(value: number) => `¥${value.toLocaleString()}`}
          labelFormatter={(label) => new Date(label).toLocaleDateString('ja-JP')}
        />
        <Line 
          type="monotone" 
          dataKey="amount" 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={{ fill: '#3B82F6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### 5. APIクライアント

**lib/api/dashboard.ts:**
```typescript
import { apiClient } from './client';

export const dashboardApi = {
  getSummary: async () => {
    try {
      const response = await apiClient.get('/api/dashboard/summary');
      return response.data;
    } catch (error) {
      // 開発中はモックデータを返す
      if (process.env.NODE_ENV === 'development') {
        return mockDashboardData.summary;
      }
      throw error;
    }
  },
  
  getSalesData: async (period: 'week' | 'month' | 'year' = 'week') => {
    try {
      const response = await apiClient.get(`/api/dashboard/sales?period=${period}`);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return mockDashboardData.salesData;
      }
      throw error;
    }
  },
  
  getTopProducts: async (limit: number = 5) => {
    try {
      const response = await apiClient.get(`/api/dashboard/top-products?limit=${limit}`);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return mockDashboardData.topProducts;
      }
      throw error;
    }
  },
  
  getRecentOrders: async (limit: number = 10) => {
    try {
      const response = await apiClient.get(`/api/dashboard/recent-orders?limit=${limit}`);
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        return mockDashboardData.recentOrders;
      }
      throw error;
    }
  }
};
```

#### 6. モックデータ

**lib/mock/dashboard-mock.ts:**
```typescript
export const mockDashboardData = {
  summary: {
    todaySales: 1234567,
    salesTrend: '+12.5%',
    orderCount: 123,
    orderTrend: '+8.3%',
    customerCount: 456,
    customerTrend: '+15.2%',
    productCount: 789,
    productTrend: '+2.1%'
  },
  salesData: [
    { date: '2025-08-06', amount: 450000 },
    { date: '2025-08-07', amount: 520000 },
    { date: '2025-08-08', amount: 480000 },
    { date: '2025-08-09', amount: 610000 },
    { date: '2025-08-10', amount: 580000 },
    { date: '2025-08-11', amount: 720000 },
    { date: '2025-08-12', amount: 650000 },
  ],
  topProducts: [
    { id: 1, name: 'オーガニック石鹸', sales: 234, revenue: 468000 },
    { id: 2, name: 'ナチュラルシャンプー', sales: 189, revenue: 378000 },
    { id: 3, name: 'ハンドクリーム', sales: 156, revenue: 234000 },
    { id: 4, name: 'フェイスマスク', sales: 134, revenue: 402000 },
    { id: 5, name: 'ボディローション', sales: 98, revenue: 196000 },
  ],
  recentOrders: [
    { id: 1, orderNumber: '#1234', customer: '山田太郎', amount: 12500, status: '処理中', createdAt: '2025-08-12T10:30:00' },
    { id: 2, orderNumber: '#1233', customer: '佐藤花子', amount: 8900, status: '発送済み', createdAt: '2025-08-12T09:15:00' },
    { id: 3, orderNumber: '#1232', customer: '鈴木一郎', amount: 15600, status: '配達完了', createdAt: '2025-08-12T08:45:00' },
    // ... 他の注文
  ]
};
```

## チェックリスト

### 基本実装
- [ ] ダッシュボードページ作成
- [ ] 4つのサマリーカード実装
- [ ] 売上グラフ実装
- [ ] 人気商品リスト実装
- [ ] 最近の注文テーブル実装

### UI/UX
- [ ] レスポンシブデザイン確認
- [ ] ローディング状態実装
- [ ] エラー状態実装
- [ ] モックデータ表示確認

### 技術要件
- [ ] TypeScriptエラー解消
- [ ] ESLintエラー解消
- [ ] パフォーマンス確認

## パッケージインストール

```bash
# グラフライブラリ（Recharts推奨）
npm install recharts

# アイコンライブラリ
npm install lucide-react

# 日付処理（必要に応じて）
npm install date-fns
```

## デザイン参考

- Shopify管理画面のデザインを参考に
- カラーパレット：
  - Primary: #3B82F6 (青)
  - Success: #10B981 (緑)
  - Warning: #F59E0B (黄)
  - Error: #EF4444 (赤)

## 相談事項

1. **グラフライブラリ**
   - Recharts vs Chart.js どちらが良いか？
   - 私はRechartsを推奨（React専用で使いやすい）

2. **状態管理**
   - Zustandでグローバル管理する？
   - 今はローカルステートで十分かも

3. **リアルタイム更新**
   - 将来的にWebSocketで更新？
   - 今は定期的なポーリングで十分

## サポート

何か問題があれば即座に連絡してください。
- UIの相談: このファイルに返信
- 緊急事項: temp.mdに記載

モックデータで開発を進めて、Takashiのバックエンドが完成したら繋ぎ込みましょう。

頑張りましょう！🎨

Kenji