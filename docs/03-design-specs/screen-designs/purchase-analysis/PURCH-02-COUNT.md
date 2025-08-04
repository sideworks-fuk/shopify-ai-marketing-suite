# PURCH-02-COUNT - 購入回数分析【購買】詳細設計書

## ドキュメント情報
- **画面ID**: PURCH-02-COUNT
- **画面名**: 購入回数分析【購買】(Purchase Count Analysis)
- **作成日**: 2025-07-24
- **バージョン**: 1.0
- **ステータス**: Phase 3（将来拡張対象）

## 1. ビジネス概要

### 1.1 機能概要
顧客の購入回数を詳細に分析し、1回、2回、3回...20回以上の購入回数別に顧客分布と売上貢献を可視化する機能。リピート購入の促進と顧客ロイヤルティ向上のための戦略立案を支援する。

### 1.2 主要機能
- 購入回数別の詳細分析（1回～20回以上）
- 前年同期との比較分析
- 顧客セグメント別の分析（新規・既存）
- 成長率とトレンドの可視化
- 購入回数進化パターンの分析
- リピート率の詳細分析

### 1.3 ビジネス価値
- リピート購入促進施策の効果測定
- 顧客ロイヤルティプログラムの最適化
- 新規顧客のリピート化戦略の立案
- 購入回数別マーケティング施策の実施
- 顧客生涯価値（LTV）向上のためのインサイト獲得

### 1.4 分析指標
- **購入回数分布**: 1回～20回以上の詳細分布
- **顧客数変化**: 前年同期比較による成長率
- **売上貢献**: 回数別の売上金額と構成比
- **リピート率**: n回→(n+1)回への移行率
- **平均購入間隔**: 回数別の購入間隔分析

## 2. データベース設計

### 2.1 テーブル定義

```sql
-- 購入回数分析テーブル
CREATE TABLE PurchaseCountAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    PurchaseCount INT NOT NULL,                        -- 購入回数（1, 2, 3...20, 21+）
    PurchaseCountLabel NVARCHAR(50) NOT NULL,          -- "1回", "2回", "20回以上"
    
    -- 当期実績
    CurrentOrderCount INT NOT NULL DEFAULT 0,          -- 注文件数
    CurrentCustomerCount INT NOT NULL DEFAULT 0,       -- 顧客数
    CurrentTotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0, -- 総売上金額
    CurrentAverageOrderValue DECIMAL(18,2) DEFAULT 0,  -- 平均注文単価
    
    -- 前年同期実績
    PreviousOrderCount INT NOT NULL DEFAULT 0,
    PreviousCustomerCount INT NOT NULL DEFAULT 0,
    PreviousTotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    PreviousAverageOrderValue DECIMAL(18,2) DEFAULT 0,
    
    -- 成長率
    OrderCountGrowth DECIMAL(8,2) DEFAULT 0,           -- 注文件数成長率（%）
    CustomerCountGrowth DECIMAL(8,2) DEFAULT 0,        -- 顧客数成長率（%）
    AmountGrowth DECIMAL(8,2) DEFAULT 0,               -- 売上成長率（%）
    
    -- 構成比
    OrderCountPercentage DECIMAL(5,2) DEFAULT 0,       -- 注文件数構成比（%）
    CustomerCountPercentage DECIMAL(5,2) DEFAULT 0,    -- 顧客数構成比（%）
    AmountPercentage DECIMAL(5,2) DEFAULT 0,           -- 売上構成比（%）
    
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_PurchaseCount_Shop_Period (ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd),
    INDEX IX_PurchaseCount_Count (ShopDomain, PurchaseCount),
    INDEX IX_PurchaseCount_Growth (AmountGrowth DESC, CustomerCountGrowth DESC),
    UNIQUE(ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd, PurchaseCount)
);

-- 購入回数詳細データテーブル
CREATE TABLE PurchaseCountDetails (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    CustomerId NVARCHAR(100) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    PurchaseCount INT NOT NULL,
    CustomerSegment NVARCHAR(50) NOT NULL,             -- New|Existing|Returning
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    AverageOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0,
    FirstOrderDate DATETIME2,
    LastOrderDate DATETIME2,
    AverageDaysBetweenOrders DECIMAL(8,2),
    IsHighValueCustomer BIT NOT NULL DEFAULT 0,        -- 高価値顧客フラグ
    PreviousPeriodPurchaseCount INT DEFAULT 0,         -- 前期購入回数
    PurchaseCountChange INT DEFAULT 0,                 -- 購入回数変化
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_PurchaseCountDetail_Customer (ShopDomain, CustomerId, AnalysisPeriodStart),
    INDEX IX_PurchaseCountDetail_Count (ShopDomain, PurchaseCount, CustomerSegment),
    INDEX IX_PurchaseCountDetail_Segment (ShopDomain, CustomerSegment, AnalysisPeriodStart)
);

-- 購入回数セグメント分析テーブル
CREATE TABLE PurchaseCountSegmentAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    CustomerSegment NVARCHAR(50) NOT NULL,             -- New|Existing|Returning
    PurchaseCount INT NOT NULL,
    CustomerCount INT NOT NULL DEFAULT 0,
    OrderCount INT NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    AverageOrderValue DECIMAL(18,2) DEFAULT 0,
    SegmentPercentage DECIMAL(5,2) DEFAULT 0,          -- セグメント内構成比
    ConversionRate DECIMAL(5,2) DEFAULT 0,             -- 次回数への変換率
    RetentionRate DECIMAL(5,2) DEFAULT 0,              -- 維持率
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_PurchaseCountSeg_Shop_Period (ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd),
    INDEX IX_PurchaseCountSeg_Segment (ShopDomain, CustomerSegment, PurchaseCount),
    UNIQUE(ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd, CustomerSegment, PurchaseCount)
);

-- 購入回数トレンド分析テーブル
CREATE TABLE PurchaseCountTrendAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisMonth DATE NOT NULL,                       -- 分析月（月初日）
    PurchaseCount INT NOT NULL,
    CustomerCount INT NOT NULL DEFAULT 0,
    OrderCount INT NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- トレンド指標
    MonthOverMonthGrowth DECIMAL(8,2) DEFAULT 0,       -- 前月比成長率
    ThreeMonthMovingAverage DECIMAL(10,2) DEFAULT 0,   -- 3ヶ月移動平均
    TrendDirection NVARCHAR(20),                       -- Up|Down|Stable
    TrendStrength DECIMAL(5,2),                        -- トレンド強度（0-100）
    Seasonality DECIMAL(5,2),                          -- 季節性指数
    
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_PurchaseCountTrend_Shop_Month (ShopDomain, AnalysisMonth),
    INDEX IX_PurchaseCountTrend_Count (ShopDomain, PurchaseCount, AnalysisMonth),
    UNIQUE(ShopDomain, AnalysisMonth, PurchaseCount)
);

-- 購入回数KPIサマリーテーブル
CREATE TABLE PurchaseCountKPISummary (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisPeriodStart DATE NOT NULL,
    AnalysisPeriodEnd DATE NOT NULL,
    
    -- 全体指標
    TotalCustomers INT NOT NULL DEFAULT 0,
    TotalOrders INT NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    AveragePurchaseCount DECIMAL(5,2) DEFAULT 0,       -- 平均購入回数
    MedianPurchaseCount INT DEFAULT 0,                 -- 中央値購入回数
    
    -- リピート指標
    OneTimeCustomers INT NOT NULL DEFAULT 0,           -- 1回限り顧客
    RepeatCustomers INT NOT NULL DEFAULT 0,            -- リピート顧客（2回以上）
    LoyalCustomers INT NOT NULL DEFAULT 0,             -- ロイヤル顧客（5回以上）
    ChampionCustomers INT NOT NULL DEFAULT 0,          -- チャンピオン顧客（10回以上）
    
    -- 比率
    RepeatRate DECIMAL(5,2) DEFAULT 0,                 -- リピート率（%）
    LoyaltyRate DECIMAL(5,2) DEFAULT 0,                -- ロイヤル率（%）
    ChampionRate DECIMAL(5,2) DEFAULT 0,               -- チャンピオン率（%）
    
    -- 成長指標
    CustomerGrowthRate DECIMAL(8,2) DEFAULT 0,         -- 顧客数成長率
    OrderGrowthRate DECIMAL(8,2) DEFAULT 0,            -- 注文数成長率
    AmountGrowthRate DECIMAL(8,2) DEFAULT 0,           -- 売上成長率
    RepeatRateChange DECIMAL(8,2) DEFAULT 0,           -- リピート率変化
    
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_PurchaseCountKPI_Shop_Period (ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd),
    UNIQUE(ShopDomain, AnalysisPeriodStart, AnalysisPeriodEnd)
);
```

### 2.2 インデックス戦略
- 期間・購入回数による複合インデックス
- セグメント別分析のための最適化
- トレンド分析の時系列インデックス
- 成長率による降順ソートの最適化

## 3. API設計

### 3.1 コントローラー定義

```csharp
[ApiController]
[Route("api/analysis/purchase-frequency-detail")]
public class PurchaseFrequencyDetailController : ControllerBase
{
    private readonly IPurchaseFrequencyDetailService _frequencyDetailService;
    private readonly ILogger<PurchaseFrequencyDetailController> _logger;

    [HttpGet]
    public async Task<IActionResult> GetPurchaseFrequencyDetail(
        [FromQuery] PurchaseFrequencyDetailRequest request)
    {
        // 購入回数詳細分析の取得
    }

    [HttpGet("segment-comparison")]
    public async Task<IActionResult> GetSegmentComparison(
        [FromQuery] SegmentComparisonRequest request)
    {
        // セグメント別比較分析
    }

    [HttpGet("trend-analysis")]
    public async Task<IActionResult> GetTrendAnalysis(
        [FromQuery] TrendAnalysisRequest request)
    {
        // トレンド分析の取得
    }

    [HttpGet("kpi-summary")]
    public async Task<IActionResult> GetKPISummary(
        [FromQuery] KPISummaryRequest request)
    {
        // KPIサマリーの取得
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateFrequencyDetail(
        [FromBody] CalculateFrequencyDetailRequest request)
    {
        // 購入回数分析の再計算
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportFrequencyDetail(
        [FromQuery] PurchaseFrequencyDetailRequest request)
    {
        // CSV/Excel エクスポート
    }
}
```

### 3.2 リクエスト/レスポンスDTO

```csharp
// メインリクエストDTO
public class PurchaseFrequencyDetailRequest
{
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }
    public string CustomerSegment { get; set; } = "all";           // all|new|existing|returning
    public string DisplayMode { get; set; } = "detail";           // detail|summary|chart
    public int MaxPurchaseCount { get; set; } = 20;               // 表示最大回数
    public bool IncludeComparison { get; set; } = true;           // 前年比較を含む
    public bool IncludeTrend { get; set; } = false;               // トレンド分析を含む
    public bool IncludeSegmentAnalysis { get; set; } = true;      // セグメント分析を含む
}

// メインレスポンスDTO
public class PurchaseFrequencyDetailResponse
{
    public List<PurchaseFrequencyDetailData> FrequencyDetails { get; set; }
    public PurchaseCountKPISummary KPISummary { get; set; }
    public List<SegmentAnalysisData> SegmentAnalysis { get; set; }
    public List<TrendAnalysisData> TrendAnalysis { get; set; }
    public FrequencyAnalysisMetadata Metadata { get; set; }
}

// 購入回数詳細データ
public class PurchaseFrequencyDetailData
{
    public int PurchaseCount { get; set; }                        // 購入回数
    public string Label { get; set; }                             // "1回", "2回", "20回以上"
    
    // 当期実績
    public PurchaseCountMetrics Current { get; set; }
    
    // 前年同期実績
    public PurchaseCountMetrics Previous { get; set; }
    
    // 成長率
    public GrowthRateMetrics Growth { get; set; }
    
    // 構成比
    public PercentageMetrics Percentage { get; set; }
    
    // 詳細分析
    public DetailedAnalysisMetrics Analysis { get; set; }
}

// 購入回数メトリクス
public class PurchaseCountMetrics
{
    public int CustomerCount { get; set; }                        // 顧客数
    public int OrderCount { get; set; }                           // 注文数
    public decimal TotalAmount { get; set; }                      // 総売上
    public decimal AverageOrderValue { get; set; }                // 平均注文単価
    public decimal AverageCustomerValue { get; set; }             // 平均顧客単価
}

// 成長率メトリクス
public class GrowthRateMetrics
{
    public decimal CustomerCountGrowth { get; set; }              // 顧客数成長率（%）
    public decimal OrderCountGrowth { get; set; }                 // 注文数成長率（%）
    public decimal AmountGrowth { get; set; }                     // 売上成長率（%）
    public string GrowthTrend { get; set; }                       // "大幅増加"|"増加"|"横ばい"|"減少"
}

// 構成比メトリクス
public class PercentageMetrics
{
    public decimal CustomerPercentage { get; set; }               // 顧客数構成比（%）
    public decimal OrderPercentage { get; set; }                  // 注文数構成比（%）
    public decimal AmountPercentage { get; set; }                 // 売上構成比（%）
}

// 詳細分析メトリクス
public class DetailedAnalysisMetrics
{
    public decimal ConversionRate { get; set; }                   // 次回数への変換率（%）
    public decimal RetentionRate { get; set; }                    // 維持率（%）
    public decimal AverageDaysBetweenOrders { get; set; }         // 平均注文間隔
    public int HighValueCustomers { get; set; }                   // 高価値顧客数
    public string RiskLevel { get; set; }                         // リスクレベル
}

// セグメント分析データ
public class SegmentAnalysisData
{
    public string Segment { get; set; }                           // New|Existing|Returning
    public string SegmentName { get; set; }                       // "新規顧客"|"既存顧客"
    public List<PurchaseFrequencyDetailData> FrequencyDistribution { get; set; }
    public SegmentSummaryMetrics Summary { get; set; }
}

// セグメントサマリー
public class SegmentSummaryMetrics  
{
    public int TotalCustomers { get; set; }
    public decimal AveragePurchaseCount { get; set; }
    public decimal RepeatRate { get; set; }
    public decimal AverageLTV { get; set; }
    public string DominantFrequency { get; set; }                 // 最多購入回数
}

// トレンド分析データ
public class TrendAnalysisData
{
    public int PurchaseCount { get; set; }
    public List<MonthlyTrendPoint> MonthlyTrend { get; set; }
    public TrendSummary Summary { get; set; }
}

// 月次トレンドポイント
public class MonthlyTrendPoint
{
    public string Month { get; set; }                             // YYYY-MM
    public int CustomerCount { get; set; }
    public int OrderCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal MonthOverMonthGrowth { get; set; }
    public decimal ThreeMonthMovingAverage { get; set; }
}

// トレンドサマリー
public class TrendSummary
{
    public string TrendDirection { get; set; }                    // Up|Down|Stable
    public decimal TrendStrength { get; set; }                    // 0-100
    public decimal Seasonality { get; set; }                      // 季節性指数
    public string TrendDescription { get; set; }                  // トレンド説明
}

// KPIサマリー
public class PurchaseCountKPISummary
{
    public int TotalCustomers { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AveragePurchaseCount { get; set; }
    public int MedianPurchaseCount { get; set; }
    
    // リピート指標
    public int OneTimeCustomers { get; set; }
    public int RepeatCustomers { get; set; }
    public int LoyalCustomers { get; set; }
    public int ChampionCustomers { get; set; }
    
    // 比率
    public decimal RepeatRate { get; set; }
    public decimal LoyaltyRate { get; set; }
    public decimal ChampionRate { get; set; }
    
    // 成長指標
    public decimal CustomerGrowthRate { get; set; }
    public decimal OrderGrowthRate { get; set; }
    public decimal AmountGrowthRate { get; set; }
    public decimal RepeatRateChange { get; set; }
    
    // インサイト
    public List<string> KeyInsights { get; set; }
    public List<string> Recommendations { get; set; }
}

// 分析メタデータ
public class FrequencyAnalysisMetadata
{
    public DateTime AnalysisDate { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public DateTime ComparisonPeriodStart { get; set; }
    public DateTime ComparisonPeriodEnd { get; set; }
    public string CustomerSegment { get; set; }
    public int MaxPurchaseCount { get; set; }
    public string DataQuality { get; set; }                      // Good|Warning|Poor
    public List<string> Warnings { get; set; }
    public string AnalysisScope { get; set; }                    // "全期間"|"特定セグメント"
}
```

### 3.3 サービス層インターフェース

```csharp
public interface IPurchaseFrequencyDetailService
{
    Task<PurchaseFrequencyDetailResponse> GetPurchaseFrequencyDetailAsync(
        string shopDomain,
        PurchaseFrequencyDetailRequest request);

    Task<List<SegmentAnalysisData>> GetSegmentComparisonAsync(
        string shopDomain,
        SegmentComparisonRequest request);

    Task<List<TrendAnalysisData>> GetTrendAnalysisAsync(
        string shopDomain,
        TrendAnalysisRequest request);

    Task<PurchaseCountKPISummary> GetKPISummaryAsync(
        string shopDomain,
        KPISummaryRequest request);

    Task<Guid> StartFrequencyDetailCalculationAsync(
        string shopDomain,
        CalculateFrequencyDetailRequest request);

    Task<byte[]> ExportFrequencyDetailAsync(
        string shopDomain,
        PurchaseFrequencyDetailRequest request,
        ExportFormat format);
}
```

## 4. ビジネスロジック実装

### 4.1 購入回数詳細分析サービス

```csharp
public class PurchaseFrequencyDetailService : IPurchaseFrequencyDetailService
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<PurchaseFrequencyDetailService> _logger;
    private readonly IMemoryCache _cache;
    private readonly ITrendAnalysisService _trendService;

    public async Task<PurchaseFrequencyDetailResponse> GetPurchaseFrequencyDetailAsync(
        string shopDomain,
        PurchaseFrequencyDetailRequest request)
    {
        // 1. キャッシュチェック
        var cacheKey = GenerateCacheKey(shopDomain, request);
        if (_cache.TryGetValue(cacheKey, out PurchaseFrequencyDetailResponse cachedResult))
        {
            return cachedResult;
        }

        // 2. 分析期間の決定
        var currentPeriod = new DateRange(
            new DateTime(request.StartYear, request.StartMonth, 1),
            new DateTime(request.EndYear, request.EndMonth, 1).AddMonths(1).AddDays(-1)
        );

        var comparisonPeriod = new DateRange(
            currentPeriod.Start.AddYears(-1),
            currentPeriod.End.AddYears(-1)
        );

        // 3. 購入回数詳細データの取得
        var frequencyDetails = await GetPurchaseFrequencyDetailsAsync(
            shopDomain, currentPeriod, comparisonPeriod, request);

        // 4. KPIサマリーの計算
        var kpiSummary = await CalculateKPISummaryAsync(
            shopDomain, currentPeriod, comparisonPeriod, frequencyDetails);

        // 5. セグメント分析の取得
        List<SegmentAnalysisData> segmentAnalysis = null;
        if (request.IncludeSegmentAnalysis)
        {
            segmentAnalysis = await GetSegmentAnalysisAsync(
                shopDomain, currentPeriod, request.MaxPurchaseCount);
        }

        // 6. トレンド分析の取得
        List<TrendAnalysisData> trendAnalysis = null;
        if (request.IncludeTrend)
        {
            trendAnalysis = await _trendService.GetPurchaseCountTrendAsync(
                shopDomain, currentPeriod.End.AddMonths(-12), currentPeriod.End);
        }

        // 7. 結果の構築
        var response = new PurchaseFrequencyDetailResponse
        {
            FrequencyDetails = frequencyDetails,
            KPISummary = kpiSummary,
            SegmentAnalysis = segmentAnalysis,
            TrendAnalysis = trendAnalysis,
            Metadata = BuildAnalysisMetadata(request, currentPeriod, comparisonPeriod)
        };

        // 8. キャッシュに保存
        _cache.Set(cacheKey, response, TimeSpan.FromHours(1));

        return response;
    }

    private async Task<List<PurchaseFrequencyDetailData>> GetPurchaseFrequencyDetailsAsync(
        string shopDomain,
        DateRange currentPeriod,
        DateRange comparisonPeriod,
        PurchaseFrequencyDetailRequest request)
    {
        var query = @"
            WITH CurrentPeriodData AS (
                SELECT 
                    PurchaseCount,
                    PurchaseCountLabel,
                    CurrentOrderCount,
                    CurrentCustomerCount,
                    CurrentTotalAmount,
                    CurrentAverageOrderValue,
                    OrderCountPercentage,
                    CustomerCountPercentage,
                    AmountPercentage
                FROM PurchaseCountAnalysis
                WHERE ShopDomain = @ShopDomain
                  AND AnalysisPeriodStart = @CurrentStart
                  AND AnalysisPeriodEnd = @CurrentEnd
                  AND PurchaseCount <= @MaxPurchaseCount
            ),
            ComparisonPeriodData AS (
                SELECT 
                    PurchaseCount,
                    PreviousOrderCount,
                    PreviousCustomerCount,
                    PreviousTotalAmount,
                    PreviousAverageOrderValue,
                    OrderCountGrowth,
                    CustomerCountGrowth,
                    AmountGrowth
                FROM PurchaseCountAnalysis
                WHERE ShopDomain = @ShopDomain
                  AND AnalysisPeriodStart = @ComparisonStart
                  AND AnalysisPeriodEnd = @ComparisonEnd
                  AND PurchaseCount <= @MaxPurchaseCount
            ),
            DetailedAnalysis AS (
                SELECT 
                    pcs.PurchaseCount,
                    AVG(pcs.ConversionRate) as AvgConversionRate,
                    AVG(pcs.RetentionRate) as AvgRetentionRate,
                    COUNT(CASE WHEN pcd.IsHighValueCustomer = 1 THEN 1 END) as HighValueCustomers,
                    AVG(pcd.AverageDaysBetweenOrders) as AvgDaysBetweenOrders
                FROM PurchaseCountSegmentAnalysis pcs
                LEFT JOIN PurchaseCountDetails pcd ON pcs.ShopDomain = pcd.ShopDomain 
                    AND pcs.PurchaseCount = pcd.PurchaseCount
                    AND pcs.AnalysisPeriodStart = pcd.AnalysisPeriodStart
                WHERE pcs.ShopDomain = @ShopDomain
                  AND pcs.AnalysisPeriodStart = @CurrentStart
                  AND pcs.AnalysisPeriodEnd = @CurrentEnd
                  AND pcs.PurchaseCount <= @MaxPurchaseCount
                GROUP BY pcs.PurchaseCount
            )
            SELECT 
                c.PurchaseCount,
                c.PurchaseCountLabel,
                c.CurrentOrderCount,
                c.CurrentCustomerCount,
                c.CurrentTotalAmount,
                c.CurrentAverageOrderValue,
                c.OrderCountPercentage,
                c.CustomerCountPercentage,
                c.AmountPercentage,
                ISNULL(p.PreviousOrderCount, 0) as PreviousOrderCount,
                ISNULL(p.PreviousCustomerCount, 0) as PreviousCustomerCount,
                ISNULL(p.PreviousTotalAmount, 0) as PreviousTotalAmount,
                ISNULL(p.PreviousAverageOrderValue, 0) as PreviousAverageOrderValue,
                ISNULL(p.OrderCountGrowth, 0) as OrderCountGrowth,
                ISNULL(p.CustomerCountGrowth, 0) as CustomerCountGrowth,
                ISNULL(p.AmountGrowth, 0) as AmountGrowth,
                ISNULL(d.AvgConversionRate, 0) as ConversionRate,
                ISNULL(d.AvgRetentionRate, 0) as RetentionRate,
                ISNULL(d.HighValueCustomers, 0) as HighValueCustomers,
                ISNULL(d.AvgDaysBetweenOrders, 0) as AvgDaysBetweenOrders
            FROM CurrentPeriodData c
            LEFT JOIN ComparisonPeriodData p ON c.PurchaseCount = p.PurchaseCount
            LEFT JOIN DetailedAnalysis d ON c.PurchaseCount = d.PurchaseCount
            ORDER BY c.PurchaseCount";

        var parameters = new SqlParameter[]
        {
            new SqlParameter("@ShopDomain", shopDomain),
            new SqlParameter("@CurrentStart", currentPeriod.Start),
            new SqlParameter("@CurrentEnd", currentPeriod.End),
            new SqlParameter("@ComparisonStart", comparisonPeriod.Start),
            new SqlParameter("@ComparisonEnd", comparisonPeriod.End),
            new SqlParameter("@MaxPurchaseCount", request.MaxPurchaseCount)
        };

        var results = await _context.Database
            .SqlQueryRaw<PurchaseFrequencyDetailRawData>(query, parameters)
            .ToListAsync();

        return results.Select(r => new PurchaseFrequencyDetailData
        {
            PurchaseCount = r.PurchaseCount,
            Label = r.PurchaseCountLabel,
            Current = new PurchaseCountMetrics
            {
                CustomerCount = r.CurrentCustomerCount,
                OrderCount = r.CurrentOrderCount,
                TotalAmount = r.CurrentTotalAmount,
                AverageOrderValue = r.CurrentAverageOrderValue,
                AverageCustomerValue = r.CurrentCustomerCount > 0 ? 
                    r.CurrentTotalAmount / r.CurrentCustomerCount : 0
            },
            Previous = new PurchaseCountMetrics
            {
                CustomerCount = r.PreviousCustomerCount,
                OrderCount = r.PreviousOrderCount,
                TotalAmount = r.PreviousTotalAmount,
                AverageOrderValue = r.PreviousAverageOrderValue,
                AverageCustomerValue = r.PreviousCustomerCount > 0 ? 
                    r.PreviousTotalAmount / r.PreviousCustomerCount : 0
            },
            Growth = new GrowthRateMetrics
            {
                CustomerCountGrowth = r.CustomerCountGrowth,
                OrderCountGrowth = r.OrderCountGrowth,
                AmountGrowth = r.AmountGrowth,
                GrowthTrend = DetermineGrowthTrend(r.AmountGrowth)
            },
            Percentage = new PercentageMetrics
            {
                CustomerPercentage = r.CustomerCountPercentage,
                OrderPercentage = r.OrderCountPercentage,
                AmountPercentage = r.AmountPercentage
            },
            Analysis = new DetailedAnalysisMetrics
            {
                ConversionRate = r.ConversionRate,
                RetentionRate = r.RetentionRate,
                AverageDaysBetweenOrders = r.AvgDaysBetweenOrders,
                HighValueCustomers = r.HighValueCustomers,
                RiskLevel = DetermineRiskLevel(r.ConversionRate, r.RetentionRate)
            }
        }).ToList();
    }

    private string DetermineGrowthTrend(decimal growthRate)
    {
        return growthRate switch
        {
            >= 20 => "大幅増加",
            >= 5 => "増加",
            >= -5 and < 5 => "横ばい",
            >= -20 => "減少",
            _ => "大幅減少"
        };
    }

    private string DetermineRiskLevel(decimal conversionRate, decimal retentionRate)
    {
        var averageRate = (conversionRate + retentionRate) / 2;
        
        return averageRate switch
        {
            >= 80 => "低リスク",
            >= 60 => "中リスク",
            >= 40 => "高リスク",
            _ => "要注意"
        };
    }

    private async Task<PurchaseCountKPISummary> CalculateKPISummaryAsync(
        string shopDomain,
        DateRange currentPeriod,
        DateRange comparisonPeriod,
        List<PurchaseFrequencyDetailData> frequencyDetails)
    {
        // KPIサマリーの詳細計算
        var totalCustomers = frequencyDetails.Sum(f => f.Current.CustomerCount);
        var totalOrders = frequencyDetails.Sum(f => f.Current.OrderCount);
        var totalAmount = frequencyDetails.Sum(f => f.Current.TotalAmount);

        var oneTimeCustomers = frequencyDetails
            .FirstOrDefault(f => f.PurchaseCount == 1)?.Current.CustomerCount ?? 0;
        var repeatCustomers = totalCustomers - oneTimeCustomers;
        var loyalCustomers = frequencyDetails
            .Where(f => f.PurchaseCount >= 5)
            .Sum(f => f.Current.CustomerCount);
        var championCustomers = frequencyDetails
            .Where(f => f.PurchaseCount >= 10)
            .Sum(f => f.Current.CustomerCount);

        // 前年同期との比較
        var previousTotalCustomers = frequencyDetails.Sum(f => f.Previous.CustomerCount);
        var previousTotalOrders = frequencyDetails.Sum(f => f.Previous.OrderCount);
        var previousTotalAmount = frequencyDetails.Sum(f => f.Previous.TotalAmount);
        var previousOneTimeCustomers = frequencyDetails
            .FirstOrDefault(f => f.PurchaseCount == 1)?.Previous.CustomerCount ?? 0;

        var customerGrowthRate = previousTotalCustomers > 0 ? 
            ((decimal)(totalCustomers - previousTotalCustomers) / previousTotalCustomers) * 100 : 0;
        var orderGrowthRate = previousTotalOrders > 0 ? 
            ((decimal)(totalOrders - previousTotalOrders) / previousTotalOrders) * 100 : 0;
        var amountGrowthRate = previousTotalAmount > 0 ? 
            ((totalAmount - previousTotalAmount) / previousTotalAmount) * 100 : 0;

        var repeatRate = totalCustomers > 0 ? ((decimal)repeatCustomers / totalCustomers) * 100 : 0;
        var previousRepeatRate = previousTotalCustomers > 0 ? 
            ((decimal)(previousTotalCustomers - previousOneTimeCustomers) / previousTotalCustomers) * 100 : 0;
        var repeatRateChange = repeatRate - previousRepeatRate;

        // インサイトと推奨事項の生成
        var insights = GenerateKeyInsights(frequencyDetails, totalCustomers, repeatRate);
        var recommendations = GenerateRecommendations(frequencyDetails, repeatRate, customerGrowthRate);

        return new PurchaseCountKPISummary
        {
            TotalCustomers = totalCustomers,
            TotalOrders = totalOrders,
            TotalAmount = Math.Round(totalAmount, 2),
            AveragePurchaseCount = CalculateAveragePurchaseCount(frequencyDetails),
            MedianPurchaseCount = CalculateMedianPurchaseCount(frequencyDetails),
            OneTimeCustomers = oneTimeCustomers,
            RepeatCustomers = repeatCustomers,
            LoyalCustomers = loyalCustomers,
            ChampionCustomers = championCustomers,
            RepeatRate = Math.Round(repeatRate, 1),
            LoyaltyRate = totalCustomers > 0 ? 
                Math.Round(((decimal)loyalCustomers / totalCustomers) * 100, 1) : 0,
            ChampionRate = totalCustomers > 0 ? 
                Math.Round(((decimal)championCustomers / totalCustomers) * 100, 1) : 0,
            CustomerGrowthRate = Math.Round(customerGrowthRate, 1),
            OrderGrowthRate = Math.Round(orderGrowthRate, 1),
            AmountGrowthRate = Math.Round(amountGrowthRate, 1),
            RepeatRateChange = Math.Round(repeatRateChange, 1),
            KeyInsights = insights,
            Recommendations = recommendations
        };
    }

    private List<string> GenerateKeyInsights(
        List<PurchaseFrequencyDetailData> frequencyDetails,
        int totalCustomers,
        decimal repeatRate)
    {
        var insights = new List<string>();

        // リピート率に関するインサイト
        if (repeatRate >= 60)
            insights.Add($"リピート率が{repeatRate:F1}%と非常に高く、顧客ロイヤルティが良好");
        else if (repeatRate >= 40)
            insights.Add($"リピート率が{repeatRate:F1}%で平均的、改善の余地あり");
        else
            insights.Add($"リピート率が{repeatRate:F1}%と低く、リピート施策の強化が必要");

        // 購入回数分布に関するインサイト
        var mostFrequentCount = frequencyDetails
            .OrderByDescending(f => f.Current.CustomerCount)
            .First();
        insights.Add($"最も多いのは{mostFrequentCount.Label}の顧客で{mostFrequentCount.Current.CustomerCount}人");

        // 成長トレンドに関するインサイト
        var growingSegments = frequencyDetails
            .Where(f => f.Growth.AmountGrowth > 10)
            .Count();
        if (growingSegments >= 3)
            insights.Add($"{growingSegments}つの購入回数セグメントで10%以上の成長を確認");

        return insights;
    }

    private List<string> GenerateRecommendations(
        List<PurchaseFrequencyDetailData> frequencyDetails,
        decimal repeatRate,
        decimal customerGrowthRate)
    {
        var recommendations = new List<string>();

        // リピート率改善の推奨
        if (repeatRate < 50)
        {
            recommendations.Add("1回限り顧客向けのリピート促進キャンペーンを実施");
            recommendations.Add("初回購入から2回目購入までの期間を短縮する施策を検討");
        }

        // 成長セグメントの拡大
        var highGrowthSegments = frequencyDetails
            .Where(f => f.Growth.CustomerCountGrowth > 20)
            .ToList();
        
        if (highGrowthSegments.Any())
        {
            recommendations.Add($"成長率の高い{string.Join("・", highGrowthSegments.Select(s => s.Label))}セグメントの拡大戦略を実施");
        }

        // 全体的な成長率に基づく推奨
        if (customerGrowthRate < 0)
        {
            recommendations.Add("顧客獲得キャンペーンの強化と既存顧客の維持施策を並行実施");
        }
        else if (customerGrowthRate > 20)
        {
            recommendations.Add("高い成長率を維持するため、顧客体験の質向上に注力");
        }

        return recommendations;
    }
}
```

### 4.2 購入回数計算バッチサービス

```csharp
public class PurchaseCountCalculationBatchService
{
    public async Task CalculateMonthlyPurchaseCountDataAsync(
        string shopDomain,
        DateTime targetMonth)
    {
        // 1. 分析期間の決定
        var analysisStart = new DateTime(targetMonth.Year, targetMonth.Month, 1);
        var analysisEnd = analysisStart.AddMonths(1).AddDays(-1);
        
        // 前年同期
        var comparisonStart = analysisStart.AddYears(-1);
        var comparisonEnd = analysisEnd.AddYears(-1);

        // 2. 顧客の購入回数を計算
        var customerPurchaseCounts = await CalculateCustomerPurchaseCountsAsync(
            shopDomain, analysisStart, analysisEnd);

        var comparisonPurchaseCounts = await CalculateCustomerPurchaseCountsAsync(
            shopDomain, comparisonStart, comparisonEnd);

        // 3. 購入回数別の集計
        var frequencyData = AggregatePurchaseCountData(
            customerPurchaseCounts, comparisonPurchaseCounts);

        // 4. データベースに保存
        await SavePurchaseCountAnalysisAsync(shopDomain, analysisStart, analysisEnd, frequencyData);

        // 5. セグメント分析の実行
        await CalculateSegmentAnalysisAsync(shopDomain, analysisStart, analysisEnd);

        // 6. KPIサマリーの計算
        await CalculateKPISummaryAsync(shopDomain, analysisStart, analysisEnd);
    }

    private async Task<Dictionary<string, int>> CalculateCustomerPurchaseCountsAsync(
        string shopDomain,
        DateTime startDate,
        DateTime endDate)
    {
        var query = @"
            SELECT 
                o.CustomerId,
                COUNT(DISTINCT o.Id) as PurchaseCount
            FROM Orders o
            WHERE o.ShopDomain = @ShopDomain
              AND o.CreatedAt BETWEEN @StartDate AND @EndDate
              AND o.FinancialStatus = 'paid'
            GROUP BY o.CustomerId";

        var results = await _context.Database
            .SqlQueryRaw<CustomerPurchaseCountRaw>(query,
                new SqlParameter("@ShopDomain", shopDomain),
                new SqlParameter("@StartDate", startDate),
                new SqlParameter("@EndDate", endDate))
            .ToListAsync();

        return results.ToDictionary(r => r.CustomerId, r => r.PurchaseCount);
    }
}
```

## 5. Shopify連携

### 5.1 注文データの同期

```csharp
public class ShopifyPurchaseCountSync
{
    public async Task SyncPurchaseCountDataAsync(
        string shopDomain,
        DateTime startDate,
        DateTime endDate)
    {
        // 1. 注文データの取得と同期
        await SyncOrderDataAsync(shopDomain, startDate, endDate);

        // 2. 顧客データの取得
        await SyncCustomerDataAsync(shopDomain);

        // 3. 購入回数分析の事前計算
        await PreCalculatePurchaseCountAnalysisAsync(shopDomain, startDate, endDate);
    }
}
```

## 6. パフォーマンス考慮事項

### 6.1 キャッシュ戦略
- 購入回数分析結果のキャッシュ（1時間）
- セグメント分析のキャッシュ（2時間）
- KPIサマリーのキャッシュ（30分）

### 6.2 クエリ最適化
- 購入回数・期間による複合インデックス
- 集計クエリの事前計算
- 大量データのバッチ処理最適化

### 6.3 スケーラビリティ
- 並列処理による計算高速化
- 結果データの適切なパーティション分割
- メモリ効率を考慮したデータ処理

## 7. エラーハンドリング

```csharp
public enum PurchaseCountAnalysisError
{
    InsufficientOrderData,       // 注文データ不足
    InvalidPeriodRange,          // 無効な期間指定
    CalculationTimeout,          // 計算タイムアウト
    ComparisonDataMissing       // 比較データ不足
}
```

## 8. セキュリティ考慮事項

- ショップドメインによるデータ分離
- 集計データの適切な匿名化
- APIアクセス権限の制御

## 9. 今後の拡張予定

### Phase 4での機能追加
- AIによる購入回数予測
- パーソナライズされた購入回数分析
- リアルタイム購入回数監視
- 自動アラートとレコメンデーション機能
- マーケティングオートメーションとの連携

## ⚠️ 10. 設計上の注意事項・制約

### 10.1 機能重複の警告 🔄 **統合検討必要**

#### **PROD-02-FREQ との90%重複**
- **基礎データ**: 同じ購入回数・頻度データを使用
- **計算ロジック**: 顧客の購入パターン分析が重複
- **UI表示**: ヒートマップ・チャート表示が類似

```typescript
// 重複分析: 機能の差異
interface FunctionOverlap {
  PROD_02_FREQ: {
    focus: '商品視点での購入頻度';
    output: '商品別の顧客頻度分布';
  };
  PURCH_02_COUNT: {
    focus: '購入回数視点での顧客分布';
    output: '回数別の顧客・売上分布';
  };
  overlap_percentage: '90%';
  recommendation: '単一機能への統合を検討';
}
```

#### **統合後の推奨構造**
```csharp
// 推奨: 統合された購入パターン分析
public class PurchasePatternAnalysisService
{
    // 商品視点での分析
    Task<ProductFrequencyData> GetProductFrequencyAsync(string productId);
    
    // 顧客視点での分析
    Task<CustomerPurchaseCountData> GetCustomerPurchaseCountAsync();
    
    // 統合ビューでの分析
    Task<IntegratedPurchasePatternData> GetIntegratedAnalysisAsync();
}
```

### 10.2 データベース設計の過剰性

#### **不要に複雑なテーブル構造**
- **5つの専用テーブル**: 管理コストが高い
- **集計テーブルの重複**: 他機能との重複データ保存
- **履歴管理の複雑性**: トレンド分析のための大量データ

#### **推奨される簡素化**
```sql
-- 現在の設計: 5つのテーブル
-- PurchaseCountAnalysis
-- PurchaseCountDetails  
-- PurchaseCountSegmentAnalysis
-- PurchaseCountTrendAnalysis
-- PurchaseCountKPISummary

-- 推奨: 既存テーブル活用
-- Order/OrderItem からの動的集計
-- Customer テーブルとの結合による分析
-- 共通集計テーブルの活用
```

### 10.3 実装優先度の見直し

#### **元の計画**: Phase 3（将来拡張対象）
#### **修正推奨**: PROD-02-FREQ との統合で Phase 2

**統合メリット**:
1. **開発工数削減**: 重複機能の排除で50%工数削減
2. **保守性向上**: 単一機能での一元管理
3. **ユーザー体験**: 統合されたダッシュボードでの分析

### 10.4 API設計の標準化必要

#### **命名規則の不統一**
```csharp
// 現在の不統一なAPI設計
[Route("api/analysis/purchase-frequency-detail")]  // 長すぎる
public class PurchaseFrequencyDetailController

// 推奨: 統一された命名
[Route("api/analytics/purchase-patterns")]         // 統一された構造
public class PurchasePatternAnalyticsController
```

### 10.5 フロントエンドとの整合性課題

#### **UIでの表示制約**
- **20+回の表示**: 実際のデータでは稀で意味が薄い
- **詳細分析の複雑性**: 1-20回の詳細表示は視覚的に困難
- **エクスポート機能**: 大量データでの処理時間

#### **推奨される調整**
```typescript
// UI表示の最適化
interface OptimizedDisplayStructure {
  basic_tiers: ['1回', '2-3回', '4-6回', '7-10回', '11回以上'];
  detailed_view: 'クリック展開での詳細表示';
  performance: '上位1000顧客に制限';
}
```

### 10.6 計算量とパフォーマンス課題

#### **処理負荷の問題**
```csharp
// 警告: 大量データでの計算負荷
// 10,000顧客 × 20購入回数パターン = 200,000レコード処理
// 前年比較: さらに2倍のデータ処理
// トレンド分析: 月次データで24倍の処理量
```

#### **必須の最適化対策**
1. **データ制限**: 分析対象顧客数の上限設定
2. **バッチ処理**: リアルタイム計算の回避
3. **キャッシュ戦略**: 計算結果の長期キャッシュ

### 10.7 ビジネス価値の明確化

#### **機能の差別化ポイント不明**
- **PROD-02-FREQ との違い**: ビジネス価値の差が不明確
- **分析の深度**: 詳細すぎて実用性に疑問
- **意思決定への影響**: 具体的なアクションへの変換が困難

#### **推奨される方向性**
1. **機能統合**: PROD-02-FREQ との統合による価値向上
2. **分析簡素化**: 実用的なレベルでの分析に集約
3. **アクション提案**: 具体的な改善提案機能の追加

### 10.8 最終推奨事項

#### **独立実装は非推奨**
**理由**:
1. **90%の機能重複**: 開発・保守コストが非効率
2. **複雑すぎる設計**: 実装・運用の困難さ
3. **ビジネス価値**: 他機能との差別化が不明確

#### **推奨アプローチ**
```typescript
interface RecommendedApproach {
  option_1: {
    title: 'PROD-02-FREQ への統合';
    benefit: '開発工数50%削減、機能統一';
    implementation: 'Phase 2での統合実装';
  };
  option_2: {
    title: '大幅な機能簡素化';
    benefit: '実装コスト削減、保守性向上';
    implementation: 'Phase 3での簡易版実装';
  };
  option_3: {
    title: '実装見送り';
    benefit: 'リソース集中、他機能の品質向上';
    implementation: '他機能の完成度向上に注力';
  };
}
```

**結論**: この機能の独立実装は推奨せず、PROD-02-FREQ との統合または実装見送りを強く推奨