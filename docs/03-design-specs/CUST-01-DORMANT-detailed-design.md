# 休眠顧客分析【顧客】機能 - 詳細設計書

## 🆔 画面ID: CUST-01-DORMANT

## 📋 ドキュメント情報
- **作成日**: 2025年7月21日
- **作成者**: AI Assistant
- **バージョン**: v1.0
- **対象機能**: 休眠顧客分析【顧客】
- **画面ID**: CUST-01-DORMANT
- **ステータス**: 設計完了・実装準備中

---

## 🎯 機能概要

### 目的
最終購入から一定期間経過した顧客を自動分類し、解約リスクの早期発見と復帰施策の最適タイミング把握を支援する。

### 主要機能
1. **休眠顧客リスト** - 経過期間別セグメント表示、リスクレベル分類
2. **復帰インサイト** - 推奨アクション、最適タイミング提案
3. **KPIダッシュボード** - 休眠率、復帰率、損失額、回復売上
4. **復帰施策管理** - キャンペーン作成、効果測定

### ビジネス価値
- 解約リスク顧客の早期発見（平均30日早期）
- 復帰施策のROI向上（復帰率15-20%改善）
- 顧客LTVの最大化

---

## 📊 データベース設計

### 1. 顧客サマリーテーブル

```sql
CREATE TABLE [dbo].[CustomerSummary](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [CustomerId] [int] NOT NULL,
    [StoreId] [int] NOT NULL,
    [Name] [nvarchar](255) NOT NULL,
    [Email] [nvarchar](255) NOT NULL,
    [Phone] [nvarchar](20) NULL,
    [LastPurchaseDate] [datetime2](7) NULL,
    [DaysSinceLastPurchase] [int] NULL,
    [TotalOrders] [int] NOT NULL DEFAULT 0,
    [TotalSpent] [decimal](18, 2) NOT NULL DEFAULT 0,
    [AverageOrderValue] [decimal](18, 2) NOT NULL DEFAULT 0,
    [PurchaseFrequencyDays] [decimal](10, 2) NULL,
    [DormancySegment] [nvarchar](50) NULL, -- '90-180日', '180-365日', '365日以上'
    [RiskLevel] [nvarchar](20) NULL, -- 'low', 'medium', 'high', 'critical'
    [ChurnProbability] [decimal](5, 2) NULL, -- 0.00-1.00
    [CustomerTags] [nvarchar](1000) NULL,
    [PreferredCategories] [nvarchar](500) NULL,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [FK_CustomerSummary_Customers] FOREIGN KEY([CustomerId]) REFERENCES [dbo].[Customers] ([Id]),
    CONSTRAINT [FK_CustomerSummary_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]),
    INDEX [IX_CustomerSummary_Dormancy] ([StoreId], [DormancySegment], [DaysSinceLastPurchase]),
    INDEX [IX_CustomerSummary_RiskLevel] ([StoreId], [RiskLevel]),
    INDEX [IX_CustomerSummary_LastPurchase] ([StoreId], [LastPurchaseDate]),
    CONSTRAINT [UQ_CustomerSummary] UNIQUE ([StoreId], [CustomerId])
);
```

### 2. 復帰履歴テーブル

```sql
CREATE TABLE [dbo].[CustomerReactivationHistory](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [CustomerId] [int] NOT NULL,
    [StoreId] [int] NOT NULL,
    [DormancyStartDate] [datetime2](7) NOT NULL,
    [DormancyEndDate] [datetime2](7) NOT NULL,
    [DormancyDays] [int] NOT NULL,
    [ReactivationOrderId] [int] NULL,
    [ReactivationRevenue] [decimal](18, 2) NULL,
    [CampaignId] [int] NULL,
    [ReactivationChannel] [nvarchar](50) NULL, -- 'email', 'sms', 'push', 'organic'
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [FK_ReactivationHistory_Customers] FOREIGN KEY([CustomerId]) REFERENCES [dbo].[Customers] ([Id]),
    CONSTRAINT [FK_ReactivationHistory_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]),
    CONSTRAINT [FK_ReactivationHistory_Orders] FOREIGN KEY([ReactivationOrderId]) REFERENCES [dbo].[Orders] ([Id]),
    INDEX [IX_ReactivationHistory_Customer] ([CustomerId], [DormancyStartDate])
);
```

### 3. 復帰施策管理テーブル

```sql
CREATE TABLE [dbo].[ReactivationCampaigns](
    [Id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [StoreId] [int] NOT NULL,
    [CampaignName] [nvarchar](100) NOT NULL,
    [TargetSegment] [nvarchar](50) NOT NULL,
    [MinDormancyDays] [int] NOT NULL,
    [MaxDormancyDays] [int] NULL,
    [DiscountType] [nvarchar](20) NOT NULL, -- 'percentage', 'fixed_amount', 'free_shipping'
    [DiscountValue] [decimal](18, 2) NOT NULL,
    [MessageTemplate] [nvarchar](max) NULL,
    [StartDate] [datetime2](7) NOT NULL,
    [EndDate] [datetime2](7) NULL,
    [IsActive] [bit] NOT NULL DEFAULT 1,
    [SentCount] [int] NOT NULL DEFAULT 0,
    [ConversionCount] [int] NOT NULL DEFAULT 0,
    [ConversionRate] [decimal](5, 2) NULL,
    [TotalRevenue] [decimal](18, 2) NOT NULL DEFAULT 0,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [FK_ReactivationCampaigns_Stores] FOREIGN KEY([StoreId]) REFERENCES [dbo].[Stores] ([Id]),
    INDEX [IX_ReactivationCampaigns_Active] ([StoreId], [IsActive])
);
```

---

## 🔌 API設計

### 1. エンドポイント

```csharp
[Route("api/analytics/customers")]
[ApiController]
[Authorize]
public class CustomerAnalyticsController : ControllerBase
{
    // 休眠顧客リスト取得
    [HttpGet("dormant")]
    public async Task<ActionResult<DormantCustomerResponse>> GetDormantCustomers(
        [FromQuery] DormantCustomerRequest request);

    // 顧客詳細情報取得
    [HttpGet("dormant/{customerId}")]
    public async Task<ActionResult<CustomerDetailResponse>> GetCustomerDetails(
        int customerId, [FromQuery] int storeId);

    // 復帰施策作成
    [HttpPost("dormant/campaigns")]
    public async Task<ActionResult<ReactivationCampaignResponse>> CreateReactivationCampaign(
        [FromBody] CreateReactivationCampaignRequest request);

    // 復帰施策効果取得
    [HttpGet("dormant/campaigns/{campaignId}/metrics")]
    public async Task<ActionResult<CampaignMetricsResponse>> GetCampaignMetrics(
        int campaignId);

    // 休眠トレンド取得
    [HttpGet("dormant/trends")]
    public async Task<ActionResult<DormancyTrendResponse>> GetDormancyTrends(
        [FromQuery] DormancyTrendRequest request);
}
```

### 2. DTOモデル

```csharp
// リクエストDTO
public class DormantCustomerRequest
{
    public int StoreId { get; set; }
    public string? Segment { get; set; } // "all", "90-180日", "180-365日", "365日以上"
    public string? RiskLevel { get; set; } // "low", "medium", "high", "critical"
    public decimal? MinTotalSpent { get; set; }
    public decimal? MaxTotalSpent { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortBy { get; set; } = "DaysSinceLastPurchase";
    public bool Descending { get; set; } = true;
}

// レスポンスDTO
public class DormantCustomerResponse
{
    public List<DormantCustomerDto> Customers { get; set; }
    public DormantSummaryStats Summary { get; set; }
    public List<SegmentDistribution> SegmentDistributions { get; set; }
    public PaginationInfo Pagination { get; set; }
}

public class DormantCustomerDto
{
    public int CustomerId { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string? Phone { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public int DaysSinceLastPurchase { get; set; }
    public string DormancySegment { get; set; }
    public string RiskLevel { get; set; }
    public decimal ChurnProbability { get; set; }
    public decimal TotalSpent { get; set; }
    public int TotalOrders { get; set; }
    public decimal AverageOrderValue { get; set; }
    public List<string> Tags { get; set; }
    public List<string> PreferredCategories { get; set; }
    public ReactivationInsight Insight { get; set; }
}

public class DormantSummaryStats
{
    public int TotalDormantCustomers { get; set; }
    public decimal DormantRate { get; set; }
    public int AverageDormancyDays { get; set; }
    public decimal EstimatedLostRevenue { get; set; }
    public decimal ReactivationRate { get; set; }
    public decimal RecoveredRevenue { get; set; }
    public Dictionary<string, int> SegmentCounts { get; set; }
    public Dictionary<string, decimal> SegmentRevenue { get; set; }
}

public class ReactivationInsight
{
    public string RecommendedAction { get; set; }
    public string OptimalTiming { get; set; }
    public decimal EstimatedSuccessRate { get; set; }
    public string SuggestedOffer { get; set; }
    public List<string> PersonalizationTips { get; set; }
}
```

---

## ⚙️ サービス層設計

### 1. インターフェース定義

```csharp
public interface IDormantCustomerService
{
    Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request);
    Task<CustomerDetailResponse> GetCustomerDetailsAsync(int customerId, int storeId);
    Task<bool> UpdateCustomerSummaryAsync(int storeId);
    Task<ReactivationCampaignResponse> CreateReactivationCampaignAsync(CreateReactivationCampaignRequest request);
    Task<bool> TrackReactivationAsync(int customerId, int orderId);
    Task<decimal> CalculateChurnProbabilityAsync(int customerId);
}
```

### 2. サービス実装（重要部分）

```csharp
public class DormantCustomerService : IDormantCustomerService
{
    private readonly ShopifyDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DormantCustomerService> _logger;
    private readonly IConfiguration _configuration;

    public async Task<DormantCustomerResponse> GetDormantCustomersAsync(DormantCustomerRequest request)
    {
        var cacheKey = $"dormant_{request.StoreId}_{request.Segment}_{request.RiskLevel}";
        
        if (_cache.TryGetValue(cacheKey, out DormantCustomerResponse cachedResponse))
        {
            return cachedResponse;
        }

        // 休眠閾値の取得（設定可能）
        var dormancyThreshold = _configuration.GetValue<int>("DormancyThresholdDays", 90);

        var query = _context.CustomerSummary
            .Where(c => c.StoreId == request.StoreId
                && c.DaysSinceLastPurchase >= dormancyThreshold);

        // セグメントフィルタ
        if (!string.IsNullOrWhiteSpace(request.Segment) && request.Segment != "all")
        {
            query = query.Where(c => c.DormancySegment == request.Segment);
        }

        // リスクレベルフィルタ
        if (!string.IsNullOrWhiteSpace(request.RiskLevel))
        {
            query = query.Where(c => c.RiskLevel == request.RiskLevel);
        }

        // 購入金額フィルタ
        if (request.MinTotalSpent.HasValue)
        {
            query = query.Where(c => c.TotalSpent >= request.MinTotalSpent.Value);
        }

        var totalCount = await query.CountAsync();
        
        // ソートとページング
        query = ApplySorting(query, request.SortBy, request.Descending);
        var customers = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        // DTOへの変換とインサイト生成
        var customerDtos = new List<DormantCustomerDto>();
        foreach (var customer in customers)
        {
            var dto = MapToDto(customer);
            dto.Insight = await GenerateReactivationInsightAsync(customer);
            customerDtos.Add(dto);
        }

        // サマリー統計の計算
        var summary = await CalculateSummaryStatsAsync(request.StoreId);

        var response = new DormantCustomerResponse
        {
            Customers = customerDtos,
            Summary = summary,
            SegmentDistributions = await GetSegmentDistributionsAsync(request.StoreId),
            Pagination = new PaginationInfo
            {
                CurrentPage = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount
            }
        };

        _cache.Set(cacheKey, response, TimeSpan.FromMinutes(15));
        return response;
    }

    public async Task<decimal> CalculateChurnProbabilityAsync(int customerId)
    {
        var customer = await _context.CustomerSummary
            .FirstOrDefaultAsync(c => c.CustomerId == customerId);

        if (customer == null) return 0;

        // 簡易的な離脱確率計算モデル
        var factors = new Dictionary<string, decimal>
        {
            { "dormancy_days", Math.Min(customer.DaysSinceLastPurchase ?? 0, 365) / 365m },
            { "order_frequency", 1m - Math.Min(customer.PurchaseFrequencyDays ?? 365, 365) / 365m },
            { "total_orders", 1m - Math.Min(customer.TotalOrders, 10) / 10m },
            { "average_order_value", Math.Min(customer.AverageOrderValue, 1000) / 1000m }
        };

        // 重み付け平均
        var weights = new Dictionary<string, decimal>
        {
            { "dormancy_days", 0.4m },
            { "order_frequency", 0.3m },
            { "total_orders", 0.2m },
            { "average_order_value", 0.1m }
        };

        var churnProbability = factors.Sum(f => f.Value * weights[f.Key]);
        return Math.Round(churnProbability, 2);
    }

    private async Task<ReactivationInsight> GenerateReactivationInsightAsync(CustomerSummary customer)
    {
        var insight = new ReactivationInsight();

        // 休眠期間に基づく推奨アクション
        if (customer.DaysSinceLastPurchase < 120)
        {
            insight.RecommendedAction = "軽いリマインダーメール";
            insight.OptimalTiming = "今週中";
            insight.EstimatedSuccessRate = 0.25m;
            insight.SuggestedOffer = "送料無料";
        }
        else if (customer.DaysSinceLastPurchase < 180)
        {
            insight.RecommendedAction = "特別割引オファー";
            insight.OptimalTiming = "3日以内";
            insight.EstimatedSuccessRate = 0.20m;
            insight.SuggestedOffer = "15%割引クーポン";
        }
        else if (customer.DaysSinceLastPurchase < 365)
        {
            insight.RecommendedAction = "限定復帰キャンペーン";
            insight.OptimalTiming = "即座";
            insight.EstimatedSuccessRate = 0.15m;
            insight.SuggestedOffer = "20%割引 + 送料無料";
        }
        else
        {
            insight.RecommendedAction = "VIP復帰オファー";
            insight.OptimalTiming = "カスタマイズ必要";
            insight.EstimatedSuccessRate = 0.10m;
            insight.SuggestedOffer = "25%割引 + 特別特典";
        }

        // パーソナライゼーションのヒント
        insight.PersonalizationTips = new List<string>();
        
        if (!string.IsNullOrWhiteSpace(customer.PreferredCategories))
        {
            insight.PersonalizationTips.Add($"過去の購入カテゴリ: {customer.PreferredCategories}");
        }

        if (customer.TotalOrders > 5)
        {
            insight.PersonalizationTips.Add("ロイヤルカスタマーとして特別扱い");
        }

        if (customer.AverageOrderValue > 10000)
        {
            insight.PersonalizationTips.Add("高額購入者向けプレミアムオファー");
        }

        return insight;
    }
}
```

---

## 🔄 バッチ処理設計

### 1. 顧客サマリー更新バッチ

```csharp
public class DormantCustomerBatchJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DormantCustomerBatchJob> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var nextRun = DateTime.Today.AddDays(1).AddHours(3); // 毎日午前3時
            var delay = nextRun - DateTime.Now;

            if (delay > TimeSpan.Zero)
            {
                await Task.Delay(delay, stoppingToken);
            }

            await RunDormancyAnalysis();
        }
    }

    private async Task RunDormancyAnalysis()
    {
        using (var scope = _serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ShopifyDbContext>();
            var dormantService = scope.ServiceProvider.GetRequiredService<IDormantCustomerService>();

            try
            {
                var stores = await context.Stores.Where(s => s.IsActive).ToListAsync();

                foreach (var store in stores)
                {
                    // 顧客サマリーの更新
                    await UpdateCustomerSummaries(store.Id);

                    // 休眠セグメントの更新
                    await UpdateDormancySegments(store.Id);

                    // リスクレベルの計算
                    await CalculateRiskLevels(store.Id);

                    // 復帰検知
                    await DetectReactivations(store.Id);
                }

                _logger.LogInformation($"休眠顧客分析完了: {stores.Count}店舗");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "休眠顧客分析エラー");
            }
        }
    }

    private async Task UpdateDormancySegments(int storeId)
    {
        await _context.Database.ExecuteSqlRawAsync(@"
            UPDATE CustomerSummary
            SET DormancySegment = 
                CASE 
                    WHEN DaysSinceLastPurchase < 90 THEN NULL
                    WHEN DaysSinceLastPurchase BETWEEN 90 AND 180 THEN '90-180日'
                    WHEN DaysSinceLastPurchase BETWEEN 181 AND 365 THEN '180-365日'
                    ELSE '365日以上'
                END,
            RiskLevel = 
                CASE 
                    WHEN DaysSinceLastPurchase < 90 THEN NULL
                    WHEN DaysSinceLastPurchase < 120 AND TotalOrders > 3 THEN 'low'
                    WHEN DaysSinceLastPurchase < 180 AND TotalOrders > 1 THEN 'medium'
                    WHEN DaysSinceLastPurchase < 365 THEN 'high'
                    ELSE 'critical'
                END,
            UpdatedAt = GETDATE()
            WHERE StoreId = @storeId",
            new SqlParameter("@storeId", storeId));
    }
}
```

### 2. 実行タイミング
- **日次更新**: 毎日午前3時（他のバッチと時間をずらす）
- **リアルタイム更新**: 新規注文時に該当顧客のみ更新
- **初期データ**: 全顧客の一括計算（約1時間）

---

## 🚀 実装計画

### Phase 1: 基盤実装（Day 1）
1. **データベース構築**
   - 3テーブルの作成
   - インデックス設定
   - 初期データ投入

2. **Entity Framework設定**
   - モデルクラス作成
   - DbContext更新
   - マイグレーション実行

### Phase 2: API実装（Day 2）
1. **コントローラー実装**
   - CustomerAnalyticsController
   - DTOモデル定義
   - バリデーション設定

2. **サービス層実装**
   - DormantCustomerService
   - 離脱確率計算ロジック
   - インサイト生成ロジック

### Phase 3: バッチ処理・最適化（Day 3）
1. **バッチジョブ実装**
   - DormantCustomerBatchJob
   - スケジューリング設定

2. **フロントエンド統合**
   - API接続テスト
   - データ形式調整
   - パフォーマンステスト

---

## 📊 技術的考慮事項

### 1. パフォーマンス最適化
- 大量顧客データに対応（10万顧客想定）
- インデックス戦略が重要
- キャッシュ活用（15分間）

### 2. リアルタイム性
- 新規注文時の即時反映
- WebHook連携の準備
- イベントドリブン更新

### 3. プライバシー配慮
- 個人情報の適切な管理
- GDPR/CCPA準拠
- データ保持期間の設定

---

## ✅ テスト項目

### 単体テスト
- [ ] 離脱確率計算ロジック
- [ ] セグメント分類ロジック
- [ ] インサイト生成ロジック
- [ ] 復帰検知ロジック

### 統合テスト
- [ ] 大量データでのレスポンス（目標: 2秒以内）
- [ ] セグメント別フィルタリング
- [ ] ページング動作
- [ ] キャンペーン作成・効果測定

### 受け入れテスト
- [ ] 休眠顧客の正確な分類
- [ ] アクション提案の妥当性
- [ ] キャンペーン効果の可視化
- [ ] CSV/Excelエクスポート

---

*作成日: 2025年7月21日*
*次回更新: 実装完了時* 