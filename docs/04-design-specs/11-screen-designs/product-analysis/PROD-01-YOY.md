# 前年同月比【商品】機能 - 詳細設計書

## 🆔 画面ID: PROD-01-YOY

作成日: 2025年6月10日  
更新日: 2025年7月24日  
画面ID: PROD-01-YOY  
ステータス: 現状分析完了・詳細設計更新完了・実装準備完了  

## 📋 1. 機能概要と実装優先度評価

### 1.1 機能概要
商品別の売上を前年同月と比較し、成長率・金額差を可視化する機能です。季節性の把握と商品戦略の最適化に活用されます。

### 1.2 4機能の実装優先度比較

| 機能名 | 複雑度 | データ取得難易度 | UI複雑度 | バックエンド負荷 | 推奨順位 |
|--------|--------|------------------|----------|------------------|----------|
| **前年同月比【商品】** | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | **1位** |
| 休眠顧客【顧客】 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 2位 |
| 組み合わせ商品【商品】 | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 3位 |
| F階層傾向【購買】 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 4位 |

### 1.3 前年同月比機能が最適な理由
1. **データ構造がシンプル**: 商品×月×売上の3次元データのみ
2. **計算ロジックが明確**: 単純な前年比較演算
3. **Shopify APIの標準データ**: 追加のデータ変換が不要
4. **UI要件がシンプル**: 既存実装を活用可能
5. **基盤技術の確立**: 他機能の基盤となるパターンを構築

## 📊 2. 実装状況分析（2025年7月24日更新）

### 2.1 フロントエンド実装状況
- ✅ **UI完成度**: 95%（月別詳細表示、フィルタリング、CSV出力、年度選択）
- ✅ **コンポーネント**: `YearOverYearProductAnalysisImproved` 完全実装済み
- 🟡 **データ連携**: 0%（モックデータ使用中・API統合待ち）
- 🟡 **エラーハンドリング**: 30%（基本的な処理のみ）
- ✅ **既存機能**: フィルタリング、ソート、期間選択、CSV出力完備

### 2.2 バックエンド実装状況
- ❌ **YoY専用API**: 未実装（緊急対応必要）
- ❌ **データ集計処理**: 未実装
- ✅ **データベース基盤**: 既存スキーマで実装可能（Order/OrderItem活用）
- ❌ **パフォーマンス最適化**: 集計テーブル未実装

### 2.3 **データ可用性分析（重要）**
#### ✅ 利用可能データ
- **Order**: 注文データ（Year/Month計算プロパティ付き）
- **OrderItem**: 商品明細（スナップショット方式で履歴保護）
- **Store**: マルチストア対応済み
- **Customer**: 顧客データ（分析用）

#### ❌ 不足データ
- **月次集計テーブル**: リアルタイム計算は性能問題あり
- **前年同月比キャッシュ**: 大量データでの高速化必須
- **Shopify同期機能**: 外部データ取得未実装

### 2.4 **技術的制約・課題**
- **パフォーマンス**: OrderItem全件計算は1000商品×24ヶ月で遅延
- **データ不足**: テストデータが限定的（実装検証困難）
- **Shopify統合**: 外部API連携インフラ未整備

### 2.5 **確認済み技術スタック**
- **フロントエンド**: Next.js 15.1.0 + React 18.2.0 + TypeScript（実装済み）
- **バックエンド**: .NET 8 C# ASP.NET Core（稼働中）
- **データベース**: SQL Server（Azure SQL Database）
- **認証**: 未実装（要検討）
- **外部API**: Shopify GraphQL Admin API（未実装）
- **インフラ**: Azure App Service + Static Web Apps（稼働中）

## 🏗️ 3. システム設計

### 3.1 アーキテクチャ概要
```
[Next.js Frontend] ↔ [.NET Web API] ↔ [PostgreSQL] ↔ [Shopify API]
```

### 3.2 データフロー設計
```
1. バッチ処理（日次）: Shopify API → データ集計 → PostgreSQL保存
2. リアルタイム表示: Frontend → .NET API → PostgreSQL → Frontend
3. 期間指定分析: Frontend → .NET API → 動的集計 → Frontend
```

## 💾 4. データベース設計（実装現実に基づく更新）

### 4.1 **既存テーブル活用戦略（推奨・短期実装）**

#### **Phase 1: 既存スキーマ最大活用**
```csharp
// 既存のOrderItemテーブルを活用したYoY計算
public class YearOverYearCalculationQuery
{
    // 前年同月比計算の基本クエリ
    public async Task<List<YearOverYearProductData>> CalculateYearOverYearAsync(int year, int? month = null)
    {
        var currentYearData = await _context.OrderItems
            .Where(oi => oi.Order.CreatedAt.Year == year && 
                        (month == null || oi.Order.CreatedAt.Month == month.Value))
            .GroupBy(oi => new { oi.ProductTitle, oi.ProductType })
            .Select(g => new 
            {
                ProductTitle = g.Key.ProductTitle,
                ProductType = g.Key.ProductType,
                Year = year,
                TotalSales = g.Sum(oi => oi.TotalPrice),
                TotalQuantity = g.Sum(oi => oi.Quantity),
                OrderCount = g.Count()
            }).ToListAsync();

        var previousYearData = await _context.OrderItems
            .Where(oi => oi.Order.CreatedAt.Year == year - 1 && 
                        (month == null || oi.Order.CreatedAt.Month == month.Value))
            .GroupBy(oi => new { oi.ProductTitle, oi.ProductType })
            .Select(g => new 
            {
                ProductTitle = g.Key.ProductTitle,
                ProductType = g.Key.ProductType,
                Year = year - 1,
                TotalSales = g.Sum(oi => oi.TotalPrice),
                TotalQuantity = g.Sum(oi => oi.Quantity),
                OrderCount = g.Count()
            }).ToListAsync();

        // 前年比計算ロジック
        return CalculateGrowthRates(currentYearData, previousYearData);
    }
}
```

### 4.2 **パフォーマンス改善テーブル設計（Phase 2）**

```sql
-- 月次商品集計テーブル（既存OrderItemデータから生成）
CREATE TABLE [dbo].[MonthlyProductSummary](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [StoreId] [int] NOT NULL,
    [ProductTitle] [nvarchar](255) NOT NULL,
    [ProductType] [nvarchar](100) NULL,
    [ProductVendor] [nvarchar](100) NULL,
    [Year] [int] NOT NULL,
    [Month] [int] NOT NULL CHECK ([Month] >= 1 AND [Month] <= 12),
    [TotalSales] [decimal](18, 2) NOT NULL DEFAULT 0,
    [TotalQuantity] [int] NOT NULL DEFAULT 0,
    [OrderCount] [int] NOT NULL DEFAULT 0,
    [AverageOrderValue] [decimal](18, 2) NOT NULL DEFAULT 0,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [UQ_MonthlyProductSummary] UNIQUE ([StoreId], [ProductTitle], [Year], [Month]),
    INDEX [IX_MonthlyProductSummary_YearMonth] ([StoreId], [Year], [Month]),
    INDEX [IX_MonthlyProductSummary_Product] ([StoreId], [ProductTitle])
);

-- 前年同月比計算結果キャッシュテーブル
CREATE TABLE [dbo].[YearOverYearCache](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [StoreId] [int] NOT NULL,
    [ProductTitle] [nvarchar](255) NOT NULL,
    [ProductType] [nvarchar](100) NULL,
    [CurrentYear] [int] NOT NULL,
    [CurrentMonth] [int] NULL, -- NULLの場合は年間集計
    [CurrentSales] [decimal](18, 2) NOT NULL DEFAULT 0,
    [PreviousSales] [decimal](18, 2) NOT NULL DEFAULT 0,
    [GrowthRate] [decimal](8, 2) NOT NULL DEFAULT 0, -- パーセンテージ
    [GrowthAmount] [decimal](18, 2) NOT NULL DEFAULT 0,
    [CurrentQuantity] [int] NOT NULL DEFAULT 0,
    [PreviousQuantity] [int] NOT NULL DEFAULT 0,
    [QuantityGrowthRate] [decimal](8, 2) NOT NULL DEFAULT 0,
    [LastCalculated] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [UQ_YearOverYearCache] UNIQUE ([StoreId], [ProductTitle], [CurrentYear], [CurrentMonth]),
    INDEX [IX_YearOverYearCache_Calculation] ([StoreId], [CurrentYear], [CurrentMonth])
);

-- データ更新履歴テーブル（集計処理管理用）
CREATE TABLE [dbo].[DataAggregationLog](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [StoreId] [int] NOT NULL,
    [AggregationType] [nvarchar](50) NOT NULL, -- 'monthly', 'yearly', 'yoy_cache'
    [TargetYear] [int] NOT NULL,
    [TargetMonth] [int] NULL,
    [RecordsProcessed] [int] NOT NULL DEFAULT 0,
    [ProcessingStarted] [datetime2](7) NOT NULL,
    [ProcessingCompleted] [datetime2](7) NULL,
    [Success] [bit] NOT NULL DEFAULT 0,
    [ErrorMessage] [nvarchar](max) NULL,
    
    INDEX [IX_DataAggregationLog_Target] ([StoreId], [AggregationType], [TargetYear], [TargetMonth])
);

-- バッチ処理定期実行テーブル（集計スケジュール管理）
CREATE TABLE [dbo].[AggregationSchedule](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [StoreId] [int] NOT NULL,
    [AggregationType] [nvarchar](50) NOT NULL,
    [ScheduleExpression] [nvarchar](100) NOT NULL, -- 'daily', 'monthly', 'on-demand'
    [LastRun] [datetime2](7) NULL,
    [NextRun] [datetime2](7) NULL,
    [IsActive] [bit] NOT NULL DEFAULT 1,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    INDEX [IX_AggregationSchedule_NextRun] ([IsActive], [NextRun])
);

### 4.3 **データ移行・初期化スクリプト**

```sql
-- 既存OrderItemデータから月次集計データを生成
INSERT INTO [dbo].[MonthlyProductSummary] (
    [StoreId], [ProductTitle], [ProductType], [ProductVendor],
    [Year], [Month], [TotalSales], [TotalQuantity], [OrderCount], [AverageOrderValue]
)
SELECT 
    o.StoreId,
    oi.ProductTitle,
    oi.ProductType,
    oi.ProductVendor,
    YEAR(o.CreatedAt) as Year,
    MONTH(o.CreatedAt) as Month,
    SUM(oi.TotalPrice) as TotalSales,
    SUM(oi.Quantity) as TotalQuantity,
    COUNT(*) as OrderCount,
    AVG(oi.TotalPrice) as AverageOrderValue
FROM [dbo].[OrderItems] oi
INNER JOIN [dbo].[Orders] o ON oi.OrderId = o.Id
GROUP BY o.StoreId, oi.ProductTitle, oi.ProductType, oi.ProductVendor, YEAR(o.CreatedAt), MONTH(o.CreatedAt)
ORDER BY Year DESC, Month DESC;

-- 前年同月比キャッシュの初期計算
WITH CurrentYearData AS (
    SELECT StoreId, ProductTitle, ProductType, Year, Month, TotalSales, TotalQuantity
    FROM MonthlyProductSummary
    WHERE Year = YEAR(GETDATE())
),
PreviousYearData AS (
    SELECT StoreId, ProductTitle, ProductType, Year, Month, TotalSales, TotalQuantity
    FROM MonthlyProductSummary
    WHERE Year = YEAR(GETDATE()) - 1
)
INSERT INTO YearOverYearCache (
    StoreId, ProductTitle, ProductType, CurrentYear, CurrentMonth,
    CurrentSales, PreviousSales, GrowthRate, GrowthAmount,
    CurrentQuantity, PreviousQuantity, QuantityGrowthRate
)
SELECT 
    c.StoreId, c.ProductTitle, c.ProductType, c.Year, c.Month,
    c.TotalSales, ISNULL(p.TotalSales, 0),
    CASE WHEN ISNULL(p.TotalSales, 0) = 0 THEN 0
         ELSE ((c.TotalSales - ISNULL(p.TotalSales, 0)) / ISNULL(p.TotalSales, 1)) * 100 END,
    c.TotalSales - ISNULL(p.TotalSales, 0),
    c.TotalQuantity, ISNULL(p.TotalQuantity, 0),
    CASE WHEN ISNULL(p.TotalQuantity, 0) = 0 THEN 0
         ELSE ((c.TotalQuantity - ISNULL(p.TotalQuantity, 0)) * 100.0 / ISNULL(p.TotalQuantity, 1)) END
FROM CurrentYearData c
LEFT JOIN PreviousYearData p ON c.StoreId = p.StoreId 
    AND c.ProductTitle = p.ProductTitle 
    AND c.Month = p.Month;
```
```

## 🔧 5. .NET Web API設計（実装準備完了版）

### 5.1 **既存プロジェクト統合アプローチ**

#### **統合先プロジェクト**: `ShopifyTestApi`
```
ShopifyTestApi/（既存プロジェクト拡張）
├── Controllers/
│   ├── CustomerController.cs（既存）
│   └── AnalyticsController.cs（新規追加）
├── Services/
│   ├── DormantCustomerService.cs（既存）
│   ├── IYearOverYearService.cs（新規）
│   └── YearOverYearService.cs（新規）
├── Models/
│   ├── CustomerModels.cs（既存）
│   └── AnalyticsModels.cs（新規追加）
└── Data/
    └── ShopifyDbContext.cs（既存・拡張）
```

### 5.2 **実装優先度別APIエンドポイント設計**

#### **Phase 1: 最低限のMVP（1週間で実装可能）**
```csharp
// Controllers/AnalyticsController.cs
[Route("api/analytics")]
[ApiController]
public class AnalyticsController : ControllerBase
{
    private readonly IYearOverYearService _yearOverYearService;
    private readonly ILogger<AnalyticsController> _logger;

    // 基本の前年同月比取得（リアルタイム計算）
    [HttpGet("year-over-year")]
    public async Task<ActionResult<YearOverYearResponse>> GetYearOverYear(
        [FromQuery] YearOverYearRequest request)
    {
        try 
        {
            var result = await _yearOverYearService.GetYearOverYearAnalysisAsync(request);
            return Ok(new ApiResponse<YearOverYearResponse> { Data = result, Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "前年同月比データ取得エラー");
            return StatusCode(500, new ApiResponse<YearOverYearResponse> 
            { 
                Success = false, 
                ErrorMessage = "データ取得中にエラーが発生しました" 
            });
        }
    }

    // 集計データ更新（手動トリガー）
    [HttpPost("year-over-year/refresh")]
    public async Task<ActionResult> RefreshYearOverYearData(
        [FromBody] RefreshYearOverYearRequest request)
    {
        await _yearOverYearService.RefreshAggregationDataAsync(request.StoreId, request.Year);
        return Ok(new { message = "データ更新を開始しました", timestamp = DateTime.UtcNow });
    }
}
```

#### **Phase 2: パフォーマンス最適化版（追加2週間）**
```csharp
// 集計テーブル活用版のエンドポイント
[HttpGet("year-over-year/optimized")]
public async Task<ActionResult<YearOverYearResponse>> GetYearOverYearOptimized(
    [FromQuery] YearOverYearRequest request)
{
    // キャッシュテーブルからの高速取得
    var result = await _yearOverYearService.GetYearOverYearFromCacheAsync(request);
    return Ok(new ApiResponse<YearOverYearResponse> { Data = result, Success = true });
}

// バッチ処理ステータス確認
[HttpGet("aggregation/status")]
public async Task<ActionResult<AggregationStatusResponse>> GetAggregationStatus(
    [FromQuery] int storeId)
{
    var status = await _yearOverYearService.GetAggregationStatusAsync(storeId);
    return Ok(status);
}

// 月次集計データ強制更新
[HttpPost("aggregation/monthly")]
public async Task<ActionResult> TriggerMonthlyAggregation(
    [FromBody] MonthlyAggregationRequest request)
{
    await _yearOverYearService.TriggerMonthlyAggregationAsync(request);
    return Accepted(new { message = "月次集計処理を開始しました" });
}
```

### 5.3 **実装準備完了DTOクラス設計**

```csharp
```csharp
// Models/AnalyticsModels.cs
namespace ShopifyTestApi.Models
{
    // リクエストDTO
    public class YearOverYearRequest
    {
        public int StoreId { get; set; } = 1; // マルチストア対応
        public int Year { get; set; } = DateTime.Now.Year;
        public int? StartMonth { get; set; } = 1;
        public int? EndMonth { get; set; } = 12;
        public List<string>? ProductTypes { get; set; }
        public List<string>? ProductVendors { get; set; }
        public string? SearchTerm { get; set; }
        public string? SortBy { get; set; } = "growth_rate";
        public bool SortDescending { get; set; } = true;
        public string? GrowthFilter { get; set; } = "all"; // all, positive, negative, high_growth
        public decimal? MinGrowthRate { get; set; }
        public decimal? MaxGrowthRate { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        public bool UseCache { get; set; } = true; // キャッシュ使用フラグ
    }

    // メインレスポンスDTO
    public class YearOverYearResponse
    {
        public List<YearOverYearProductData> Products { get; set; } = new();
        public YearOverYearSummary Summary { get; set; } = new();
        public YearOverYearMetadata Metadata { get; set; } = new();
    }

    // 商品別前年同月比データ
    public class YearOverYearProductData
    {
        public string ProductTitle { get; set; } = string.Empty;
        public string? ProductType { get; set; }
        public string? ProductVendor { get; set; }
        public string? ProductHandle { get; set; }
        
        // 年間集計データ
        public decimal CurrentYearSales { get; set; }
        public decimal PreviousYearSales { get; set; }
        public decimal GrowthRate { get; set; }
        public decimal GrowthAmount { get; set; }
        public int CurrentYearQuantity { get; set; }
        public int PreviousYearQuantity { get; set; }
        public decimal QuantityGrowthRate { get; set; }
        
        // 月別詳細データ
        public List<MonthlyComparisonData> MonthlyData { get; set; } = new();
        
        // 分析指標
        public string GrowthCategory { get; set; } = string.Empty; // "high_growth", "stable", "declining"
        public int TrendScore { get; set; } // 1-5のトレンドスコア
    }

    // 月別比較データ
    public class MonthlyComparisonData
    {
        public int Month { get; set; }
        public string MonthName { get; set; } = string.Empty;
        public decimal CurrentSales { get; set; }
        public decimal PreviousSales { get; set; }
        public decimal GrowthRate { get; set; }
        public decimal GrowthAmount { get; set; }
        public int CurrentQuantity { get; set; }
        public int PreviousQuantity { get; set; }
        public decimal QuantityGrowthRate { get; set; }
        public int CurrentOrderCount { get; set; }
        public int PreviousOrderCount { get; set; }
    }

    // サマリー統計
    public class YearOverYearSummary
    {
        public int TotalProducts { get; set; }
        public int ProductsWithGrowth { get; set; }
        public int ProductsWithDecline { get; set; }
        public decimal AverageGrowthRate { get; set; }
        public decimal TotalCurrentYearSales { get; set; }
        public decimal TotalPreviousYearSales { get; set; }
        public decimal OverallGrowthRate { get; set; }
        public decimal OverallGrowthAmount { get; set; }
        public List<CategoryGrowth> CategoryBreakdown { get; set; } = new();
    }

    // カテゴリ別成長率
    public class CategoryGrowth
    {
        public string CategoryName { get; set; } = string.Empty;
        public int ProductCount { get; set; }
        public decimal TotalSales { get; set; }
        public decimal GrowthRate { get; set; }
    }

    // メタデータ
    public class YearOverYearMetadata
    {
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public string DataSource { get; set; } = "realtime"; // "realtime" or "cache"
        public DateTime? LastCacheUpdate { get; set; }
        public TimeSpan CalculationTime { get; set; }
        public int TotalRecordsProcessed { get; set; }
        public string Currency { get; set; } = "JPY";
        public PaginationInfo Pagination { get; set; } = new();
    }

    // ページネーション情報
    public class PaginationInfo
    {
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }

    // データ更新関連
    public class RefreshYearOverYearRequest
    {
        public int StoreId { get; set; } = 1;
        public int? Year { get; set; }
        public bool ForceRefresh { get; set; } = false;
    }

    public class MonthlyAggregationRequest
    {
        public int StoreId { get; set; } = 1;
        public int Year { get; set; }
        public int? Month { get; set; } // 指定しない場合は全月
    }

    public class AggregationStatusResponse
    {
        public int StoreId { get; set; }
        public DateTime? LastMonthlyAggregation { get; set; }
        public DateTime? LastYearOverYearCalculation { get; set; }
        public bool IsProcessing { get; set; }
        public string? CurrentOperation { get; set; }
        public int ProcessingProgress { get; set; } // 0-100
    }
}
```
```

## 🔄 6. バッチ処理設計

### 6.1 データ集計戦略

```csharp
// Background/DataAggregationService.cs
public class DataAggregationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DataAggregationService> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var shopifyService = scope.ServiceProvider.GetRequiredService<IShopifyService>();
                var analyticsService = scope.ServiceProvider.GetRequiredService<IAnalyticsService>();

                // 毎日午前2時に前日データを処理
                var now = DateTime.Now;
                var targetDate = now.Date.AddDays(-1);

                // 1. Shopifyから注文データを取得
                var orders = await shopifyService.GetOrdersAsync(targetDate, targetDate.AddDays(1));

                // 2. 商品別集計を実行
                await analyticsService.AggregateProductSalesAsync(orders, targetDate);

                // 3. 月次集計を更新
                if (targetDate.Day == DateTime.DaysInMonth(targetDate.Year, targetDate.Month))
                {
                    await analyticsService.UpdateMonthlyAggregationAsync(targetDate);
                }

                // 4. 前年同月比キャッシュを更新
                await analyticsService.UpdateYearOverYearCacheAsync(targetDate);

                _logger.LogInformation($"データ集計完了: {targetDate:yyyy-MM-dd}");

                // 24時間待機
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "データ集計中にエラーが発生しました");
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }
    }
}
```

### 6.2 Shopify API連携

```csharp
// Services/ShopifyService.cs
public class ShopifyService : IShopifyService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public async Task<List<ShopifyOrder>> GetOrdersAsync(DateTime startDate, DateTime endDate)
    {
        var query = $@"
        {{
          orders(
            first: 250
            query: ""created_at:>={startDate:yyyy-MM-dd} AND created_at:<{endDate:yyyy-MM-dd}""
            sortKey: CREATED_AT
          ) {{
            edges {{
              node {{
                id
                createdAt
                totalPriceSet {{
                  shopMoney {{
                    amount
                    currencyCode
                  }}
                }}
                lineItems(first: 100) {{
                  edges {{
                    node {{
                      id
                      product {{
                        id
                        title
                        productType
                        vendor
                      }}
                      quantity
                      originalTotalSet {{
                        shopMoney {{
                          amount
                        }}
                      }}
                    }}
                  }}
                }}
              }}
            }}
            pageInfo {{
              hasNextPage
              endCursor
            }}
          }}
        }}";

        var response = await ExecuteGraphQLQuery(query);
        return ParseOrdersResponse(response);
    }

    private async Task<string> ExecuteGraphQLQuery(string query)
    {
        var shopifyUrl = _configuration["Shopify:AdminApiUrl"];
        var accessToken = _configuration["Shopify:AccessToken"];

        var request = new HttpRequestMessage(HttpMethod.Post, shopifyUrl)
        {
            Headers = { { "X-Shopify-Access-Token", accessToken } },
            Content = new StringContent(
                JsonSerializer.Serialize(new { query }),
                Encoding.UTF8,
                "application/json"
            )
        };

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        
        return await response.Content.ReadAsStringAsync();
    }
}
```

## 🚀 7. 修正実装計画（現実的アプローチ）

### 7.1 **Phase 1: Quick Win MVP（1週間）** 🎯
- [ ] **AnalyticsController実装** - 既存ShopifyTestApiプロジェクトに追加
- [ ] **YearOverYearService実装** - 既存OrderItem/Orderテーブル活用
- [ ] **AnalyticsModels.cs追加** - DTOクラス群実装
- [ ] **リアルタイム計算ロジック** - CTE使用の最適化クエリ
- [ ] **フロントエンドAPI統合** - モックデータからAPI切り替え
- [ ] **基本エラーハンドリング** - 既存パターンに準拠
- [ ] **ログ機能** - 既存LoggingHelper活用
- [ ] **Azure本番デプロイ** - 既存CI/CDパイプライン活用

### 7.2 **Phase 2: パフォーマンス最適化（2週間）** 🚀
- [ ] **月次集計テーブル作成** - MonthlyProductSummary実装
- [ ] **前年同月比キャッシュ** - YearOverYearCache実装
- [ ] **バッチ処理サービス** - BackgroundService実装
- [ ] **集計スケジューラー** - 日次/月次自動実行
- [ ] **パフォーマンス監視** - レスポンス時間追跡
- [ ] **データ品質チェック** - 整合性検証機能
- [ ] **高度フィルタリング** - カテゴリ・期間・成長率フィルタ

### 7.3 **Phase 3: 本格機能拡張（2週間）** ⚡
- [ ] **Shopify API統合** - リアルタイムデータ同期
- [ ] **マルチストア管理** - ストア切り替えUI実装
- [ ] **高度分析機能** - トレンド分析・予測機能
- [ ] **認証統合** - Clerk認証システム統合
- [ ] **監視・アラート** - 障害検知・通知機能
- [ ] **APIドキュメント** - Swagger拡張・使用例追加

### 7.4 **Phase 4: 本番品質確保（1週間）** ✅
- [ ] **自動テスト** - 単体・統合・E2Eテスト実装
- [ ] **負荷テスト** - 1000商品×2年データでの性能検証
- [ ] **セキュリティ監査** - 脆弱性スキャン・対策
- [ ] **運用手順書** - 障害対応・メンテナンス手順
- [ ] **ユーザー受け入れテスト** - 実際のビジネスシナリオ検証
- [ ] **本番リリース** - Blue-Green デプロイメント

## 📋 8. 技術的考慮事項・実装上の制約

### 8.1 **パフォーマンス課題と対策**

#### 🚨 **Critical Issue: 大量データ処理**
```csharp
// 問題：OrderItem全件スキャンによる性能劣化
// 1000商品 × 24ヶ月 × 平均100注文 = 240万レコード処理

// 解決策1: インデックス最適化
CREATE INDEX IX_OrderItems_Performance ON OrderItems 
(ProductTitle, ProductType, OrderId) 
INCLUDE (TotalPrice, Quantity, CreatedAt);

// 解決策2: クエリ最適化
public async Task<List<YearOverYearProductData>> GetYearOverYearOptimizedAsync(int year)
{
    // CTEを使用した効率的な集計
    var sql = @"
        WITH MonthlyProductData AS (
            SELECT 
                oi.ProductTitle,
                oi.ProductType,
                YEAR(o.CreatedAt) as Year,
                MONTH(o.CreatedAt) as Month,
                SUM(oi.TotalPrice) as TotalSales,
                SUM(oi.Quantity) as TotalQuantity,
                COUNT(*) as OrderCount
            FROM OrderItems oi
            INNER JOIN Orders o ON oi.OrderId = o.Id
            WHERE o.CreatedAt >= DATEADD(year, -2, GETDATE())
            GROUP BY oi.ProductTitle, oi.ProductType, YEAR(o.CreatedAt), MONTH(o.CreatedAt)
        )
        SELECT * FROM MonthlyProductData 
        WHERE Year IN (@currentYear, @previousYear)
        ORDER BY ProductTitle, Year, Month";
}
```

### 8.2 **データ制約・既知の問題**

#### ❌ **不足しているデータ・機能**
- **Shopify商品ID**: 現在のOrderItemにShopify商品IDなし
- **商品画像**: UI表示用の画像URLなし
- **カテゴリ階層**: フラットなProductTypeのみ（階層化なし）
- **リアルタイム在庫**: 在庫情報の同期機能なし
- **価格履歴**: 価格変動の履歴追跡なし

#### ⚠️ **データ品質の懸念**
- **商品名統一**: OrderItem.ProductTitleの表記ゆれ
- **データ欠損**: 古いデータの一部項目NULL
- **通貨統一**: 複数通貨混在の可能性
- **タイムゾーン**: 日本時間とUTCの混在

### 8.3 **実装制約**

#### 🔒 **現在のアーキテクチャ制約**
```csharp
// 制約1: 認証機能未実装
// 現状：全APIがパブリックアクセス
// 対策：Phase 2でClerk認証統合予定

// 制約2: マルチテナント設計の複雑性
// StoreId必須だが、フロントエンドでの切り替えUIなし

// 制約3: リアルタイム計算のレスポンス時間
// 目標：2秒以内、現実：大量データで5-10秒の可能性
```

#### 🎯 **実装優先度（修正版）**
```typescript
interface ImplementationPriority {
  phase_1_mvp: {
    duration: '1 week';
    goal: 'Working YoY API with basic functionality';
    scope: [
      'AnalyticsController with basic endpoints',
      'YearOverYearService with real-time calculation',
      'Frontend API integration (replace mock data)',
      'Basic error handling and logging'
    ];
    success_criteria: 'Frontend displays real YoY data from API';
  };
  
  phase_2_optimization: {
    duration: '2 weeks';
    goal: 'Performance optimization and caching';
    scope: [
      'Monthly aggregation tables implementation',
      'YoY cache table and batch processing',
      'Background service for data aggregation',
      'Advanced filtering and search'
    ];
    success_criteria: 'Sub-2 second response time for 1000+ products';
  };
  
  phase_3_enhancement: {
    duration: '2 weeks';
    goal: 'Enterprise features and Shopify integration';
    scope: [
      'Shopify API integration for real-time data sync',
      'Advanced analytics and insights',
      'Multi-store management UI',
      'Automated testing and monitoring'
    ];
    success_criteria: 'Production-ready with external data sync';
  };
}
```

## 🎯 9. 受け入れ条件

### 9.1 機能要件
- [ ] 2年間の月別売上比較が正確に表示できる
- [ ] 成長率計算が正確である（小数点第1位まで）
- [ ] 商品検索・フィルタリングが正常に動作する
- [ ] CSV/Excel出力が正常に動作する
- [ ] 1000商品以上でも2秒以内にレスポンスを返す

### 9.2 非機能要件
- [ ] 99.9%以上の稼働率を維持する
- [ ] データ更新の遅延は24時間以内
- [ ] セキュリティ脆弱性がない
- [ ] 同時アクセス100ユーザーまで対応

### 9.3 運用要件
- [ ] バッチ処理の失敗を自動検知・通知
- [ ] データ整合性の定期チェック
- [ ] パフォーマンス監視ダッシュボード
- [ ] 障害時の自動復旧機能

## 📈 10. 成功指標（KPI）

### 10.1 技術KPI
- **API レスポンス時間**: 平均1.5秒以内
- **データ精度**: 99.9%以上
- **システム稼働率**: 99.9%以上
- **バッチ処理成功率**: 99.5%以上

### 10.2 ビジネスKPI
- **機能利用率**: 月次80%以上
- **ユーザー満足度**: 4.5/5.0以上
- **分析精度**: 予測と実績の差異10%以内
- **意思決定効率**: 分析時間50%短縮

## 💡 11. 結論と推奨事項（実装準備完了版）

### 11.1 **実装可能性評価**

#### ✅ **高い実装可能性**
1. **既存インフラ活用**: ShopifyTestApiプロジェクト・Azure環境完備
2. **データ基盤確立**: Order/OrderItemテーブルで必要データ揃っている
3. **フロントエンド完成**: UIは95%完成、API統合のみ必要
4. **技術スタック統一**: .NET 8 + SQL Server + Azure の安定構成

#### ⚠️ **注意すべき制約**
1. **パフォーマンス**: 初期版はリアルタイム計算のため若干遅延
2. **データ量**: 現在のテストデータで完全検証困難
3. **Shopify統合**: Phase 1では既存データのみ、外部連携は後回し

### 11.2 **推奨実装戦略**

#### 🎯 **Quick Win優先アプローチ**
```typescript
interface RecommendedStrategy {
  week_1: {
    goal: 'Working YoY feature with real data';
    deliverable: 'Frontend displays real API data instead of mocks';
    effort: '20-30 hours';
    risk: 'Low';
  };
  
  week_2_3: {
    goal: 'Performance optimization for production';
    deliverable: 'Sub-2 second response time, cache system';
    effort: '40-50 hours';
    risk: 'Medium';
  };
  
  week_4_5: {
    goal: 'Enterprise-grade features';
    deliverable: 'Shopify sync, multi-store, advanced analytics';
    effort: '50-60 hours';
    risk: 'Medium-High';
  };
}
```

### 11.3 **即座に開始できる理由**
1. **設計完了**: 本ドキュメントで実装仕様確定
2. **環境準備済み**: 開発・本番環境完備
3. **コード基盤**: 既存プロジェクトのパターン踏襲可能
4. **高ROI**: フロントエンド完成済みのため、バックエンド実装で即座に価値提供

### 11.4 **成功確率向上のポイント**
- **段階的リリース**: Phase 1で基本機能、以降で段階的機能追加
- **既存パターン踏襲**: DormantCustomerService成功パターンの再利用
- **パフォーマンス監視**: 初期から計測・改善サイクル確立
- **ユーザーフィードバック**: 早期プロトタイプでの検証

**この設計により、1週間でプロトタイプ、4週間で本格稼働可能な前年同月比分析機能を実装し、プロジェクト全体の技術基盤を確立できます。**

## 📊 12. データギャップ分析・実現可能性評価

### 12.1 **現在持っているデータ vs 設計書要求データ**

| データ項目 | 設計書要求 | 現在の状況 | 実現可能性 | 対応方針 |
|------------|------------|------------|------------|----------|
| **商品売上履歴** | 月次集計済み | OrderItem生データ | ✅ 高 | リアルタイム集計→後にテーブル化 |
| **商品基本情報** | Master管理 | OrderItemにスナップショット | ✅ 高 | 現在の方式で十分 |
| **前年同月比計算** | 事前計算済み | 計算ロジック未実装 | ✅ 高 | Phase 1でリアルタイム計算 |
| **カテゴリ階層** | 階層構造 | フラット(ProductType) | 🟡 中 | 既存データ構造で代替 |
| **Shopify商品ID** | 連携用 | 未保存 | ❌ 低 | Phase 3でAPI統合時に追加 |
| **商品画像URL** | UI表示用 | 未保存 | ❌ 低 | Phase 3でAPI統合時に追加 |
| **リアルタイム在庫** | 在庫分析 | 未対応 | ❌ 低 | 将来機能として先送り |
| **価格変動履歴** | トレンド分析 | 注文時価格のみ | 🟡 中 | OrderItem.Priceで部分対応 |

### 12.2 **計算できないデータ・機能制限**

#### ❌ **Phase 1で実現困難な機能**
```typescript
interface UnfeasibleFeatures {
  real_time_inventory_impact: {
    reason: '在庫データなし';
    alternative: '売上数量のみで代替分析';
  };
  
  shopify_product_sync: {
    reason: 'Shopify API統合未実装';
    alternative: 'OrderItemの商品情報で分析';
  };
  
  advanced_categorization: {
    reason: 'カテゴリ階層データなし';
    alternative: 'ProductType/Vendorでの分類';
  };
  
  competitive_analysis: {
    reason: '外部データソースなし';
    alternative: '内部データのみの分析';
  };
}
```

#### 🟡 **制限付きで実現可能な機能**
```typescript
interface LimitedFeatures {
  product_performance_ranking: {
    limitation: '売上・数量ベースのみ';
    missing: '利益率・マージン分析';
    workaround: 'TotalPrice/Quantityで平均単価分析';
  };
  
  seasonal_trend_analysis: {
    limitation: '過去データ範囲に依存';
    missing: '外部要因（天候・イベント）との相関';
    workaround: '純粋な時系列パターン分析';
  };
  
  customer_segment_impact: {
    limitation: 'Customer基本情報のみ';
    missing: '詳細な顧客行動データ';
    workaround: 'TotalSpent/TotalOrdersでのセグメント分析';
  };
}
```

### 12.3 **画面設計変更の必要性評価**

#### ✅ **変更不要な画面要素**
- 年度選択（2022-2024）
- 月別表示・グラフ
- 成長率計算・表示
- フィルタリング（商品タイプ・ベンダー）
- ソート機能
- CSV出力

#### 🔄 **調整が必要な画面要素**
```typescript
interface UIAdjustments {
  product_images: {
    current: '商品画像表示予定';
    reality: '画像データなし';
    solution: 'プレースホルダー画像またはアイコン表示';
  };
  
  shopify_product_link: {
    current: 'Shopify管理画面リンクボタン';
    reality: 'Shopify商品ID未保存';
    solution: 'リンクボタン非表示、将来機能として予約';
  };
  
  inventory_status: {
    current: '在庫状況表示';
    reality: '在庫データなし';
    solution: '「データなし」表示または項目削除';
  };
  
  advanced_filters: {
    current: '詳細カテゴリフィルタ';
    reality: 'フラットなProductTypeのみ';
    solution: '既存ProductType/Vendorフィルタで対応';
  };
}
```

### 12.4 **実現可能性に基づく最終推奨事項**

#### 🎯 **Phase 1: 実装確実な機能**
- 前年同月比計算（売上・数量・成長率）
- 月別トレンド分析
- 商品別ランキング
- 基本フィルタリング（ProductType/Vendor）
- CSV出力

#### 🔄 **Phase 2: 最適化・拡張機能**
- パフォーマンス改善（集計テーブル）
- 高度なフィルタリング
- 詳細分析指標

#### 🚀 **Phase 3: 理想的な機能**
- Shopify API統合
- リアルタイム商品情報
- 在庫連動分析

**結論**: 現在の技術基盤・データ状況で、設計書の80%の機能は実現可能。残り20%は将来の機能拡張として段階的実装を推奨。Phase 1でも十分な価値提供が可能。

## ⚠️ 3. Shopify アプリ分類と配布制約（重要更新）

### 3.1 現在のShopifyアプリ分類（2025年確認済み）

#### **正確なアプリタイプ分類**
| アプリタイプ | 作成場所 | 配布範囲 | 審査 | read_all_orders | 推奨度 |
|-------------|----------|----------|------|-----------------|--------|
| **Public Apps** | Partner Dashboard | 複数ストア（無制限） | 必要 | 申請・審査必要 | ⭐ |
| **Custom Apps** | Partner Dashboard | 単一ストア（Plus組織内は複数可） | 不要 | 自動付与 | ⭐⭐⭐ |
| **Admin Custom Apps** | Shopify Admin | 単一ストア | 不要 | 自動付与 | ⭐⭐ |

#### **重要な事実確認**
```typescript
// 重要：Private Appsは2022年1月に廃止済み
interface ShopifyAppTypeHistory {
  private_apps: {
    status: 'DEPRECATED';
    deprecated_date: '2022-01-01';
    migration_date: '2023-01-20';
    migrated_to: 'Custom Apps';
  };
  
  current_types: ['Public Apps', 'Custom Apps', 'Admin Custom Apps'];
  // 「Private App」と呼ばれているものは実際には「Custom Apps」
}
```

### 3.2 カスタムアプリ配布の技術的制約

#### **重大な制約事項**
```typescript
interface CustomAppLimitations {
  app_creation: {
    method: 'Manual only (Partner Dashboard)';
    automation_api: 'NOT AVAILABLE';
    per_customer_creation: 'Required manually';
  };
  
  installation_link: {
    generation: 'OAuth 2.0 dynamic generation possible';
    prerequisite: 'Existing app (API Key/Secret) required';
    format: 'https://{shop}.myshopify.com/admin/oauth/authorize?client_id={api_key}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}';
  };
  
  multi_customer_distribution: {
    single_custom_app: 'Single store only';
    multiple_customers: 'Requires separate Custom App per customer';
    plus_organization: 'Multiple stores within same Plus org allowed';
  };
}
```

#### **実装可能な自動化範囲**
```typescript
// 可能な自動化
interface PossibleAutomation {
  oauth_link_generation: 'Fully automatable';
  installation_process: 'Merchant interaction required';
  app_configuration: 'Automatable via API after installation';
}

// 不可能な自動化
interface ImpossibleAutomation {
  custom_app_creation: 'Manual Partner Dashboard operation required';
  bulk_app_distribution: 'No API for Custom App creation';
  silent_installation: 'Merchant consent required by Shopify policy';
}
```

### 3.3 複数顧客配布の実装戦略

#### **戦略A: マルチテナント Custom App（推奨）**
```csharp
// 同一コードベース・複数Custom App管理
public class MultiTenantCustomAppManager
{
    public class CustomAppConfig
    {
        public string CustomerId { get; set; }
        public string ShopDomain { get; set; }
        public string ApiKey { get; set; }        // 顧客別Custom App
        public string ApiSecret { get; set; }    // 顧客別Custom App
        public string AccessToken { get; set; }  // インストール後取得
    }
    
    // 顧客別設定管理
    public Dictionary<string, CustomAppConfig> CustomerConfigs { get; set; }
    
    // 動的インストールリンク生成
    public string GenerateInstallationLink(string customerId, string shopDomain)
    {
        var config = CustomerConfigs[customerId];
        var scopes = "read_orders,read_products,read_customers";
        var redirectUri = $"https://our-backend.com/oauth/callback/{customerId}";
        var nonce = GenerateSecureNonce();
        
        return $"https://{shopDomain}.myshopify.com/admin/oauth/authorize" +
               $"?client_id={config.ApiKey}" +
               $"&scope={scopes}" +
               $"&redirect_uri={redirectUri}" +
               $"&state={nonce}";
    }
}
```

#### **戦略B: Plus組織活用（大企業顧客向け）**
```typescript
interface PlusOrganizationStrategy {
  target_customers: 'Enterprise customers with Shopify Plus';
  distribution_scope: 'Multiple stores within same Plus organization';
  setup_process: 'Contact Shopify support for multi-store enablement';
  advantages: ['Single Custom App for multiple stores', 'Simplified management'];
  limitations: ['Plus customers only', 'Shopify approval required'];
}
```

### 3.4 インストールリンク自動生成実装

#### **OAuth 2.0フロー自動化**
```csharp
public class ShopifyOAuthService
{
    public async Task<string> HandleOAuthCallback(string customerId, string code, string shop)
    {
        var config = GetCustomerConfig(customerId);
        
        // Step 1: Exchange authorization code for access token
        var tokenRequest = new
        {
            client_id = config.ApiKey,
            client_secret = config.ApiSecret,
            code = code
        };
        
        var response = await HttpClient.PostAsync(
            $"https://{shop}.myshopify.com/admin/oauth/access_token",
            JsonContent.Create(tokenRequest)
        );
        
        var tokenResponse = await response.Content.ReadFromJsonAsync<TokenResponse>();
        
        // Step 2: Store access token for customer
        await StoreAccessToken(customerId, shop, tokenResponse.AccessToken);
        
        return tokenResponse.AccessToken;
    }
    
    public async Task<bool> ValidateInstallation(string customerId, string shop)
    {
        var config = GetCustomerConfig(customerId);
        // Shopify API call to verify app installation
        return await VerifyAppInstalled(config.AccessToken, shop);
    }
}
```

### 3.5 実装計画への影響

#### **修正された実装アプローチ**
```typescript
interface RevisedImplementationPlan {
  phase_0: {
    title: 'Customer Onboarding Setup';
    duration: '1 week';
    tasks: [
      'Partner Dashboard: Manual Custom App creation per customer',
      'OAuth configuration and callback endpoint setup',
      'Customer-specific configuration database design'
    ];
  };
  
  phase_1: {
    title: 'Automated Installation System';
    duration: '2 weeks';
    tasks: [
      'OAuth link generation API implementation',
      'Installation callback handling',
      'Customer configuration management system'
    ];
  };
  
  scaling_strategy: {
    initial: 'Manual Custom App creation (acceptable for early customers)';
    growth: 'Standardized process with customer self-service portal';
    enterprise: 'Plus organization multi-store approach';
  };
}
```

この制約を踏まえると、**真の自動化は技術的に不可能**ですが、OAuth部分の自動化により運用負荷は大幅に軽減できます。 