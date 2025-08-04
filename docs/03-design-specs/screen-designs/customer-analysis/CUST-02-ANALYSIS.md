# CUST-02-ANALYSIS - 顧客購買分析【顧客】詳細設計書

## ドキュメント情報
- **画面ID**: CUST-02-ANALYSIS
- **画面名**: 顧客購買分析【顧客】(Customer Purchase Analysis)
- **作成日**: 2025-07-24
- **バージョン**: 1.0
- **ステータス**: Phase 3（将来拡張対象）

## 1. ビジネス概要

### 1.1 機能概要
個別顧客の購買行動を深く分析し、顧客セグメンテーション、LTV（Life Time Value）計算、RFM分析を通じて、パーソナライズされたマーケティング戦略の立案を支援する機能。

### 1.2 主要機能
- 顧客詳細プロファイルの表示
- RFMスコア（Recency, Frequency, Monetary）の計算と可視化
- 顧客セグメンテーション（VIP、リピーター、新規、休眠等）
- 購買商品の傾向分析
- LTV予測とチャーンリスク評価
- 異常購買行動の検出

### 1.3 ビジネス価値
- 個別顧客に最適化されたマーケティング施策の実施
- 高価値顧客の特定と維持戦略の立案
- チャーンリスクの早期発見と対策
- パーソナライズされた商品推薦
- 顧客ライフサイクル管理の最適化

### 1.4 分析指標
- **RFMスコア**: Recency（最新性）、Frequency（頻度）、Monetary（金額）
- **LTV**: 顧客生涯価値の予測値
- **セグメンテーション**: 購買行動に基づく顧客分類
- **商品親和性**: 顧客の商品カテゴリ傾向
- **チャーンリスク**: 離脱可能性の予測

## 2. データベース設計

### 2.1 テーブル定義

```sql
-- 顧客購買分析テーブル
CREATE TABLE CustomerPurchaseAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    CustomerId NVARCHAR(100) NOT NULL,
    CustomerName NVARCHAR(500),
    Email NVARCHAR(255),
    PhoneNumber NVARCHAR(50),
    AnalysisDate DATE NOT NULL,
    CustomerStatus NVARCHAR(50) NOT NULL,              -- Active|Inactive|VIP|New|Dormant
    
    -- RFM分析関連
    RecencyScore INT NOT NULL DEFAULT 0,               -- 1-5スコア
    FrequencyScore INT NOT NULL DEFAULT 0,             -- 1-5スコア
    MonetaryScore INT NOT NULL DEFAULT 0,              -- 1-5スコア
    RFMSegment NVARCHAR(50),                           -- Champions|Loyal Customers|等
    
    -- 購買実績データ
    TotalOrders INT NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    AverageOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0,
    FirstOrderDate DATETIME2,
    LastOrderDate DATETIME2,
    DaysSinceLastOrder INT,
    AverageDaysBetweenOrders DECIMAL(8,2),
    
    -- LTV関連
    HistoricalLTV DECIMAL(18,2) NOT NULL DEFAULT 0,    -- 実績LTV
    PredictedLTV DECIMAL(18,2),                        -- 予測LTV
    LTVRank INT,                                       -- LTVランキング
    
    -- リスク評価
    ChurnRiskScore DECIMAL(5,2) DEFAULT 0,             -- 0-100スコア
    ChurnRiskLevel NVARCHAR(20),                       -- Low|Medium|High|Critical
    
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_CustomerAnalysis_Shop_Customer (ShopDomain, CustomerId),
    INDEX IX_CustomerAnalysis_Status (ShopDomain, CustomerStatus, AnalysisDate),
    INDEX IX_CustomerAnalysis_RFM (RFMSegment, AnalysisDate),
    INDEX IX_CustomerAnalysis_LTV (LTVRank, PredictedLTV DESC),
    INDEX IX_CustomerAnalysis_ChurnRisk (ChurnRiskLevel, ChurnRiskScore DESC)
);

-- 顧客商品親和性テーブル
CREATE TABLE CustomerProductAffinity (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    CustomerId NVARCHAR(100) NOT NULL,
    AnalysisDate DATE NOT NULL,
    ProductId NVARCHAR(100) NOT NULL,
    ProductName NVARCHAR(500),
    Category NVARCHAR(255),
    PurchaseCount INT NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    AffinityScore DECIMAL(5,2) DEFAULT 0,               -- 0-100親和性スコア
    IsTopProduct BIT NOT NULL DEFAULT 0,               -- トップ商品フラグ
    LastPurchaseDate DATETIME2,
    AverageDaysBetweenPurchases DECIMAL(8,2),
    RepurchaseProbability DECIMAL(5,2),                -- 再購入確率（%）
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_CustomerAffinity_Customer (ShopDomain, CustomerId, AnalysisDate),
    INDEX IX_CustomerAffinity_Product (ShopDomain, ProductId),
    INDEX IX_CustomerAffinity_Score (AffinityScore DESC, IsTopProduct),
    UNIQUE(ShopDomain, CustomerId, ProductId, AnalysisDate)
);

-- 顧客セグメンテーション履歴テーブル
CREATE TABLE CustomerSegmentationHistory (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    CustomerId NVARCHAR(100) NOT NULL,
    AnalysisDate DATE NOT NULL,
    PreviousSegment NVARCHAR(50),
    CurrentSegment NVARCHAR(50) NOT NULL,
    SegmentChangeReason NVARCHAR(500),
    ChangeScore DECIMAL(5,2),                          -- 変化の重要度スコア
    ActionRequired BIT NOT NULL DEFAULT 0,             -- アクション要否
    RecommendedActions NVARCHAR(MAX),                  -- 推奨アクション（JSON形式）
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_CustomerSegHistory_Customer (ShopDomain, CustomerId, AnalysisDate DESC),
    INDEX IX_CustomerSegHistory_Segment (ShopDomain, CurrentSegment, AnalysisDate),
    INDEX IX_CustomerSegHistory_Change (ShopDomain, ActionRequired, ChangeScore DESC)
);

-- 顧客異常行動検出テーブル
CREATE TABLE CustomerAnomalyDetection (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    CustomerId NVARCHAR(100) NOT NULL,
    DetectionDate DATE NOT NULL,
    AnomalyType NVARCHAR(100) NOT NULL,                -- PurchaseSpike|LongAbsence|UnusualCategory|等
    AnomalyScore DECIMAL(5,2) NOT NULL,                -- 0-100異常度スコア
    Description NVARCHAR(1000),
    ExpectedBehavior NVARCHAR(500),                    -- 期待される行動
    ActualBehavior NVARCHAR(500),                      -- 実際の行動
    Severity NVARCHAR(20) NOT NULL,                    -- Low|Medium|High|Critical
    IsInvestigated BIT NOT NULL DEFAULT 0,             -- 調査済みフラグ
    InvestigationNotes NVARCHAR(MAX),
    ActionTaken NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_CustomerAnomaly_Customer (ShopDomain, CustomerId, DetectionDate DESC),
    INDEX IX_CustomerAnomaly_Type (AnomalyType, Severity),
    INDEX IX_CustomerAnomaly_Score (AnomalyScore DESC, IsInvestigated)
);

-- 顧客KPIサマリーテーブル
CREATE TABLE CustomerKPISummary (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisDate DATE NOT NULL,
    TotalCustomers INT NOT NULL DEFAULT 0,
    ActiveCustomers INT NOT NULL DEFAULT 0,            -- 過去90日以内購入
    VIPCustomers INT NOT NULL DEFAULT 0,               -- 上位20%顧客
    NewCustomers INT NOT NULL DEFAULT 0,               -- 新規顧客（過去30日）
    DormantCustomers INT NOT NULL DEFAULT 0,           -- 休眠顧客（180日以上未購入）
    
    -- LTV関連
    AverageLTV DECIMAL(18,2) NOT NULL DEFAULT 0,
    MedianLTV DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalLTV DECIMAL(18,2) NOT NULL DEFAULT 0,
    
    -- セグメント分布
    ChampionsCount INT NOT NULL DEFAULT 0,             -- RFMセグメント別顧客数
    LoyalCustomersCount INT NOT NULL DEFAULT 0,
    PotentialLoyalistsCount INT NOT NULL DEFAULT 0,
    NewCustomersCount INT NOT NULL DEFAULT 0,
    PromissingCount INT NOT NULL DEFAULT 0,
    NeedAttentionCount INT NOT NULL DEFAULT 0,
    AboutToSleepCount INT NOT NULL DEFAULT 0,
    AtRiskCount INT NOT NULL DEFAULT 0,
    CannotLoseThemCount INT NOT NULL DEFAULT 0,
    HibernatingCount INT NOT NULL DEFAULT 0,
    LostCount INT NOT NULL DEFAULT 0,
    
    -- チャーンリスク
    HighChurnRiskCustomers INT NOT NULL DEFAULT 0,
    AverageChurnRiskScore DECIMAL(5,2) DEFAULT 0,
    
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_CustomerKPI_Shop_Date (ShopDomain, AnalysisDate),
    UNIQUE(ShopDomain, AnalysisDate)
);
```

### 2.2 インデックス戦略
- 顧客別検索の最適化
- RFMセグメント別の集計クエリ高速化
- LTVランキングクエリの最適化
- 異常検出データの効率的な取得

## 3. API設計

### 3.1 コントローラー定義

```csharp
[ApiController]
[Route("api/analysis/customer-purchase")]
public class CustomerPurchaseAnalysisController : ControllerBase
{
    private readonly ICustomerPurchaseAnalysisService _analysisService;
    private readonly ILogger<CustomerPurchaseAnalysisController> _logger;

    [HttpGet]
    public async Task<IActionResult> GetCustomerPurchaseAnalysis(
        [FromQuery] CustomerPurchaseAnalysisRequest request)
    {
        // 顧客購買分析の取得
    }

    [HttpGet("{customerId}")]
    public async Task<IActionResult> GetCustomerDetail(
        string customerId,
        [FromQuery] CustomerDetailRequest request)
    {
        // 個別顧客詳細の取得
    }

    [HttpGet("kpi-summary")]
    public async Task<IActionResult> GetKPISummary(
        [FromQuery] CustomerKPIRequest request)
    {
        // 顧客KPIサマリーの取得
    }

    [HttpGet("segment-analysis")]
    public async Task<IActionResult> GetSegmentAnalysis(
        [FromQuery] SegmentAnalysisRequest request)
    {
        // セグメント分析の取得
    }

    [HttpGet("anomalies")]
    public async Task<IActionResult> GetCustomerAnomalies(
        [FromQuery] CustomerAnomalyRequest request)
    {
        // 顧客異常行動の取得
    }

    [HttpPost("calculate-rfm")]
    public async Task<IActionResult> CalculateRFMAnalysis(
        [FromBody] CalculateRFMRequest request)
    {
        // RFM分析の再計算
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportCustomerAnalysis(
        [FromQuery] CustomerPurchaseAnalysisRequest request)
    {
        // CSV/Excel エクスポート
    }
}
```

### 3.2 リクエスト/レスポンスDTO

```csharp
// メインリクエストDTO
public class CustomerPurchaseAnalysisRequest
{
    public int StartYear { get; set; }
    public int StartMonth { get; set; }
    public int EndYear { get; set; }
    public int EndMonth { get; set; }
    public string Segment { get; set; } = "全顧客";               // 全顧客|VIP|リピーター|新規|休眠
    public string LTVRange { get; set; } = "all";                // all|0-50000|50000-100000|100000+
    public string PurchaseCountRange { get; set; } = "all";      // all|1|2-5|6-10|11+
    public int? LastPurchaseDays { get; set; }                   // 最終購入からの経過日数
    public string SortBy { get; set; } = "totalAmount";          // totalAmount|purchaseCount|lastOrderDate|ltvRank
    public string SortDirection { get; set; } = "desc";          // asc|desc
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public bool IncludeProductAffinity { get; set; } = true;     // 商品親和性を含む
    public bool IncludeAnomalies { get; set; } = true;           // 異常行動を含む
}

// メインレスポンスDTO
public class CustomerPurchaseAnalysisResponse
{
    public List<CustomerDetail> Customers { get; set; }
    public CustomerKPISummary KPISummary { get; set; }
    public List<SegmentDistribution> SegmentDistribution { get; set; }
    public List<CustomerAnomaly> Anomalies { get; set; }
    public CustomerAnalysisMetadata Metadata { get; set; }
    public PaginationInfo Pagination { get; set; }
}

// 顧客詳細データ
public class CustomerDetail
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string Status { get; set; }                           // Active|VIP|New|Dormant
    
    // 購買実績
    public int TotalOrders { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AverageOrderValue { get; set; }
    public DateTime? FirstOrderDate { get; set; }
    public DateTime? LastOrderDate { get; set; }
    public int DaysSinceLastOrder { get; set; }
    public decimal AverageDaysBetweenOrders { get; set; }
    
    // RFM分析
    public RFMScore RFMScore { get; set; }
    public string RFMSegment { get; set; }
    
    // LTV関連
    public decimal HistoricalLTV { get; set; }
    public decimal PredictedLTV { get; set; }
    public int LTVRank { get; set; }
    
    // チャーンリスク
    public decimal ChurnRiskScore { get; set; }
    public string ChurnRiskLevel { get; set; }
    
    // 商品親和性
    public List<ProductAffinityInfo> TopProducts { get; set; }
    public List<string> ProductCategories { get; set; }
    public int RepeatProducts { get; set; }                      // リピート商品数
    
    // 異常行動
    public List<CustomerAnomaly> RecentAnomalies { get; set; }
}

// RFMスコア
public class RFMScore
{
    public int Recency { get; set; }                             // 1-5スコア
    public int Frequency { get; set; }                           // 1-5スコア
    public int Monetary { get; set; }                            // 1-5スコア
    public string RecencyDescription { get; set; }               // "最近購入"|"しばらく前"等
    public string FrequencyDescription { get; set; }
    public string MonetaryDescription { get; set; }
}

// 商品親和性情報
public class ProductAffinityInfo
{
    public string ProductId { get; set; }
    public string ProductName { get; set; }
    public string Category { get; set; }
    public int PurchaseCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AffinityScore { get; set; }                   // 0-100親和性スコア
    public DateTime? LastPurchaseDate { get; set; }
    public decimal RepurchaseProbability { get; set; }           // 再購入確率（%）
}

// 顧客異常行動
public class CustomerAnomaly
{
    public string CustomerId { get; set; }
    public DateTime DetectionDate { get; set; }
    public string AnomalyType { get; set; }
    public decimal AnomalyScore { get; set; }
    public string Description { get; set; }
    public string Severity { get; set; }
    public bool IsInvestigated { get; set; }
    public string ActionTaken { get; set; }
}

// セグメント分布
public class SegmentDistribution
{
    public string Segment { get; set; }
    public int CustomerCount { get; set; }
    public decimal Percentage { get; set; }
    public decimal AverageLTV { get; set; }
    public decimal AverageOrderValue { get; set; }
    public string Description { get; set; }
}

// KPIサマリー
public class CustomerKPISummary
{
    public int TotalCustomers { get; set; }
    public int ActiveCustomers { get; set; }
    public int VIPCustomers { get; set; }
    public int NewCustomers { get; set; }
    public int DormantCustomers { get; set; }
    
    // LTV関連
    public decimal AverageLTV { get; set; }
    public decimal MedianLTV { get; set; }
    public decimal TotalLTV { get; set; }
    
    // チャーンリスク
    public int HighChurnRiskCustomers { get; set; }
    public decimal AverageChurnRiskScore { get; set; }
    
    // 成長指標
    public decimal CustomerGrowthRate { get; set; }              // 前月比成長率
    public decimal LTVGrowthRate { get; set; }                   // LTV成長率
    public decimal ChurnRate { get; set; }                       // チャーン率
}

// 分析メタデータ
public class CustomerAnalysisMetadata
{
    public DateTime AnalysisDate { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string SegmentFilter { get; set; }
    public string LTVRange { get; set; }
    public string DataQuality { get; set; }                     // Good|Warning|Poor
    public List<string> Warnings { get; set; }
    public DateTime LastRFMCalculation { get; set; }
}

// ページネーション情報
public class PaginationInfo
{
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
    public bool HasPrevious { get; set; }
    public bool HasNext { get; set; }
}
```

### 3.3 サービス層インターフェース

```csharp
public interface ICustomerPurchaseAnalysisService
{
    Task<CustomerPurchaseAnalysisResponse> GetCustomerPurchaseAnalysisAsync(
        string shopDomain,
        CustomerPurchaseAnalysisRequest request);

    Task<CustomerDetail> GetCustomerDetailAsync(
        string shopDomain,
        string customerId,
        CustomerDetailRequest request);

    Task<CustomerKPISummary> GetKPISummaryAsync(
        string shopDomain,
        CustomerKPIRequest request);

    Task<List<SegmentDistribution>> GetSegmentAnalysisAsync(
        string shopDomain,
        SegmentAnalysisRequest request);

    Task<List<CustomerAnomaly>> GetCustomerAnomaliesAsync(
        string shopDomain,
        CustomerAnomalyRequest request);

    Task<Guid> StartRFMCalculationAsync(
        string shopDomain,
        CalculateRFMRequest request);

    Task<byte[]> ExportCustomerAnalysisAsync(
        string shopDomain,
        CustomerPurchaseAnalysisRequest request,
        ExportFormat format);
}
```

## 4. ビジネスロジック実装

### 4.1 顧客分析サービス

```csharp
public class CustomerPurchaseAnalysisService : ICustomerPurchaseAnalysisService
{
    private readonly ShopifyDbContext _context;
    private readonly IRFMAnalysisService _rfmService;
    private readonly ILTVPredictionService _ltvService;
    private readonly IAnomalyDetectionService _anomalyService;
    private readonly ILogger<CustomerPurchaseAnalysisService> _logger;

    public async Task<CustomerPurchaseAnalysisResponse> GetCustomerPurchaseAnalysisAsync(
        string shopDomain,
        CustomerPurchaseAnalysisRequest request)
    {
        // 1. フィルター条件の構築
        var filterConditions = BuildFilterConditions(request);

        // 2. 顧客データの取得（ページング対応）
        var customers = await GetCustomersWithPagingAsync(
            shopDomain, filterConditions, request);

        // 3. KPIサマリーの取得
        var kpiSummary = await GetKPISummaryAsync(
            shopDomain, new CustomerKPIRequest 
            { 
                StartYear = request.StartYear,
                StartMonth = request.StartMonth,
                EndYear = request.EndYear,
                EndMonth = request.EndMonth
            });

        // 4. セグメント分布の取得
        var segmentDistribution = await GetSegmentDistributionAsync(shopDomain);

        // 5. 異常行動の取得
        List<CustomerAnomaly> anomalies = null;
        if (request.IncludeAnomalies)
        {
            anomalies = await GetRecentAnomaliesAsync(shopDomain, 30);
        }

        // 6. 結果の構築
        return new CustomerPurchaseAnalysisResponse
        {
            Customers = customers.Items,
            KPISummary = kpiSummary,
            SegmentDistribution = segmentDistribution,
            Anomalies = anomalies,
            Metadata = BuildAnalysisMetadata(request),
            Pagination = customers.Pagination
        };
    }

    private async Task<(List<CustomerDetail> Items, PaginationInfo Pagination)> 
        GetCustomersWithPagingAsync(
            string shopDomain,
            FilterConditions filterConditions,
            CustomerPurchaseAnalysisRequest request)
    {
        var baseQuery = @"
            SELECT 
                cpa.CustomerId,
                cpa.CustomerName,
                cpa.Email,
                cpa.PhoneNumber,
                cpa.CustomerStatus,
                cpa.TotalOrders,
                cpa.TotalAmount,
                cpa.AverageOrderValue,
                cpa.FirstOrderDate,
                cpa.LastOrderDate,
                cpa.DaysSinceLastOrder,
                cpa.AverageDaysBetweenOrders,
                cpa.RecencyScore,
                cpa.FrequencyScore,
                cpa.MonetaryScore,
                cpa.RFMSegment,
                cpa.HistoricalLTV,
                cpa.PredictedLTV,
                cpa.LTVRank,
                cpa.ChurnRiskScore,
                cpa.ChurnRiskLevel
            FROM CustomerPurchaseAnalysis cpa
            WHERE cpa.ShopDomain = @ShopDomain
              AND cpa.AnalysisDate = (
                  SELECT MAX(AnalysisDate) 
                  FROM CustomerPurchaseAnalysis 
                  WHERE ShopDomain = @ShopDomain
              )
              {0}
            ORDER BY {1} {2}
            OFFSET @Offset ROWS
            FETCH NEXT @PageSize ROWS ONLY";

        // WHERE条件とORDER BY句の構築
        var whereClause = BuildWhereClause(filterConditions);
        var orderByClause = BuildOrderByClause(request.SortBy);
        var sortDirection = request.SortDirection.ToUpper();

        var query = string.Format(baseQuery, whereClause, orderByClause, sortDirection);
        
        var offset = (request.Page - 1) * request.PageSize;
        
        var parameters = new List<SqlParameter>
        {
            new SqlParameter("@ShopDomain", shopDomain),
            new SqlParameter("@Offset", offset),
            new SqlParameter("@PageSize", request.PageSize)
        };

        // フィルターパラメータの追加
        AddFilterParameters(parameters, filterConditions);

        var results = await _context.Database
            .SqlQueryRaw<CustomerAnalysisRawData>(query, parameters.ToArray())
            .ToListAsync();

        // 総件数の取得
        var totalCount = await GetTotalCustomerCountAsync(shopDomain, filterConditions);

        // CustomerDetailオブジェクトの構築
        var customerDetails = new List<CustomerDetail>();
        
        foreach (var result in results)
        {
            var customerDetail = await BuildCustomerDetailAsync(shopDomain, result, request);
            customerDetails.Add(customerDetail);
        }

        var pagination = new PaginationInfo
        {
            CurrentPage = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / request.PageSize),
            HasPrevious = request.Page > 1,
            HasNext = request.Page < Math.Ceiling((double)totalCount / request.PageSize)
        };

        return (customerDetails, pagination);
    }

    private async Task<CustomerDetail> BuildCustomerDetailAsync(
        string shopDomain,
        CustomerAnalysisRawData rawData,
        CustomerPurchaseAnalysisRequest request)
    {
        var customerDetail = new CustomerDetail
        {
            Id = rawData.CustomerId,
            Name = rawData.CustomerName,
            Email = rawData.Email,
            PhoneNumber = rawData.PhoneNumber,
            Status = rawData.CustomerStatus,
            TotalOrders = rawData.TotalOrders,
            TotalAmount = rawData.TotalAmount,
            AverageOrderValue = rawData.AverageOrderValue,
            FirstOrderDate = rawData.FirstOrderDate,
            LastOrderDate = rawData.LastOrderDate,
            DaysSinceLastOrder = rawData.DaysSinceLastOrder,
            AverageDaysBetweenOrders = rawData.AverageDaysBetweenOrders,
            HistoricalLTV = rawData.HistoricalLTV,
            PredictedLTV = rawData.PredictedLTV,
            LTVRank = rawData.LTVRank,
            ChurnRiskScore = rawData.ChurnRiskScore,
            ChurnRiskLevel = rawData.ChurnRiskLevel,
            RFMScore = new RFMScore
            {
                Recency = rawData.RecencyScore,
                Frequency = rawData.FrequencyScore,
                Monetary = rawData.MonetaryScore,
                RecencyDescription = GetRFMDescription("Recency", rawData.RecencyScore),
                FrequencyDescription = GetRFMDescription("Frequency", rawData.FrequencyScore),
                MonetaryDescription = GetRFMDescription("Monetary", rawData.MonetaryScore)
            },
            RFMSegment = rawData.RFMSegment
        };

        // 商品親和性データの取得
        if (request.IncludeProductAffinity)
        {
            customerDetail.TopProducts = await GetCustomerTopProductsAsync(
                shopDomain, rawData.CustomerId);
            customerDetail.ProductCategories = await GetCustomerCategoriesAsync(
                shopDomain, rawData.CustomerId);
            customerDetail.RepeatProducts = await GetRepeatProductsCountAsync(
                shopDomain, rawData.CustomerId);
        }

        // 異常行動データの取得
        if (request.IncludeAnomalies)
        {
            customerDetail.RecentAnomalies = await GetCustomerAnomaliesAsync(
                shopDomain, rawData.CustomerId, 30);
        }

        return customerDetail;
    }
}
```

### 4.2 RFM分析サービス

```csharp
public class RFMAnalysisService : IRFMAnalysisService
{
    public async Task CalculateRFMScoresAsync(
        string shopDomain,
        DateTime analysisDate)
    {
        // 1. 分析対象期間の決定（過去12ヶ月）
        var analysisStart = analysisDate.AddMonths(-12);

        // 2. 顧客の購買データを取得
        var customerPurchaseData = await GetCustomerPurchaseDataAsync(
            shopDomain, analysisStart, analysisDate);

        // 3. RFMスコアの計算
        var rfmScores = CalculateRFMScores(customerPurchaseData, analysisDate);

        // 4. RFMセグメントの決定
        var segmentedCustomers = AssignRFMSegments(rfmScores);

        // 5. データベースに保存
        await SaveRFMAnalysisAsync(shopDomain, analysisDate, segmentedCustomers);
    }

    private Dictionary<string, RFMCustomerData> CalculateRFMScores(
        List<CustomerPurchaseRawData> purchaseData,
        DateTime analysisDate)
    {
        var customerRFM = new Dictionary<string, RFMCustomerData>();

        foreach (var customer in purchaseData)
        {
            // Recencyスコア（最終購入からの経過日数）
            var daysSinceLastPurchase = (analysisDate - customer.LastOrderDate).Days;
            var recencyScore = CalculateRecencyScore(daysSinceLastPurchase);

            // Frequencyスコア（購入頻度）
            var frequencyScore = CalculateFrequencyScore(customer.TotalOrders);

            // Monetaryスコア（総購入金額）
            var monetaryScore = CalculateMonetaryScore(customer.TotalAmount);

            customerRFM[customer.CustomerId] = new RFMCustomerData
            {
                CustomerId = customer.CustomerId,
                RecencyScore = recencyScore,
                FrequencyScore = frequencyScore,
                MonetaryScore = monetaryScore,
                TotalOrders = customer.TotalOrders,
                TotalAmount = customer.TotalAmount,
                LastOrderDate = customer.LastOrderDate
            };
        }

        return customerRFM;
    }

    private int CalculateRecencyScore(int daysSinceLastPurchase)
    {
        // 5段階評価（5が最良）
        return daysSinceLastPurchase switch
        {
            <= 30 => 5,      // 30日以内
            <= 60 => 4,      // 31-60日
            <= 90 => 3,      // 61-90日
            <= 180 => 2,     // 91-180日
            _ => 1           // 180日超過
        };
    }

    private int CalculateFrequencyScore(int totalOrders)
    {
        return totalOrders switch
        {
            >= 10 => 5,      // 10回以上
            >= 6 => 4,       // 6-9回
            >= 3 => 3,       // 3-5回
            >= 2 => 2,       // 2回
            _ => 1           // 1回
        };
    }

    private int CalculateMonetaryScore(decimal totalAmount)
    {
        return totalAmount switch
        {
            >= 100000 => 5,  // 10万円以上
            >= 50000 => 4,   // 5-10万円
            >= 20000 => 3,   // 2-5万円
            >= 10000 => 2,   // 1-2万円
            _ => 1           // 1万円未満
        };
    }

    private Dictionary<string, CustomerRFMResult> AssignRFMSegments(
        Dictionary<string, RFMCustomerData> rfmScores)
    {
        var segmentedCustomers = new Dictionary<string, CustomerRFMResult>();

        foreach (var rfm in rfmScores.Values)
        {
            var segment = DetermineRFMSegment(
                rfm.RecencyScore, rfm.FrequencyScore, rfm.MonetaryScore);

            segmentedCustomers[rfm.CustomerId] = new CustomerRFMResult
            {
                CustomerId = rfm.CustomerId,
                RecencyScore = rfm.RecencyScore,
                FrequencyScore = rfm.FrequencyScore,
                MonetaryScore = rfm.MonetaryScore,
                RFMSegment = segment,
                TotalOrders = rfm.TotalOrders,
                TotalAmount = rfm.TotalAmount,
                LastOrderDate = rfm.LastOrderDate
            };
        }

        return segmentedCustomers;
    }

    private string DetermineRFMSegment(int recency, int frequency, int monetary)
    {
        // RFMスコアに基づくセグメンテーション
        var rfmString = $"{recency}{frequency}{monetary}";
        
        return (recency, frequency, monetary) switch
        {
            // Champions: 高R、高F、高M
            (5, >= 4, >= 4) => "Champions",
            (4, >= 4, >= 4) => "Champions",
            
            // Loyal Customers: 高R、高F、中M
            (>= 4, >= 4, >= 2) => "Loyal Customers",
            
            // Potential Loyalists: 高R、中F、中M
            (>= 4, >= 2, >= 2) => "Potential Loyalists",
            
            // New Customers: 高R、低F、低M
            (>= 4, <= 2, <= 2) => "New Customers",
            
            // Promising: 中R、低F、低M
            (3, <= 2, <= 2) => "Promising",
            
            // Need Attention: 中R、中F、中M
            (3, >= 2, >= 2) => "Need Attention",
            
            // About to Sleep: 低R、中F、中M
            (<= 2, >= 2, >= 2) => "About to Sleep",
            
            // At Risk: 低R、高F、高M
            (<= 2, >= 3, >= 3) => "At Risk",
            
            // Cannot Lose Them: 低R、高F、高M（特に重要顧客）
            (1, >= 4, >= 4) => "Cannot Lose Them",
            
            // Hibernating: 低R、低F、低M
            (<= 2, <= 2, <= 2) => "Hibernating",
            
            // Lost: 最低R、低F、低M
            (1, 1, <= 2) => "Lost",
            
            _ => "Others"
        };
    }
}
```

## 5. Shopify連携

### 5.1 顧客データ同期

```csharp
public class ShopifyCustomerDataSync
{
    public async Task SyncCustomerAnalysisDataAsync(
        string shopDomain,
        DateTime analysisDate)
    {
        // 1. Shopifyから顧客データを取得
        var customers = await _shopifyService.GetCustomersAsync(shopDomain);

        // 2. 注文データを取得（過去12ヶ月）
        var orders = await _shopifyService.GetOrdersAsync(
            shopDomain, analysisDate.AddMonths(-12), analysisDate);

        // 3. 顧客購買分析データの更新
        await UpdateCustomerPurchaseAnalysisAsync(customers, orders, analysisDate);

        // 4. RFM分析の実行
        await _rfmService.CalculateRFMScoresAsync(shopDomain, analysisDate);

        // 5. LTV予測の実行
        await _ltvService.CalculateLTVPredictionsAsync(shopDomain, analysisDate);

        // 6. 異常検出の実行
        await _anomalyService.DetectCustomerAnomaliesAsync(shopDomain, analysisDate);
    }
}
```

## 6. パフォーマンス考慮事項

### 6.1 キャッシュ戦略
- 顧客分析結果のキャッシュ（1時間）
- RFMセグメント分布のキャッシュ（6時間）
- KPIサマリーのキャッシュ（30分）

### 6.2 クエリ最適化
- 複合インデックスによる検索最適化
- ページング処理の効率化
- 大量データ処理のための並列化

### 6.3 スケーラビリティ
- 顧客データの分散処理
- 非同期バックグラウンド計算
- メモリ効率を考慮したデータ処理

## 7. エラーハンドリング

```csharp
public enum CustomerAnalysisError
{
    InsufficientCustomerData,    // 顧客データ不足
    RFMCalculationFailed,        // RFM計算エラー
    LTVPredictionFailed,         // LTV予測エラー
    AnomalyDetectionFailed      // 異常検出エラー
}
```

## 8. セキュリティ考慮事項

- 顧客個人情報の適切な管理
- データアクセス権限の制御
- 分析結果の匿名化処理

## 9. 今後の拡張予定

### Phase 4での機能追加
- 機械学習によるLTV予測精度向上
- リアルタイム顧客行動分析
- パーソナライズされたマーケティング自動化
- 顧客行動予測モデルの導入
- A/Bテスト結果との統合分析

## ⚠️ 10. 設計上の注意事項・制約

### 10.1 他機能との重複・矛盾 🔄 **設計統一必要**

#### **顧客セグメンテーションの定義矛盾**
- **CUST-01-DORMANT**: 休眠顧客 = 90日間未購入
- **CUST-02-ANALYSIS**: About to Sleep = 180日間未購入
- **PURCH-03-FTIER**: F階層による分類（異なる基準）

```csharp
// 矛盾: 同じ顧客が異なる画面で異なるセグメントに分類される
// DORMANT: 90日 → "休眠"
// ANALYSIS: 90日 → "Need Attention"
// → 統一された基準の策定が必要
```

#### **RFMスコア計算の重複**
- **Frequency計算**: PURCH-03-FTIER と重複
- **Monetary計算**: PROD-01-YOY の売上データと重複
- **Recency計算**: CUST-01-DORMANT の最終購入日と重複

### 10.2 実装複雑度の警告 🔥 **高難易度**

#### **複雑な分析アルゴリズム**
- **RFMスコア算出**: 統計分布に基づく5段階評価
- **LTV予測モデル**: 機械学習アルゴリズムの実装
- **チャーンリスク分析**: 多変量解析による予測
- **異常行動検出**: パターン認識による検出

```csharp
// 警告: 高度な統計・機械学習知識が必要
// RFMセグメンテーション: 125通り(5×5×5)の組み合わせ管理
// LTV予測: 時系列分析・回帰モデルの実装
// 異常検出: 外れ値検出アルゴリズムの実装
```

### 10.3 データベース設計の複雑性

#### **大量のテーブル設計**
- **5つの専用テーブル**: 管理・保守の複雑さ
- **履歴管理**: セグメント変更履歴の追跡
- **パフォーマンス**: インデックス戦略の複雑化

#### **推奨される簡素化**
```sql
-- 提案: 既存テーブル活用による統合
-- CustomerPurchaseAnalysis → Customer + Order の集計ビュー
-- CustomerProductAffinity → OrderItem の集計
-- CustomerSegmentationHistory → 履歴テーブルの共通化
```

### 10.4 API設計の課題

#### **大量データのページング**
- **全顧客表示**: 10,000顧客でのページング性能
- **検索機能**: 複数条件での動的フィルタリング
- **ソート機能**: LTV・チャーンリスクでの高速ソート

#### **レスポンス時間の制約**
```csharp
// 警告: 応答時間の制約
// 全顧客のRFM計算: 10,000顧客 × 複雑な計算 = 数十秒
// LTV予測: 機械学習モデル適用で更に遅延
// → キャッシュ戦略とバッチ処理が必須
```

### 10.5 実装順序の重要性

#### **前提条件の整理**
1. **基盤機能**: CUST-01-DORMANT の安定稼働
2. **共通定義**: 顧客セグメンテーション基準の統一
3. **データ品質**: 顧客データの正規化・クレンジング

#### **段階的実装の推奨**
- **Phase 3A**: 基本RFM分析のみ
- **Phase 3B**: 顧客詳細プロファイル
- **Phase 3C**: LTV予測機能
- **Phase 3D**: 異常検出・予測分析

### 10.6 ビジネス要件の明確化が必要

#### **未定義の要件**
- **LTV予測期間**: 6ヶ月？1年？3年？
- **チャーンリスクの閾値**: 何%で「高リスク」とするか
- **異常行動の定義**: どの程度の変化を「異常」とするか
- **アクション提案**: 具体的な施策の提案ロジック

#### **外部システム連携**
- **CRMとの連携**: 顧客情報の同期方法
- **メール配信**: セグメント別メール配信の自動化
- **A/Bテスト**: 効果測定との連携

### 10.7 優先度の見直し推奨

#### **元の計画**: Phase 3（将来拡張対象）
#### **修正推奨**: Phase 4 または段階的実装

**理由**:
1. **技術的複雑さ**: 機械学習・統計分析の専門知識必要
2. **他機能との依存**: 基盤機能の安定稼働後の実装が適切
3. **ビジネス要件**: 詳細な要件定義とビジネス側との調整が必要

**重要**: この機能は最も高度な分析機能のため、他の基盤機能が完全に稼働してからの実装を強く推奨