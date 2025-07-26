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
        public int StartMonth { get; set; } = 1;

        /// <summary>
        /// 分析終了月（1-12）
        /// </summary>
        [Range(1, 12)]
        public int EndMonth { get; set; } = 12;

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
        public string ProductTitle { get; set; } = string.Empty;

        /// <summary>
        /// 商品タイプ（カテゴリ）
        /// </summary>
        public string ProductType { get; set; } = string.Empty;

        /// <summary>
        /// ベンダー名
        /// </summary>
        public string? ProductVendor { get; set; }

        /// <summary>
        /// 月次比較データ（12ヶ月分）
        /// </summary>
        public List<MonthlyComparisonData> MonthlyData { get; set; } = new();

        /// <summary>
        /// 現在年総計
        /// </summary>
        public decimal CurrentYearTotal { get; set; }

        /// <summary>
        /// 前年総計
        /// </summary>
        public decimal PreviousYearTotal { get; set; }

        /// <summary>
        /// 総合成長率（%）
        /// </summary>
        public decimal OverallGrowthRate { get; set; }

        /// <summary>
        /// 平均月次成長率（%）
        /// </summary>
        public decimal AverageMonthlyGrowthRate { get; set; }
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
}