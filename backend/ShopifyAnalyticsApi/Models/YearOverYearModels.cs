using System.ComponentModel.DataAnnotations;

namespace ShopifyAnalyticsApi.Models
{
    /// <summary>
    /// 前年同月比分析用のデータ転送オブジェクト
    /// </summary>
    
    /// <summary>
    /// 前年同月比分析のリクエストパラメータ
    /// </summary>
    public class YearOverYearRequest
    {
        /// <summary>
        /// ストアID（マルチテナント対応）
        /// </summary>
        [Required]
        public int StoreId { get; set; } = 1;

        /// <summary>
        /// 比較対象年（現在年）
        /// </summary>
        [Required]
        [Range(2020, 2030)]
        public int Year { get; set; } = DateTime.Now.Year;

        /// <summary>
        /// 分析開始月（1-12）
        /// </summary>
        [Range(1, 12)]
        public int? StartMonth { get; set; } = 1;

        /// <summary>
        /// 分析終了月（1-12）
        /// </summary>
        [Range(1, 12)]
        public int? EndMonth { get; set; } = 12;

        /// <summary>
        /// 表示モード（sales: 売上額, quantity: 数量, orders: 注文数）  
        /// </summary>
        public string ViewMode { get; set; } = "sales";

        /// <summary>
        /// ソート方式（growth_rate: 成長率, total_sales: 総売上, name: 商品名）
        /// </summary>
        public string SortBy { get; set; } = "growth_rate";

        /// <summary>
        /// 降順ソート
        /// </summary>
        public bool SortDescending { get; set; } = true;

        /// <summary>
        /// 商品タイプフィルタ
        /// </summary>
        public List<string>? ProductTypes { get; set; }

        /// <summary>
        /// ベンダーフィルタ
        /// </summary>
        public List<string>? ProductVendors { get; set; }

        /// <summary>
        /// 商品名検索
        /// </summary>
        public string? SearchTerm { get; set; }

        /// <summary>
        /// 成長率フィルタ（all, positive, negative, high_growth, high_decline）
        /// </summary>
        public string GrowthRateFilter { get; set; } = "all";

        /// <summary>
        /// カテゴリフィルタ
        /// </summary>
        public string? Category { get; set; }

        /// <summary>
        /// 商品タイプフィルタ
        /// </summary>
        public string? ProductType { get; set; }

        /// <summary>
        /// ベンダーフィルタ
        /// </summary>
        public string? Vendor { get; set; }

        /// <summary>
        /// 現在年（計算用）
        /// </summary>
        public int CurrentYear => Year;

        /// <summary>
        /// 前年（計算用）
        /// </summary>
        public int PreviousYear => Year - 1;

        /// <summary>
        /// 最小成長率フィルタ
        /// </summary>
        public decimal? MinGrowthRate { get; set; }

        /// <summary>
        /// 最大成長率フィルタ
        /// </summary>
        public decimal? MaxGrowthRate { get; set; }

        /// <summary>
        /// 最小現在年値フィルタ
        /// </summary>
        public decimal? MinCurrentValue { get; set; }

        /// <summary>
        /// 成長カテゴリフィルタ
        /// </summary>
        public string? GrowthCategory { get; set; }

        /// <summary>
        /// 取得件数制限
        /// </summary>
        public int? Limit { get; set; }

        /// <summary>
        /// オフセット
        /// </summary>
        public int? Offset { get; set; }

        /// <summary>
        /// サービス項目を除外するかどうか
        /// </summary>
        public bool ExcludeServiceItems { get; set; } = false;
    }

    /// <summary>
    /// 前年同月比分析のレスポンスデータ
    /// </summary>
    public class YearOverYearResponse
    {
        /// <summary>
        /// 商品別月次比較データ
        /// </summary>
        public List<YearOverYearProductData> Products { get; set; } = new();

        /// <summary>
        /// 分析サマリー
        /// </summary>
        public YearOverYearSummary Summary { get; set; } = new();

        /// <summary>
        /// 月次比較データ
        /// </summary>
        public List<MonthlyComparisonData> MonthlyComparisons { get; set; } = new();

        /// <summary>
        /// レスポンスメタデータ
        /// </summary>
        public ResponseMetadata Metadata { get; set; } = new();
    }

    /// <summary>
    /// 商品別前年同月比データ
    /// </summary>
    public class YearOverYearProductData
    {
        /// <summary>
        /// 商品名
        /// </summary>
        public string ProductName { get; set; } = string.Empty;
        
        /// <summary>
        /// 商品タイトル（ProductNameと同義）
        /// </summary>
        public string ProductTitle { get; set; } = string.Empty;

        /// <summary>
        /// 商品タイプ（カテゴリ）
        /// </summary>
        public string ProductType { get; set; } = string.Empty;

        /// <summary>
        /// ベンダー名
        /// </summary>
        public string Vendor { get; set; } = string.Empty;

        /// <summary>
        /// 月次比較データ（12ヶ月分）
        /// </summary>
        public List<MonthlyComparisonData> MonthlyData { get; set; } = new();

        /// <summary>
        /// 現在年値
        /// </summary>
        public decimal CurrentYearValue { get; set; }

        /// <summary>
        /// 前年値
        /// </summary>
        public decimal PreviousYearValue { get; set; }

        /// <summary>
        /// 成長率
        /// </summary>
        public decimal GrowthRate { get; set; }

        /// <summary>
        /// 成長カテゴリ
        /// </summary>
        public string GrowthCategory { get; set; } = string.Empty;
    }

    /// <summary>
    /// 月次比較データ
    /// </summary>
    public class MonthlyComparisonData
    {
        /// <summary>
        /// 月（1-12）
        /// </summary>
        public int Month { get; set; }

        /// <summary>
        /// 月名（"1月", "2月", ...）
        /// </summary>
        public string MonthName { get; set; } = string.Empty;

        /// <summary>
        /// 現在年の値
        /// </summary>
        public decimal CurrentValue { get; set; }

        /// <summary>
        /// 前年の値
        /// </summary>
        public decimal PreviousValue { get; set; }

        /// <summary>
        /// 成長率（%）
        /// </summary>
        public decimal GrowthRate { get; set; }

        /// <summary>
        /// 成長カテゴリ（高成長、成長、維持、減少、大幅減少）
        /// </summary>
        public string GrowthCategory { get; set; } = string.Empty;
    }

    /// <summary>
    /// 前年同月比分析サマリー
    /// </summary>
    public class YearOverYearSummary
    {
        /// <summary>
        /// 対象年
        /// </summary>
        public int CurrentYear { get; set; }

        /// <summary>
        /// 比較年
        /// </summary>
        public int PreviousYear { get; set; }

        /// <summary>
        /// 総商品数
        /// </summary>
        public int TotalProducts { get; set; }

        /// <summary>
        /// 成長している商品数
        /// </summary>
        public int GrowingProducts { get; set; }

        /// <summary>
        /// 減少している商品数
        /// </summary>
        public int DecliningProducts { get; set; }

        /// <summary>
        /// 新商品数（前年データなし）
        /// </summary>
        public int NewProducts { get; set; }

        /// <summary>
        /// 全体平均成長率（%）
        /// </summary>
        public decimal OverallGrowthRate { get; set; }

        /// <summary>
        /// 現在年総売上
        /// </summary>
        public decimal CurrentYearTotalSales { get; set; }

        /// <summary>
        /// 前年総売上
        /// </summary>
        public decimal PreviousYearTotalSales { get; set; }

        /// <summary>
        /// 最高成長率商品
        /// </summary>
        public TopPerformingProduct? TopGrowthProduct { get; set; }

        /// <summary>
        /// 最高売上商品
        /// </summary>
        public TopPerformingProduct? TopSalesProduct { get; set; }

        /// <summary>
        /// 表示モード
        /// </summary>
        public string ViewMode { get; set; } = string.Empty;

        /// <summary>
        /// 現在年総額
        /// </summary>
        public decimal TotalCurrentValue { get; set; }

        /// <summary>
        /// 前年総額
        /// </summary>
        public decimal TotalPreviousValue { get; set; }

        /// <summary>
        /// 平均成長率
        /// </summary>
        public decimal AverageGrowthRate { get; set; }

        /// <summary>
        /// トップパフォーマー
        /// </summary>
        public List<TopProductData> TopPerformers { get; set; } = new();

        /// <summary>
        /// ワーストパフォーマー
        /// </summary>
        public List<TopProductData> WorstPerformers { get; set; } = new();

        /// <summary>
        /// カテゴリ別内訳
        /// </summary>
        public Dictionary<string, CategoryStats> CategoryBreakdown { get; set; } = new();
    }

    /// <summary>
    /// トップパフォーマンス商品情報
    /// </summary>
    public class TopPerformingProduct
    {
        /// <summary>
        /// 商品名
        /// </summary>
        public string ProductTitle { get; set; } = string.Empty;

        /// <summary>
        /// 商品タイプ
        /// </summary>
        public string ProductType { get; set; } = string.Empty;

        /// <summary>
        /// 値（売上額、数量、注文数など）
        /// </summary>
        public decimal Value { get; set; }

        /// <summary>
        /// 成長率（%）
        /// </summary>
        public decimal GrowthRate { get; set; }
    }

    /// <summary>
    /// レスポンスメタデータ
    /// </summary>
    public class ResponseMetadata
    {
        /// <summary>
        /// データ生成日時
        /// </summary>
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// 処理時間（ミリ秒）
        /// </summary>
        public long ProcessingTimeMs { get; set; }

        /// <summary>
        /// データソース
        /// </summary>
        public string DataSource { get; set; } = "Database";

        /// <summary>
        /// キャッシュヒット
        /// </summary>
        public bool CacheHit { get; set; } = false;

        /// <summary>
        /// APIバージョン
        /// </summary>
        public string ApiVersion { get; set; } = "1.0";

        /// <summary>
        /// 警告メッセージ
        /// </summary>
        public List<string>? Warnings { get; set; }
    }

    /// <summary>
    /// トップ商品データ
    /// </summary>
    public class TopProductData
    {
        public string ProductName { get; set; } = string.Empty;
        public decimal CurrentValue { get; set; }
        public decimal PreviousValue { get; set; }
        public decimal GrowthRate { get; set; }
        public string GrowthCategory { get; set; } = string.Empty;
    }

    /// <summary>
    /// 前年同月比メタデータ
    /// </summary>
    public class YearOverYearMetaData
    {
        public int TotalProductsBeforeFilter { get; set; }
        public int TotalProductsAfterFilter { get; set; }
        public DateTime AnalysisDate { get; set; }
        public int CurrentYear { get; set; }
        public int PreviousYear { get; set; }
        public string ViewMode { get; set; } = string.Empty;
    }

    /// <summary>
    /// カテゴリ統計
    /// </summary>
    public class CategoryStats
    {
        public int ProductCount { get; set; }
        public decimal TotalCurrentValue { get; set; }
        public decimal TotalPreviousValue { get; set; }
        public decimal AverageGrowthRate { get; set; }
        public decimal CategoryPercentage { get; set; }
    }
}