# 前年同月比分析【商品】画面 0.0%表示問題調査指示

## 問題の概要
前年同月比分析【商品】画面の商品別月次データリストで、すべての前年同月比が0.0%と表示されている可能性がある。

## 調査項目

### 1. APIレスポンスの確認

#### 1.1 ブラウザ開発者ツールでの確認
1. F12で開発者ツールを開く
2. Networkタブを選択
3. 前年同月比分析画面を開いて「分析実行」ボタンをクリック
4. `/api/analytics/year-over-year` へのリクエストを確認

**確認ポイント：**
```json
// レスポンスのproducts配列内の各商品データを確認
{
  "products": [{
    "productTitle": "商品名",
    "monthlyData": [{
      "month": 1,
      "monthName": "1月",
      "currentValue": 50000,    // 今年の値
      "previousValue": 40000,   // 前年の値
      "growthRate": 25.0,       // この値が0.0になっていないか？
      "growthCategory": "high_growth"
    }],
    "overallGrowthRate": 15.5,   // 全体の成長率も確認
    "averageMonthlyGrowthRate": 12.3
  }]
}
```

### 2. バックエンドAPI実装の確認

#### 2.1 YearOverYearCalculationService.cs
```csharp
// backend/ShopifyAnalyticsApi/Services/YearOverYear/YearOverYearCalculationService.cs

// 成長率計算ロジックを確認
private decimal CalculateGrowthRate(decimal currentValue, decimal previousValue)
{
    if (previousValue == 0)
    {
        // 前年が0の場合の処理を確認
        return currentValue > 0 ? 100m : 0m;
    }
    
    return ((currentValue - previousValue) / previousValue) * 100;
}

// monthlyDataの生成部分を確認
var monthlyComparison = new MonthlyComparisonData
{
    Month = month,
    MonthName = GetMonthName(month),
    CurrentValue = currentMonthData?.TotalAmount ?? 0,
    PreviousValue = previousMonthData?.TotalAmount ?? 0,
    GrowthRate = CalculateGrowthRate(
        currentMonthData?.TotalAmount ?? 0,
        previousMonthData?.TotalAmount ?? 0
    )
};
```

#### 2.2 データベースクエリの確認
```sql
-- 実際のデータを確認
SELECT 
    YEAR(o.CreatedAt) as OrderYear,
    MONTH(o.CreatedAt) as OrderMonth,
    oi.ProductTitle,
    SUM(oi.TotalPrice) as TotalSales,
    COUNT(DISTINCT o.Id) as OrderCount
FROM Orders o
INNER JOIN OrderItems oi ON o.Id = oi.OrderId
WHERE o.StoreId = 2  -- Store 2のデータ
  AND YEAR(o.CreatedAt) IN (2024, 2025)
GROUP BY 
    YEAR(o.CreatedAt),
    MONTH(o.CreatedAt),
    oi.ProductTitle
ORDER BY 
    oi.ProductTitle,
    OrderYear,
    OrderMonth;
```

### 3. フロントエンド表示ロジックの確認

#### 3.1 YearOverYearProductAnalysis.tsx
```typescript
// EnhancedDataCellコンポーネントの計算確認（81-82行目）
const growthRate = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

// この計算が正しいか確認
// APIから受け取ったgrowthRateを使用すべきではないか？
```

#### 3.2 実際のデータ表示部分
```typescript
// YearOverYearProductTable.tsx内でgrowthRateの表示方法を確認
<div className="text-xs font-medium">
  {growthRate > 0 ? "+" : ""}
  {growthRate.toFixed(1)}%
</div>
```

### 4. 具体的な確認手順

#### 4.1 コンソールでのデバッグ
```javascript
// ブラウザコンソールで実行
// 1. APIレスポンスの生データを確認
fetch(`${location.origin}/api/analytics/year-over-year?storeId=2&year=2025`)
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    if (data.products && data.products.length > 0) {
      console.log('First product:', data.products[0]);
      console.log('Monthly data:', data.products[0].monthlyData);
    }
  });

// 2. 実際の成長率計算を確認
const testGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

console.log('Test: 50000 vs 40000 =', testGrowth(50000, 40000), '%'); // 期待値: 25%
console.log('Test: 30000 vs 40000 =', testGrowth(30000, 40000), '%'); // 期待値: -25%
console.log('Test: 10000 vs 0 =', testGrowth(10000, 0), '%'); // 期待値: 100%
```

### 5. 修正候補

#### 5.1 フロントエンドでAPIのgrowthRateを使用するよう修正
```typescript
// EnhancedDataCellの修正案
const EnhancedDataCell = ({
  currentValue,
  previousValue,
  growthRate, // APIから受け取ったgrowthRateを追加
  viewMode,
}: {
  currentValue: number
  previousValue: number
  growthRate: number // 追加
  viewMode: ViewMode
}) => {
  // ローカル計算を削除し、APIの値を使用
  // const growthRate = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0

  // 以下同じ...
}
```

#### 5.2 デバッグログの追加
```typescript
// YearOverYearProductAnalysis.tsx
useEffect(() => {
  if (data?.products) {
    console.log('📊 Year-over-Year Data:', {
      productsCount: data.products.length,
      firstProduct: data.products[0],
      summary: data.summary
    });
  }
}, [data]);
```

### 6. 緊急確認事項

1. **2024年のデータが存在するか**
   - 前年同月比を計算するには前年（2024年）のデータが必要
   - Store 2に2024年のデータが登録されているか確認

2. **viewModeの影響**
   - sales/quantity/ordersのモードによって値が変わる可能性
   - デフォルトのviewModeが何か確認

3. **計算タイミング**
   - フロントエンドで再計算しているのか
   - APIの値をそのまま使用しているのか

この調査により、0.0%表示の原因を特定できるはずです。最も可能性が高いのは：
1. フロントエンドがAPIのgrowthRateを無視して独自計算している
2. 2024年のデータが存在しない（previousValue = 0）
3. APIの計算ロジックに問題がある