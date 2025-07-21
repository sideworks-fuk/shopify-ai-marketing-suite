# 月別売上統計【購買】機能 - 詳細設計書

## 🆔 画面ID: PURCH-01-MONTHLY

## 📋 ドキュメント情報
- **作成日**: 2025年7月21日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **対象機能**: 月別売上統計【購買】
- **画面ID**: PURCH-01-MONTHLY
- **ステータス**: 設計完了・実装準備中

---

## 🎯 機能概要

### 目的
商品別×月別の売上推移を数量・金額で把握し、季節トレンドや在庫・仕入計画の最適化を支援する。

### 主要機能
1. **月別売上推移グラフ** - 商品別・金額/数量切替、棒グラフ・折れ線グラフ
2. **商品リスト・フィルタ** - カテゴリ、売上順、検索
3. **KPIカード** - 季節指数、売上上位商品数等
4. **詳細モーダル** - 商品ごとの月別推移・前年比較

### ビジネス価値
- 商品別の季節トレンド把握による在庫最適化
- 仕入れ計画の精度向上
- 売上予測の基礎データ提供

---

## 📊 データベース設計

### 1. 月次統計テーブル（ProductMonthlyStats）
**注**: 前年同月比機能と共有

```sql
-- 既存テーブルを利用（前年同月比機能で作成済み）
-- CREATE TABLE [dbo].[ProductMonthlyStats] は省略
```

### 2. カテゴリ月次統計テーブル（新規）

```sql
CREATE TABLE [dbo].[CategoryMonthlyStats](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [StoreId] [int] NOT NULL,
    [CategoryId] [int] NOT NULL,
    [Year] [int] NOT NULL,
    [Month] [int] NOT NULL,
    [Revenue] [decimal](18, 2) NOT NULL DEFAULT 0,
    [Quantity] [int] NOT NULL DEFAULT 0,
    [OrderCount] [int] NOT NULL DEFAULT 0,
    [ProductCount] [int] NOT NULL DEFAULT 0,
    [AverageOrderValue] [decimal](18, 2) NOT NULL DEFAULT 0,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [FK_CategoryMonthlyStats_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]),
    CONSTRAINT [FK_CategoryMonthlyStats_Categories] FOREIGN KEY([CategoryId]) REFERENCES [dbo].[Categories] ([Id]),
    INDEX [IX_CategoryMonthlyStats_StoreId_Year_Month] ([StoreId], [Year], [Month]),
    INDEX [IX_CategoryMonthlyStats_CategoryId_Year_Month] ([CategoryId], [Year], [Month])
);
```

### 3. カテゴリマスタ（新規）

```sql
CREATE TABLE [dbo].[Categories](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [StoreId] [int] NOT NULL,
    [Name] [nvarchar](100) NOT NULL,
    [ParentCategoryId] [int] NULL,
    [IsActive] [bit] NOT NULL DEFAULT 1,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [FK_Categories_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]),
    CONSTRAINT [FK_Categories_Parent] FOREIGN KEY([ParentCategoryId]) REFERENCES [dbo].[Categories] ([Id])
);
```

---

## 🔌 API設計

### 1. エンドポイント

```csharp
[Route("api/analytics/sales")]
[ApiController]
[Authorize]
public class SalesAnalyticsController : ControllerBase
{
    // 月別売上統計取得
    [HttpGet("monthly-stats")]
    public async Task<ActionResult<MonthlyStatsResponse>> GetMonthlyStats(
        [FromQuery] MonthlyStatsRequest request);

    // カテゴリ別月別統計取得
    [HttpGet("monthly-stats/categories")]
    public async Task<ActionResult<CategoryMonthlyStatsResponse>> GetCategoryMonthlyStats(
        [FromQuery] CategoryMonthlyStatsRequest request);

    // 商品別詳細統計取得
    [HttpGet("monthly-stats/products/{productId}")]
    public async Task<ActionResult<ProductMonthlyDetailResponse>> GetProductMonthlyDetail(
        int productId, [FromQuery] DateRangeRequest request);
}
```

### 2. DTOモデル

```csharp
// リクエストDTO
public class MonthlyStatsRequest
{
    public int StoreId { get; set; }
    public int Year { get; set; }
    public int? StartMonth { get; set; } = 1;
    public int? EndMonth { get; set; } = 12;
    public int? CategoryId { get; set; }
    public string? SearchTerm { get; set; }
    public string SortBy { get; set; } = "Revenue";
    public bool Descending { get; set; } = true;
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

// レスポンスDTO
public class MonthlyStatsResponse
{
    public List<ProductMonthlyStatsDto> Products { get; set; }
    public MonthlyStatsSummary Summary { get; set; }
    public List<MonthlyTrend> Trends { get; set; }
    public PaginationInfo Pagination { get; set; }
}

public class ProductMonthlyStatsDto
{
    public int ProductId { get; set; }
    public string ProductTitle { get; set; }
    public string? ProductType { get; set; }
    public string? CategoryName { get; set; }
    public List<MonthlyData> MonthlyData { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalQuantity { get; set; }
    public decimal SeasonalityIndex { get; set; }
    public string TrendDirection { get; set; } // "up", "down", "stable"
}

public class MonthlyData
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Revenue { get; set; }
    public int Quantity { get; set; }
    public int OrderCount { get; set; }
    public decimal? GrowthRate { get; set; } // 前月比
}

public class MonthlyStatsSummary
{
    public decimal TotalRevenue { get; set; }
    public int TotalQuantity { get; set; }
    public int TotalOrderCount { get; set; }
    public int ActiveProductCount { get; set; }
    public List<TopPerformer> TopPerformers { get; set; }
    public List<SeasonalPeak> SeasonalPeaks { get; set; }
}
```

---

## ⚙️ サービス層設計

### 1. インターフェース定義

```csharp
public interface IMonthlyStatsService
{
    Task<MonthlyStatsResponse> GetMonthlyStatsAsync(MonthlyStatsRequest request);
    Task<CategoryMonthlyStatsResponse> GetCategoryMonthlyStatsAsync(CategoryMonthlyStatsRequest request);
    Task<ProductMonthlyDetailResponse> GetProductMonthlyDetailAsync(int productId, DateRangeRequest request);
    Task<bool> UpdateMonthlyStatsAsync(int storeId, int year, int month);
    Task<decimal> CalculateSeasonalityIndexAsync(int productId, int storeId);
}
```

### 2. サービス実装（重要部分）

```csharp
public class MonthlyStatsService : IMonthlyStatsService
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<MonthlyStatsService> _logger;
    private readonly IMemoryCache _cache;

    public async Task<MonthlyStatsResponse> GetMonthlyStatsAsync(MonthlyStatsRequest request)
    {
        var cacheKey = $"monthly_stats_{request.StoreId}_{request.Year}_{request.StartMonth}_{request.EndMonth}";
        
        if (_cache.TryGetValue(cacheKey, out MonthlyStatsResponse cachedResponse))
        {
            return cachedResponse;
        }

        var query = _context.ProductMonthlyStats
            .Where(s => s.StoreId == request.StoreId
                && s.Year == request.Year
                && s.Month >= request.StartMonth
                && s.Month <= request.EndMonth);

        if (request.CategoryId.HasValue)
        {
            query = query.Where(s => s.Product.CategoryId == request.CategoryId);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            query = query.Where(s => s.Product.Title.Contains(request.SearchTerm));
        }

        var groupedData = await query
            .GroupBy(s => new { s.ProductId, s.Product.Title, s.Product.ProductType })
            .Select(g => new ProductMonthlyStatsDto
            {
                ProductId = g.Key.ProductId,
                ProductTitle = g.Key.Title,
                ProductType = g.Key.ProductType,
                MonthlyData = g.Select(s => new MonthlyData
                {
                    Year = s.Year,
                    Month = s.Month,
                    Revenue = s.Revenue,
                    Quantity = s.Quantity,
                    OrderCount = s.OrderCount
                }).OrderBy(m => m.Month).ToList(),
                TotalRevenue = g.Sum(s => s.Revenue),
                TotalQuantity = g.Sum(s => s.Quantity)
            })
            .ToListAsync();

        // 季節性指数とトレンドの計算
        foreach (var product in groupedData)
        {
            product.SeasonalityIndex = await CalculateSeasonalityIndexAsync(product.ProductId, request.StoreId);
            product.TrendDirection = CalculateTrendDirection(product.MonthlyData);
        }

        var response = new MonthlyStatsResponse
        {
            Products = ApplySortingAndPaging(groupedData, request),
            Summary = await CalculateSummaryAsync(request),
            Trends = await CalculateMonthlyTrendsAsync(request),
            Pagination = new PaginationInfo
            {
                CurrentPage = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = groupedData.Count
            }
        };

        _cache.Set(cacheKey, response, TimeSpan.FromMinutes(30));
        return response;
    }

    public async Task<decimal> CalculateSeasonalityIndexAsync(int productId, int storeId)
    {
        // 過去12ヶ月の平均と各月の比率から季節性指数を計算
        var monthlyData = await _context.ProductMonthlyStats
            .Where(s => s.ProductId == productId && s.StoreId == storeId)
            .OrderByDescending(s => s.Year).ThenByDescending(s => s.Month)
            .Take(12)
            .ToListAsync();

        if (monthlyData.Count < 3) return 0;

        var average = monthlyData.Average(m => m.Revenue);
        var variance = monthlyData.Select(m => Math.Pow((double)(m.Revenue - average), 2)).Average();
        var standardDeviation = Math.Sqrt(variance);

        // 変動係数（CV）を季節性指数として使用
        return average > 0 ? (decimal)(standardDeviation / (double)average) : 0;
    }
}
```

---

## 🔄 バッチ処理設計

### 1. 月次集計バッチジョブ

```csharp
public class MonthlyStatsBatchJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MonthlyStatsBatchJob> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var nextRun = DateTime.Today.AddDays(1).AddHours(1); // 毎日午前1時
            var delay = nextRun - DateTime.Now;

            if (delay > TimeSpan.Zero)
            {
                await Task.Delay(delay, stoppingToken);
            }

            await RunMonthlyAggregation();
        }
    }

    private async Task RunMonthlyAggregation()
    {
        using (var scope = _serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
            var monthlyStatsService = scope.ServiceProvider.GetRequiredService<IMonthlyStatsService>();

            try
            {
                var stores = await context.Stores.Where(s => s.IsActive).ToListAsync();
                var yesterday = DateTime.Today.AddDays(-1);

                foreach (var store in stores)
                {
                    // 昨日のデータで該当月の統計を更新
                    await monthlyStatsService.UpdateMonthlyStatsAsync(
                        store.Id, 
                        yesterday.Year, 
                        yesterday.Month);

                    // 月末の場合はカテゴリ統計も更新
                    if (yesterday.Day == DateTime.DaysInMonth(yesterday.Year, yesterday.Month))
                    {
                        await UpdateCategoryMonthlyStats(store.Id, yesterday.Year, yesterday.Month);
                    }
                }

                _logger.LogInformation($"月次統計集計完了: {stores.Count}店舗");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "月次統計集計エラー");
            }
        }
    }
}
```

### 2. 実行タイミング
- **日次更新**: 毎日午前1時（前年同月比より1時間前）
- **月次更新**: 月末日の午前1時（カテゴリ統計の更新）
- **初期データ**: 過去24ヶ月分を一括集計

---

## 🚀 実装計画

### Phase 1: 基盤実装（Day 1）
1. **データベース拡張**
   - CategoryMonthlyStatsテーブル作成
   - Categoriesテーブル作成
   - 既存ProductMonthlyStatsの確認

2. **Entity Frameworkモデル**
   - CategoryMonthlyStats.cs作成
   - Category.cs作成
   - DbContext更新

3. **基本API実装**
   - SalesAnalyticsController作成
   - DTOモデル定義

### Phase 2: サービス実装（Day 2）
1. **MonthlyStatsService実装**
   - 基本的な月次統計取得
   - 季節性指数計算
   - キャッシュ機能

2. **バッチ処理実装**
   - MonthlyStatsBatchJob作成
   - Program.csへの登録

3. **テスト実装**
   - 単体テスト作成
   - 統合テスト作成

### Phase 3: 最適化・連携（Day 3）
1. **パフォーマンス最適化**
   - インデックス確認
   - クエリ最適化

2. **フロントエンド連携**
   - API接続確認
   - レスポンス形式調整

---

## 📊 技術的考慮事項

### 1. ProductHandleマッピング問題
```csharp
// OrderItemsにProductIdがない場合の対処
var productMapping = await _context.Products
    .Where(p => p.StoreId == storeId)
    .ToDictionaryAsync(p => p.Handle, p => p.Id);

// OrderItems集計時にHandleでマッピング
var orderItemsGrouped = orderItems
    .Where(oi => productMapping.ContainsKey(oi.ProductHandle))
    .GroupBy(oi => productMapping[oi.ProductHandle]);
```

### 2. パフォーマンス最適化
- 月次データは事前集計で高速化
- カテゴリ別集計は別テーブルで管理
- キャッシュ有効期限30分

### 3. データ整合性
- トランザクション処理で一貫性確保
- 重複集計防止のユニーク制約
- 更新日時による監査証跡

---

## ✅ テスト項目

### 単体テスト
- [ ] 季節性指数計算ロジック
- [ ] トレンド判定ロジック
- [ ] ページング・ソート処理
- [ ] キャッシュ動作

### 統合テスト
- [ ] 大量データでのレスポンス時間（目標: 2秒以内）
- [ ] 月跨ぎデータの正確性
- [ ] カテゴリフィルタの動作
- [ ] 同時アクセス時の安定性

### 受け入れテスト
- [ ] 12ヶ月分のデータ表示
- [ ] グラフ表示の正確性
- [ ] CSV/Excelエクスポート
- [ ] モバイル表示対応

---

*作成日: 2025年7月21日*
*次回更新: 実装完了時* 

---

## 🔌 Shopify API統合詳細

### 1. Orders API データ取得

```csharp
public class ShopifyOrderSyncService
{
    private readonly ShopifyGraphQLClient _shopifyClient;
    private readonly IProductMappingService _productMapping;
    
    public async Task<List<OrderData>> GetOrdersForMonth(int storeId, int year, int month)
    {
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddSeconds(-1);
        
        var query = @"
            query GetMonthlyOrders($query: String!, $first: Int!, $after: String) {
                orders(query: $query, first: $first, after: $after) {
                    edges {
                        node {
                            id
                            createdAt
                            financialStatus
                            lineItems(first: 250) {
                                edges {
                                    node {
                                        id
                                        title
                                        quantity
                                        sku
                                        price
                                        product {
                                            id
                                            handle
                                            productType
                                        }
                                    }
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }";
        
        var queryString = $"created_at:>={startDate:yyyy-MM-dd} created_at:<={endDate:yyyy-MM-dd} financial_status:paid";
        return await ExecutePaginatedQuery(query, queryString);
    }
}
```

### 2. Product情報の同期

```csharp
public class ProductSyncService
{
    public async Task SyncProductCategories(int storeId)
    {
        var query = @"
            query GetProducts($first: Int!, $after: String) {
                products(first: $first, after: $after) {
                    edges {
                        node {
                            id
                            title
                            handle
                            productType
                            vendor
                            tags
                            createdAt
                            updatedAt
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }";
        
        var products = await _shopifyClient.GetAllProducts(query);
        await UpdateProductCategories(storeId, products);
    }
    
    private async Task UpdateProductCategories(int storeId, List<ShopifyProduct> products)
    {
        // productTypeをカテゴリとして利用
        var categories = products
            .Select(p => p.ProductType)
            .Where(pt => !string.IsNullOrEmpty(pt))
            .Distinct()
            .ToList();
        
        foreach (var categoryName in categories)
        {
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.StoreId == storeId && c.Name == categoryName);
            
            if (category == null)
            {
                _context.Categories.Add(new Category
                {
                    StoreId = storeId,
                    Name = categoryName,
                    IsActive = true
                });
            }
        }
        
        await _context.SaveChangesAsync();
    }
}
```

---

## 🚨 エラーハンドリング戦略

### 1. API エラー処理

```csharp
public class ShopifyApiErrorHandler
{
    private readonly ILogger<ShopifyApiErrorHandler> _logger;
    
    public async Task<T> HandleApiCall<T>(Func<Task<T>> apiCall, int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                return await apiCall();
            }
            catch (ShopifyRateLimitException ex)
            {
                _logger.LogWarning($"Rate limit hit. Waiting {ex.RetryAfter} seconds.");
                await Task.Delay(TimeSpan.FromSeconds(ex.RetryAfter));
            }
            catch (ShopifyApiException ex) when (ex.StatusCode >= 500)
            {
                _logger.LogError(ex, $"Server error on attempt {i + 1}");
                if (i == maxRetries - 1) throw;
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, i))); // Exponential backoff
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in Shopify API call");
                throw;
            }
        }
        
        throw new Exception("Max retries exceeded");
    }
}
```

### 2. バッチ処理エラーリカバリ

```csharp
public class BatchJobErrorRecovery
{
    public async Task ExecuteWithRecovery(Func<Task> batchJob, string jobName)
    {
        try
        {
            await batchJob();
            await LogJobSuccess(jobName);
        }
        catch (Exception ex)
        {
            await LogJobFailure(jobName, ex);
            await SendAlertNotification(jobName, ex);
            
            // 部分的な成功の場合はロールバック
            if (ShouldRollback(ex))
            {
                await RollbackPartialChanges(jobName);
            }
        }
    }
    
    private async Task LogJobFailure(string jobName, Exception ex)
    {
        await _context.BatchJobLogs.AddAsync(new BatchJobLog
        {
            JobName = jobName,
            Status = "Failed",
            ErrorMessage = ex.Message,
            StackTrace = ex.StackTrace,
            ExecutedAt = DateTime.UtcNow
        });
        
        await _context.SaveChangesAsync();
    }
}
```

---

## 📊 監視・ログ設計

### 1. Application Insights 統合

```csharp
public class TelemetryService
{
    private readonly TelemetryClient _telemetryClient;
    
    public void TrackMonthlyStatsQuery(MonthlyStatsRequest request, TimeSpan duration)
    {
        _telemetryClient.TrackEvent("MonthlyStatsQuery", new Dictionary<string, string>
        {
            { "StoreId", request.StoreId.ToString() },
            { "Year", request.Year.ToString() },
            { "Month", request.StartMonth?.ToString() ?? "All" },
            { "HasCategoryFilter", request.CategoryId.HasValue.ToString() }
        }, new Dictionary<string, double>
        {
            { "Duration", duration.TotalMilliseconds },
            { "ResultCount", request.PageSize }
        });
    }
    
    public void TrackBatchJobPerformance(string jobName, int recordsProcessed, TimeSpan duration)
    {
        _telemetryClient.TrackMetric($"BatchJob.{jobName}.RecordsProcessed", recordsProcessed);
        _telemetryClient.TrackMetric($"BatchJob.{jobName}.Duration", duration.TotalSeconds);
    }
}
```

### 2. カスタムメトリクス

```csharp
public class MonthlyStatsMetrics
{
    // レスポンスタイム監視
    public static readonly Histogram ResponseTime = Metrics
        .CreateHistogram("monthly_stats_response_time_seconds", 
            "Response time for monthly stats queries",
            new HistogramConfiguration
            {
                Buckets = Histogram.LinearBuckets(0.1, 0.1, 10),
                LabelNames = new[] { "store_id", "has_filter" }
            });
    
    // キャッシュヒット率
    public static readonly Counter CacheHits = Metrics
        .CreateCounter("monthly_stats_cache_hits_total", 
            "Total number of cache hits");
    
    // バッチ処理成功率
    public static readonly Counter BatchJobSuccess = Metrics
        .CreateCounter("monthly_stats_batch_success_total",
            "Total number of successful batch jobs");
}
```

---

## 🔒 セキュリティ考慮事項

### 1. データアクセス制御

```csharp
public class MonthlyStatsAuthorizationHandler : AuthorizationHandler<StoreAccessRequirement, int>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        StoreAccessRequirement requirement,
        int storeId)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        // ユーザーがストアへのアクセス権限を持っているか確認
        if (HasStoreAccess(userId, storeId))
        {
            context.Succeed(requirement);
        }
        
        return Task.CompletedTask;
    }
}
```

### 2. データマスキング

```csharp
public class SensitiveDataMasking
{
    public MonthlyStatsResponse MaskSensitiveData(MonthlyStatsResponse response, UserRole userRole)
    {
        if (userRole < UserRole.Manager)
        {
            // 一般ユーザーには詳細な金額を非表示
            foreach (var product in response.Products)
            {
                product.TotalRevenue = Math.Round(product.TotalRevenue / 1000) * 1000; // 千円単位に丸める
                product.MonthlyData.ForEach(m => m.Revenue = 0); // 月別詳細は非表示
            }
        }
        
        return response;
    }
}
```

### 3. API レート制限

```csharp
[ApiController]
[Route("api/analytics/sales")]
public class SalesAnalyticsController : ControllerBase
{
    [HttpGet("monthly-stats")]
    [RateLimit(PerMinute = 30, PerHour = 1000)]
    [Authorize(Policy = "StoreAccess")]
    public async Task<ActionResult<MonthlyStatsResponse>> GetMonthlyStats(
        [FromQuery] MonthlyStatsRequest request)
    {
        // 実装...
    }
}
```

---

## 🎯 実装チェックリスト

### Day 1: 基盤構築
- [ ] Azure SQL Database接続設定
- [ ] Entity Framework マイグレーション作成・実行
- [ ] 基本的なDI設定（Services, Repositories）
- [ ] Shopify GraphQL クライアント基本実装

### Day 2: コア機能実装  
- [ ] MonthlyStatsService 実装
- [ ] SalesAnalyticsController 実装
- [ ] 季節性指数計算ロジック
- [ ] キャッシュ機能実装

### Day 3: 統合・最適化
- [ ] Shopify Orders API 統合
- [ ] バッチ処理実装・テスト
- [ ] フロントエンドAPI接続
- [ ] パフォーマンステスト

---

*作成日: 2025年7月21日*
*最終更新: 2025年7月21日*
*次回更新: 実装完了時* 