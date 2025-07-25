namespace ShopifyTestApi.Models
{
    /// <summary>
    /// 購入回数分析レスポンス
    /// </summary>
    public class PurchaseCountAnalysisResponse
    {
        public PurchaseCountSummary Summary { get; set; } = new();
        public List<PurchaseCountDetail> Details { get; set; } = new();
        public List<PurchaseCountTrend> Trends { get; set; } = new();
        public List<SegmentAnalysisData> SegmentAnalysis { get; set; } = new();
        public PurchaseCountInsights Insights { get; set; } = new();
    }

    /// <summary>
    /// 購入回数分析リクエスト
    /// </summary>
    public class PurchaseCountAnalysisRequest
    {
        public int StoreId { get; set; } = 1;
        public DateTime StartDate { get; set; } = DateTime.Now.AddMonths(-12);
        public DateTime EndDate { get; set; } = DateTime.Now;
        public string? Segment { get; set; } // "all", "new", "existing", "returning"
        public bool IncludeComparison { get; set; } = true;
        public int MaxPurchaseCount { get; set; } = 20; // 20回以上は「20+」として集約
    }

    /// <summary>
    /// 購入回数分析サマリー
    /// </summary>
    public class PurchaseCountSummary
    {
        public int TotalCustomers { get; set; }
        public int TotalOrders { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal AveragePurchaseCount { get; set; }
        public decimal RepeatCustomerRate { get; set; } // リピート顧客率（2回以上購入）
        public decimal MultiPurchaseRate { get; set; } // 複数回購入率（3回以上購入）
        public string PeriodLabel { get; set; } = string.Empty;
        public ComparisonMetrics? Comparison { get; set; }
    }

    /// <summary>
    /// 購入回数詳細データ
    /// </summary>
    public class PurchaseCountDetail
    {
        public int PurchaseCount { get; set; }
        public string PurchaseCountLabel { get; set; } = string.Empty; // "1回", "2回", "20回以上"
        public BasicMetrics Current { get; set; } = new();
        public BasicMetrics? Previous { get; set; } // 前年同期データ
        public GrowthRateMetrics? GrowthRate { get; set; }
        public PercentageMetrics Percentage { get; set; } = new();
        public DetailedAnalysisMetrics Analysis { get; set; } = new();
    }

    /// <summary>
    /// 基本メトリクス
    /// </summary>
    public class BasicMetrics
    {
        public int CustomerCount { get; set; }
        public int OrderCount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal AverageCustomerValue { get; set; }
    }

    /// <summary>
    /// 成長率メトリクス
    /// </summary>
    public class GrowthRateMetrics
    {
        public decimal CustomerCountGrowth { get; set; }
        public decimal OrderCountGrowth { get; set; }
        public decimal AmountGrowth { get; set; }
        public string GrowthTrend { get; set; } = string.Empty; // "大幅増加"|"増加"|"横ばい"|"減少"
    }

    /// <summary>
    /// 構成比メトリクス
    /// </summary>
    public class PercentageMetrics
    {
        public decimal CustomerPercentage { get; set; }
        public decimal OrderPercentage { get; set; }
        public decimal AmountPercentage { get; set; }
    }

    /// <summary>
    /// 詳細分析メトリクス
    /// </summary>
    public class DetailedAnalysisMetrics
    {
        public decimal ConversionRate { get; set; } // 次回数への変換率
        public decimal RetentionRate { get; set; } // 維持率
        public decimal AverageDaysBetweenOrders { get; set; } // 平均注文間隔
        public int HighValueCustomers { get; set; } // 高価値顧客数
        public string RiskLevel { get; set; } = string.Empty; // "低"|"中"|"高"
    }

    /// <summary>
    /// 購入回数トレンドデータ
    /// </summary>
    public class PurchaseCountTrend
    {
        public string Period { get; set; } = string.Empty; // "2024-01", "2024-02"
        public string PeriodLabel { get; set; } = string.Empty; // "1月", "2月"
        public int TotalCustomers { get; set; }
        public decimal AveragePurchaseCount { get; set; }
        public decimal RepeatRate { get; set; }
        public List<PurchaseCountDistribution> Distribution { get; set; } = new();
    }

    /// <summary>
    /// 購入回数分布データ
    /// </summary>
    public class PurchaseCountDistribution
    {
        public int PurchaseCount { get; set; }
        public int CustomerCount { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// セグメント分析データ
    /// </summary>
    public class SegmentAnalysisData
    {
        public string Segment { get; set; } = string.Empty; // "new"|"existing"|"returning"
        public string SegmentName { get; set; } = string.Empty; // "新規顧客"|"既存顧客"|"復帰顧客"
        public List<PurchaseCountDetail> Details { get; set; } = new();
        public SegmentSummaryMetrics Summary { get; set; } = new();
    }

    /// <summary>
    /// セグメントサマリーメトリクス
    /// </summary>
    public class SegmentSummaryMetrics
    {
        public int TotalCustomers { get; set; }
        public decimal AveragePurchaseCount { get; set; }
        public decimal RepeatRate { get; set; }
        public decimal AverageLTV { get; set; }
        public decimal RevenueContribution { get; set; } // 売上貢献度
    }

    /// <summary>
    /// 購入回数分析インサイト
    /// </summary>
    public class PurchaseCountInsights
    {
        public List<string> KeyFindings { get; set; } = new();
        public List<RecommendationItem> Recommendations { get; set; } = new();
        public RiskAnalysis Risk { get; set; } = new();
        public OpportunityAnalysis Opportunity { get; set; } = new();
    }

    /// <summary>
    /// 推奨アクション
    /// </summary>
    public class RecommendationItem
    {
        public string Category { get; set; } = string.Empty; // "リピート促進"|"新規獲得"|"維持"
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty; // "高"|"中"|"低"
        public string Action { get; set; } = string.Empty;
    }

    /// <summary>
    /// リスク分析
    /// </summary>
    public class RiskAnalysis
    {
        public decimal OneTimeCustomerRate { get; set; } // 一回購入率
        public decimal ChurnRisk { get; set; } // 離脱リスク
        public List<string> RiskFactors { get; set; } = new();
        public string OverallRiskLevel { get; set; } = string.Empty;
    }

    /// <summary>
    /// 機会分析
    /// </summary>
    public class OpportunityAnalysis
    {
        public decimal UpsellPotential { get; set; } // アップセル機会
        public decimal RetentionOpportunity { get; set; } // 維持機会
        public List<string> GrowthOpportunities { get; set; } = new();
        public string PrimaryOpportunityArea { get; set; } = string.Empty;
    }

    /// <summary>
    /// 比較メトリクス
    /// </summary>
    public class ComparisonMetrics
    {
        public BasicMetrics Previous { get; set; } = new();
        public decimal CustomerGrowthRate { get; set; }
        public decimal RevenueGrowthRate { get; set; }
        public decimal PurchaseCountGrowthRate { get; set; }
        public string ComparisonPeriod { get; set; } = string.Empty;
    }
}