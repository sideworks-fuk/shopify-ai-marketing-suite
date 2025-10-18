# 前年同月比【商品】画面 - パフォーマンス改善提案書

> **📅 作成日**: 2025年7月27日  
> **👤 作成者**: 福田さん + レイ（Claude Code）+ Claude-kun  
> **🎯 対象画面**: 前年同月比【商品】分析画面（PROD-01-YOY）専用  
> **🔄 ステータス**: 実装推奨（画面特化版）

---

## 📋 前年同月比【商品】画面の固有問題

### 現状の深刻な課題
| 測定項目 | 現状値 | 問題の影響 |
|---------|--------|-----------|
| **1000商品レンダリング** | 5-8秒 | 操作不能時間 |
| フィルタ変更時間 | 2-3秒 | 毎回API再呼び出し |
| データ転送量 | 2-5MB | 通信遅延 |
| コンポーネントサイズ | 1,041行 | 保守性低下 |

### 技術的ボトルネック
```typescript
// 問題1: 巨大コンポーネント（1,041行）
// YearOverYearProductAnalysis.tsx の構造問題
const YearOverYearProductAnalysis = () => {
  // 全ての処理が一つのコンポーネントに集約
  // データ取得、変換、フィルタリング、表示がすべて混在
};

// 問題2: フィルタ変更で毎回API呼び出し
useEffect(() => {
  fetchYearOverYearData(); // 重いAPI呼び出し
}, [selectedCategories, selectedYears, storeFilter, ...]);

// 問題3: 非効率な data conversion（411行目付近）
const convertApiDataToProductYearData = (apiData, currentYear) => {
  // 毎回実行される重い変換処理
  return apiData.map((product, index) => {
    // 複雑な計算が毎回実行される
  });
};

// 問題4: 全データを一度にレンダリング
{filteredAndSortedData.map((product) => (
  // 1000件以上の商品を一度に表示
  <ProductRow key={product.id} product={product} />
))}
```

---

## ⚡ 前年同月比【商品】専用の改善案

### Phase 1: コンポーネント分割とメモ化（最優先）

#### 1. コンポーネント分割戦略
```typescript
// 現在の1,041行コンポーネントを分割
// components/year-over-year/YearOverYearDashboard.tsx
export const YearOverYearDashboard = () => {
  return (
    <YearOverYearProvider>
      <div className="space-y-6">
        <YearOverYearHeader />          {/* 30行 */}
        <YearOverYearFilters />         {/* 150行 */}
        <YearOverYearSummaryCards />    {/* 80行 */}
        <YearOverYearRankings />        {/* 120行 */}
        <YearOverYearDataTable />       {/* 200行 */}
        <YearOverYearCharts />          {/* 150行 */}
      </div>
    </YearOverYearProvider>
  );
};

// contexts/YearOverYearContext.tsx
const YearOverYearProvider = ({ children }) => {
  const [state, dispatch] = useReducer(yearOverYearReducer, initialState);
  
  // 重い計算をcontextレベルでメモ化
  const processedData = useMemo(() => {
    console.time('YoY Data Processing');
    const result = convertApiDataToProductYearData(state.rawData, state.currentYear);
    console.timeEnd('YoY Data Processing');
    return result;
  }, [state.rawData, state.currentYear]);
  
  const filteredData = useMemo(() => {
    console.time('YoY Filtering');
    const result = applyFilters(processedData, state.filters);
    console.timeEnd('YoY Filtering');
    return result;
  }, [processedData, state.filters]);
  
  return (
    <YearOverYearContext.Provider value={{ 
      ...state, 
      processedData, 
      filteredData, 
      dispatch 
    }}>
      {children}
    </YearOverYearContext.Provider>
  );
};
```

#### 2. 商品テーブル専用の仮想化実装
```typescript
// components/year-over-year/VirtualizedProductTable.tsx
import { FixedSizeList } from 'react-window';
import { memo } from 'react';

const ProductRowMemo = memo(({ product }: { product: ProductYearData }) => {
  return (
    <div className="flex items-center border-b hover:bg-gray-50 p-4">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">
          {product.productName}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {product.category}
        </div>
      </div>
      
      {/* 月別売上データ（12列） */}
      {MONTHS.map(month => (
        <div key={month} className="w-24 text-right">
          <div className="text-sm font-medium">
            ¥{product.monthlyData[month]?.currentYear?.toLocaleString() || '0'}
          </div>
          <GrowthIndicator 
            current={product.monthlyData[month]?.currentYear} 
            previous={product.monthlyData[month]?.previousYear}
          />
        </div>
      ))}
      
      <div className="w-32 text-right">
        <TotalGrowthIndicator 
          currentTotal={product.currentYearTotal}
          previousTotal={product.previousYearTotal}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 商品データが変わった時のみ再レンダリング
  return prevProps.product.productId === nextProps.product.productId &&
         prevProps.product.currentYearTotal === nextProps.product.currentYearTotal;
});

export const VirtualizedProductTable = ({ data }: { data: ProductYearData[] }) => {
  const ITEM_HEIGHT = 80;
  const CONTAINER_HEIGHT = 600;
  
  const Row = ({ index, style }) => {
    const product = data[index];
    return (
      <div style={style}>
        <ProductRowMemo product={product} />
      </div>
    );
  };
  
  return (
    <div className="border rounded">
      {/* テーブルヘッダー（固定） */}
      <YearOverYearTableHeader />
      
      {/* 仮想化されたテーブルボディ */}
      <FixedSizeList
        height={CONTAINER_HEIGHT}
        itemCount={data.length}
        itemSize={ITEM_HEIGHT}
        width="100%"
        overscanCount={5} // パフォーマンスと体感のバランス
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};
```

#### 3. 前年同月比専用スケルトンローダー
```tsx
// components/year-over-year/YearOverYearSkeleton.tsx
export const YearOverYearSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-300" />
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent>
        {/* フィルターエリアのスケルトン */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        
        {/* 商品テーブルのスケルトン */}
        <div className="border rounded">
          {/* ヘッダー */}
          <div className="bg-gray-50 p-4 border-b">
            <div className="flex space-x-4">
              <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse"></div>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
              ))}
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* データ行 */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="p-4 border-b">
              <div className="flex space-x-4">
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                  <div className="h-3 bg-gray-100 rounded w-24 animate-pulse"></div>
                </div>
                {[...Array(12)].map((_, j) => (
                  <div key={j} className="w-24 space-y-1">
                    <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </div>
                ))}
                <div className="w-32 space-y-1">
                  <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
```

### Phase 2: データ処理最適化

#### 1. 前年同月比専用の効率的フィルタリング
```typescript
// hooks/useYearOverYearFiltering.ts
export const useYearOverYearFiltering = (data: ProductYearData[]) => {
  // フィルター関数をメモ化
  const createFilterFunction = useMemo(() => {
    return (filters: YearOverYearFilters) => {
      return (product: ProductYearData) => {
        // 高速フィルタリング：軽い条件から重い条件の順で評価
        
        // 1. 文字列検索（最も軽い）
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          if (!product.productName.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        
        // 2. カテゴリフィルタ（enum比較）
        if (filters.categories.length > 0 && 
            !filters.categories.includes(product.category)) {
          return false;
        }
        
        // 3. 成長率フィルタ（数値計算、最も重い）
        if (filters.growthRateMin !== null || filters.growthRateMax !== null) {
          const growthRate = product.growthRate;
          if (filters.growthRateMin !== null && growthRate < filters.growthRateMin) {
            return false;
          }
          if (filters.growthRateMax !== null && growthRate > filters.growthRateMax) {
            return false;
          }
        }
        
        return true;
      };
    };
  }, []);
  
  // デバウンスされたフィルタリング
  const debouncedFilters = useDebounce(filters, 300);
  
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    console.time('YoY Filtering');
    const filterFunction = createFilterFunction(debouncedFilters);
    const result = data.filter(filterFunction);
    console.timeEnd('YoY Filtering');
    
    return result;
  }, [data, debouncedFilters, createFilterFunction]);
  
  return filteredData;
};
```

#### 2. 前年同月比専用のソート最適化
```typescript
// hooks/useYearOverYearSorting.ts
export const useYearOverYearSorting = (data: ProductYearData[], sortConfig: SortConfig) => {
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    console.time('YoY Sorting');
    
    const sorted = [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.field) {
        case 'productName':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'currentYearTotal':
          comparison = a.currentYearTotal - b.currentYearTotal;
          break;
        case 'previousYearTotal':
          comparison = a.previousYearTotal - b.previousYearTotal;
          break;
        case 'growthRate':
          comparison = a.growthRate - b.growthRate;
          break;
        case 'growthAmount':
          comparison = (a.currentYearTotal - a.previousYearTotal) - 
                      (b.currentYearTotal - b.previousYearTotal);
          break;
        default:
          comparison = 0;
      }
      
      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
    
    console.timeEnd('YoY Sorting');
    return sorted;
  }, [data, sortConfig]);
  
  return sortedData;
};
```

### Phase 3: バックエンド最適化（前年同月比特化）

#### 1. 前年同月比専用の事前集計テーブル
```sql
-- 前年同月比商品分析専用テーブル
CREATE TABLE YearOverYearProductAnalysisCache (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    ProductId NVARCHAR(255) NOT NULL,
    ProductTitle NVARCHAR(500),
    ProductType NVARCHAR(255),
    Category NVARCHAR(255),
    
    -- 月別集計データ
    YearMonth DATE NOT NULL, -- 対象年月
    CurrentYearSales DECIMAL(18,2) DEFAULT 0,
    PreviousYearSales DECIMAL(18,2) DEFAULT 0,
    CurrentYearQuantity INT DEFAULT 0,
    PreviousYearQuantity INT DEFAULT 0,
    CurrentYearOrders INT DEFAULT 0,
    PreviousYearOrders INT DEFAULT 0,
    
    -- 成長指標（事前計算）
    SalesGrowthRate DECIMAL(10,4),
    SalesGrowthAmount DECIMAL(18,2),
    QuantityGrowthRate DECIMAL(10,4),
    OrdersGrowthRate DECIMAL(10,4),
    
    -- パフォーマンス用
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    
    INDEX IX_YOY_Store_Product_Month (StoreId, ProductId, YearMonth),
    INDEX IX_YOY_Store_Month_Growth (StoreId, YearMonth, SalesGrowthRate DESC),
    INDEX IX_YOY_Store_Category_Month (StoreId, Category, YearMonth),
    INDEX IX_YOY_Updated (UpdatedAt) -- 更新監視用
);

-- 年次サマリーテーブル（API応答高速化用）
CREATE TABLE YearOverYearProductSummary (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StoreId INT NOT NULL,
    ProductId NVARCHAR(255) NOT NULL,
    ProductTitle NVARCHAR(500),
    Category NVARCHAR(255),
    
    -- 年間合計（12ヶ月分の集計）
    CurrentYearTotal DECIMAL(18,2),
    PreviousYearTotal DECIMAL(18,2),
    YearOverYearGrowthRate DECIMAL(10,4),
    YearOverYearGrowthAmount DECIMAL(18,2),
    
    -- ランキング情報
    SalesRank INT,
    GrowthRateRank INT,
    
    -- 更新情報
    TargetYear INT NOT NULL,
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    
    INDEX IX_YOY_Summary_Store_Year (StoreId, TargetYear),
    INDEX IX_YOY_Summary_SalesRank (StoreId, TargetYear, SalesRank),
    INDEX IX_YOY_Summary_GrowthRank (StoreId, TargetYear, GrowthRateRank)
);
```

#### 2. 前年同月比専用API
```csharp
// YearOverYearProductService.cs
public class YearOverYearProductService
{
    private readonly ShopifyDbContext _context;
    private readonly IDistributedCache _cache;
    
    public async Task<YearOverYearResponse> GetYearOverYearAnalysis(
        YearOverYearRequest request)
    {
        // キャッシュキー生成
        var cacheKey = GenerateCacheKey(request);
        
        // L1: アプリケーションキャッシュ
        var cached = await _cache.GetAsync<YearOverYearResponse>(cacheKey);
        if (cached != null) return cached;
        
        // L2: 事前集計テーブルから取得
        var summary = await GetPreAggregatedData(request);
        
        // 月別詳細データ（必要な場合のみ）
        List<YearOverYearProductAnalysisCache> monthlyData = null;
        if (request.IncludeMonthlyBreakdown)
        {
            monthlyData = await GetMonthlyBreakdown(request);
        }
        
        var response = new YearOverYearResponse
        {
            Products = summary.Select(MapToProductDto).ToList(),
            MonthlyData = monthlyData?.GroupBy(m => m.ProductId).ToDictionary(
                g => g.Key, 
                g => g.OrderBy(m => m.YearMonth).ToList()),
            TotalCount = await GetTotalProductCount(request.StoreId, request.TargetYear),
            LastUpdated = DateTime.UtcNow
        };
        
        // キャッシュ保存（段階的期限）
        var expiration = request.IncludeMonthlyBreakdown 
            ? TimeSpan.FromMinutes(30)  // 詳細データは短時間
            : TimeSpan.FromHours(2);    // サマリーは長時間
            
        await _cache.SetAsync(cacheKey, response, expiration);
        
        return response;
    }
    
    private async Task<List<YearOverYearProductSummary>> GetPreAggregatedData(
        YearOverYearRequest request)
    {
        var query = _context.YearOverYearProductSummary
            .Where(s => s.StoreId == request.StoreId && s.TargetYear == request.TargetYear);
        
        // フィルタリング（事前集計済みデータに対して）
        if (!string.IsNullOrEmpty(request.Category))
        {
            query = query.Where(s => s.Category == request.Category);
        }
        
        if (request.MinSales.HasValue)
        {
            query = query.Where(s => s.CurrentYearTotal >= request.MinSales.Value);
        }
        
        // ソート
        query = request.SortBy switch
        {
            "sales" => request.SortDescending 
                ? query.OrderByDescending(s => s.CurrentYearTotal)
                : query.OrderBy(s => s.CurrentYearTotal),
            "growth" => request.SortDescending
                ? query.OrderByDescending(s => s.YearOverYearGrowthRate)
                : query.OrderBy(s => s.YearOverYearGrowthRate),
            _ => query.OrderBy(s => s.SalesRank)
        };
        
        // ページネーション
        return await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();
    }
}
```

#### 3. バッチ更新処理
```csharp
// YearOverYearBatchService.cs
public class YearOverYearBatchService : IHostedService
{
    public async Task ProcessMonthlyAggregation()
    {
        var stores = await _context.Stores.Where(s => s.IsActive).ToListAsync();
        
        foreach (var store in stores)
        {
            await ProcessStoreYearOverYearData(store.Id);
        }
    }
    
    private async Task ProcessStoreYearOverYearData(int storeId)
    {
        // 過去2年分のデータを処理
        var currentYear = DateTime.Now.Year;
        var previousYear = currentYear - 1;
        
        // 月別集計の生成/更新
        for (int month = 1; month <= 12; month++)
        {
            await GenerateMonthlyAggregation(storeId, currentYear, month);
        }
        
        // 年間サマリーの生成/更新
        await GenerateYearlySummary(storeId, currentYear);
    }
    
    private async Task GenerateMonthlyAggregation(int storeId, int year, int month)
    {
        var targetDate = new DateTime(year, month, 1);
        var previousYearDate = targetDate.AddYears(-1);
        
        // SQL で直接集計（高速化）
        await _context.Database.ExecuteSqlRawAsync(@"
            MERGE YearOverYearProductAnalysisCache AS target
            USING (
                SELECT 
                    @StoreId as StoreId,
                    p.Id as ProductId,
                    p.Title as ProductTitle,
                    p.ProductType,
                    @TargetDate as YearMonth,
                    ISNULL(current_sales.Sales, 0) as CurrentYearSales,
                    ISNULL(previous_sales.Sales, 0) as PreviousYearSales,
                    ISNULL(current_sales.Quantity, 0) as CurrentYearQuantity,
                    ISNULL(previous_sales.Quantity, 0) as PreviousYearQuantity,
                    CASE 
                        WHEN ISNULL(previous_sales.Sales, 0) = 0 THEN NULL
                        ELSE (ISNULL(current_sales.Sales, 0) - ISNULL(previous_sales.Sales, 0)) 
                             / ISNULL(previous_sales.Sales, 0) * 100
                    END as SalesGrowthRate
                FROM Products p
                LEFT JOIN (
                    SELECT 
                        oi.ProductId,
                        SUM(oi.TotalPrice) as Sales,
                        SUM(oi.Quantity) as Quantity
                    FROM OrderItems oi
                    INNER JOIN Orders o ON oi.OrderId = o.Id
                    WHERE o.StoreId = @StoreId 
                      AND YEAR(o.CreatedAt) = @Year 
                      AND MONTH(o.CreatedAt) = @Month
                    GROUP BY oi.ProductId
                ) current_sales ON p.Id = current_sales.ProductId
                LEFT JOIN (
                    SELECT 
                        oi.ProductId,
                        SUM(oi.TotalPrice) as Sales,
                        SUM(oi.Quantity) as Quantity
                    FROM OrderItems oi
                    INNER JOIN Orders o ON oi.OrderId = o.Id
                    WHERE o.StoreId = @StoreId 
                      AND YEAR(o.CreatedAt) = @PreviousYear 
                      AND MONTH(o.CreatedAt) = @Month
                    GROUP BY oi.ProductId
                ) previous_sales ON p.Id = previous_sales.ProductId
                WHERE p.StoreId = @StoreId
            ) AS source ON target.StoreId = source.StoreId 
                        AND target.ProductId = source.ProductId 
                        AND target.YearMonth = source.YearMonth
            WHEN MATCHED THEN 
                UPDATE SET 
                    CurrentYearSales = source.CurrentYearSales,
                    PreviousYearSales = source.PreviousYearSales,
                    UpdatedAt = GETDATE()
            WHEN NOT MATCHED THEN 
                INSERT (StoreId, ProductId, ProductTitle, ProductType, YearMonth, 
                       CurrentYearSales, PreviousYearSales, SalesGrowthRate, UpdatedAt)
                VALUES (source.StoreId, source.ProductId, source.ProductTitle, 
                       source.ProductType, source.YearMonth, source.CurrentYearSales, 
                       source.PreviousYearSales, source.SalesGrowthRate, GETDATE());
        ", 
        new SqlParameter("@StoreId", storeId),
        new SqlParameter("@TargetDate", targetDate),
        new SqlParameter("@Year", year),
        new SqlParameter("@Month", month),
        new SqlParameter("@PreviousYear", year - 1));
    }
}
```

---

## 📊 前年同月比特有の成功指標

### 専用メトリクス
```typescript
// utils/yearOverYearMetrics.ts
export const trackYearOverYearMetrics = () => {
  const metrics = {
    componentPerformance: {
      dataConversion: 0,
      filtering: 0,
      sorting: 0,
      rendering: 0
    },
    tablePerformance: {
      virtualScrollPerformance: 0,
      rowRenderTime: 0,
      scrollSmoothness: 0
    },
    userInteractions: {
      filterChanges: 0,
      sortActions: 0,
      exportActions: 0,
      detailViews: 0
    }
  };
  
  const measureDataProcessing = async (operation: () => Promise<any>, label: string) => {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      metrics.componentPerformance[label] = duration;
      
      if (duration > 1000) {
        console.warn(`⚠️ ${label}が1秒以上: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ ${label}でエラー:`, error);
      throw error;
    }
  };
  
  return { metrics, measureDataProcessing };
};
```

### 専用成功基準

| 指標 | 現状 | 1週間後 | 1ヶ月後 | 備考 |
|------|------|---------|---------|------|
| **1000商品レンダリング** | 5-8秒 | 2秒 | 1秒 | 最重要指標 |
| フィルタ変更応答 | 2-3秒 | 0.5秒 | 0.2秒 | ユーザビリティ |
| データ転送量 | 2-5MB | 1MB | 500KB | 通信効率 |
| コンポーネント分割 | 1,041行 | 6分割完了 | 最適化完了 | 保守性 |

---

## 🚀 実装計画（前年同月比特化）

### Week 1: 構造改善
- [ ] コンポーネント分割（1,041行→6分割）
- [ ] Context API実装
- [ ] 基本的なメモ化実装
- [ ] 専用スケルトンローダー

### Week 2-3: パフォーマンス最適化
- [ ] 仮想化テーブル実装
- [ ] フィルタリング最適化
- [ ] ソート最適化
- [ ] デバウンス実装

### Month 2: バックエンド最適化
- [ ] 事前集計テーブル作成
- [ ] 専用API実装
- [ ] バッチ処理実装
- [ ] キャッシュ戦略実装

---

**前年同月比【商品】専用改善完了** ✅  
*画面別の特化改善により、各画面の固有問題に最適化された解決策を提供*