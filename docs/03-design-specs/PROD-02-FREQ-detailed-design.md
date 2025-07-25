# PROD-02-FREQ - 購入頻度分析【商品】詳細設計書

## ドキュメント情報
- **画面ID**: PROD-02-FREQ
- **画面名**: 購入頻度分析【商品】(Product Purchase Frequency Analysis)
- **作成日**: 2025-07-24
- **バージョン**: 1.0
- **ステータス**: Phase 2（機能拡張対象）

## 1. ビジネス概要

### 1.1 機能概要
商品別の購入頻度分布を分析し、商品のリピート性やカスタマーライフサイクルの理解を支援する機能。各商品がどの程度リピート購入されているかを可視化し、商品戦略の立案に活用する。

### 1.2 主要機能
- 商品別購入頻度分布の可視化（ヒートマップ・チャート表示）
- 購入頻度別の顧客数・売上の分析
- コンバージョン率の計算（1回→2回、2回→3回等）
- 商品カテゴリ別の比較分析
- 期間別トレンド分析

### 1.3 ビジネス価値
- リピート性の高い商品の特定
- 商品ライフサイクルの理解
- 在庫戦略・マーケティング戦略の最適化
- 商品開発における示唆の獲得
- クロスセル・アップセル機会の発見

### 1.4 分析指標
- **購入頻度**: 各商品を何回購入した顧客がどれだけいるか
- **顧客分布**: 頻度別の顧客数と構成比
- **売上貢献**: 頻度別の売上金額と構成比
- **コンバージョン率**: n回→(n+1)回への移行率
- **平均購入間隔**: リピート購入の平均間隔

## 2. データベース設計

### 2.1 テーブル定義

```sql
-- 商品購入頻度分析テーブル
CREATE TABLE ProductPurchaseFrequencyAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    ProductId NVARCHAR(100) NOT NULL,
    ProductName NVARCHAR(500) NOT NULL,
    ProductHandle NVARCHAR(500),
    Category NVARCHAR(255),
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    TotalCustomers INT NOT NULL DEFAULT 0,        -- 総購入顧客数
    MaxFrequency INT NOT NULL DEFAULT 0,          -- 最大購入頻度
    AveragePurchaseInterval DECIMAL(8,2),         -- 平均購入間隔（日）
    RepeatCustomerRate DECIMAL(5,2) DEFAULT 0,    -- リピート率（%）
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_ProductFreq_Shop_Period (ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd),
    INDEX IX_ProductFreq_Product (ShopDomain, ProductId),
    INDEX IX_ProductFreq_Category (ShopDomain, Category)
);

-- 商品購入頻度詳細テーブル
CREATE TABLE ProductPurchaseFrequencyDetails (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    ProductId NVARCHAR(100) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    PurchaseCount INT NOT NULL,                   -- 購入回数（1, 2, 3...）
    CustomerCount INT NOT NULL DEFAULT 0,        -- 該当顧客数
    CustomerPercentage DECIMAL(5,2) DEFAULT 0,   -- 顧客数構成比（%）
    TotalAmount DECIMAL(18,2) DEFAULT 0,         -- 総売上金額
    AmountPercentage DECIMAL(5,2) DEFAULT 0,     -- 売上構成比（%）
    AverageOrderValue DECIMAL(18,2) DEFAULT 0,   -- 平均注文単価
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_ProductFreqDetail_Product_Period (ShopDomain, ProductId, AnalysisPeriodStart),
    INDEX IX_ProductFreqDetail_Count (ShopDomain, PurchaseCount),
    UNIQUE(ShopDomain, ProductId, AnalysisPeriodStart, AnalysisPeriodEnd, PurchaseCount)
);

-- 購入頻度コンバージョンテーブル
CREATE TABLE PurchaseFrequencyConversion (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    ProductId NVARCHAR(100) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    FromFrequency INT NOT NULL,                   -- 変換前頻度（1, 2, 3...）
    ToFrequency INT NOT NULL,                     -- 変換後頻度（2, 3, 4...）
    EligibleCustomers INT NOT NULL DEFAULT 0,    -- 対象顧客数
    ConvertedCustomers INT NOT NULL DEFAULT 0,   -- 変換顧客数
    ConversionRate DECIMAL(5,2) DEFAULT 0,       -- 変換率（%）
    AverageConversionDays DECIMAL(8,2),          -- 平均変換日数
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_FreqConversion_Product (ShopDomain, ProductId, AnalysisPeriodStart),
    INDEX IX_FreqConversion_From_To (FromFrequency, ToFrequency),
    UNIQUE(ShopDomain, ProductId, AnalysisPeriodStart, AnalysisPeriodEnd, FromFrequency, ToFrequency)
);

-- 商品カテゴリ頻度分析テーブル
CREATE TABLE CategoryPurchaseFrequencyAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    Category NVARCHAR(255) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    TotalProducts INT NOT NULL DEFAULT 0,        -- 対象商品数
    TotalCustomers INT NOT NULL DEFAULT 0,       -- 総購入顧客数
    AverageFrequency DECIMAL(5,2) DEFAULT 0,     -- 平均購入頻度
    MedianFrequency INT DEFAULT 0,               -- 中央値頻度
    HighFrequencyProductsCount INT DEFAULT 0,    -- 高頻度商品数（頻度3以上）
    RepeatRate DECIMAL(5,2) DEFAULT 0,           -- カテゴリリピート率
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_CategoryFreq_Shop_Period (ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd),
    INDEX IX_CategoryFreq_Category (ShopDomain, Category)
);

-- 購入頻度トレンドテーブル
CREATE TABLE ProductFrequencyTrend (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    ProductId NVARCHAR(100) NOT NULL,
    AnalysisMonth DATE NOT NULL,                  -- 分析月（月初日）
    AverageFrequency DECIMAL(5,2) DEFAULT 0,     -- 平均購入頻度
    RepeatCustomerRate DECIMAL(5,2) DEFAULT 0,   -- リピート率
    NewCustomers INT DEFAULT 0,                  -- 新規顧客数
    RepeatCustomers INT DEFAULT 0,               -- リピート顧客数
    TrendDirection NVARCHAR(20),                 -- Up/Down/Stable
    TrendStrength DECIMAL(5,2),                  -- トレンド強度
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_ProductTrend_Product_Month (ShopDomain, ProductId, AnalysisMonth),
    INDEX IX_ProductTrend_Month (ShopDomain, AnalysisMonth)
);
```

### 2.2 インデックス戦略
- 商品別・期間別検索の最適化
- 購入頻度による集計クエリの高速化
- カテゴリ別分析の効率化
- トレンド分析のための時系列インデックス

## 3. API設計

### 3.1 コントローラー定義

```csharp
[ApiController]
[Route("api/analysis/product-purchase-frequency")]
public class ProductPurchaseFrequencyController : ControllerBase
{
    private readonly IProductPurchaseFrequencyService _frequencyService;
    private readonly ILogger<ProductPurchaseFrequencyController> _logger;

    [HttpGet]
    public async Task<IActionResult> GetProductPurchaseFrequency(
        [FromQuery] ProductPurchaseFrequencyRequest request)
    {
        // 商品購入頻度分析の取得
    }

    [HttpGet("category-comparison")]
    public async Task<IActionResult> GetCategoryComparison(
        [FromQuery] CategoryComparisonRequest request)
    {
        // カテゴリ別比較分析
    }

    [HttpGet("conversion-analysis")]
    public async Task<IActionResult> GetConversionAnalysis(
        [FromQuery] ConversionAnalysisRequest request)
    {
        // コンバージョン分析の取得
    }

    [HttpGet("trend-analysis")]
    public async Task<IActionResult> GetTrendAnalysis(
        [FromQuery] TrendAnalysisRequest request)
    {
        // トレンド分析の取得
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateFrequencyAnalysis(
        [FromBody] CalculateFrequencyRequest request)
    {
        // 頻度分析の再計算
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportFrequencyAnalysis(
        [FromQuery] ProductPurchaseFrequencyRequest request)
    {
        // CSV/Excel エクスポート
    }
}
```

### 3.2 リクエスト/レスポンスDTO

```csharp
// メインリクエストDTO
public class ProductPurchaseFrequencyRequest
{
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }
    public string ProductFilter { get; set; } = "all";         // all|top10|category|custom
    public string CategoryId { get; set; }                     // カテゴリフィルター
    public List<string> ProductIds { get; set; }               // カスタム商品選択
    public int MaxFrequency { get; set; } = 12;                // 表示最大頻度
    public string DisplayMode { get; set; } = "count";         // count|percentage
    public string ViewType { get; set; } = "heatmap";          // heatmap|chart|table
    public bool IncludeConversion { get; set; } = true;        // コンバージョン分析を含む
    public bool IncludeTrend { get; set; } = false;            // トレンド分析を含む
}

// メインレスポンスDTO
public class ProductPurchaseFrequencyResponse
{
    public List<ProductFrequencyData> Products { get; set; }
    public FrequencyAnalysisSummary Summary { get; set; }
    public List<ConversionData> Conversions { get; set; }
    public List<CategoryComparisonData> CategoryComparison { get; set; }
    public FrequencyAnalysisMetadata Metadata { get; set; }
}

// 商品頻度データ
public class ProductFrequencyData
{
    public string ProductId { get; set; }
    public string ProductName { get; set; }
    public string ProductHandle { get; set; }
    public string Category { get; set; }
    public int TotalCustomers { get; set; }
    public decimal RepeatCustomerRate { get; set; }            // リピート率（%）
    public decimal AveragePurchaseInterval { get; set; }       // 平均購入間隔
    public List<FrequencyDistribution> Frequencies { get; set; }
}

// 頻度分布データ
public class FrequencyDistribution
{
    public int Count { get; set; }                             // 購入回数
    public int Customers { get; set; }                         // 顧客数
    public decimal Percentage { get; set; }                    // 構成比（%）
    public decimal TotalAmount { get; set; }                   // 総売上
    public decimal AmountPercentage { get; set; }              // 売上構成比（%）
    public decimal AverageOrderValue { get; set; }             // 平均注文単価
}

// コンバージョンデータ
public class ConversionData
{
    public string ProductId { get; set; }
    public string ProductName { get; set; }
    public List<FrequencyConversionRate> ConversionRates { get; set; }
}

public class FrequencyConversionRate
{
    public int FromFrequency { get; set; }                     // 変換前（1, 2, 3...）
    public int ToFrequency { get; set; }                       // 変換後（2, 3, 4...）
    public int EligibleCustomers { get; set; }                // 対象顧客数
    public int ConvertedCustomers { get; set; }               // 変換顧客数
    public decimal ConversionRate { get; set; }               // 変換率（%）
    public decimal AverageConversionDays { get; set; }        // 平均変換日数
}

// カテゴリ比較データ
public class CategoryComparisonData
{
    public string Category { get; set; }
    public int ProductCount { get; set; }
    public int TotalCustomers { get; set; }
    public decimal AverageFrequency { get; set; }
    public decimal MedianFrequency { get; set; }
    public decimal RepeatRate { get; set; }
    public int HighFrequencyProducts { get; set; }             // 頻度3以上の商品数
}

// 分析サマリー
public class FrequencyAnalysisSummary
{
    public int TotalProducts { get; set; }
    public int TotalCustomers { get; set; }
    public decimal OverallRepeatRate { get; set; }
    public decimal AverageFrequency { get; set; }
    public int HighFrequencyProducts { get; set; }             // 頻度3以上
    public string TopCategory { get; set; }                   // 最高リピート率カテゴリ
    public decimal TopCategoryRepeatRate { get; set; }
    public List<string> Insights { get; set; }                // 分析インサイト
}

// 分析メタデータ
public class FrequencyAnalysisMetadata
{
    public DateTime AnalysisDate { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public int AnalysisPeriodMonths { get; set; }
    public string ProductFilter { get; set; }
    public int MaxFrequency { get; set; }
    public string DataQuality { get; set; }                   // Good|Warning|Poor
    public List<string> Warnings { get; set; }
}
```

### 3.3 サービス層インターフェース

```csharp
public interface IProductPurchaseFrequencyService
{
    Task<ProductPurchaseFrequencyResponse> GetProductPurchaseFrequencyAsync(
        string shopDomain,
        ProductPurchaseFrequencyRequest request);

    Task<List<CategoryComparisonData>> GetCategoryComparisonAsync(
        string shopDomain,
        CategoryComparisonRequest request);

    Task<List<ConversionData>> GetConversionAnalysisAsync(
        string shopDomain,
        ConversionAnalysisRequest request);

    Task<List<ProductFrequencyTrendData>> GetTrendAnalysisAsync(
        string shopDomain,
        TrendAnalysisRequest request);

    Task<Guid> StartFrequencyCalculationAsync(
        string shopDomain,
        CalculateFrequencyRequest request);

    Task<byte[]> ExportFrequencyAnalysisAsync(
        string shopDomain,
        ProductPurchaseFrequencyRequest request,
        ExportFormat format);
}
```

## 4. ビジネスロジック実装

### 4.1 頻度分析サービス

```csharp
public class ProductPurchaseFrequencyService : IProductPurchaseFrequencyService
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<ProductPurchaseFrequencyService> _logger;
    private readonly IMemoryCache _cache;

    public async Task<ProductPurchaseFrequencyResponse> GetProductPurchaseFrequencyAsync(
        string shopDomain,
        ProductPurchaseFrequencyRequest request)
    {
        // 1. キャッシュチェック
        var cacheKey = GenerateCacheKey(shopDomain, request);
        if (_cache.TryGetValue(cacheKey, out ProductPurchaseFrequencyResponse cachedResult))
        {
            return cachedResult;
        }

        // 2. 分析期間の決定
        var periodStart = new DateTime(request.StartYear, request.StartMonth, 1);
        var periodEnd = new DateTime(request.EndYear, request.EndMonth, 1).AddMonths(1).AddDays(-1);

        // 3. 対象商品の取得
        var targetProducts = await GetTargetProductsAsync(shopDomain, request);

        // 4. 商品別頻度データの取得
        var frequencyData = await GetProductFrequencyDataAsync(
            shopDomain, targetProducts, periodStart, periodEnd, request.MaxFrequency);

        // 5. コンバージョンデータの取得
        List<ConversionData> conversions = null;
        if (request.IncludeConversion)
        {
            conversions = await GetConversionDataAsync(
                shopDomain, targetProducts, periodStart, periodEnd);
        }

        // 6. カテゴリ比較データの取得
        var categoryComparison = await GetCategoryComparisonAsync(
            shopDomain, periodStart, periodEnd);

        // 7. サマリーデータの計算
        var summary = CalculateFrequencyAnalysisSummary(frequencyData, categoryComparison);

        // 8. 結果の構築
        var response = new ProductPurchaseFrequencyResponse
        {
            Products = frequencyData,
            Summary = summary,
            Conversions = conversions,
            CategoryComparison = categoryComparison,
            Metadata = BuildAnalysisMetadata(request, periodStart, periodEnd)
        };

        // 9. キャッシュに保存
        _cache.Set(cacheKey, response, TimeSpan.FromHours(2));

        return response;
    }

    private async Task<List<ProductFrequencyData>> GetProductFrequencyDataAsync(
        string shopDomain,
        List<string> productIds,
        DateTime periodStart,
        DateTime periodEnd,
        int maxFrequency)
    {
        var query = @"
            WITH CustomerPurchaseCounts AS (
                SELECT 
                    oi.ProductId,
                    o.CustomerId,
                    COUNT(DISTINCT o.Id) as PurchaseCount,
                    SUM(oi.Price * oi.Quantity) as TotalAmount
                FROM Orders o
                INNER JOIN OrderItems oi ON o.Id = oi.OrderId
                WHERE o.ShopDomain = @ShopDomain
                  AND o.CreatedAt BETWEEN @PeriodStart AND @PeriodEnd
                  AND oi.ProductId IN ({0})
                GROUP BY oi.ProductId, o.CustomerId
            ),
            ProductFrequencyDistribution AS (
                SELECT 
                    cpc.ProductId,
                    cpc.PurchaseCount,
                    COUNT(cpc.CustomerId) as CustomerCount,
                    SUM(cpc.TotalAmount) as TotalAmount
                FROM CustomerPurchaseCounts cpc
                WHERE cpc.PurchaseCount <= @MaxFrequency
                GROUP BY cpc.ProductId, cpc.PurchaseCount
            )
            SELECT 
                p.Id as ProductId,
                p.Title as ProductName,
                p.Handle as ProductHandle,
                p.ProductType as Category,
                pfd.PurchaseCount,
                pfd.CustomerCount,
                pfd.TotalAmount,
                total_customers.TotalCustomers
            FROM Products p
            INNER JOIN ProductFrequencyDistribution pfd ON p.Id = pfd.ProductId
            CROSS APPLY (
                SELECT COUNT(DISTINCT cpc.CustomerId) as TotalCustomers
                FROM CustomerPurchaseCounts cpc 
                WHERE cpc.ProductId = p.Id
            ) total_customers
            WHERE p.ShopDomain = @ShopDomain
            ORDER BY p.Title, pfd.PurchaseCount";

        var productIdParams = string.Join(",", productIds.Select((_, i) => $"@ProductId{i}"));
        var formattedQuery = string.Format(query, productIdParams);

        var parameters = new List<SqlParameter>
        {
            new SqlParameter("@ShopDomain", shopDomain),
            new SqlParameter("@PeriodStart", periodStart),
            new SqlParameter("@PeriodEnd", periodEnd),
            new SqlParameter("@MaxFrequency", maxFrequency)
        };

        // 商品IDパラメータを追加
        for (int i = 0; i < productIds.Count; i++)
        {
            parameters.Add(new SqlParameter($"@ProductId{i}", productIds[i]));
        }

        var results = await _context.Database
            .SqlQueryRaw<ProductFrequencyRawData>(formattedQuery, parameters.ToArray())
            .ToListAsync();

        // 結果をグループ化してProductFrequencyDataに変換
        return results
            .GroupBy(r => new { r.ProductId, r.ProductName, r.ProductHandle, r.Category, r.TotalCustomers })
            .Select(g => new ProductFrequencyData
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductName,
                ProductHandle = g.Key.ProductHandle,
                Category = g.Key.Category,
                TotalCustomers = g.Key.TotalCustomers,
                RepeatCustomerRate = CalculateRepeatRate(g.ToList()),
                AveragePurchaseInterval = CalculateAveragePurchaseInterval(g.Key.ProductId, periodStart, periodEnd),
                Frequencies = g.Select(r => new FrequencyDistribution
                {
                    Count = r.PurchaseCount,
                    Customers = r.CustomerCount,
                    Percentage = Math.Round((decimal)r.CustomerCount / g.Key.TotalCustomers * 100, 1),
                    TotalAmount = r.TotalAmount,
                    AmountPercentage = CalculateAmountPercentage(r.TotalAmount, g.Sum(x => x.TotalAmount)),
                    AverageOrderValue = Math.Round(r.TotalAmount / r.CustomerCount, 2)
                }).OrderBy(f => f.Count).ToList()
            })
            .ToList();
    }

    private decimal CalculateRepeatRate(List<ProductFrequencyRawData> frequencyData)
    {
        var totalCustomers = frequencyData.First().TotalCustomers;
        var repeatCustomers = frequencyData.Where(f => f.PurchaseCount > 1).Sum(f => f.CustomerCount);
        
        return totalCustomers > 0 ? Math.Round((decimal)repeatCustomers / totalCustomers * 100, 1) : 0;
    }

    private async Task<List<ConversionData>> GetConversionDataAsync(
        string shopDomain,
        List<string> productIds,
        DateTime periodStart,
        DateTime periodEnd)
    {
        var conversions = new List<ConversionData>();

        foreach (var productId in productIds)
        {
            var conversionRates = await CalculateConversionRatesAsync(
                shopDomain, productId, periodStart, periodEnd);

            if (conversionRates.Any())
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.ShopDomain == shopDomain && p.Id == productId);

                conversions.Add(new ConversionData
                {
                    ProductId = productId,
                    ProductName = product?.Title ?? "Unknown",
                    ConversionRates = conversionRates
                });
            }
        }

        return conversions;
    }

    private async Task<List<FrequencyConversionRate>> CalculateConversionRatesAsync(
        string shopDomain,
        string productId,
        DateTime periodStart,
        DateTime periodEnd)
    {
        // コンバージョン率計算のロジック
        // 1回購入→2回購入、2回購入→3回購入、等の変換率を計算
        var conversionRates = new List<FrequencyConversionRate>();

        for (int fromFreq = 1; fromFreq <= 5; fromFreq++)
        {
            var toFreq = fromFreq + 1;

            var conversionData = await CalculateSpecificConversionAsync(
                shopDomain, productId, fromFreq, toFreq, periodStart, periodEnd);

            if (conversionData.EligibleCustomers > 0)
            {
                conversionRates.Add(conversionData);
            }
        }

        return conversionRates;
    }
}
```

### 4.2 頻度計算バッチサービス

```csharp
public class FrequencyCalculationBatchService
{
    public async Task CalculateMonthlyFrequencyDataAsync(
        string shopDomain,
        DateTime targetMonth)
    {
        // 1. 分析期間の決定（過去12ヶ月）
        var analysisStart = targetMonth.AddMonths(-12);
        var analysisEnd = targetMonth.AddDays(-1);

        // 2. 対象商品の取得
        var products = await GetActiveProductsAsync(shopDomain);

        // 3. 商品別頻度分析の実行
        await Parallel.ForEachAsync(products, 
            new ParallelOptions { MaxDegreeOfParallelism = 4 },
            async (product, cancellationToken) =>
            {
                await CalculateProductFrequencyAsync(
                    shopDomain, product.Id, analysisStart, analysisEnd, targetMonth);
            });

        // 4. カテゴリ別集計の実行
        await CalculateCategoryFrequencyAsync(shopDomain, targetMonth);

        // 5. コンバージョン率の計算
        await CalculateConversionRatesAsync(shopDomain, targetMonth);
    }
}
```

## 5. Shopify連携

### 5.1 データ同期戦略

```csharp
public class ShopifyFrequencyDataSync
{
    public async Task SyncProductFrequencyDataAsync(
        string shopDomain,
        DateTime startDate,
        DateTime endDate)
    {
        // 1. 商品データの同期
        await SyncProductCatalogAsync(shopDomain);

        // 2. 注文データの同期
        await SyncOrderDataAsync(shopDomain, startDate, endDate);

        // 3. 頻度分析の事前計算
        await PreCalculateFrequencyDataAsync(shopDomain, startDate, endDate);
    }
}
```

## 6. パフォーマンス考慮事項

### 6.1 キャッシュ戦略
- 商品別頻度データのキャッシュ（4時間）
- カテゴリ比較データのキャッシュ（2時間）
- コンバージョンデータのキャッシュ（6時間）

### 6.2 クエリ最適化
- 商品・期間・頻度による複合インデックス
- 集計クエリの事前計算
- パーティション分割の検討

### 6.3 スケーラビリティ
- 大量商品データの並列処理
- 結果のページング対応
- メモリ効率を考慮したストリーミング処理

## 7. エラーハンドリング

```csharp
public enum FrequencyAnalysisError
{
    InsufficientProductData,     // 商品データ不足
    InvalidFrequencyRange,       // 無効な頻度範囲
    CalculationTimeout,          // 計算タイムアウト
    CategoryNotFound            // カテゴリが見つからない
}
```

## 8. セキュリティ考慮事項

- ショップドメインによるデータ分離
- 商品データのアクセス制御
- 集計データの匿名化

## 9. 今後の拡張予定

### Phase 3での機能追加
- 季節性を考慮した頻度分析
- 商品ライフサイクル予測
- パーソナライズされた頻度分析
- 競合商品との比較分析

## ⚠️ 10. 設計上の注意事項・制約

### 10.1 設計過剰の警告 ⚠️ **設計見直し推奨**

#### **データベース設計の問題**
- **テーブル過多**: 5つの専用テーブルは過剰設計
- **既存テーブルとの重複**: OrderItemテーブルで十分対応可能
- **正規化の問題**: 商品・顧客データの重複保存

```sql
-- 問題: 不要に複雑なテーブル構造
-- ProductPurchaseFrequencyAnalysis
-- ProductPurchaseFrequencyDetails
-- PurchaseFrequencyConversion
-- CategoryPurchaseFrequencyAnalysis
-- ProductFrequencyTrend
-- → 既存のOrder/OrderItemで計算可能
```

#### **推奨される簡素化アプローチ**
```csharp
// 推奨: 既存テーブル活用による動的計算
public class SimplifiedProductFrequencyService
{
    // OrderItemテーブルから直接計算
    public async Task<ProductFrequencyData> CalculateFrequencyAsync(string productId, DateRange period)
    {
        // 既存データからの集計計算
    }
}
```

### 10.2 他機能との重複 🔄 **統合検討必要**

#### **類似機能との重複**
- **PURCH-02-COUNT**: 購入回数分析と90%の機能重複
- **PROD-03-BASKET**: 商品組み合わせ分析の基礎データ共通
- **PURCH-03-FTIER**: 顧客頻度分析との境界曖昧

#### **統合可能性の検討**
```typescript
interface FunctionMergeOpportunity {
  merge_with_PURCH_02_COUNT: {
    overlap: '90%';
    suggestion: '購入回数分析に商品別ビューを追加';
    benefit: 'テーブル削減、実装工数半減';
  };
}
```

### 10.3 API設計の不整合

#### **命名規則の問題**
- **エンドポイント**: `/api/analysis/product-purchase-frequency` が他画面と不統一
- **レスポンス構造**: 独自形式でなく共通DTOパターン使用推奨

#### **推奨される修正**
```csharp
// 修正前: 独自コントローラー
[Route("api/analysis/product-purchase-frequency")]

// 修正後: 統一された構造
[Route("api/analytics/product-frequency")]  // 命名統一
public class ProductAnalyticsController      // コントローラー統合
```

### 10.4 実装優先度の調整

#### **元の計画**: Phase 2（機能拡張対象）
#### **修正推奨**: Phase 3 または PURCH-02-COUNT との統合

**理由**: 
1. 機能重複が多く独立実装の価値が低い
2. データ構造が過剰で保守性に問題
3. 他機能の基盤確立後の統合実装が効率的

### 10.5 フロントエンドとの整合性確認

#### **UI要件との齟齬**
- **ヒートマップ表示**: 大量データでの表示性能問題
- **商品選択UI**: カスタム商品選択の複雑性
- **エクスポート機能**: 大量データでのメモリ制約

#### **推奨される対応**
1. **表示商品数制限**: 上位100商品のみ表示
2. **ページング実装**: 大量データ対応
3. **非同期エクスポート**: バックグラウンド処理

### 10.6 パフォーマンス制約の明確化

#### **計算量の問題**
- **全商品×全期間**: 1000商品×24ヶ月で24,000回の計算
- **顧客別集計**: 10,000顧客での個別処理
- **コンバージョン率計算**: 複雑な時系列分析

#### **実装時の注意点**
```csharp
// 警告: 性能問題が発生しやすい処理
// 1商品あたり平均1000顧客×12頻度 = 12,000レコード処理
// メモリ使用量とクエリ時間の最適化必須
```

**結論**: この機能は設計を大幅に簡素化し、他機能との統合を検討することを強く推奨