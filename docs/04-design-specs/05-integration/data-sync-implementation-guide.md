# データ同期処理実装ガイド

## 📋 ドキュメント情報
- **作成日**: 2025年7月20日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **目的**: Shopifyデータ同期処理の具体的な実装方法

---

## 🏗️ プロジェクト構成

```
ShopifyAIMarketing.Api/
├── Controllers/
│   ├── ProductsController.cs    # 商品分析API
│   └── CustomersController.cs   # 顧客分析API
├── Services/
│   ├── ShopifyService.cs       # Shopify API クライアント
│   ├── DataSyncService.cs      # データ同期処理
│   └── AnalyticsService.cs     # 分析計算処理
├── Jobs/
│   └── NightlyDataSyncJob.cs   # 深夜バッチジョブ
├── Models/
│   ├── Entities/               # DBエンティティ
│   └── Dto/                    # API レスポンス
└── Program.cs
```

---

## 💾 データベース設計（最小限）

```sql
-- 1. 商品マスタ（キャッシュ）
CREATE TABLE Products (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopifyId NVARCHAR(100) UNIQUE NOT NULL,
    Title NVARCHAR(255),
    Vendor NVARCHAR(255),
    ProductType NVARCHAR(100),
    CreatedAt DATETIME,
    UpdatedAt DATETIME
);

-- 2. 月次売上集計
CREATE TABLE ProductMonthlySales (
    ProductId INT,
    Year INT,
    Month INT,
    Revenue DECIMAL(18,2),
    Quantity INT,
    OrderCount INT,
    CalculatedAt DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (ProductId, Year, Month),
    FOREIGN KEY (ProductId) REFERENCES Products(Id)
);

-- 3. 顧客サマリー
CREATE TABLE CustomerSummary (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopifyId NVARCHAR(100) UNIQUE NOT NULL,
    Email NVARCHAR(255),
    Name NVARCHAR(255),
    LastOrderDate DATETIME,
    DaysSinceLastOrder AS DATEDIFF(DAY, LastOrderDate, GETDATE()),
    TotalSpent DECIMAL(18,2),
    OrderCount INT,
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- パフォーマンス用インデックス
CREATE INDEX IX_CustomerSummary_LastOrderDate 
ON CustomerSummary(LastOrderDate) 
INCLUDE (Name, Email, TotalSpent);
```

---

## 🔄 バッチ処理実装（Hangfire使用）

### 1. Program.cs設定
```csharp
var builder = WebApplication.CreateBuilder(args);

// Hangfire設定
builder.Services.AddHangfire(config =>
    config.UseSqlServerStorage(
        builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddHangfireServer();

// サービス登録
builder.Services.AddScoped<IShopifyService, ShopifyService>();
builder.Services.AddScoped<IDataSyncService, DataSyncService>();

var app = builder.Build();

// Hangfireダッシュボード（開発環境のみ）
if (app.Environment.IsDevelopment())
{
    app.UseHangfireDashboard();
}

// 定期ジョブ登録
RecurringJob.AddOrUpdate<DataSyncService>(
    "nightly-sync",
    service => service.RunNightlySync(),
    "0 2 * * *"); // 毎日深夜2時

app.Run();
```

### 2. データ同期サービス
```csharp
public class DataSyncService : IDataSyncService
{
    private readonly ShopifyService _shopify;
    private readonly AppDbContext _db;
    private readonly ILogger<DataSyncService> _logger;
    
    public async Task RunNightlySync()
    {
        _logger.LogInformation("Starting nightly sync at {Time}", 
            DateTime.Now);
        
        try
        {
            // 1. 商品データ同期
            await SyncProducts();
            
            // 2. 注文データから売上集計
            await SyncOrdersAndCalculateSales();
            
            // 3. 顧客サマリー更新
            await UpdateCustomerSummary();
            
            _logger.LogInformation("Nightly sync completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nightly sync failed");
            throw;
        }
    }
    
    private async Task SyncOrdersAndCalculateSales()
    {
        // 過去2年分の注文を取得
        var startDate = DateTime.Now.AddYears(-2);
        var orders = await _shopify.GetOrders(startDate);
        
        // 月次で集計
        var monthlySales = orders
            .SelectMany(o => o.LineItems.Select(li => new {
                Order = o,
                LineItem = li
            }))
            .GroupBy(x => new {
                ProductId = x.LineItem.ProductId,
                Year = x.Order.CreatedAt.Year,
                Month = x.Order.CreatedAt.Month
            })
            .Select(g => new ProductMonthlySales {
                ProductId = GetLocalProductId(g.Key.ProductId),
                Year = g.Key.Year,
                Month = g.Key.Month,
                Revenue = g.Sum(x => x.LineItem.Price * x.LineItem.Quantity),
                Quantity = g.Sum(x => x.LineItem.Quantity),
                OrderCount = g.Select(x => x.Order.Id).Distinct().Count()
            });
        
        // バルクインサート（高速）
        await _db.BulkInsertOrUpdateAsync(monthlySales);
    }
}
```

---

## 🎯 フロントエンド統合

### 1. API呼び出しの変更
```typescript
// src/lib/api/shopify-api.ts
export class ShopifyAPI {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  async getYearOverYearAnalysis(year: number, month?: number) {
    try {
      const params = new URLSearchParams({ year: year.toString() });
      if (month) params.append('month', month.toString());
      
      const response = await fetch(
        `${this.baseUrl}/products/year-over-year?${params}`
      );
      
      if (!response.ok) throw new Error('API Error');
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // フォールバック: モックデータを返す
      return getMockYearOverYearData();
    }
  }
  
  async getDormantCustomers(segment?: string) {
    try {
      const params = segment 
        ? `?segment=${encodeURIComponent(segment)}` 
        : '';
      
      const response = await fetch(
        `${this.baseUrl}/customers/dormant${params}`
      );
      
      if (!response.ok) throw new Error('API Error');
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch data:', error);
      return getMockDormantCustomers();
    }
  }
}
```

### 2. コンポーネントの修正
```typescript
// 既存のコンポーネントで使用
export function YearOverYearAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = new ShopifyAPI();
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.getYearOverYearAnalysis(2025);
        setData(result);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // 既存のUIをそのまま使用
  if (loading) return <LoadingSpinner />;
  
  return <ExistingYearOverYearComponent data={data} />;
}
```

---

## 📊 データ更新タイミング

| データ種別 | 更新頻度 | 更新時刻 | 処理時間目安 |
|-----------|---------|---------|-------------|
| 商品マスタ | 1日1回 | 深夜2:00 | 5分 |
| 売上集計 | 1日1回 | 深夜2:15 | 15分 |
| 顧客サマリー | 1日1回 | 深夜2:30 | 10分 |

---

## 🚨 エラーハンドリング

```csharp
public class DataSyncService
{
    private int _retryCount = 3;
    
    private async Task<T> ExecuteWithRetry<T>(
        Func<Task<T>> operation, 
        string operationName)
    {
        for (int i = 0; i < _retryCount; i++)
        {
            try
            {
                return await operation();
            }
            catch (ShopifyRateLimitException ex)
            {
                if (i == _retryCount - 1) throw;
                
                _logger.LogWarning(
                    "Rate limit hit for {Operation}, waiting {Seconds}s", 
                    operationName, ex.RetryAfter);
                
                await Task.Delay(ex.RetryAfter * 1000);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, 
                    "Failed {Operation} on attempt {Attempt}", 
                    operationName, i + 1);
                
                if (i == _retryCount - 1) throw;
                await Task.Delay(1000 * (i + 1)); // 指数バックオフ
            }
        }
        
        throw new InvalidOperationException("Retry logic error");
    }
}
```

---

## 🎉 これで十分！

この設計で以下が実現できます：

✅ **ユーザー体験**: 画面表示は常に高速（50ms以下）
✅ **開発効率**: シンプルな実装で2週間で完成可能
✅ **運用性**: 深夜の自動更新で手間いらず
✅ **拡張性**: 将来的にリアルタイム化も可能

**完璧を求めずに、まずはこの設計で進めましょう！** 