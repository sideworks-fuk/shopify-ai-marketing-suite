# 購入回数分析機能 実装ガイド（統合版）

## 概要
購入回数分析機能は、顧客の購買パターンを分析し、購入回数別に顧客をセグメント化する機能です。この機能により、リピート顧客の把握と効果的なマーケティング施策の立案が可能になります。

## 機能仕様

### 分析項目
1. **購入回数別顧客分布**
   - 1回購入顧客
   - 2-3回購入顧客
   - 4-5回購入顧客
   - 6回以上購入顧客

2. **統計情報**
   - 平均購入回数
   - 最大購入回数
   - リピート率
   - 期間別推移

## API実装

### エンドポイント定義

```csharp
// Controllers/PurchaseCountController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PurchaseCountController : StoreAwareControllerBase
{
    private readonly IPurchaseAnalysisService _service;

    [HttpGet("analysis")]
    public async Task<ActionResult<PurchaseCountAnalysisDto>> GetAnalysis(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _service.GetPurchaseCountAnalysisAsync(
            StoreId, 
            startDate ?? DateTime.UtcNow.AddMonths(-12), 
            endDate ?? DateTime.UtcNow
        );
        return Ok(result);
    }

    [HttpGet("customers/{segment}")]
    public async Task<ActionResult<IEnumerable<CustomerPurchaseDto>>> GetCustomersBySegment(
        string segment,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var customers = await _service.GetCustomersByPurchaseSegmentAsync(
            StoreId, 
            segment, 
            page, 
            pageSize
        );
        return Ok(customers);
    }

    [HttpGet("trends")]
    public async Task<ActionResult<PurchaseTrendsDto>> GetTrends(
        [FromQuery] int months = 12)
    {
        var trends = await _service.GetPurchaseTrendsAsync(StoreId, months);
        return Ok(trends);
    }
}
```

### サービス層実装

```csharp
// Services/PurchaseAnalysisService.cs
public class PurchaseAnalysisService : IPurchaseAnalysisService
{
    private readonly ApplicationDbContext _context;

    public async Task<PurchaseCountAnalysisDto> GetPurchaseCountAnalysisAsync(
        Guid storeId, 
        DateTime startDate, 
        DateTime endDate)
    {
        // 顧客ごとの購入回数を集計
        var purchaseCounts = await _context.Orders
            .Where(o => o.StoreId == storeId 
                && o.CreatedAt >= startDate 
                && o.CreatedAt <= endDate)
            .GroupBy(o => o.CustomerId)
            .Select(g => new 
            {
                CustomerId = g.Key,
                PurchaseCount = g.Count(),
                TotalAmount = g.Sum(o => o.TotalAmount),
                FirstPurchase = g.Min(o => o.CreatedAt),
                LastPurchase = g.Max(o => o.CreatedAt)
            })
            .ToListAsync();

        // セグメント別に集計
        var segments = new Dictionary<string, SegmentData>
        {
            ["single"] = new SegmentData { 
                Label = "1回購入", 
                Count = purchaseCounts.Count(p => p.PurchaseCount == 1),
                Revenue = purchaseCounts.Where(p => p.PurchaseCount == 1).Sum(p => p.TotalAmount)
            },
            ["occasional"] = new SegmentData { 
                Label = "2-3回購入", 
                Count = purchaseCounts.Count(p => p.PurchaseCount >= 2 && p.PurchaseCount <= 3),
                Revenue = purchaseCounts.Where(p => p.PurchaseCount >= 2 && p.PurchaseCount <= 3).Sum(p => p.TotalAmount)
            },
            ["regular"] = new SegmentData { 
                Label = "4-5回購入", 
                Count = purchaseCounts.Count(p => p.PurchaseCount >= 4 && p.PurchaseCount <= 5),
                Revenue = purchaseCounts.Where(p => p.PurchaseCount >= 4 && p.PurchaseCount <= 5).Sum(p => p.TotalAmount)
            },
            ["vip"] = new SegmentData { 
                Label = "6回以上購入", 
                Count = purchaseCounts.Count(p => p.PurchaseCount >= 6),
                Revenue = purchaseCounts.Where(p => p.PurchaseCount >= 6).Sum(p => p.TotalAmount)
            }
        };

        return new PurchaseCountAnalysisDto
        {
            Segments = segments,
            TotalCustomers = purchaseCounts.Count,
            AveragePurchaseCount = purchaseCounts.Any() ? purchaseCounts.Average(p => p.PurchaseCount) : 0,
            RepeatRate = purchaseCounts.Any() ? 
                (double)purchaseCounts.Count(p => p.PurchaseCount > 1) / purchaseCounts.Count * 100 : 0,
            Period = new { StartDate = startDate, EndDate = endDate }
        };
    }

    public async Task<IEnumerable<CustomerPurchaseDto>> GetCustomersByPurchaseSegmentAsync(
        Guid storeId, 
        string segment, 
        int page, 
        int pageSize)
    {
        var query = _context.Customers
            .Where(c => c.StoreId == storeId)
            .Join(_context.Orders.Where(o => o.StoreId == storeId),
                c => c.Id,
                o => o.CustomerId,
                (c, o) => new { Customer = c, Order = o })
            .GroupBy(x => x.Customer)
            .Select(g => new 
            {
                Customer = g.Key,
                PurchaseCount = g.Count(),
                TotalSpent = g.Sum(x => x.Order.TotalAmount),
                LastOrderDate = g.Max(x => x.Order.CreatedAt)
            });

        // セグメントによるフィルタリング
        query = segment switch
        {
            "single" => query.Where(x => x.PurchaseCount == 1),
            "occasional" => query.Where(x => x.PurchaseCount >= 2 && x.PurchaseCount <= 3),
            "regular" => query.Where(x => x.PurchaseCount >= 4 && x.PurchaseCount <= 5),
            "vip" => query.Where(x => x.PurchaseCount >= 6),
            _ => query
        };

        var customers = await query
            .OrderByDescending(x => x.TotalSpent)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new CustomerPurchaseDto
            {
                Id = x.Customer.Id,
                Name = x.Customer.FirstName + " " + x.Customer.LastName,
                Email = x.Customer.Email,
                PurchaseCount = x.PurchaseCount,
                TotalSpent = x.TotalSpent,
                AverageOrderValue = x.TotalSpent / x.PurchaseCount,
                LastOrderDate = x.LastOrderDate,
                CustomerSince = x.Customer.CreatedAt
            })
            .ToListAsync();

        return customers;
    }
}
```

### データベースインデックス最適化

```sql
-- 購入回数分析用インデックス
CREATE INDEX IX_Orders_StoreId_CustomerId_CreatedAt 
ON Orders(StoreId, CustomerId, CreatedAt) 
INCLUDE (TotalAmount);

CREATE INDEX IX_Customers_StoreId_CreatedAt 
ON Customers(StoreId, CreatedAt) 
INCLUDE (FirstName, LastName, Email);
```

## フロントエンド実装

### 分析画面コンポーネント

```typescript
// app/purchase/count-analysis/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { purchaseAnalysisService } from '@/services/purchaseAnalysisService';
import PurchaseSegmentChart from '@/components/charts/PurchaseSegmentChart';
import CustomerTable from '@/components/tables/CustomerTable';

export default function PurchaseCountAnalysisPage() {
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  useEffect(() => {
    loadAnalysisData();
  }, [dateRange]);

  useEffect(() => {
    if (selectedSegment !== 'all') {
      loadSegmentCustomers(selectedSegment);
    }
  }, [selectedSegment]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const data = await purchaseAnalysisService.getAnalysis(
        dateRange.startDate,
        dateRange.endDate
      );
      setAnalysisData(data);
    } catch (error) {
      console.error('Failed to load analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSegmentCustomers = async (segment: string) => {
    try {
      const customerData = await purchaseAnalysisService.getCustomersBySegment(segment);
      setCustomers(customerData);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  if (loading) return <div className="loading">データを読み込み中...</div>;

  return (
    <div className="purchase-analysis-page">
      <header className="page-header">
        <h1>🛒 購入回数分析</h1>
        <div className="date-range-selector">
          <input 
            type="date" 
            value={dateRange.startDate.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({
              ...dateRange,
              startDate: new Date(e.target.value)
            })}
          />
          <span>〜</span>
          <input 
            type="date" 
            value={dateRange.endDate.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({
              ...dateRange,
              endDate: new Date(e.target.value)
            })}
          />
        </div>
      </header>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>総顧客数</h3>
          <p className="stat-value">{analysisData?.totalCustomers.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>平均購入回数</h3>
          <p className="stat-value">{analysisData?.averagePurchaseCount.toFixed(1)}回</p>
        </div>
        <div className="stat-card">
          <h3>リピート率</h3>
          <p className="stat-value">{analysisData?.repeatRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="analysis-content">
        <div className="chart-section">
          <h2>購入回数別顧客分布</h2>
          <PurchaseSegmentChart 
            data={analysisData?.segments}
            onSegmentClick={setSelectedSegment}
          />
        </div>

        <div className="segment-details">
          <h2>セグメント詳細</h2>
          <div className="segment-tabs">
            {Object.entries(analysisData?.segments || {}).map(([key, segment]) => (
              <button
                key={key}
                className={`tab ${selectedSegment === key ? 'active' : ''}`}
                onClick={() => setSelectedSegment(key)}
              >
                {segment.label}
                <span className="badge">{segment.count}</span>
              </button>
            ))}
          </div>

          {selectedSegment !== 'all' && (
            <div className="customers-section">
              <h3>顧客リスト</h3>
              <CustomerTable 
                customers={customers}
                columns={['name', 'email', 'purchaseCount', 'totalSpent', 'lastOrderDate']}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### チャートコンポーネント

```typescript
// components/charts/PurchaseSegmentChart.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
  single: '#FF6B6B',
  occasional: '#4ECDC4',
  regular: '#45B7D1',
  vip: '#96CEB4'
};

export default function PurchaseSegmentChart({ data, onSegmentClick }) {
  const chartData = Object.entries(data || {}).map(([key, value]) => ({
    name: value.label,
    value: value.count,
    revenue: value.revenue,
    key
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={150}
          fill="#8884d8"
          dataKey="value"
          onClick={(data) => onSegmentClick(data.key)}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.key]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{payload[0].payload.name}</p>
        <p className="value">顧客数: {payload[0].value.toLocaleString()}</p>
        <p className="revenue">売上: ¥{payload[0].payload.revenue.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};
```

## APIテスト

### HTTPテストファイル

```http
### 購入回数分析の取得
GET {{baseUrl}}/api/purchasecount/analysis?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {{token}}
X-Store-Id: {{storeId}}

### セグメント別顧客リスト取得
GET {{baseUrl}}/api/purchasecount/customers/vip?page=1&pageSize=50
Authorization: Bearer {{token}}
X-Store-Id: {{storeId}}

### 購入トレンド取得
GET {{baseUrl}}/api/purchasecount/trends?months=12
Authorization: Bearer {{token}}
X-Store-Id: {{storeId}}
```

## パフォーマンス最適化

### 1. キャッシング戦略

```csharp
// Services/CachedPurchaseAnalysisService.cs
public class CachedPurchaseAnalysisService : IPurchaseAnalysisService
{
    private readonly IMemoryCache _cache;
    private readonly PurchaseAnalysisService _service;

    public async Task<PurchaseCountAnalysisDto> GetPurchaseCountAnalysisAsync(
        Guid storeId, 
        DateTime startDate, 
        DateTime endDate)
    {
        var cacheKey = $"purchase_analysis_{storeId}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
        
        if (_cache.TryGetValue(cacheKey, out PurchaseCountAnalysisDto cachedData))
        {
            return cachedData;
        }

        var data = await _service.GetPurchaseCountAnalysisAsync(storeId, startDate, endDate);
        
        _cache.Set(cacheKey, data, TimeSpan.FromMinutes(15));
        
        return data;
    }
}
```

### 2. 非同期バッチ処理

```csharp
// Jobs/PurchaseAnalysisJob.cs
public class PurchaseAnalysisJob : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private Timer _timer;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromHours(1));
        return Task.CompletedTask;
    }

    private async void DoWork(object state)
    {
        using var scope = _serviceProvider.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IPurchaseAnalysisService>();
        
        // 全ストアの分析データを事前計算
        var stores = await GetActiveStores();
        foreach (var store in stores)
        {
            await service.PreCalculateAnalysisAsync(store.Id);
        }
    }
}
```

## トラブルシューティング

### 問題1: 分析が遅い
**原因**: インデックスが不足している
**解決**: 上記のインデックスを追加

### 問題2: メモリ不足
**原因**: 大量のデータを一度に取得
**解決**: ページネーションとストリーミングを使用

### 問題3: リアルタイムデータが反映されない
**原因**: キャッシュが古い
**解決**: キャッシュの有効期限を短縮または無効化

## まとめ
購入回数分析機能により、顧客の購買行動を詳細に分析し、効果的なマーケティング施策の立案が可能になります。セグメント別のアプローチにより、顧客ロイヤルティの向上とLTVの最大化を実現できます。