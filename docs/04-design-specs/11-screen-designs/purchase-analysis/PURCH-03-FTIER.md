# PURCH-03-FTIER - F階層傾向【購買】詳細設計書

## ドキュメント情報
- **画面ID**: PURCH-03-FTIER
- **画面名**: F階層傾向【購買】(F-Tier Trend Analysis)
- **作成日**: 2025-07-24
- **バージョン**: 1.0
- **ステータス**: Phase 1（初期リリース対象）

## 1. ビジネス概要

### 1.1 機能概要
顧客の購買頻度（Frequency）を5段階の階層（F1-F5）に分類し、各階層の時系列トレンドを分析する機能。顧客ロイヤルティの変化と購買行動の変遷を可視化する。

### 1.2 主要機能
- F階層（購買頻度）別の顧客分布分析
- 月次トレンドの可視化（チャート・ヒートマップ）
- 階層間の移動パターンの分析
- 異常値・トレンド変化の検出
- 顧客ロイヤルティKPIの監視

### 1.3 ビジネス価値
- 顧客ロイヤルティプログラムの効果測定
- リピート顧客の獲得・維持戦略の立案
- 購買頻度の低下を早期発見し、対策を実施
- マーケティング施策の効果分析

### 1.4 F階層定義
- **F1**: 1回購入（新規顧客・一回限り）
- **F2**: 2回購入（リピート開始）
- **F3**: 3-5回購入（定期顧客）
- **F4**: 6-10回購入（ロイヤル顧客）
- **F5**: 11回以上購入（超ロイヤル顧客）

## 2. データベース設計

### 2.1 テーブル定義

```sql
-- F階層トレンド分析テーブル
CREATE TABLE FTierTrendAnalysis (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisMonth DATE NOT NULL,                   -- 分析対象月（月初日）
    F1Count INT NOT NULL DEFAULT 0,               -- F1階層顧客数
    F2Count INT NOT NULL DEFAULT 0,               -- F2階層顧客数
    F3Count INT NOT NULL DEFAULT 0,               -- F3階層顧客数
    F4Count INT NOT NULL DEFAULT 0,               -- F4階層顧客数
    F5Count INT NOT NULL DEFAULT 0,               -- F5階層顧客数
    TotalCustomers INT NOT NULL DEFAULT 0,        -- 総顧客数
    AnalysisRange NVARCHAR(50) NOT NULL,          -- 全年|上半期|下半期|Q1|Q2|Q3|Q4
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_FTier_Shop_Month (ShopDomain, AnalysisMonth),
    INDEX IX_FTier_Range (ShopDomain, AnalysisRange, AnalysisMonth)
);

-- F階層詳細データテーブル
CREATE TABLE FTierCustomerDetails (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    CustomerId NVARCHAR(100) NOT NULL,
    CustomerName NVARCHAR(500),
    AnalysisMonth DATE NOT NULL,
    FTier INT NOT NULL,                           -- 1-5の階層
    PurchaseCount INT NOT NULL,                   -- 実際の購入回数
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0, -- 総購入金額
    AverageOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0, -- 平均注文金額
    LastOrderDate DATETIME2,                      -- 最終注文日
    FirstOrderDate DATETIME2,                     -- 初回注文日
    DaysSinceLastOrder INT,                       -- 最終注文からの経過日数
    PreviousFTier INT,                           -- 前月のF階層
    TierTransition NVARCHAR(20),                 -- Up/Down/Same/New
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_FTierCustomer_Shop_Month (ShopDomain, AnalysisMonth),
    INDEX IX_FTierCustomer_Tier (ShopDomain, FTier, AnalysisMonth),
    INDEX IX_FTierCustomer_Transition (ShopDomain, TierTransition, AnalysisMonth)
);

-- F階層KPIサマリーテーブル
CREATE TABLE FTierKPISummary (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisMonth DATE NOT NULL,
    AnalysisRange NVARCHAR(50) NOT NULL,
    TotalCustomers INT NOT NULL DEFAULT 0,
    ActiveCustomers INT NOT NULL DEFAULT 0,       -- 当月購入のある顧客
    NewCustomers INT NOT NULL DEFAULT 0,          -- 新規顧客（F1）
    RepeatCustomers INT NOT NULL DEFAULT 0,       -- リピート顧客（F2以上）
    LoyalCustomers INT NOT NULL DEFAULT 0,        -- ロイヤル顧客（F4以上）
    AverageFrequency DECIMAL(5,2) NOT NULL DEFAULT 0, -- 平均購買頻度
    RepeatRate DECIMAL(5,2) NOT NULL DEFAULT 0,   -- リピート率（%）
    LoyaltyRate DECIMAL(5,2) NOT NULL DEFAULT 0,  -- ロイヤル率（%）
    ChurnRisk INT NOT NULL DEFAULT 0,             -- 離脱リスク顧客数
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_FTierKPI_Shop_Month (ShopDomain, AnalysisMonth),
    INDEX IX_FTierKPI_Range (ShopDomain, AnalysisRange)
);

-- 異常値検出テーブル
CREATE TABLE FTierAnomalyDetection (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ShopDomain NVARCHAR(255) NOT NULL,
    AnalysisMonth DATE NOT NULL,
    AnomalyType NVARCHAR(100) NOT NULL,           -- 'TierDistribution', 'TrendChange', 'SeasonalAnomaly'
    FTier INT,                                    -- 対象F階層（NULL=全体）
    AnomalyScore DECIMAL(5,2) NOT NULL,           -- 異常度スコア（0-100）
    Expected DECIMAL(10,2),                       -- 期待値
    Actual DECIMAL(10,2),                         -- 実績値
    Deviation DECIMAL(10,2),                      -- 偏差
    Severity NVARCHAR(20) NOT NULL,               -- 'Low', 'Medium', 'High', 'Critical'
    Description NVARCHAR(1000),                   -- 異常内容の説明
    ActionRequired BIT NOT NULL DEFAULT 0,        -- 対応要否
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    INDEX IX_FTierAnomaly_Shop_Month (ShopDomain, AnalysisMonth),
    INDEX IX_FTierAnomaly_Severity (Severity, ActionRequired)
);
```

### 2.2 インデックス戦略
- 月次分析のための日付範囲検索最適化
- F階層別の集計クエリ最適化
- 顧客トランジション分析の高速化
- 異常値検出クエリの効率化

## 3. API設計

### 3.1 コントローラー定義

```csharp
[ApiController]
[Route("api/analysis/f-tier-trend")]
public class FTierTrendAnalysisController : ControllerBase
{
    private readonly IFTierTrendAnalysisService _analysisService;
    private readonly ILogger<FTierTrendAnalysisController> _logger;

    [HttpGet]
    public async Task<IActionResult> GetFTierTrendAnalysis(
        [FromQuery] FTierTrendAnalysisRequest request)
    {
        // 実装詳細は後述
    }

    [HttpGet("kpi-summary")]
    public async Task<IActionResult> GetKPISummary(
        [FromQuery] FTierKPIRequest request)
    {
        // KPIサマリー取得
    }

    [HttpGet("anomalies")]
    public async Task<IActionResult> GetAnomalies(
        [FromQuery] FTierAnomalyRequest request)
    {
        // 異常値検出結果取得
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateFTierAnalysis(
        [FromBody] CalculateFTierRequest request)
    {
        // F階層分析の再計算実行
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportFTierAnalysis(
        [FromQuery] FTierTrendAnalysisRequest request)
    {
        // CSV/Excel エクスポート
    }
}
```

### 3.2 リクエスト/レスポンスDTO

```csharp
// メインリクエストDTO
public class FTierTrendAnalysisRequest
{
    public string AnalysisRange { get; set; } = "全年";    // 全年|上半期|下半期|Q1|Q2|Q3|Q4
    public int? Year { get; set; }                         // 対象年（未指定時は現在年）
    public string ViewMode { get; set; } = "chart";       // chart|heatmap|both
    public bool IncludeAnomalies { get; set; } = true;    // 異常値情報を含める
    public bool IncludeKPIs { get; set; } = true;         // KPIサマリーを含める
}

// メインレスポンスDTO
public class FTierTrendAnalysisResponse
{
    public List<FTierTrendData> TrendData { get; set; }
    public List<FTierSummary> Summary { get; set; }
    public FTierKPISummaryData KPISummary { get; set; }
    public List<FTierAnomaly> Anomalies { get; set; }
    public FTierAnalysisMetadata Metadata { get; set; }
}

// F階層トレンドデータ
public class FTierTrendData
{
    public string Month { get; set; }                      // YYYY-MM形式
    public int F1 { get; set; }                           // F1階層顧客数
    public int F2 { get; set; }                           // F2階層顧客数
    public int F3 { get; set; }                           // F3階層顧客数
    public int F4 { get; set; }                           // F4階層顧客数
    public int F5 { get; set; }                           // F5階層顧客数
    public int Total { get; set; }                        // 総顧客数
    
    // パーセンテージ版
    public decimal F1Percentage { get; set; }
    public decimal F2Percentage { get; set; }
    public decimal F3Percentage { get; set; }
    public decimal F4Percentage { get; set; }
    public decimal F5Percentage { get; set; }
}

// F階層サマリー
public class FTierSummary
{
    public string Tier { get; set; }                      // F1, F2, F3, F4, F5
    public string Description { get; set; }               // "1回購入", "2回購入"等
    public int Current { get; set; }                      // 当月顧客数
    public int Previous { get; set; }                     // 前月顧客数
    public decimal Growth { get; set; }                   // 成長率（%）
    public decimal Percentage { get; set; }               // 全体に占める割合（%）
    public string Trend { get; set; }                     // "増加", "減少", "横ばい"
    public decimal AverageOrderValue { get; set; }        // 平均注文金額
}

// KPIサマリーデータ
public class FTierKPISummaryData
{
    public int TotalCustomers { get; set; }
    public int ActiveCustomers { get; set; }
    public int NewCustomers { get; set; }
    public int RepeatCustomers { get; set; }
    public int LoyalCustomers { get; set; }
    public decimal AverageFrequency { get; set; }
    public decimal RepeatRate { get; set; }               // リピート率（%）
    public decimal LoyaltyRate { get; set; }              // ロイヤル率（%）
    public int ChurnRiskCustomers { get; set; }           // 離脱リスク顧客数
    
    // 前月比較
    public decimal RepeatRateChange { get; set; }
    public decimal LoyaltyRateChange { get; set; }
    public decimal FrequencyChange { get; set; }
}

// 異常値情報
public class FTierAnomaly
{
    public string Month { get; set; }
    public string AnomalyType { get; set; }
    public string FTier { get; set; }                     // NULL=全体
    public decimal AnomalyScore { get; set; }
    public decimal Expected { get; set; }
    public decimal Actual { get; set; }
    public string Severity { get; set; }
    public string Description { get; set; }
    public bool ActionRequired { get; set; }
}

// 分析メタデータ
public class FTierAnalysisMetadata
{
    public DateTime AnalysisDate { get; set; }
    public string AnalysisRange { get; set; }
    public int Year { get; set; }
    public DateTime DataStartDate { get; set; }
    public DateTime DataEndDate { get; set; }
    public int TotalMonths { get; set; }
    public string DataQuality { get; set; }               // "Good", "Warning", "Poor"
    public List<string> Warnings { get; set; }
}
```

### 3.3 サービス層インターフェース

```csharp
public interface IFTierTrendAnalysisService
{
    Task<FTierTrendAnalysisResponse> GetFTierTrendAnalysisAsync(
        string shopDomain,
        FTierTrendAnalysisRequest request);

    Task<FTierKPISummaryData> GetKPISummaryAsync(
        string shopDomain,
        FTierKPIRequest request);

    Task<List<FTierAnomaly>> DetectAnomaliesAsync(
        string shopDomain,
        FTierAnomalyRequest request);

    Task<Guid> StartFTierCalculationAsync(
        string shopDomain,
        CalculateFTierRequest request);

    Task<byte[]> ExportFTierAnalysisAsync(
        string shopDomain,
        FTierTrendAnalysisRequest request,
        ExportFormat format);
}
```

## 4. ビジネスロジック実装

### 4.1 F階層分析サービス

```csharp
public class FTierTrendAnalysisService : IFTierTrendAnalysisService
{
    private readonly ShopifyDbContext _context;
    private readonly ILogger<FTierTrendAnalysisService> _logger;
    private readonly IAnomalyDetectionService _anomalyService;

    public async Task<FTierTrendAnalysisResponse> GetFTierTrendAnalysisAsync(
        string shopDomain,
        FTierTrendAnalysisRequest request)
    {
        // 1. 分析期間の決定
        var dateRange = DetermineAnalysisDateRange(request);

        // 2. キャッシュチェック
        var cacheKey = GenerateCacheKey(shopDomain, request);
        var cachedResult = await GetCachedAnalysisAsync(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        // 3. 月次F階層データの取得
        var trendData = await GetMonthlyFTierDataAsync(
            shopDomain, dateRange.Start, dateRange.End, request.AnalysisRange);

        // 4. サマリーデータの計算
        var summary = CalculateFTierSummary(trendData);

        // 5. KPIサマリーの取得
        FTierKPISummaryData kpiSummary = null;
        if (request.IncludeKPIs)
        {
            kpiSummary = await CalculateKPISummaryAsync(
                shopDomain, dateRange.End);
        }

        // 6. 異常値検出
        List<FTierAnomaly> anomalies = null;
        if (request.IncludeAnomalies)
        {
            anomalies = await _anomalyService.DetectFTierAnomaliesAsync(
                shopDomain, trendData, dateRange);
        }

        // 7. 結果の構築
        var response = new FTierTrendAnalysisResponse
        {
            TrendData = trendData,
            Summary = summary,
            KPISummary = kpiSummary,
            Anomalies = anomalies,
            Metadata = BuildAnalysisMetadata(request, dateRange)
        };

        // 8. キャッシュに保存
        await CacheAnalysisAsync(cacheKey, response);

        return response;
    }

    private async Task<List<FTierTrendData>> GetMonthlyFTierDataAsync(
        string shopDomain,
        DateTime startDate,
        DateTime endDate,
        string analysisRange)
    {
        var query = @"
            SELECT 
                AnalysisMonth,
                F1Count,
                F2Count,
                F3Count,
                F4Count,
                F5Count,
                TotalCustomers
            FROM FTierTrendAnalysis
            WHERE ShopDomain = @ShopDomain
              AND AnalysisRange = @AnalysisRange
              AND AnalysisMonth BETWEEN @StartDate AND @EndDate
            ORDER BY AnalysisMonth";

        var results = await _context.Database
            .SqlQueryRaw<FTierRawData>(query,
                new SqlParameter("@ShopDomain", shopDomain),
                new SqlParameter("@AnalysisRange", analysisRange),
                new SqlParameter("@StartDate", startDate),
                new SqlParameter("@EndDate", endDate))
            .ToListAsync();

        return results.Select(r => new FTierTrendData
        {
            Month = r.AnalysisMonth.ToString("yyyy-MM"),
            F1 = r.F1Count,
            F2 = r.F2Count,
            F3 = r.F3Count,
            F4 = r.F4Count,
            F5 = r.F5Count,
            Total = r.TotalCustomers,
            F1Percentage = CalculatePercentage(r.F1Count, r.TotalCustomers),
            F2Percentage = CalculatePercentage(r.F2Count, r.TotalCustomers),
            F3Percentage = CalculatePercentage(r.F3Count, r.TotalCustomers),
            F4Percentage = CalculatePercentage(r.F4Count, r.TotalCustomers),
            F5Percentage = CalculatePercentage(r.F5Count, r.TotalCustomers)
        }).ToList();
    }

    private List<FTierSummary> CalculateFTierSummary(List<FTierTrendData> trendData)
    {
        if (!trendData.Any()) return new List<FTierSummary>();

        var latest = trendData.Last();
        var previous = trendData.Count > 1 ? trendData[trendData.Count - 2] : latest;

        return new List<FTierSummary>
        {
            CreateTierSummary("F1", "1回購入", latest.F1, previous.F1, latest.Total),
            CreateTierSummary("F2", "2回購入", latest.F2, previous.F2, latest.Total),
            CreateTierSummary("F3", "3-5回購入", latest.F3, previous.F3, latest.Total),
            CreateTierSummary("F4", "6-10回購入", latest.F4, previous.F4, latest.Total),
            CreateTierSummary("F5", "11回以上購入", latest.F5, previous.F5, latest.Total)
        };
    }

    private FTierSummary CreateTierSummary(
        string tier, 
        string description, 
        int current, 
        int previous, 
        int total)
    {
        var growth = previous > 0 ? ((decimal)(current - previous) / previous) * 100 : 0;
        var percentage = total > 0 ? ((decimal)current / total) * 100 : 0;
        var trend = growth > 5 ? "増加" : growth < -5 ? "減少" : "横ばい";

        return new FTierSummary
        {
            Tier = tier,
            Description = description,
            Current = current,
            Previous = previous,
            Growth = Math.Round(growth, 1),
            Percentage = Math.Round(percentage, 1),
            Trend = trend,
            AverageOrderValue = CalculateAverageOrderValue(tier)
        };
    }
}
```

### 4.2 異常値検出サービス

```csharp
public class FTierAnomalyDetectionService : IAnomalyDetectionService
{
    public async Task<List<FTierAnomaly>> DetectFTierAnomaliesAsync(
        string shopDomain,
        List<FTierTrendData> trendData,
        DateRange dateRange)
    {
        var anomalies = new List<FTierAnomaly>();

        // 1. トレンド変化の異常検出
        anomalies.AddRange(await DetectTrendAnomaliesAsync(trendData));

        // 2. 季節性からの逸脱検出
        anomalies.AddRange(await DetectSeasonalAnomaliesAsync(trendData));

        // 3. F階層分布の異常検出
        anomalies.AddRange(await DetectDistributionAnomaliesAsync(trendData));

        // 4. 急激な変化の検出
        anomalies.AddRange(await DetectSuddenChangesAsync(trendData));

        return anomalies.OrderByDescending(a => a.AnomalyScore).ToList();
    }

    private async Task<List<FTierAnomaly>> DetectTrendAnomaliesAsync(
        List<FTierTrendData> trendData)
    {
        var anomalies = new List<FTierAnomaly>();

        for (int i = 2; i < trendData.Count; i++)
        {
            var current = trendData[i];
            var previous = trendData[i - 1];
            var beforePrevious = trendData[i - 2];

            // 各F階層の変化率をチェック
            var tiers = new[] { "F1", "F2", "F3", "F4", "F5" };
            var currentValues = new[] { current.F1, current.F2, current.F3, current.F4, current.F5 };
            var previousValues = new[] { previous.F1, previous.F2, previous.F3, previous.F4, previous.F5 };
            var beforePreviousValues = new[] { beforePrevious.F1, beforePrevious.F2, beforePrevious.F3, beforePrevious.F4, beforePrevious.F5 };

            for (int j = 0; j < tiers.Length; j++)
            {
                var changeRate = CalculateChangeRate(currentValues[j], previousValues[j]);
                var previousChangeRate = CalculateChangeRate(previousValues[j], beforePreviousValues[j]);

                // 急激な変化の検出（前月比30%以上の変化）
                if (Math.Abs(changeRate) > 30 && Math.Abs(changeRate - previousChangeRate) > 20)
                {
                    var severity = Math.Abs(changeRate) > 50 ? "Critical" : 
                                  Math.Abs(changeRate) > 40 ? "High" : "Medium";

                    anomalies.Add(new FTierAnomaly
                    {
                        Month = current.Month,
                        AnomalyType = "TrendChange",
                        FTier = tiers[j],
                        AnomalyScore = Math.Min(Math.Abs(changeRate), 100),
                        Expected = previousValues[j],
                        Actual = currentValues[j],
                        Severity = severity,
                        Description = $"{tiers[j]}階層で{changeRate:F1}%の急激な変化を検出",
                        ActionRequired = severity == "Critical" || severity == "High"
                    });
                }
            }
        }

        return anomalies;
    }
}
```

## 5. Shopify連携

### 5.1 購買頻度データの計算

```csharp
public class FTierCalculationService
{
    public async Task CalculateMonthlyFTierDataAsync(
        string shopDomain,
        DateTime targetMonth)
    {
        // 1. 分析期間の決定（過去12ヶ月のデータを使用）
        var analysisStartDate = targetMonth.AddMonths(-12).Date;
        var analysisEndDate = targetMonth.AddDays(-1).Date;

        // 2. 顧客ごとの購買頻度を計算
        var customerFrequencies = await CalculateCustomerFrequenciesAsync(
            shopDomain, analysisStartDate, analysisEndDate);

        // 3. F階層の分類
        var fTierData = ClassifyCustomersIntoFTiers(customerFrequencies);

        // 4. 結果をデータベースに保存
        await SaveFTierAnalysisAsync(shopDomain, targetMonth, fTierData);

        // 5. KPIサマリーの計算
        await CalculateAndSaveKPISummaryAsync(shopDomain, targetMonth, fTierData);
    }

    private Dictionary<string, int> ClassifyCustomersIntoFTiers(
        Dictionary<string, CustomerFrequencyData> customerFrequencies)
    {
        var fTierCounts = new Dictionary<string, int>
        {
            { "F1", 0 }, { "F2", 0 }, { "F3", 0 }, { "F4", 0 }, { "F5", 0 }
        };

        foreach (var customer in customerFrequencies.Values)
        {
            var tier = DetermineFTier(customer.PurchaseCount);
            fTierCounts[tier]++;
        }

        return fTierCounts;
    }

    private string DetermineFTier(int purchaseCount)
    {
        return purchaseCount switch
        {
            1 => "F1",
            2 => "F2",
            >= 3 and <= 5 => "F3",
            >= 6 and <= 10 => "F4",
            >= 11 => "F5",
            _ => "F1"
        };
    }
}
```

## 6. パフォーマンス考慮事項

### 6.1 キャッシュ戦略
- Redis/MemoryCacheを使用した分析結果のキャッシュ
- キャッシュキー: `f-tier-trend:{shopDomain}:{analysisRange}:{year}`
- 有効期限: 6時間（日4回更新）

### 6.2 バッチ処理
- 夜間バッチでの事前計算
- 増分更新による効率化
- 大規模データセットでの並列処理

### 6.3 クエリ最適化
- インデックスの適切な配置
- 集計クエリの最適化
- パーティショニングの検討

## 7. エラーハンドリング

### 7.1 エラー種別

```csharp
public enum FTierAnalysisError
{
    InsufficientData,        // データ不足
    InvalidDateRange,        // 無効な期間指定
    CalculationTimeout,      // 計算タイムアウト
    AnomalyDetectionFailed  // 異常検出エラー
}
```

## 8. セキュリティ考慮事項

- ショップドメインによるデータ分離
- APIレート制限
- 異常値アラートの適切な管理

## 9. 今後の拡張予定

### Phase 2での機能追加
- RFM分析との統合
- 予測分析（将来のF階層移動予測）
- アクションレコメンデーション

### Phase 3での機能追加
- リアルタイム異常検出
- 自動アラート機能
- マーケティングオートメーションとの連携

## ⚠️ 10. 設計上の注意事項・制約

### 10.1 実装難易度の警告 🔥 **最高難易度**

#### **複雑な分析ロジック**
- **5階層動的分類**: F1-F5の境界値が変動する複雑なロジック
- **異常値検出**: 統計的手法による異常検出アルゴリズムの実装
- **トレンド分析**: 季節性・周期性を考慮した時系列分析

```csharp
// 警告: 複雑な階層分類ロジック
// 購入回数の分布状況によって動的に境界値が変化
// 統計的異常検出には機械学習の知識が必要
```

#### **データ品質の課題**
- **時系列データの連続性**: 月次データの欠損による分析精度低下
- **顧客の一意性**: 同一顧客の複数アカウント問題
- **購入定義の曖昧さ**: キャンセル・返品処理の考慮

### 10.2 他機能との競合・重複

#### **顧客分析機能の重複**
- **CUST-01-DORMANT**: 休眠顧客定義（90日）との矛盾
- **CUST-02-ANALYSIS**: RFMスコアのF（Frequency）計算重複
- **PURCH-02-COUNT**: 購入回数分析との基礎データ共通

#### **設計矛盾の解決が必要**
```csharp
// 矛盾: 顧客セグメンテーションの定義統一が必要
// F階層: 1,2,3-5,6-10,11+
// vs 
// 休眠定義: 90日 vs 180日の不整合
```

### 10.3 パフォーマンス制約

#### **計算負荷の問題**
- **全顧客×12ヶ月**: 大量データの集計処理
- **異常検出処理**: 統計計算による処理時間増加
- **リアルタイム更新**: 日次更新でも数時間の処理時間

#### **推奨されるパフォーマンス対策**
1. **段階的実装**: 基本F階層分析→異常検出→予測分析
2. **バッチ処理**: 夜間バッチによる事前計算必須
3. **キャッシュ戦略**: 6時間キャッシュでの高速化

### 10.4 データベース設計の見直し推奨

#### **現在の設計の問題**
- **テーブル数過多**: 5つの専用テーブルによる複雑性
- **正規化不足**: 顧客・商品データの重複保存
- **インデックス戦略**: 複雑なクエリに対する最適化不足

#### **推奨される改善策**
```sql
-- 提案: 既存テーブル活用による簡素化
-- CustomerPurchaseAnalysis（CUST-02）との統合検討
-- 月次集計テーブルの共通化
```

### 10.5 実装順序の重要性

#### **依存関係の整理**
1. **前提条件**: 顧客セグメンテーション基盤の確立
2. **基盤機能**: CUST-01-DORMANT の安定稼働
3. **段階実装**: 基本分析→異常検出→予測分析

#### **推奨実装スケジュール**
- **Week 1-2**: 基本F階層分類のみ
- **Week 3-4**: 月次トレンド分析
- **Week 5-6**: 異常検出機能
- **Week 7-8**: 統合テスト・パフォーマンス調整

### 10.6 ビジネス要件の明確化が必要

#### **未確定な要件**
- **F階層の境界値**: ビジネス側との調整必要
- **異常の定義**: 何を「異常」とするかの基準
- **アクション提案**: 具体的な改善提案ロジック

**重要**: この機能は技術的複雑さが最も高いため、他の基盤機能の安定稼働後の実装を強く推奨